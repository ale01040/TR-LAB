import type { Day } from '@tr-lab/contracts';

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (![from, to].every((i) => Number.isInteger(i) && i >= 0 && i < items.length))
    throw new Error('Posizione non presente nella lista.');
  const result = [...items];
  const [item] = result.splice(from, 1);
  if (item === undefined) throw new Error('Elemento non presente nella lista.');
  result.splice(to, 0, item);
  return result;
}

export function copyDay(day: Day, nextId: () => string): Day {
  // Gli ID sono nuovi; nessun riferimento condiviso può riscrivere la giornata originale.
  return {
    ...day,
    id: nextId(),
    name: `${day.name.slice(0, 192)} (copia)`,
    exercises: day.exercises.map((p) => ({
      ...p,
      id: nextId(),
      exercise: { ...p.exercise, secondary: [...p.exercise.secondary] },
      targets: p.targets.map((t) => ({ ...t, id: nextId() })),
    })),
  };
}
