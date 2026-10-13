import type { Pool } from 'pg';

// SYNC-01, SCH-06, RF-01/07/18, ADR-05/06/09, WEB-11/12/14.
// La connessione da sola non rende questo backend compatibile con una baseline v1.
export const requiredDatabaseFunctions = [
  'public.tr_lab_apply(jsonb)',
  'public.tr_lab_bootstrap()',
  'public.tr_lab_pull(text,text,uuid)',
  'public.tr_lab_pull_v2(text,text,uuid)',
  'public.tr_lab_capabilities()',
  'public.tr_lab_apply_v2(jsonb)',
  'public.tr_lab_plan_cycle(jsonb)',
  'public.tr_lab_start_scheduled(jsonb)',
  'public.tr_lab_import_program(jsonb)',
  'public.tr_lab_reconcile_workout(jsonb)',
  'public.tr_lab_engine_records(uuid,uuid[],uuid[])',
  'public.tr_lab_receipt(uuid)',
  'tr_lab_private.engine_rules(text)',
  'tr_lab_private.proposal_publish(text,jsonb)',
  'tr_lab_private.proposal_review(text,uuid,text,timestamp with time zone)',
  'tr_lab_private.proposal_decide(text,jsonb,text)',
] as const;

export async function databaseSchemaReady(pool: Pick<Pool, 'query'>): Promise<boolean> {
  // LIMIT 0 verifica colonne/grant senza leggere token o altri dati delle sessioni.
  await pool.query(`select token_hash, token_version, refresh_lease_id, refresh_lease_until
    from tr_lab_private.sessions limit 0`);
  await pool.query(
    'select id, state, verifier, kind, expires_at from tr_lab_private.auth_flows limit 0',
  );
  const result = await pool.query<{ schema_ready: boolean }>(
    `select bool_and(to_regprocedure(required.signature) is not null) as schema_ready
     from unnest($1::text[]) as required(signature)`,
    [requiredDatabaseFunctions],
  );
  return result.rows[0]?.schema_ready === true;
}
