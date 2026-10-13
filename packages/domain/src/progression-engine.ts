import {
  programSchema,
  ruleBundleSchema,
  type Entity,
  type EquipmentProfile,
  type Program,
  type RuleBundle,
  type GenerationInput,
} from '@tr-lab/contracts';
import { resolveDay, targetSides } from './index';
export type AdaptationResult =
  | {
      kind: 'proposal';
      program: Program;
      dependencies: { recordId: string; revision: string }[];
      reason: string;
    }
  | { kind: 'needs_review' | 'insufficient_data' | 'keep_current'; reason: string };
export function proposeProgression(input: {
  experience: GenerationInput['experience'];
  adultNonclinicalConfirmed: true;
  programRecord: Extract<Entity, { kind: 'program' }>;
  prescriptionId: string;
  equipment: EquipmentProfile;
  comparableSessionIds: readonly string[];
  entities: readonly Entity[];
  rule: RuleBundle;
  nextId: () => string;
  now: string;
}): AdaptationResult {
  const rule = ruleBundleSchema.parse(input.rule);
  if (
    input.adultNonclinicalConfirmed !== true ||
    !rule.templates.some((t) => t.supportedLevels.includes(input.experience))
  )
    return {
      kind: 'needs_review',
      reason: 'Conferma il perimetro adulto/non clinico e un livello compatibile con il metodo.',
    };
  if (rule.status !== 'active' || !rule.progression)
    return { kind: 'needs_review', reason: 'Metodo di progressione non attivo o non revisionato.' };
  const program = input.programRecord.data;
  if (program.status !== 'approved' || program.goal !== rule.objective)
    return {
      kind: 'needs_review',
      reason: 'Serve una versione approvata compatibile con il metodo.',
    };
  const day = program.days.find((d) => d.exercises.some((p) => p.id === input.prescriptionId)),
    prescription = day?.exercises.find((p) => p.id === input.prescriptionId);
  if (!day || !prescription || !rule.allowedExerciseIds.includes(prescription.exercise.id))
    return { kind: 'needs_review', reason: 'Variante non revisionata per questo metodo.' };
  if (['machine', 'cable'].includes(prescription.exercise.equipment))
    return {
      kind: 'needs_review',
      reason:
        'Serve l’identità della macchina nello storico prima di confrontare queste esposizioni.',
    };
  const sources = input.entities
    .filter(
      (r): r is Extract<Entity, { kind: 'session' }> =>
        r.kind === 'session' &&
        r.data.status === 'completed' &&
        r.data.programId === program.id &&
        r.data.dayId === day.id &&
        input.comparableSessionIds.includes(r.id),
    )
    .sort((a, b) => b.data.startedAt.localeCompare(a.data.startedAt) || a.id.localeCompare(b.id))
    .slice(0, rule.progression.requiredExposures);
  if (sources.length < rule.progression.requiredExposures)
    return {
      kind: 'insufficient_data',
      reason: 'Servono ulteriori esposizioni complete dichiarate confrontabili.',
    };
  const dependencies = [
    { recordId: input.programRecord.id, revision: input.programRecord.revision },
  ];
  let currentLoad: number | null = null;
  let targetReps: number[] = [];
  for (const source of sources) {
    const week = program.weeks[source.data.weekIndex];
    if (!week || week.phase === 'deload')
      return { kind: 'needs_review', reason: 'Una fase di scarico non dimostra la progressione.' };
    if (week.phase !== program.weeks[sources[0]!.data.weekIndex]?.phase)
      return {
        kind: 'needs_review',
        reason: 'Le esposizioni appartengono a fasi diverse del ciclo.',
      };
    const resolved = resolveDay(program, day, source.data.weekIndex),
      slot = resolved.exercises.find((p) => p.id === prescription.id),
      snapshot = source.data.snapshot.exercises.find((p) => p.id === prescription.id);
    if (!slot || !snapshot || JSON.stringify(slot) !== JSON.stringify(snapshot))
      return {
        kind: 'needs_review',
        reason: 'Prescrizione effettiva o variante non confrontabile.',
      };
    dependencies.push({ recordId: source.id, revision: source.revision });
    const required = slot.targets.filter((t) => t.kind === 'work');
    targetReps = required.map((t) => t.repsMin);
    for (const target of required)
      for (const side of targetSides(slot, target)) {
        const logs = input.entities.filter(
          (r): r is Extract<Entity, { kind: 'set' }> =>
            r.kind === 'set' &&
            r.data.sessionId === source.id &&
            r.data.prescriptionId === slot.id &&
            r.data.targetId === target.id &&
            r.data.side === side,
        );
        const log = logs[0];
        if (
          logs.length !== 1 ||
          !log ||
          log.data.status !== 'completed' ||
          log.data.reps === null ||
          log.data.rir === null
        )
          return {
            kind: 'insufficient_data',
            reason: 'Non escludere serie mancanti, saltate o senza RIR dal confronto.',
          };
        dependencies.push({ recordId: log.id, revision: log.revision });
        if (
          log.data.reps <
            (rule.progression.strategy === 'reps_sequence' ? target.repsMin : target.repsMax) ||
          log.data.rir < target.rir
        )
          return {
            kind: 'keep_current',
            reason: 'Non tutte le serie e i lati soddisfano ripetizioni e RIR richiesti.',
          };
        if (prescription.exercise.basis !== 'bodyweight') {
          if (log.data.loadGrams === null)
            return { kind: 'insufficient_data', reason: 'Carico osservato mancante.' };
          if (currentLoad !== null && currentLoad !== log.data.loadGrams)
            return { kind: 'needs_review', reason: 'Le esposizioni hanno carichi diversi.' };
          currentLoad = log.data.loadGrams;
        }
      }
  }
  if (dependencies.length > 100)
    return {
      kind: 'needs_review',
      reason: 'Troppi dati per una singola proposta; serve un riepilogo versionato delle evidenze.',
    };
  const available = [
    ...new Set(
      input.equipment.items
        .filter(
          (i) =>
            i.category === prescription.exercise.equipment &&
            i.basis === prescription.exercise.basis,
        )
        .flatMap((i) => i.availableLoadsGrams),
    ),
  ].sort((a, b) => a - b);
  const baseTargets = prescription.targets.filter((t) => t.kind === 'work');
  if (targetReps.length !== baseTargets.length)
    return {
      kind: 'needs_review',
      reason: 'L’accumulo del ciclo richiede una regola distinta; non sommare due aumenti.',
    };
  let nextLoad = currentLoad;
  let reason: string;
  let repChange = -1;
  if (
    rule.progression.strategy === 'reps_sequence' &&
    baseTargets.some((t, i) => targetReps[i]! < t.repsMax)
  ) {
    repChange = baseTargets.findIndex((t, i) => targetReps[i]! < t.repsMax);
    reason =
      'Passo di ripetizioni sulla prima serie ancora entro il range, dopo tutte le evidenze richieste.';
  } else {
    if (prescription.exercise.basis === 'bodyweight' || currentLoad === null)
      return {
        kind: 'needs_review',
        reason:
          'Il cambio variante del corpo libero richiede prerequisiti e una nuova comparabilità.',
      };
    if (
      (prescription.exercise.basis === 'assistance') !==
      (rule.progression.strategy === 'assistance')
    )
      return {
        kind: 'needs_review',
        reason: 'Assistenza e peso sollevato hanno direzioni diverse.',
      };
    nextLoad =
      rule.progression.strategy === 'assistance'
        ? ([...available].reverse().find((g) => g < currentLoad!) ?? null)
        : (available.find((g) => g > currentLoad!) ?? null);
    if (
      nextLoad === null ||
      currentLoad === 0 ||
      Math.abs(nextLoad - currentLoad) / currentLoad > rule.progression.maxRelativeJump
    )
      return {
        kind: 'needs_review',
        reason: 'Manca un taglio realmente disponibile entro il salto massimo del metodo.',
      };
    reason =
      rule.progression.strategy === 'assistance'
        ? 'Riduzione dell’assistenza disponibile, dopo tutte le evidenze richieste.'
        : 'Prossimo taglio disponibile, dopo tutte le serie e i lati richiesti.';
  }
  const reset = rule.progression.resetRepsMin;
  if (repChange < 0 && baseTargets.some((t) => reset > t.repsMax))
    return { kind: 'needs_review', reason: 'Reset delle ripetizioni incompatibile con il range.' };
  const id = input.nextId();
  let workIndex = 0;
  const after = programSchema.parse({
    ...program,
    id,
    version: String(BigInt(program.version) + 1n),
    status: 'draft',
    createdAt: input.now,
    source: `Proposta ${rule.id} ${rule.version}`,
    days: program.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((p) =>
        p.id !== prescription.id
          ? p
          : {
              ...p,
              targets: p.targets.map((t) => {
                if (t.kind !== 'work') return t;
                const index = workIndex++;
                return {
                  ...t,
                  loadGrams: nextLoad,
                  repsMin: repChange === index ? t.repsMin + 1 : repChange < 0 ? reset : t.repsMin,
                };
              }),
            },
      ),
    })),
  });
  return { kind: 'proposal', program: after, dependencies, reason };
}
