import { randomUUID } from 'node:crypto';
import {
  templateSchema,
  type Command,
  type Program,
  type SetLog,
  type WorkoutSession,
} from '@tr-lab/contracts';
import { copyProgram, resolveDay } from '@tr-lab/domain';
import source from '../../apps/web/src/data/excel-template.json';
export const now = '2026-10-11T09:00:00.000Z';
export function program(): Program {
  return copyProgram(templateSchema.parse(source).program, randomUUID, now);
}
export function session(p: Program, week = 0): WorkoutSession {
  const day = p.days[0];
  if (!day) throw new Error('Fixture senza giorno');
  return {
    id: randomUUID(),
    programId: p.id,
    dayId: day.id,
    weekIndex: week,
    snapshot: resolveDay(p, day, week),
    status: 'active',
    startedAt: now,
    endedAt: null,
    notes: '',
  };
}
export function setLog(s: WorkoutSession): SetLog {
  const p = s.snapshot.exercises[0];
  const t = p?.targets[0];
  if (!p || !t) throw new Error('Fixture senza serie');
  return {
    id: randomUUID(),
    sessionId: s.id,
    prescriptionId: p.id,
    targetId: t.id,
    side: 'bilateral',
    loadGrams: 20000,
    reps: 8,
    rir: 2,
    status: 'completed',
    recordedAt: now,
    notes: '',
  };
}
export function command<T extends { id: string }>(
  action: Command['command'],
  aggregate: T,
  epoch: string,
  revision = '0',
): Command {
  return {
    protocol_version: 1,
    sync_epoch: epoch,
    operation_id: randomUUID(),
    device_id: randomUUID(),
    aggregate_id: aggregate.id,
    base: { kind: 'server_revision', revision },
    depends_on: [],
    client_recorded_at: now,
    command: action,
    payload: aggregate,
  };
}
