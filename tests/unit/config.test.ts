import { expect, it } from 'vitest';
import { loadConfig } from '../../apps/server/src/config';
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
