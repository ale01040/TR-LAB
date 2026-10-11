import { z } from 'zod';
z.config(z.locales.it());

export const revisionSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/)
  .refine((s) => BigInt(s) <= 9223372036854775807n);
const uuid = z.uuid();
const text = z.string().trim().min(1).max(200);
const quantity = z.number().int().min(0).max(1000000);
export const basisSchema = z.enum([
  'total',
  'per_dumbbell',
  'bodyweight',
  'added',
  'assistance',
  'machine',
]);
export const exerciseSchema = z
  .object({
    id: text,
    name: text,
    muscle: text,
    secondary: z.array(text).max(5),
    equipment: z.enum(['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight']),
    pattern: text,
    unilateral: z.boolean(),
    basis: basisSchema,
    instructions: z.string().max(3000),
  })
  .strict();
export type Exercise = z.infer<typeof exerciseSchema>;
export const targetSchema = z
  .object({
    id: uuid,
    repsMin: z.number().int().min(1).max(100),
    repsMax: z.number().int().min(1).max(100),
    rir: z.number().min(0).max(10),
    restSeconds: z.number().int().min(0).max(1800),
    loadGrams: quantity.nullable(),
    kind: z.enum(['work', 'warmup', 'extra']),
    side: z.enum(['both', 'left', 'right']).optional(),
  })
  .strict()
  .refine((s) => s.repsMax >= s.repsMin, {
    message: 'Il limite massimo deve essere almeno pari al minimo.',
  });
export const prescriptionSchema = z
  .object({
    id: uuid,
    exercise: exerciseSchema,
    targets: z.array(targetSchema).min(1).max(30),
    notes: z.string().max(3000),
    superset: z.string().max(30).nullable(),
    accumulation: z.boolean().optional(),
  })
  .strict();
export const daySchema = z
  .object({
    id: uuid,
    name: text,
    focus: z.string().max(200),
    exercises: z.array(prescriptionSchema).min(1).max(50),
  })
  .strict();
export const cycleWeekSchema = z
  .object({
    name: text,
    phase: z.enum(['test', 'base', 'accumulation', 'peak', 'deload']),
    extraSets: z.number().int().min(0).max(3),
    rir: z.number().min(0).max(10).nullable(),
  })
  .strict();
export const programSchema = z
  .object({
    id: uuid,
    rootId: uuid,
    name: text,
    goal: z.enum(['hypertrophy', 'strength', 'bodyweight']),
    version: revisionSchema,
    status: z.enum(['draft', 'approved']),
    days: z.array(daySchema).min(1).max(14),
    weeks: z.array(cycleWeekSchema).min(1).max(52),
    createdAt: z.iso.datetime(),
    source: z.string().max(300),
  })
  .strict()
  .superRefine((p, ctx) => {
    const ids = [
      p.id,
      ...p.days.flatMap((d) => [
        d.id,
        ...d.exercises.flatMap((e) => [e.id, ...e.targets.map((s) => s.id)]),
      ]),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Identificativi interni duplicati.' });
    for (const day of p.days)
      for (const e of day.exercises) {
        const work = e.targets.filter((t) => t.kind === 'work').length;
        if (!work)
          ctx.addIssue({
            code: 'custom',
            message: 'Ogni esercizio deve avere almeno una serie di lavoro.',
          });
        if (e.targets.some((t) => t.side && t.side !== 'both' && !e.exercise.unilateral))
          ctx.addIssue({
            code: 'custom',
            message: 'Le serie per un solo lato richiedono un esercizio unilaterale.',
          });
        if (
          p.weeks.some(
            (w) =>
              e.targets.length +
                (w.phase !== 'deload' && e.accumulation !== false ? w.extraSets : 0) >
              30,
          )
        )
          ctx.addIssue({
            code: 'custom',
            message: 'Il ciclo non può superare 30 serie per esercizio.',
          });
      }
  });
export type Program = z.infer<typeof programSchema>;
export type Day = Program['days'][number];
export type Prescription = Day['exercises'][number];
export type Target = Prescription['targets'][number];
export const sessionSchema = z
  .object({
    id: uuid,
    programId: uuid,
    dayId: uuid,
    weekIndex: z.number().int().min(0).max(51),
    snapshot: daySchema,
    status: z.enum(['active', 'completed']),
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime().nullable(),
    notes: z.string().max(3000),
  })
  .strict();
export type WorkoutSession = z.infer<typeof sessionSchema>;
export const setSchema = z
  .object({
    id: uuid,
    sessionId: uuid,
    prescriptionId: uuid,
    targetId: uuid,
    side: z.enum(['bilateral', 'left', 'right']),
    loadGrams: quantity.nullable(),
    reps: z.number().int().min(0).max(1000).nullable(),
    rir: z.number().min(0).max(10).nullable(),
    status: z.enum(['completed', 'skipped']),
    recordedAt: z.iso.datetime(),
    notes: z.string().max(1000),
  })
  .strict()
  .refine((s) => s.status !== 'completed' || (s.reps !== null && s.reps > 0), {
    message: 'Inserisci le ripetizioni eseguite.',
  });
export type SetLog = z.infer<typeof setSchema>;
export const measurementSchema = z
  .object({
    id: uuid,
    date: z.iso.date(),
    kind: z.enum(['weight', 'waist', 'chest', 'arm', 'thigh']),
    side: z.enum(['none', 'left', 'right']),
    value: z.number().int().min(1).max(500000),
    unit: z.enum(['g', 'mm']),
    notes: z.string().max(1000),
  })
  .strict()
  .refine((m) => (m.kind === 'weight') === (m.unit === 'g'), {
    message: 'Unità non compatibile con la misura.',
  });
export type Measurement = z.infer<typeof measurementSchema>;
export const nutritionSchema = z
  .object({
    id: uuid,
    calories: z.number().int().min(1).max(20000),
    protein: z.number().min(0).max(2000),
    fat: z.number().min(0).max(2000),
    carbs: z.number().min(0).max(2000),
    effectiveFrom: z.iso.date(),
    method: z.literal('manual'),
    confirmedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (n) =>
      Math.abs(n.calories - (n.protein * 4 + n.fat * 9 + n.carbs * 4)) <=
      Math.max(20, n.calories * 0.02),
    { message: 'Calorie e macronutrienti non sono coerenti (tolleranza 2%, minimo 20 kcal).' },
  );
export type NutritionTarget = z.infer<typeof nutritionSchema>;
export const recordSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        id: uuid,
        kind: z.literal('program'),
        revision: revisionSchema,
        data: programSchema,
      })
      .strict(),
    z
      .object({
        id: uuid,
        kind: z.literal('session'),
        revision: revisionSchema,
        data: sessionSchema,
      })
      .strict(),
    z
      .object({ id: uuid, kind: z.literal('set'), revision: revisionSchema, data: setSchema })
      .strict(),
    z
      .object({
        id: uuid,
        kind: z.literal('measurement'),
        revision: revisionSchema,
        data: measurementSchema,
      })
      .strict(),
    z
      .object({
        id: uuid,
        kind: z.literal('nutrition'),
        revision: revisionSchema,
        data: nutritionSchema,
      })
      .strict(),
  ])
  .refine((r) => r.id === r.data.id, { message: 'Identificativo del record incoerente.' });
