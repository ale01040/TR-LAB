import {
  recordSchema,
  validatePayload,
  importDraftSchema,
  type Command,
  type Entity,
} from '@tr-lab/contracts';
import { assertLocalChange } from './local-change';
export function projectCommand(command: Command, known: readonly Entity[]): Entity[] {
  if (command.command === 'DecideProposal')
    throw new Error(
      'Questa decisione richiede una nuova review e un nuovo clic; non può essere riapplicata dal recupero.',
    );
  validatePayload(command);
  const kinds: Partial<Record<Command['command'], Entity['kind']>> = {
    SaveProgramDraft: 'program',
    ApproveProgram: 'program',
    StartWorkout: 'session',
    FinishWorkout: 'session',
    SaveSet: 'set',
    SaveMeasurement: 'measurement',
    SaveNutritionTarget: 'nutrition',
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
  const old = known.find((r) => r.id === command.aggregate_id);
  const data =
    command.command === 'ApproveProgram' && old?.kind === 'program'
      ? { ...old.data, status: 'approved' }
      : command.command === 'StartScheduledWorkout' && old?.kind === 'scheduled_session'
        ? {
            ...old.data,
            status: 'active',
            sessionId: (command.payload as { session: { id: string } }).session.id,
          }
        : command.command === 'ImportProgramDraft'
          ? importDraftSchema.parse(command.payload).program
          : command.command === 'PlanCycle'
            ? (command.payload as { cycle: unknown }).cycle
            : command.payload;
  const entity = recordSchema.parse({
    id: command.aggregate_id,
    kind: kinds[command.command],
    revision: '0',
    data,
  });
  const parent =
    entity.kind === 'set'
      ? known.find((r) => r.kind === 'session' && r.id === entity.data.sessionId)
      : undefined;
  const imported =
    command.command === 'ImportProgramDraft' ? importDraftSchema.parse(command.payload) : null;
  const related = imported
    ? [
        recordSchema.parse({
          id: imported.report.id,
          kind: 'import_report',
          revision: '0',
          data: imported.report,
        }),
        ...imported.variants.map((data) =>
          recordSchema.parse({ id: data.id, kind: 'private_exercise', revision: '0', data }),
        ),
      ]
    : command.command === 'PlanCycle'
      ? (command.payload as { occurrences: { id: string }[] }).occurrences.map((data) =>
          recordSchema.parse({ id: data.id, kind: 'scheduled_session', revision: '0', data }),
        )
      : command.command === 'StartScheduledWorkout'
        ? [
            recordSchema.parse({
              id: (command.payload as { session: { id: string } }).session.id,
              kind: 'session',
              revision: '0',
              data: (command.payload as { session: unknown }).session,
            }),
          ]
        : parent
          ? [parent]
          : [];
  assertLocalChange(command.command, entity, known, related);
  return [entity, ...related];
}
