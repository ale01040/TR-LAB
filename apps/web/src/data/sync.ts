import { pullSchema, receiptSchema, type Receipt } from '@tr-lab/contracts';
import { applyReceipt, db, metadata, setMetadata, storeNewer } from './database';

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
let csrf: string | null = null;
export function setCsrf(value: string | null): void {
  csrf = value;
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  account?: string,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-TR-LAB': '1',
      ...(account ? { 'X-Account-ID': account } : {}),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
  const result: unknown = await response.json();
  if (!response.ok)
    throw new ApiError(
      typeof result === 'object' && result !== null && 'code' in result
        ? String(result.code)
        : 'NETWORK_ERROR',
      response.status,
    );
  return result as T;
}
const running = new Map<string, Promise<void>>();
export function synchronize(account: string): Promise<void> {
  const current = running.get(account);
  if (current) return current;
  const task = perform(account).finally(() => running.delete(account));
  running.set(account, task);
  return task;
}
async function perform(account: string): Promise<void> {
  if (!navigator.onLine || (await metadata('logout-pending')))
    throw new Error('Sincronizzazione sospesa.');
  const known = await metadata(`${account}:epoch`);
  const start = await api<{ sync_epoch: string; cursor: string }>(
    '/sync/bootstrap',
    'GET',
    undefined,
    account,
  );
  if (known && known !== start.sync_epoch) {
    await setMetadata(`${account}:recovery`, 'epoch');
    throw new Error('Archivio ripristinato: esporta i dati locali prima della riconciliazione.');
  }
  if (!known) {
    await setMetadata(`${account}:epoch`, start.sync_epoch);
    await setMetadata(`${account}:cursor`, start.cursor);
  }
  const pending = (await db.outbox.where('account').equals(account).toArray()).sort(
    (a, b) => a.order - b.order,
  );
  const blocked = new Set(pending.filter((p) => p.status === 'blocked').map((p) => p.operation_id));
  for (const item of pending) {
    if (item.status === 'blocked' || item.command.depends_on.some((id) => blocked.has(id))) {
      blocked.add(item.operation_id);
      continue;
    }
    const result = receiptSchema.parse(
      await api<Receipt>('/sync/command', 'POST', item.command, account),
    );
    await applyReceipt(account, result);
    if (result.status === 'rejected') blocked.add(item.operation_id);
  }
  let more = true;
  while (more) {
    const cursor = await metadata(`${account}:cursor`);
    if (!cursor) throw new Error('Cursore assente.');
    const page = pullSchema.parse(
      await api(`/sync/pull?cursor=${encodeURIComponent(cursor)}`, 'GET', undefined, account),
    );
    if (page.sync_epoch !== start.sync_epoch)
      throw new Error('Archivio cambiato durante la sincronizzazione.');
    await db.transaction('rw', db.base, db.meta, async () => {
      for (const event of page.events) await storeNewer(account, event.record);
      await setMetadata(`${account}:cursor`, page.next_cursor);
    });
    more = page.has_more;
  }
  await setMetadata(`${account}:last-sync`, new Date().toISOString());
}
