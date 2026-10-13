import { commandSchema, proposalReviewSchema, receiptSchema } from '@tr-lab/contracts';
import { commandDigest } from './command-digest';
import {
  db,
  metadata,
  setMetadata,
  storeNewer,
  type LocalDatabase,
  type RecoveryDecision,
} from './database';
import { api } from './http';
export async function queueProposalDecision(
  account: string,
  rawReview: unknown,
  choice: 'accept' | 'reject',
  isCurrent: () => boolean,
  database: LocalDatabase = db,
): Promise<void> {
  const review = proposalReviewSchema.parse(rawReview);
  if (!navigator.onLine || !isCurrent() || Date.parse(review.expiresAt) <= Date.now())
    throw new Error('Riapri la review online prima di confermare.');
  if (choice === 'accept' && !review.applicable)
    throw new Error('Proposta non più applicabile: richiedi una nuova valutazione.');
  const epoch = await metadata(`${account}:epoch`, database),
    device = (await metadata('device', database)) ?? crypto.randomUUID();
  if (!epoch || epoch !== review.proposal.syncEpoch)
    throw new Error('Completa la sincronizzazione dell’archivio corrente.');
  if ((await metadata(`${account}:protocol`, database)) !== '2')
    throw new Error('Sincronizza con il servizio aggiornato prima di confermare.');
  const command = commandSchema.parse({
    protocol_version: 2,
    sync_epoch: epoch,
    operation_id: crypto.randomUUID(),
    device_id: device,
    aggregate_id: review.proposal.id,
    base: { kind: 'server_revision', revision: review.revision },
    depends_on: [],
    client_recorded_at: new Date().toISOString(),
    command: 'DecideProposal',
    payload: {
      id: review.proposal.id,
      decisionId: crypto.randomUUID(),
      choice,
      proposalRevision: review.revision,
      contentDigest: review.proposal.contentDigest,
      challenge: review.challenge,
    },
  });
  const digest = await commandDigest(command);
  await database.transaction('rw', [database.meta, database.outbox], async () => {
    if (
      !isCurrent() ||
      (await metadata(`${account}:epoch`, database)) !== epoch ||
      (await metadata(`${account}:recovery`, database))
    )
      throw new Error('Sessione o archivio cambiati: riapri la proposta.');
    const pending = await database.outbox.where('account').equals(account).toArray();
    if (
      pending.some(
        (p) =>
          p.command.command === 'DecideProposal' && p.command.aggregate_id === review.proposal.id,
      )
    )
      throw new Error('Una decisione per questa proposta è già in attesa di ricevuta.');
    const order = Number((await metadata(`${account}:order`, database)) ?? 0) + 1;
    if (!Number.isSafeInteger(order) || order < 1) throw new Error('Contatore locale non valido.');
    await setMetadata('device', device, database);
    await setMetadata(`${account}:order`, String(order), database);
    await database.outbox.put({
      operation_id: command.operation_id,
      account,
      order,
      command,
      affects: [command.aggregate_id],
      status: 'pending',
      error: null,
      command_digest: digest,
    });
  });
  // Nessun overlay approvato: prima serve la ricevuta transazionale del server.
}
export async function lookupRecoveredDecision(
  account: string,
  intent: RecoveryDecision,
  isCurrent: () => boolean,
  database: LocalDatabase = db,
): Promise<'applied' | 'rejected' | 'not_found'> {
  if (intent.account !== account || !isCurrent())
    throw new Error('Accedi allo stesso account della decisione.');
  const response = await api<{ receipt: unknown }>(
    `/sync/receipt?operation_id=${encodeURIComponent(intent.operationId)}`,
    'GET',
    undefined,
    account,
  );
  if (!isCurrent()) throw new Error('Sessione cambiata.');
  if (response.receipt === null) return 'not_found';
  const receipt = receiptSchema.parse(response.receipt);
  if (receipt.operation_id !== intent.operationId) throw new Error('Ricevuta non coerente.');
  await database.transaction('rw', database.base, async () => {
    if (!isCurrent()) throw new Error('Sessione cambiata.');
    for (const record of receipt.records) await storeNewer(account, record, database);
  });
  return receipt.status;
}
