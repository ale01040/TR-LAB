-- SCH-04/SYNC-04/MOT-03 · RF-04/07/16 · ADR-04/07/08/09/12 · WEB-11/12/14.
grant tr_lab_command to current_user with inherit true, set true;
grant create on schema public,tr_lab_private to tr_lab_command;
create function tr_lab_private.integer_fields(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare pair record;item jsonb;begin
 if jsonb_typeof(d)='object' then for pair in select * from jsonb_each(d) loop
  if pair.key=any(array['repsMin','repsMax','restSeconds','loadGrams','extraSets','weekIndex','reps','calories','value']) and jsonb_typeof(pair.value)='number' and (pair.value#>>'{}')::numeric<>trunc((pair.value#>>'{}')::numeric) then return false;end if;
  if not tr_lab_private.integer_fields(pair.value) then return false;end if;
 end loop;elsif jsonb_typeof(d)='array' then for item in select value from jsonb_array_elements(d) loop if not tr_lab_private.integer_fields(item) then return false;end if;end loop;end if;return true;
end $$;
alter function tr_lab_private.integer_fields(jsonb) owner to tr_lab_command;
revoke all on function tr_lab_private.integer_fields(jsonb) from public,anon,authenticated,tr_lab_runtime;
-- ::int arrotonda i decimali PostgreSQL: rifiutarli prima preserva il contratto int della UI.
do $$declare definition text;begin definition:=pg_get_functiondef('tr_lab_private.valid_data(text,jsonb)'::regprocedure);definition:=replace(definition,$find$  if jsonb_typeof(d)<>'object' or d->>'id' is null then return false; end if;$find$,$replacement$  if jsonb_typeof(d)<>'object' or d->>'id' is null or not tr_lab_private.integer_fields(d) then return false; end if;$replacement$);execute definition;end $$;
alter table public.tr_lab_records drop constraint tr_lab_records_kind_check;
alter table public.tr_lab_records add constraint tr_lab_records_kind_check check(kind in ('program','session','set','measurement','nutrition','private_exercise','equipment_profile','cycle','scheduled_session','proposal','proposal_decision','import_report','recovered_workout'));
create table public.tr_lab_imports(owner_id uuid not null,id uuid not null,program_id uuid not null,file_digest text not null check(file_digest ~ '^[a-f0-9]{64}$'),payload_fingerprint bytea not null,primary key(owner_id,id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade,foreign key(owner_id,program_id) references public.tr_lab_records(owner_id,id));
create index tr_lab_imports_program on public.tr_lab_imports(owner_id,program_id);
create table public.tr_lab_recovered_workouts(owner_id uuid not null,id uuid not null,source_namespace text not null,source_session_id uuid not null,payload_fingerprint bytea not null,primary key(owner_id,id),unique(owner_id,source_namespace,source_session_id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade);
do $$declare t text;begin foreach t in array array['tr_lab_imports','tr_lab_recovered_workouts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy read_own on public.%I for select to authenticated using(owner_id=(select auth.uid()))',t);
 execute format('create policy command_own on public.%I to tr_lab_command using(owner_id=(select tr_lab_private.user_id())) with check(owner_id=(select tr_lab_private.user_id()))',t);
 execute format('revoke all on public.%I from public,anon,authenticated,tr_lab_runtime',t);execute format('grant select on public.%I to authenticated',t);execute format('grant select,insert on public.%I to tr_lab_command',t);
end loop;end $$;
create function tr_lab_private.valid_import_report(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;pair record;begin
 if not tr_lab_private.shape(d,'{"id":"string","programId":"string","fileName":"string","fileDigest":"string","digestAlgorithm":"string","parserVersion":"string","profile":"string","choices":"object","issues":"array","editedInEditor":"boolean","createdAt":"string"}') or length(d->>'fileName') not between 1 and 300 or d->>'fileDigest' !~ '^[a-f0-9]{64}$' or d->>'digestAlgorithm'<>'sha256' or length(d->>'parserVersion') not between 1 and 100 or length(d->>'profile') not between 1 and 100 or jsonb_array_length(d->'issues')>1000 or not tr_lab_private.shape(d->'choices','{"rir":"string","exercises":"object","phases":"object"}','{}',array['rir']) or (d->'choices' ? 'rir' and d->'choices'->>'rir' not in ('lower','upper')) then return false;end if;
 perform (d->>'id')::uuid;perform (d->>'programId')::uuid;perform (d->>'createdAt')::timestamptz;
 for pair in select * from jsonb_each(d->'choices'->'exercises') loop if length(pair.key)>300 or jsonb_typeof(pair.value)<>'string' or length(pair.value#>>'{}') not between 1 and 200 then return false;end if;end loop;
 for pair in select * from jsonb_each(d->'choices'->'phases') loop if length(pair.key)>300 or jsonb_typeof(pair.value)<>'string' or pair.value#>>'{}' not in ('test','base','accumulation','peak','deload') then return false;end if;end loop;
 for item in select value from jsonb_array_elements(d->'issues') loop
  if not tr_lab_private.shape(item,'{"severity":"string","code":"string","sheet":"string","cell":"string","message":"string"}',array['cell']) or item->>'severity'<>'info' or length(item->>'code') not between 1 and 100 or length(item->>'sheet')>100 or length(item->>'cell')>300 or length(item->>'message')>2000 then return false;end if;
 end loop;return true;
exception when others then return false;
end $$;
create function public.tr_lab_import_program(c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<operation>>
declare uid uuid:=tr_lab_private.user_id();op uuid;fingerprint bytea;payload_fingerprint bytea;saved tr_lab_private.receipts;previous public.tr_lab_imports;epoch uuid;payload jsonb;report jsonb;variant jsonb;row public.tr_lab_records;receipt jsonb;result jsonb;output jsonb:='[]';begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 if not tr_lab_private.shape(c,'{"protocol_version":"number","sync_epoch":"string","operation_id":"string","device_id":"string","aggregate_id":"string","base":"object","depends_on":"array","client_recorded_at":"string","command":"string","payload":"object"}') or c->>'protocol_version'<>'2' or c->>'command'<>'ImportProgramDraft' or octet_length(c::text)>262144 then raise exception 'INVALID_COMMAND';end if;
 payload:=c->'payload';report:=payload->'report';
 if not tr_lab_private.shape(payload,'{"id":"string","program":"object","report":"object","variants":"array"}') or payload->>'id'<>c->>'aggregate_id' or payload->'program'->>'id'<>payload->>'id' or payload->'program'->>'rootId'<>payload->>'id' or payload->'program'->>'version'<>'1' or payload->'program'->>'status'<>'draft' or not tr_lab_private.valid_data('program',payload->'program') or not tr_lab_private.valid_import_report(report) or report->>'programId'<>payload->>'id' or report->>'id'=payload->>'id' or jsonb_array_length(payload->'variants')>50 then raise exception 'INVALID_PAYLOAD';end if;
 op:=(c->>'operation_id')::uuid;perform (c->>'device_id')::uuid;perform (c->>'client_recorded_at')::timestamptz;
 select value into epoch from tr_lab_private.epoch where id;if c->>'sync_epoch'<>epoch::text then raise exception 'EPOCH_MISMATCH';end if;
 insert into tr_lab_private.sync_state(owner_id) values(uid) on conflict do nothing;perform 1 from tr_lab_private.sync_state where owner_id=uid for update;
 fingerprint:=sha256(convert_to(c::text,'UTF8'));select * into saved from tr_lab_private.receipts where owner_id=uid and operation_id=op;
 if saved.operation_id is not null then if saved.fingerprint<>fingerprint then raise exception 'OPERATION_ID_REUSED';end if;return saved.receipt;end if;
 payload_fingerprint:=sha256(convert_to(payload::text,'UTF8'));select * into previous from public.tr_lab_imports where owner_id=uid and id=(report->>'id')::uuid;
 if previous.id is not null then
  if previous.payload_fingerprint<>payload_fingerprint then result:=jsonb_build_object('operation_id',op,'status','rejected','code','IMPORT_ID_REUSED','records','[]'::jsonb);
  else select coalesce(jsonb_agg(tr_lab_private.entity(r)),'[]') into output from public.tr_lab_records r where r.owner_id=uid and r.id in (previous.id,previous.program_id);result:=jsonb_build_object('operation_id',op,'status','applied','code',null,'records',output);end if;
  insert into tr_lab_private.receipts values(uid,op,fingerprint,result);return result;
 end if;
 if c->'base'<>jsonb_build_object('kind','server_revision','revision','0') then raise exception 'INVALID_BASE';end if;
 for variant in select value from jsonb_array_elements(payload->'variants') loop
  if not tr_lab_private.valid_feature('private_exercise',variant) or variant->>'status'<>'active' or variant->>'semanticVersion'<>'1' or not exists(select 1 from jsonb_array_elements(payload->'program'->'days') d,jsonb_array_elements(d->'exercises') e where e->'exercise'->>'id'=variant->'exercise'->>'id') then raise exception 'INVALID_VARIANT';end if;
  receipt:=public.tr_lab_apply_v2(c||jsonb_build_object('operation_id',gen_random_uuid(),'aggregate_id',variant->>'id','command','SavePrivateExercise','payload',variant));if receipt->>'status'<>'applied' then raise exception 'INVALID_VARIANT';end if;output:=output||(receipt->'records');
 end loop;
 receipt:=public.tr_lab_apply(c||jsonb_build_object('protocol_version',1,'command','SaveProgramDraft','payload',payload->'program'));
 if receipt->>'status'<>'applied' then raise exception 'INVALID_IMPORTED_PROGRAM';end if;output:=output||(receipt->'records');
 insert into public.tr_lab_records(owner_id,id,kind,revision,data) values(uid,(report->>'id')::uuid,'import_report',1,report) returning * into row;
 insert into public.tr_lab_imports values(uid,row.id,(payload->>'id')::uuid,report->>'fileDigest',payload_fingerprint);
 result:=receipt||jsonb_build_object('records',output||jsonb_build_array(tr_lab_private.emit(row)));
 update tr_lab_private.receipts set fingerprint=operation.fingerprint,receipt=operation.result where owner_id=uid and operation_id=op;return result;
end $$;
create function tr_lab_private.valid_recovered_workout(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;slot jsonb;target jsonb;fixture jsonb;keys text[]:='{}';ids text[]:='{}';selector text;begin
 if not tr_lab_private.shape(d,'{"id":"string","sourceEpoch":"string","sourceDeviceId":"string","sourceArchiveDigest":"string","sourceSessionId":"string","sourceProgramId":"string","approvalAtExecution":"string","session":"object","sets":"array","recoveredAt":"string","provenance":"string"}',array['sourceEpoch','sourceDeviceId','sourceArchiveDigest']) or (d->>'sourceEpoch' is null and d->>'sourceDeviceId' is null and d->>'sourceArchiveDigest' is null) or (d->>'sourceArchiveDigest' is not null and d->>'sourceArchiveDigest' !~ '^[a-f0-9]{64}$') or d->>'provenance'<>'explicit_local_recovery' or d->>'approvalAtExecution' not in ('approved','provisional','unknown') or d->'session'->>'id'<>d->>'sourceSessionId' or d->'session'->>'programId'<>d->>'sourceProgramId' or d->'session'->>'dayId'<>d->'session'->'snapshot'->>'id' or d->'session'->>'status'<>'completed' or d->'session'->>'endedAt' is null or jsonb_array_length(d->'sets')>1000 or not tr_lab_private.valid_data('session',d->'session') then return false;end if;
 perform (d->>'id')::uuid;perform (d->>'sourceEpoch')::uuid;perform (d->>'sourceDeviceId')::uuid;perform (d->>'recoveredAt')::timestamptz;
 fixture:=jsonb_build_object('id',d->>'sourceProgramId','rootId',d->>'sourceProgramId','name','Historical snapshot','goal','hypertrophy','version','1','status','draft','createdAt',d->>'recoveredAt','source','','days',jsonb_build_array(d->'session'->'snapshot'),'weeks',jsonb_build_array(jsonb_build_object('name','History','phase','base','extraSets',0,'rir',null)));
 if not tr_lab_private.valid_data('program',fixture) then return false;end if;
 for item in select value from jsonb_array_elements(d->'sets') loop
  if not tr_lab_private.valid_data('set',item) or item->>'sessionId'<>d->>'sourceSessionId' or item->>'id'=any(ids) then return false;end if;
  select value into slot from jsonb_array_elements(d->'session'->'snapshot'->'exercises') e where e->>'id'=item->>'prescriptionId';select value into target from jsonb_array_elements(slot->'targets') t where t->>'id'=item->>'targetId';selector:=(item->>'prescriptionId')||':'||(item->>'targetId')||':'||(item->>'side');
  if slot is null or target is null or selector=any(keys) or (coalesce(target->>'side','both')<>'both' and target->>'side'<>item->>'side') or (coalesce(target->>'side','both')='both' and ((slot->'exercise'->>'unilateral'='true')=(item->>'side'='bilateral'))) then return false;end if;
  keys:=keys||selector;ids:=ids||(item->>'id');
 end loop;return true;
exception when others then return false;
end $$;
create function public.tr_lab_reconcile_workout(c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=tr_lab_private.user_id();op uuid;fingerprint bytea;payload_fingerprint bytea;saved tr_lab_private.receipts;previous public.tr_lab_recovered_workouts;epoch uuid;payload jsonb;namespace text;row public.tr_lab_records;result jsonb;begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 if not tr_lab_private.shape(c,'{"protocol_version":"number","sync_epoch":"string","operation_id":"string","device_id":"string","aggregate_id":"string","base":"object","depends_on":"array","client_recorded_at":"string","command":"string","payload":"object"}') or c->>'protocol_version'<>'2' or c->>'command'<>'ReconcileExecutedWorkout' or octet_length(c::text)>262144 then raise exception 'INVALID_COMMAND';end if;
 payload:=c->'payload';if payload->>'id'<>c->>'aggregate_id' or not tr_lab_private.valid_recovered_workout(payload) then raise exception 'INVALID_RECOVERY';end if;
 op:=(c->>'operation_id')::uuid;perform (c->>'device_id')::uuid;perform (c->>'client_recorded_at')::timestamptz;
 select value into epoch from tr_lab_private.epoch where id;if c->>'sync_epoch'<>epoch::text then raise exception 'EPOCH_MISMATCH';end if;
 insert into tr_lab_private.sync_state(owner_id) values(uid) on conflict do nothing;perform 1 from tr_lab_private.sync_state where owner_id=uid for update;
 fingerprint:=sha256(convert_to(c::text,'UTF8'));select * into saved from tr_lab_private.receipts where owner_id=uid and operation_id=op;
 if saved.operation_id is not null then if saved.fingerprint<>fingerprint then raise exception 'OPERATION_ID_REUSED';end if;return saved.receipt;end if;
 if c->'base'<>jsonb_build_object('kind','server_revision','revision','0') or c->'depends_on'<>'[]'::jsonb then raise exception 'INVALID_BASE';end if;
 namespace:=coalesce('epoch:'||(payload->>'sourceEpoch'),'device:'||(payload->>'sourceDeviceId'),'archive:'||(payload->>'sourceArchiveDigest'));
 payload_fingerprint:=sha256(convert_to(((payload-array['id','recoveredAt','sourceEpoch','sourceDeviceId','sourceArchiveDigest'])||jsonb_build_object('sets',(select coalesce(jsonb_agg(value order by value->>'id'),'[]') from jsonb_array_elements(payload->'sets'))))::text,'UTF8'));select * into previous from public.tr_lab_recovered_workouts where owner_id=uid and source_namespace=namespace and source_session_id=(payload->>'sourceSessionId')::uuid;
 if previous.id is not null then
  select * into row from public.tr_lab_records where owner_id=uid and id=previous.id;
  result:=jsonb_build_object('operation_id',op,'status',case when previous.payload_fingerprint=payload_fingerprint then 'applied' else 'rejected' end,'code',case when previous.payload_fingerprint=payload_fingerprint then null else 'RECOVERED_HISTORY_CONFLICT' end,'records',jsonb_build_array(tr_lab_private.entity(row)));
 elsif exists(select 1 from public.tr_lab_records where owner_id=uid and id=(payload->>'sourceSessionId')::uuid and kind='session') then
  select * into row from public.tr_lab_records where owner_id=uid and id=(payload->>'sourceSessionId')::uuid;
  result:=jsonb_build_object('operation_id',op,'status','rejected','code','HISTORY_ALREADY_PRESENT','records',jsonb_build_array(tr_lab_private.entity(row)));
 else
  insert into public.tr_lab_records(owner_id,id,kind,revision,data) values(uid,(payload->>'id')::uuid,'recovered_workout',1,payload) returning * into row;
  insert into public.tr_lab_recovered_workouts values(uid,row.id,namespace,(payload->>'sourceSessionId')::uuid,payload_fingerprint);
  result:=jsonb_build_object('operation_id',op,'status','applied','code',null,'records',jsonb_build_array(tr_lab_private.emit(row)));
 end if;insert into tr_lab_private.receipts values(uid,op,fingerprint,result);return result;
end $$;
alter function tr_lab_private.valid_import_report(jsonb) owner to tr_lab_command;
alter function tr_lab_private.valid_recovered_workout(jsonb) owner to tr_lab_command;
revoke all on function tr_lab_private.valid_import_report(jsonb),tr_lab_private.valid_recovered_workout(jsonb) from public,anon,authenticated,tr_lab_runtime;
alter function public.tr_lab_import_program(jsonb) owner to tr_lab_command;
alter function public.tr_lab_reconcile_workout(jsonb) owner to tr_lab_command;
revoke all on function public.tr_lab_import_program(jsonb),public.tr_lab_reconcile_workout(jsonb) from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_import_program(jsonb),public.tr_lab_reconcile_workout(jsonb) to authenticated;
revoke create on schema public,tr_lab_private from tr_lab_command;
revoke set option for tr_lab_command from current_user;
revoke inherit option for tr_lab_command from current_user;
