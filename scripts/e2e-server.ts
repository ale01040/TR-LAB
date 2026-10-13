import { buildApp } from '../apps/server/src/app';
import { loadConfig } from '../apps/server/src/config';
// Origine isolata e nessun env file: i test non toccano account o database del committente.
const config = loadConfig({
  NODE_ENV: 'test',
  DEPLOYMENT_MODE: 'device-preview',
  HOST: '127.0.0.1',
  PORT: '3007',
  APP_ORIGIN: 'http://127.0.0.1:3007',
});
const app = await buildApp(config);
await app.listen({ host: config.HOST, port: config.PORT });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
