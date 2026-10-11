-- WP-04/05 · RF-01/07/18 · ADR-05/06 · WEB-11/12/14 · QA-AUTH/SEC.
-- La password viene configurata fuori dal repository; nessuna credenziale nella migrazione.
create role tr_lab_runtime login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
grant connect on database postgres to tr_lab_runtime;
grant usage on schema tr_lab_private to tr_lab_runtime;
grant select, insert, update, delete on tr_lab_private.sessions, tr_lab_private.auth_flows to tr_lab_runtime;
grant tr_lab_command to current_user with inherit true, set true;

-- L'app usa il JWT dell'utente nelle RPC: il ruolo pg non può scrivere schede o risultati.
revoke all on public.tr_lab_records from tr_lab_runtime;
revoke all on function public.tr_lab_apply(jsonb), public.tr_lab_bootstrap(), public.tr_lab_pull(text,text,uuid) from tr_lab_runtime;
revoke set option for tr_lab_command from current_user;
revoke inherit option for tr_lab_command from current_user;

-- Supporta la ricerca dei figli e la verifica della FK senza scansioni dell'archivio.
create index tr_lab_records_parent on public.tr_lab_records(owner_id, parent_id);
