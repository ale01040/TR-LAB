import { createRequire } from 'node:module';
import type handler from '../apps/server/src/vercel.js';

// Il tracer della piattaforma non conserva gli export .ts dei workspace: carica l'artefatto comune.
const loadBundle = createRequire(import.meta.url);
const { default: compiledHandler }: { default: typeof handler } = loadBundle(
  '../apps/server/dist/vercel.cjs',
);
export default compiledHandler;
