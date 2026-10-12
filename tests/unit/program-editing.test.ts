import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { copyDay, moveItem } from '@tr-lab/domain';
import { programSchema } from '@tr-lab/contracts';
import { program } from '../helpers/fixtures';

it('la copia di una giornata usa ID nuovi e non condivide target o metadati modificabili', () => {
  const p = program();
  const day = p.days[0]!;
  const before = structuredClone(day);
  const copied = copyDay(day, randomUUID);
  expect(programSchema.safeParse({ ...p, days: [...p.days, copied] }).success).toBe(true);
  expect(copied.name).toBe(`${day.name} (copia)`);
  const originalIds = new Set([
    day.id,
    ...day.exercises.flatMap((e) => [e.id, ...e.targets.map((t) => t.id)]),
  ]);
  const copiedIds = [
    copied.id,
    ...copied.exercises.flatMap((e) => [e.id, ...e.targets.map((t) => t.id)]),
  ];
  expect(copiedIds.every((id) => !originalIds.has(id))).toBe(true);
  expect(new Set(copiedIds).size).toBe(copiedIds.length);
  copied.exercises[0]!.targets[0]!.rir = 0;
  copied.exercises[0]!.exercise.secondary.push('test');
  expect(day).toEqual(before);
  expect(copyDay({ ...day, name: 'A'.repeat(200) }, randomUUID).name).toHaveLength(200);
});

it('il riordino conserva identità/valori e non modifica l’array originale', () => {
  const days = program().days;
  const original = [...days];
  const moved = moveItem(days, 0, 2);
  expect(moved.map((d) => d.id)).toEqual([days[1]!.id, days[2]!.id, days[0]!.id]);
  expect(moved[2]).toBe(days[0]);
  expect(days).toEqual(original);
  expect(() => moveItem(days, -1, 0)).toThrow('Posizione non presente');
  expect(() => moveItem(days, 0, 3)).toThrow('Posizione non presente');
});
