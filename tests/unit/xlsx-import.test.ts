import { expect, it } from 'vitest';
import { utils, write } from 'xlsx';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { exerciseSchema } from '@tr-lab/contracts';
import { mapWorkoutWorkbook } from '@tr-lab/domain';
import { readWorkbook, inspectXlsxContainer } from '../../apps/web/src/import/xlsx-reader';
import catalog from '../../packages/contracts/src/catalog.json';
const exercise = exerciseSchema.parse(catalog[0]);
function fixture(rir: number | string = '1-2') {
  const workbook = utils.book_new();
  utils.book_append_sheet(
    workbook,
    utils.aoa_to_sheet([
      [
        'Giorno',
        '#',
        'Esercizio',
        'Tipo',
        'Lati',
        'Gruppo primario',
        'Serie',
        'Rip min',
        'Rip max',
        'RIR',
        'Recupero (s)',
        'Esecuzione e note',
        '+1 serie sett. 3-6',
      ],
      [
        'A',
        '1',
        exercise.name,
        'Bilanciere',
        1,
        exercise.muscle,
        3,
        8,
        12,
        rir,
        90,
        'Fixture sintetica',
        'Sì',
      ],
    ]),
    'Scheda',
  );
  utils.book_append_sheet(
    workbook,
    utils.aoa_to_sheet([
      ['Settimana', 'Fase', 'Serie'],
      [1, 'Base', 'Come in Scheda'],
      [2, 'Accumulo', '+1 serie'],
      [3, 'Scarico', '−50%'],
    ]),
    'Periodizzazione',
  );
  utils.book_append_sheet(
    workbook,
    utils.aoa_to_sheet([['Dati esclusi'], ['Sintetici']]),
    'Misure',
  );
  return workbook;
}
function bytes(workbook = fixture()): Uint8Array {
  return new Uint8Array(write(workbook, { type: 'array', bookType: 'xlsx' }));
}
function context(rir?: 'lower' | 'upper') {
  return {
    catalog: [exercise],
    choices: { ...(rir ? { rir } : {}), exercises: {}, phases: {} },
    nextId: () => crypto.randomUUID(),
    now: '2026-10-13T00:00:00.000Z',
    name: 'Programma sintetico',
    goal: 'hypertrophy' as const,
  };
}
it('legge un vero ZIP XLSX, conserva struttura e richiede la scelta dell’intervallo RIR · QA-IMP-01', () => {
  const workbook = readWorkbook(bytes());
  const before = structuredClone(workbook);
  const unresolved = mapWorkoutWorkbook(workbook, context());
  expect(unresolved.program).toBeNull();
  expect(unresolved.issues.some((i) => i.code === 'RIR_RANGE')).toBe(true);
  const result = mapWorkoutWorkbook(workbook, context('lower'));
  expect(result.program?.days).toHaveLength(1);
  expect(result.program?.days[0]?.exercises[0]?.targets).toHaveLength(3);
  expect(result.program?.weeks.map((w) => w.phase)).toEqual(['base', 'accumulation', 'deload']);
  expect(result.program?.days[0]?.exercises[0]?.targets[0]?.rir).toBe(1);
  expect(result.issues.some((i) => i.sheet === 'Misure' && i.code === 'SECTION_EXCLUDED')).toBe(
    true,
  );
  expect(workbook).toEqual(before);
});
it('non esegue formule né accetta la cache come target approvabile · QA-IMP-01', () => {
  const workbook = fixture(0);
  workbook.Sheets.Scheda!.H2 = { t: 'n', f: 'SUM(4,4)', v: 8 };
  const parsed = readWorkbook(bytes(workbook));
  expect(parsed.sheets[0]?.cells.find((c) => c.address === 'H2')?.formula).toBe('SUM(4,4)');
  const result = mapWorkoutWorkbook(parsed, context());
  expect(result.program).toBeNull();
  expect(result.issues.some((i) => i.cell === 'H2' && i.code === 'INVALID_TARGET')).toBe(true);
});
it('RIR zero resta zero, un campo mancante o un intervallo invertito resta un errore', () => {
  expect(
    mapWorkoutWorkbook(readWorkbook(bytes(fixture(0))), context()).program?.days[0]?.exercises[0]
      ?.targets[0]?.rir,
  ).toBe(0);
  expect(
    mapWorkoutWorkbook(readWorkbook(bytes(fixture('2-1'))), context('lower')).program,
  ).toBeNull();
  const workbook = fixture(0);
  delete workbook.Sheets.Scheda!.K2;
  expect(mapWorkoutWorkbook(readWorkbook(bytes(workbook)), context()).program).toBeNull();
});
it('un nome sconosciuto richiede associazione, non crea un esercizio inventato', () => {
  const workbook = fixture(0);
  workbook.Sheets.Scheda!.C2 = { t: 's', v: 'Variante privata sintetica' };
  const parsed = readWorkbook(bytes(workbook));
  const first = mapWorkoutWorkbook(parsed, context());
  expect(first.program).toBeNull();
  expect(first.unresolved).toHaveLength(1);
  const chosen = context();
  chosen.choices.exercises = { ['Scheda!C2']: exercise.id };
  expect(mapWorkoutWorkbook(parsed, chosen).program?.days[0]?.exercises[0]?.exercise.id).toBe(
    exercise.id,
  );
});
it('settimane fuori ordine e fase sconosciuta non vengono convertite silenziosamente', () => {
  const workbook = fixture(0);
  workbook.Sheets.Periodizzazione!.A3 = { t: 'n', v: 4 };
  expect(mapWorkoutWorkbook(readWorkbook(bytes(workbook)), context()).program).toBeNull();
  workbook.Sheets.Periodizzazione!.A3 = { t: 'n', v: 2 };
  workbook.Sheets.Periodizzazione!.B3 = { t: 's', v: 'Intensificazione' };
  const parsed = readWorkbook(bytes(workbook));
  expect(mapWorkoutWorkbook(parsed, context()).unknownPhases).toHaveLength(1);
  const chosen = context();
  chosen.choices.phases = { 'Periodizzazione!B3': 'peak' };
  expect(mapWorkoutWorkbook(parsed, chosen).program?.weeks[1]?.phase).toBe('peak');
});
it('ZIP incompleto, macro ed entità XML sono respinti prima del parser', () => {
  const valid = bytes();
  expect(() => readWorkbook(valid.subarray(0, valid.length - 10))).toThrow('incompleto');
  const contents = unzipSync(valid);
  contents['xl/vbaProject.bin'] = new Uint8Array([1, 2, 3]);
  expect(() => readWorkbook(zipSync(contents))).toThrow('attive');
  delete contents['xl/vbaProject.bin'];
  contents['xl/workbook.xml'] = strToU8('<!DOCTYPE workbook [<!ENTITY a "unsafe">]><workbook/>');
  expect(() => readWorkbook(zipSync(contents))).toThrow('entità');
});
it('limite di decompressione effettivo funziona anche con dimensioni dichiarate false', () => {
  const data = zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'xl/workbook.xml': strToU8('<workbook>' + 'a'.repeat(10000) + '</workbook>'),
  });
  const view = new DataView(data.buffer);
  for (let i = 0; i < data.length - 46; i++) {
    const signature = view.getUint32(i, true);
    const start = signature === 0x04034b50 ? i + 30 : signature === 0x02014b50 ? i + 46 : -1;
    const length =
      signature === 0x04034b50
        ? view.getUint16(i + 26, true)
        : signature === 0x02014b50
          ? view.getUint16(i + 28, true)
          : 0;
    if (
      start >= 0 &&
      new TextDecoder().decode(data.subarray(start, start + length)) === 'xl/workbook.xml'
    ) {
      if (signature === 0x04034b50) view.setUint32(i + 22, 1, true);
      else view.setUint32(i + 24, 1, true);
    }
  }
  expect(() => inspectXlsxContainer(data, 512)).toThrow('decompresso');
});
it('dimensioni alte false e CRC alterati sono respinti prima di SheetJS', () => {
  const data = bytes(fixture(0));
  const view = new DataView(data.buffer);
  for (let i = 0; i < data.length - 46; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      view.setUint32(i + 24, 1000000, true);
      break;
    }
  expect(() => readWorkbook(data)).toThrow('Dimensioni o checksum');
  const altered = bytes(fixture(0));
  const crc = new DataView(altered.buffer);
  for (let i = 0; i < altered.length - 46; i++)
    if (crc.getUint32(i, true) === 0x02014b50) {
      crc.setUint32(i + 16, 0, true);
      break;
    }
  expect(() => readWorkbook(altered)).toThrow('checksum');
});
it('un dimension ref enorme non espande milioni di celle vuote', () => {
  const contents = unzipSync(bytes(fixture(0)));
  const xml = new TextDecoder().decode(contents['xl/worksheets/sheet1.xml']);
  contents['xl/worksheets/sheet1.xml'] = strToU8(
    xml.replace(/<dimension ref="[^"]+"\/>/, '<dimension ref="A1:XFD1048576"/>'),
  );
  const parsed = readWorkbook(zipSync(contents));
  expect(parsed.sheets[0]?.cells.length).toBeLessThan(50);
});

