import type { Entity, SetLog, WorkoutSession } from '@tr-lab/contracts';
export function journalData(entities: readonly Entity[]): {
  sessions: WorkoutSession[];
  sets: SetLog[];
  recoveredIds: Set<string>;
} {
  const sessions = entities.flatMap((r) => (r.kind === 'session' ? [r.data] : [])),
    sets = entities.flatMap((r) => (r.kind === 'set' ? [r.data] : [])),
    recoveredIds = new Set<string>();
  for (const row of entities)
    if (row.kind === 'recovered_workout') {
      recoveredIds.add(row.id);
      sessions.push({ ...row.data.session, id: row.id });
      sets.push(...row.data.sets.map((log) => ({ ...log, sessionId: row.id })));
    }
  return { sessions, sets, recoveredIds };
}
