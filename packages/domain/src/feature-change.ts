import { startScheduledSchema, type Command, type Entity } from '@tr-lab/contracts';
import { assertLocalChange as assertCore } from './local-change';
export function assertFeatureChange(
  command: Command['command'],
  entity: Entity,
  known: readonly Entity[],
  related: readonly Entity[],
): boolean {
  if (command === 'DecideProposal')
    throw new Error(
      'Le decisioni del motore richiedono la conferma online e una ricevuta del server.',
    );
  const kinds: Partial<Record<Command['command'], Entity['kind']>> = {
    SavePrivateExercise: 'private_exercise',
    ArchivePrivateExercise: 'private_exercise',
    SaveEquipmentProfile: 'equipment_profile',
    SaveCycle: 'cycle',
    PlanCycle: 'cycle',
    SaveScheduledSession: 'scheduled_session',
    CancelScheduledSession: 'scheduled_session',
    StartScheduledWorkout: 'scheduled_session',
    ImportProgramDraft: 'program',
    ReconcileExecutedWorkout: 'recovered_workout',
  };
  if (!kinds[command]) return false;
  const reject = () => {
    throw new Error('Modifica non consentita: conserva i dati e rivedi lo stato della risorsa.');
  };
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (entity.kind !== kinds[command]) reject();
  if (
    !['StartScheduledWorkout', 'PlanCycle', 'ImportProgramDraft'].includes(command) &&
    related.length
  )
    reject();
  const old = known.find((r) => r.id === entity.id);
  if (old && old.kind !== entity.kind) reject();
  if (command === 'ImportProgramDraft' && entity.kind === 'program') {
    if (
      old ||
      entity.data.status !== 'draft' ||
      entity.data.rootId !== entity.id ||
      entity.data.version !== '1' ||
      related.filter((r) => r.kind === 'import_report').length !== 1 ||
      related.some(
        (r) =>
          !['import_report', 'private_exercise'].includes(r.kind) ||
          known.some((k) => k.id === r.id),
      )
    )
      reject();
    const variants = related.filter((r) => r.kind === 'private_exercise');
    for (const variant of variants) assertFeatureChange('SavePrivateExercise', variant, known, []);
    const report = related.find((r) => r.kind === 'import_report');
    if (
      report?.kind !== 'import_report' ||
      report.data.programId !== entity.id ||
      report.data.issues.some((i) => i.severity !== 'info')
    )
      reject();
    assertCore('SaveProgramDraft', entity, [...known, ...variants], []);
  } else if (entity.kind === 'recovered_workout') {
    if (
      old ||
      known.some(
        (r) =>
          r.kind === 'recovered_workout' &&
          r.data.sourceEpoch === entity.data.sourceEpoch &&
          r.data.sourceDeviceId === entity.data.sourceDeviceId &&
          r.data.sourceArchiveDigest === entity.data.sourceArchiveDigest &&
          r.data.sourceSessionId === entity.data.sourceSessionId,
      )
    )
      reject();
  } else if (entity.kind === 'private_exercise') {
    if (!old) {
      if (
        command !== 'SavePrivateExercise' ||
        entity.data.status !== 'active' ||
        entity.data.semanticVersion !== '1'
      )
        reject();
    } else if (old.kind === 'private_exercise') {
      const before = { ...old.data.exercise, name: '', instructions: '' };
      const after = { ...entity.data.exercise, name: '', instructions: '' };
      if (
        !same(before, after) ||
        old.data.semanticVersion !== entity.data.semanticVersion ||
        old.data.createdAt !== entity.data.createdAt
      )
        reject();
      if (
        command === 'ArchivePrivateExercise' &&
        (!same(old.data.exercise, entity.data.exercise) ||
          old.data.status !== 'active' ||
          entity.data.status !== 'archived')
      )
        reject();
      if (command === 'SavePrivateExercise' && old.data.status !== entity.data.status) reject();
    }
  } else if (entity.kind === 'cycle') {
    const p = known.find((r) => r.id === entity.data.programId);
    if (p?.kind !== 'program' || p.data.status !== 'approved') reject();
    if (old?.kind === 'cycle' && !same({ ...old.data, status: entity.data.status }, entity.data))
      reject();
    if (command === 'PlanCycle') {
      if (old || entity.data.status !== 'active' || related.length < 1 || related.length > 100)
        reject();
      for (const occurrence of related) {
        if (
          occurrence.kind !== 'scheduled_session' ||
          occurrence.data.cycleId !== entity.id ||
          known.some((r) => r.id === occurrence.id)
        )
          reject();
        assertFeatureChange('SaveScheduledSession', occurrence, [...known, entity], []);
      }
    }
  } else if (entity.kind === 'scheduled_session') {
    const p = known.find((r) => r.id === entity.data.programId),
      cycle = known.find((r) => r.id === entity.data.cycleId);
    if (
      p?.kind !== 'program' ||
      p.data.status !== 'approved' ||
      !p.data.days.some((d) => d.id === entity.data.dayId) ||
      !p.data.weeks[entity.data.weekIndex] ||
      cycle?.kind !== 'cycle' ||
      cycle.data.programId !== entity.data.programId ||
      cycle.data.timeZone !== entity.data.timeZone
    )
      reject();
    if (command === 'SaveScheduledSession') {
      if (
        entity.data.status !== 'planned' ||
        entity.data.sessionId !== null ||
        cycle?.kind !== 'cycle' ||
        cycle.data.status !== 'active'
      )
        reject();
      if (
        old?.kind === 'scheduled_session' &&
        (old.data.status !== 'planned' ||
          !same({ ...old.data, date: entity.data.date }, entity.data))
      )
        reject();
    } else if (command === 'CancelScheduledSession') {
      if (
        old?.kind !== 'scheduled_session' ||
        old.data.status !== 'planned' ||
        !['cancelled', 'skipped'].includes(entity.data.status) ||
        !same({ ...old.data, status: entity.data.status }, entity.data)
      )
        reject();
    } else {
      const session = related[0];
      if (
        old?.kind !== 'scheduled_session' ||
        old.data.status !== 'planned' ||
        entity.data.status !== 'active' ||
        session?.kind !== 'session' ||
        related.length !== 1 ||
        !same({ ...old.data, status: 'active', sessionId: session.id }, entity.data)
      )
        reject();
      if (session?.kind === 'session') {
        if (
          session.data.programId !== entity.data.programId ||
          session.data.dayId !== entity.data.dayId ||
          session.data.weekIndex !== entity.data.weekIndex
        )
          reject();
        assertCore('StartWorkout', session, known, []);
        startScheduledSchema.parse({ id: entity.id, session: session.data });
      }
    }
  }
  return true;
}
