import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  programSchema,
  generationInputSchema,
  type Entity,
  type EquipmentProfile,
  type Exercise,
} from '@tr-lab/contracts';
import {
  canonicalJson,
  generateProgram,
  normalizeGenerationInput,
  proposeProgression,
  resolveDay,
} from '@tr-lab/domain';
import { syntheticInput, syntheticRule } from '../helpers/engine-fixtures';
import { program, now } from '../helpers/fixtures';
function ids(seed: string) {
  let index = 0;
  return () => seed.slice(0, 24) + (++index).toString(16).padStart(12, '0');
}
it('60 profili sintetici rispettano obiettivo, ambiente, attrezzi, esclusioni e limite di tempo · ALG-16/30', () => {
  let cases = 0;
  for (const objective of ['hypertrophy', 'strength'] as const)
    for (const environment of ['gym', 'home', 'bodyweight'] as const)
      for (let days = 1; days <= 5; days++)
        for (const preferred of [false, true]) {
          const input = syntheticInput(),
            rule = syntheticRule(),
            base = program().days[0]!.exercises[0]!.exercise;
          const exercise: Exercise = {
            ...base,
            id: 'synthetic-a',
            equipment: environment === 'bodyweight' ? 'bodyweight' : 'barbell',
            basis: environment === 'bodyweight' ? 'bodyweight' : 'total',
          };
          const second = { ...exercise, id: 'synthetic-b' };
          input.objective = objective;
          input.environment = environment;
          input.mode = environment === 'bodyweight' ? 'bodyweight' : 'resistance';
          input.days = days;
          input.equipment = [{ category: exercise.equipment, basis: exercise.basis }];
          input.availableExerciseIds = [exercise.id, second.id];
          input.practicedIds = [exercise.id, second.id];
          input.preferredIds = preferred ? [second.id] : [];
          rule.objective = objective;
          rule.mode = input.mode;
          rule.allowedExerciseIds = input.availableExerciseIds;
          rule.templates = [
            {
              ...rule.templates[0]!,
              days: Array.from({ length: days }, (_, i) => ({
                ...rule.templates[0]!.days[0]!,
                name: `Giorno ${i + 1}`,
              })),
            },
          ];
          const context = { nextId: ids(input.seed), now };
          const result = generateProgram(input, [exercise, second], rule, context);
          expect(result.kind).toBe('proposal');
          if (result.kind === 'proposal') {
            expect(programSchema.safeParse(result.program).success).toBe(true);
            expect(result.program.goal).toBe(objective);
            expect(result.program.days).toHaveLength(days);
            expect(result.estimatedSeconds.max).toBeLessThanOrEqual(input.maximumMinutes * 60);
            expect(
              result.program.days.every((d) =>
                d.exercises.every((p) => p.targets.every((t) => t.loadGrams === null)),
              ),
            ).toBe(true);
            if (preferred)
              expect(result.program.days[0]!.exercises[0]!.exercise.id).toBe('synthetic-b');
          }
          expect(
            generateProgram(input, [second, exercise], rule, { nextId: ids(input.seed), now }),
          ).toEqual(result);
          cases++;
        }
  expect(cases).toBe(60);
});
it('una preferenza non supera esclusioni, attrezzi mancanti, identità duplicate o metodi non attivi', () => {
  const input = syntheticInput(),
    rule = syntheticRule(),
    exercise = program().days[0]!.exercises[0]!.exercise;
  input.excludedIds = [exercise.id];
  input.preferredIds = [exercise.id];
  expect(generateProgram(input, [exercise], rule, { nextId: randomUUID, now }).kind).toBe(
    'incompatible_constraints',
  );
  input.excludedIds = [];
  input.equipment = [{ category: 'bodyweight', basis: 'bodyweight' }];
  expect(generateProgram(input, [exercise], rule, { nextId: randomUUID, now }).kind).toBe(
    'incompatible_constraints',
  );
  expect(
    generateProgram(
      input,
      [exercise],
      { ...rule, status: 'draft', reviewer: null, reviewedAt: null },
      { nextId: randomUUID, now },
    ).kind,
  ).toBe('needs_review');
  expect(generateProgram(input, [exercise, exercise], rule, { nextId: randomUUID, now }).kind).toBe(
    'needs_review',
  );
});
it('distingue ricerca incompleta, vincoli incompatibili e annullamento · ALG-32', () => {
  const input = syntheticInput(),
    rule = syntheticRule(),
    exercise = program().days[0]!.exercises[0]!.exercise;
  expect(
    generateProgram(input, [exercise], rule, { nextId: randomUUID, now, maximumStates: 1 }).kind,
  ).toBe('search_incomplete');
  expect(
    generateProgram(input, [exercise], rule, { nextId: randomUUID, now, cancelled: () => true })
      .kind,
  ).toBe('search_incomplete');
  expect(
    generateProgram({ ...input, maximumMinutes: 5 }, [exercise], rule, { nextId: randomUUID, now })
      .kind,
  ).toBe('incompatible_constraints');
  expect(() =>
    generateProgram(input, [exercise], rule, { nextId: randomUUID, now, maximumStates: NaN }),
  ).toThrow();
});
function evidence() {
  const p = program();
  p.status = 'approved';
  const slot = p.days[0]!.exercises[0]!;
  p.days = [
    {
      ...p.days[0]!,
      exercises: [
        {
          ...slot,
          targets: slot.targets
            .filter((t) => t.kind === 'work')
            .map((t) => ({ ...t, repsMin: 8, repsMax: 12, rir: 2, loadGrams: 20000 })),
        },
      ],
    },
  ];
  p.weeks = [{ name: 'Base', phase: 'base', extraSets: 0, rir: null }];
  const day = resolveDay(p, p.days[0]!, 0);
  const sessionId = randomUUID();
  const session = {
    id: sessionId,
    programId: p.id,
    dayId: day.id,
    weekIndex: 0,
    snapshot: day,
    status: 'completed' as const,
    startedAt: now,
    endedAt: now,
    notes: '',
  };
  const rows: Entity[] = [
    { id: p.id, kind: 'program', revision: '2', data: p },
    { id: sessionId, kind: 'session', revision: '4', data: session },
    ...day.exercises[0]!.targets.map((t) => ({
      id: randomUUID(),
      kind: 'set' as const,
      revision: '1',
      data: {
        id: '',
        sessionId,
        prescriptionId: slot.id,
        targetId: t.id,
        side: 'bilateral' as const,
        loadGrams: 20000,
        reps: 12,
        rir: 2,
        status: 'completed' as const,
        recordedAt: now,
        notes: '',
      },
    })),
  ];
  for (const row of rows) if (row.kind === 'set') row.data.id = row.id;
  const equipment: EquipmentProfile = {
    id: randomUUID(),
    name: 'Test',
    place: 'gym',
    updatedAt: now,
    items: [
      {
        id: randomUUID(),
        category: slot.exercise.equipment,
        basis: slot.exercise.basis,
        availableLoadsGrams: [20000, 22000],
        machineId: null,
      },
    ],
  };
  return {
    experience: 'beginner' as const,
    adultNonclinicalConfirmed: true as const,
    programRecord: rows[0] as Extract<Entity, { kind: 'program' }>,
    prescriptionId: slot.id,
    equipment,
    comparableSessionIds: [sessionId],
    entities: rows,
    rule: syntheticRule(),
    nextId: randomUUID,
    now,
  };
}
it('crea una nuova bozza dai dati completi senza toccare l’approvato · ALG-01/02', () => {
  const input = evidence(),
    before = structuredClone(input.entities);
  const result = proposeProgression(input);
  expect(result.kind).toBe('proposal');
  if (result.kind === 'proposal') {
    expect(result.program.version).toBe('2');
    expect(result.program.status).toBe('draft');
    expect(result.program.days[0]!.exercises[0]!.targets.every((t) => t.loadGrams === 22000)).toBe(
      true,
    );
    expect(result.dependencies).toHaveLength(input.entities.length);
  }
  expect(input.entities).toEqual(before);
});
it('non nasconde serie mancanti, RIR zero, fallimenti o tagli inesistenti · ALG-02/03/05', () => {
  const input = evidence();
  expect(proposeProgression({ ...input, entities: input.entities.slice(0, -1) }).kind).toBe(
    'insufficient_data',
  );
  const log = input.entities.find((r) => r.kind === 'set')!;
  if (log.kind === 'set') log.data.rir = 0;
  expect(proposeProgression(input).kind).toBe('keep_current');
  if (log.kind === 'set') log.data.rir = 2;
  input.equipment.items[0]!.availableLoadsGrams = [20000, 40000];
  expect(proposeProgression(input).kind).toBe('needs_review');
});
it('canonicalizza l’ordine delle chiavi e rifiuta valori non JSON, conserva gli array', () => {
  expect(canonicalJson({ b: 1, a: [0, null] })).toBe('{"a":[0,null],"b":1}');
  expect(() => canonicalJson({ a: undefined })).toThrow();
  expect(() => canonicalJson(Infinity)).toThrow();
  expect(canonicalJson([2, 1])).toBe('[2,1]');
});

