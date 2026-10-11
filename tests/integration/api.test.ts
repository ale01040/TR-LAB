import { afterAll, beforeAll, expect, it } from 'vitest';
import { buildApp } from '../../apps/server/src/app';
import { loadConfig } from '../../apps/server/src/config';
let app: Awaited<ReturnType<typeof buildApp>>;
beforeAll(async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test' }));
});
afterAll(async () => {
  await app.close();
});
it('alpha senza chiavi dichiara il provider assente e non restituisce token', async () => {
  const response = await app.inject('/api/auth/session');
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ user: null, configured: false });
  expect(response.headers['cache-control']).toBe('no-store');
});
it('blocca richieste cross origin e form senza header prima dell’autenticazione', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { origin: 'https://evil.test' },
    payload: { email: 'a@example.org', password: 'pw' },
  });
  expect(response.statusCode).toBe(403);
});
it('config assente non simula il login e payload invalidi non passano', async () => {
  const headers = { origin: 'http://localhost:5173', 'x-tr-lab': '1' };
  const invalid = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers,
    payload: { email: 'bad', password: 'pw' },
  });
  expect(invalid.statusCode).toBe(400);
  const absent = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers,
    payload: { email: 'a@example.org', password: 'pw' },
  });
  expect(absent.statusCode).toBe(503);
  expect(absent.json().code).toBe('NOT_CONFIGURED');
});
it('niente sync anonima né accesso alla sessione del DB', async () => {
  expect((await app.inject('/api/sync/bootstrap')).statusCode).toBe(401);
  expect((await app.inject('/api/tr_lab_private.sessions')).statusCode).toBe(404);
});
