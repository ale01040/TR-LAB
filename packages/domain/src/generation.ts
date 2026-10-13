import {
  generationInputSchema,
  programSchema,
  ruleBundleSchema,
  type Exercise,
  type GenerationInput,
  type Program,
  type RuleBundle,
} from '@tr-lab/contracts';
export type GenerationResult =
  | {
      kind: 'proposal';
      program: Program;
      states: number;
      estimatedSeconds: { min: number; max: number };
      trace: { code: string; detail: string }[];
    }
  | {
      kind: 'needs_review' | 'incompatible_constraints' | 'search_incomplete';
      reason: string;
      states: number;
    };
function seedRank(seed: string, id: string) {
  let hash = 2166136261;
  for (const c of seed + id) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
export function normalizeGenerationInput(value: GenerationInput): GenerationInput {
  const input = generationInputSchema.parse(value);
  const sort = (ids: string[]) => [...new Set(ids)].sort();
  const equipment = [
    ...new Map(input.equipment.map((e) => [`${e.category}:${e.basis}`, e])).entries(),
  ]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, e]) => e);
  return {
    ...input,
    equipment,
    availableExerciseIds: sort(input.availableExerciseIds),
    excludedIds: sort(input.excludedIds),
    preferredIds: sort(input.preferredIds),
    practicedIds: sort(input.practicedIds),
  };
}
export function generateProgram(
  raw: GenerationInput,
  catalog: readonly Exercise[],
  rawRule: RuleBundle,
  context: { nextId: () => string; now: string; maximumStates?: number; cancelled?: () => boolean },
): GenerationResult {
  const input = normalizeGenerationInput(raw),
    rule = ruleBundleSchema.parse(rawRule);
  let states = 0;
  if (rule.status !== 'active')
    return {
      kind: 'needs_review',
      reason:
        'Il metodo richiede revisione e attivazione prima di produrre una proposta applicabile.',
      states,
    };
  if (rule.objective !== input.objective || rule.mode !== input.mode)
    return {
      kind: 'incompatible_constraints',
      reason: 'Metodo incompatibile con obiettivo o modalità.',
      states,
    };
  if (new Set(catalog.map((e) => e.id)).size !== catalog.length)
    return { kind: 'needs_review', reason: 'Il catalogo contiene identità duplicate.', states };
  const allowed = new Set(rule.allowedExerciseIds),
    excluded = new Set(input.excludedIds),
    preferred = new Set(input.preferredIds),
    practiced = new Set(input.practicedIds);
  const candidates = catalog.filter(
    (e) =>
      input.availableExerciseIds.includes(e.id) &&
      allowed.has(e.id) &&
      !excluded.has(e.id) &&
      input.equipment.some((i) => i.category === e.equipment && i.basis === e.basis) &&
      (!input.requirePracticed || practiced.has(e.id)) &&
      (input.mode !== 'bodyweight' || e.equipment === 'bodyweight') &&
      (input.mode !== 'resistance' || e.equipment !== 'bodyweight'),
  );
  const templates = rule.templates
    .filter((t) => t.days.length === input.days && t.supportedLevels.includes(input.experience))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (
    context.maximumStates !== undefined &&
    (!Number.isSafeInteger(context.maximumStates) || context.maximumStates < 1)
  )
    throw new Error('Budget di ricerca non valido.');
  const maximum = Math.min(5000, context.maximumStates ?? 5000);
  let incomplete = false;
  for (const template of templates) {
    const slots = template.days.flatMap((day, dayIndex) =>
        day.slots.map((slot, slotIndex) => ({ dayIndex, slotIndex, slot })),
      ),
      chosen: Exercise[] = [];
    const seconds = (dayIndex: number) => {
      let min = rule.timeAssumptions.warmupSeconds,
        max = min;
      for (let i = 0; i < chosen.length; i++) {
        const spec = slots[i]!;
        if (spec.dayIndex !== dayIndex) continue;
        const e = chosen[i]!,
          sides = e.unilateral ? 2 : 1,
          d = spec.slot.dose;
        min +=
          d.sets * d.repsMin * rule.timeAssumptions.repSecondsMin * sides +
          (d.sets * sides - 1) * d.restSeconds +
          rule.timeAssumptions.transitionSeconds;
        max +=
          d.sets * d.repsMax * rule.timeAssumptions.repSecondsMax * sides +
          (d.sets * sides - 1) * d.restSeconds +
          rule.timeAssumptions.transitionSeconds;
      }
      return { min, max };
    };
    function search(index: number): boolean {
      if (context.cancelled?.() || states >= maximum) {
        incomplete = true;
        return false;
      }
      states++;
      if (index === slots.length) return true;
      const spec = slots[index]!;
      const options = candidates
        .filter(
          (e) =>
            spec.slot.patterns.includes(e.pattern) &&
            !chosen.some((other, i) => slots[i]!.dayIndex === spec.dayIndex && other.id === e.id),
        )
        .sort(
          (a, b) =>
            Number(preferred.has(b.id)) - Number(preferred.has(a.id)) ||
            seedRank(input.seed, a.id) - seedRank(input.seed, b.id) ||
            (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        );
      for (const e of options) {
        chosen.push(e);
        if (seconds(spec.dayIndex).max <= input.maximumMinutes * 60 && search(index + 1))
          return true;
        chosen.pop();
        if (incomplete) return false;
      }
      return false;
    }
    if (search(0)) {
      const id = context.nextId();
      let index = 0;
      const program = programSchema.parse({
        id,
        rootId: id,
        name: 'Programma proposto',
        goal: input.objective,
        version: '1',
        status: 'draft',
        createdAt: context.now,
        source: `Metodo ${rule.id} ${rule.version}; da confermare`,
        weeks: structuredClone(template.weeks),
        days: template.days.map((day) => ({
          id: context.nextId(),
          name: day.name,
          focus: '',
          exercises: day.slots.map((slot) => ({
            id: context.nextId(),
            exercise: structuredClone(chosen[index++]!),
            notes: '',
            superset: null,
            accumulation: false,
            targets: Array.from({ length: slot.dose.sets }, () => ({
              id: context.nextId(),
              repsMin: slot.dose.repsMin,
              repsMax: slot.dose.repsMax,
              rir: slot.dose.rir,
              restSeconds: slot.dose.restSeconds,
              kind: 'work',
              loadGrams: null,
            })),
          })),
        })),
      });
      const duration = template.days.map((_, i) => seconds(i));
      return {
        kind: 'proposal',
        program,
        states,
        estimatedSeconds: {
          min: Math.min(...duration.map((d) => d.min)),
          max: Math.max(...duration.map((d) => d.max)),
        },
        trace: [
          { code: 'TEMPLATE', detail: template.id },
          {
            code: 'HARD_CONSTRAINTS',
            detail:
              'Attrezzi, esclusioni, modalità, identità e limite superiore del tempo stimato verificati.',
          },
          { code: 'TIME_ASSUMPTIONS', detail: JSON.stringify(rule.timeAssumptions) },
          {
            code: 'NO_PERSONAL_LOAD',
            detail: 'Carichi personali non assegnati: serve una rilevazione reale.',
          },
        ],
      };
    }
    if (incomplete)
      return {
        kind: 'search_incomplete',
        reason: 'Ricerca interrotta o limite di stati raggiunto; nessuna prova di impossibilità.',
        states,
      };
  }
  return {
    kind: 'incompatible_constraints',
    reason: 'Nessun template del bundle rispetta tutti i vincoli richiesti.',
    states,
  };
}
