import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import type { FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { AuthService } from '../../apps/server/src/auth';
import { loadConfig } from '../../apps/server/src/config';
import { encrypt, hash, decrypt } from '../../apps/server/src/crypto';

let database: PGlite;
const key = Buffer.alloc(32);
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const cookie = 'synthetic-session-cookie';
const request = { cookies: { 'tr-lab-local': cookie } } as unknown as FastifyRequest;
const oldPair = { access_token: 'old-access', refresh_token: 'old-refresh', expires_at: 1 };
const newPair = {
  access_token: 'new-access',
  refresh_token: 'new-refresh',
  expires_at: 2000000000,
};
beforeAll(async () => {
  database = new PGlite();
  await database.exec(`create schema tr_lab_private;
    create table tr_lab_private.sessions(token_hash text primary key, public_id uuid, user_id uuid,
    email text, encrypted_tokens text, csrf text, expires_at timestamptz, recovery boolean);`);
  await database.exec(
    await readFile('supabase/migrations/20261012233715_session_refresh_lease.sql', 'utf8'),
  );
});
beforeEach(async () => {
  await database.exec('truncate tr_lab_private.sessions');
  await database.query(
    `insert into tr_lab_private.sessions(token_hash,public_id,user_id,email,
    encrypted_tokens,csrf,expires_at,recovery) values($1,$2,$3,$4,$5,$6,now()+interval '1 day',false)`,
    [
      hash(cookie),
      crypto.randomUUID(),
      owner,
      'synthetic@example.org',
      encrypt(JSON.stringify(oldPair), key),
      'nonce',
    ],
  );
});
afterAll(async () => {
  await database.close();
});

function service(refresh: () => Promise<unknown>) {
  const auth = new AuthService(loadConfig({ NODE_ENV: 'test' }));
  // Adapter PostgreSQL reale (PGlite), provider sintetico: questa prova non è un login cloud.
  const connect = vi.fn(() => {
    throw new Error('Transazione lunga vietata');
  });
  Object.defineProperty(auth, 'pool', {
    value: { query: (sql: string, values: unknown[]) => database.query(sql, values), connect },
  });
  const verified = vi.fn(async () => ({ data: { user: { id: owner } }, error: null }));
  vi.spyOn(auth, 'client').mockReturnValue({
    auth: { refreshSession: refresh, getUser: verified },
  } as unknown as SupabaseClient);
  return { auth, connect, verified };
}
function refreshed() {
  return { data: { session: { ...newPair, user: { id: owner } } }, error: null };
}
it('due richieste fanno una sola rotazione e nessuna transazione attraversa Auth · S10', async () => {
  let finish!: (value: unknown) => void;
  const refresh = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { auth, connect } = service(refresh);
  const first = auth.resolve(request);
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  const second = auth.resolve(request);
  finish(refreshed());
  const results = await Promise.all([first, second]);
  expect(results.every((r) => r?.tokens.refresh_token === newPair.refresh_token)).toBe(true);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(connect).not.toHaveBeenCalled();
  const row = (
    await database.query<{ token_version: number; refresh_lease_id: string | null }>(
      'select * from tr_lab_private.sessions',
    )
  ).rows[0];
  expect(String(row?.token_version)).toBe('2');
  expect(row?.refresh_lease_id).toBeNull();
});
it('logout durante la rotazione impedisce il salvataggio tardivo · S10', async () => {
  let finish!: (value: unknown) => void;
  const refresh = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { auth } = service(refresh);
  const task = auth.resolve(request);
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  await database.query('delete from tr_lab_private.sessions where token_hash=$1', [hash(cookie)]);
  finish(refreshed());
  expect(await task).toBeNull();
  expect((await database.query('select * from tr_lab_private.sessions')).rows).toEqual([]);
});
it('guasto temporaneo libera la lease e conserva i token per il retry · S09', async () => {
  const { auth } = service(async () => ({ data: { session: null }, error: { status: 503 } }));
  await expect(auth.resolve(request)).rejects.toThrow('AUTH_UNAVAILABLE');
  const row = (
    await database.query<{ encrypted_tokens: string; refresh_lease_id: null }>(
      'select * from tr_lab_private.sessions',
    )
  ).rows[0];
  expect(row?.refresh_lease_id).toBeNull();
  expect(JSON.parse(decrypt(row?.encrypted_tokens ?? '', key))).toEqual(oldPair);
});
it('lease abbandonata e scaduta viene recuperata senza resettare la sessione · S10', async () => {
  await database.query(
    "update tr_lab_private.sessions set refresh_lease_id=$1,refresh_lease_until=now()-interval '1 second'",
    [crypto.randomUUID()],
  );
  const { auth } = service(async () => refreshed());
  expect((await auth.resolve(request))?.tokens).toEqual(newPair);
});
it('un errore definitivo o un utente diverso non produce una sessione valida · S10/S13', async () => {
  const { auth } = service(async () => ({
    data: { session: { ...newPair, user: { id: crypto.randomUUID() } } },
    error: null,
  }));
  expect(await auth.resolve(request)).toBeNull();
  expect((await database.query('select * from tr_lab_private.sessions')).rows).toEqual([]);
});
