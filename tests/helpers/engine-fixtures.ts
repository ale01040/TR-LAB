// Parametri esclusivamente sintetici per prove software: non sono bundle di allenamento pubblicati.
import { randomUUID } from 'node:crypto';
import { type RuleBundle, type GenerationInput, type Proposal } from '@tr-lab/contracts';
import { proposalDigest } from '../../apps/server/src/engine';
import { program, now } from './fixtures';
export function syntheticRule(): RuleBundle {
  const p = program();
  return {
    population: 'adults_nonclinical',
    id: 'software-fixture',
    version: 'test-1',
    status: 'active',
    reviewer: 'Revisore sintetico, nessuna prescrizione',
    reviewedAt: now,
    sources: [{ id: 'TEST', url: 'https://example.invalid/software-test', section: 'Fixture' }],
    catalogVersion: 'xls-initial-1',
    allowedExerciseIds: [p.days[0]!.exercises[0]!.exercise.id],
    objective: 'hypertrophy',
    mode: 'resistance',
    templates: [
      {
        supportedLevels: ['beginner', 'intermediate', 'advanced'],
        id: 'one-day',
        days: [
          {
            name: 'A',
            slots: [
              {
                patterns: [p.days[0]!.exercises[0]!.exercise.pattern],
                dose: { sets: 3, repsMin: 8, repsMax: 12, rir: 2, restSeconds: 90 },
              },
            ],
          },
        ],
        weeks: [{ name: 'Base', phase: 'base', extraSets: 0, rir: null }],
      },
    ],
    timeAssumptions: {
      repSecondsMin: 2,
      repSecondsMax: 4,
      warmupSeconds: 300,
      transitionSeconds: 60,
    },
    progression: {
      strategy: 'double_load',
      requiredExposures: 1,
      resetRepsMin: 8,
      maxRelativeJump: 0.2,
    },
  };
}
export function syntheticInput(): GenerationInput {
  const e = program().days[0]!.exercises[0]!.exercise;
  return {
    experience: 'beginner',
    adultNonclinicalConfirmed: true,
    objective: 'hypertrophy',
    mode: 'resistance',
    environment: 'gym',
    days: 1,
    equipment: [{ category: e.equipment, basis: e.basis }],
    availableExerciseIds: [e.id],
    excludedIds: [],
    preferredIds: [],
    practicedIds: [e.id],
    requirePracticed: true,
    maximumMinutes: 60,
    seed: randomUUID(),
  };
}
export function syntheticProposal(epoch: string): Proposal {
  const value = {
    id: randomUUID(),
    syncEpoch: epoch,
    type: 'generate_program' as const,
    status: 'pending' as const,
    before: null,
    afterProgram: program(),
    effectiveFrom: 'next_matching_session' as const,
    ruleBundleId: 'software-fixture',
    ruleVersion: 'test-1',
    engineVersion: 'software-test-1',
    inputFingerprint: proposalDigest(randomUUID()),
    dependencies: [],
    reasoning: [
      { code: 'TEST', message: 'Proposta esclusivamente sintetica.', sourceIds: ['TEST'] },
    ],
    generatedAt: now,
    decidedAt: null,
    resultProgramId: null,
  };
  return { ...value, contentDigest: proposalDigest(value) };
}
