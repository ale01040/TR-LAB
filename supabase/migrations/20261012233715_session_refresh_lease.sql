-- SYNC-02 · RF-01/07 · ADR-06/09 · WEB-11/12/14 · QA-AUTH-02/03/04.
-- La lease è acquisita con un UPDATE breve: nessuna transazione attraversa Auth.
alter table tr_lab_private.sessions
  add column token_version bigint not null default 1 check (token_version > 0),
  add column refresh_lease_id uuid,
  add column refresh_lease_until timestamptz,
  add constraint tr_lab_refresh_lease_pair
    check ((refresh_lease_id is null) = (refresh_lease_until is null));
