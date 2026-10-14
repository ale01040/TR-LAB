import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../../apps/server/src/auth';
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
  expect(response.json()).toEqual({ user: null, configured: false, providers: { google: false } });
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
it('readiness senza database restituisce 503 anziché simulare una connessione', async () => {
  const response = await app.inject('/api/ready');
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ ready: false, code: 'NOT_CONFIGURED' });
  expect(response.headers['cache-control']).toBe('no-store');
});
it('Google disabilitato non crea flussi o redirect verso un provider non configurato', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/google',
    headers: { origin: 'http://localhost:5173', 'x-tr-lab': '1' },
    payload: {},
  });
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ code: 'GOOGLE_NOT_CONFIGURED' });
  expect(response.headers['set-cookie']).toBeUndefined();
});
it('registrazione valida Unicode e limite byte sul server prima di creare un flusso', async () => {
  const flow = vi.spyOn(AuthService.prototype, 'flow');
  try {
    for (const [password, code] of [
      ['🔐'.repeat(6), 'INVALID_INPUT'],
      ['a'.repeat(73), 'INVALID_PASSWORD'],
      ['🔐'.repeat(19), 'INVALID_PASSWORD'],
    ] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        headers: { origin: 'http://localhost:5173', 'x-tr-lab': '1' },
        payload: { email: 'synthetic@example.org', password, adults: true },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe(code);
    }
    expect(flow).not.toHaveBeenCalled();
  } finally {
    flow.mockRestore();
  }
});
it('errore effettivo del provider email non viene dichiarato richiesta riuscita', async () => {
  const flow = vi.spyOn(AuthService.prototype, 'flow').mockResolvedValue({
    id: 'synthetic-flow',
    state: 'synthetic-state',
    redirect: 'http://localhost:5173/api/auth/callback',
    storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
  });
  const client = createClient('https://synthetic.invalid', 'synthetic-publishable', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async () =>
        new Response(JSON.stringify({ msg: 'Synthetic provider unavailable' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
    },
  });
  const clientCall = vi.spyOn(AuthService.prototype, 'client').mockReturnValue(client);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/recover',
      headers: { origin: 'http://localhost:5173', 'x-tr-lab': '1' },
      payload: { email: 'synthetic@example.org' },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ code: 'RECOVERY_UNAVAILABLE' });
    expect(response.headers['cache-control']).toBe('no-store');
  } finally {
    flow.mockRestore();
    clientCall.mockRestore();
  }
});
