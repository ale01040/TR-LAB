import { expect, it } from 'vitest';
import { loadConfig } from '../../apps/server/src/config';
import { deploymentConfig } from '../../apps/server/src/vercel';
const configured = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
  DATABASE_URL: 'postgresql://test:synthetic@example.test:5432/postgres?sslmode=verify-full',
  SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};
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
