import assert from 'node:assert/strict';
import { transform } from 'esbuild';
import { mkdtemp, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Solo l'entrypoint realmente distribuito e il bundle, senza sorgenti, workspace o SDK installati.
const directory = await mkdtemp(join(tmpdir(), 'tr-lab-vercel-check-'));
await mkdir(join(directory, 'api'));
await mkdir(join(directory, 'apps/server/dist'), { recursive: true });
await writeFile(join(directory, 'package.json'), '{"type":"module"}\n');
const entry = await transform(await readFile('api/index.ts', 'utf8'), {
  loader: 'ts',
  format: 'esm',
  target: 'node24',
});
await writeFile(join(directory, 'api/index.js'), entry.code);
const settings = JSON.parse(await readFile('vercel.json', 'utf8'));
assert.equal(settings.functions['api/index.ts'].includeFiles, 'apps/server/dist/vercel.cjs');
await copyFile(
  resolve('apps/server/dist/vercel.cjs'),
  join(directory, 'apps/server/dist/vercel.cjs'),
);

// La prova non legge .env, non invia email e non può collegarsi a Supabase.
for (const name of [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'DATABASE_URL',
  'DATABASE_CA_CERT_BASE64',
  'SESSION_ENCRYPTION_KEY',
])
  delete process.env[name];
process.env.DEPLOYMENT_MODE = 'device-preview';
process.env.APP_ORIGIN = 'https://tr-lab-synthetic.vercel.app';
process.env.GOOGLE_AUTH_ENABLED = 'false';
const { default: handler } = await import(pathToFileURL(join(directory, 'api/index.js')).href);
const server = createServer((request, response) => {
  void handler(request, response).catch(() => {
    response.statusCode = 500;
    response.end('ADAPTER_ERROR');
  });
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  const session = await fetch(`${origin}/api/auth/session`);
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), {
    user: null,
    configured: false,
    providers: { google: false },
  });
  assert.equal(session.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(`${origin}/api/ready`)).status, 503);
  assert.equal((await fetch(`${origin}/api/sync/bootstrap`)).status, 401);
  assert.equal((await fetch(`${origin}/api/unknown`)).status, 404);
  const csrf = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { origin: 'https://evil.test' },
  });
  assert.equal(csrf.status, 403);
  const login = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: {
      origin: process.env.APP_ORIGIN,
      'x-tr-lab': '1',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email: 'synthetic@example.invalid', password: 'synthetic-passphrase' }),
  });
  assert.equal(login.status, 503);
  assert.equal((await login.json()).code, 'NOT_CONFIGURED');
  console.log(JSON.stringify({ passed: true, checks: 6, workspaceSourcesAvailable: false }));
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
