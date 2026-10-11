import { z } from 'zod';
const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOYMENT_MODE: z.enum(['connected', 'device-preview']).default('connected'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_PUBLISHABLE_KEY: z.string().default(''),
  DATABASE_URL: z.string().default(''),
  SESSION_ENCRYPTION_KEY: z.string().default(''),
});
export type Config = z.infer<typeof environment>;
export function loadConfig(input: NodeJS.ProcessEnv = process.env): Config {
  const config = environment.parse(input);
  const parts = [
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY,
    config.DATABASE_URL,
    config.SESSION_ENCRYPTION_KEY,
  ];
  if (parts.some(Boolean) && !parts.every(Boolean))
    throw new Error('Completa tutti i quattro valori Supabase/sessione in .env.');
  if (config.DEPLOYMENT_MODE === 'device-preview' && parts.some(Boolean))
    throw new Error('La preview dispositivo non può essere collegata a credenziali cloud.');
  if (parts.every(Boolean) && Buffer.from(config.SESSION_ENCRYPTION_KEY, 'base64').length !== 32)
    throw new Error('SESSION_ENCRYPTION_KEY deve contenere 32 byte in base64.');
  if (parts.every(Boolean)) {
    if (!config.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'))
      throw new Error('Usa una chiave Supabase publishable, non una chiave secret/service_role.');
    let provider: URL;
    let database: URL;
    try {
      provider = new URL(config.SUPABASE_URL);
      database = new URL(config.DATABASE_URL);
    } catch {
      // L'errore nativo URL contiene l'input: una connection string può includere la password.
      throw new Error(
        'URL Supabase o PostgreSQL non valido. Controlla i valori senza copiarli nei log.',
      );
    }
    if (!['postgres:', 'postgresql:'].includes(database.protocol))
      throw new Error('DATABASE_URL deve essere una connessione PostgreSQL.');
    const local = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
    if (!local(provider.hostname) && provider.protocol !== 'https:')
      throw new Error('Supabase remoto richiede HTTPS.');
    if (!local(database.hostname) && database.searchParams.get('sslmode') !== 'verify-full')
      throw new Error(
        'Database remoto: configura sslmode=verify-full e il certificato CA se richiesto.',
      );
  }
  if (
    config.NODE_ENV === 'production' &&
    ((config.DEPLOYMENT_MODE === 'connected' && !parts.every(Boolean)) ||
      !config.APP_ORIGIN.startsWith('https://'))
  )
    throw new Error(
      'Runtime produzione richiede HTTPS e Supabase configurato oppure la preview dispositivo esplicita.',
    );
  if (new URL(config.APP_ORIGIN).origin !== config.APP_ORIGIN)
    throw new Error('APP_ORIGIN deve essere una sola origine, senza path o slash finale.');
  return config;
}
