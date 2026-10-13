import 'fake-indexeddb/auto';
import type { PGlite } from '@electric-sql/pglite';
import type { Entity, Receipt } from '@tr-lab/contracts';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import {
  LocalDatabase,
  metadata,
  records,
  saveLocally,
  setMetadata,
  storeNewer,
} from '../../apps/web/src/data/database';
import { performSync, type SyncTransport } from '../../apps/web/src/data/sync-engine';
import { withSyncLease } from '../../apps/web/src/data/sync';
import { ApiError } from '../../apps/web/src/data/http';
import { createTestDatabase, queryAs } from '../helpers/test-database';
import { program, session, setLog } from '../helpers/fixtures';
let remote: PGlite;
const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const devices: LocalDatabase[] = [];
beforeAll(async () => {
  remote = await createTestDatabase([a, b]);
});
afterEach(async () => {
  for (const d of devices) await d.delete();
  devices.length = 0;
});
afterAll(async () => {
  await remote.close();
});
function device() {
  const d = new LocalDatabase(crypto.randomUUID());
  devices.push(d);
  return d;
}
function transport(owner: string): SyncTransport {
  return async <T>(path: string, _method?: string, body?: unknown) => {
    let value: unknown;
    if (path === '/sync/bootstrap') {
      const r = await queryAs<{ sync_epoch: string; sequence: string }>(
        remote,
        owner,
        'select public.tr_lab_bootstrap() result',
      );
      value = { sync_epoch: r?.sync_epoch, cursor: '0' };
    } else if (path === '/sync/command') {
      value = await queryAs(remote, owner, 'select public.tr_lab_apply($1::jsonb) result', [
        JSON.stringify(body),
      ]);
    } else {
      const cursor = new URL(`https://synthetic.test${path}`).searchParams.get('cursor');
      const bootstrap = await queryAs<{ sync_epoch: string }>(
        remote,
        owner,
        'select public.tr_lab_bootstrap() result',
      );
      const r = await queryAs<{
        sync_epoch: string;
        next_sequence: string;
        has_more: boolean;
        events: unknown[];
      }>(remote, owner, 'select public.tr_lab_pull($1,null,$2::uuid) result', [
        cursor,
        bootstrap?.sync_epoch,
      ]);
      value = { ...r, next_cursor: r?.next_sequence };
      if (value && typeof value === 'object')
        delete (value as Record<string, unknown>).next_sequence;
    }
    return value as T;
  };
}
const run = (owner: string, d: LocalDatabase, request = transport(owner), isCurrent = () => true) =>
  performSync(owner, { database: d, request, isCurrent, online: () => true });
