import process from 'node:process';
process.env.APP_ORIGIN ??= 'http://localhost:3001';
await import('../apps/server/dist/index.js');
