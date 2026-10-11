import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false,
  noExternal: ['@tr-lab/contracts'],
  external: [
    'fastify',
    '@fastify/cookie',
    '@fastify/helmet',
    '@fastify/rate-limit',
    '@fastify/static',
    '@supabase/supabase-js',
    'pg',
    'zod',
  ],
});
