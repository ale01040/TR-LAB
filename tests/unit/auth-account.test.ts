import { expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { AuthService, HttpError, type Authenticated } from '../../apps/server/src/auth';
import { loadConfig } from '../../apps/server/src/config';

it('sync GET e POST rifiutano un account diverso anche con CSRF valido', async () => {
  const service = new AuthService(loadConfig({ NODE_ENV: 'test' }));
  const current = {
    row: { user_id: 'account-b', csrf: 'valid-nonce', recovery: false },
  } as Authenticated;
  vi.spyOn(service, 'resolve').mockResolvedValue(current);
  const app = Fastify();
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) return reply.status(error.status).send({ code: error.code });
    return reply.status(500).send({ code: 'UNEXPECTED_ERROR' });
  });
  app.route({
    method: ['GET', 'POST'],
    url: '/sync',
    handler: async (request) => ({ owner: (await service.require(request)).row.user_id }),
  });
  try {
    for (const method of ['GET', 'POST'] as const) {
      const headers = { 'x-account-id': 'account-a', 'x-csrf-token': 'valid-nonce' };
      const wrong = await app.inject({ method, url: '/sync', headers });
      expect(wrong.statusCode).toBe(409);
      expect(wrong.json().code).toBe('ACCOUNT_CHANGED');
      const right = await app.inject({
        method,
        url: '/sync',
        headers: { ...headers, 'x-account-id': 'account-b' },
      });
      expect(right.json()).toEqual({ owner: 'account-b' });
      const missing = await app.inject({
        method,
        url: '/sync',
        headers: { 'x-csrf-token': 'valid-nonce' },
      });
      expect(missing.statusCode).toBe(409);
    }
  } finally {
    await app.close();
  }
});
