import Fastify, { LogController } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  commandSchema,
  pullSchema,
  receiptSchema,
  revisionSchema,
  validatePayload,
} from '@tr-lab/contracts';
import { AuthService, authRoutes, HttpError } from './auth.js';
import { loadConfig, type Config } from './config.js';
import { readCursor, signCursor } from './crypto.js';
export async function buildApp(config: Config = loadConfig(), { serveWeb = true } = {}) {
  const app = Fastify({
    bodyLimit: 262144,
    trustProxy: false,
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.body',
        'res.headers.set-cookie',
      ],
    },
    logController: new LogController({ disableRequestLogging: true }),
  });
  const auth = new AuthService(config);
  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        ...(config.NODE_ENV === 'production'
          ? { upgradeInsecureRequests: [] }
          : { upgradeInsecureRequests: null }),
      },
    },
    hsts: config.NODE_ENV === 'production',
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ code: 'RATE_LIMITED' }),
  });
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store');
      reply.header('X-Robots-Tag', 'noindex, nofollow');
      if (
        request.method !== 'GET' &&
        (request.headers.origin !== config.APP_ORIGIN || request.headers['x-tr-lab'] !== '1')
      )
        throw new HttpError(403, 'CSRF_REJECTED');
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) return reply.status(error.status).send({ code: error.code });
    if (error instanceof z.ZodError)
      return reply.status(400).send({
        code: 'INVALID_INPUT',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 429
    )
      return reply.status(429).send({ code: 'RATE_LIMITED' });
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 413
    )
      return reply.status(413).send({ code: 'PAYLOAD_TOO_LARGE' });
    app.log.error({ code: 'INTERNAL_ERROR' }, 'Richiesta non riuscita');
    return reply.status(500).send({ code: 'INTERNAL_ERROR' });
  });
  app.get('/api/health', () => ({ name: 'TR LAB', version: '0.1.0', configured: !!auth.pool }));
  authRoutes(app, auth);
  app.post('/api/sync/command', async (request) => {
    const current = await auth.require(request);
    const command = commandSchema.parse(request.body);
    validatePayload(command);
    const response = await current.client.rpc('tr_lab_apply', { c: command });
    if (response.error)
      throw new HttpError(
        409,
        response.error.message.includes('EPOCH_MISMATCH')
          ? 'EPOCH_MISMATCH'
          : response.error.message.includes('DEPENDENCY_PENDING')
            ? 'DEPENDENCY_PENDING'
            : 'COMMAND_FAILED',
      );
    return receiptSchema.parse(response.data);
  });
  app.get('/api/sync/bootstrap', async (request) => {
    const current = await auth.require(request);
    const response = await current.client.rpc('tr_lab_bootstrap');
    if (response.error) throw new HttpError(503, 'SYNC_UNAVAILABLE');
    const data = z.object({ sync_epoch: z.uuid(), sequence: revisionSchema }).parse(response.data);
    return {
      sync_epoch: data.sync_epoch,
      cursor: signCursor(
        {
          v: 1,
          owner: current.row.user_id,
          epoch: data.sync_epoch,
          sequence: '0',
          ceiling: data.sequence,
        },
        auth.key,
      ),
    };
  });
  app.get('/api/sync/pull', async (request) => {
    const current = await auth.require(request);
    const query = z.object({ cursor: z.string().max(2000) }).parse(request.query);
    let cursor;
    try {
      cursor = readCursor(query.cursor, current.row.user_id, auth.key);
    } catch {
      throw new HttpError(400, 'INVALID_CURSOR');
    }
    const response = await current.client.rpc('tr_lab_pull', {
      after_sequence: cursor.sequence,
      until_sequence: cursor.ceiling,
      expected_epoch: cursor.epoch,
    });
    if (response.error)
      throw new HttpError(
        409,
        response.error.message.includes('EPOCH_MISMATCH') ? 'EPOCH_MISMATCH' : 'SYNC_UNAVAILABLE',
      );
    const raw = z
      .object({
        sync_epoch: z.uuid(),
        next_sequence: revisionSchema,
        has_more: z.boolean(),
        events: pullSchema.shape.events,
      })
      .parse(response.data);
    const token = signCursor(
      { ...cursor, sequence: raw.next_sequence, ceiling: raw.has_more ? cursor.ceiling : null },
      auth.key,
    );
    return pullSchema.parse({
      sync_epoch: raw.sync_epoch,
      next_cursor: token,
      has_more: raw.has_more || cursor.ceiling !== null,
      events: raw.events,
    });
  });
  const webRoot = serveWeb
    ? resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist')
    : null;
  if (webRoot && existsSync(webRoot)) {
    await app.register(staticFiles, { root: webRoot });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith('/api/')
        ? reply.status(404).send({ code: 'NOT_FOUND' })
        : reply.header('Cache-Control', 'no-cache').sendFile('index.html'),
    );
  } else app.setNotFoundHandler((_request, reply) => reply.status(404).send({ code: 'NOT_FOUND' }));
  app.addHook('onClose', async () => {
    await auth.pool?.end();
  });
  return app;
}
