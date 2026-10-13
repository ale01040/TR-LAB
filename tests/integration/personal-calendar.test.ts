import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  commandSchema,
  receiptSchema,
  type Command,
  type PrivateExercise,
  type ScheduledSession,
} from '@tr-lab/contracts';
import { resolveDay, planCalendar } from '@tr-lab/domain';
import { createTestDatabase, queryAs } from '../helpers/test-database';
import { program, command as coreCommand, now } from '../helpers/fixtures';
const a = randomUUID(),
  b = randomUUID();
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let epoch: string;
beforeAll(async () => {
  db = await createTestDatabase([a, b]);
  epoch = (await db.query<{ value: string }>('select value from tr_lab_private.epoch')).rows[0]!
    .value;
});
afterAll(async () => {
  await db?.close();
});
function feature<T extends { id: string }>(
  action: Extract<Command, { protocol_version: 2 }>['command'],
  data: T,
  revision = '0',
): Command {
  return commandSchema.parse({
    ...coreCommand('SaveMeasurement', data, epoch, revision),
    protocol_version: 2,
    command: action,
  });
}
async function apply(owner: string, c: Command) {
  const fn =
    c.protocol_version === 1
      ? 'tr_lab_apply'
      : c.command === 'PlanCycle'
        ? 'tr_lab_plan_cycle'
        : c.command === 'StartScheduledWorkout'
          ? 'tr_lab_start_scheduled'
          : 'tr_lab_apply_v2';
  return receiptSchema.parse(
    await queryAs(db, owner, `select public.${fn}($1::jsonb) result`, [JSON.stringify(c)]),
  );
}
async function approved() {
  const p = program();
  await apply(a, coreCommand('SaveProgramDraft', p, epoch));
  await apply(a, coreCommand('ApproveProgram', { id: p.id, confirmed: true }, epoch, '1'));
  return { ...p, status: 'approved' as const };
}
async function scheduled() {
  const p = await approved();
  const cycle = {
    id: randomUUID(),
    programId: p.id,
    name: 'Ciclo prova',
    startDate: '2026-10-13',
    timeZone: 'Europe/Rome',
    status: 'active',
  };
  await apply(a, feature('SaveCycle', cycle));
  const occurrence: ScheduledSession = {
    id: randomUUID(),
    cycleId: cycle.id,
    programId: p.id,
    dayId: p.days[0]!.id,
    weekIndex: 0,
    date: '2026-10-13',
    timeZone: 'Europe/Rome',
    status: 'planned',
    sessionId: null,
    createdAt: now,
  };
  await apply(a, feature('SaveScheduledSession', occurrence));
  return { p, occurrence };
}
describe('catalogo privato e calendario sul database migrato', () => {
  it('pianifica tutte le occorrenze atomicamente, un retry non le duplica', async () => {
    const p = await approved();
    const value = planCalendar({
      program: p,
      startDate: '2026-10-13',
      timeZone: 'Europe/Rome',
      weekdays: [1, 3, 5],
      fromWeek: 0,
      weeks: 1,
      nextId: randomUUID,
      now,
    });
    const c = feature('PlanCycle', { id: value.cycle.id, ...value });
    const first = await apply(a, c);
    expect(first.status).toBe('applied');
    expect(first.records).toHaveLength(1 + p.days.length);
    expect(await apply(a, c)).toEqual(first);
    const invalid = planCalendar({
      program: p,
      startDate: '2026-10-13',
      timeZone: 'Europe/Rome',
      weekdays: [1],
      fromWeek: 0,
      weeks: 1,
      nextId: randomUUID,
      now,
    });
    invalid.occurrences[0]!.dayId = randomUUID();
    await expect(
      apply(a, feature('PlanCycle', { id: invalid.cycle.id, ...invalid })),
    ).rejects.toThrow('INVALID_SCHEDULE');
    expect(
      (
        await db.query<{ n: number }>(
          'select count(*)::int n from public.tr_lab_records where owner_id=$1 and id=$2',
          [a, invalid.cycle.id],
        )
      ).rows[0]!.n,
    ).toBe(0);
  });
  it('isola la variante, ne conserva il gesto e ne archivia lo snapshot', async () => {
    const id = randomUUID();
    const variant: PrivateExercise = {
      id,
      exercise: { ...program().days[0]!.exercises[0]!.exercise, id: `private:${id}` },
      semanticVersion: '1',
      status: 'active',
      createdAt: now,
    };
    const c = feature('SavePrivateExercise', variant);
    expect((await apply(a, c)).status).toBe('applied');
    expect(await apply(a, c)).toEqual(await apply(a, c));
    const hidden = await queryAs<number>(
      db,
      b,
      'select count(*)::int result from public.tr_lab_private_exercises',
    );
    expect(hidden).toBe(0);
    expect(
      (
        await apply(
          a,
          feature(
            'SavePrivateExercise',
            { ...variant, exercise: { ...variant.exercise, basis: 'per_dumbbell' } },
            '1',
          ),
        )
      ).code,
    ).toBe('NEW_VARIANT_REQUIRED');
    expect(
      (await apply(a, feature('ArchivePrivateExercise', { ...variant, status: 'archived' }, '1')))
        .status,
    ).toBe('applied');
    expect(
      (
        await db.query<{ data: PrivateExercise }>(
          'select data from public.tr_lab_records where owner_id=$1 and id=$2',
          [a, id],
        )
      ).rows[0]!.data.exercise,
    ).toEqual(variant.exercise);
  });
  it('nega DML pubblico e RPC v2 al ruolo runtime', async () => {
    expect(
      await queryAs<boolean>(
        db,
        a,
        "select has_table_privilege(current_user,'public.tr_lab_scheduled_sessions','INSERT') result",
      ),
    ).toBe(false);
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('tr_lab_runtime','public.tr_lab_apply_v2(jsonb)','EXECUTE') allowed",
    );
    expect(result.rows[0]!.allowed).toBe(false);
  });
  it('rifiuta carichi frazionari/duplicati e riferimenti a programmi altrui', async () => {
    const gear = {
      id: randomUUID(),
      name: 'Casa',
      place: 'home',
      items: [
        {
          id: randomUUID(),
          category: 'dumbbell',
          basis: 'per_dumbbell',
          availableLoadsGrams: [1000.5],
          machineId: null,
        },
      ],
      updatedAt: now,
    };
    expect((await apply(a, feature('SaveEquipmentProfile', gear))).code).toBe('INVALID_PAYLOAD');
    const { p } = await scheduled();
    expect(
      (
        await apply(
          b,
          feature('SaveCycle', {
            id: randomUUID(),
            programId: p.id,
            name: 'Esterno',
            startDate: '2026-10-13',
            timeZone: 'Europe/Rome',
            status: 'active',
          }),
        )
      ).code,
    ).toBe('INVALID_CYCLE');
  });
  it('sposta solo la data, mantiene la fase e segnala il rinvio concorrente', async () => {
    const { occurrence } = await scheduled();
    const c = feature('SaveScheduledSession', { ...occurrence, date: '2026-10-25' }, '1');
    const first = await apply(a, c);
    expect(first.status).toBe('applied');
    expect(await apply(a, c)).toEqual(first);
    expect(
      (await apply(a, feature('SaveScheduledSession', { ...occurrence, date: '2026-10-26' }, '1')))
        .code,
    ).toBe('REVISION_CONFLICT');
    expect(
      (await apply(a, feature('SaveScheduledSession', { ...occurrence, weekIndex: 1 }, '2')))
        .status,
    ).toBe('rejected');
  });
  it('avvia una sola seduta e conclude il collegamento nella transazione del diario', async () => {
    const { p, occurrence } = await scheduled();
    const session = {
      id: randomUUID(),
      programId: p.id,
      dayId: occurrence.dayId,
      weekIndex: 0,
      snapshot: resolveDay(p, p.days[0]!, 0),
      status: 'active',
      startedAt: now,
      endedAt: null,
      notes: '',
    };
    const c = feature('StartScheduledWorkout', { id: occurrence.id, session }, '1');
    const first = await apply(a, c);
    expect(first.status).toBe('applied');
    expect(first.records).toHaveLength(2);
    expect(await apply(a, c)).toEqual(first);
    expect(
      (
        await apply(
          a,
          feature(
            'StartScheduledWorkout',
            { id: occurrence.id, session: { ...session, id: randomUUID() } },
            '1',
          ),
        )
      ).status,
    ).toBe('rejected');
    const finish = coreCommand(
      'FinishWorkout',
      { ...session, status: 'completed', endedAt: now },
      epoch,
      '1',
    );
    expect((await apply(a, finish)).status).toBe('applied');
    const state = (
      await db.query<{ status: string }>(
        'select status from public.tr_lab_scheduled_sessions where owner_id=$1 and id=$2',
        [a, occurrence.id],
      )
    ).rows[0]!.status;
    expect(state).toBe('completed');
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.tr_lab_records where owner_id=$1 and kind='session' and data->>'programId'=$2",
          [a, p.id],
        )
      ).rows[0]!.n,
    ).toBe(1);
  });
  it('blocca il vecchio pull senza inviare JSON parziale, il v2 legge tutti i record', async () => {
    await expect(
      queryAs(db, a, 'select public.tr_lab_pull($1,$2,$3) result', ['0', null, epoch]),
    ).rejects.toThrow('UPGRADE_REQUIRED');
    const page = await queryAs<{ events: unknown[] }>(
      db,
      a,
      'select public.tr_lab_pull_v2($1,$2,$3) result',
      ['0', null, epoch],
    );
    expect(page!.events.length).toBeGreaterThan(0);
  });
});
