import Dexie, { type EntityTable } from 'dexie';
import { assertLocalChange } from '@tr-lab/domain';
import { commandDigest } from './command-digest';
import { decisionIntent } from './decision-intent';
import {
  commandSchema,
  featureCommandSchema,
  recordSchema,
  proposalDecisionPayload,
  validatePayload,
  type Command,
  type Entity,
  type Receipt,
} from '@tr-lab/contracts';

export type StoredRecord = { key: string; account: string; entity: Entity };
export type Pending = {
  operation_id: string;
  account: string;
  order: number;
  command: Command;
  affects: string[];
  status: 'pending' | 'blocked';
  error: string | null;
  command_digest?: string;
};
export type Meta = { key: string; value: string };
export type Conflict = { key: string; account: string; operation: Pending; receipt: Receipt };
export type StagedRecord = StoredRecord & { batch: string };
export type Resolution = {
  key: string;
  account: string;
  createdAt: string;
  reason: string;
  operations: Pending[];
  records: StoredRecord[];
  redactedDecisions?: RecoveryDecision[];
  sourceEpoch?: string | null;
  sourceDeviceId?: string | null;
  sourceArchiveDigest?: string | null;
};
export type RecoveryDecision = {
  account: string;
  operationId: string;
  proposalId: string;
  proposalRevision: string;
  contentDigest: string;
  choice: 'accept' | 'reject';
  commandDigest: string;
  digestVersion: 'jcs-1-sha256';
  requiresReview: true;
};

export class LocalDatabase extends Dexie {
  base!: EntityTable<StoredRecord, 'key'>;
  overlay!: EntityTable<StoredRecord, 'key'>;
  outbox!: EntityTable<Pending, 'operation_id'>;
  meta!: EntityTable<Meta, 'key'>;
  conflicts!: EntityTable<Conflict, 'key'>;
  staging!: EntityTable<StagedRecord, 'key'>;
  resolutions!: EntityTable<Resolution, 'key'>;
  constructor(name = 'tr-lab-v1') {
    super(name);
    this.version(1).stores({
      base: 'key,account',
      overlay: 'key,account',
      outbox: 'operation_id,account,[account+order]',
      meta: 'key',
      conflicts: 'key,account',
    });
    this.version(2).stores({ staging: 'key,account,batch', resolutions: 'key,account' });
  }
}
export const db = new LocalDatabase();
export const localAccount = 'device';
const key = (account: string, id: string) => `${account}:${id}`;

export async function records(account: string, database = db): Promise<Entity[]> {
  const [base, overlay] = await Promise.all([
    database.base.where('account').equals(account).toArray(),
    database.overlay.where('account').equals(account).toArray(),
  ]);
  return [...new Map([...base, ...overlay].map((r) => [r.entity.id, r.entity])).values()];
}
export async function metadata(name: string, database = db): Promise<string | null> {
  return (await database.meta.get(name))?.value ?? null;
}
export async function setMetadata(name: string, value: string, database = db): Promise<void> {
  await database.meta.put({ key: name, value });
}

