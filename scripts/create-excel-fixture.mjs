import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
// Estrazione intermedia analizzata durante F0; gli output sono versionati e portabili.
const source = JSON.parse(readFileSync('.analysis/workbook-data.json', 'utf8'));
let index = 0;
const id = () => `10000000-0000-4000-8000-${String(++index).padStart(12, '0')}`;
const rows = source.find((s) => s.name === 'Scheda').values.slice(6, 31);
const catalog = [];
const days = ['A', 'B', 'C'].map((letter) => ({
  id: id(),
  name: `Giorno ${letter}`,
  focus: 'Full body',
  exercises: rows
    .filter((r) => r[0] === letter)
    .map((r) => {
      const name = r[2].replace(' (più leggero, più ripetizioni)', '');
      let exercise = catalog.find((e) => e.name === name);
      if (!exercise) {
        const equipment = /cavo|Face pull|Bayesian/.test(name)
          ? 'cable'
          : /bilanciere|T-bar/.test(name)
            ? 'barbell'
            : 'dumbbell';
        exercise = {
          id: `xls-${catalog.length + 1}`,
          name,
          muscle: r[5],
          secondary: [r[6], r[7]].filter(Boolean),
          equipment,
          pattern: /Squat|Polpacci|Hip thrust|Stacco|Leg curl/.test(name)
            ? 'lower'
            : /Rematore|Lat |row/.test(name)
              ? 'pull'
              : /Panca|press/.test(name)
                ? 'push'
                : 'accessory',
          unilateral: r[4] === 2,
          basis:
            equipment === 'dumbbell' ? 'per_dumbbell' : equipment === 'cable' ? 'machine' : 'total',
          instructions:
            'Verifica assetto, attrezzatura e tecnica prima di inserire il carico. Le note della tua scheda sono modificabili.',
        };
        catalog.push(exercise);
      }
      return {
        id: id(),
        exercise,
        targets: Array.from({ length: r[8] }, () => ({
          id: id(),
          repsMin: r[9],
          repsMax: r[10],
          rir: Number(String(r[11]).split('-')[0]),
          restSeconds: r[12],
          loadGrams: null,
          kind: 'work',
        })),
        notes: `Fonte: Scheda!C${rows.indexOf(r) + 7}. RIR originale: ${r[11]}. Verifica questi target prima dell'approvazione.`,
        superset: /[ab]$/.test(r[1]) ? String(r[1]).slice(0, -1) : null,
        accumulation: r[15] === 'Sì',
      };
    }),
}));
catalog.push(
  ...[
    ['push-up', 'Piegamenti a terra', 'Petto', 'push'],
    ['pull-up', 'Trazioni alla sbarra', 'Dorsali', 'pull'],
    ['body-squat', 'Squat a corpo libero', 'Quadricipiti', 'lower'],
  ].map(([exerciseId, name, muscle, pattern]) => ({
    id: exerciseId,
    name,
    muscle,
    secondary: [],
    equipment: 'bodyweight',
    pattern,
    unilateral: false,
    basis: 'bodyweight',
    instructions:
      'Scegli una variante adatta alla tua esperienza. La difficoltà della variante va tracciata separatamente dal carico.',
  })),
);
const programId = id();
const program = {
  id: programId,
  rootId: programId,
  name: 'Full body A / B / C',
  goal: 'hypertrophy',
  version: '1',
  status: 'draft',
  days,
  weeks: [
    { name: 'Test', phase: 'test', extraSets: 0, rir: null },
    { name: 'Base', phase: 'base', extraSets: 0, rir: null },
    ...[3, 4, 5].map((n) => ({
      name: `Accumulo ${n}`,
      phase: 'accumulation',
      extraSets: 1,
      rir: null,
    })),
    { name: 'Picco', phase: 'peak', extraSets: 1, rir: null },
    { name: 'Scarico', phase: 'deload', extraSets: 0, rir: 3 },
  ],
  createdAt: '2026-10-11T00:00:00.000Z',
  source:
    'Struttura adattata da SCHEDA PALESTRA 3 GIORNI.xlsx; nessun risultato personale importato.',
};
const hash = createHash('sha256')
  .update(readFileSync('SCHEDA PALESTRA 3 GIORNI.xlsx'))
  .digest('hex');
writeFileSync('apps/web/src/data/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
writeFileSync(
  'apps/web/src/data/excel-template.json',
  JSON.stringify(
    { format: 'workout-program', schema_version: 1, kind: 'program_template', program },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  'apps/web/src/data/excel-provenance.json',
  JSON.stringify(
    {
      sha256: hash,
      positions: 25,
      distinct: 24,
      adapted: true,
      exclusions: [
        'Profilo, pesate, misure e risultati personali',
        'Priorità e serie extra soltanto sul sinistro',
        'Note tecniche individuali e formule Excel',
      ],
      choices: [
        'RIR di intervallo: minimo conservato e intervallo riportato nelle note',
        'Settimana test: target base da verificare manualmente',
        'Scarico: metà serie arrotondata in alto, RIR 3 da verificare',
      ],
      warning:
        'Questa è una bozza strutturale adattata. Non è un import integrale delle prescrizioni originali.',
    },
    null,
    2,
  ) + '\n',
);
