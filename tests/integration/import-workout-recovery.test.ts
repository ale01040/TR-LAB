import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import {
  commandSchema,
  receiptSchema,
  type Command,
  type ImportReport,
  type RecoveredWorkout,
} from '@tr-lab/contracts';
import { createTestDatabase, queryAs } from '../helpers/test-database';
import { command, program, session, setLog, now } from '../helpers/fixtures';
const a = randomUUID(),
  b = randomUUID();
let db: Awaited<ReturnType<typeof createTestDatabase>>, epoch: string;
beforeAll(async () => {
  db = await createTestDatabase([a, b]);
  epoch = (await db.query<{ value: string }>('select value from tr_lab_private.epoch')).rows[0]!
    .value;
});
afterAll(async () => {
  await db?.close();
});
function feature<T extends { id: string }>(
  name: 'ImportProgramDraft' | 'ReconcileExecutedWorkout',
  data: T,
): Command {
  return commandSchema.parse({
    ...command('SaveMeasurement', data, epoch),
    protocol_version: 2,
    command: name,
  });
}
async function apply(owner: string, c: Command) {
  return receiptSchema.parse(
    await queryAs(
      db,
      owner,
      `select public.${c.command === 'ImportProgramDraft' ? 'tr_lab_import_program' : 'tr_lab_reconcile_workout'}($1) result`,
      [c],
    ),
  );
}
function importPacket() {
  const p = program();
  const report: ImportReport = {
    id: randomUUID(),
    programId: p.id,
    fileName: 'Fixture.xlsx',
    fileDigest: 'a'.repeat(64),
    digestAlgorithm: 'sha256',
    parserVersion: 'software-test',
    profile: 'scheda-abc-1',
    choices: { exercises: {}, phases: {} },
    issues: [],
    editedInEditor: false,
    createdAt: now,
  };
  return { id: p.id, program: p, report, variants: [] };
}
function history(): RecoveredWorkout {
  const p = program(),
    s = session(p);
  const log = setLog(s);
  return {
    id: randomUUID(),
    sourceEpoch: randomUUID(),
    sourceDeviceId: null,
    sourceArchiveDigest: null,
    sourceSessionId: s.id,
    sourceProgramId: p.id,
    approvalAtExecution: 'provisional',
    session: { ...s, status: 'completed', endedAt: now },
    sets: [log],
    recoveredAt: now,
    provenance: 'explicit_local_recovery',
  };
}
it('report, variante e bozza atomici, un retry non crea copie · SCH-04', async () => {
  const packet = importPacket(),
    id = randomUUID();
  const variant = {
    id,
    exercise: { ...packet.program.days[0]!.exercises[0]!.exercise, id: `private:${id}` },
    semanticVersion: '1',
    status: 'active',
    createdAt: now,
  };
  const withVariant = {
    ...packet,
    variants: [variant],
    program: {
      ...packet.program,
      days: packet.program.days.map((d, i) =>
        i
          ? d
          : {
              ...d,
              exercises: d.exercises.map((e, j) => (j ? e : { ...e, exercise: variant.exercise })),
            },
      ),
    },
  };
  const c = feature('ImportProgramDraft', withVariant),
    first = await apply(a, c);
  expect(first.status).toBe('applied');
  expect(first.records.map((r) => r.kind).sort()).toEqual([
    'import_report',
    'private_exercise',
    'program',
  ]);
  expect(await apply(a, c)).toEqual(first);
  expect((await apply(a, feature('ImportProgramDraft', withVariant))).status).toBe('applied');
  expect(
    (
      await db.query<{ n: number }>(
        'select count(*)::int n from public.tr_lab_imports where owner_id=$1 and id=$2',
        [a, packet.report.id],
      )
    ).rows[0]!.n,
  ).toBe(1);
  expect(
    (
      await apply(
        a,
        feature('ImportProgramDraft', {
          ...withVariant,
          program: { ...withVariant.program, name: 'Contenuto diverso' },
        }),
      )
    ).code,
  ).toBe('IMPORT_ID_REUSED');
  expect(
    await queryAs<number>(db, b, 'select count(*)::int result from public.tr_lab_imports'),
  ).toBe(0);
});
it('errore su una dipendenza non lascia varianti, bozza o report parziali', async () => {
  const packet = importPacket(),
    id = randomUUID();
  const variant = {
    id,
    exercise: { ...packet.program.days[0]!.exercises[0]!.exercise, id: `private:${id}` },
    semanticVersion: '1',
    status: 'active',
    createdAt: now,
  };
  packet.program.days[0]!.exercises[0]!.exercise = variant.exercise;
  await expect(
    apply(a, feature('ImportProgramDraft', { ...packet, variants: [variant, variant] })),
  ).rejects.toThrow('INVALID_VARIANT');
  expect(
    (
      await db.query<{ n: number }>(
        'select count(*)::int n from public.tr_lab_records where owner_id=$1 and id=any($2::uuid[])',
        [a, [packet.id, packet.report.id, id]],
      )
    ).rows[0]!.n,
  ).toBe(0);
  const malformed = {
    ...packet,
    report: { ...packet.report, choices: { exercises: {}, phases: { bad: null } } },
  };
  await expect(apply(a, feature('ImportProgramDraft', malformed))).rejects.toThrow(
    'INVALID_PAYLOAD',
  );
});
it('recupera risultati parziali senza approvare il piano, deduplica anche un altro dispositivo · SYNC-04', async () => {
  const value = history(),
    c = feature('ReconcileExecutedWorkout', value),
    first = await apply(a, c);
  expect(first.status).toBe('applied');
  expect(first.records[0]?.kind).toBe('recovered_workout');
  expect(await apply(a, c)).toEqual(first);
  const repeated = {
    ...value,
    id: randomUUID(),
    sourceDeviceId: randomUUID(),
    sourceArchiveDigest: 'b'.repeat(64),
    recoveredAt: '2026-10-13T00:00:00.000Z',
  };
  expect((await apply(a, feature('ReconcileExecutedWorkout', repeated))).records[0]?.id).toBe(
    value.id,
  );
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from public.tr_lab_records where owner_id=$1 and kind='program' and id=$2",
        [a, value.sourceProgramId],
      )
    ).rows[0]!.n,
  ).toBe(0);
  expect(
    await queryAs<number>(
      db,
      b,
      'select count(*)::int result from public.tr_lab_recovered_workouts',
    ),
  ).toBe(0);
});
it('conserva un conflitto di storico e rifiuta risultati fuori snapshot o quantità non intere', async () => {
  const value = history();
  await apply(a, feature('ReconcileExecutedWorkout', value));
  const changed = { ...value, id: randomUUID(), sets: value.sets.map((s) => ({ ...s, reps: 99 })) };
  expect((await apply(a, feature('ReconcileExecutedWorkout', changed))).code).toBe(
    'RECOVERED_HISTORY_CONFLICT',
  );
  const invalid = history();
  invalid.sets[0]!.targetId = randomUUID();
  await expect(apply(a, feature('ReconcileExecutedWorkout', invalid))).rejects.toThrow(
    'INVALID_RECOVERY',
  );
  const decimal = history();
  decimal.sets[0]!.reps = 8.5;
  await expect(apply(a, feature('ReconcileExecutedWorkout', decimal))).rejects.toThrow(
    'INVALID_RECOVERY',
  );
});