it('rifiuta nomi troppo lunghi e righe con giornata ma senza esercizio', () => {
  const long = fixture(1);
  long.Sheets.Scheda!.C2 = { t: 's', v: 'x'.repeat(201) };
  const mapped = mapWorkoutWorkbook(readWorkbook(bytes(long)), context());
  expect(mapped.program).toBeNull();
  expect(mapped.issues.some((i) => i.code === 'NAME_TOO_LONG')).toBe(true);
  const missing = fixture(1);
  delete missing.Sheets.Scheda!.C2;
  const result = mapWorkoutWorkbook(readWorkbook(bytes(missing)), context());
  expect(result.program).toBeNull();
  expect(result.issues.some((i) => i.code === 'EXERCISE_REQUIRED')).toBe(true);
});

it('riconosce il confine esplicito del prospetto Upper Body senza inventare altri esercizi', () => {
  const book = fixture(1);
  book.Sheets.Scheda!.C4 = { t: 's', v: 'Giorno' };
  book.Sheets.Scheda!.D4 = { t: 's', v: 'Focus' };
  book.Sheets.Scheda!.E4 = { t: 's', v: 'Serie base' };
  book.Sheets.Scheda!.G4 = { t: 's', v: 'Stato' };
  book.Sheets.Scheda!['!ref'] = 'A1:M4';
  const result = mapWorkoutWorkbook(readWorkbook(bytes(book)), context());
  expect(result.program?.days[0]?.exercises).toHaveLength(1);
  expect(result.issues.some((i) => i.code === 'SUMMARY_EXCLUDED')).toBe(true);
  expect(result.issues.some((i) => i.severity === 'error')).toBe(false);
});
