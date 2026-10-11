import { mkdir, readdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const source = resolve('apps/web/dist');
const staging = resolve('.analysis', `netlify-preview-${Date.now()}`);
const publish = join(staging, 'publish');
const allowed = new Set(['.html', '.js', '.css', '.svg', '.webmanifest', '.png', '.woff2']);
const inventory = [];

// Solo la build pubblica: mai copiare la radice, ambienti o file del vault.
async function copyAssets(directory, prefix = '') {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const name = join(prefix, file.name);
    if (file.isDirectory()) await copyAssets(join(directory, file.name), name);
    else {
      if (!file.isFile() || !allowed.has(extname(file.name)))
        throw new Error(`Asset non ammesso: ${name}`);
      const destination = join(publish, name);
      await mkdir(resolve(destination, '..'), { recursive: true });
      await copyFile(join(directory, file.name), destination);
      inventory.push(name.replaceAll('\\', '/'));
    }
  }
}

await mkdir(publish, { recursive: true });
await copyAssets(source);
for (const required of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg'])
  if (!inventory.includes(required)) throw new Error(`Build incompleta: ${required}`);
await mkdir(join(publish, 'device-preview'), { recursive: true });
// Capacità pubblica e costante, non una sessione autenticata né un backend sostitutivo.
await writeFile(
  join(publish, 'device-preview/session.json'),
  JSON.stringify({ user: null, configured: false }) + '\n',
);
await writeFile(
  join(publish, 'device-preview/unavailable.json'),
  JSON.stringify({ code: 'BACKEND_NOT_CONFIGURED' }) + '\n',
);
await writeFile(
  join(publish, '_redirects'),
  [
    '# Le API non devono ricadere nel documento SPA.',
    '/api/auth/session /device-preview/session.json 200!',
    '/api /device-preview/unavailable.json 404!',
    '/api/* /device-preview/unavailable.json 404!',
    '# I file presenti prevalgono; un asset assente restituisce 404.',
    '/assets/* /404.html 404',
    '/sw.js /404.html 404',
    '/manifest.webmanifest /404.html 404',
    '/icon.svg /404.html 404',
    '/* /index.html 200',
    '',
  ].join('\n'),
);
const settings = JSON.parse(await readFile('vercel.json', 'utf8'));
const shared = settings.headers.find((entry) => entry.source === '/(.*)').headers;
await writeFile(
  join(publish, '_headers'),
  [
    '/*',
    ...shared.map(({ key, value }) => `  ${key}: ${value}`),
    '  X-Frame-Options: DENY',
    '/api/*',
    '  Content-Type: application/json; charset=utf-8',
    '  Cache-Control: private, no-store',
    '  Netlify-CDN-Cache-Control: no-store',
    '/api',
    '  Content-Type: application/json; charset=utf-8',
    '  Cache-Control: private, no-store',
    '  Netlify-CDN-Cache-Control: no-store',
    '/device-preview/*',
    '  Content-Type: application/json; charset=utf-8',
    '  Cache-Control: private, no-store',
    '  Netlify-CDN-Cache-Control: no-store',
    '/sw.js',
    '  Cache-Control: no-cache',
    '/index.html',
    '  Cache-Control: no-cache',
    '/manifest.webmanifest',
    '  Cache-Control: no-cache',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n'),
);
await writeFile(
  join(publish, '404.html'),
  '<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>File non disponibile — TR LAB</title><h1>File non disponibile</h1><p>Ricarica l’app per aggiornare i file. I dati salvati restano sul dispositivo.</p><a href="/">Apri TR LAB</a></html>\n',
);
await writeFile(
  join(publish, 'ISTRUZIONI_NETLIFY.txt'),
  [
    'TR LAB 0.1.0 alpha — pacchetto Netlify in modalità dispositivo',
    '',
    '1. Estrai lo ZIP in una cartella.',
    '2. Apri https://app.netlify.com/drop e accedi al tuo account.',
    '3. Trascina la cartella che contiene direttamente index.html, assets, _redirects e _headers.',
    '4. Apri l’URL HTTPS assegnato e prova anche /profilo e /programma ricaricando la pagina.',
    '',
    'Build già compilata: non occorrono npm, variabili ambiente o password.',
    'Schede, diario, misure e target manuali sono salvati nel browser.',
    'Login Google/email e sincronizzazione Supabase non sono attivi in questo pacchetto.',
    'Nessun dato si trasferisce automaticamente da localhost o Vercel al nuovo dominio.',
    'Il primo caricamento richiede Internet; attendi il download della PWA prima dell’uso offline.',
    'Esporta regolarmente il backup dal Profilo. Eliminare i dati del browser può cancellare il diario.',
    'Mantieni lo stesso dominio negli aggiornamenti e salva i campi prima di aggiornare la PWA.',
    '',
    'Codice e manuale completo: https://github.com/ale01040/TR-LAB',
    'Procedura: docs/operazioni/DEPLOY_NETLIFY.md nel repository.',
    '',
  ].join('\n'),
);
const generated = [
  '_redirects',
  '_headers',
  '404.html',
  'ISTRUZIONI_NETLIFY.txt',
  'device-preview/session.json',
  'device-preview/unavailable.json',
];
const files = [];
for (const name of [...inventory, ...generated].sort()) {
  const content = await readFile(join(publish, name));
  files.push({
    name,
    bytes: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
  });
}
// Inventario fuori dalla cartella pubblicata: utile per verificare lo ZIP senza esporre sorgenti.
await writeFile(
  join(staging, 'inventory.json'),
  JSON.stringify({ mode: 'device-preview', files }, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    staging,
    publish,
    mode: 'device-preview',
    assets: inventory.length,
    files: files.length,
  }),
);
