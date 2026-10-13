import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { receiptSchema } from '@tr-lab/contracts';
const connection = process.env.TR_LAB_TEST_DATABASE_URL;
if (!connection) {
  console.error(
    'LOCAL_DB_NOT_CONFIGURED: usa un cluster PostgreSQL locale isolato, database tr_lab_test_*.',
  );
  process.exit(2);
}
let target: URL;
try {
  target = new URL(connection);
} catch {
  console.error('LOCAL_DB_URL_INVALID');
  process.exit(2);
}
const database = target.pathname.slice(1);
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
  !/^tr_lab_test_[a-z0-9_]{1,40}$/.test(database)
) {
  console.error('LOCAL_DB_ONLY: il test rifiuta database remoti e nomi diversi da tr_lab_test_*.');
  process.exit(2);
}
const pool = new Pool({ connectionString: connection, max: 4, connectionTimeoutMillis: 5000 });
try {
  const state = await pool.query<{ used: boolean }>(
    "select (exists(select 1 from pg_roles where rolname in ('anon','authenticated','tr_lab_command','tr_lab_runtime','tr_lab_migrator')) or exists(select 1 from pg_namespace where nspname='auth') or exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','S'))) used",
  );
  if (state.rows[0]?.used) throw new Error('ISOLATED_EMPTY_CLUSTER_REQUIRED');
  await pool.query(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';grant usage on schema auth to authenticated;create role tr_lab_migrator createrole;grant connect,create on database "${database}" to tr_lab_migrator with grant option;grant connect on database postgres to tr_lab_migrator with grant option;grant create,usage on schema public to tr_lab_migrator with grant option;grant usage on schema auth to tr_lab_migrator;grant references on auth.users to tr_lab_migrator;`,
  );
  const migrator = await pool.connect();
  try {
    await migrator.query('set role tr_lab_migrator');
    for (const name of (await readdir('supabase/migrations'))
      .filter((n) => n.endsWith('.sql'))
      .sort())
      await migrator.query(await readFile(`supabase/migrations/${name}`, 'utf8'));
    await migrator.query('reset role');
  } finally {
    migrator.release();
  }
  const a = randomUUID(),
    b = randomUUID();
  await pool.query('insert into auth.users values($1),($2)', [a, b]);
  const epoch = (await pool.query<{ value: string }>('select value from tr_lab_private.epoch'))
    .rows[0]!.value;
  async function asUser(owner: string, sql: string, params: unknown[] = []) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
      const result = await client.query(sql, params);
      await client.query('commit');
      return result.rows;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  const id = randomUUID();
  const value = {
    protocol_version: 1,
    sync_epoch: epoch,
    operation_id: randomUUID(),
    device_id: randomUUID(),
    aggregate_id: id,
    base: { kind: 'server_revision', revision: '0' },
    depends_on: [],
    client_recorded_at: new Date().toISOString(),
    command: 'SaveMeasurement',
    payload: {
      id,
      date: '2026-10-13',
      kind: 'weight',
      side: 'none',
      value: 80000,
      unit: 'g',
      notes: 'Fixture locale',
    },
  };
  const apply = async (c: unknown) =>
    receiptSchema.parse(
      (await asUser(a, 'select public.tr_lab_apply($1::jsonb) result', [JSON.stringify(c)]))[0]
        ?.result,
    );
  const duplicate = await Promise.all([apply(value), apply(value)]);
  if (
    JSON.stringify(duplicate[0]) !== JSON.stringify(duplicate[1]) ||
    duplicate[0]?.status !== 'applied'
  )
    throw new Error('IDEMPOTENCE_FAILED');
  const updates = await Promise.all(
    ['A', 'B'].map((notes) =>
      apply({
        ...value,
        operation_id: randomUUID(),
        base: { kind: 'server_revision', revision: '1' },
        payload: { ...value.payload, notes },
      }),
    ),
  );
  if (
    updates.filter((r) => r.status === 'applied').length !== 1 ||
    updates.filter((r) => r.code === 'REVISION_CONFLICT').length !== 1
  )
    throw new Error('CONCURRENCY_FAILED');
  const hidden = (await asUser(b, 'select count(*)::int n from public.tr_lab_records'))[0]?.n;
  if (hidden !== 0) throw new Error('ISOLATION_FAILED');
  console.log(
    JSON.stringify({
      passed: true,
      checks: 3,
      engine: 'PostgreSQL TCP',
      providerAuth: false,
      scope: 'isolated-local',
      migrations: 'all',
    }),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  const known = [
    'ISOLATED_EMPTY_CLUSTER_REQUIRED',
    'IDEMPOTENCE_FAILED',
    'CONCURRENCY_FAILED',
    'ISOLATION_FAILED',
  ];
  console.error(
    known.includes(message)
      ? message
      : 'LOCAL_DB_CHECK_FAILED: consulta i log del cluster di prova; nessuna credenziale viene stampata.',
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