function measure(): Extract<Entity, { kind: 'measurement' }> {
  const id = crypto.randomUUID();
  return {
    id,
    kind: 'measurement',
    revision: '0',
    data: {
      id,
      date: '2026-10-13',
      kind: 'weight',
      side: 'none',
      value: 80000,
      unit: 'g',
      notes: 'Sintetico: caffè',
    },
  };
}
it('due device dello stesso account convergono; un altro account resta isolato · S01/S13', async () => {
  const phone = device(),
    pc = device(),
    other = device();
  await run(a, phone);
  await run(a, pc);
  await run(b, other);
  const p = program();
  p.days = [p.days[0]!];
  p.weeks = [p.weeks[0]!];
  await saveLocally(
    a,
    'SaveProgramDraft',
    { id: p.id, kind: 'program', revision: '0', data: p },
    [],
    phone,
  );
  await saveLocally(
    a,
    'ApproveProgram',
    { id: p.id, kind: 'program', revision: '0', data: { ...p, status: 'approved' } },
    [],
    phone,
  );
  const s = session(p);
  await saveLocally(
    a,
    'StartWorkout',
    { id: s.id, kind: 'session', revision: '0', data: s },
    [],
    phone,
  );
  const parent = (await records(a, phone)).find((r) => r.id === s.id)!;
  const log = setLog(s);
  await saveLocally(
    a,
    'SaveSet',
    { id: log.id, kind: 'set', revision: '0', data: { ...log, rir: 0 } },
    [parent],
    phone,
  );
  phone.close();
  await phone.open();
  expect((await records(a, phone)).some((r) => r.id === log.id)).toBe(true);
  await run(a, phone);
  await run(a, pc);
  await run(b, other);
  expect((await records(a, pc)).find((r) => r.id === log.id)?.data).toHaveProperty('rir', 0);
  expect((await records(b, other)).some((r) => r.id === p.id)).toBe(false);
  expect(await records(b, phone)).toEqual([]);
  expect(await phone.outbox.count()).toBe(0);
});
it('commit remoto con risposta persa si ritenta con lo stesso ID, un solo effetto · S02/S03', async () => {
  const d = device();
  await run(a, d);
  const m = measure();
  await saveLocally(a, 'SaveMeasurement', m, [], d);
  const pending = (await d.outbox.toArray())[0]!;
  const request = transport(a);
  let lost = true;
  const faulty: SyncTransport = async <T>(
    path: string,
    method?: string,
    body?: unknown,
    owner?: string,
  ) => {
    const result = await request<T>(path, method, body, owner);
    if (path === '/sync/command' && lost) {
      lost = false;
      throw new ApiError('NETWORK_ERROR', 503);
    }
    return result;
  };
  await expect(run(a, d, faulty)).rejects.toThrow('NETWORK_ERROR');
  expect((await d.outbox.toArray())[0]?.operation_id).toBe(pending.operation_id);
  await setMetadata(`${a}:retry-at`, '0', d);
  await run(a, d, faulty);
  const receipt = await request<Receipt>('/sync/command', 'POST', pending.command, a);
  for (let i = 0; i < 100; i++)
    expect(await request('/sync/command', 'POST', pending.command, a)).toEqual(receipt);
  expect(
    (
      await remote.query<{ revision: number }>(
        'select revision from public.tr_lab_records where owner_id=$1 and id=$2',
        [a, m.id],
      )
    ).rows[0]?.revision,
  ).toBe(1);
  await expect(
    request(
      '/sync/command',
      'POST',
      { ...pending.command, payload: { ...m.data, notes: 'Alterato' } },
      a,
    ),
  ).rejects.toThrow('OPERATION_ID_REUSED');
});
it('push non salta la modifica del PC arrivata dopo il vecchio cursore · S06', async () => {
  const phone = device(),
    pc = device();
  await run(a, phone);
  await run(a, pc);
  const x = measure(),
    y = measure();
  await saveLocally(a, 'SaveMeasurement', x, [], pc);
  await run(a, pc);
  await saveLocally(a, 'SaveMeasurement', y, [], phone);
  await run(a, phone);
  expect((await records(a, phone)).map((r) => r.id)).toEqual(expect.arrayContaining([x.id, y.id]));
});
it('conflitto conserva due intenzioni e blocca soltanto la catena dipendente · S04', async () => {
  const phone = device(),
    pc = device();
  await run(a, phone);
  const m = measure();
  await saveLocally(a, 'SaveMeasurement', m, [], phone);
  await run(a, phone);
  await run(a, pc);
  const edit = (notes: string): Entity => ({ ...m, data: { ...m.data, notes } });
  await saveLocally(a, 'SaveMeasurement', edit('Telefono'), [], phone);
  await saveLocally(a, 'SaveMeasurement', edit('PC'), [], pc);
  await run(a, pc);
  await run(a, phone);
  expect((await records(a, phone)).find((r) => r.id === m.id)?.data).toHaveProperty(
    'notes',
    'Telefono',
  );
  expect((await phone.base.get(`${a}:${m.id}`))?.entity.data).toHaveProperty('notes', 'PC');
  expect(await phone.conflicts.count()).toBe(1);
  const independent = measure();
  await saveLocally(a, 'SaveMeasurement', independent, [], phone);
  await run(a, phone);
  expect((await phone.base.get(`${a}:${independent.id}`))?.entity.id).toBe(independent.id);
});
it('prima fotografia interrotta non rende visibile una base parziale · S08', async () => {
  const d = device();
  const p = program();
  let calls = 0;
  const request: SyncTransport = async <T>(path: string) => {
    const result =
      path === '/sync/bootstrap'
        ? { sync_epoch: crypto.randomUUID(), cursor: '0' }
        : { sync_epoch: 'bad', next_cursor: '1', has_more: true, events: [] };
    if (path === '/sync/bootstrap') {
      (result as { sync_epoch: string }).sync_epoch = '11111111-1111-4111-8111-111111111111';
    } else if (++calls === 1)
      Object.assign(result, {
        sync_epoch: '11111111-1111-4111-8111-111111111111',
        events: [{ sequence: '1', record: { id: p.id, kind: 'program', revision: '1', data: p } }],
      });
    else throw new ApiError('OFFLINE', 503);
    return result as T;
  };
  await expect(run(a, d, request)).rejects.toThrow('OFFLINE');
  expect(await records(a, d)).toEqual([]);
  expect(await metadata(`${a}:epoch`, d)).toBeNull();
  expect(await d.staging.count()).toBe(0);
});
it('risposta tardiva dopo cambio account non entra nel database · S12', async () => {
  const d = device();
  await run(a, d);
  const m = measure();
  await saveLocally(a, 'SaveMeasurement', m, [], d);
  let current = true;
  const source = transport(a);
  const request: SyncTransport = async <T>(path: string, method?: string, body?: unknown) => {
    const result = await source<T>(path, method, body, a);
    if (path === '/sync/command') current = false;
    return result;
  };
  await expect(run(a, d, request, () => current)).rejects.toThrow('sospesa');
  expect(await d.outbox.count()).toBe(1);
  expect(await d.base.get(`${a}:${m.id}`)).toBeUndefined();
  await run(a, d);
  expect(await d.outbox.count()).toBe(0);
});
it('Retry-After conserva la coda e non martella il server · S09', async () => {
  const d = device();
  await run(a, d);
  const m = measure();
  await saveLocally(a, 'SaveMeasurement', m, [], d);
  let calls = 0;
  const request: SyncTransport = async () => {
    calls++;
    throw new ApiError('RATE_LIMITED', 429, 60000);
  };
  await expect(run(a, d, request)).rejects.toThrow('RATE_LIMITED');
  await expect(run(a, d, request)).rejects.toThrow('pausa');
  expect(calls).toBe(1);
  expect(await d.outbox.count()).toBe(1);
});
it('epoch diverso preserva base e coda e impedisce nuove modifiche · S16', async () => {
  const d = device();
  await run(a, d);
  const m = measure();
  await saveLocally(a, 'SaveMeasurement', m, [], d);
  const request: SyncTransport = async <T>() =>
    ({ sync_epoch: crypto.randomUUID(), cursor: '0' }) as T;
  await expect(run(a, d, request)).rejects.toThrow('ripristinato');
  expect(await d.outbox.count()).toBe(1);
  await expect(saveLocally(a, 'SaveMeasurement', measure(), [], d)).rejects.toThrow('riconciliare');
});
it('due istanze coordinano la lease, una lease scaduta è recuperabile · S11', async () => {
  const d = device();
  let finish!: () => void;
  let calls = 0;
  const first = withSyncLease(
    a,
    async () => {
      calls++;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    },
    d,
  );
  while (!finish) await new Promise((resolve) => setTimeout(resolve, 1));
  await withSyncLease(
    a,
    async () => {
      calls++;
    },
    d,
  );
  expect(calls).toBe(1);
  finish();
  await first;
  await setMetadata(`${a}:sync-lease`, '1:abandoned', d);
  await withSyncLease(
    a,
    async () => {
      calls++;
    },
    d,
  );
  expect(calls).toBe(2);
});
it('ricevute non esatte e transazioni abortite non cancellano la coda · S14', async () => {
  const d = device();
  await run(a, d);
  const m = measure();
  await saveLocally(a, 'SaveMeasurement', m, [], d);
  const source = transport(a);
  const request: SyncTransport = async <T>(path: string, method?: string, body?: unknown) =>
    path === '/sync/command' ? ({ status: 'applied' } as T) : source<T>(path, method, body, a);
  await expect(run(a, d, request)).rejects.toThrow();
  expect(await d.outbox.count()).toBe(1);
  await expect(
    d.transaction('rw', d.base, async () => {
      await storeNewer(a, m, d);
      throw new Error('abort');
    }),
  ).rejects.toThrow('abort');
  expect(await d.base.get(`${a}:${m.id}`)).toBeUndefined();
});
