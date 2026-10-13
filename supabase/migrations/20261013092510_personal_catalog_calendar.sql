-- SCH-01b/03/05 · RF-03/04/07/13 · ADR-04/07/12 · WEB-11/12/14.
-- Additivo: i record v1 e i digest delle ricevute esistenti restano invariati.
grant tr_lab_command to current_user with inherit true, set true;
grant create on schema public,tr_lab_private to tr_lab_command;
alter table public.tr_lab_records drop constraint tr_lab_records_kind_check;
alter table public.tr_lab_records add constraint tr_lab_records_kind_check check(kind in ('program','session','set','measurement','nutrition','private_exercise','equipment_profile','cycle','scheduled_session'));
create table public.tr_lab_private_exercises(owner_id uuid not null,id uuid not null,semantic_version bigint not null check(semantic_version>0),status text not null check(status in ('active','archived')),primary key(owner_id,id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade);
create table public.tr_lab_equipment_profiles(owner_id uuid not null,id uuid not null,place text not null check(place in ('gym','home','bodyweight')),primary key(owner_id,id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade);
create table public.tr_lab_cycles(owner_id uuid not null,id uuid not null,program_id uuid not null,status text not null check(status in ('active','archived')),primary key(owner_id,id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade,foreign key(owner_id,program_id) references public.tr_lab_records(owner_id,id));
create table public.tr_lab_scheduled_sessions(owner_id uuid not null,id uuid not null,cycle_id uuid not null,program_id uuid not null,session_id uuid,planned_date date not null,status text not null check(status in ('planned','cancelled','skipped','active','completed')),primary key(owner_id,id),foreign key(owner_id,id) references public.tr_lab_records(owner_id,id) on delete cascade,foreign key(owner_id,cycle_id) references public.tr_lab_cycles(owner_id,id),foreign key(owner_id,program_id) references public.tr_lab_records(owner_id,id),foreign key(owner_id,session_id) references public.tr_lab_records(owner_id,id),unique(owner_id,session_id));
create index tr_lab_scheduled_agenda on public.tr_lab_scheduled_sessions(owner_id,planned_date);
create index tr_lab_scheduled_cycle on public.tr_lab_scheduled_sessions(owner_id,cycle_id);
create index tr_lab_cycles_program on public.tr_lab_cycles(owner_id,program_id);
do $$ declare t text;begin foreach t in array array['tr_lab_private_exercises','tr_lab_equipment_profiles','tr_lab_cycles','tr_lab_scheduled_sessions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy read_own on public.%I for select to authenticated using(owner_id=(select auth.uid()))',t);
 execute format('create policy command_own on public.%I to tr_lab_command using(owner_id=(select tr_lab_private.user_id())) with check(owner_id=(select tr_lab_private.user_id()))',t);
 execute format('revoke all on public.%I from public,anon,authenticated,tr_lab_runtime',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant select,insert,update on public.%I to tr_lab_command',t);
 end loop;end $$;
create function tr_lab_private.valid_feature(kind text,d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;load jsonb;last_load bigint; ids text[]:='{}'; fixture jsonb;
begin
 perform (d->>'id')::uuid;
 if kind='private_exercise' then
  if not tr_lab_private.shape(d,'{"id":"string","exercise":"object","semanticVersion":"string","status":"string","createdAt":"string"}') or d->>'status' not in ('active','archived') or d->>'semanticVersion' !~ '^[1-9][0-9]{0,18}$' or (d->>'semanticVersion')::numeric>9223372036854775807 or d->'exercise'->>'id'<>'private:'||(d->>'id') then return false;end if;
  perform (d->>'createdAt')::timestamptz;
  -- Riusa il validatore SQL completo dell'esercizio incorporato, senza duplicarne le regole.
  fixture:=jsonb_build_object('id','00000000-0000-4000-8000-000000000013','rootId','00000000-0000-4000-8000-000000000013','name','validation','goal','hypertrophy','version','1','status','draft','createdAt',d->>'createdAt','source','',
   'days',jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000000010','name','A','focus','','exercises',jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000000011','exercise',d->'exercise','notes','','superset',null,'targets',jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000000012','repsMin',1,'repsMax',1,'rir',0,'restSeconds',0,'loadGrams',null,'kind','work')))))),
   'weeks',jsonb_build_array(jsonb_build_object('name','Base','phase','base','extraSets',0,'rir',null)));
  return tr_lab_private.valid_data('program',fixture);
 elsif kind='equipment_profile' then
  if not tr_lab_private.shape(d,'{"id":"string","name":"string","place":"string","items":"array","updatedAt":"string"}') or length(btrim(d->>'name')) not between 1 and 200 or d->>'place' not in ('gym','home','bodyweight') or jsonb_array_length(d->'items')>100 then return false;end if;
  perform (d->>'updatedAt')::timestamptz;
  for item in select value from jsonb_array_elements(d->'items') loop
   if not tr_lab_private.shape(item,'{"id":"string","category":"string","basis":"string","availableLoadsGrams":"array","machineId":"string"}',array['machineId']) or item->>'category' not in ('barbell','dumbbell','cable','machine','bodyweight') or item->>'basis' not in ('total','per_dumbbell','bodyweight','added','assistance','machine') or length(item->>'machineId')>200 or jsonb_array_length(item->'availableLoadsGrams')>300 then return false;end if;
   perform (item->>'id')::uuid;if item->>'id'=any(ids) then return false;end if;ids:=ids||(item->>'id');last_load:=-1;
   for load in select value from jsonb_array_elements(item->'availableLoadsGrams') loop
    if jsonb_typeof(load)<>'number' or (load#>>'{}')::numeric<>trunc((load#>>'{}')::numeric) or (load#>>'{}')::bigint not between 0 and 1000000 or (load#>>'{}')::bigint<=last_load then return false;end if;last_load:=(load#>>'{}')::bigint;
   end loop;
  end loop;
 elsif kind='cycle' then
  if not tr_lab_private.shape(d,'{"id":"string","name":"string","programId":"string","startDate":"string","timeZone":"string","status":"string"}') or length(btrim(d->>'name')) not between 1 and 200 or d->>'status' not in ('active','archived') then return false;end if;
  perform (d->>'programId')::uuid;if d->>'startDate' !~ '^\d{4}-\d{2}-\d{2}$' or (d->>'startDate')::date::text<>d->>'startDate' then return false;end if;
  if not exists(select 1 from pg_timezone_names where name=d->>'timeZone') then return false;end if;
 elsif kind='scheduled_session' then
  if not tr_lab_private.shape(d,'{"id":"string","cycleId":"string","programId":"string","dayId":"string","weekIndex":"number","date":"string","timeZone":"string","status":"string","sessionId":"string","createdAt":"string"}',array['sessionId']) or (d->>'weekIndex')::numeric<>trunc((d->>'weekIndex')::numeric) or (d->>'weekIndex')::int not between 0 and 51 or d->>'status' not in ('planned','cancelled','skipped','active','completed') or (d->>'status' in ('active','completed'))<>(d->>'sessionId' is not null) then return false;end if;
  perform (d->>'cycleId')::uuid;perform (d->>'programId')::uuid;perform (d->>'dayId')::uuid;perform (d->>'sessionId')::uuid;perform (d->>'createdAt')::timestamptz;
  if d->>'date' !~ '^\d{4}-\d{2}-\d{2}$' or (d->>'date')::date::text<>d->>'date' or not exists(select 1 from pg_timezone_names where name=d->>'timeZone') then return false;end if;
 else return tr_lab_private.valid_data(kind,d);
 end if;
 return true;
exception when others then return false;
end $$;
alter function tr_lab_private.valid_feature(text,jsonb) owner to tr_lab_command;
revoke all on function tr_lab_private.valid_feature(text,jsonb) from public,anon,authenticated,tr_lab_runtime;
-- Genera la nuova RPC da una copia verificabile della logica v1: ledger, lock e hash identici.
do $$ declare definition text;extension text;begin
 definition:=pg_get_functiondef('public.tr_lab_apply(jsonb)'::regprocedure);
 if position($check$c->>'protocol_version'<>'1'$check$ in definition)=0 or position($check$when 'SaveNutritionTarget' then 'nutrition' end$check$ in definition)=0 or position($check$  elsif rejection is null and action='StartWorkout' then$check$ in definition)=0 then raise exception 'UNEXPECTED_V1_FUNCTION';end if;
 definition:=replace(definition,'public.tr_lab_apply(','public.tr_lab_apply_v2(');
 definition:=replace(definition,$find$c->>'protocol_version'<>'1'$find$,$replacement$c->>'protocol_version'<>'2'$replacement$);
 definition:=replace(definition,'tr_lab_private.valid_data(record_kind,payload)','tr_lab_private.valid_feature(record_kind,payload)');
 definition:=replace(definition,$find$when 'SaveNutritionTarget' then 'nutrition' end$find$,$replacement$when 'SaveNutritionTarget' then 'nutrition' when 'SavePrivateExercise' then 'private_exercise' when 'ArchivePrivateExercise' then 'private_exercise' when 'SaveEquipmentProfile' then 'equipment_profile' when 'SaveCycle' then 'cycle' when 'SaveScheduledSession' then 'scheduled_session' when 'CancelScheduledSession' then 'scheduled_session' end$replacement$);
 extension:=$rules$
  elsif rejection is null and action in ('SavePrivateExercise','ArchivePrivateExercise') then
   if old.id is null then
    if action<>'SavePrivateExercise' or payload->>'status'<>'active' or payload->>'semanticVersion'<>'1' then rejection:='INVALID_VARIANT';end if;
   else
    if (old.data-array['exercise','status'])<>(payload-array['exercise','status']) or ((old.data->'exercise')-array['name','instructions'])<>((payload->'exercise')-array['name','instructions']) then rejection:='NEW_VARIANT_REQUIRED';end if;
    if action='ArchivePrivateExercise' and (old.data->>'status'<>'active' or payload->>'status'<>'archived' or old.data->'exercise'<>payload->'exercise') then rejection:='INVALID_VARIANT';end if;
    if action='SavePrivateExercise' and old.data->>'status'<>payload->>'status' then rejection:='INVALID_VARIANT';end if;
   end if;
  elsif rejection is null and action='SaveCycle' then
   select * into parent from public.tr_lab_records where owner_id=uid and id=(payload->>'programId')::uuid and kind='program';
   if parent.id is null or parent.data->>'status'<>'approved' or (old.id is null and payload->>'status'<>'active') or (old.id is not null and old.data-'status'<>payload-'status') then rejection:='INVALID_CYCLE';end if;
  elsif rejection is null and action in ('SaveScheduledSession','CancelScheduledSession') then
   select * into parent from public.tr_lab_records where owner_id=uid and id=(payload->>'programId')::uuid and kind='program';
   if parent.id is null or parent.data->>'status'<>'approved' or not exists(select 1 from public.tr_lab_records cyc where cyc.owner_id=uid and cyc.id=(payload->>'cycleId')::uuid and cyc.kind='cycle' and cyc.data->>'programId'=payload->>'programId' and cyc.data->>'timeZone'=payload->>'timeZone' and (action='CancelScheduledSession' or cyc.data->>'status'='active')) or not exists(select 1 from jsonb_array_elements(parent.data->'days') scheduled_day where scheduled_day->>'id'=payload->>'dayId') or parent.data->'weeks'->((payload->>'weekIndex')::int) is null then rejection:='INVALID_SCHEDULE';
   elsif action='SaveScheduledSession' and (payload->>'status'<>'planned' or payload->>'sessionId' is not null or (old.id is not null and (old.data->>'status'<>'planned' or old.data-'date'<>payload-'date'))) then rejection:='IMMUTABLE_SCHEDULE';
   elsif action='CancelScheduledSession' and (old.id is null or old.data->>'status'<>'planned' or payload->>'status' not in ('cancelled','skipped') or old.data-'status'<>payload-'status') then rejection:='IMMUTABLE_SCHEDULE';end if;
 $rules$;
 definition:=replace(definition,$find$  elsif rejection is null and action='StartWorkout' then$find$,extension||$replacement$  elsif rejection is null and action='StartWorkout' then$replacement$);
 execute definition;
end $$;
alter function public.tr_lab_apply_v2(jsonb) owner to tr_lab_command;
revoke all on function public.tr_lab_apply_v2(jsonb) from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_apply_v2(jsonb) to authenticated;
create function tr_lab_private.feature_projection() returns trigger language plpgsql security definer set search_path='' as $$
declare ex jsonb; linked public.tr_lab_records;
begin
 if new.kind='program' and (tg_op='INSERT' or old.data->>'status'='draft') then
  for ex in select p->'exercise' from jsonb_array_elements(new.data->'days') d,jsonb_array_elements(d->'exercises') p loop
   if ex->>'id' like 'private:%' and not exists(select 1 from public.tr_lab_records e where e.owner_id=new.owner_id and e.kind='private_exercise' and e.data->>'status'='active' and ((e.data->'exercise')-array['name','instructions'])=(ex-array['name','instructions'])) then raise exception 'PRIVATE_EXERCISE_NOT_AVAILABLE';end if;
  end loop;
 elsif new.kind='private_exercise' then
  insert into public.tr_lab_private_exercises values(new.owner_id,new.id,(new.data->>'semanticVersion')::bigint,new.data->>'status') on conflict(owner_id,id) do update set status=excluded.status;
 elsif new.kind='equipment_profile' then
  insert into public.tr_lab_equipment_profiles values(new.owner_id,new.id,new.data->>'place') on conflict(owner_id,id) do update set place=excluded.place;
 elsif new.kind='cycle' then
  insert into public.tr_lab_cycles values(new.owner_id,new.id,(new.data->>'programId')::uuid,new.data->>'status') on conflict(owner_id,id) do update set status=excluded.status;
 elsif new.kind='scheduled_session' then
  insert into public.tr_lab_scheduled_sessions values(new.owner_id,new.id,(new.data->>'cycleId')::uuid,(new.data->>'programId')::uuid,(new.data->>'sessionId')::uuid,(new.data->>'date')::date,new.data->>'status') on conflict(owner_id,id) do update set planned_date=excluded.planned_date,status=excluded.status,session_id=excluded.session_id;
 elsif new.kind='session' and new.data->>'status'='completed' then
  for linked in update public.tr_lab_records r set revision=revision+1,data=data||'{"status":"completed"}'::jsonb where r.owner_id=new.owner_id and r.kind='scheduled_session' and r.data->>'sessionId'=new.id::text and r.data->>'status'='active' returning * loop perform tr_lab_private.emit(linked);end loop;
 end if;
 return new;
end $$;
alter function tr_lab_private.feature_projection() owner to tr_lab_command;
revoke all on function tr_lab_private.feature_projection() from public,anon,authenticated,tr_lab_runtime;
create trigger tr_lab_feature_projection after insert or update on public.tr_lab_records for each row execute function tr_lab_private.feature_projection();
-- Il vecchio lettore non deve ricevere record che non sa interpretare.
do $$ declare definition text;begin
 definition:=pg_get_functiondef('public.tr_lab_pull(text,text,uuid)'::regprocedure);
 execute replace(definition,'public.tr_lab_pull(','public.tr_lab_pull_v2(');
 definition:=replace(definition,$find$  select value into epoch from tr_lab_private.epoch where id;$find$,$replacement$  if exists(select 1 from public.tr_lab_records where owner_id=uid and kind in ('private_exercise','equipment_profile','cycle','scheduled_session')) then raise exception 'UPGRADE_REQUIRED';end if;$replacement$||chr(10)||$replacement$  select value into epoch from tr_lab_private.epoch where id;$replacement$);
 execute definition;
end $$;
alter function public.tr_lab_pull_v2(text,text,uuid) owner to tr_lab_command;
revoke all on function public.tr_lab_pull_v2(text,text,uuid) from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_pull_v2(text,text,uuid) to authenticated;
create function public.tr_lab_capabilities() returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('protocol_version',2) where tr_lab_private.user_id() is not null$$;
alter function public.tr_lab_capabilities() owner to tr_lab_command;
revoke all on function public.tr_lab_capabilities() from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_capabilities() to authenticated;
grant update on tr_lab_private.receipts to tr_lab_command;
create function public.tr_lab_start_scheduled(c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<operation>>
declare uid uuid:=tr_lab_private.user_id();op uuid;rid uuid;fingerprint bytea;saved tr_lab_private.receipts;old public.tr_lab_records;changed public.tr_lab_records;epoch uuid;expected bigint;selector jsonb;translated jsonb;receipt jsonb;payload jsonb;session jsonb;
begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 if not tr_lab_private.shape(c,'{"protocol_version":"number","sync_epoch":"string","operation_id":"string","device_id":"string","aggregate_id":"string","base":"object","depends_on":"array","client_recorded_at":"string","command":"string","payload":"object"}') or c->>'protocol_version'<>'2' or c->>'command'<>'StartScheduledWorkout' or octet_length(c::text)>262144 then raise exception 'INVALID_COMMAND';end if;
 payload:=c->'payload';if not tr_lab_private.shape(payload,'{"id":"string","session":"object"}') or payload->>'id'<>c->>'aggregate_id' then raise exception 'INVALID_PAYLOAD';end if;
 op:=(c->>'operation_id')::uuid;rid:=(c->>'aggregate_id')::uuid;perform (c->>'device_id')::uuid;perform (c->>'client_recorded_at')::timestamptz;
 select value into epoch from tr_lab_private.epoch where id;if c->>'sync_epoch'<>epoch::text then raise exception 'EPOCH_MISMATCH';end if;
 insert into tr_lab_private.sync_state(owner_id) values(uid) on conflict do nothing;perform 1 from tr_lab_private.sync_state where owner_id=uid for update;
 fingerprint:=sha256(convert_to(c::text,'UTF8'));select * into saved from tr_lab_private.receipts where owner_id=uid and operation_id=op;
 if found then if saved.fingerprint<>fingerprint then raise exception 'OPERATION_ID_REUSED';end if;return saved.receipt;end if;
 if c->'base'->>'kind'='server_revision' and tr_lab_private.shape(c->'base','{"kind":"string","revision":"string"}') and c->'base'->>'revision' ~ '^(0|[1-9][0-9]{0,18})$' then expected:=(c->'base'->>'revision')::bigint;
 elsif c->'base'->>'kind'='operation_result' and tr_lab_private.shape(c->'base','{"kind":"string","operation_id":"string","record_id":"string"}') and c->'base'->>'record_id'=rid::text then
  select e into selector from tr_lab_private.receipts r,jsonb_array_elements(r.receipt->'records') e where r.owner_id=uid and r.operation_id=(c->'base'->>'operation_id')::uuid and r.receipt->>'status'='applied' and e->>'id'=rid::text;
  if selector is null then raise exception 'DEPENDENCY_PENDING';end if;expected:=(selector->>'revision')::bigint;
 else raise exception 'INVALID_BASE';end if;
 select * into old from public.tr_lab_records where owner_id=uid and id=rid and kind='scheduled_session';session:=payload->'session';
 if old.id is null or old.revision<>expected or old.data->>'status'<>'planned' or not tr_lab_private.valid_data('session',session) or session->>'programId'<>old.data->>'programId' or session->>'dayId'<>old.data->>'dayId' or session->>'weekIndex'<>old.data->>'weekIndex' then
  receipt:=jsonb_build_object('operation_id',op,'status','rejected','code',case when old.revision<>expected then 'REVISION_CONFLICT' else 'INVALID_SCHEDULE' end,'records',case when old.id is null then '[]'::jsonb else jsonb_build_array(tr_lab_private.entity(old)) end);
  insert into tr_lab_private.receipts values(uid,op,fingerprint,receipt);return receipt;
 end if;
 -- Stesso lock e transazione della seduta: una risposta persa non crea due avvii.
 translated:=c||jsonb_build_object('protocol_version',1,'aggregate_id',session->>'id','base',jsonb_build_object('kind','server_revision','revision','0'),'command','StartWorkout','payload',session);
 receipt:=public.tr_lab_apply(translated);
 if receipt->>'status'='applied' then
  update public.tr_lab_records set revision=revision+1,data=data||jsonb_build_object('status','active','sessionId',session->>'id') where owner_id=uid and id=rid returning * into changed;
  receipt:=receipt||jsonb_build_object('records',(receipt->'records')||jsonb_build_array(tr_lab_private.emit(changed)));
 end if;
 -- Solo la ricevuta appena creata viene completata, mai una ricevuta storica.
 update tr_lab_private.receipts set fingerprint=operation.fingerprint,receipt=operation.receipt where owner_id=uid and operation_id=op;
 return receipt;
end $$;
alter function public.tr_lab_start_scheduled(jsonb) owner to tr_lab_command;
revoke all on function public.tr_lab_start_scheduled(jsonb) from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_start_scheduled(jsonb) to authenticated;
create function public.tr_lab_plan_cycle(c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<operation>>
declare uid uuid:=tr_lab_private.user_id();op uuid;fingerprint bytea;saved tr_lab_private.receipts;epoch uuid;payload jsonb;child jsonb;receipt jsonb;result jsonb;output jsonb;
begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 if not tr_lab_private.shape(c,'{"protocol_version":"number","sync_epoch":"string","operation_id":"string","device_id":"string","aggregate_id":"string","base":"object","depends_on":"array","client_recorded_at":"string","command":"string","payload":"object"}') or c->>'protocol_version'<>'2' or c->>'command'<>'PlanCycle' or octet_length(c::text)>262144 then raise exception 'INVALID_COMMAND';end if;
 payload:=c->'payload';if not tr_lab_private.shape(payload,'{"id":"string","cycle":"object","occurrences":"array"}') or payload->>'id'<>c->>'aggregate_id' or payload->'cycle'->>'id'<>payload->>'id' or payload->'cycle'->>'status'<>'active' or jsonb_array_length(payload->'occurrences') not between 1 and 100 then raise exception 'INVALID_PAYLOAD';end if;
 op:=(c->>'operation_id')::uuid;perform (c->>'aggregate_id')::uuid;perform (c->>'device_id')::uuid;perform (c->>'client_recorded_at')::timestamptz;
 select value into epoch from tr_lab_private.epoch where id;if c->>'sync_epoch'<>epoch::text then raise exception 'EPOCH_MISMATCH';end if;
 insert into tr_lab_private.sync_state(owner_id) values(uid) on conflict do nothing;perform 1 from tr_lab_private.sync_state where owner_id=uid for update;
 fingerprint:=sha256(convert_to(c::text,'UTF8'));select * into saved from tr_lab_private.receipts where owner_id=uid and operation_id=op;
 if found then if saved.fingerprint<>fingerprint then raise exception 'OPERATION_ID_REUSED';end if;return saved.receipt;end if;
 if c->'base'<>jsonb_build_object('kind','server_revision','revision','0') then raise exception 'INVALID_BASE';end if;
 receipt:=public.tr_lab_apply_v2(c||jsonb_build_object('command','SaveCycle','payload',payload->'cycle'));
 output:=receipt->'records';
 if receipt->>'status'='applied' then
  for child in select value from jsonb_array_elements(payload->'occurrences') loop
   if child->>'cycleId'<>payload->>'id' or child->>'status'<>'planned' then raise exception 'INVALID_SCHEDULE';end if;
   result:=public.tr_lab_apply_v2(c||jsonb_build_object('operation_id',gen_random_uuid(),'aggregate_id',child->>'id','command','SaveScheduledSession','payload',child));
   if result->>'status'<>'applied' then raise exception 'INVALID_SCHEDULE';end if;
   output:=output||(result->'records');
  end loop;
  receipt:=receipt||jsonb_build_object('records',output);
 end if;
 update tr_lab_private.receipts set fingerprint=operation.fingerprint,receipt=operation.receipt where owner_id=uid and operation_id=op;
 return receipt;
end $$;
alter function public.tr_lab_plan_cycle(jsonb) owner to tr_lab_command;
revoke all on function public.tr_lab_plan_cycle(jsonb) from public,anon,tr_lab_runtime;
grant execute on function public.tr_lab_plan_cycle(jsonb) to authenticated;
revoke create on schema public,tr_lab_private from tr_lab_command;
revoke set option for tr_lab_command from current_user;
revoke inherit option for tr_lab_command from current_user;
