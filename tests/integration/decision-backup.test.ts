import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import {
  LocalDatabase,
  applyReceipt,
  emergencyExport,
  setMetadata,
} from '../../apps/web/src/data/database';
import { queueProposalDecision } from '../../apps/web/src/data/proposal-decisions';
import { importRecovery } from '../../apps/web/src/data/recovery';
import { syntheticProposal } from '../helpers/engine-fixtures';
const owner = crypto.randomUUID();
const databases: LocalDatabase[] = [];
function database() {
  const db = new LocalDatabase(crypto.randomUUID());
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases) await db.delete();
  databases.length = 0;
  vi.unstubAllGlobals();
});
async function pending() {
  vi.stubGlobal('navigator', { onLine: true });
  const db = database(),
    epoch = crypto.randomUUID();
  await setMetadata(`${owner}:epoch`, epoch, db);
  await setMetadata(`${owner}:protocol`, '2', db);
  const proposal = syntheticProposal(epoch),
    challenge = crypto.randomUUID() + crypto.randomUUID();
  const review = {
    proposal,
    revision: '1',
    challenge,
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    applicable: true,
  };
  await queueProposalDecision(owner, review, 'accept', () => true, db);
  return { db, review, operation: (await db.outbox.toArray())[0]! };
}
it('backup omette challenge e comando reinviabile; import conserva soltanto intenzione e digest · MOT-02', async () => {
  const { db, review, operation } = await pending();
  const text = await emergencyExport(owner, db);
  expect(text).not.toContain(review.challenge);
  const backup = JSON.parse(text);
  expect(backup.schema_version).toBe(3);
  expect(backup.outbox).toEqual([]);
  expect(backup.redacted_decisions[0]).toMatchObject({
    operationId: operation.operation_id,
    choice: 'accept',
    requiresReview: true,
    commandDigest: operation.command_digest,
  });
  const target = database();
  await importRecovery(text, owner, target);
  expect(await target.outbox.count()).toBe(0);
  expect((await target.resolutions.toArray())[0]?.redactedDecisions?.[0]?.operationId).toBe(
    operation.operation_id,
  );
});
it('ricevuta terminale elimina la challenge anche dopo rifiuto; conserva intenzione e stato', async () => {
  const { db, review, operation } = await pending();
  await applyReceipt(
    owner,
    {
      operation_id: operation.operation_id,
      status: 'rejected',
      code: 'CONFIRMATION_REQUIRED',
      records: [],
    },
    db,
  );
  expect(await db.outbox.count()).toBe(0);
  expect(await db.conflicts.count()).toBe(0);
  expect(JSON.stringify(await db.resolutions.toArray())).not.toContain(review.challenge);
  expect((await db.resolutions.toArray())[0]?.redactedDecisions?.[0]?.operationId).toBe(
    operation.operation_id,
  );
});
it('nessuna accettazione offline, review scaduta o sessione cambiata, doppio clic senza duplicati', async () => {
  const { db, review } = await pending();
  await expect(queueProposalDecision(owner, review, 'accept', () => true, db)).rejects.toThrow(
    'già in attesa',
  );
  expect(await db.outbox.count()).toBe(1);
  await expect(
    queueProposalDecision(
      owner,
      { ...review, expiresAt: '2020-01-01T00:00:00.000Z' },
      'accept',
      () => true,
      db,
    ),
  ).rejects.toThrow('Riapri');
  await expect(queueProposalDecision(owner, review, 'accept', () => false, db)).rejects.toThrow(
    'Riapri',
  );
  vi.stubGlobal('navigator', { onLine: false });
  await expect(queueProposalDecision(owner, review, 'accept', () => true, db)).rejects.toThrow(
    'online',
  );
});
