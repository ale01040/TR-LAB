import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { attachDatabasePool } from '@vercel/functions';

// La piattaforma controlla questi valori; l'Host di una richiesta non decide mai l'origine CSRF.
export function deploymentConfig(input: NodeJS.ProcessEnv = process.env) {
  const origin = input.APP_ORIGIN ?? (input.VERCEL_URL ? `https://${input.VERCEL_URL}` : undefined);
  return loadConfig({
    ...input,
    NODE_ENV: 'production',
    SERVER_RUNTIME: 'serverless',
    APP_ORIGIN: origin,
    DEPLOYMENT_MODE:
      input.DEPLOYMENT_MODE ?? (input.VERCEL_ENV === 'preview' ? 'device-preview' : 'connected'),
  });
}

let application: Promise<Awaited<ReturnType<typeof buildApp>>> | undefined;
export default async function handler(request: IncomingMessage, response: ServerResponse) {
  // Stessa API del server locale, senza porta in ascolto né file personali nella funzione.
  application ??= buildApp(deploymentConfig(), {
    serveWeb: false,
    onPool: attachDatabasePool,
  }).then(async (app) => {
    await app.ready();
    return app;
  });
  const app = await application;
  app.server.emit('request', request, response);
}
