import type { Program, Day, Prescription, SetLog, Exercise } from '@tr-lab/contracts';
export { assertLocalChange } from './local-change';
export { copyDay, moveItem } from './program-editing';

export function parseDecimal(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}
export function resolveDay(program: Program, day: Day, weekIndex: number): Day {
  const week = program.weeks[weekIndex];
  if (!week) throw new Error('Settimana non presente nel ciclo.');
  const used = new Set([
    program.id,
    program.rootId,
    ...program.days.flatMap((d) => [
      d.id,
      ...d.exercises.flatMap((p) => [p.id, ...p.targets.map((t) => t.id)]),
    ]),
  ]);
  return {
    ...day,
    exercises: day.exercises.map((exercise) => {
      const work = exercise.targets.filter((t) => t.kind === 'work');
      const count =
        week.phase === 'deload'
          ? Math.max(1, Math.ceil(work.length / 2))
          : work.length + (exercise.accumulation === false ? 0 : week.extraSets);
      // IDs aggiuntivi derivati dalla prescrizione: stabili tra riaperture della stessa seduta.
      const targets = Array.from({ length: count }, (_, i) => {
        const target = work[Math.min(i, work.length - 1)];
        if (!target) throw new Error('Manca una serie di lavoro.');
        return {
          ...target,
          id: i < work.length ? target.id : extraTargetId(exercise.id, used),
          rir: week.rir ?? target.rir,
        };
      });
      return {
        ...exercise,
        targets: [
          ...exercise.targets.filter((t) => t.kind === 'warmup'),
          ...targets,
          ...exercise.targets.filter((t) => t.kind === 'extra'),
        ],
      };
    }),
  };
}
function extraTargetId(id: string, used: Set<string>): string {
  // Allocazione deterministica nello spazio UUIDv8, con controllo delle collisioni.
  // Non è un hash di sicurezza; SQL replica esattamente questa assegnazione.
  const prefix = id.slice(0, 14) + '8' + id.slice(15, 24);
  let counter = BigInt('0x' + id.slice(24));
  let candidate: string;
  do {
    counter = (counter + 1n) % (1n << 48n);
    candidate = prefix + counter.toString(16).padStart(12, '0');
  } while (used.has(candidate));
  used.add(candidate);
  return candidate;
}
export function targetSides(p: Prescription, t: Prescription['targets'][number]): SetLog['side'][] {
  return t.side === 'left' || t.side === 'right'
    ? [t.side]
    : p.exercise.unilateral
      ? ['left', 'right']
      : ['bilateral'];
}
export function countRequired(day: Day): number {
  return day.exercises.reduce(
    (total, e) => total + e.targets.reduce((n, t) => n + targetSides(e, t).length, 0),
    0,
  );
}
export function workoutVolume(
  logs: readonly SetLog[],
  day: Day,
): Record<string, { left: number; right: number }> {
  const result: Record<string, { left: number; right: number }> = {};
  for (const log of logs) {
    const p = day.exercises.find((e) => e.id === log.prescriptionId);
    const target = p?.targets.find((t) => t.id === log.targetId);
    if (!p || !target || log.status !== 'completed' || target.kind === 'warmup') continue;
    const totals = result[p.exercise.muscle] ?? { left: 0, right: 0 };
    if (log.side !== 'right') totals.left++;
    if (log.side !== 'left') totals.right++;
    result[p.exercise.muscle] = totals;
  }
  return result;
}
export type ProgressionResult =
  | { kind: 'insufficient_data' | 'keep_current' | 'needs_review'; reason: string }
  | {
      kind: 'proposal';
      beforeGrams: number;
      afterGrams: number;
      reason: string;
      ruleVersion: 'double-progression-candidate-1';
    };
export function evaluateProgression(
  p: Prescription,
  logs: readonly SetLog[],
  increments: readonly number[],
  phase: string,
  comparable: boolean,
): ProgressionResult {
  if (['assistance', 'bodyweight'].includes(p.exercise.basis))
    return {
      kind: 'needs_review',
      reason: 'Questa metrica richiede una regola specifica revisionata.',
    };
  if (phase === 'deload' || !comparable)
    return { kind: 'needs_review', reason: 'Fase di scarico o esecuzione non confrontabile.' };
  const required = p.targets.filter((t) => t.kind === 'work');
  const matched = required.flatMap((t) =>
    targetSides(p, t).map((side) =>
      logs.find(
        (l) =>
          l.targetId === t.id &&
          l.prescriptionId === p.id &&
          l.side === side &&
          l.status === 'completed',
      ),
    ),
  );
  if (
    !required.length ||
    matched.some((l) => !l || l.rir === null || l.reps === null || l.loadGrams === null)
  )
    return {
      kind: 'insufficient_data',
      reason: 'Servono tutte le serie prescritte, carico, ripetizioni e RIR.',
    };
  const completed = matched.filter((l): l is SetLog => !!l);
  const load = completed[0]?.loadGrams;
  if (load === null || load === undefined || completed.some((l) => l.loadGrams !== load))
    return { kind: 'needs_review', reason: 'I carichi non sono confrontabili.' };
  if (
    completed.some((l) => {
      const target = required.find((t) => t.id === l.targetId);
      return !target || (l.reps ?? 0) < target.repsMax || (l.rir ?? -1) < target.rir;
    })
  )
    return {
      kind: 'keep_current',
      reason: 'Non tutte le serie hanno raggiunto ripetizioni e RIR richiesti.',
    };
  const next = [...new Set(increments)]
    .filter((g) => Number.isSafeInteger(g) && g > load && g <= 1000000)
    .sort((a, b) => a - b)[0];
  if (next === undefined)
    return { kind: 'needs_review', reason: 'Indica i tagli di carico disponibili.' };
  return {
    kind: 'proposal',
    beforeGrams: load,
    afterGrams: next,
    reason: 'Tutte le serie e i lati richiesti raggiungono il target; prossimo taglio disponibile.',
    ruleVersion: 'double-progression-candidate-1',
  };
}
export function createPrescription(exercise: Exercise, ids: readonly string[]): Prescription {
  const id = ids[0];
  if (!id || ids.length < 4) throw new Error('Identificativi insufficienti.');
  return {
    id,
    exercise: { ...exercise },
    targets: ids.slice(1, 4).map((setId) => ({
      id: setId,
      repsMin: 8,
      repsMax: 12,
      rir: 2,
      restSeconds: 90,
      loadGrams: null,
      kind: 'work',
    })),
    notes: '',
    superset: null,
  };
}
export function copyProgram(program: Program, nextId: () => string, now: string): Program {
  const id = nextId();
  return {
    ...program,
    id,
    rootId: id,
    version: '1',
    status: 'draft',
    createdAt: now,
    days: program.days.map((d) => ({
      ...d,
      id: nextId(),
      exercises: d.exercises.map((e) => ({
        ...e,
        id: nextId(),
        targets: e.targets.map((t) => ({ ...t, id: nextId() })),
      })),
    })),
  };
}
