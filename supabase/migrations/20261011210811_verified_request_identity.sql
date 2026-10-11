-- RF-01/06/07/18 · ADR-05/06/07 · WEB-11/12/14 · QA-SEC/SYNC.
-- auth è gestito dal provider e non concede USAGE al nuovo owner delle RPC.
-- Stessa lettura di auth.uid(): solo claim verificati da PostgREST, mai owner del payload.
-- Non è un decoder/verificatore JWT alternativo: la verifica resta al provider.
create function tr_lab_private.user_id() returns uuid language sql stable set search_path='' as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
revoke all on function tr_lab_private.user_id() from public, anon, authenticated, tr_lab_runtime;
grant execute on function tr_lab_private.user_id() to tr_lab_command;

grant tr_lab_command to current_user with inherit true, set true;
do $$
declare fn oid;
begin
  for fn in select oid from pg_proc where pronamespace='public'::regnamespace and proname in ('tr_lab_apply','tr_lab_bootstrap','tr_lab_pull') loop
    execute replace(pg_get_functiondef(fn), 'auth.uid()', 'tr_lab_private.user_id()');
  end loop;
end $$;
revoke all on function public.tr_lab_apply(jsonb), public.tr_lab_bootstrap(), public.tr_lab_pull(text,text,uuid) from public, anon, tr_lab_runtime;
grant execute on function public.tr_lab_apply(jsonb), public.tr_lab_bootstrap(), public.tr_lab_pull(text,text,uuid) to authenticated;
revoke set option for tr_lab_command from current_user;
revoke inherit option for tr_lab_command from current_user;
alter policy command_own on public.tr_lab_records using(owner_id=(select tr_lab_private.user_id())) with check(owner_id=(select tr_lab_private.user_id()));
