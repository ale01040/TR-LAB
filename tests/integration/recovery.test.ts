import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import {
  LocalDatabase,
  applyReceipt,
  emergencyExport,
  metadata,
  records,
  saveLocally,
  setMetadata,
  storeNewer,
} from '../../apps/web/src/data/database';
import {
  archiveAndReload,
  importRecovery,
  resolveConflict,
} from '../../apps/web/src/data/recovery';
import { program } from '../helpers/fixtures';
import type { Entity } from '@tr-lab/contracts';
const owner = crypto.randomUUID();
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
async function conflict(d: LocalDatabase) {
  await setMetadata(`${owner}:epoch`, crypto.randomUUID(), d);
  const id = crypto.randomUUID();
  const first: Extract<Entity, { kind: 'measurement' }> = {
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
      notes: 'Locale',
    },
  };
  await saveLocally(owner, 'SaveMeasurement', first, [], d);
  await saveLocally(
    owner,
    'SaveMeasurement',
    { ...first, data: { ...first.data, notes: 'Locale successivo' } },
    [],
    d,
  );
  const op = (await d.outbox.toArray()).sort((a, b) => a.order - b.order)[0]!;
  const remote = { ...first, revision: '9', data: { ...first.data, notes: 'Remoto' } };
  await applyReceipt(
    owner,
    {
      operation_id: op.operation_id,
      status: 'rejected',
      code: 'REVISION_CONFLICT',
      records: [remote],
    },
    d,
  );
  return { op, first, remote };
}
it('nuovo tentativo conserva gli originali e ricostruisce le dipendenze senza riusare ID · SYNC-03', async () => {
  const d = database();
  const { op, first } = await conflict(d);
  await resolveConflict(owner, op.operation_id, 'retry', d);
  const next = (await d.outbox.toArray()).sort((a, b) => a.order - b.order);
  expect(next).toHaveLength(2);
  expect(next[0]?.operation_id).not.toBe(op.operation_id);
  expect(next[0]?.command.base).toEqual({ kind: 'server_revision', revision: '9' });
  expect(next[1]?.command.base).toMatchObject({
    kind: 'operation_result',
    operation_id: next[0]?.operation_id,
  });
  expect(next.every((p) => p.status === 'pending')).toBe(true);
  expect((await records(owner, d)).find((r) => r.id === first.id)?.data).toHaveProperty(
    'notes',
    'Locale successivo',
  );
  expect((await d.resolutions.toArray())[0]?.operations[0]?.operation_id).toBe(op.operation_id);
});
it('scelta remota archivia la catena ma conserva le operazioni indipendenti · SYNC-03', async () => {
  const d = database();
  const { op, first } = await conflict(d);
  const p = program();
  await saveLocally(
    owner,
    'SaveProgramDraft',
    { id: p.id, kind: 'program', revision: '0', data: p },
    [],
    d,
  );
  await resolveConflict(owner, op.operation_id, 'remote', d);
  expect((await records(owner, d)).find((r) => r.id === first.id)?.data).toHaveProperty(
    'notes',
    'Remoto',
  );
  expect((await d.outbox.toArray()).map((p) => p.command.aggregate_id)).toEqual([p.id]);
  expect((await d.resolutions.toArray())[0]?.operations).toHaveLength(2);
  expect(await records(crypto.randomUUID(), d)).toEqual([]);
});
it('nuovo tentativo vietato dallo stato remoto non altera coda o archivio · SYNC-03', async () => {
  const d = database();
  await setMetadata(`${owner}:epoch`, crypto.randomUUID(), d);
  const p = program();
  await saveLocally(
    owner,
    'SaveProgramDraft',
    { id: p.id, kind: 'program', revision: '0', data: p },
    [],
    d,
  );
  const op = (await d.outbox.toArray())[0]!;
  await applyReceipt(
    owner,
    {
      operation_id: op.operation_id,
      status: 'rejected',
      code: 'IMMUTABLE_PROGRAM',
      records: [{ id: p.id, kind: 'program', revision: '2', data: { ...p, status: 'approved' } }],
    },
    d,
  );
  const before = await emergencyExport(owner, d);
  await expect(resolveConflict(owner, op.operation_id, 'retry', d)).rejects.toThrow(
    'non consentita',
  );
  const after = JSON.parse(await emergencyExport(owner, d));
  expect(after.outbox).toEqual(JSON.parse(before).outbox);
  expect(after.resolutions).toEqual([]);
});
it('restore conserva anche i dati già confermati e non reinvia automaticamente i comandi · S16', async () => {
  const d = database();
  const { first } = await conflict(d);
  const confirmedId = crypto.randomUUID();
  await storeNewer(
    owner,
    { ...first, id: confirmedId, revision: '1', data: { ...first.data, id: confirmedId } },
    d,
  );
  await setMetadata(`${owner}:recovery`, 'epoch', d);
  const before = JSON.parse(await emergencyExport(owner, d));
  await archiveAndReload(owner, d);
  expect(await records(owner, d)).toEqual([]);
  expect(await d.outbox.count()).toBe(0);
  expect(await metadata(`${owner}:epoch`, d)).toBeNull();
  const archive = (await d.resolutions.toArray())[0]!;
  expect(archive.records).toEqual([...before.base, ...before.overlay]);
  expect(archive.operations).toEqual(before.outbox);
});
it('backup v1/v2/v3 conservati per confronto; dati di altri account respinti atomicamente · SYNC-04', async () => {
  const source = database(),
    target = database();
  await conflict(source);
  const backup = JSON.parse(await emergencyExport(owner, source));
  await importRecovery(JSON.stringify(backup), owner, target);
  expect(await target.outbox.count()).toBe(0);
  expect(await records(owner, target)).toEqual([]);
  expect(await target.resolutions.count()).toBe(1);
  const v1 = { ...backup, schema_version: 1 };
  delete v1.resolutions;
  delete v1.sync_epoch;
  delete v1.redacted_decisions;
  delete v1.device_id;
  await importRecovery(JSON.stringify(v1), owner, target);
  expect(await target.resolutions.count()).toBe(2);
  const v2 = { ...backup, schema_version: 2 };
  delete v2.redacted_decisions;
  delete v2.device_id;
  await importRecovery(JSON.stringify(v2), owner, target);
  expect(await target.resolutions.count()).toBe(3);
  const poisoned = {
    ...backup,
    resolutions: [
      {
        key: 'foreign',
        account: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        reason: 'Altro',
        operations: [],
        records: [],
      },
    ],
  };
  await expect(importRecovery(JSON.stringify(poisoned), owner, target)).rejects.toThrow(
    'Proprietario',
  );
  expect(await target.resolutions.count()).toBe(3);
  await expect(importRecovery(JSON.stringify(backup), crypto.randomUUID(), target)).rejects.toThrow(
    'stesso account',
  );
});
