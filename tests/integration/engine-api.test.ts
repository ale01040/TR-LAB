import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import {
  commandSchema,
  recordSchema,
  proposalReviewSchema,
  receiptSchema,
} from '@tr-lab/contracts';
import { buildApp } from '../../apps/server/src/app';
import { AuthService, type Authenticated } from '../../apps/server/src/auth';
import { loadConfig } from '../../apps/server/src/config';
import { createTestDatabase, queryAs } from '../helpers/test-database';
import { syntheticRule, syntheticInput } from '../helpers/engine-fixtures';
import { command, program, session, now } from '../helpers/fixtures';

const owner = randomUUID(),
  sessionHash = 'synthetic-' + randomUUID(),
  equipmentId = randomUUID();
const headers = {
  origin: 'http://localhost:5173',
  'x-tr-lab': '1',
  'x-account-id': owner,
  'x-csrf-token': 'synthetic-csrf',
};
let db: Awaited<ReturnType<typeof createTestDatabase>>,
  app: Awaited<ReturnType<typeof buildApp>>,
  epoch: string;
beforeAll(async () => {
  db = await createTestDatabase([owner]);
  epoch = (await db.query<{ value: string }>('select value from tr_lab_private.epoch')).rows[0]!
    .value;
  const input = syntheticInput(),
    exercise = program().days[0]!.exercises[0]!.exercise,
    rule = syntheticRule();
  await db.query('insert into tr_lab_private.rule_bundles values($1,$2,$3,$4,$5,$6)', [
    rule.id,
    rule.version,
    rule.status,
    rule.reviewer,
    rule.reviewedAt,
    rule,
  ]);
  await db.query(
    "insert into tr_lab_private.sessions(token_hash,public_id,user_id,email,encrypted_tokens,csrf,expires_at) values($1,$2,$3,'test@example.invalid','synthetic','synthetic-csrf',clock_timestamp()+interval '1 day')",
    [sessionHash, randomUUID(), owner],
  );
  const equipment = {
    id: equipmentId,
    name: 'Attrezzi sintetici',
    place: input.environment,
    updatedAt: now,
    items: [
      {
        id: randomUUID(),
        category: exercise.equipment,
        basis: exercise.basis,
        availableLoadsGrams: [10000, 12000],
        machineId: null,
      },
    ],
  };
  await queryAs(db, owner, 'select public.tr_lab_apply_v2($1) result', [
    {
      ...command('SaveMeasurement', equipment, epoch),
      protocol_version: 2,
      command: 'SaveEquipmentProfile',
    },
  ]);
  // Il vero SDK attraversa un adapter HTTP sintetico. Nessuna richiesta esce dal processo;
  // Auth/PostgREST reali non sono dimostrati da questa prova di BFF → SQL → risposta.
  const client = createClient('https://provider.example.invalid', 'sb_publishable_synthetic', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (url, init) => {
        const name = new URL(String(url)).pathname.split('/').at(-1),
          body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        let result: unknown;
        if (name === 'tr_lab_bootstrap')
          result = await queryAs(db, owner, 'select public.tr_lab_bootstrap() result');
        else if (name === 'tr_lab_engine_records')
          result = await queryAs(
            db,
            owner,
            'select public.tr_lab_engine_records($1,$2,$3) result',
            [body.program_scope, body.requested_ids, body.session_ids],
          );
        else throw new Error('UNEXPECTED_TEST_RPC');
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });
  const current: Authenticated = {
    row: {
      token_hash: sessionHash,
      public_id: randomUUID(),
      user_id: owner,
      email: 'test@example.invalid',
      encrypted_tokens: 'synthetic',
      csrf: 'synthetic-csrf',
      expires_at: new Date(Date.now() + 86400000),
      recovery: false,
      token_version: '1',
      refresh_lease_id: null,
      refresh_lease_until: null,
    },
    client,
    tokens: {
      access_token: 'synthetic-access',
      refresh_token: 'synthetic-refresh',
      expires_at: 2000000000,
    },
  };
  vi.spyOn(AuthService.prototype, 'resolve').mockResolvedValue(current);
  const config = loadConfig({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://provider.example.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
    DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:5432/tr_lab_test_never_connected',
    SESSION_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
  });
  app = await buildApp(config, {
    serveWeb: false,
    onPool: (pool) =>
      Object.defineProperty(pool, 'query', {
        value: (sql: string, values: unknown[]) =>
          db.transaction(async (tx) => {
            await tx.exec('set local role tr_lab_runtime');
            return tx.query(sql, values);
          }),
      }),
  });
});
afterAll(async () => {
  vi.restoreAllMocks();
  await app?.close();
  await db?.close();
});

