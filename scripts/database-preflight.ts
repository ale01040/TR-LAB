import { Pool } from 'pg';
import { loadConfig } from '../apps/server/src/config';
import { databasePoolConfig } from '../apps/server/src/database';
let pool: Pool | undefined;
try {
  const config = loadConfig();
  if (!config.DATABASE_URL) throw new Error('NOT_CONFIGURED');
  pool = new Pool({ ...databasePoolConfig(config), max: 1 });
  const result = await pool.query(`select
    current_database() as database,
    to_regclass('public.tr_lab_records') is not null as records_present,
    to_regclass('tr_lab_private.sessions') is not null as sessions_present,
    to_regprocedure('public.tr_lab_apply(jsonb)') is not null as command_rpc_present,
    exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='tr_lab_records' and c.relrowsecurity) as records_rls,
    exists(select 1 from pg_roles where rolname=current_user and rolsuper) as superuser`);
  console.log(
    JSON.stringify(
      {
        connected: true,
        checks: result.rows[0],
        note: 'Controllo in sola lettura; non prova Auth, grant completi o sincronizzazione.',
      },
      null,
      2,
    ),
  );
} catch {
  console.error(
    'Preflight non riuscito. Verifica configurazione, SSL, password e rete. Nessuna modifica applicata e nessuna connection string stampata.',
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
