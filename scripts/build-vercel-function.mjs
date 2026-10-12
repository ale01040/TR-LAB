import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// Git e pacchetto manuale usano lo stesso bundle: nessun export .ts di workspace nel runtime.
export async function buildVercelFunction(outfile) {
  await build({
    entryPoints: [resolve(root, 'apps/server/src/vercel.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    sourcemap: false,
    external: ['pg-native'],
    define: { 'import.meta.url': 'undefined' },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildVercelFunction(resolve(root, 'apps/server/dist/vercel.cjs'));
  console.log('Bundle Vercel standalone compilato.');
}
