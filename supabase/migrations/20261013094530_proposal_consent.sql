-- MOT-01/02 · RF-05/06/08 · ADR-08/09/12/14 · WEB-11/12/14.
-- Nessun bundle attivo è creato da questa migrazione: attivazione separata dalla verifica software.
grant tr_lab_command to current_user with inherit true, set true;
grant create on schema public,tr_lab_private to tr_lab_command;
grant select on tr_lab_private.sessions to tr_lab_command;
alter table public.tr_lab_records drop constraint tr_lab_records_kind_check;
alter table public.tr_lab_records add constraint tr_lab_records_kind_check check(kind in ('program','session','set','measurement','nutrition','private_exercise','equipment_profile','cycle','scheduled_session','proposal','proposal_decision'));
create table tr_lab_private.rule_bundles(id text primary key,version text not null,status text not null check(status in ('draft','reviewed','active','retired')),reviewer text,reviewed_at timestamptz,data jsonb not null,check(status not in ('reviewed','active') or (reviewer is not null and reviewed_at is not null)),check(data->>'id'=id and data->>'version'=version and data->>'status'=status));
create table public.tr_lab_proposals(owner_id uuid not null,id uuid not null,rule_bundle_id text not null references tr_lab_private.rule_bundles(id),before_program_id uuid,primary key(owner_id,id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade,foreign key(owner_id,before_program_id) references public.tr_lab_records(owner_id,id));
create table public.tr_lab_proposal_decisions(owner_id uuid not null,id uuid not null,proposal_id uuid not null,operation_id uuid not null,program_id uuid,primary key(owner_id,id),unique(owner_id,proposal_id),unique(owner_id,operation_id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade,foreign key(owner_id,proposal_id) references public.tr_lab_proposals(owner_id,id),foreign key(owner_id,program_id) references public.tr_lab_records(owner_id,id));
create table tr_lab_private.confirmation_challenges(digest bytea primary key,owner_id uuid not null references auth.users(id) on delete cascade,session_id uuid not null,proposal_id uuid not null,proposal_revision bigint not null,content_digest text not null,expires_at timestamptz not null,consumed_operation uuid,foreign key(owner_id,proposal_id) references public.tr_lab_proposals(owner_id,id));
create index tr_lab_challenges_expiry on tr_lab_private.confirmation_challenges(expires_at) where consumed_operation is null;
create index tr_lab_proposals_before on public.tr_lab_proposals(owner_id,before_program_id);
create index tr_lab_program_roots on public.tr_lab_records(owner_id,(data->>'rootId'),((data->>'version')::bigint)) where kind='program' and data->>'status'='approved';
create unique index tr_lab_proposal_fingerprint on public.tr_lab_records(owner_id,(data->>'ruleBundleId'),(data->>'ruleVersion'),(data->>'inputFingerprint')) where kind='proposal';
do $$declare t text;begin foreach t in array array['tr_lab_proposals','tr_lab_proposal_decisions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy read_own on public.%I for select to authenticated using(owner_id=(select auth.uid()))',t);
 execute format('create policy command_own on public.%I to tr_lab_command using(owner_id=(select tr_lab_private.user_id())) with check(owner_id=(select tr_lab_private.user_id()))',t);
 execute format('revoke all on public.%I from public,anon,authenticated,tr_lab_runtime',t);execute format('grant select on public.%I to authenticated',t);execute format('grant select,insert on public.%I to tr_lab_command',t);
end loop;end $$;
revoke all on tr_lab_private.rule_bundles,tr_lab_private.confirmation_challenges from public,anon,authenticated,tr_lab_runtime;
grant select on tr_lab_private.rule_bundles to tr_lab_command;
grant select,insert,update on tr_lab_private.confirmation_challenges to tr_lab_command;
create function tr_lab_private.session_owner(session_hash text) returns tr_lab_private.sessions language plpgsql security definer set search_path='' as $$
declare s tr_lab_private.sessions;begin
 select * into s from tr_lab_private.sessions where token_hash=session_hash and expires_at>clock_timestamp() and not recovery;
 if s.user_id is null then raise exception 'UNAUTHENTICATED';end if;
 -- Identità BFF ottenuta dalla sessione verificata, mai da un owner nel payload.
 perform set_config('request.jwt.claim.sub',s.user_id::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',s.user_id)::text,true);return s;
end $$;
create function tr_lab_private.program_version_guard() returns trigger language plpgsql set search_path='' as $$
declare highest bigint;begin
 if new.kind<>'program' then return new;end if;
 if tg_op='UPDATE' and old.kind='program' and old.data->>'status'='approved' and new.data<>old.data then raise exception 'IMMUTABLE_PROGRAM';end if;
 if new.data->>'status'='approved' and (tg_op='INSERT' or old.data->>'status'='draft') then
  select max((data->>'version')::bigint) into highest from public.tr_lab_records where owner_id=new.owner_id and kind='program' and data->>'status'='approved' and data->>'rootId'=new.data->>'rootId';
  if (new.data->>'version')::bigint<>coalesce(highest,0)+1 then raise exception 'PROGRAM_VERSION_CONFLICT';end if;
 end if;return new;
end $$;
create trigger tr_lab_program_version before insert or update on public.tr_lab_records for each row execute function tr_lab_private.program_version_guard();
create function tr_lab_private.proposal_applicable(uid uuid,p jsonb) returns boolean language plpgsql stable set search_path='' as $$
declare dependency jsonb;epoch uuid;before_row public.tr_lab_records;highest bigint;begin
 select value into epoch from tr_lab_private.epoch where id;if p->>'syncEpoch' is distinct from epoch::text then return false;end if;
 if not exists(select 1 from tr_lab_private.rule_bundles where id=p->>'ruleBundleId' and version=p->>'ruleVersion' and status='active') then return false;end if;
 for dependency in select value from jsonb_array_elements(p->'dependencies') loop
  if not exists(select 1 from public.tr_lab_records where owner_id=uid and id=(dependency->>'recordId')::uuid and revision=(dependency->>'revision')::bigint) then return false;end if;
 end loop;
 if p->>'type'='adapt_program' then
  select * into before_row from public.tr_lab_records where owner_id=uid and id=(p->'before'->>'programId')::uuid and kind='program' and data->>'status'='approved';
  if before_row.id is null or before_row.revision<>(p->'before'->>'revision')::bigint or before_row.data->>'version'<>p->'before'->>'version' or p->'afterProgram'->>'rootId'<>before_row.data->>'rootId' then return false;end if;
  select max((data->>'version')::bigint) into highest from public.tr_lab_records where owner_id=uid and kind='program' and data->>'status'='approved' and data->>'rootId'=before_row.data->>'rootId';
  if highest<>(before_row.data->>'version')::bigint or (p->'afterProgram'->>'version')::bigint<>highest+1 then return false;end if;
 elsif p->>'type'='generate_program' then
  if p->'before'<>'null'::jsonb or p->'afterProgram'->>'id'<>p->'afterProgram'->>'rootId' or p->'afterProgram'->>'version'<>'1' then return false;end if;
 else return false;end if;
 return true;
exception when others then return false;
end $$;
create function tr_lab_private.proposal_publish(session_hash text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s tr_lab_private.sessions;record public.tr_lab_records;reason jsonb;dependency jsonb;begin
 s:=tr_lab_private.session_owner(session_hash);
 if not tr_lab_private.shape(p,'{"id":"string","syncEpoch":"string","type":"string","status":"string","before":"object","afterProgram":"object","effectiveFrom":"string","ruleBundleId":"string","ruleVersion":"string","engineVersion":"string","inputFingerprint":"string","contentDigest":"string","dependencies":"array","reasoning":"array","generatedAt":"string","decidedAt":"string","resultProgramId":"string"}',array['before','decidedAt','resultProgramId']) or octet_length(p::text)>200000 or p->>'status'<>'pending' or p->>'decidedAt' is not null or p->>'resultProgramId' is not null or p->>'effectiveFrom'<>'next_matching_session' or p->>'inputFingerprint' !~ '^[a-f0-9]{64}$' or p->>'contentDigest' !~ '^[a-f0-9]{64}$' or jsonb_array_length(p->'dependencies')>100 or jsonb_array_length(p->'reasoning') not between 1 and 100 or not tr_lab_private.valid_data('program',p->'afterProgram') or p->'afterProgram'->>'status'<>'draft' or p->'afterProgram'->>'id'=p->>'id' then raise exception 'INVALID_PROPOSAL';end if;
 perform (p->>'id')::uuid;perform (p->>'generatedAt')::timestamptz;
 for reason in select value from jsonb_array_elements(p->'reasoning') loop
  if not tr_lab_private.shape(reason,'{"code":"string","message":"string","sourceIds":"array"}') or length(reason->>'message') not between 1 and 2000 or length(reason->>'code') not between 1 and 100 or jsonb_array_length(reason->'sourceIds')>30 then raise exception 'INVALID_PROPOSAL';end if;
 end loop;
 for dependency in select value from jsonb_array_elements(p->'dependencies') loop
  if not tr_lab_private.shape(dependency,'{"recordId":"string","revision":"string"}') or dependency->>'revision' !~ '^(0|[1-9][0-9]{0,18})$' then raise exception 'INVALID_PROPOSAL';end if;
 end loop;
 insert into tr_lab_private.sync_state(owner_id) values(s.user_id) on conflict do nothing;perform 1 from tr_lab_private.sync_state where owner_id=s.user_id for update;
 select * into record from public.tr_lab_records where owner_id=s.user_id and kind='proposal' and data->>'ruleBundleId'=p->>'ruleBundleId' and data->>'ruleVersion'=p->>'ruleVersion' and data->>'inputFingerprint'=p->>'inputFingerprint';
 if record.id is not null then return tr_lab_private.entity(record);end if;
 if not tr_lab_private.proposal_applicable(s.user_id,p) then raise exception 'PROPOSAL_STALE';end if;
 insert into public.tr_lab_records(owner_id,id,kind,revision,data) values(s.user_id,(p->>'id')::uuid,'proposal',1,p) returning * into record;
 insert into public.tr_lab_proposals values(s.user_id,record.id,p->>'ruleBundleId',(p->'before'->>'programId')::uuid);
 return tr_lab_private.emit(record);
end $$;
create function tr_lab_private.proposal_review(session_hash text,proposal_id uuid,challenge_digest text,expiry timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare s tr_lab_private.sessions;record public.tr_lab_records;begin
 s:=tr_lab_private.session_owner(session_hash);select * into record from public.tr_lab_records where owner_id=s.user_id and id=proposal_id and kind='proposal';
 if record.id is null or record.data->>'status'<>'pending' then raise exception 'PROPOSAL_NOT_PENDING';end if;
 if challenge_digest !~ '^[a-f0-9]{64}$' or expiry<=clock_timestamp() or expiry>clock_timestamp()+interval '10 minutes' then raise exception 'INVALID_CHALLENGE';end if;
 insert into tr_lab_private.confirmation_challenges values(decode(challenge_digest,'hex'),s.user_id,s.public_id,record.id,record.revision,record.data->>'contentDigest',expiry,null);
 return jsonb_build_object('proposal',record.data,'revision',record.revision::text,'applicable',tr_lab_private.proposal_applicable(s.user_id,record.data));
end $$;
create function tr_lab_private.proposal_decide(session_hash text,c jsonb,challenge_digest text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s tr_lab_private.sessions;op uuid;fingerprint bytea;saved tr_lab_private.receipts;proposal public.tr_lab_records;program public.tr_lab_records;decision public.tr_lab_records;challenge tr_lab_private.confirmation_challenges;payload jsonb;output jsonb:='[]';result jsonb;stamp text;data jsonb;code text;epoch uuid;begin
 s:=tr_lab_private.session_owner(session_hash);
 if not tr_lab_private.shape(c,'{"protocol_version":"number","sync_epoch":"string","operation_id":"string","device_id":"string","aggregate_id":"string","base":"object","depends_on":"array","client_recorded_at":"string","command":"string","payload":"object"}') or c->>'protocol_version'<>'2' or c->>'command'<>'DecideProposal' or octet_length(c::text)>262144 then raise exception 'INVALID_COMMAND';end if;
 payload:=c->'payload';if not tr_lab_private.shape(payload,'{"id":"string","decisionId":"string","choice":"string","proposalRevision":"string","contentDigest":"string","challenge":"string"}') or payload->>'id'<>c->>'aggregate_id' or payload->>'choice' not in ('accept','reject') or payload->>'proposalRevision' !~ '^[1-9][0-9]{0,18}$' or payload->>'contentDigest' !~ '^[a-f0-9]{64}$' or length(payload->>'challenge') not between 32 and 200 then raise exception 'INVALID_PAYLOAD';end if;
 op:=(c->>'operation_id')::uuid;perform (payload->>'id')::uuid;perform (payload->>'decisionId')::uuid;perform (c->>'device_id')::uuid;perform (c->>'client_recorded_at')::timestamptz;
 select value into epoch from tr_lab_private.epoch where id;if c->>'sync_epoch'<>epoch::text then raise exception 'EPOCH_MISMATCH';end if;
 insert into tr_lab_private.sync_state(owner_id) values(s.user_id) on conflict do nothing;perform 1 from tr_lab_private.sync_state where owner_id=s.user_id for update;
 fingerprint:=sha256(convert_to(c::text,'UTF8'));select * into saved from tr_lab_private.receipts where owner_id=s.user_id and operation_id=op;
 if saved.operation_id is not null then if saved.fingerprint<>fingerprint then raise exception 'OPERATION_ID_REUSED';end if;return saved.receipt;end if;
 select * into proposal from public.tr_lab_records where owner_id=s.user_id and id=(payload->>'id')::uuid and kind='proposal';
 if challenge_digest !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_CHALLENGE';end if;
 select * into challenge from tr_lab_private.confirmation_challenges where digest=decode(challenge_digest,'hex');
 if proposal.id is null or proposal.data->>'status'<>'pending' then code:='PROPOSAL_NOT_PENDING';
 elsif c->'base'<>jsonb_build_object('kind','server_revision','revision',proposal.revision::text) or (payload->>'proposalRevision')::bigint<>proposal.revision then code:='REVISION_CONFLICT';
 elsif proposal.data->>'contentDigest'<>payload->>'contentDigest' or challenge.owner_id is distinct from s.user_id or challenge.session_id is distinct from s.public_id or challenge.proposal_id is distinct from proposal.id or challenge.proposal_revision is distinct from proposal.revision or challenge.content_digest is distinct from payload->>'contentDigest' or challenge.expires_at<=clock_timestamp() or challenge.consumed_operation is not null then code:='CONFIRMATION_REQUIRED';
 elsif jsonb_array_length(c->'depends_on')<>0 then code:='INVALID_COMMAND';
 elsif payload->>'choice'='accept' and not tr_lab_private.proposal_applicable(s.user_id,proposal.data) then code:='PROPOSAL_STALE';end if;
 if code is not null then
  if code='PROPOSAL_STALE' then update public.tr_lab_records r set revision=r.revision+1,data=r.data||'{"status":"stale"}'::jsonb where r.owner_id=s.user_id and r.id=proposal.id returning * into proposal;perform tr_lab_private.emit(proposal);end if;
  result:=jsonb_build_object('operation_id',op,'status','rejected','code',code,'records',case when proposal.id is null then '[]'::jsonb else jsonb_build_array(tr_lab_private.entity(proposal)) end);
 else
  stamp:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  if payload->>'choice'='accept' then
   data:=(proposal.data->'afterProgram')||'{"status":"approved"}'::jsonb;
   insert into public.tr_lab_records(owner_id,id,kind,revision,data) values(s.user_id,(data->>'id')::uuid,'program',1,data) returning * into program;output:=jsonb_build_array(tr_lab_private.emit(program));
  end if;
  data:=jsonb_build_object('id',payload->>'decisionId','proposalId',proposal.id,'proposalRevision',proposal.revision::text,'choice',payload->>'choice','operationId',op,'programId',program.id,'decidedAt',stamp,'origin','online');
  insert into public.tr_lab_records(owner_id,id,kind,revision,data) values(s.user_id,(data->>'id')::uuid,'proposal_decision',1,data) returning * into decision;
  insert into public.tr_lab_proposal_decisions values(s.user_id,decision.id,proposal.id,op,program.id);output:=output||jsonb_build_array(tr_lab_private.emit(decision));
  update public.tr_lab_records r set revision=r.revision+1,data=r.data||jsonb_build_object('status',case when payload->>'choice'='accept' then 'accepted' else 'rejected' end,'decidedAt',stamp,'resultProgramId',program.id) where r.owner_id=s.user_id and r.id=proposal.id returning * into proposal;
  output:=output||jsonb_build_array(tr_lab_private.emit(proposal));
  update tr_lab_private.confirmation_challenges set consumed_operation=op where digest=challenge.digest;
  result:=jsonb_build_object('operation_id',op,'status','applied','code',null,'records',output);
 end if;
 insert into tr_lab_private.receipts values(s.user_id,op,fingerprint,result);return result;
end $$;
create function tr_lab_private.engine_rules(session_hash text) returns jsonb language plpgsql security definer set search_path='' as $$begin perform tr_lab_private.session_owner(session_hash);return (select coalesce(jsonb_agg(data order by id),'[]') from tr_lab_private.rule_bundles where status='active');end $$;
do $$declare signature text;begin foreach signature in array array['session_owner(text)','program_version_guard()','proposal_applicable(uuid,jsonb)','proposal_publish(text,jsonb)','proposal_review(text,uuid,text,timestamptz)','proposal_decide(text,jsonb,text)','engine_rules(text)'] loop
 execute 'alter function tr_lab_private.'||signature||' owner to tr_lab_command';execute 'revoke all on function tr_lab_private.'||signature||' from public,anon,authenticated,tr_lab_runtime';
end loop;end $$;
grant execute on function tr_lab_private.proposal_publish(text,jsonb),tr_lab_private.proposal_review(text,uuid,text,timestamptz),tr_lab_private.proposal_decide(text,jsonb,text),tr_lab_private.engine_rules(text) to tr_lab_runtime;
-- Anche una proposta, senza nuovi esercizi o calendari, richiede il lettore aggiornato.
do $$declare definition text;begin definition:=pg_get_functiondef('public.tr_lab_pull(text,text,uuid)'::regprocedure);definition:=replace(definition,$find$kind in ('private_exercise','equipment_profile','cycle','scheduled_session')$find$,$replacement$kind not in ('program','session','set','measurement','nutrition')$replacement$);execute definition;end $$;
-- Rifiuti terminali nelle RPC normali: il ledger conserva il conflitto anziché un retry infinito.
do $$declare name text;definition text;begin foreach name in array array['tr_lab_apply','tr_lab_apply_v2'] loop
 definition:=pg_get_functiondef(('public.'||name||'(jsonb)')::regprocedure);
 definition:=replace(definition,$find$else payload:=old.data||'{"status":"approved"}'; end if;$find$,$replacement$else payload:=old.data||'{"status":"approved"}';
 select coalesce(max((data->>'version')::bigint),0) into counter from public.tr_lab_records where owner_id=uid and kind='program' and data->>'status'='approved' and data->>'rootId'=old.data->>'rootId';
 if (old.data->>'version')::bigint<>counter+1 then rejection:='PROGRAM_VERSION_CONFLICT';end if; end if;$replacement$);
 definition:=replace(definition,$find$(old.id is not null and old.data->>'status'<>'draft')$find$,$replacement$(old.id is not null and (old.data->>'status'<>'draft' or old.data->>'rootId'<>payload->>'rootId' or old.data->>'version'<>payload->>'version'))$replacement$);
 definition:=replace(definition,$find$  if rejection is null and action='SaveProgramDraft' then$find$,$replacement$  if rejection is null and action in ('SaveProgramDraft','ApproveProgram') and exists(select 1 from jsonb_array_elements(payload->'days') d,jsonb_array_elements(d->'exercises') e where e->'exercise'->>'id' like 'private:%' and not exists(select 1 from public.tr_lab_records owned where owned.owner_id=uid and owned.kind='private_exercise' and owned.data->>'status'='active' and ((owned.data->'exercise')-array['name','instructions'])=((e->'exercise')-array['name','instructions']))) then rejection:='PRIVATE_EXERCISE_NOT_AVAILABLE';end if;
  if rejection is null and action='SaveProgramDraft' then$replacement$);
 execute definition;
end loop;end $$;
create function tr_lab_private.bundle_version_guard() returns trigger language plpgsql set search_path='' as $$begin
 if old.version=new.version and (old.data-array['status','reviewer','reviewedAt'])<>(new.data-array['status','reviewer','reviewedAt']) then raise exception 'BUNDLE_VERSION_REQUIRED';end if;return new;
end $$;
revoke all on function tr_lab_private.bundle_version_guard() from public,anon,authenticated,tr_lab_runtime;
create trigger tr_lab_bundle_version before update on tr_lab_private.rule_bundles for each row execute function tr_lab_private.bundle_version_guard();
create index tr_lab_session_program on public.tr_lab_records(owner_id,(data->>'programId')) where kind='session';
create function public.tr_lab_engine_records(program_scope uuid,requested_ids uuid[],session_ids uuid[] default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=tr_lab_private.user_id();result jsonb;begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;if cardinality(requested_ids)>100 or cardinality(session_ids)>20 then raise exception 'READ_LIMIT';end if;
 -- Solo le esposizioni scelte dal chiamante: lo storico lungo non forza lettura/aggregazione integrale.
 -- Il filtro owner e il programma padre restano obbligatori anche per ID scelti da un client ostile.
 select coalesce(jsonb_agg(tr_lab_private.entity(r) order by r.id),'[]') into result from (select * from public.tr_lab_records r where r.owner_id=uid and (r.id=any(requested_ids) or (program_scope is not null and (r.kind='session' and r.data->>'programId'=program_scope::text and (session_ids is null or r.id=any(session_ids)) or r.kind='set' and exists(select 1 from public.tr_lab_records s where s.owner_id=uid and s.id=r.parent_id and s.kind='session' and s.data->>'programId'=program_scope::text and (session_ids is null or s.id=any(session_ids)))))) order by r.id limit 1001) r;
 if jsonb_array_length(result)>1000 then raise exception 'DATA_WINDOW_REQUIRED';end if;return result;
end $$;
alter function public.tr_lab_engine_records(uuid,uuid[],uuid[]) owner to tr_lab_command;
revoke all on function public.tr_lab_engine_records(uuid,uuid[],uuid[]) from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_engine_records(uuid,uuid[],uuid[]) to authenticated;
create function public.tr_lab_receipt(operation_id uuid) returns jsonb language sql security definer set search_path='' as $$select r.receipt from tr_lab_private.receipts r where r.owner_id=tr_lab_private.user_id() and r.operation_id=$1$$;
alter function public.tr_lab_receipt(uuid) owner to tr_lab_command;
revoke all on function public.tr_lab_receipt(uuid) from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_receipt(uuid) to authenticated;
revoke create on schema public,tr_lab_private from tr_lab_command;
revoke set option for tr_lab_command from current_user;
revoke inherit option for tr_lab_command from current_user;
