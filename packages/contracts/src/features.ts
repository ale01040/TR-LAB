import { z } from 'zod';
import {
  exerciseSchema,
  programSchema,
  recordSchema as coreRecord,
  commandSchema as coreCommand,
  validatePayload as validateCore,
  revisionSchema,
  sessionSchema,
  type Command as CoreCommand,
} from './core';
import { proposalSchema, decisionSchema, proposalDecisionPayload } from './engine';
import { importReportSchema, recoveredWorkoutSchema } from './import-recovery';
export const privateExerciseSchema = z
  .object({
    id: z.uuid(),
    exercise: exerciseSchema,
    semanticVersion: revisionSchema,
    status: z.enum(['active', 'archived']),
    createdAt: z.iso.datetime(),
  })
  .strict()
  .refine((p) => p.exercise.id === `private:${p.id}` && BigInt(p.semanticVersion) > 0n, {
    message: 'Identità della variante privata non valida.',
  });
export type PrivateExercise = z.infer<typeof privateExerciseSchema>;
export const equipmentProfileSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(200),
    place: z.enum(['gym', 'home', 'bodyweight']),
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            category: exerciseSchema.shape.equipment,
            basis: exerciseSchema.shape.basis,
            availableLoadsGrams: z.array(z.number().int().min(0).max(1000000)).max(300),
            machineId: z.string().max(200).nullable(),
          })
          .strict(),
      )
      .max(100),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((p, c) => {
    if (new Set(p.items.map((i) => i.id)).size !== p.items.length)
      c.addIssue({ code: 'custom', message: 'Item duplicati.' });
    for (const item of p.items)
      if (item.availableLoadsGrams.some((n, i, a) => i > 0 && n <= a[i - 1]!))
        c.addIssue({ code: 'custom', message: 'Carichi in ordine crescente, senza duplicati.' });
  });
export type EquipmentProfile = z.infer<typeof equipmentProfileSchema>;
const timeZone = z
  .string()
  .min(1)
  .max(100)
  .refine(
    (s) => {
      try {
        new Intl.DateTimeFormat('it-IT', { timeZone: s });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Fuso IANA non valido.' },
  );
export const cycleSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(200),
    programId: z.uuid(),
    startDate: z.iso.date(),
    timeZone,
    status: z.enum(['active', 'archived']),
  })
  .strict();
export type TrainingCycle = z.infer<typeof cycleSchema>;
export const scheduledSessionSchema = z
  .object({
    id: z.uuid(),
    cycleId: z.uuid(),
    programId: z.uuid(),
    dayId: z.uuid(),
    weekIndex: z.number().int().min(0).max(51),
    date: z.iso.date(),
    timeZone,
    status: z.enum(['planned', 'cancelled', 'skipped', 'active', 'completed']),
    sessionId: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
  })
  .strict()
  .refine((s) => ['active', 'completed'].includes(s.status) === (s.sessionId !== null), {
    message: 'Collegamento alla seduta incoerente.',
  });
export type ScheduledSession = z.infer<typeof scheduledSessionSchema>;
const extraRecord = z
  .discriminatedUnion('kind', [
    z
      .object({
        id: z.uuid(),
        kind: z.literal('private_exercise'),
        revision: revisionSchema,
        data: privateExerciseSchema,
      })
      .strict(),
    z
      .object({
        id: z.uuid(),
        kind: z.literal('equipment_profile'),
        revision: revisionSchema,
        data: equipmentProfileSchema,
      })
      .strict(),
    z
      .object({
        id: z.uuid(),
        kind: z.literal('cycle'),
        revision: revisionSchema,
        data: cycleSchema,
      })
      .strict(),
    z
      .object({
        id: z.uuid(),
        kind: z.literal('scheduled_session'),
        revision: revisionSchema,
        data: scheduledSessionSchema,
      })
      .strict(),
    z
      .object({
        id: z.uuid(),
        kind: z.literal('proposal'),
        revision: revisionSchema,
        data: proposalSchema,
      })
      .strict(),
    z
      .object({
        id: z.uuid(),
        kind: z.literal('proposal_decision'),
        revision: revisionSchema,
        data: decisionSchema,
      })
      .strict(),
    z
      .object({
        id: z.uuid(),
        kind: z.literal('import_report'),
        revision: revisionSchema,
        data: importReportSchema,
      })
      .strict(),
    z
      .object({
        id: z.uuid(),
        kind: z.literal('recovered_workout'),
        revision: revisionSchema,
        data: recoveredWorkoutSchema,
      })
      .strict(),
  ])
  .refine((r) => r.id === r.data.id);