export async function saveLocally(
  account: string,
  commandName: Command['command'],
  entity: Entity,
  related: Entity[] = [],
  database = db,
): Promise<void> {
  recordSchema.parse(entity);
  related.forEach((r) => recordSchema.parse(r));
  // L'intenzione e l'anteprima entrano nella stessa transazione: un crash non può separarle.
  await database.transaction(
    'rw',
    [database.base, database.overlay, database.outbox, database.meta],
    async () => {
      assertLocalChange(commandName, entity, await records(account, database), related);
      const items = await database.outbox.where('account').equals(account).toArray();
      const previous = items
        .filter((p) => p.affects.includes(entity.id))
        .sort((a, b) => b.order - a.order)[0];
      const device = (await metadata('device', database)) ?? crypto.randomUUID();
      await setMetadata('device', device, database);
      const epoch = await metadata(`${account}:epoch`, database);
      if (account !== localAccount && (await metadata(`${account}:recovery`, database)))
        throw new Error(
          'Archivio da riconciliare. Conserva il backup locale prima di nuove modifiche.',
        );
      if (account !== localAccount && !epoch)
        throw new Error(
          'Completa la prima sincronizzazione prima di modificare i dati dell’account.',
        );
      const baseRecord = await database.base.get(key(account, entity.id));
      const base: Command['base'] = previous
        ? { kind: 'operation_result', operation_id: previous.operation_id, record_id: entity.id }
        : { kind: 'server_revision', revision: baseRecord?.entity.revision ?? '0' };
      const depends_on: string[] = previous ? [previous.operation_id] : [];
      const parent =
        entity.kind === 'set'
          ? entity.data.sessionId
          : entity.kind === 'session'
            ? entity.data.programId
            : entity.kind === 'program' && entity.data.rootId !== entity.id
              ? entity.data.rootId
              : null;
      if (parent) {
        const dependency = items
          .filter((p) => p.affects.includes(parent))
          .sort((a, b) => b.order - a.order)[0];
        if (dependency && !depends_on.includes(dependency.operation_id))
          depends_on.push(dependency.operation_id);
      }
      const references =
        entity.kind === 'cycle'
          ? [entity.data.programId]
          : entity.kind === 'scheduled_session'
            ? [entity.data.cycleId, entity.data.programId]
            : entity.kind === 'program'
              ? entity.data.days.flatMap((d) =>
                  d.exercises
                    .filter((e) => e.exercise.id.startsWith('private:'))
                    .map((e) => e.exercise.id.slice(8)),
                )
              : [];
      for (const reference of references) {
        const dependency = items
          .filter((p) => p.affects.includes(reference))
          .sort((a, b) => b.order - a.order)[0];
        if (dependency && !depends_on.includes(dependency.operation_id))
          depends_on.push(dependency.operation_id);
      }
      const payload =
        commandName === 'ApproveProgram'
          ? { id: entity.id, confirmed: true }
          : commandName === 'ImportProgramDraft'
            ? {
                id: entity.id,
                program: entity.data,
                report: related.find((r) => r.kind === 'import_report')?.data,
                variants: related.filter((r) => r.kind === 'private_exercise').map((r) => r.data),
              }
            : commandName === 'PlanCycle'
              ? { id: entity.id, cycle: entity.data, occurrences: related.map((r) => r.data) }
              : commandName === 'StartScheduledWorkout'
                ? { id: entity.id, session: related[0]?.data }
                : entity.data;
      const feature = featureCommandSchema.shape.command.safeParse(commandName).success;
      if (
        feature &&
        account !== localAccount &&
        (await metadata(`${account}:protocol`, database)) !== '2'
      )
        throw new Error(
          'Completa la sincronizzazione con il server aggiornato prima di usare questa funzione.',
        );
      const command = commandSchema.parse({
        protocol_version: feature ? 2 : 1,
        sync_epoch: epoch ?? '00000000-0000-4000-8000-000000000001',
        operation_id: crypto.randomUUID(),
        device_id: device,
        aggregate_id: entity.id,
        base,
        depends_on,
        client_recorded_at: new Date().toISOString(),
        command: commandName,
        payload,
      });
      validatePayload(command);
      if (
        account !== localAccount &&
        new TextEncoder().encode(JSON.stringify(command)).length > 200 * 1024
      )
        throw new Error(
          'La scheda supera il limite cloud di 200 KiB. Riduci il contenuto o dividi le giornate prima di salvarla.',
        );
      const nowOrder = Number((await metadata(`${account}:order`, database)) ?? '0') + 1;
      if (!Number.isSafeInteger(nowOrder) || nowOrder < 1)
        throw new Error(
          'Contatore locale non valido. Esporta il backup prima di ripristinare il dispositivo.',
        );
      await setMetadata(`${account}:order`, String(nowOrder), database);
      const changed = [entity, ...related];
      if (account === localAccount) {
        for (const r of changed)
          await database.base.put({
            key: key(account, r.id),
            account,
            entity: {
              ...r,
              revision: String(
                BigInt((await database.base.get(key(account, r.id)))?.entity.revision ?? '0') + 1n,
              ),
            },
          });
      } else {
        await database.outbox.put({
          operation_id: command.operation_id,
          account,
          order: nowOrder,
          command,
          affects: changed.map((r) => r.id),
          status: 'pending',
          error: null,
        });
        await database.overlay.bulkPut(
          changed.map((r) => ({ key: key(account, r.id), account, entity: r })),
        );
      }
    },
  );
}

