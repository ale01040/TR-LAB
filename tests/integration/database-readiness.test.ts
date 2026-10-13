import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildApp } from '../../apps/server/src/app';
import { loadConfig } from '../../apps/server/src/config';
import { createTestDatabase } from '../helpers/test-database';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeEach(async () => {
  db = await createTestDatabase([]);
  const config = loadConfig({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://provider.example.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
    DATABASE_URL: 'postgresql://synthetic@localhost/tr_lab_test_synthetic',
    SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  });
  app = await buildApp(config, {
    serveWeb: false,
    onPool: (pool) => {
      // Sostituisce solo il trasporto pg: SQL e grant reali sono eseguiti in PGlite.
      // Nessun database cloud, connessione TCP o provider Auth viene contattato.
      vi.spyOn(pool, 'query').mockImplementation((async (sql: string, values: unknown[] = []) =>
        db.transaction(async (tx) => {
          await tx.exec('set local role tr_lab_runtime');
          return tx.query(sql, values);
        })) as typeof pool.query);
    },
  });
});

afterEach(async () => {
  await app?.close();
  vi.restoreAllMocks();
  await db?.close();
});

it('dichiara pronto lo schema completo usando il ruolo runtime limitato', async () => {
  const response = await app.inject('/api/ready');
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ ready: true });
  expect(response.headers['cache-control']).toBe('no-store');
});

it('rifiuta una migrazione incompleta anche se la tabella sessioni esiste', async () => {
  await db.exec('alter table tr_lab_private.sessions drop column token_version');
  const response = await app.inject('/api/ready');
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ ready: false, code: 'DATABASE_UNAVAILABLE' });
});

it.each(['public.tr_lab_import_program(jsonb)', 'public.tr_lab_pull_v2(text,text,uuid)'])(
  'rifiuta lo schema senza %s anziché dare un falso pronto',
  async (signature) => {
    await db.exec(`drop function ${signature}`);
    const response = await app.inject('/api/ready');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ ready: false, code: 'DATABASE_SCHEMA_OUTDATED' });
  },
);

it('verifica i permessi della sessione senza usare il proprietario del database', async () => {
  await db.exec('revoke select on tr_lab_private.sessions from tr_lab_runtime');
  const response = await app.inject('/api/ready');
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ ready: false, code: 'DATABASE_UNAVAILABLE' });
});
