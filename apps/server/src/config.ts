import { z } from 'zod';
import { X509Certificate } from 'node:crypto';
const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOYMENT_MODE: z.enum(['connected', 'device-preview']).default('connected'),
  SERVER_RUNTIME: z.enum(['persistent', 'serverless']).default('persistent'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_PUBLISHABLE_KEY: z.string().default(''),
  GOOGLE_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().default(''),
  DATABASE_CA_CERT_BASE64: z.string().default(''),
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
  if (config.DATABASE_CA_CERT_BASE64) {
    if (!parts.every(Boolean))
      throw new Error('Il certificato database richiede la configurazione cloud.');
    try {
      const certificate = new X509Certificate(
        Buffer.from(config.DATABASE_CA_CERT_BASE64, 'base64'),
      );
      if (!certificate.ca || Date.parse(certificate.validTo) <= Date.now())
        throw new Error('CA_INVALID');
    } catch {
      throw new Error(
        'Il certificato CA database deve essere valido, pubblico e codificato in base64.',
      );
    }
  }
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
    if (
      config.DATABASE_CA_CERT_BASE64 &&
      ['sslrootcert', 'sslcert', 'sslkey'].some((key) => database.searchParams.has(key))
    )
      throw new Error(
        'Usa una sola configurazione TLS: CA ambiente oppure percorsi dei certificati.',
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
