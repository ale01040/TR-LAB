import Dexie, { type EntityTable } from 'dexie';
import { assertLocalChange } from '@tr-lab/domain';
import {
  commandSchema,
  recordSchema,
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
};
export type Meta = { key: string; value: string };
export type Conflict = { key: string; account: string; operation: Pending; receipt: Receipt };

export class LocalDatabase extends Dexie {
  base!: EntityTable<StoredRecord, 'key'>;
  overlay!: EntityTable<StoredRecord, 'key'>;
  outbox!: EntityTable<Pending, 'operation_id'>;
  meta!: EntityTable<Meta, 'key'>;
  conflicts!: EntityTable<Conflict, 'key'>;
  constructor(name = 'tr-lab-v1') {
    super(name);
    this.version(1).stores({
      base: 'key,account',
      overlay: 'key,account',
      outbox: 'operation_id,account,[account+order]',
      meta: 'key',
      conflicts: 'key,account',
    });
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
      const payload =
        commandName === 'ApproveProgram' ? { id: entity.id, confirmed: true } : entity.data;
      const command = commandSchema.parse({
        protocol_version: 1,
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
  await database.transaction(
    'rw',
    [database.base, database.overlay, database.outbox, database.conflicts],
    async () => {
      const operation = await database.outbox.get(receipt.operation_id);
      if (!operation || operation.account !== account) return;
      if (receipt.status === 'rejected') {
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
  return database.transaction(
    'r',
    [database.base, database.overlay, database.outbox, database.conflicts],
    async () => {
      const [base, overlay, outbox, conflicts] = await Promise.all([
        database.base.where('account').equals(account).toArray(),
        database.overlay.where('account').equals(account).toArray(),
        database.outbox.where('account').equals(account).toArray(),
        database.conflicts.where('account').equals(account).toArray(),
      ]);
      return JSON.stringify(
        {
          format: 'tr-lab-local-recovery',
          schema_version: 1,
          warning: 'Include dati locali non sincronizzati. Non è un modello condivisibile.',
          account,
          exportedAt: new Date().toISOString(),
          base,
          overlay,
          outbox,
          conflicts,
        },
        null,
        2,
      );
    },
  );
}
