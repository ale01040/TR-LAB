import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { format } from 'prettier';
import { templateSchema } from '@tr-lab/contracts';
const schema = z.toJSONSchema(templateSchema);
schema.$id =
  'https://raw.githubusercontent.com/ale01040/TR-LAB/main/schemas/workout-program.v1.schema.json';
const template = templateSchema.parse(
  JSON.parse(await readFile('apps/web/src/data/excel-template.json', 'utf8')),
);
const day = structuredClone(template.program.days[0]);
const exercise = day?.exercises[0];
if (!day || !exercise) throw new Error('Fixture strutturale assente.');
exercise.targets = exercise.targets
  .slice(0, 1)
  .map((target) => ({ ...target, kind: 'work' as const, loadGrams: null }));
exercise.notes = '';
exercise.accumulation = false;
day.exercises = [exercise];
day.name = 'Giorno A';
day.focus = '';
const example = templateSchema.parse({
  ...template,
  program: {
    ...template.program,
    name: 'Esempio di formato · dati sintetici',
    source: '',
    status: 'draft',
    days: [day],
    weeks: [{ name: 'Base', phase: 'base', extraSets: 0, rir: null }],
  },
});
for (const [path, value] of [
  ['schemas/workout-program.v1.schema.json', schema],
  ['examples/programma.v1.json', example],
] as const) {
  await mkdir(path.split('/')[0] ?? '.', { recursive: true });
  await writeFile(path, await format(JSON.stringify(value), { parser: 'json', printWidth: 100 }));
  console.log(path);
}
