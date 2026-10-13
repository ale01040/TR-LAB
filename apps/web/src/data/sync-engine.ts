import { pullSchema, receiptSchema } from '@tr-lab/contracts';
import { applyReceipt, metadata, setMetadata, storeNewer, type LocalDatabase } from './database';
import { ApiError } from './http';
export type SyncTransport = <T>(
  path: string,
  method?: string,
  body?: unknown,
  account?: string,
) => Promise<T>;
export type SyncOptions = {
  database: LocalDatabase;
  request: SyncTransport;
  isCurrent: () => boolean;
  online: () => boolean;
  now?: () => number;
};
export async function performSync(account: string, options: SyncOptions): Promise<void> {
  const { database, request, isCurrent, online } = options;
  const now = options.now ?? Date.now;
  async function guard() {
    if (!isCurrent() || !online() || (await metadata('logout-pending', database)))
      throw new Error('Sincronizzazione sospesa. I dati restano sul dispositivo.');
    if (await metadata(`${account}:recovery`, database))
      throw new Error('Archivio da riconciliare: conserva il backup locale prima di continuare.');
  }
  const send: SyncTransport = async <T>(path: string, method?: string, body?: unknown) => {
    await guard();
    const result = await request<T>(path, method, body, account);
    await guard();
    return result;
  };
  await guard();
  if (Number((await metadata(`${account}:retry-at`, database)) ?? 0) > now())
    throw new Error('Il server ha richiesto una pausa. Le operazioni restano in coda.');
  try {
    const known = await metadata(`${account}:epoch`, database);
    const start = await send<{ sync_epoch: string; cursor: string; protocol_version?: number }>(
      '/sync/bootstrap',
    );
    const protocol = start.protocol_version === 2 ? '2' : '1';
    if (known && known !== start.sync_epoch) {
      await setMetadata(`${account}:recovery`, 'epoch', database);
      throw new Error(
        'Archivio ripristinato: conserva il backup locale prima della riconciliazione.',
      );
    }
    if (!known) {
      if (await database.outbox.where('account').equals(account).count())
        throw new Error('Coda senza archivio di origine: esporta il backup per il recupero.');
      // La prima fotografia resta temporanea fino all'ultima pagina. Nessuna base parziale.
      const batch = crypto.randomUUID();
      await database.staging.where('account').equals(account).delete();
      let cursor = start.cursor;
      let more = true;
      try {
        while (more) {
          const page = pullSchema.parse(
            await send(`/sync/pull?cursor=${encodeURIComponent(cursor)}&protocol=${protocol}`),
          );
          if (page.sync_epoch !== start.sync_epoch)
            throw new Error('Archivio cambiato durante il download.');
          await database.transaction('rw', database.staging, async () => {
            if (!isCurrent()) throw new Error('Sessione cambiata.');
            for (const event of page.events)
              await database.staging.put({
                key: `${batch}:${event.record.id}`,
                account,
                batch,
                entity: event.record,
              });
          });
          cursor = page.next_cursor;
          more = page.has_more;
        }
        await guard();
        await database.transaction(
          'rw',
          [database.base, database.staging, database.meta],
          async () => {
            if (!isCurrent()) throw new Error('Sessione cambiata.');
            const staged = await database.staging.where('batch').equals(batch).toArray();
            await database.base.where('account').equals(account).delete();
            for (const row of staged) await storeNewer(account, row.entity, database);
            await setMetadata(`${account}:epoch`, start.sync_epoch, database);
            await setMetadata(`${account}:cursor`, cursor, database);
            await database.staging.where('batch').equals(batch).delete();
          },
        );
      } catch (error) {
        await database.staging.where('batch').equals(batch).delete();
        throw error;
      }
    }
    await setMetadata(`${account}:protocol`, protocol, database);
    const pending = (await database.outbox.where('account').equals(account).toArray()).sort(
      (a, b) => a.order - b.order,
    );
    const blocked = new Set(
      pending.filter((p) => p.status === 'blocked').map((p) => p.operation_id),
    );
    for (const item of pending) {
      if (item.status === 'blocked' || item.command.depends_on.some((id) => blocked.has(id))) {
        blocked.add(item.operation_id);
        continue;
      }
      const receipt = receiptSchema.parse(await send('/sync/command', 'POST', item.command));
      await guard();
      await applyReceipt(account, receipt, database);
      if (receipt.status === 'rejected') blocked.add(item.operation_id);
    }
    let more = true;
    while (more) {
      const cursor = await metadata(`${account}:cursor`, database);
      if (!cursor) throw new Error('Cursore assente.');
      const page = pullSchema.parse(
        await send(`/sync/pull?cursor=${encodeURIComponent(cursor)}&protocol=${protocol}`),
      );
      if (page.sync_epoch !== start.sync_epoch) {
        await setMetadata(`${account}:recovery`, 'epoch', database);
        throw new Error('Archivio cambiato durante la sincronizzazione.');
      }
      await database.transaction('rw', database.base, database.meta, async () => {
        if (!isCurrent()) throw new Error('Sessione cambiata.');
        for (const event of page.events) await storeNewer(account, event.record, database);
        await setMetadata(`${account}:cursor`, page.next_cursor, database);
      });
      more = page.has_more;
    }
    await setMetadata(`${account}:last-sync`, new Date(now()).toISOString(), database);
    await database.meta.bulkDelete([`${account}:retry-at`, `${account}:retry-count`]);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'EPOCH_MISMATCH')
      await setMetadata(`${account}:recovery`, 'epoch', database);
    if (
      isCurrent() &&
      (!(error instanceof ApiError) || error.status === 429 || error.status >= 500)
    ) {
      const attempts = Math.min(
        6,
        Number((await metadata(`${account}:retry-count`, database)) ?? 0) + 1,
      );
      await setMetadata(`${account}:retry-count`, String(attempts), database);
      await setMetadata(
        `${account}:retry-at`,
        String(
          now() +
            Math.max(
              error instanceof ApiError ? error.retryAfterMs : 0,
              Math.min(60000, 1000 * 2 ** attempts),
            ),
        ),
        database,
      );
    }
    throw error;
  }
}
