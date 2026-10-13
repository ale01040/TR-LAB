import { db, metadata, setMetadata, type LocalDatabase } from './database';
import { api } from './http';
import { performSync } from './sync-engine';
export { api, ApiError, setCsrf } from './http';
const running = new Map<string, Promise<void>>();
export async function withSyncLease(
  account: string,
  task: () => Promise<void>,
  database: LocalDatabase = db,
): Promise<void> {
  const id = crypto.randomUUID();
  const key = `${account}:sync-lease`;
  const claimed = await database.transaction('rw', database.meta, async () => {
    const value = await metadata(key, database);
    if (value && Number(value.split(':')[0]) > Date.now()) return false;
    await setMetadata(key, `${Date.now() + 45000}:${id}`, database);
    return true;
  });
  if (!claimed) return;
  const heartbeat = setInterval(() => {
    void database
      .transaction('rw', database.meta, async () => {
        if ((await metadata(key, database))?.endsWith(`:${id}`))
          await setMetadata(key, `${Date.now() + 45000}:${id}`, database);
      })
      .catch(() => {});
  }, 10000);
  try {
    await task();
  } finally {
    clearInterval(heartbeat);
    await database.transaction('rw', database.meta, async () => {
      if ((await metadata(key, database))?.endsWith(`:${id}`)) await database.meta.delete(key);
    });
  }
}
export function synchronize(
  account: string,
  context: { isCurrent?: () => boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const current = running.get(account);
  if (current) return current;
  const execute = () =>
    performSync(account, {
      database: db,
      request: <T>(path: string, method?: string, body?: unknown, owner?: string) =>
        api<T>(path, method, body, owner, context.signal),
      isCurrent: () => !context.signal?.aborted && (context.isCurrent?.() ?? true),
      online: () => navigator.onLine,
    });
  const task = (
    navigator.locks
      ? navigator.locks.request(`tr-lab-sync:${account}`, { ifAvailable: true }, async (lock) => {
          if (lock) await execute();
        })
      : withSyncLease(account, execute)
  ).finally(() => running.delete(account));
  running.set(account, task);
  return task;
}
