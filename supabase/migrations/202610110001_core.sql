-- WP-04/05/08 · RF-01/03/06/14 · ADR-04/07/12–15 · WEB-11/12/14.
create schema if not exists tr_lab_private;
create role tr_lab_command nologin nobypassrls;
grant tr_lab_command to current_user with inherit true, set true;
grant usage on schema public, auth, tr_lab_private to tr_lab_command;
-- PostgreSQL gestito non usa un superuser: il nuovo owner deve poter creare nello schema.
-- Permesso solo durante il trasferimento; revocato alla fine della migrazione.
grant create on schema public to tr_lab_command;

create table tr_lab_private.sessions (
  token_hash text primary key,
  public_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  encrypted_tokens text not null,
  csrf text not null,
  expires_at timestamptz not null,
  recovery boolean not null default false
);
create table tr_lab_private.auth_flows (id text primary key, state text not null, verifier text, kind text not null, expires_at timestamptz not null);
revoke all on schema tr_lab_private from public, anon, authenticated;
revoke all on all tables in schema tr_lab_private from public, anon, authenticated;

create table public.tr_lab_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('program','session','set','measurement','nutrition')),
  revision bigint not null check(revision > 0),
  parent_id uuid,
  data jsonb not null check(jsonb_typeof(data) = 'object' and data->>'id' = id::text),
  primary key(owner_id,id),
  foreign key(owner_id,parent_id) references public.tr_lab_records(owner_id,id)
);
create unique index tr_lab_one_log on public.tr_lab_records(owner_id,parent_id,(data->>'prescriptionId'),(data->>'targetId'),(data->>'side')) where kind='set';
create table tr_lab_private.sync_state(owner_id uuid primary key references auth.users(id) on delete cascade, sequence bigint not null default 0);
create table tr_lab_private.epoch(id boolean primary key default true check(id), value uuid not null default gen_random_uuid());
insert into tr_lab_private.epoch(id) values(true);
create table tr_lab_private.receipts(owner_id uuid not null references auth.users(id) on delete cascade, operation_id uuid not null, fingerprint bytea not null, receipt jsonb not null, primary key(owner_id,operation_id));
create table tr_lab_private.events(owner_id uuid not null references auth.users(id) on delete cascade, sequence bigint not null, record jsonb not null, primary key(owner_id,sequence));
alter table public.tr_lab_records enable row level security;
create policy read_own on public.tr_lab_records for select to authenticated using(owner_id=(select auth.uid()));
create policy command_own on public.tr_lab_records to tr_lab_command using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select on public.tr_lab_records to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.tr_lab_records from public,anon,authenticated;
grant select,insert,update on public.tr_lab_records to tr_lab_command;
grant select,insert,update on tr_lab_private.sync_state to tr_lab_command;
grant select,insert on tr_lab_private.receipts,tr_lab_private.events to tr_lab_command;
grant select on tr_lab_private.epoch to tr_lab_command;

create function tr_lab_private.entity(r public.tr_lab_records) returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('id',r.id,'kind',r.kind,'revision',r.revision::text,'data',r.data)
$$;
create function tr_lab_private.emit(r public.tr_lab_records) returns jsonb language plpgsql set search_path='' as $$
declare seq bigint; dto jsonb;
begin
  update tr_lab_private.sync_state set sequence=sequence+1 where owner_id=r.owner_id returning sequence into seq;
  dto := tr_lab_private.entity(r);
  insert into tr_lab_private.events values(r.owner_id,seq,dto);
  return dto;
end $$;

-- Cesure di stato e relazioni sono ricontrollate qui anche per RPC dirette, fuori dalla UI.
-- Gli oggetti nidificati del programma sono aggregati versionati; i risultati hanno righe proprie.
create function tr_lab_private.shape(d jsonb, fields jsonb, nullable text[] default '{}', optional text[] default '{}') returns boolean language plpgsql immutable set search_path='' as $$
declare f record;
begin
  if d is null or jsonb_typeof(d)<>'object' or (d-array(select jsonb_object_keys(fields)))<>'{}'::jsonb then return false; end if;
  for f in select key,value from jsonb_each_text(fields) loop
    if not(d ? f.key) then if not(f.key=any(optional)) then return false; end if;
    elsif d->f.key='null'::jsonb then if not(f.key=any(nullable)) then return false; end if;
    elsif jsonb_typeof(d->f.key)<>f.value then return false; end if;
  end loop;
  return true;
