import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { URL } from 'node:url';

const directory = resolve(process.argv[2] ?? '');
if (!directory.startsWith(resolve('.analysis') + sep))
  throw new Error('Indica un pacchetto nella cartella .analysis.');
const values = [process.env.DATABASE_URL, process.env.SESSION_ENCRYPTION_KEY];
if (!values.every(Boolean))
  throw new Error('Carica l’ambiente privato nel solo processo di controllo.');
values.push(decodeURIComponent(new URL(values[0]).password));
if (values.some((value) => value.length < 16)) throw new Error('Credenziali incomplete.');
let checked = 0;
async function scan(path) {
  for (const item of await readdir(path, { withFileTypes: true })) {
    const file = join(path, item.name);
    if (item.isDirectory()) await scan(file);
    else if (item.isFile()) {
      const body = await readFile(file, 'utf8');
      if (values.some((value) => body.includes(value)))
        throw new Error('Possibile segreto nel pacchetto: deploy bloccato.');
      checked++;
    }
  }
}
await scan(join(directory, 'public'));
await scan(join(directory, 'api'));
for (const file of ['package.json', 'vercel.json']) {
  const body = await readFile(join(directory, file), 'utf8');
  if (values.some((value) => body.includes(value)))
    throw new Error('Possibile segreto nel manifest.');
  checked++;
}
console.log(
  JSON.stringify({ passed: true, filesChecked: checked, credentialValuesPrinted: false }),
);
