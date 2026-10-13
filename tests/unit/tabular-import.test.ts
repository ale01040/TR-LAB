import { expect, it } from 'vitest';
import { utils, write } from 'xlsx';
import { builtInCatalog, programSchema } from '@tr-lab/contracts';
import { mapWorkoutWorkbook, uuidSequence } from '@tr-lab/domain';
import { readWorkbook } from '../../apps/web/src/import/xlsx-reader';
const seed = '00000000-0000-4000-8000-000000000001';
function fixture() {
  const book = utils.book_new(),
    e = builtInCatalog[0]!;
  const tables: Record<string, unknown[][]> = {
    Programma: [
      ['chiave', 'valore'],
      ['formato', 'tr-lab-tabular'],
      ['versione', 1],
      ['obiettivo', 'strength'],
    ],
    Giorni: [
      ['id', 'ordine', 'nome', 'focus'],
      ['A', 1, 'Giorno A', 'Forza'],
    ],
    Esercizi: [
      ['id', 'giorno_id', 'ordine', 'esercizio_id', 'nome', 'note', 'superset', 'accumulo'],
      ['P1', 'A', 1, e.id, e.name, '', null, 'false'],
    ],
    Serie: [
      [
        'id',
        'posizione_id',
        'ordine',
        'rip_min',
        'rip_max',
        'rir',
        'recupero_s',
        'carico_g',
        'tipo',
        'lato',
      ],
      ['S1', 'P1', 1, 5, 5, 0, 180, 0, 'work', 'both'],
    ],
    Settimane: [
      ['ordine', 'nome', 'fase', 'extra_serie', 'rir'],
      [1, 'Base', 'base', 0, null],
    ],
  };
  for (const [name, rows] of Object.entries(tables))
    utils.book_append_sheet(book, utils.aoa_to_sheet(rows), name);
  return book;
}
function map(book = fixture()) {
  return mapWorkoutWorkbook(
    readWorkbook(new Uint8Array(write(book, { type: 'array', bookType: 'xlsx' }))),
    {
      catalog: builtInCatalog,
      choices: { exercises: {}, phases: {} },
      nextId: uuidSequence(seed),
      now: '2026-10-13T00:00:00.000Z',
      name: 'Standard sintetico',
      goal: 'strength',
    },
  );
}
it('cinque fogli standard → JSON v1 valido, relazioni/grammi/secondi/null/zero conservati', () => {
  const result = map();
  expect(result.profile).toBe('tr-lab-tabular-1');
  expect(programSchema.safeParse(result.program).success).toBe(true);
  expect(result.program?.days[0]?.exercises[0]?.targets[0]).toMatchObject({
    repsMin: 5,
    repsMax: 5,
    rir: 0,
    restSeconds: 180,
    loadGrams: 0,
  });
  expect(result.program?.weeks[0]?.rir).toBeNull();
  expect(result.program?.id).not.toBe(seed);
});
it('ID locali duplicati, padre mancante e formule non diventano righe importate', () => {
  const missing = fixture();
  missing.Sheets.Serie!.B2 = { t: 's', v: 'assente' };
  expect(map(missing).issues.some((i) => i.code === 'MISSING_PARENT')).toBe(true);
  expect(map(missing).program).toBeNull();
  const duplicate = fixture();
  duplicate.Sheets.Serie!['!ref'] = 'A1:K3';
  for (let c = 0; c < 11; c++) {
    const old = duplicate.Sheets.Serie![utils.encode_cell({ r: 1, c })];
    if (old) duplicate.Sheets.Serie![utils.encode_cell({ r: 2, c })] = { ...old };
  }
  expect(map(duplicate).issues.some((i) => i.code === 'DUPLICATE_ID')).toBe(true);
  const formula = fixture();
  formula.Sheets.Serie!.F2 = { t: 'n', f: '1-1', v: 0 };
  expect(map(formula).program).toBeNull();
});
it('ordine frazionario e metrica non supportata sono errori, senza coercizioni', () => {
  const order = fixture();
  order.Sheets.Giorni!.B2 = { t: 'n', v: 1.5 };
  expect(map(order).issues.some((i) => i.code === 'INVALID_ORDER')).toBe(true);
  const metric = fixture();
  metric.Sheets.Serie!.J2 = { t: 's', v: 'duration' };
  expect(map(metric).program).toBeNull();
});