it('BFF calcola, pubblica, rivede e accetta una proposta sintetica soltanto con comando esatto', async () => {
  const constraints = syntheticInput(),
    request = { constraints, equipmentId, ruleBundleId: 'software-fixture' };
  const generated = await app.inject({
    method: 'POST',
    url: '/api/engine/generate',
    headers,
    payload: request,
  });
  expect(generated.statusCode).toBe(200);
  const record = recordSchema.parse(generated.json().record);
  expect(record.kind).toBe('proposal');
  if (record.kind !== 'proposal') throw new Error('TEST_RECORD_KIND');
  expect(record.data.afterProgram.status).toBe('draft');
  const duplicate = await app.inject({
    method: 'POST',
    url: '/api/engine/generate',
    headers,
    payload: request,
  });
  expect(duplicate.json().record).toEqual(record);
  const response = await app.inject({
    method: 'POST',
    url: '/api/engine/review',
    headers,
    payload: { id: record.id },
  });
  expect(response.statusCode).toBe(200);
  const review = proposalReviewSchema.parse(response.json());
  expect(review.applicable).toBe(true);
  expect(
    await queryAs(
      db,
      owner,
      "select count(*)::int result from public.tr_lab_records where kind='program'",
    ),
  ).toBe(0);
  const c = commandSchema.parse({
    ...command('SaveMeasurement', record.data, epoch, review.revision),
    protocol_version: 2,
    command: 'DecideProposal',
    payload: {
      id: record.id,
      decisionId: randomUUID(),
      choice: 'accept',
      proposalRevision: review.revision,
      contentDigest: review.proposal.contentDigest,
      challenge: review.challenge,
    },
  });
  const applied = await app.inject({
    method: 'POST',
    url: '/api/sync/command',
    headers,
    payload: c,
  });
  expect(applied.statusCode).toBe(200);
  const receipt = receiptSchema.parse(applied.json());
  expect(receipt.status).toBe('applied');
  expect(receipt.records.find((r) => r.kind === 'program')?.data).toMatchObject({
    status: 'approved',
  });
  expect(JSON.stringify(receipt)).not.toContain(review.challenge);
  await db.query(
    "update tr_lab_private.confirmation_challenges set expires_at=clock_timestamp()-interval '1 minute' where proposal_id=$1",
    [record.id],
  );
  expect(
    (await app.inject({ method: 'POST', url: '/api/sync/command', headers, payload: c })).json(),
  ).toEqual(receipt);
});
it('BFF respinge target inviati dal browser, perimetro assente, nonce errato e account cambiato', async () => {
  const valid = { constraints: syntheticInput(), equipmentId, ruleBundleId: 'software-fixture' };
  const inject = (payload: unknown, extra: Record<string, string> = {}) =>
    app.inject({
      method: 'POST',
      url: '/api/engine/generate',
      headers: { ...headers, 'content-type': 'application/json', ...extra },
      payload: JSON.stringify(payload),
    });
  expect((await inject({ ...valid, afterProgram: program() })).statusCode).toBe(400);
  expect(
    (
      await inject({
        ...valid,
        constraints: { ...valid.constraints, adultNonclinicalConfirmed: false },
      })
    ).statusCode,
  ).toBe(400);
  expect((await inject(valid, { 'x-csrf-token': 'wrong' })).statusCode).toBe(403);
  expect((await inject(valid, { 'x-account-id': randomUUID() })).statusCode).toBe(409);
});

it('lo storico lungo legge soltanto le esposizioni scelte e conserva il filtro owner', async () => {
  const p = program();
  await queryAs(db, owner, 'select public.tr_lab_apply($1) result', [
    command('SaveProgramDraft', p, epoch),
  ]);
  await queryAs(db, owner, 'select public.tr_lab_apply($1) result', [
    { ...command('ApproveProgram', p, epoch, '1'), payload: { id: p.id, confirmed: true } },
  ]);
  const data = { ...session(p), status: 'completed', endedAt: now };
  const inserted = await db.query<{ id: string }>(
    "with ids as materialized(select gen_random_uuid() id from generate_series(1,1002)) insert into public.tr_lab_records(id,owner_id,kind,revision,data,parent_id) select id,$1,'session',1,$3::jsonb||jsonb_build_object('id',id),$2 from ids returning id",
    [owner, p.id, data],
  );
  const selectedId = inserted.rows[0]!.id;
  const rows = await queryAs<unknown[]>(
    db,
    owner,
    'select public.tr_lab_engine_records($1,$2,$3) result',
    [p.id, [p.id], [selectedId]],
  );
  expect(rows!.map((row) => recordSchema.parse(row).id).sort()).toEqual([p.id, selectedId].sort());
  expect(
    await queryAs(db, randomUUID(), 'select public.tr_lab_engine_records($1,$2,$3) result', [
      p.id,
      [p.id],
      [selectedId],
    ]),
  ).toEqual([]);
  const evaluated = await app.inject({
    method: 'POST',
    url: '/api/engine/progression',
    headers,
    payload: {
      programId: p.id,
      prescriptionId: p.days[0]!.exercises[0]!.id,
      equipmentId,
      comparableSessionIds: [selectedId],
      ruleBundleId: 'software-fixture',
      seed: randomUUID(),
      experience: 'beginner',
      adultNonclinicalConfirmed: true,
    },
  });
  expect(evaluated.statusCode).toBe(200);
  expect(evaluated.json().kind).toBe('insufficient_data');
  await expect(
    queryAs(db, owner, 'select public.tr_lab_engine_records($1,$2) result', [p.id, [p.id]]),
  ).rejects.toThrow('DATA_WINDOW_REQUIRED');
});
