import { build } from 'esbuild';
import { mkdir, readdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve('.');
const mode = process.argv[2] ?? 'device-preview';
if (!['device-preview', 'connected'].includes(mode)) throw new Error('Modalità deploy non valida.');
const staging = resolve('.analysis', `vercel-preview-${Date.now()}`);
const source = resolve('apps/web/dist');
const allowed = new Set(['.html', '.js', '.css', '.svg', '.webmanifest', '.png', '.woff2']);
const inventory = [];
async function copyAssets(directory, prefix = '') {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const name = join(prefix, file.name);
    if (file.isDirectory()) await copyAssets(join(directory, file.name), name);
    else {
      if (!file.isFile() || !allowed.has(extname(file.name)))
        throw new Error(`Asset non ammesso: ${name}`);
      const destination = join(staging, 'public', name);
      await mkdir(resolve(destination, '..'), { recursive: true });
      await copyFile(join(directory, file.name), destination);
      inventory.push(name.replaceAll('\\', '/'));
    }
  }
}
await mkdir(join(staging, 'api'), { recursive: true });
await copyAssets(source);
// Il link CLI può creare .env.local/OIDC: la whitelist non lo include nel deploy.
await writeFile(
  join(staging, '.vercelignore'),
  '*\n!public\n!public/**\n!api\n!api/**\n!package.json\n!vercel.json\n',
);
// Bundle CJS standalone: nessun node_modules Windows, documento privato o ambiente entra nel pacchetto.
await build({
  entryPoints: [join(root, 'apps/server/src/vercel.ts')],
  outfile: join(staging, 'api/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  sourcemap: false,
  external: ['pg-native'],
  define: { 'import.meta.url': 'undefined' },
});
const settings = JSON.parse(await readFile('vercel.json', 'utf8'));
await writeFile(
  join(staging, 'vercel.json'),
  JSON.stringify(
    {
      ...settings,
      buildCommand: '',
      installCommand: '',
      outputDirectory: 'public',
      env: { DEPLOYMENT_MODE: mode },
      regions: ['dub1'],
      functions: { 'api/index.js': { maxDuration: 60 } },
    },
    null,
    2,
  ),
);
await writeFile(
  join(staging, 'package.json'),
  JSON.stringify(
    {
      name: 'tr-lab-preview',
      version: '0.1.0',
      private: true,
      type: 'commonjs',
      engines: { node: '24.x' },
    },
    null,
    2,
  ),
);
const digest = createHash('sha256')
  .update(await readFile(join(staging, 'api/index.js')))
  .digest('hex');
await writeFile(
  join(staging, 'inventory.json'),
  JSON.stringify({ mode, assets: inventory.sort(), serverSha256: digest }, null, 2),
);
console.log(
  JSON.stringify({
    staging,
    mode,
    assets: inventory.length,
    serverSha256: digest,
  }),
);
