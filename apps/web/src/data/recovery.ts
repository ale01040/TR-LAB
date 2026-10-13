import { z } from 'zod';
import { commandSchema, recordSchema, receiptSchema, validatePayload } from '@tr-lab/contracts';
import { projectCommand } from '@tr-lab/domain';
import { decisionIntent } from './decision-intent';
import { textDigest } from './command-digest';
import {
  db,
  metadata,
  records,
  setMetadata,
  type LocalDatabase,
  type Pending,
  type StoredRecord,
} from './database';
const stored = z
  .object({ key: z.string().max(500), account: z.string().max(100), entity: recordSchema })
  .strict();
const pending = z
  .object({
    operation_id: z.uuid(),
    account: z.string().max(100),
    order: z.number().int().positive().safe(),
    command: commandSchema,
    affects: z.array(z.uuid()).max(200),
    status: z.enum(['pending', 'blocked']),
    error: z.string().max(100).nullable(),
    command_digest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict()
  .transform(({ command_digest, ...rest }) => ({
    ...rest,
    ...(command_digest ? { command_digest } : {}),
  }));
const conflict = z
  .object({
    key: z.string().max(500),
    account: z.string().max(100),
    operation: pending,
    receipt: receiptSchema,
  })
  .strict();
const redactedDecision = z
  .object({
    account: z.string().max(100),
    operationId: z.uuid(),
    proposalId: z.uuid(),
    proposalRevision: z.string().regex(/^[1-9][0-9]{0,18}$/),
    contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
    choice: z.enum(['accept', 'reject']),
    commandDigest: z.string().regex(/^[a-f0-9]{64}$/),
    digestVersion: z.literal('jcs-1-sha256'),
    requiresReview: z.literal(true),
  })
  .strict();
const resolution = z
  .object({
    key: z.string().max(500),
    account: z.string().max(100),
    createdAt: z.iso.datetime(),
    reason: z.string().max(300),
    operations: z.array(pending).max(20000),
    records: z.array(stored).max(40000),
    redactedDecisions: z.array(redactedDecision).max(20000).optional(),
    sourceEpoch: z.uuid().nullable().optional(),
    sourceDeviceId: z.uuid().nullable().optional(),
    sourceArchiveDigest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable()
      .optional(),
  })
  .strict()
  .transform(
    ({ redactedDecisions, sourceEpoch, sourceDeviceId, sourceArchiveDigest, ...rest }) => ({
      ...rest,
      ...(redactedDecisions ? { redactedDecisions } : {}),
      ...(sourceEpoch !== undefined ? { sourceEpoch } : {}),
      ...(sourceDeviceId !== undefined ? { sourceDeviceId } : {}),
      ...(sourceArchiveDigest !== undefined ? { sourceArchiveDigest } : {}),
    }),
  );
const common = {
  format: z.literal('tr-lab-local-recovery'),
  warning: z.string().max(500),
  account: z.string().max(100),
  exportedAt: z.iso.datetime(),
  base: z.array(stored).max(20000),
  overlay: z.array(stored).max(20000),
  outbox: z.array(pending).max(20000),
  conflicts: z.array(conflict).max(20000),
};
export const recoverySchema = z.discriminatedUnion('schema_version', [
  z.object({ ...common, schema_version: z.literal(1) }).strict(),
  z
    .object({
      ...common,
      schema_version: z.literal(2),
      resolutions: z.array(resolution).max(1000),
      sync_epoch: z.uuid().nullable(),
    })
    .strict(),
  z
    .object({
      ...common,
      schema_version: z.literal(3),
      resolutions: z.array(resolution).max(1000),
      sync_epoch: z.uuid().nullable(),
      device_id: z.uuid().nullable().optional(),
      redacted_decisions: z.array(redactedDecision).max(20000),
    })
    .strict(),
]);
export async function importRecovery(
  text: string,
  account: string,
  database: LocalDatabase = db,
): Promise<void> {
  if (new TextEncoder().encode(text).length > 20 * 1024 * 1024)
    throw new Error('Il backup supera 20 MiB.');
  const backup = recoverySchema.parse(JSON.parse(text));
  if (backup.account !== account) throw new Error('Accedi allo stesso account del backup.');
  const archiveDigest = await textDigest(text);
  const entries = [...backup.base, ...backup.overlay, ...backup.outbox, ...backup.conflicts];
  if (entries.some((row) => row.account !== account))
    throw new Error('Il backup contiene un altro proprietario.');
  for (const row of [...backup.base, ...backup.overlay])
    if (row.key !== `${account}:${row.entity.id}`) throw new Error('Chiave del backup incoerente.');
  for (const op of backup.outbox) {
    validatePayload(op.command);
    if (op.command.operation_id !== op.operation_id)
      throw new Error('Operazione del backup incoerente.');
  }
  if (backup.schema_version !== 1) {
    for (const history of backup.resolutions) {
      if (
        history.account !== account ||
        history.records.some((r) => r.account !== account) ||
        history.operations.some((p) => p.account !== account) ||
        history.redactedDecisions?.some((d) => d.account !== account)
      )
        throw new Error('Proprietario del recupero incoerente.');
    }
  }
  if (backup.schema_version === 3 && backup.redacted_decisions.some((d) => d.account !== account))
    throw new Error('Proprietario della decisione di recupero incoerente.');
  await database.transaction('rw', database.resolutions, async () => {
    await database.resolutions.put({
      key: `${account}:${crypto.randomUUID()}`,
      account,
      createdAt: new Date().toISOString(),
      reason: `Backup importato v${backup.schema_version}: confronto prima del ripristino`,
      operations: backup.outbox,
      records: [...backup.base, ...backup.overlay],
      ...(backup.schema_version === 3 ? { redactedDecisions: backup.redacted_decisions } : {}),
      sourceEpoch: backup.schema_version === 1 ? null : backup.sync_epoch,
      sourceDeviceId: backup.schema_version === 3 ? (backup.device_id ?? null) : null,
      sourceArchiveDigest: archiveDigest,
    });
    if (backup.schema_version !== 1)
      await database.resolutions.bulkPut(
        backup.resolutions.map((h) => ({ ...h, key: `${account}:${crypto.randomUUID()}` })),
      );
  });
}
export async function archiveAndReload(
  account: string,
  database: LocalDatabase = db,
): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.base,
      database.overlay,
      database.outbox,
      database.conflicts,
      database.meta,
      database.resolutions,
    ],
    async () => {
      if (!(await metadata(`${account}:recovery`, database)))
        throw new Error('Nessun ripristino da riconciliare.');
      const [base, overlay, operations, sourceEpoch, sourceDeviceId] = await Promise.all([
        database.base.where('account').equals(account).toArray(),
        database.overlay.where('account').equals(account).toArray(),
        database.outbox.where('account').equals(account).toArray(),
        metadata(`${account}:epoch`, database),
        metadata('device', database),
      ]);
      await database.resolutions.put({
        key: `${account}:${crypto.randomUUID()}`,
        account,
        createdAt: new Date().toISOString(),
        reason: 'Conservazione precedente al nuovo archivio remoto',
        operations: operations.filter((p) => p.command.command !== 'DecideProposal'),
        redactedDecisions: operations
          .filter((p) => p.command.command === 'DecideProposal')
          .map((p) => decisionIntent(p, p.command_digest ?? '')),
        records: [...base, ...overlay],
        sourceEpoch,
        sourceDeviceId,
      });
      for (const table of [database.base, database.overlay, database.outbox, database.conflicts])
        await table.where('account').equals(account).delete();
      await database.meta.bulkDelete(
        ['epoch', 'cursor', 'recovery', 'retry-at', 'retry-count'].map(
          (name) => `${account}:${name}`,
        ),
      );
    },
  );
}
export async function resolveConflict(
  account: string,
  operationId: string,
  choice: 'retry' | 'remote',
  database: LocalDatabase = db,
): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.base,
      database.overlay,
      database.outbox,
      database.conflicts,
      database.resolutions,
      database.meta,
    ],
    async () => {
      const conflict = await database.conflicts.get(`${account}:${operationId}`);
      if (!conflict) throw new Error('Conflitto non più presente.');
      const all = (await database.outbox.where('account').equals(account).toArray()).sort(
        (a, b) => a.order - b.order,
      );
      const selected = new Set([operationId]);
      for (const op of all)
        if (op.command.depends_on.some((id) => selected.has(id))) selected.add(op.operation_id);
      const affected = all.filter((op) => selected.has(op.operation_id));
      const ids = new Set(affected.flatMap((op) => op.affects));
      const overlay = (await database.overlay.where('account').equals(account).toArray()).filter(
        (row) => ids.has(row.entity.id),
      );
      const replacements: Pending[] = [];
      const projected: StoredRecord[] = [];
      if (choice === 'retry') {
        const known = (await records(account, database)).filter((r) => !ids.has(r.id));
        const base = await database.base.where('account').equals(account).toArray();
        known.push(...base.filter((row) => ids.has(row.entity.id)).map((row) => row.entity));
        const mapping = new Map(affected.map((op) => [op.operation_id, crypto.randomUUID()]));
        for (const op of affected) {
          const newId = mapping.get(op.operation_id)!;
          const command = {
            ...op.command,
            operation_id: newId,
            client_recorded_at: new Date().toISOString(),
            depends_on: op.command.depends_on.map((id) => mapping.get(id) ?? id),
            base:
              op.command.base.kind === 'operation_result' &&
              mapping.has(op.command.base.operation_id)
                ? { ...op.command.base, operation_id: mapping.get(op.command.base.operation_id)! }
                : {
                    kind: 'server_revision' as const,
                    revision:
                      base.find((r) => r.entity.id === op.command.aggregate_id)?.entity.revision ??
                      '0',
                  },
          };
          const changed = projectCommand(command, known);
          for (const entity of changed) {
            const index = known.findIndex((r) => r.id === entity.id);
            if (index >= 0) known[index] = entity;
            else known.push(entity);
            projected.push({ key: `${account}:${entity.id}`, account, entity });
          }
          replacements.push({
            ...op,
            operation_id: newId,
            command,
            status: 'pending',
            error: null,
          });
        }
      }
      // Conservare entrambe le intenzioni anche quando si sceglie il valore remoto.
      await database.resolutions.put({
        key: `${account}:${crypto.randomUUID()}`,
        account,
        createdAt: new Date().toISOString(),
        reason: choice === 'retry' ? 'Nuovo tentativo dopo confronto' : 'Scelta dei valori remoti',
        operations: affected.filter((p) => p.command.command !== 'DecideProposal'),
        redactedDecisions: affected
          .filter((p) => p.command.command === 'DecideProposal')
          .map((p) => decisionIntent(p, p.command_digest ?? '')),
        records: overlay,
      });
      await database.outbox.bulkDelete([...selected]);
      await database.conflicts.bulkDelete([...selected].map((id) => `${account}:${id}`));
      await database.outbox.bulkPut(replacements);
      const remaining = await database.outbox.where('account').equals(account).toArray();
      for (const id of ids)
        if (!remaining.some((op) => op.affects.includes(id)))
          await database.overlay.delete(`${account}:${id}`);
      if (choice === 'retry') await database.overlay.bulkPut(projected);
      await setMetadata(`${account}:retry-at`, '0', database);
    },
  );
}
