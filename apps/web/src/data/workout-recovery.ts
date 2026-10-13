import { recoveredWorkoutSchema, type RecoveredWorkout } from '@tr-lab/contracts';
import { type Resolution } from './database';
export function prepareRecoveredWorkout(history: Resolution, sessionId: string): RecoveredWorkout {
  const values = [...new Map(history.records.map((r) => [r.entity.id, r.entity])).values()];
  const row = values.find((r) => r.kind === 'session' && r.id === sessionId);
  if (row?.kind !== 'session') throw new Error('Seduta storica non disponibile.');
  const program = values.find((r) => r.kind === 'program' && r.id === row.data.programId);
  return recoveredWorkoutSchema.parse({
    id: crypto.randomUUID(),
    sourceEpoch: history.sourceEpoch ?? null,
    sourceDeviceId: history.sourceDeviceId ?? null,
    sourceArchiveDigest: history.sourceArchiveDigest ?? null,
    sourceSessionId: row.id,
    sourceProgramId: row.data.programId,
    approvalAtExecution:
      program?.kind === 'program' && program.data.status === 'approved' ? 'approved' : 'unknown',
    session: row.data,
    sets: values
      .flatMap((r) => (r.kind === 'set' && r.data.sessionId === row.id ? [r.data] : []))
      .sort((a, b) => a.id.localeCompare(b.id)),
    recoveredAt: new Date().toISOString(),
    provenance: 'explicit_local_recovery',
  });
}
