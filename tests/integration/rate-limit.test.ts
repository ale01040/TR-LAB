import { afterEach, expect, it } from 'vitest';
import { buildApp } from '../../apps/server/src/app';
import { loadConfig } from '../../apps/server/src/config';
let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});
it('la soglia API restituisce 429 e Retry-After invece di INTERNAL_ERROR', async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test' }), { serveWeb: false });
  for (let i = 0; i < 100; i++) expect((await app.inject('/api/health')).statusCode).toBe(200);
  const limited = await app.inject('/api/health');
  expect(limited.statusCode).toBe(429);
  expect(limited.json()).toEqual({ code: 'RATE_LIMITED' });
  expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
});
it('il caricamento degli asset non consuma la quota API e resta disponibile dopo il limite', async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test' }), { serveWeb: false });
  // Prova una route non API senza dipendere dalla presenza degli artefatti di build.
  app.get('/static-probe', () => 'Fixture asset');
  for (let i = 0; i < 120; i++) expect((await app.inject('/static-probe')).statusCode).toBe(200);
  for (let i = 0; i < 100; i++) expect((await app.inject('/api/health')).statusCode).toBe(200);
  expect((await app.inject('/api/health')).statusCode).toBe(429);
  expect((await app.inject('/static-probe')).statusCode).toBe(200);
});