export async function applyReceipt(
  account: string,
  receipt: Receipt,
  database = db,
): Promise<void> {
  const preliminary = await database.outbox.get(receipt.operation_id);
  const decisionDigest =
    preliminary?.account === account && preliminary.command.command === 'DecideProposal'
      ? (preliminary.command_digest ?? (await commandDigest(preliminary.command)))
      : null;
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
      const operation = await database.outbox.get(receipt.operation_id);
      if (!operation || operation.account !== account) return;
      if (operation.command.command === 'DecideProposal') {
        if (!decisionDigest) throw new Error('Digest della decisione non disponibile.');
        for (const entity of receipt.records) await storeNewer(account, entity, database);
        await database.resolutions.put({
          key: key(account, crypto.randomUUID()),
          account,
          createdAt: new Date().toISOString(),
          reason:
            receipt.status === 'applied'
              ? 'Decisione applicata: ricevuta conservata sul server'
              : 'Decisione non applicata: controllare l’esito prima di una nuova review',
          operations: [],
          records: [],
          redactedDecisions: [decisionIntent(operation, decisionDigest)],
        });
        await setMetadata(`${account}:last-decision-code`, receipt.code ?? 'APPLIED', database);
        await database.outbox.delete(operation.operation_id);
        await database.overlay.delete(key(account, operation.command.aggregate_id));
        return;
      }
      if (receipt.status === 'rejected') {
        for (const entity of receipt.records) await storeNewer(account, entity, database);
        await database.outbox.update(operation.operation_id, {
          status: 'blocked',
          error: receipt.code,
        });
        await database.conflicts.put({
          key: key(account, operation.operation_id),
          account,
          operation,
          receipt,
        });
        const remaining = await database.outbox.where('account').equals(account).toArray();
        const rejected = new Set([operation.operation_id]);
        for (const dependent of remaining.sort((a, b) => a.order - b.order))
          if (dependent.command.depends_on.some((id) => rejected.has(id))) {
            rejected.add(dependent.operation_id);
            await database.outbox.update(dependent.operation_id, {
              status: 'blocked',
              error: 'DEPENDENCY_REJECTED',
            });
          }
        return;
      }
      for (const entity of receipt.records) await storeNewer(account, entity, database);
      await database.outbox.delete(operation.operation_id);
      const remaining = await database.outbox.where('account').equals(account).toArray();
      for (const id of operation.affects)
        if (!remaining.some((p) => p.affects.includes(id)))
          await database.overlay.delete(key(account, id));
    },
  );
}
export async function storeNewer(account: string, entity: Entity, database = db): Promise<void> {
  const old = await database.base.get(key(account, entity.id));
  if (!old || BigInt(entity.revision) > BigInt(old.entity.revision))
    await database.base.put({ key: key(account, entity.id), account, entity });
}
export async function emergencyExport(account: string, database = db): Promise<string> {
  // Una sola fotografia consistente: una ricevuta non può separare coda e overlay nel backup.
  const snapshot = await database.transaction(
    'r',
    [
      database.base,
      database.overlay,
      database.outbox,
      database.conflicts,
      database.resolutions,
      database.meta,
    ],
    async () => {
      const [base, overlay, outbox, conflicts, resolutions, epoch, device] = await Promise.all([
        database.base.where('account').equals(account).toArray(),
        database.overlay.where('account').equals(account).toArray(),
        database.outbox.where('account').equals(account).toArray(),
        database.conflicts.where('account').equals(account).toArray(),
        database.resolutions.where('account').equals(account).toArray(),
        metadata(`${account}:epoch`, database),
        metadata('device', database),
      ]);
      return {
        format: 'tr-lab-local-recovery',
        schema_version: 3,
        warning: 'Include dati locali non sincronizzati. Non è un modello condivisibile.',
        account,
        exportedAt: new Date().toISOString(),
        base,
        overlay,
        outbox,
        conflicts,
        resolutions,
        sync_epoch: epoch,
        device_id: device,
      };
    },
  );
  // La fotografia è completa; hashing fuori dalla transazione IndexedDB, senza keepalive.
  const intents: RecoveryDecision[] = snapshot.resolutions.flatMap(
    (r) => r.redactedDecisions ?? [],
  );
  async function retain(operation: Pending): Promise<boolean> {
    if (operation.command.command !== 'DecideProposal') return true;
    const payload = proposalDecisionPayload.parse(operation.command.payload);
    intents.push({
      account,
      operationId: operation.operation_id,
      proposalId: payload.id,
      proposalRevision: payload.proposalRevision,
      contentDigest: payload.contentDigest,
      choice: payload.choice,
      commandDigest: operation.command_digest ?? (await commandDigest(operation.command)),
      digestVersion: 'jcs-1-sha256',
      requiresReview: true,
    });
    return false;
  }
  const outbox: Pending[] = [];
  for (const operation of snapshot.outbox) if (await retain(operation)) outbox.push(operation);
  const conflicts: Conflict[] = [];
  for (const conflict of snapshot.conflicts)
    if (await retain(conflict.operation)) conflicts.push(conflict);
  const resolutions: Resolution[] = [];
  for (const resolution of snapshot.resolutions) {
    const operations: Pending[] = [];
    for (const operation of resolution.operations)
      if (await retain(operation)) operations.push(operation);
    resolutions.push({ ...resolution, operations });
  }
  const unique = [...new Map(intents.map((i) => [i.operationId, i])).values()];
  return JSON.stringify(
    { ...snapshot, outbox, conflicts, resolutions, redacted_decisions: unique },
    null,
    2,
  );
}
