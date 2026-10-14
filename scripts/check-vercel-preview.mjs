import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, sep } from 'node:path';

const directory = resolve(process.argv[2] ?? '');
if (!directory.startsWith(resolve('.analysis') + sep))
  throw new Error('Indica un pacchetto nella cartella .analysis del progetto.');
// Il collaudo non legge .env e non può raggiungere Supabase.
for (const name of [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'DATABASE_URL',
  'SESSION_ENCRYPTION_KEY',
])
  process.env[name] = '';
process.env.VERCEL_ENV = 'preview';
process.env.VERCEL_URL = 'tr-lab-synthetic.vercel.app';
process.env.DEPLOYMENT_MODE = 'device-preview';
const handler = createRequire(import.meta.url)(resolve(directory, 'api/index.js')).default;
const server = createServer((request, response) => {
  void handler(request, response).catch(() => {
    response.statusCode = 500;
    response.end('ADAPTER_ERROR');
  });
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
try {
  const session = await fetch(`${origin}/api/auth/session`);
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), {
    user: null,
    configured: false,
    providers: { google: false },
  });
  assert.equal(session.headers.get('cache-control'), 'no-store');
  const blocked = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { origin: 'https://evil.test' },
  });
  assert.equal(blocked.status, 403);
  const unavailable = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: {
      origin: 'https://tr-lab-synthetic.vercel.app',
      'x-tr-lab': '1',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email: 'synthetic@example.org', password: 'synthetic-passphrase' }),
  });
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).code, 'NOT_CONFIGURED');
  assert.equal((await fetch(`${origin}/api/sync/bootstrap`)).status, 401);
  assert.equal((await fetch(`${origin}/api/unknown`)).status, 404);
  console.log(
    JSON.stringify({
      passed: true,
      checks: 5,
      mode: 'device-preview',
      transport: 'real HTTP / bundled CJS',
    }),
  );
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
