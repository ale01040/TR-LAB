import { proposalDecisionPayload } from '@tr-lab/contracts';
import type { Pending, RecoveryDecision } from './database';
export function decisionIntent(operation: Pending, digest: string): RecoveryDecision {
  const payload = proposalDecisionPayload.parse(operation.command.payload);
  if (!/^[a-f0-9]{64}$/.test(digest))
    throw new Error(
      'Esporta il backup per conservare il digest della decisione prima del recupero.',
    );
  return {
    account: operation.account,
    operationId: operation.operation_id,
    proposalId: payload.id,
    proposalRevision: payload.proposalRevision,
    contentDigest: payload.contentDigest,
    choice: payload.choice,
    commandDigest: digest,
    digestVersion: 'jcs-1-sha256',
    requiresReview: true,
  };
}