export const recordSchema = z.union([coreRecord, extraRecord]);
export type Entity = z.infer<typeof recordSchema>;
export const featureCommandSchema = coreCommand.extend({
  protocol_version: z.literal(2),
  command: z.enum([
    'SavePrivateExercise',
    'ArchivePrivateExercise',
    'SaveEquipmentProfile',
    'SaveCycle',
    'PlanCycle',
    'SaveScheduledSession',
    'CancelScheduledSession',
    'StartScheduledWorkout',
    'DecideProposal',
    'ImportProgramDraft',
    'ReconcileExecutedWorkout',
  ]),
});
export const commandSchema = z.union([coreCommand, featureCommandSchema]);
export type Command = z.infer<typeof commandSchema>;
export const startScheduledSchema = z.object({ id: z.uuid(), session: sessionSchema }).strict();
export const planCycleSchema = z
  .object({
    id: z.uuid(),
    cycle: cycleSchema,
    occurrences: z.array(scheduledSessionSchema).min(1).max(100),
  })
  .strict()
  .superRefine((p, c) => {
    if (
      p.id !== p.cycle.id ||
      p.cycle.status !== 'active' ||
      new Set(p.occurrences.map((o) => o.id)).size !== p.occurrences.length ||
      p.occurrences.some(
        (o) =>
          o.id === p.id ||
          o.cycleId !== p.id ||
          o.programId !== p.cycle.programId ||
          o.timeZone !== p.cycle.timeZone ||
          o.status !== 'planned',
      )
    )
      c.addIssue({ code: 'custom', message: 'Calendario del ciclo incoerente.' });
  });
export const importDraftSchema = z
  .object({
    id: z.uuid(),
    program: programSchema,
    report: importReportSchema,
    variants: z.array(privateExerciseSchema).max(50),
  })
  .strict()
  .superRefine((p, c) => {
    if (
      p.id !== p.program.id ||
      p.program.status !== 'draft' ||
      p.program.rootId !== p.id ||
      p.program.version !== '1' ||
      p.report.programId !== p.id ||
      p.report.id === p.id ||
      p.report.issues.some((i) => i.severity !== 'info') ||
      new Set([p.id, p.report.id, ...p.variants.map((v) => v.id)]).size !== 2 + p.variants.length ||
      p.variants.some(
        (v) =>
          v.status !== 'active' ||
          v.semanticVersion !== '1' ||
          !p.program.days.some((d) => d.exercises.some((e) => e.exercise.id === v.exercise.id)),
      )
    )
      c.addIssue({
        code: 'custom',
        message: 'Import della bozza e delle dipendenze incoerente o irrisolto.',
      });
  });
export function validatePayload(command: Command): void {
  if (command.protocol_version === 1) {
    validateCore(command as CoreCommand);
    return;
  }
  const schemas = {
    SavePrivateExercise: privateExerciseSchema,
    ArchivePrivateExercise: privateExerciseSchema,
    SaveEquipmentProfile: equipmentProfileSchema,
    SaveCycle: cycleSchema,
    PlanCycle: planCycleSchema,
    SaveScheduledSession: scheduledSessionSchema,
    CancelScheduledSession: scheduledSessionSchema,
    StartScheduledWorkout: startScheduledSchema,
    DecideProposal: proposalDecisionPayload,
    ImportProgramDraft: importDraftSchema,
    ReconcileExecutedWorkout: recoveredWorkoutSchema,
  };
  const value = schemas[command.command].parse(command.payload);
  if (value.id !== command.aggregate_id) throw new Error('INVALID_PAYLOAD');
}
export const receiptSchema = z
  .object({
    operation_id: z.uuid(),
    status: z.enum(['applied', 'rejected']),
    code: z.string().max(100).nullable(),
    records: z.array(recordSchema).max(200),
  })
  .strict();
export type Receipt = z.infer<typeof receiptSchema>;
export const pullSchema = z
  .object({
    sync_epoch: z.uuid(),
    next_cursor: z.string().min(1).max(2000),
    has_more: z.boolean(),
    events: z.array(z.object({ sequence: revisionSchema, record: recordSchema }).strict()).max(200),
  })
  .strict();
export type Pull = z.infer<typeof pullSchema>;
