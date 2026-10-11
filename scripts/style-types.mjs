import { readFileSync, writeFileSync } from 'node:fs';
import { format } from 'prettier';
const path = 'apps/web/src/styles/App.module.css';
const names = [
  ...new Set([...readFileSync(path, 'utf8').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])),
].sort();
const source = `// Generato da scripts/style-types.mjs; evita classi CSS mancanti silenziose.\ndeclare const styles: {\n${names.map((name) => `  readonly '${name}': string;`).join('\n')}\n};\nexport default styles;\n`;
const output = await format(source, {
  ...JSON.parse(readFileSync('.prettierrc.json', 'utf8')),
  parser: 'typescript',
});
if (readFileSync(`${path}.d.ts`, 'utf8') !== output) writeFileSync(`${path}.d.ts`, output);
