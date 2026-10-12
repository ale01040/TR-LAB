import { expect, it } from 'vitest';
import { loadConfig } from '../../apps/server/src/config';
import { deploymentConfig } from '../../apps/server/src/vercel';
import { databasePoolConfig } from '../../apps/server/src/database';
import { readFileSync } from 'node:fs';
const configured = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
  DATABASE_URL: 'postgresql://test:synthetic@example.test:5432/postgres?sslmode=verify-full',
  SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};
it('TLS portabile mantiene la verifica completa e rifiuta configurazioni ambigue', () => {
  const ca = readFileSync('certificates/supabase-prod-ca-2021.crt');
  const config = loadConfig({ ...configured, DATABASE_CA_CERT_BASE64: ca.toString('base64') });
  const pool = databasePoolConfig(config);
  expect(new URL(pool.connectionString!).searchParams.has('sslmode')).toBe(false);
  expect(pool.ssl).toEqual({ ca, rejectUnauthorized: true });
  expect(() =>
    loadConfig({
      ...configured,
      DATABASE_CA_CERT_BASE64: Buffer.from('PRIVATE KEY').toString('base64'),
    }),
  ).toThrow('CA');
  expect(() =>
    loadConfig({
      ...configured,
      DATABASE_CA_CERT_BASE64: ca.toString('base64'),
      DATABASE_URL: `${configured.DATABASE_URL}&sslrootcert=local.pem`,
    }),
  ).toThrow('sola configurazione');
  expect(databasePoolConfig(loadConfig(configured)).connectionString).toBe(configured.DATABASE_URL);
});
it('runtime Vercel usa un pool riutilizzabile limitato e non invia opzioni di startup al pooler', () => {
  const config = deploymentConfig({
    ...configured,
    DEPLOYMENT_MODE: 'connected',
    VERCEL_URL: 'tr-lab-synthetic.vercel.app',
  });
  const pool = databasePoolConfig(config);
  expect(config.SERVER_RUNTIME).toBe('serverless');
  expect(pool.max).toBe(2);
  expect(pool.idleTimeoutMillis).toBe(5000);
  expect(pool.options).toBeUndefined();
  expect(pool.query_timeout).toBe(25000);
});
it('il rilascio sul dominio stabile mantiene quella origine per CSRF e callback', () => {
  const config = deploymentConfig({
    ...configured,
    VERCEL_ENV: 'production',
    VERCEL_URL: 'tr-lab-build-synthetic.vercel.app',
    APP_ORIGIN: 'https://tr-lab.vercel.app',
  });
  expect(config.APP_ORIGIN).toBe('https://tr-lab.vercel.app');
  expect(config.DEPLOYMENT_MODE).toBe('connected');
  expect(config.SERVER_RUNTIME).toBe('serverless');
});
it('configurazione cloud rifiuta segreti API elevati e SSL non verificato', () => {
  expect(loadConfig(configured).SUPABASE_URL).toBe(configured.SUPABASE_URL);
  expect(() =>
    loadConfig({ ...configured, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_synthetic' }),
  ).toThrow('publishable');
  expect(() =>
    loadConfig({
      ...configured,
      DATABASE_URL: configured.DATABASE_URL.replace('?sslmode=verify-full', ''),
    }),
  ).toThrow('verify-full');
  expect(() => loadConfig({ SUPABASE_URL: configured.SUPABASE_URL })).toThrow('quattro');
});
it('preview HTTPS senza cloud è esplicita e non indebolisce il rilascio con account', () => {
  expect(
    deploymentConfig({ VERCEL_ENV: 'preview', VERCEL_URL: 'tr-lab-synthetic.vercel.app' })
      .DEPLOYMENT_MODE,
  ).toBe('device-preview');
  expect(() =>
    deploymentConfig({ VERCEL_ENV: 'production', VERCEL_URL: 'tr-lab-synthetic.vercel.app' }),
  ).toThrow('Supabase');
  expect(() =>
    deploymentConfig({
      ...configured,
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'tr-lab-synthetic.vercel.app',
    }),
  ).toThrow('credenziali cloud');
  expect(
    deploymentConfig({
      ...configured,
      VERCEL_ENV: 'preview',
      DEPLOYMENT_MODE: 'connected',
      VERCEL_URL: 'tr-lab-synthetic.vercel.app',
    }).APP_ORIGIN,
  ).toBe('https://tr-lab-synthetic.vercel.app');
});
it('URL database malformata non compare nel messaggio di errore', () => {
  const invalid = 'database-with-synthetic-password';
  try {
    loadConfig({ ...configured, DATABASE_URL: invalid });
    throw new Error('Configurazione accettata');
  } catch (error) {
    expect((error as Error).message).toContain('non valido');
    expect((error as Error).message).not.toContain(invalid);
  }
});
