import { z } from 'zod';
import { programSchema, sessionSchema, setSchema } from './core';
export const importReportSchema = z
  .object({
    id: z.uuid(),
    programId: z.uuid(),
    fileName: z.string().min(1).max(300),
    fileDigest: z.string().regex(/^[a-f0-9]{64}$/),
    digestAlgorithm: z.literal('sha256'),
    parserVersion: z.string().min(1).max(100),
    profile: z.string().min(1).max(100),
    choices: z
      .object({
        rir: z.enum(['lower', 'upper']).optional(),
        exercises: z.record(z.string().max(300), z.string().min(1).max(200)),
        phases: z.record(z.string().max(300), programSchema.shape.weeks.element.shape.phase),
      })
      .strict(),
    issues: z
      .array(
        z
          .object({
            severity: z.enum(['info', 'choice', 'error']),
            code: z.string().min(1).max(100),
            sheet: z.string().max(100),
            cell: z.string().max(300).nullable(),
            message: z.string().max(2000),
          })
          .strict(),
      )
      .max(1000),
    editedInEditor: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .strict();
export type ImportReport = z.infer<typeof importReportSchema>;
export const recoveredWorkoutSchema = z
  .object({
    id: z.uuid(),
    sourceEpoch: z.uuid().nullable(),
    sourceDeviceId: z.uuid().nullable(),
    sourceArchiveDigest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    sourceSessionId: z.uuid(),
    sourceProgramId: z.uuid(),
    approvalAtExecution: z.enum(['approved', 'provisional', 'unknown']),
    session: sessionSchema,
    sets: z.array(setSchema).max(1000),
    recoveredAt: z.iso.datetime(),
    provenance: z.literal('explicit_local_recovery'),
  })
  .strict()
  .superRefine((r, c) => {
    if (!r.sourceEpoch && !r.sourceDeviceId && !r.sourceArchiveDigest)
      c.addIssue({ code: 'custom', message: 'Provenienza dello storico mancante.' });
    if (r.session.id !== r.sourceSessionId || r.session.programId !== r.sourceProgramId)
      c.addIssue({ code: 'custom', message: 'Riferimenti allo storico incoerenti.' });
    const internalIds = [
      r.sourceProgramId,
      r.session.snapshot.id,
      ...r.session.snapshot.exercises.flatMap((p) => [p.id, ...p.targets.map((t) => t.id)]),
    ];
    if (
      r.session.dayId !== r.session.snapshot.id ||
      new Set(internalIds).size !== internalIds.length
    )
      c.addIssue({ code: 'custom', message: 'Identità dello snapshot storico incoerenti.' });
    if (r.session.status !== 'completed' || r.session.endedAt === null)
      c.addIssue({
        code: 'custom',
        message: 'Concludi la seduta locale prima di riconciliarne l’esecuzione.',
      });
    const identifiers = new Set<string>(),
      positions = new Set<string>();
    for (const log of r.sets) {
      const prescription = r.session.snapshot.exercises.find((p) => p.id === log.prescriptionId),
        target = prescription?.targets.find((t) => t.id === log.targetId);
      const key = `${log.prescriptionId}:${log.targetId}:${log.side}`;
      if (
        log.sessionId !== r.sourceSessionId ||
        !prescription ||
        !target ||
        identifiers.has(log.id) ||
        positions.has(key) ||
        (target.side && target.side !== 'both'
          ? log.side !== target.side
          : prescription.exercise.unilateral
            ? log.side === 'bilateral'
            : log.side !== 'bilateral')
      )
        c.addIssue({
          code: 'custom',
          message: 'Risultati duplicati o non collegati allo snapshot effettivo.',
        });
      identifiers.add(log.id);
      positions.add(key);
    }
  });
export type RecoveredWorkout = z.infer<typeof recoveredWorkoutSchema>;
