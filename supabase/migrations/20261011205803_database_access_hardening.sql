-- RF-01/06/07/18 · ADR-05/06/07 · WEB-11/12/14 · QA-SEC/SYNC.
-- Dopo OWNER TO, postgres non è owner né superuser. Eredita il ruolo solo nel deploy
-- per rendere effettive le revoche; entrambe le opzioni vengono rimosse alla fine.
grant tr_lab_command to current_user with inherit true, set true;
revoke all on function public.tr_lab_apply(jsonb), public.tr_lab_bootstrap(), public.tr_lab_pull(text,text,uuid) from public, anon, tr_lab_runtime;
grant execute on function public.tr_lab_apply(jsonb), public.tr_lab_bootstrap(), public.tr_lab_pull(text,text,uuid) to authenticated;
revoke set option for tr_lab_command from current_user;
revoke inherit option for tr_lab_command from current_user;

alter policy command_own on public.tr_lab_records using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create index tr_lab_sessions_user on tr_lab_private.sessions(user_id);
