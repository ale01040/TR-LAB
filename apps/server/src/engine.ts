import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  builtInCatalog,
  builtInCatalogVersion,
  generationInputSchema,
  progressionRequestSchema,
  proposalSchema,
  proposalReviewSchema,
  proposalDecisionPayload,
  recordSchema,
  ruleBundleSchema,
  type Proposal,
} from '@tr-lab/contracts';
import {
  canonicalJson,
  generateProgram,
  proposeProgression,
  uuidSequence,
  normalizeGenerationInput,
} from '@tr-lab/domain';
import { AuthService, HttpError } from './auth.js';
import { hash, opaque } from './crypto.js';
export function proposalDigest(value: unknown): string {
  return hash(`tr-lab-jcs-1:${canonicalJson(value)}`);
}
export function engineRoutes(app: FastifyInstance, auth: AuthService) {
  async function privateQuery(
    name: 'engine_rules' | 'proposal_publish' | 'proposal_review',
    values: unknown[],
  ) {
    if (!auth.pool) throw new HttpError(503, 'NOT_CONFIGURED');
    try {
      const result = await auth.pool.query<{ result: unknown }>(
        `select tr_lab_private.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')}) result`,
        values,
      );
      return result.rows[0]?.result;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      throw new HttpError(
        message.includes('STALE') ? 409 : 503,
        message.includes('STALE')
          ? 'PROPOSAL_STALE'
          : message.includes('NOT_PENDING')
            ? 'PROPOSAL_NOT_PENDING'
            : 'ENGINE_UNAVAILABLE',
      );
    }
  }
  async function rules(sessionHash: string) {
    const value = z
      .array(ruleBundleSchema)
      .parse(await privateQuery('engine_rules', [sessionHash]));
    return value.filter((r) => r.catalogVersion === builtInCatalogVersion);
  }
  async function epoch(current: Awaited<ReturnType<AuthService['require']>>) {
    const response = await current.client.rpc('tr_lab_bootstrap');
    if (response.error) throw new HttpError(503, 'ENGINE_UNAVAILABLE');
    return z.object({ sync_epoch: z.uuid() }).parse(response.data).sync_epoch;
  }
  async function records(
    current: Awaited<ReturnType<AuthService['require']>>,
    ids: string[],
    scope: string | null = null,
    sessions: string[] | null = null,
  ) {
    const response = await current.client.rpc('tr_lab_engine_records', {
      requested_ids: ids,
      program_scope: scope,
      session_ids: sessions,
    });
    if (response.error)
      throw new HttpError(
        503,
        response.error.message.includes('DATA_WINDOW_REQUIRED')
          ? 'DATA_WINDOW_REQUIRED'
          : 'ENGINE_UNAVAILABLE',
      );
    return z.array(recordSchema).parse(response.data);
  }
  async function publish(sessionHash: string, p: Omit<Proposal, 'contentDigest'>) {
    const contentDigest = proposalDigest(p);
    return recordSchema.parse(
      await privateQuery('proposal_publish', [
        sessionHash,
        JSON.stringify(proposalSchema.parse({ ...p, contentDigest })),
      ]),
    );
  }
  app.get('/api/engine/rules', async (request) => {
    const current = await auth.require(request);
    return { bundles: await rules(current.row.token_hash) };
  });
  app.post('/api/engine/generate', async (request) => {
    const current = await auth.require(request);
    const raw = z
      .object({
        constraints: generationInputSchema,
        equipmentId: z.uuid(),
        ruleBundleId: z.string().min(1).max(100),
      })
      .strict()
      .parse(request.body);
    const input = { ...raw, constraints: normalizeGenerationInput(raw.constraints) };
    const bundle = (await rules(current.row.token_hash)).find((r) => r.id === input.ruleBundleId);
    if (!bundle) throw new HttpError(409, 'RULES_AWAITING_REVIEW');
    const syncEpoch = await epoch(current),
      rows = await records(current, [input.equipmentId]),
      equipment = rows.find((r) => r.id === input.equipmentId);
    if (
      equipment?.kind !== 'equipment_profile' ||
      equipment.data.place !== input.constraints.environment ||
      input.constraints.equipment.some(
        (i) =>
          !equipment.data.items.some(
            (item) => item.category === i.category && item.basis === i.basis,
          ),
      )
    )
      throw new HttpError(400, 'INVALID_EQUIPMENT');
    const now = new Date().toISOString(),
      result = generateProgram(input.constraints, builtInCatalog, bundle, {
        nextId: uuidSequence(input.constraints.seed),
        now,
      });
    if (result.kind !== 'proposal') return result;
    const fingerprint = proposalDigest({
      constraints: input.constraints,
      equipmentId: equipment.id,
      equipmentRevision: equipment.revision,
      ruleId: bundle.id,
      ruleVersion: bundle.version,
      catalogVersion: builtInCatalogVersion,
      syncEpoch,
    });
    const proposal = await publish(current.row.token_hash, {
      id: input.constraints.seed,
      syncEpoch,
      type: 'generate_program',
      status: 'pending',
      before: null,
      afterProgram: result.program,
      effectiveFrom: 'next_matching_session',
      ruleBundleId: bundle.id,
      ruleVersion: bundle.version,
      engineVersion: 'engine-1',
      inputFingerprint: fingerprint,
      dependencies: [{ recordId: equipment.id, revision: equipment.revision }],
      reasoning: result.trace.map((t) => ({
        code: t.code,
        message: t.detail,
        sourceIds: bundle.sources.map((s) => s.id),
      })),
      generatedAt: now,
      decidedAt: null,
      resultProgramId: null,
    });
    return { kind: 'proposal', record: proposal };
  });
  app.post('/api/engine/progression', async (request) => {
    const current = await auth.require(request);
    const input = progressionRequestSchema.parse(request.body);
    const bundle = (await rules(current.row.token_hash)).find((r) => r.id === input.ruleBundleId);
    if (!bundle) throw new HttpError(409, 'RULES_AWAITING_REVIEW');
    const syncEpoch = await epoch(current),
      rows = await records(
        current,
        [input.programId, input.equipmentId],
        input.programId,
        input.comparableSessionIds,
      ),
      program = rows.find((r) => r.id === input.programId),
      equipment = rows.find((r) => r.id === input.equipmentId);
    if (program?.kind !== 'program' || equipment?.kind !== 'equipment_profile')
      throw new HttpError(400, 'INVALID_INPUT');
    const now = new Date().toISOString(),
      result = proposeProgression({
        experience: input.experience,
        adultNonclinicalConfirmed: input.adultNonclinicalConfirmed,
        programRecord: program,
        prescriptionId: input.prescriptionId,
        equipment: equipment.data,
        comparableSessionIds: input.comparableSessionIds,
        entities: rows,
        rule: bundle,
        nextId: uuidSequence(
          input.seed,
          rows.map((r) => r.id),
        ),
        now,
      });
    if (result.kind !== 'proposal') return result;
    const dependencies = [
      ...result.dependencies,
      { recordId: equipment.id, revision: equipment.revision },
    ];
    const fingerprint = proposalDigest({
      input,
      dependencies,
      ruleVersion: bundle.version,
      syncEpoch,
    });
    const record = await publish(current.row.token_hash, {
      id: input.seed,
      syncEpoch,
      type: 'adapt_program',
      status: 'pending',
      before: { programId: program.id, revision: program.revision, version: program.data.version },
      afterProgram: result.program,
      effectiveFrom: 'next_matching_session',
      ruleBundleId: bundle.id,
      ruleVersion: bundle.version,
      engineVersion: 'engine-1',
      inputFingerprint: fingerprint,
      dependencies,
      reasoning: [
        {
          code: 'COMPLETE_EVIDENCE',
          message: result.reason,
          sourceIds: bundle.sources.map((s) => s.id),
        },
      ],
      generatedAt: now,
      decidedAt: null,
      resultProgramId: null,
    });
    return { kind: 'proposal', record };
  });
  app.post('/api/engine/review', async (request) => {
    const current = await auth.require(request);
    const input = z.object({ id: z.uuid() }).strict().parse(request.body);
    const challenge = opaque(),
      expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const digest = hash(challenge);
    const raw = await privateQuery('proposal_review', [
      current.row.token_hash,
      input.id,
      digest,
      expiresAt,
    ]);
    return proposalReviewSchema.parse({
      ...z
        .object({ proposal: proposalSchema, revision: z.string(), applicable: z.boolean() })
        .parse(raw),
      challenge,
      expiresAt,
    });
  });
}
export async function decideProposal(
  auth: AuthService,
  sessionHash: string,
  command: { payload: unknown },
) {
  if (!auth.pool) throw new HttpError(503, 'NOT_CONFIGURED');
  const payload = proposalDecisionPayload.parse(command.payload);
  try {
    return (
      await auth.pool.query<{ result: unknown }>(
        'select tr_lab_private.proposal_decide($1,$2::jsonb,$3) result',
        [sessionHash, JSON.stringify(command), hash(payload.challenge)],
      )
    ).rows[0]?.result;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    throw new HttpError(
      409,
      message.includes('EPOCH_MISMATCH')
        ? 'EPOCH_MISMATCH'
        : message.includes('OPERATION_ID_REUSED')
          ? 'OPERATION_ID_REUSED'
          : 'PROPOSAL_DECISION_FAILED',
    );
  }
}
