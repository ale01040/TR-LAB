import type { Command, Entity } from '@tr-lab/contracts';
import { resolveDay, targetSides } from './index';
import { assertFeatureChange } from './feature-change';

function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.entries(a),
    right = Object.entries(b);
  return (
    left.length === right.length &&
    left.every(
      ([key, value]) => Object.hasOwn(b, key) && same(value, (b as Record<string, unknown>)[key]),
    )
  );
}

// Precondizioni locali: la modalità dispositivo conserva le stesse transizioni del server.
// Queste guardie migliorano l'offline; non sostituiscono ownership e RPC PostgreSQL.
export function assertLocalChange(
  command: Command['command'],
  entity: Entity,
  known: readonly Entity[],
  related: readonly Entity[],
): void {
  if (assertFeatureChange(command, entity, known, related)) return;
  const kinds: Partial<Record<Command['command'], Entity['kind']>> = {
    SaveProgramDraft: 'program',
    ApproveProgram: 'program',
    StartWorkout: 'session',
    FinishWorkout: 'session',
    SaveSet: 'set',
    SaveMeasurement: 'measurement',
    SaveNutritionTarget: 'nutrition',
  };
  const reject = () => {
    throw new Error('Modifica non consentita nello stato corrente. Riapri la scheda o la seduta.');
  };
  if (entity.kind !== kinds[command] || (command !== 'SaveSet' && related.length)) reject();
  const old = known.find((r) => r.id === entity.id);
  if (old && old.kind !== entity.kind) reject();
  if (entity.kind === 'program') {
    if (command === 'SaveProgramDraft') {
      for (const day of entity.data.days)
        for (const slot of day.exercises)
          if (slot.exercise.id.startsWith('private:')) {
            const privateRecord = known.find(
              (r) => r.kind === 'private_exercise' && r.data.exercise.id === slot.exercise.id,
            );
            if (
              privateRecord?.kind !== 'private_exercise' ||
              privateRecord.data.status !== 'active' ||
              !same(
                { ...privateRecord.data.exercise, name: '', instructions: '' },
                { ...slot.exercise, name: '', instructions: '' },
              )
            )
              reject();
          }
      if (
        entity.data.status !== 'draft' ||
        (old?.kind === 'program' &&
          (old.data.status === 'approved' ||
            old.data.rootId !== entity.data.rootId ||
            old.data.version !== entity.data.version))
      )
        reject();
      if (
        entity.data.rootId !== entity.id &&
        !known.some((r) => r.kind === 'program' && r.id === entity.data.rootId)
      )
        reject();
    } else {
      const highest = known
        .filter(
          (r): r is Extract<Entity, { kind: 'program' }> =>
            r.kind === 'program' &&
            r.data.rootId === entity.data.rootId &&
            r.data.status === 'approved',
        )
        .reduce((n, r) => (BigInt(r.data.version) > n ? BigInt(r.data.version) : n), 0n);
      if (BigInt(entity.data.version) !== highest + 1n) reject();
      if (
        old?.kind !== 'program' ||
        old.data.status !== 'draft' ||
        entity.data.status !== 'approved' ||
        !same({ ...old.data, status: 'approved' }, entity.data)
      )
        reject();
    }
  } else if (entity.kind === 'session') {
    if (command === 'StartWorkout') {
      const p = known.find((r) => r.kind === 'program' && r.id === entity.data.programId);
      const day =
        p?.kind === 'program' ? p.data.days.find((d) => d.id === entity.data.dayId) : undefined;
      if (
        old ||
        p?.kind !== 'program' ||
        p.data.status !== 'approved' ||
        !day ||
        entity.data.status !== 'active' ||
        entity.data.endedAt !== null
      )
        reject();
      if (
        p?.kind === 'program' &&
        day &&
        !same(resolveDay(p.data, day, entity.data.weekIndex), entity.data.snapshot)
      )
        reject();
    } else if (
      old?.kind !== 'session' ||
      old.data.status !== 'active' ||
      entity.data.status !== 'completed' ||
      entity.data.endedAt === null ||
      !same(
        {
          ...old.data,
          status: 'completed',
          endedAt: entity.data.endedAt,
          notes: entity.data.notes,
        },
        entity.data,
      )
    )
      reject();
  } else if (entity.kind === 'set') {
    const parent = known.find((r) => r.kind === 'session' && r.id === entity.data.sessionId);
    const p =
      parent?.kind === 'session'
        ? parent.data.snapshot.exercises.find((e) => e.id === entity.data.prescriptionId)
        : undefined;
    const target = p?.targets.find((t) => t.id === entity.data.targetId);
    if (
      parent?.kind !== 'session' ||
      parent.data.status !== 'active' ||
      !p ||
      !target ||
      !targetSides(p, target).includes(entity.data.side)
    )
      reject();
    if (
      old?.kind === 'set' &&
      (old.data.sessionId !== entity.data.sessionId ||
        old.data.prescriptionId !== entity.data.prescriptionId ||
        old.data.targetId !== entity.data.targetId ||
        old.data.side !== entity.data.side)
    )
      reject();
    if (
      known.some(
        (r) =>
          r.kind === 'set' &&
          r.id !== entity.id &&
          r.data.sessionId === entity.data.sessionId &&
          r.data.prescriptionId === entity.data.prescriptionId &&
          r.data.targetId === entity.data.targetId &&
          r.data.side === entity.data.side,
      )
    )
      reject();
    if (
      related.length !== 1 ||
      related[0]?.kind !== 'session' ||
      related[0].id !== parent?.id ||
      !same(related[0].data, parent?.data)
    )
      reject();
  }
}
