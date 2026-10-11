import type { PoolConfig } from 'pg';
import type { Config } from './config.js';

export function databasePoolConfig(config: Config): PoolConfig {
  const serverless = config.SERVER_RUNTIME === 'serverless';
  let connectionString = config.DATABASE_URL;
  let ssl: PoolConfig['ssl'];
  if (config.DATABASE_CA_CERT_BASE64) {
    // pg sostituisce l'oggetto SSL se trova sslmode nella URL. La validazione ha già
    // richiesto verify-full: manteniamo la verifica di CA e hostname nell'oggetto SSL.
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    connectionString = url.href;
    ssl = { ca: Buffer.from(config.DATABASE_CA_CERT_BASE64, 'base64'), rejectUnauthorized: true };
  }
  return {
    connectionString,
    ...(ssl ? { ssl } : {}),
    max: serverless ? 2 : 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: serverless ? 5000 : 30000,
    query_timeout: 25000,
    // I parametri di startup non sono uno stato affidabile nel transaction pooler.
    ...(serverless ? {} : { options: '-c statement_timeout=25000' }),
  };
}
