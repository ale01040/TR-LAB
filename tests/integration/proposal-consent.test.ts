import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commandSchema, recordSchema, receiptSchema, type Proposal } from '@tr-lab/contracts';
import { createTestDatabase, queryAs } from '../helpers/test-database';
import { syntheticProposal, syntheticRule } from '../helpers/engine-fixtures';
import { command, program } from '../helpers/fixtures';
const a = randomUUID(),
  b = randomUUID(),
  hashA = 'synthetic-' + randomUUID(),
  hashB = 'synthetic-' + randomUUID();
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let epoch: string;
beforeAll(async () => {
  db = await createTestDatabase([a, b]);
  epoch = (await db.query<{ value: string }>('select value from tr_lab_private.epoch')).rows[0]!
    .value;
  for (const [owner, hash] of [
    [a, hashA],
    [b, hashB],
  ])
    await db.query(
      "insert into tr_lab_private.sessions(token_hash,public_id,user_id,email,encrypted_tokens,csrf,expires_at) values($1,$2,$3,'test@example.invalid','synthetic','synthetic',clock_timestamp()+interval '1 day')",
      [hash, randomUUID(), owner],
    );
  const rule = syntheticRule();
  await db.query('insert into tr_lab_private.rule_bundles values($1,$2,$3,$4,$5,$6)', [
    rule.id,
    rule.version,
    rule.status,
    rule.reviewer,
    rule.reviewedAt,
    rule,
  ]);
});
afterAll(async () => {
  await db?.close();
});
async function runtime(
  name: 'proposal_publish' | 'proposal_review' | 'proposal_decide',
  params: unknown[],
) {
  if (name === 'proposal_decide') {
    const c = commandSchema.parse(params[1]);
    params = [
      ...params,
      createHash('sha3-256')
        .update((c.payload as { challenge: string }).challenge)
        .digest('hex'),
    ];
  }
  return db.transaction(async (tx) => {
    await tx.exec('set local role tr_lab_runtime');
    return (
      await tx.query<{ result: unknown }>(
        `select tr_lab_private.${name}(${params.map((_, i) => '$' + (i + 1)).join(',')}) result`,
        params,
      )
    ).rows[0]?.result;
  });
}
async function publish(p = syntheticProposal(epoch)) {
  return recordSchema.parse(await runtime('proposal_publish', [hashA, p]));
}
async function review(p: Proposal) {
  const challenge = randomUUID() + randomUUID();
  const digest = createHash('sha3-256').update(challenge).digest('hex');
  await runtime('proposal_review', [
    hashA,
    p.id,
    digest,
    new Date(Date.now() + 300000).toISOString(),
  ]);
  return challenge;
}
function decide(p: Proposal, challenge: string, choice: 'accept' | 'reject' = 'accept') {
  return commandSchema.parse({
    ...command('SaveMeasurement', p, epoch, '1'),
    protocol_version: 2,
    command: 'DecideProposal',
    payload: {
      id: p.id,
      decisionId: randomUUID(),
      proposalRevision: '1',
      contentDigest: p.contentDigest,
      choice,
      challenge,
    },
  });
}
describe('consenso SQL: proposte sintetiche, nessun metodo reale attivato', () => {
  it('pubblica soltanto dal BFF, isola owner e non modifica la scheda alla review', async () => {
    const p = syntheticProposal(epoch);
    expect((await publish(p)).kind).toBe('proposal');
    expect(
      await queryAs<number>(db, b, 'select count(*)::int result from public.tr_lab_proposals'),
    ).toBe(0);
    await expect(
      queryAs(db, a, 'select tr_lab_private.proposal_publish($1,$2) result', [hashA, p]),
    ).rejects.toThrow('permission denied');
    await review(p);
    expect(
      (
        await db.query<{ n: number }>(
          'select count(*)::int n from public.tr_lab_records where owner_id=$1 and id=$2',
          [a, p.afterProgram.id],
        )
      ).rows[0]!.n,
    ).toBe(0);
  });
  it('richiede challenge esatta, owner e sessione; il token non entra negli eventi', async () => {
    const p = syntheticProposal(epoch);
    await publish(p);
    const challenge = await review(p);
    const c = decide(p, challenge);
    expect(receiptSchema.parse(await runtime('proposal_decide', [hashB, c])).status).toBe(
      'rejected',
    );
    expect(
      receiptSchema.parse(await runtime('proposal_decide', [hashA, decide(p, 'x'.repeat(64))]))
        .code,
    ).toBe('CONFIRMATION_REQUIRED');
    const result = receiptSchema.parse(await runtime('proposal_decide', [hashA, c]));
    expect(result.status).toBe('applied');
    expect(result.records).toHaveLength(3);
    expect(JSON.stringify(result)).not.toContain(challenge);
    expect(
      (
        await db.query<{ text: string }>(
          'select record::text text from tr_lab_private.events where owner_id=$1',
          [a],
        )
      ).rows.every((r) => !r.text.includes(challenge)),
    ).toBe(true);
  });
  it('restituisce la stessa ricevuta dopo scadenza e impedisce contenuto diverso sotto lo stesso ID', async () => {
    const p = syntheticProposal(epoch);
    await publish(p);
    const challenge = await review(p),
      c = decide(p, challenge),
      first = await runtime('proposal_decide', [hashA, c]);
    await db.query(
      "update tr_lab_private.confirmation_challenges set expires_at=clock_timestamp()-interval '1 minute' where proposal_id=$1",
      [p.id],
    );
    expect(await runtime('proposal_decide', [hashA, c])).toEqual(first);
    await expect(
      runtime('proposal_decide', [
        hashA,
        { ...c, payload: { ...(c.payload as object), choice: 'reject' } },
      ]),
    ).rejects.toThrow('OPERATION_ID_REUSED');
    expect(
      receiptSchema.parse(await runtime('proposal_decide', [hashA, decide(p, challenge)])).code,
    ).toBe('PROPOSAL_NOT_PENDING');
  });
  it('il rifiuto conserva la decisione senza creare un programma', async () => {
    const p = syntheticProposal(epoch);
    await publish(p);
    const result = receiptSchema.parse(
      await runtime('proposal_decide', [hashA, decide(p, await review(p), 'reject')]),
    );
    expect(result.status).toBe('applied');
    expect(result.records.some((r) => r.kind === 'program')).toBe(false);
    expect(result.records.find((r) => r.kind === 'proposal')?.data).toMatchObject({
      status: 'rejected',
    });
  });
  it('non accetta dipendenze mutate, restore o bundle ritirato', async () => {
    const base = program();
    await queryAs(db, a, 'select public.tr_lab_apply($1) result', [
      command('SaveProgramDraft', base, epoch),
    ]);
    const p = syntheticProposal(epoch);
    p.dependencies = [{ recordId: base.id, revision: '1' }];
    await publish(p);
    const challenge = await review(p);
    await queryAs(db, a, 'select public.tr_lab_apply($1) result', [
      command('SaveProgramDraft', { ...base, name: 'Modificata' }, epoch, '1'),
    ]);
    expect(
      receiptSchema.parse(await runtime('proposal_decide', [hashA, decide(p, challenge)])).code,
    ).toBe('PROPOSAL_STALE');
    const restored = syntheticProposal(randomUUID());
    await expect(publish(restored)).rejects.toThrow('PROPOSAL_STALE');
    const retired = syntheticProposal(epoch);
    await publish(retired);
    const token = await review(retired);
    await db.query(
      "update tr_lab_private.rule_bundles set status='retired',data=data||'{\"status\":\"retired\"}' where id='software-fixture'",
    );
    expect(
      receiptSchema.parse(await runtime('proposal_decide', [hashA, decide(retired, token)])).code,
    ).toBe('PROPOSAL_STALE');
  });
});