it('richiede perimetro esplicito e compatibilità del livello prima del ranking', () => {
  const input = syntheticInput(),
    rule = syntheticRule(),
    exercise = program().days[0]!.exercises[0]!.exercise;
  expect(
    generationInputSchema.safeParse({ ...input, adultNonclinicalConfirmed: false }).success,
  ).toBe(false);
  expect(generationInputSchema.safeParse({ ...input, experience: undefined }).success).toBe(false);
  rule.templates[0]!.supportedLevels = ['advanced'];
  expect(generateProgram(input, [exercise], rule, { nextId: randomUUID, now }).kind).toBe(
    'incompatible_constraints',
  );
  expect(
    generateProgram({ ...input, experience: 'advanced' }, [exercise], rule, {
      nextId: randomUUID,
      now,
    }).kind,
  ).toBe('proposal');
});
it('normalizza insiemi prima del fingerprint mantenendo i vincoli', () => {
  const input = syntheticInput();
  input.availableExerciseIds = ['b', 'a', 'b'];
  input.preferredIds = ['b', 'a'];
  input.equipment = [...input.equipment, ...input.equipment];
  const reversed = {
    ...input,
    availableExerciseIds: ['a', 'b'],
    preferredIds: ['a', 'b'],
    equipment: [input.equipment[0]!],
  };
  expect(normalizeGenerationInput(input)).toEqual(normalizeGenerationInput(reversed));
});
it('rifiuta surrogate Unicode isolate nel fingerprint', () => {
  expect(() => canonicalJson('\ud800')).toThrow();
});
