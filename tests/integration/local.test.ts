import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import {
  LocalDatabase,
  applyReceipt,
  emergencyExport,
  records,
  saveLocally,
  setMetadata,
  storeNewer,
} from '../../apps/web/src/data/database';
import { program, session, setLog, now } from '../helpers/fixtures';
import type { Entity } from '@tr-lab/contracts';
const databases: LocalDatabase[] = [];
function database() {
  const d = new LocalDatabase(crypto.randomUUID());
  databases.push(d);
  return d;
}
afterEach(async () => {
  for (const d of databases) await d.delete();
  databases.length = 0;
});
it('salva e riprende sul dispositivo, senza creare una coda cloud', async () => {
  const d = database();
  const p = program();
  await saveLocally(
    'device',
    'SaveProgramDraft',
    { id: p.id, kind: 'program', revision: '0', data: p },
    [],
    d,
  );
  expect((await records('device', d))[0]?.revision).toBe('1');
  expect(await d.outbox.count()).toBe(0);
  expect(await records('altro', d)).toEqual([]);
});
it('overlay e intenzione atomici, ricevuta non cancella modifiche successive', async () => {
  const d = database();
  const owner = crypto.randomUUID();
  await setMetadata(`${owner}:epoch`, crypto.randomUUID(), d);
  const p = program();
  const entity: Entity = { id: p.id, kind: 'program', revision: '0', data: p };
  await saveLocally(owner, 'SaveProgramDraft', entity, [], d);
  await saveLocally(owner, 'SaveProgramDraft', { ...entity, data: { ...p, name: 'Dopo' } }, [], d);
  const pending = (await d.outbox.toArray()).sort((a, b) => a.order - b.order);
  const first = pending[0];
  const second = pending[1];
  if (!first || !second) throw new Error();
  expect(second.command.base).toEqual({
    kind: 'operation_result',
    operation_id: first.operation_id,
    record_id: p.id,
  });
  await applyReceipt(
    owner,
    {
      operation_id: first.operation_id,
      status: 'applied',
      code: null,
      records: [{ ...entity, revision: '1' }],
    },
    d,
  );
  expect((await records(owner, d))[0]?.data).toHaveProperty('name', 'Dopo');
  await applyReceipt(
    owner,
    {
      operation_id: second.operation_id,
      status: 'applied',
      code: null,
      records: [{ ...entity, revision: '2', data: { ...p, name: 'Dopo' } }],
    },
    d,
  );
  expect(await d.outbox.count()).toBe(0);
  expect(await d.overlay.count()).toBe(0);
});
it('conflitto conserva overlay e export, pull non sovrascrive l’intenzione', async () => {
  const d = database();
  const owner = crypto.randomUUID();
  await setMetadata(`${owner}:epoch`, crypto.randomUUID(), d);
  const p = program();
  const entity: Entity = { id: p.id, kind: 'program', revision: '0', data: p };
  await saveLocally(owner, 'SaveProgramDraft', entity, [], d);
  const pending = (await d.outbox.toArray())[0];
  if (!pending) throw new Error();
  await applyReceipt(
    owner,
    {
      operation_id: pending.operation_id,
      status: 'rejected',
      code: 'REVISION_CONFLICT',
      records: [],
    },
    d,
  );
  await storeNewer(owner, { ...entity, revision: '9', data: { ...p, name: 'Remoto' } }, d);
  expect((await records(owner, d))[0]?.data).toHaveProperty('name', p.name);
  expect(await d.conflicts.count()).toBe(1);
  expect(JSON.parse(await emergencyExport(owner, d)).outbox).toHaveLength(1);
  expect(JSON.parse(await emergencyExport('altro', d)).outbox).toHaveLength(0);
});
it('offline non permette di cambiare target approvati o modificare una seduta conclusa', async () => {
  const d = database();
  const p = program();
  const draft: Entity = { id: p.id, kind: 'program', revision: '0', data: p };
  await saveLocally('device', 'SaveProgramDraft', draft, [], d);
  const approved: Entity = { ...draft, data: { ...p, status: 'approved' } };
  await saveLocally('device', 'ApproveProgram', approved, [], d);
  await expect(
    saveLocally(
      'device',
      'SaveProgramDraft',
      { ...draft, data: { ...p, name: 'Alterata' } },
      [],
      d,
    ),
  ).rejects.toThrow('non consentita');
  expect((await records('device', d))[0]?.data).toHaveProperty('status', 'approved');
  const s = session(p);
  await saveLocally(
    'device',
    'StartWorkout',
    { id: s.id, kind: 'session', revision: '0', data: s },
    [],
    d,
  );
  await saveLocally(
    'device',
    'FinishWorkout',
    { id: s.id, kind: 'session', revision: '0', data: { ...s, status: 'completed', endedAt: now } },
    [],
    d,
  );
  const parent = (await records('device', d)).find((r) => r.id === s.id);
  if (!parent) throw new Error('Seduta assente');
  const log = setLog(s);
  await expect(
    saveLocally(
      'device',
      'SaveSet',
      { id: log.id, kind: 'set', revision: '0', data: log },
      [parent],
      d,
    ),
  ).rejects.toThrow('non consentita');
  expect(await d.outbox.count()).toBe(0);
});
