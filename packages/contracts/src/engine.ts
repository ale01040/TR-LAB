import { z } from 'zod';
import { exerciseSchema, programSchema, revisionSchema } from './core';
export const sourceReferenceSchema = z
  .object({
    id: z.string().min(1).max(100),
    url: z.url().refine((url) => url.startsWith('https://'), {
      message: 'Le fonti consultabili devono usare HTTPS.',
    }),
    section: z.string().min(1).max(500),
  })
  .strict();
const doseSchema = z
  .object({
    sets: z.number().int().min(1).max(10),
    repsMin: z.number().int().min(1).max(100),
    repsMax: z.number().int().min(1).max(100),
    rir: z.number().min(0).max(10),
    restSeconds: z.number().int().min(0).max(1800),
  })
  .strict()
  .refine((d) => d.repsMin <= d.repsMax);
export const ruleBundleSchema = z
  .object({
    population: z.literal('adults_nonclinical'),
    id: z.string().min(1).max(100),
    version: z.string().min(1).max(100),
    status: z.enum(['draft', 'reviewed', 'active', 'retired']),
    reviewer: z.string().min(1).max(200).nullable(),
    reviewedAt: z.iso.datetime().nullable(),
    sources: z.array(sourceReferenceSchema).min(1).max(30),
    catalogVersion: z.string().min(1).max(100),
    allowedExerciseIds: z.array(z.string().min(1).max(200)).min(1).max(500),
    objective: z.enum(['hypertrophy', 'strength']),
    mode: z.enum(['resistance', 'bodyweight', 'mixed']),
    templates: z
      .array(
        z
          .object({
            supportedLevels: z
              .array(z.enum(['beginner', 'intermediate', 'advanced']))
              .min(1)
              .max(3),
            id: z.string().min(1).max(100),
            days: z
              .array(
                z
                  .object({
                    name: z.string().min(1).max(200),
                    slots: z
                      .array(
                        z
                          .object({
                            patterns: z.array(z.string().min(1).max(200)).min(1).max(20),
                            dose: doseSchema,
                          })
                          .strict(),
                      )
                      .min(1)
                      .max(20),
                  })
                  .strict(),
              )
              .min(1)
              .max(7),
            weeks: programSchema.shape.weeks,
          })
          .strict(),
      )
      .max(20),
    timeAssumptions: z
      .object({
        repSecondsMin: z.number().min(1).max(30),
        repSecondsMax: z.number().min(1).max(30),
        warmupSeconds: z.number().int().min(0).max(1800),
        transitionSeconds: z.number().int().min(0).max(600),
      })
      .strict()
      .refine((a) => a.repSecondsMax >= a.repSecondsMin),
    progression: z
      .object({
        strategy: z.enum(['double_load', 'reps_sequence', 'assistance']),
        requiredExposures: z.number().int().min(1).max(10),
        resetRepsMin: z.number().int().min(1).max(100),
        maxRelativeJump: z.number().min(0.001).max(1),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .refine(
    (r) =>
      !['reviewed', 'active'].includes(r.status) || (r.reviewer !== null && r.reviewedAt !== null),
    { message: 'Revisione del metodo mancante.' },
  );
export type RuleBundle = z.infer<typeof ruleBundleSchema>;
export const generationInputSchema = z
  .object({
    experience: z.enum(['beginner', 'intermediate', 'advanced']),
    adultNonclinicalConfirmed: z.literal(true),
    objective: z.enum(['hypertrophy', 'strength']),
    mode: z.enum(['resistance', 'bodyweight', 'mixed']),
    environment: z.enum(['gym', 'home', 'bodyweight']),
    days: z.number().int().min(1).max(7),
    equipment: z
      .array(
        z
          .object({ category: exerciseSchema.shape.equipment, basis: exerciseSchema.shape.basis })
          .strict(),
      )
      .min(1)
      .max(100),
    availableExerciseIds: z.array(z.string().min(1).max(200)).min(1).max(500),
    excludedIds: z.array(z.string().max(200)).max(500),
    preferredIds: z.array(z.string().max(200)).max(500),
    practicedIds: z.array(z.string().max(200)).max(500),
    requirePracticed: z.boolean(),
    maximumMinutes: z.number().int().min(5).max(240),
    seed: z.uuid(),
  })
  .strict()
  .refine((i) => i.environment !== 'bodyweight' || i.mode === 'bodyweight', {
    message: 'Per ambiente corpo libero scegli la modalità corpo libero.',
  });
export type GenerationInput = z.infer<typeof generationInputSchema>;
export const progressionRequestSchema = z
  .object({
    programId: z.uuid(),
    prescriptionId: z.uuid(),
    equipmentId: z.uuid(),
    comparableSessionIds: z
      .array(z.uuid())
      .min(1)
      .max(20)
      .refine((ids) => new Set(ids).size === ids.length),
    ruleBundleId: z.string().min(1).max(100),
    seed: z.uuid(),
    experience: z.enum(['beginner', 'intermediate', 'advanced']),
    adultNonclinicalConfirmed: z.literal(true),
  })
  .strict();
export const proposalSchema = z
  .object({
    id: z.uuid(),
    syncEpoch: z.uuid(),
    type: z.enum(['generate_program', 'adapt_program']),
    status: z.enum(['pending', 'accepted', 'rejected', 'stale', 'withdrawn']),
    before: z
      .object({ programId: z.uuid(), revision: revisionSchema, version: revisionSchema })
      .strict()
      .nullable(),
    afterProgram: programSchema.refine((p) => p.status === 'draft'),
    effectiveFrom: z.literal('next_matching_session'),
    ruleBundleId: z.string().min(1).max(100),
    ruleVersion: z.string().min(1).max(100),
    engineVersion: z.string().min(1).max(100),
    inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
    dependencies: z
      .array(z.object({ recordId: z.uuid(), revision: revisionSchema }).strict())
      .max(100),
    reasoning: z
      .array(
        z
          .object({
            code: z.string().min(1).max(100),
            message: z.string().min(1).max(2000),
            sourceIds: z.array(z.string().min(1).max(100)).max(30),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    generatedAt: z.iso.datetime(),
    decidedAt: z.iso.datetime().nullable(),
    resultProgramId: z.uuid().nullable(),
  })
  .strict()
  .superRefine((p, c) => {
    if ((p.type === 'adapt_program') !== (p.before !== null))
      c.addIssue({ code: 'custom', message: 'Base della proposta non coerente.' });
    if (new Set(p.dependencies.map((d) => d.recordId)).size !== p.dependencies.length)
      c.addIssue({ code: 'custom', message: 'Dipendenze duplicate.' });
    if (
      ['pending', 'stale', 'withdrawn'].includes(p.status)
        ? p.decidedAt !== null || p.resultProgramId !== null
        : p.decidedAt === null || (p.status === 'accepted') !== (p.resultProgramId !== null)
    )
      c.addIssue({ code: 'custom', message: 'Decisione incoerente.' });
  });
export type Proposal = z.infer<typeof proposalSchema>;
export const decisionSchema = z
  .object({
    id: z.uuid(),
    proposalId: z.uuid(),
    proposalRevision: revisionSchema,
    choice: z.enum(['accept', 'reject']),
    operationId: z.uuid(),
    programId: z.uuid().nullable(),
    decidedAt: z.iso.datetime(),
    origin: z.literal('online'),
  })
  .strict()
  .refine((d) => (d.choice === 'accept') === (d.programId !== null));
export const proposalDecisionPayload = z
  .object({
    id: z.uuid(),
    decisionId: z.uuid(),
    choice: z.enum(['accept', 'reject']),
    proposalRevision: revisionSchema,
    contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
    challenge: z.string().min(32).max(200),
  })
  .strict();
export const proposalReviewSchema = z
  .object({
    proposal: proposalSchema,
    revision: revisionSchema,
    challenge: z.string().min(32).max(200),
    expiresAt: z.iso.datetime(),
    applicable: z.boolean(),
  })
  .strict();