end $$;
create function tr_lab_private.valid_data(kind text,d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare day jsonb; ex jsonb; target jsonb; week jsonb; ids text[]; identifier text;
begin
  if jsonb_typeof(d)<>'object' or d->>'id' is null then return false; end if;
  perform (d->>'id')::uuid;
  if kind='program' then
    if not tr_lab_private.shape(d,'{"id":"string","rootId":"string","name":"string","goal":"string","version":"string","status":"string","days":"array","weeks":"array","createdAt":"string","source":"string"}') then return false; end if;
    if (d - array['id','rootId','name','goal','version','status','days','weeks','createdAt','source']) <> '{}'::jsonb or not(d ?& array['id','rootId','name','goal','version','status','days','weeks','createdAt','source']) then return false; end if;
    perform (d->>'rootId')::uuid; perform (d->>'createdAt')::timestamptz;
    if length(d->>'name') not between 1 and 200 or d->>'status' not in ('draft','approved') or d->>'goal' not in ('hypertrophy','strength','bodyweight') or (d->>'version') !~ '^[1-9][0-9]{0,18}$' or (d->>'version')::numeric>9223372036854775807 or length(d->>'source')>300 then return false; end if;
    if jsonb_typeof(d->'days')<>'array' or jsonb_array_length(d->'days') not between 1 and 14 or jsonb_typeof(d->'weeks')<>'array' or jsonb_array_length(d->'weeks') not between 1 and 52 then return false; end if;
    ids := array[d->>'id'];
    for day in select value from jsonb_array_elements(d->'days') loop
      if not tr_lab_private.shape(day,'{"id":"string","name":"string","focus":"string","exercises":"array"}') then return false; end if;
      if (day - array['id','name','focus','exercises'])<>'{}'::jsonb or not(day ?& array['id','name','focus','exercises']) or length(day->>'name') not between 1 and 200 or length(day->>'focus')>200 or jsonb_array_length(day->'exercises') not between 1 and 50 then return false; end if;
      perform (day->>'id')::uuid; ids := ids || (day->>'id');
      for ex in select value from jsonb_array_elements(day->'exercises') loop
        if not tr_lab_private.shape(ex,'{"id":"string","exercise":"object","targets":"array","notes":"string","superset":"string","accumulation":"boolean"}',array['superset'],array['accumulation']) or not tr_lab_private.shape(ex->'exercise','{"id":"string","name":"string","muscle":"string","secondary":"array","equipment":"string","pattern":"string","unilateral":"boolean","basis":"string","instructions":"string"}') then return false; end if;
        if length(ex->'exercise'->>'id') not between 1 and 200 or length(ex->'exercise'->>'muscle') not between 1 and 200 or length(ex->'exercise'->>'pattern') not between 1 and 200 or length(ex->'exercise'->>'instructions')>3000 or jsonb_array_length(ex->'exercise'->'secondary')>5 or exists(select 1 from jsonb_array_elements(ex->'exercise'->'secondary') s where jsonb_typeof(s)<>'string' or length(s#>>'{}') not between 1 and 200) then return false; end if;
        if (ex - array['id','exercise','targets','notes','superset','accumulation'])<>'{}'::jsonb or not(ex ?& array['id','exercise','targets','notes','superset']) or jsonb_array_length(ex->'targets') not between 1 and 30 or length(ex->>'notes')>3000 then return false; end if;
        perform (ex->>'id')::uuid; ids := ids || (ex->>'id');
        if length(ex->>'superset')>30 or not exists(select 1 from jsonb_array_elements(ex->'targets') s where s->>'kind'='work') then return false; end if;
        if exists(select 1 from jsonb_array_elements(d->'weeks') w where w->>'phase'<>'deload' and ex->>'accumulation' is distinct from 'false' and jsonb_array_length(ex->'targets')+(w->>'extraSets')::int>30) then return false; end if;
        if ((ex->'exercise') - array['id','name','muscle','secondary','equipment','pattern','unilateral','basis','instructions'])<>'{}'::jsonb or not(ex->'exercise' ?& array['id','name','muscle','secondary','equipment','pattern','unilateral','basis','instructions']) or length(ex->'exercise'->>'name') not between 1 and 200 or ex->'exercise'->>'equipment' not in ('barbell','dumbbell','cable','machine','bodyweight') or ex->'exercise'->>'basis' not in ('total','per_dumbbell','bodyweight','added','assistance','machine') or jsonb_typeof(ex->'exercise'->'unilateral')<>'boolean' then return false; end if;
        for target in select value from jsonb_array_elements(ex->'targets') loop
          if not tr_lab_private.shape(target,'{"id":"string","repsMin":"number","repsMax":"number","rir":"number","restSeconds":"number","loadGrams":"number","kind":"string","side":"string"}',array['loadGrams'],array['side']) then return false; end if;
          if (target-array['id','repsMin','repsMax','rir','restSeconds','loadGrams','kind','side'])<>'{}'::jsonb or not(target ?& array['id','repsMin','repsMax','rir','restSeconds','loadGrams','kind']) then return false; end if;
          perform (target->>'id')::uuid; ids:=ids||(target->>'id');
          if coalesce(target->>'side','both')<>'both' and ex->'exercise'->>'unilateral'<>'true' then return false; end if;
          if (target->>'repsMin')::int not between 1 and 100 or (target->>'repsMax')::int not between (target->>'repsMin')::int and 100 or (target->>'rir')::numeric not between 0 and 10 or (target->>'restSeconds')::int not between 0 and 1800 or target->>'kind' not in ('work','warmup','extra') or (target->>'loadGrams' is not null and (target->>'loadGrams')::int not between 0 and 1000000) or (target ? 'side' and target->>'side' not in ('both','left','right')) then return false; end if;
        end loop;
      end loop;
    end loop;
    if (select count(distinct x) from unnest(ids) x) <> array_length(ids,1) then return false; end if;
    for week in select value from jsonb_array_elements(d->'weeks') loop
      if not tr_lab_private.shape(week,'{"name":"string","phase":"string","extraSets":"number","rir":"number"}',array['rir']) or length(week->>'name') not between 1 and 200 then return false; end if;
      if (week-array['name','phase','extraSets','rir'])<>'{}'::jsonb or not(week ?& array['name','phase','extraSets','rir']) or week->>'phase' not in ('test','base','accumulation','peak','deload') or (week->>'extraSets')::int not between 0 and 3 or (week->>'rir' is not null and (week->>'rir')::numeric not between 0 and 10) then return false; end if;
    end loop;
  elsif kind='session' then
    if not tr_lab_private.shape(d,'{"id":"string","programId":"string","dayId":"string","weekIndex":"number","snapshot":"object","status":"string","startedAt":"string","endedAt":"string","notes":"string"}',array['endedAt']) then return false; end if;
    if (d-array['id','programId','dayId','weekIndex','snapshot','status','startedAt','endedAt','notes'])<>'{}'::jsonb or not(d ?& array['id','programId','dayId','weekIndex','snapshot','status','startedAt','endedAt','notes']) or d->>'status' not in ('active','completed') or (d->>'weekIndex')::int not between 0 and 51 or length(d->>'notes')>3000 then return false; end if;
    perform (d->>'programId')::uuid; perform (d->>'dayId')::uuid; perform (d->>'startedAt')::timestamptz;
    if d->>'endedAt' is not null then perform (d->>'endedAt')::timestamptz; end if;
  elsif kind='set' then
    if not tr_lab_private.shape(d,'{"id":"string","sessionId":"string","prescriptionId":"string","targetId":"string","side":"string","loadGrams":"number","reps":"number","rir":"number","status":"string","recordedAt":"string","notes":"string"}',array['loadGrams','reps','rir']) then return false; end if;
    if (d-array['id','sessionId','prescriptionId','targetId','side','loadGrams','reps','rir','status','recordedAt','notes'])<>'{}'::jsonb or not(d ?& array['id','sessionId','prescriptionId','targetId','side','loadGrams','reps','rir','status','recordedAt','notes']) or d->>'status' not in ('completed','skipped') or d->>'side' not in ('bilateral','left','right') or length(d->>'notes')>1000 then return false; end if;
    perform (d->>'sessionId')::uuid; perform (d->>'prescriptionId')::uuid; perform (d->>'targetId')::uuid; perform (d->>'recordedAt')::timestamptz;
    if d->>'status'='completed' and (d->>'reps' is null or (d->>'reps')::int not between 1 and 1000) then return false; end if;
    if (d->>'loadGrams' is not null and (d->>'loadGrams')::int not between 0 and 1000000) or (d->>'rir' is not null and (d->>'rir')::numeric not between 0 and 10) then return false; end if;
  elsif kind='measurement' then
    if not tr_lab_private.shape(d,'{"id":"string","date":"string","kind":"string","side":"string","value":"number","unit":"string","notes":"string"}') then return false; end if;
    if (d-array['id','date','kind','side','value','unit','notes'])<>'{}'::jsonb or not(d ?& array['id','date','kind','side','value','unit','notes']) or d->>'kind' not in ('weight','waist','chest','arm','thigh') or d->>'side' not in ('none','left','right') or (d->>'value')::int not between 1 and 500000 or length(d->>'notes')>1000 then return false; end if;
    perform (d->>'date')::date;
    if d->>'unit'<>(case when d->>'kind'='weight' then 'g' else 'mm' end) then return false; end if;
  elsif kind='nutrition' then
    if not tr_lab_private.shape(d,'{"id":"string","calories":"number","protein":"number","fat":"number","carbs":"number","effectiveFrom":"string","method":"string","confirmedAt":"string"}') then return false; end if;
    if (d-array['id','calories','protein','fat','carbs','effectiveFrom','method','confirmedAt'])<>'{}'::jsonb or not(d ?& array['id','calories','protein','fat','carbs','effectiveFrom','method','confirmedAt']) or d->>'method'<>'manual' or (d->>'calories')::int not between 1 and 20000 then return false; end if;
    perform (d->>'effectiveFrom')::date; perform (d->>'confirmedAt')::timestamptz;
    foreach identifier in array array['protein','fat','carbs'] loop if (d->>identifier)::numeric not between 0 and 2000 then return false; end if; end loop;
    if abs((d->>'calories')::numeric-((d->>'protein')::numeric*4+(d->>'fat')::numeric*9+(d->>'carbs')::numeric*4))>greatest(20,(d->>'calories')::numeric*0.02) then return false; end if;
  else return false;
  end if;
  return true;
exception when others then return false;
end $$;

create function public.tr_lab_apply(c jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); op uuid; rid uuid; epoch uuid; digest bytea; saved tr_lab_private.receipts; old public.tr_lab_records; row public.tr_lab_records; parent public.tr_lab_records; expected bigint; actual bigint; payload jsonb; record_kind text; action text; rejection text; result jsonb; output jsonb:='[]'; dep text; selector jsonb; target jsonb; ex jsonb; day jsonb; week jsonb; count_work int; desired int; targets jsonb; t jsonb; idx int; used_ids text[]; candidate text; counter bigint;
begin
  if uid is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  if not tr_lab_private.shape(c,'{"protocol_version":"number","sync_epoch":"string","operation_id":"string","device_id":"string","aggregate_id":"string","base":"object","depends_on":"array","client_recorded_at":"string","command":"string","payload":"object"}') then raise exception 'INVALID_COMMAND'; end if;
  if octet_length(c::text)>262144 or (c-array['protocol_version','sync_epoch','operation_id','device_id','aggregate_id','base','depends_on','client_recorded_at','command','payload'])<>'{}'::jsonb or not(c ?& array['protocol_version','sync_epoch','operation_id','device_id','aggregate_id','base','depends_on','client_recorded_at','command','payload']) or c->>'protocol_version'<>'1' then raise exception 'INVALID_COMMAND'; end if;
  op:=(c->>'operation_id')::uuid; rid:=(c->>'aggregate_id')::uuid; perform (c->>'device_id')::uuid; perform (c->>'client_recorded_at')::timestamptz;
  select value into epoch from tr_lab_private.epoch where id;
  if c->>'sync_epoch'<>epoch::text then raise exception 'EPOCH_MISMATCH'; end if;
  insert into tr_lab_private.sync_state(owner_id) values(uid) on conflict do nothing;
  perform 1 from tr_lab_private.sync_state where owner_id=uid for update;
  digest:=sha256(convert_to(c::text,'UTF8'));
  select * into saved from tr_lab_private.receipts where owner_id=uid and operation_id=op;
  if found then
    if saved.fingerprint<>digest then raise exception 'OPERATION_ID_REUSED'; end if;
    return saved.receipt;
  end if;
  if jsonb_typeof(c->'depends_on')<>'array' or jsonb_array_length(c->'depends_on')>50 then raise exception 'INVALID_COMMAND'; end if;
  for dep in select jsonb_array_elements_text(c->'depends_on') loop
    if not exists(select 1 from tr_lab_private.receipts where owner_id=uid and operation_id=dep::uuid and receipt->>'status'='applied') then raise exception 'DEPENDENCY_PENDING'; end if;
  end loop;
  if c->'base'->>'kind'='server_revision' then
    if not tr_lab_private.shape(c->'base','{"kind":"string","revision":"string"}') then raise exception 'INVALID_BASE'; end if;
    if ((c->'base')-array['kind','revision'])<>'{}'::jsonb or c->'base'->>'revision' !~ '^(0|[1-9][0-9]{0,18})$' then raise exception 'INVALID_BASE'; end if;
    expected:=(c->'base'->>'revision')::bigint;
  elsif c->'base'->>'kind'='operation_result' then
    if not tr_lab_private.shape(c->'base','{"kind":"string","operation_id":"string","record_id":"string"}') then raise exception 'INVALID_BASE'; end if;
    if c->'base'->>'record_id'<>rid::text or ((c->'base')-array['kind','operation_id','record_id'])<>'{}'::jsonb then raise exception 'INVALID_BASE'; end if;
    select e into selector from tr_lab_private.receipts r, jsonb_array_elements(r.receipt->'records') e where r.owner_id=uid and r.operation_id=(c->'base'->>'operation_id')::uuid and r.receipt->>'status'='applied' and e->>'id'=rid::text;
    if selector is null then raise exception 'DEPENDENCY_PENDING'; end if;
    expected:=(selector->>'revision')::bigint;
  else raise exception 'INVALID_BASE'; end if;
  select * into old from public.tr_lab_records where owner_id=uid and id=rid;
  actual:=coalesce(old.revision,0); payload:=c->'payload'; action:=c->>'command';
  if actual<>expected then rejection:='REVISION_CONFLICT'; end if;
  record_kind:=case action when 'SaveProgramDraft' then 'program' when 'ApproveProgram' then 'program' when 'StartWorkout' then 'session' when 'FinishWorkout' then 'session' when 'SaveSet' then 'set' when 'SaveMeasurement' then 'measurement' when 'SaveNutritionTarget' then 'nutrition' end;
  if record_kind is null then rejection:='UNKNOWN_COMMAND'; end if;
  if rejection is null then
    if old.id is not null and old.kind<>record_kind then rejection:='TYPE_MISMATCH';
    elsif action='ApproveProgram' then
      if payload<>jsonb_build_object('id',rid,'confirmed',true) or old.id is null or old.data->>'status'<>'draft' then rejection:='INVALID_APPROVAL'; else payload:=old.data||'{"status":"approved"}'; end if;
    elsif not tr_lab_private.valid_data(record_kind,payload) or payload->>'id'<>rid::text then rejection:='INVALID_PAYLOAD';
    end if;
  end if;
  if rejection is null and action='SaveProgramDraft' then
    if payload->>'status'<>'draft' or (old.id is not null and old.data->>'status'<>'draft') then rejection:='IMMUTABLE_PROGRAM'; end if;
    if payload->>'rootId'<>rid::text and not exists(select 1 from public.tr_lab_records where owner_id=uid and kind='program' and data->>'rootId'=payload->>'rootId') then rejection:='INVALID_ROOT'; end if;
  elsif rejection is null and action='StartWorkout' then
    select * into parent from public.tr_lab_records where owner_id=uid and id=(payload->>'programId')::uuid and kind='program';
    if old.id is not null or parent.id is null or parent.data->>'status'<>'approved' or payload->>'status'<>'active' or payload->>'endedAt' is not null then rejection:='INVALID_SESSION';
    else
      select value into day from jsonb_array_elements(parent.data->'days') where value->>'id'=payload->>'dayId';
      week:=parent.data->'weeks'->((payload->>'weekIndex')::int);
      if day is null or week is null then rejection:='INVALID_SNAPSHOT'; else
        -- Stessa risoluzione di ciclo del dominio; nessun client può sostituire i target approvati.
        output:='[]';
        select array_agg(x) into used_ids from (
          select parent.id::text x union all select parent.data->>'rootId'
          union all select d->>'id' from jsonb_array_elements(parent.data->'days') d
          union all select p->>'id' from jsonb_array_elements(parent.data->'days') d,jsonb_array_elements(d->'exercises') p
          union all select s->>'id' from jsonb_array_elements(parent.data->'days') d,jsonb_array_elements(d->'exercises') p,jsonb_array_elements(p->'targets') s
        ) all_ids;
        for ex in select value from jsonb_array_elements(day->'exercises') loop
          select count(*) into count_work from jsonb_array_elements(ex->'targets') s where s->>'kind'='work';
          desired:=case when week->>'phase'='deload' then greatest(1,ceil(count_work::numeric/2)::int) else count_work+case when ex->>'accumulation'='false' then 0 else (week->>'extraSets')::int end end;
          targets:='[]';
          for t in select value from jsonb_array_elements(ex->'targets') where value->>'kind'='warmup' loop targets:=targets||jsonb_build_array(t); end loop;
          for idx in 0..desired-1 loop
            select value into t from jsonb_array_elements(ex->'targets') with ordinality a(value,n) where value->>'kind'='work' order by n offset least(idx,count_work-1) limit 1;
            if t is null then rejection:='INVALID_SNAPSHOT'; exit; end if;
            if idx>=count_work then
              counter:=('x'||right(ex->>'id',12))::bit(48)::bigint;
              loop
                counter:=(counter+1)%281474976710656;
                candidate:=left(ex->>'id',14)||'8'||substring(ex->>'id' from 16 for 9)||lpad(to_hex(counter),12,'0');
                exit when not(candidate=any(used_ids));
              end loop;
              used_ids:=used_ids||candidate; t:=t||jsonb_build_object('id',candidate);
            end if;
            if week->>'rir' is not null then t:=t||jsonb_build_object('rir',(week->>'rir')::numeric); end if;
            targets:=targets||jsonb_build_array(t);
          end loop;
          for t in select value from jsonb_array_elements(ex->'targets') where value->>'kind'='extra' loop targets:=targets||jsonb_build_array(t); end loop;
          output:=output||jsonb_build_array(ex||jsonb_build_object('targets',targets));
        end loop;
        day:=day||jsonb_build_object('exercises',output); output:='[]';
        if payload->'snapshot'<>day then rejection:='INVALID_SNAPSHOT'; end if;
      end if;
    end if;
  elsif rejection is null and action='FinishWorkout' then
    if old.id is null or old.data->>'status'<>'active' or payload->>'status'<>'completed' or payload->>'endedAt' is null or (payload-array['status','endedAt','notes'])<>(old.data-array['status','endedAt','notes']) then rejection:='IMMUTABLE_SESSION'; end if;
  elsif rejection is null and action='SaveSet' then
    select * into parent from public.tr_lab_records where owner_id=uid and id=(payload->>'sessionId')::uuid and kind='session';
    if parent.id is null or parent.data->>'status'<>'active' then rejection:='SESSION_NOT_ACTIVE'; else
      select value into ex from jsonb_array_elements(parent.data->'snapshot'->'exercises') where value->>'id'=payload->>'prescriptionId';
      select value into target from jsonb_array_elements(ex->'targets') where value->>'id'=payload->>'targetId';
      if ex is null or target is null or (old.id is not null and (old.data->>'sessionId'<>payload->>'sessionId' or old.data->>'prescriptionId'<>payload->>'prescriptionId' or old.data->>'targetId'<>payload->>'targetId' or old.data->>'side'<>payload->>'side')) then rejection:='INVALID_TARGET';
      elsif target->>'side' in ('left','right') and payload->>'side'<>target->>'side' then rejection:='INVALID_SIDE';
      elsif coalesce(target->>'side','both')='both' and ((ex->'exercise'->>'unilateral'='true' and payload->>'side'='bilateral') or (ex->'exercise'->>'unilateral'='false' and payload->>'side'<>'bilateral')) then rejection:='INVALID_SIDE';
      elsif exists(select 1 from public.tr_lab_records where owner_id=uid and kind='set' and id<>rid and parent_id=parent.id and data->>'prescriptionId'=payload->>'prescriptionId' and data->>'targetId'=payload->>'targetId' and data->>'side'=payload->>'side') then rejection:='DUPLICATE_SET'; end if;
    end if;
  end if;
  if rejection is not null then
    result:=jsonb_build_object('operation_id',op,'status','rejected','code',rejection,'records',case when old.id is null then '[]'::jsonb else jsonb_build_array(tr_lab_private.entity(old)) end);
  else
    insert into public.tr_lab_records(owner_id,id,kind,revision,parent_id,data) values(uid,rid,record_kind,actual+1,case when record_kind in ('session','set') then parent.id else null end,payload)
      on conflict(owner_id,id) do update set revision=excluded.revision,data=excluded.data returning * into row;
    output:=jsonb_build_array(tr_lab_private.emit(row));
    if action='SaveSet' then
      update public.tr_lab_records set revision=revision+1 where owner_id=uid and id=parent.id returning * into row;
      output:=output||jsonb_build_array(tr_lab_private.emit(row));
    end if;
    result:=jsonb_build_object('operation_id',op,'status','applied','code',null,'records',output);
  end if;
  insert into tr_lab_private.receipts values(uid,op,digest,result);
  return result;
end $$;
alter function public.tr_lab_apply(jsonb) owner to tr_lab_command;
revoke all on function public.tr_lab_apply(jsonb) from public,anon;
grant execute on function public.tr_lab_apply(jsonb) to authenticated;
grant execute on function tr_lab_private.entity(public.tr_lab_records),tr_lab_private.emit(public.tr_lab_records),tr_lab_private.valid_data(text,jsonb) to tr_lab_command;
grant execute on function tr_lab_private.shape(jsonb,jsonb,text[],text[]) to tr_lab_command;
revoke all on all functions in schema tr_lab_private from public,anon,authenticated;

create function public.tr_lab_bootstrap() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); epoch uuid; seq bigint;
begin
  if uid is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  select value into epoch from tr_lab_private.epoch where id;
  select sequence into seq from tr_lab_private.sync_state where owner_id=uid;
  return jsonb_build_object('sync_epoch',epoch,'sequence',coalesce(seq,0)::text);
end $$;
alter function public.tr_lab_bootstrap() owner to tr_lab_command;
revoke all on function public.tr_lab_bootstrap() from public,anon;
grant execute on function public.tr_lab_bootstrap() to authenticated;

create function public.tr_lab_pull(after_sequence text, until_sequence text, expected_epoch uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); epoch uuid; events jsonb; next_seq bigint; ceiling bigint;
begin
  if uid is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
  select value into epoch from tr_lab_private.epoch where id;
  if expected_epoch<>epoch then raise exception 'EPOCH_MISMATCH'; end if;
  if after_sequence !~ '^(0|[1-9][0-9]{0,18})$' or (until_sequence is not null and until_sequence !~ '^(0|[1-9][0-9]{0,18})$') then raise exception 'INVALID_CURSOR'; end if;
  select coalesce(sequence,0) into ceiling from tr_lab_private.sync_state where owner_id=uid;
  ceiling:=coalesce(until_sequence::bigint,ceiling,0);
  select coalesce(jsonb_agg(jsonb_build_object('sequence',e.sequence::text,'record',e.record) order by e.sequence),'[]'),coalesce(max(e.sequence),after_sequence::bigint) into events,next_seq from (select * from tr_lab_private.events where owner_id=uid and sequence>after_sequence::bigint and sequence<=ceiling order by sequence limit 100) e;
  return jsonb_build_object('sync_epoch',epoch,'next_sequence',next_seq::text,'has_more',exists(select 1 from tr_lab_private.events where owner_id=uid and sequence>next_seq and sequence<=ceiling),'events',events);
end $$;
alter function public.tr_lab_pull(text,text,uuid) owner to tr_lab_command;
revoke all on function public.tr_lab_pull(text,text,uuid) from public,anon;
grant execute on function public.tr_lab_pull(text,text,uuid) to authenticated;
revoke create on schema public from tr_lab_command;
revoke set option for tr_lab_command from current_user;
revoke inherit option for tr_lab_command from current_user;
revoke all on public.tr_lab_records from anon;
