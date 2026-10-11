import { describe, expect, it } from 'vitest';
import {
  countRequired,
  evaluateProgression,
  parseDecimal,
  resolveDay,
  targetSides,
  workoutVolume,
} from '@tr-lab/domain';
import type { SetLog } from '@tr-lab/contracts';
import { program, session, setLog } from '../helpers/fixtures';
import rawTemplate from '../../apps/web/src/data/excel-template.json';
import { templateSchema } from '@tr-lab/contracts';
describe('Dominio · ALG-01/02/03/04/05/09/11/18/27', () => {
  it('distingue assenza, zero e decimale italiano', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('0')).toBe(0);
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('1e3')).toBeNull();
    expect(parseDecimal('-1')).toBeNull();
  });
  it('accumulo selettivo e scarico non duplicano gli extra', () => {
    const p = program();
    const d = p.days[0];
    if (!d) throw new Error();
    const a = resolveDay(p, d, 2);
    const b = resolveDay(p, d, 6);
    expect(a.exercises[0]?.targets.length).toBe(4);
    expect(a.exercises[2]?.targets.length).toBe(3);
    expect(b.exercises[0]?.targets.length).toBe(2);
    expect(b.exercises[0]?.targets[0]?.rir).toBe(3);
    expect(new Set(a.exercises.flatMap((e) => e.targets.map((t) => t.id))).size).toBe(
      a.exercises.reduce((n, e) => n + e.targets.length, 0),
    );
  });
  it('ID aggiuntivi non collidono con la fixture sequenziale originale', () => {
    const p = templateSchema.parse(rawTemplate).program;
    const day = p.days[0];
    if (!day) throw new Error();
    const result = resolveDay(p, day, 2);
    const ids = result.exercises.flatMap((e) => e.targets.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(resolveDay(p, day, 2)).toEqual(result);
  });
  it('conta i due lati e l’extra solo SX senza raddoppi', () => {
    const s = session(program());
    const p = s.snapshot.exercises[2];
    if (!p) throw new Error();
    const logs: SetLog[] = p.targets.flatMap((t) =>
      ['left', 'right'].map((side) => ({
        ...setLog(s),
        prescriptionId: p.id,
        targetId: t.id,
        side: side as SetLog['side'],
      })),
    );
    const target = p.targets[0];
    if (!target) throw new Error();
    const extra = {
      ...target,
      id: crypto.randomUUID(),
      kind: 'extra' as const,
      side: 'left' as const,
    };
    p.targets.push(extra);
    logs.push({ ...setLog(s), prescriptionId: p.id, targetId: extra.id, side: 'left' });
    expect(workoutVolume(logs, s.snapshot)['Dorsali']).toEqual({ left: 4, right: 3 });
    expect(targetSides(p, extra)).toEqual(['left']);
    expect(countRequired({ ...s.snapshot, exercises: [p] })).toBe(7);
  });
  it('esclude serie con target sconosciuto', () => {
    const s = session(program());
    expect(workoutVolume([{ ...setLog(s), targetId: crypto.randomUUID() }], s.snapshot)).toEqual(
      {},
    );
  });
  it('usa tutte le serie richieste, RIR zero è un dato', () => {
    const s = session(program(), 2);
    const p = s.snapshot.exercises[0];
    if (!p) throw new Error();
    p.targets = p.targets.map((t) => ({ ...t, rir: 0 }));
    const logs = p.targets.map((t) => ({ ...setLog(s), targetId: t.id, reps: t.repsMax, rir: 0 }));
    expect(evaluateProgression(p, logs, [20000, 22500], 'base', true).kind).toBe('proposal');
    expect(evaluateProgression(p, logs.slice(0, 3), [22500], 'base', true).kind).toBe(
      'insufficient_data',
    );
    expect(
      evaluateProgression(
        p,
        logs.map((l) => ({ ...l, rir: null })),
        [22500],
        'base',
        true,
      ).kind,
    ).toBe('insufficient_data');
    expect(evaluateProgression(p, logs, [22500], 'deload', true).kind).toBe('needs_review');
  });
  it('non inventa pesi, non confonde assistenza e zavorra', () => {
    const s = session(program());
    const p = s.snapshot.exercises[0];
    if (!p) throw new Error();
    const logs = p.targets.map((t) => ({ ...setLog(s), targetId: t.id, reps: t.repsMax }));
    expect(evaluateProgression(p, logs, [20000], 'base', true).kind).toBe('needs_review');
    expect(
      evaluateProgression(
        { ...p, exercise: { ...p.exercise, basis: 'assistance' } },
        logs,
        [22500],
        'base',
        true,
      ).kind,
    ).toBe('needs_review');
  });
});
