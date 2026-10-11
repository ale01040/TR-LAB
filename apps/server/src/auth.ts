import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool } from 'pg';
import { z } from 'zod';
import { credentialsSchema } from '@tr-lab/contracts';
import type { Config } from './config.js';
import { decrypt, encrypt, hash, opaque } from './crypto.js';

type TokenPair = { access_token: string; refresh_token: string; expires_at: number };
type StoredSession = {
  token_hash: string;
  public_id: string;
  user_id: string;
  email: string;
  encrypted_tokens: string;
  csrf: string;
  expires_at: Date;
  recovery: boolean;
};
export type Authenticated = { row: StoredSession; client: SupabaseClient; tokens: TokenPair };
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
type FlowStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
export class AuthService {
  readonly pool: Pool | null;
  readonly key: Buffer;
  readonly cookie: string;
  constructor(readonly config: Config) {
    this.pool = config.DATABASE_URL
      ? new Pool({
          connectionString: config.DATABASE_URL,
          max: 10,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          options: '-c statement_timeout=25000',
        })
      : null;
    this.key = config.SESSION_ENCRYPTION_KEY
      ? Buffer.from(config.SESSION_ENCRYPTION_KEY, 'base64')
      : Buffer.alloc(32);
    this.cookie = config.NODE_ENV === 'production' ? '__Host-tr-lab' : 'tr-lab-local';
  }
  client(token?: string, storage?: FlowStorage) {
    if (!this.pool) throw new HttpError(503, 'NOT_CONFIGURED');
    return createClient(this.config.SUPABASE_URL, this.config.SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: !!storage,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
        ...(storage ? { storage } : {}),
      },
      global: {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
      },
    });
  }
  setCookie(reply: FastifyReply, value: string, maxAge = 7 * 86400) {
    reply.setCookie(this.cookie, value, {
      path: '/',
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });
  }
  async establish(
    session: Session,
    request: FastifyRequest,
    reply: FastifyReply,
    recovery = false,
  ) {
    if (!this.pool || !session.expires_at) throw new HttpError(503, 'NOT_CONFIGURED');
    const token = opaque();
    const pair: TokenPair = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    };
    const previous = request.cookies[this.cookie];
    if (previous)
      await this.pool.query('delete from tr_lab_private.sessions where token_hash=$1', [
        hash(previous),
      ]);
    await this.pool.query(
      "insert into tr_lab_private.sessions(token_hash,public_id,user_id,email,encrypted_tokens,csrf,expires_at,recovery) values($1,$2,$3,$4,$5,$6,now()+interval '7 days',$7)",
      [
        hash(token),
        randomUUID(),
        session.user.id,
        session.user.email ?? '',
        encrypt(JSON.stringify(pair), this.key),
        opaque(),
        recovery,
      ],
    );
    this.setCookie(reply, token);
  }
  async resolve(request: FastifyRequest): Promise<Authenticated | null> {
    const token = request.cookies[this.cookie];
    if (!token || !this.pool) return null;
    const connection = await this.pool.connect();
    try {
      await connection.query('begin');
      const result = await connection.query<StoredSession>(
        'select * from tr_lab_private.sessions where token_hash=$1 and expires_at>now() for update',
        [hash(token)],
      );
      const row = result.rows[0];
      if (!row) {
        await connection.query('commit');
        return null;
      }
      let pair = JSON.parse(decrypt(row.encrypted_tokens, this.key)) as TokenPair;
      if (pair.expires_at < Date.now() / 1000 + 30) {
        const refreshed = await this.client().auth.refreshSession({
          refresh_token: pair.refresh_token,
        });
        if (
          refreshed.error &&
          (!refreshed.error.status ||
            refreshed.error.status >= 500 ||
            refreshed.error.status === 429)
        )
          throw new HttpError(503, 'AUTH_UNAVAILABLE');
        if (refreshed.error || !refreshed.data.session?.expires_at) {
          await connection.query('delete from tr_lab_private.sessions where token_hash=$1', [
            row.token_hash,
          ]);
          await connection.query('commit');
          return null;
        }
        pair = {
          access_token: refreshed.data.session.access_token,
          refresh_token: refreshed.data.session.refresh_token,
          expires_at: refreshed.data.session.expires_at,
        };
        await connection.query(
          'update tr_lab_private.sessions set encrypted_tokens=$2 where token_hash=$1',
          [row.token_hash, encrypt(JSON.stringify(pair), this.key)],
        );
      }
      await connection.query('commit');
      const client = this.client(pair.access_token);
      const verified = await client.auth.getUser(pair.access_token);
      if (
        verified.error &&
        (!verified.error.status || verified.error.status >= 500 || verified.error.status === 429)
      )
        throw new HttpError(503, 'AUTH_UNAVAILABLE');
      if (verified.error || verified.data.user?.id !== row.user_id) return null;
      return { row, client, tokens: pair };
    } catch (error) {
      await connection.query('rollback');
      throw error;
    } finally {
      connection.release();
    }
  }
  async require(request: FastifyRequest): Promise<Authenticated> {
    const auth = await this.resolve(request);
    if (!auth) throw new HttpError(401, 'UNAUTHENTICATED');
    if (auth.row.recovery) throw new HttpError(403, 'PASSWORD_CHANGE_REQUIRED');
    // La cookie può cambiare mentre un worker offline del precedente account è ancora in corso.
    // Il proprietario resta derivato dalla sessione: questo header è soltanto una precondizione.
    if (request.headers['x-account-id'] !== auth.row.user_id)
      throw new HttpError(409, 'ACCOUNT_CHANGED');
    if (request.method !== 'GET' && request.headers['x-csrf-token'] !== auth.row.csrf)
      throw new HttpError(403, 'CSRF_REJECTED');
    return auth;
  }
  async flow(kind: 'google' | 'signup' | 'recover', reply: FastifyReply) {
    if (!this.pool) throw new HttpError(503, 'NOT_CONFIGURED');
    const pool = this.pool;
    const id = opaque();
    const state = opaque();
    await pool.query('delete from tr_lab_private.auth_flows where expires_at<now()');
    await pool.query(
      "insert into tr_lab_private.auth_flows(id,state,kind,expires_at) values($1,$2,$3,now()+interval '1 hour')",
      [hash(id), hash(state), kind],
    );
    reply.setCookie('tr-lab-flow', id, {
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 3600,
    });
    const storage: FlowStorage = {
      getItem: async (name) => {
        if (!name.endsWith('code-verifier')) return null;
        const r = await pool.query<{ verifier: string | null }>(
          'select verifier from tr_lab_private.auth_flows where id=$1 and expires_at>now()',
          [hash(id)],
        );
        return r.rows[0]?.verifier ? decrypt(r.rows[0].verifier, this.key) : null;
      },
      setItem: async (name, value) => {
        if (name.endsWith('code-verifier'))
          await pool.query('update tr_lab_private.auth_flows set verifier=$2 where id=$1', [
            hash(id),
            encrypt(value, this.key),
          ]);
      },
      removeItem: async () => {},
    };
    return {
      id,
      state,
      storage,
      redirect: `${this.config.APP_ORIGIN}/api/auth/callback?state=${encodeURIComponent(state)}`,
    };
  }
}
function passwordPolicy(password: string) {
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72)
    throw new HttpError(400, 'INVALID_PASSWORD');
}
export function authRoutes(app: FastifyInstance, auth: AuthService) {
  app.get('/api/auth/session', async (request) => {
    const result = await auth.resolve(request);
    return {
      configured: !!auth.pool,
      user: result
        ? {
            id: result.row.user_id,
            email: result.row.email,
            sessionId: result.row.public_id,
            csrf: result.row.csrf,
            recovery: result.row.recovery,
          }
        : null,
    };
  });
  app.post('/api/auth/login', async (request, reply) => {
    const input = z
      .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
      .strict()
      .parse(request.body);
    const result = await auth.client().auth.signInWithPassword(input);
    if (result.error || !result.data.session) throw new HttpError(401, 'INVALID_CREDENTIALS');
    await auth.establish(result.data.session, request, reply);
    return { message: 'Accesso completato.' };
  });
  app.post('/api/auth/signup', async (request, reply) => {
    const input = credentialsSchema.extend({ adults: z.literal(true) }).parse(request.body);
    passwordPolicy(input.password);
    const flow = await auth.flow('signup', reply);
    const result = await auth.client(undefined, flow.storage).auth.signUp({
      email: input.email,
      password: input.password,
      options: { emailRedirectTo: flow.redirect, data: { adults_confirmed: true } },
    });
    if (result.error) throw new HttpError(400, 'SIGNUP_FAILED');
    if (result.data.session) await auth.establish(result.data.session, request, reply);
    return {
      message:
        'Se la registrazione è possibile, riceverai le istruzioni via email. Conferma l’indirizzo e accedi.',
    };
  });
  app.post('/api/auth/recover', async (request, reply) => {
    const input = z
      .object({ email: z.email().max(254) })
      .strict()
      .parse(request.body);
    const flow = await auth.flow('recover', reply);
    await auth
      .client(undefined, flow.storage)
      .auth.resetPasswordForEmail(input.email, { redirectTo: flow.redirect });
    return {
      message:
        'Se l’indirizzo è registrato, riceverai le istruzioni via email. Apri il link sullo stesso browser.',
    };
  });
  app.post('/api/auth/google', async (_request, reply) => {
    const flow = await auth.flow('google', reply);
    const result = await auth.client(undefined, flow.storage).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: flow.redirect, skipBrowserRedirect: true },
    });
    if (result.error || !result.data.url) throw new HttpError(503, 'OAUTH_UNAVAILABLE');
    return { url: result.data.url };
  });
  app.get('/api/auth/callback', async (request, reply) => {
    const query = z
      .object({ code: z.string().min(1).max(4096), state: z.string().min(1).max(200) })
      .parse(request.query);
    const id = request.cookies['tr-lab-flow'];
    if (!auth.pool || !id) throw new HttpError(400, 'INVALID_OAUTH_STATE');
    const result = await auth.pool.query<{ verifier: string; kind: string }>(
      'delete from tr_lab_private.auth_flows where id=$1 and state=$2 and expires_at>now() returning verifier,kind',
      [hash(id), hash(query.state)],
    );
    const flow = result.rows[0];
    if (!flow?.verifier) throw new HttpError(400, 'INVALID_OAUTH_STATE');
    const verifier = decrypt(flow.verifier, auth.key);
    const client = auth.client(undefined, {
      getItem: async (name) => (name.endsWith('code-verifier') ? verifier : null),
      setItem: async () => {},
      removeItem: async () => {},
    });
    const exchange = await client.auth.exchangeCodeForSession(query.code);
    if (exchange.error || !exchange.data.session) throw new HttpError(400, 'OAUTH_FAILED');
    await auth.establish(exchange.data.session, request, reply, flow.kind === 'recover');
    reply.clearCookie('tr-lab-flow', { path: '/api/auth' });
    return reply.redirect('/profilo');
  });
  app.post('/api/auth/password', async (request) => {
    const input = z
      .object({ password: z.string().min(12).max(128) })
      .strict()
      .parse(request.body);
    passwordPolicy(input.password);
    const current = await auth.resolve(request);
    if (!current || request.headers['x-csrf-token'] !== current.row.csrf)
      throw new HttpError(403, 'CSRF_REJECTED');
    const initialized = await current.client.auth.setSession(current.tokens);
    if (initialized.error) throw new HttpError(401, 'UNAUTHENTICATED');
    const result = await current.client.auth.updateUser({ password: input.password });
    if (result.error) throw new HttpError(400, 'PASSWORD_CHANGE_FAILED');
    // Cambio credenziale: tutte le altre sessioni BFF perdono subito l'accesso.
    await auth.pool?.query(
      'delete from tr_lab_private.sessions where user_id=$1 and token_hash<>$2',
      [current.row.user_id, current.row.token_hash],
    );
    await auth.pool?.query(
      'update tr_lab_private.sessions set recovery=false where token_hash=$1',
      [current.row.token_hash],
    );
    return { message: 'Password aggiornata. Le altre sessioni TR LAB sono state chiuse.' };
  });
  app.post('/api/auth/logout', async (request, reply) => {
    const input = z.object({ sessionId: z.uuid() }).strict().parse(request.body);
    const current = await auth.resolve(request);
    if (current) {
      if (
        current.row.public_id !== input.sessionId ||
        current.row.csrf !== request.headers['x-csrf-token']
      )
        throw new HttpError(403, 'CSRF_REJECTED');
      await auth.pool?.query('delete from tr_lab_private.sessions where token_hash=$1', [
        current.row.token_hash,
      ]);
    }
    auth.setCookie(reply, '', 0);
    return { message: 'Uscita completata.' };
  });
}