export type Entity = z.infer<typeof recordSchema>;
export const baseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('server_revision'), revision: revisionSchema }).strict(),
  z.object({ kind: z.literal('operation_result'), operation_id: uuid, record_id: uuid }).strict(),
]);
export const commandSchema = z
  .object({
    protocol_version: z.literal(1),
    sync_epoch: uuid,
    operation_id: uuid,
    device_id: uuid,
    aggregate_id: uuid,
    base: baseSchema,
    depends_on: z.array(uuid).max(50),
    client_recorded_at: z.iso.datetime(),
    command: z.enum([
      'SaveProgramDraft',
      'ApproveProgram',
      'StartWorkout',
      'SaveSet',
      'FinishWorkout',
      'SaveMeasurement',
      'SaveNutritionTarget',
    ]),
    payload: z.unknown(),
  })
  .strict();
export type Command = z.infer<typeof commandSchema>;
export const receiptSchema = z
  .object({
    operation_id: uuid,
    status: z.enum(['applied', 'rejected']),
    code: z.string().max(100).nullable(),
    records: z.array(recordSchema).max(20),
  })
  .strict();
export type Receipt = z.infer<typeof receiptSchema>;
export const pullSchema = z
  .object({
    sync_epoch: uuid,
    next_cursor: z.string().min(1).max(2000),
    has_more: z.boolean(),
    events: z.array(z.object({ sequence: revisionSchema, record: recordSchema }).strict()).max(200),
  })
  .strict();
export type Pull = z.infer<typeof pullSchema>;
export const templateSchema = z
  .object({
    format: z.literal('workout-program'),
    schema_version: z.literal(1),
    kind: z.literal('program_template'),
    program: programSchema,
  })
  .strict();
export const credentialsSchema = z
  .object({ email: z.email().max(254), password: z.string().min(12).max(128) })
  .strict();

export function validatePayload(command: Command): void {
  const schemas = {
    SaveProgramDraft: programSchema.refine((p) => p.status === 'draft'),
    ApproveProgram: z.object({ id: uuid, confirmed: z.literal(true) }).strict(),
    StartWorkout: sessionSchema.refine((s) => s.status === 'active' && s.endedAt === null),
    SaveSet: setSchema,
    FinishWorkout: sessionSchema.refine((s) => s.status === 'completed' && s.endedAt !== null),
    SaveMeasurement: measurementSchema,
    SaveNutritionTarget: nutritionSchema,
  };
  const result = schemas[command.command].parse(command.payload);
  if (result.id !== command.aggregate_id) throw new Error('INVALID_PAYLOAD');
}
