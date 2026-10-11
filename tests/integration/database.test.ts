import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { receiptSchema, type Command } from '@tr-lab/contracts';
import { command, now, program, session, setLog } from '../helpers/fixtures';
let db: PGlite;
let epoch: string;
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';grant usage on schema auth to authenticated;insert into auth.users values('${owner}'),('${other}');`,
  );
  // Il deploy deve funzionare anche senza superuser, come nel PostgreSQL gestito.
  await db.exec(`create role tr_lab_migrator createrole;
    grant connect, create on database postgres to tr_lab_migrator with grant option;
    grant create, usage on schema public to tr_lab_migrator with grant option;
    grant usage on schema auth to tr_lab_migrator;
    grant references on auth.users to tr_lab_migrator;
    set role tr_lab_migrator;`);
  await db.exec(await readFile('supabase/migrations/202610110001_core.sql', 'utf8'));
  await db.exec(
    await readFile('supabase/migrations/20261011205512_runtime_session_role.sql', 'utf8'),
  );
  await db.exec(
    await readFile('supabase/migrations/20261011205803_database_access_hardening.sql', 'utf8'),
  );
  await db.exec(
    await readFile('supabase/migrations/20261011210811_verified_request_identity.sql', 'utf8'),
  );
  await db.exec('reset role');
  epoch =
    (await db.query<{ value: string }>('select value from tr_lab_private.epoch')).rows[0]?.value ??
    '';
});
afterAll(async () => {
  await db?.close();
});
it('le RPC leggono i claim JSON verificati da PostgREST e rifiutano una richiesta senza identità', async () => {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: owner }),
  ]);
  const p = program();
  try {
    const r = await db.query<{ result: unknown }>('select public.tr_lab_apply($1::jsonb) result', [
      JSON.stringify(command('SaveProgramDraft', p, epoch)),
    ]);
    expect(receiptSchema.parse(r.rows[0]?.result).status).toBe('applied');
    await db.query("select set_config('request.jwt.claims','{}',false)");
    await expect(db.query('select public.tr_lab_bootstrap()')).rejects.toThrow('UNAUTHENTICATED');
  } finally {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims','',false)");
  }
  const result = await db.query<{ owner_id: string }>(
    'select owner_id from public.tr_lab_records where id=$1',
    [p.id],
  );
  expect(result.rows[0]?.owner_id).toBe(owner);
});
async function apply(c: Command, user = owner) {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    const r = await db.query<{ result: unknown }>('select public.tr_lab_apply($1::jsonb) result', [
      JSON.stringify(c),
    ]);
    return receiptSchema.parse(r.rows[0]?.result);
  } finally {
    await db.exec('reset role');
  }
}
it('il ruolo BFF usa solo sessioni e PKCE, senza dominio, DDL o bypass RLS', async () => {
  const flags = await db.query<{
    ddl: boolean;
    records: boolean;
    rpc: boolean;
    sessions: boolean;
    flows: boolean;
    bypass: boolean;
  }>(`select
    has_schema_privilege('tr_lab_command', 'public', 'CREATE') as ddl,
    has_table_privilege('tr_lab_runtime', 'public.tr_lab_records', 'SELECT,INSERT,UPDATE,DELETE') as records,
    has_function_privilege('tr_lab_runtime', 'public.tr_lab_apply(jsonb)', 'EXECUTE') as rpc,
    has_table_privilege('tr_lab_runtime', 'tr_lab_private.sessions', 'SELECT,INSERT,UPDATE,DELETE') as sessions,
    has_table_privilege('tr_lab_runtime', 'tr_lab_private.auth_flows', 'SELECT,INSERT,UPDATE,DELETE') as flows,
    (select rolbypassrls from pg_roles where rolname='tr_lab_runtime') as bypass`);
  expect(flags.rows[0]).toEqual({
    ddl: false,
    records: false,
    rpc: false,
    sessions: true,
    flows: true,
    bypass: false,
  });
  await db.exec('set role tr_lab_runtime');
  try {
    await expect(db.query('select * from public.tr_lab_records')).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query('select public.tr_lab_bootstrap()')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from tr_lab_private.receipts')).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query('create table public.invalid_runtime_write(id int)')).rejects.toThrow(
      /permission denied/,
    );
    expect((await db.query('select * from tr_lab_private.sessions')).rows).toEqual([]);
    expect((await db.query('select * from tr_lab_private.auth_flows')).rows).toEqual([]);
  } finally {
    await db.exec('reset role');
  }
});
it('migrazione, RPC, consenso, snapshot e retry idempotente · QA-SEC/SYNC/APP', async () => {
  const p = program();
  const draft = command('SaveProgramDraft', p, epoch);
  const saved = await apply(draft);
  expect(saved.status).toBe('applied');
  const approval = command('ApproveProgram', { id: p.id }, epoch, '1');
  approval.payload = { id: p.id, confirmed: true };
  expect((await apply(approval)).status).toBe('applied');
  const s = session(p, 2);
  const started = await apply(command('StartWorkout', s, epoch));
  expect(started.status).toBe('applied');
  const log = setLog(s);
  const loggedCommand = command('SaveSet', log, epoch);
  const logged = await apply(loggedCommand);
  expect(logged.status).toBe('applied');
  expect(logged.records.find((r) => r.kind === 'session')?.revision).toBe('2');
  expect(await apply(loggedCommand)).toEqual(logged);
  const ended = { ...s, status: 'completed' as const, endedAt: now };
  expect((await apply(command('FinishWorkout', ended, epoch, '2'))).status).toBe('applied');
  expect(await apply(loggedCommand)).toEqual(logged);
  const edit = command('SaveSet', { ...log, reps: 9 }, epoch, '1');
  expect((await apply(edit)).code).toBe('SESSION_NOT_ACTIVE');
  expect((await apply(command('SaveProgramDraft', p, epoch, '2'))).code).toBe('IMMUTABLE_PROGRAM');
});
it('accesso diretto RLS e grant negano scritture arbitrarie e dati altrui', async () => {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  try {
    expect((await db.query('select * from public.tr_lab_records')).rows).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.tr_lab_records(owner_id,id,kind,revision,data) values($1,$2,'measurement',1,'{}')",
        [other, crypto.randomUUID()],
      ),
    ).rejects.toThrow();
    await expect(db.query('select * from tr_lab_private.sessions')).rejects.toThrow();
  } finally {
    await db.exec('reset role');
  }
});
it('payload ostile, consenso assente e snapshot alterato non diventano dati approvati', async () => {
  const p = program();
  expect(
    (await apply(command('SaveProgramDraft', { ...p, name: null } as unknown as typeof p, epoch)))
      .status,
  ).toBe('rejected');
  expect((await apply(command('SaveProgramDraft', p, epoch))).status).toBe('applied');
  const a = command('ApproveProgram', { id: p.id }, epoch, '1');
  a.payload = { id: p.id, confirmed: false };
  expect((await apply(a)).code).toBe('INVALID_APPROVAL');
  a.operation_id = crypto.randomUUID();
  a.payload = { id: p.id, confirmed: true };
  await apply(a);
  const s = session(p);
  s.snapshot.exercises[0]?.targets.splice(0, 1);
  expect((await apply(command('StartWorkout', s, epoch))).code).toBe('INVALID_SNAPSHOT');
});
it('revisioni e sequenze superiori a 2^53 rimangono stringhe esatte', async () => {
  await db.query('update tr_lab_private.sync_state set sequence=$2 where owner_id=$1', [
    owner,
    '9007199254740992',
  ]);
  const p = program();
  const receipt = await apply(command('SaveProgramDraft', p, epoch));
  expect(receipt.status).toBe('applied');
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  try {
    const r = await db.query<{ result: { sequence: string } }>(
      'select public.tr_lab_bootstrap() result',
    );
    expect(r.rows[0]?.result.sequence).toBe('9007199254740993');
  } finally {
    await db.exec('reset role');
  }
});
it('riuso ID con contenuto diverso ed epoch storico vengono respinti', async () => {
  const p = program();
  const c = command('SaveProgramDraft', p, epoch);
  await apply(c);
  await expect(apply({ ...c, payload: { ...p, name: 'Cambiato' } })).rejects.toThrow(
    'OPERATION_ID_REUSED',
  );
  await expect(apply({ ...c, sync_epoch: crypto.randomUUID() })).rejects.toThrow('EPOCH_MISMATCH');
});
it('le RPC dirette respingono serie senza lavoro, lati incoerenti e ciclo oltre limite', async () => {
  const p = program();
  const ex = p.days[0]?.exercises[0];
  if (!ex) throw new Error('Fixture assente');
  ex.targets = ex.targets.map((t) => ({ ...t, kind: 'warmup' as const }));
  expect((await apply(command('SaveProgramDraft', p, epoch))).code).toBe('INVALID_PAYLOAD');
  ex.targets = ex.targets.map((t) => ({ ...t, kind: 'work' as const, side: 'left' as const }));
  ex.exercise.unilateral = false;
  expect((await apply(command('SaveProgramDraft', p, epoch))).code).toBe('INVALID_PAYLOAD');
  const first = ex.targets[0];
  if (!first) throw new Error('Fixture assente');
  ex.targets = Array.from({ length: 30 }, () => ({
    ...first,
    id: crypto.randomUUID(),
    side: 'both' as const,
  }));
  p.weeks = [{ name: 'Accumulo', phase: 'accumulation', extraSets: 1, rir: null }];
  expect((await apply(command('SaveProgramDraft', p, epoch))).code).toBe('INVALID_PAYLOAD');
});
