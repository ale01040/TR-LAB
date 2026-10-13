import {
  programSchema,
  type Exercise,
  type ImportIssue,
  type Program,
  type WorkbookData,
} from '@tr-lab/contracts';
import type { ImportChoices, WorkbookPreview } from './workbook-import';
type Context = {
  catalog: readonly Exercise[];
  choices: ImportChoices;
  nextId: () => string;
  now: string;
  name: string;
  goal: Program['goal'];
};
type Row = { key: string; values: Map<string, string | number | boolean | null> };
export function mapTabularWorkbook(workbook: WorkbookData, context: Context): WorkbookPreview {
  const issues: ImportIssue[] = [],
    unresolved: WorkbookPreview['unresolved'] = [],
    unknownPhases: WorkbookPreview['unknownPhases'] = [];
  const add = (
    severity: ImportIssue['severity'],
    code: string,
    sheet: string,
    cell: string | null,
    message: string,
  ) => issues.push({ severity, code, sheet, cell, message });
  const table = (name: string, required: string[]): Row[] => {
    const sheet = workbook.sheets.find((s) => s.name.trim().toLowerCase() === name.toLowerCase());
    if (!sheet) {
      add('error', 'MISSING_SHEET', name, null, `Foglio obbligatorio assente: ${name}.`);
      return [];
    }
    const header = sheet.cells.filter((c) => c.row === 1),
      columns = new Map<number, string>();
    for (const c of header) {
      const key = String(c.value ?? '')
        .trim()
        .toLowerCase();
      if (!key || [...columns.values()].includes(key) || c.formula)
        add(
          'error',
          'INVALID_HEADER',
          name,
          c.address,
          'Intestazioni univoche, testuali e senza formule.',
        );
      else columns.set(c.column, key);
    }
    for (const key of required)
      if (![...columns.values()].includes(key))
        add('error', 'MISSING_COLUMN', name, null, `Colonna obbligatoria: ${key}.`);
    const rows = new Map<number, Row>();
    for (const c of sheet.cells) {
      if (c.row <= 1 || !columns.has(c.column)) continue;
      if (!rows.has(c.row)) rows.set(c.row, { key: `${sheet.name}!${c.row}`, values: new Map() });
      if (c.formula)
        add(
          'error',
          'FORMULA_REQUIRES_VALUE',
          name,
          c.address,
          'Sostituisci la formula con un valore esplicito, verificato.',
        );
      rows.get(c.row)!.values.set(columns.get(c.column)!, c.value);
    }
    return [...rows]
      .sort(([a], [b]) => a - b)
      .map(([, r]) => r)
      .filter((r) => [...r.values.values()].some((v) => v !== null && v !== ''));
  };
  const numeric = (
    row: Row,
    column: string,
    min: number,
    max: number,
    nullable = false,
  ): number | null => {
    const raw = row.values.get(column);
    if (nullable && (raw === null || raw === undefined || raw === '')) return null;
    const value =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string' && /^\d+(?:[.,]\d+)?$/.test(raw.trim())
          ? Number(raw.replace(',', '.'))
          : NaN;
    if (!Number.isFinite(value) || value < min || value > max) {
      add(
        'error',
        'INVALID_NUMBER',
        row.key.split('!')[0]!,
        row.key,
        `${column}: valore esplicito richiesto fra ${min} e ${max}.`,
      );
      return null;
    }
    return value;
  };
  const text = (row: Row, column: string) => String(row.values.get(column) ?? '').trim();
  const ordered = (rows: Row[]) => {
    const seen = new Set<number>();
    return rows
      .map((row) => {
        const order = numeric(row, 'ordine', 1, 1000);
        if (order !== null) {
          if (!Number.isInteger(order) || seen.has(order))
            add(
              'error',
              'INVALID_ORDER',
              row.key.split('!')[0]!,
              row.key,
              'Ordine intero e univoco nel gruppo.',
            );
          seen.add(order);
        }
        return { row, order };
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((x) => x.row);
  };
  const unique = (rows: Row[], label: string) => {
    const ids = new Set<string>();
    for (const row of rows) {
      const id = text(row, 'id');
      if (!id || id.length > 100 || ids.has(id))
        add('error', 'DUPLICATE_ID', label, row.key, 'ID locale richiesto e univoco nel foglio.');
      ids.add(id);
    }
  };
  const metadata = table('Programma', ['chiave', 'valore']);
  const meta = new Map<string, string>();
  for (const row of metadata) {
    const key = text(row, 'chiave');
    if (meta.has(key)) add('error', 'DUPLICATE_KEY', 'Programma', row.key, 'Chiave ripetuta.');
    meta.set(key, text(row, 'valore'));
  }
  if (meta.get('formato') !== 'tr-lab-tabular' || meta.get('versione') !== '1')
    add(
      'error',
      'UNSUPPORTED_FORMAT',
      'Programma',
      null,
      'Servono formato tr-lab-tabular e versione 1.',
    );
  if (
    meta.has('obiettivo') &&
    !['strength', 'hypertrophy', 'bodyweight'].includes(meta.get('obiettivo')!)
  )
    add(
      'error',
      'INVALID_GOAL',
      'Programma',
      null,
      'obiettivo deve essere strength, hypertrophy o bodyweight.',
    );
  if (meta.has('obiettivo') && meta.get('obiettivo') !== context.goal)
    add(
      'info',
      'GOAL_OVERRIDE',
      'Programma',
      null,
      `Obiettivo del file: ${meta.get('obiettivo')}. Nell’anteprima hai scelto ${context.goal}: controlla la differenza prima di salvare.`,
    );
  const days = table('Giorni', ['id', 'ordine', 'nome', 'focus']);
  const positions = table('Esercizi', [
    'id',
    'giorno_id',
    'ordine',
    'esercizio_id',
    'nome',
    'note',
    'superset',
    'accumulo',
  ]);
  const sets = table('Serie', [
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
  ]);
  const weeks = ordered(table('Settimane', ['ordine', 'nome', 'fase', 'extra_serie', 'rir']));
  unique(days, 'Giorni');
  unique(positions, 'Esercizi');
  unique(sets, 'Serie');
  const root = context.nextId();
  const draft: Program = {
    id: root,
    rootId: root,
    name: context.name,
    goal: context.goal,
    version: '1',
    status: 'draft',
    createdAt: context.now,
    source: 'Import Excel TR LAB tabellare v1',
    days: [],
    weeks: [],
  };
  const dayIds = new Set(days.map((r) => text(r, 'id'))),
    positionIds = new Set(positions.map((r) => text(r, 'id')));
  for (const row of positions)
    if (!dayIds.has(text(row, 'giorno_id')))
      add(
        'error',
        'MISSING_PARENT',
        'Esercizi',
        row.key,
        'giorno_id non presente nel foglio Giorni.',
      );
  for (const row of sets)
    if (!positionIds.has(text(row, 'posizione_id')))
      add(
        'error',
        'MISSING_PARENT',
        'Serie',
        row.key,
        'posizione_id non presente nel foglio Esercizi.',
      );
  if (positions.length > 700 || sets.length > 1000)
    add(
      'error',
      'IMPORT_LIMIT',
      '',
      null,
      'Massimo 700 posizioni e 1.000 target; dividi esplicitamente il programma.',
    );
  else
    for (const day of ordered(days)) {
      const mapped: Program['days'][number] = {
        id: context.nextId(),
        name: text(day, 'nome'),
        focus: text(day, 'focus'),
        exercises: [],
      };
      for (const row of ordered(
        positions.filter((p) => text(p, 'giorno_id') === text(day, 'id')),
      )) {
        const name = text(row, 'nome'),
          reference = context.choices.exercises[row.key] || text(row, 'esercizio_id');
        if (!name || name.length > 200) {
          add(
            'error',
            'INVALID_NAME',
            'Esercizi',
            row.key,
            'Nome esplicito fra 1 e 200 caratteri richiesto.',
          );
          continue;
        }
        // Un ID dichiarato non viene sostituito da una corrispondenza sul nome.
        const candidates = context.catalog.filter((e) =>
          reference
            ? e.id === reference
            : e.name.trim().toLocaleLowerCase('it-IT') === name.toLocaleLowerCase('it-IT'),
        );
        const exercise = candidates.length === 1 ? candidates[0] : undefined;
        if (!exercise) {
          unresolved.push({ key: row.key, name, sheet: 'Esercizi', cell: row.key });
          add(
            'choice',
            'EXERCISE_MAPPING',
            'Esercizi',
            row.key,
            `Associa ${name} alla tua libreria.`,
          );
          continue;
        }
        const targets = ordered(
          sets.filter((s) => text(s, 'posizione_id') === text(row, 'id')),
        ).map((s) => ({
          id: context.nextId(),
          repsMin: numeric(s, 'rip_min', 1, 100),
          repsMax: numeric(s, 'rip_max', 1, 100),
          rir: numeric(s, 'rir', 0, 10),
          restSeconds: numeric(s, 'recupero_s', 0, 1800),
          loadGrams: numeric(s, 'carico_g', 0, 1000000, true),
          kind: text(s, 'tipo'),
          ...(text(s, 'lato') ? { side: text(s, 'lato') } : {}),
        }));
        const accumulation = text(row, 'accumulo');
        if (!['true', 'false'].includes(accumulation))
          add(
            'error',
            'INVALID_BOOLEAN',
            'Esercizi',
            row.key,
            'accumulo deve essere true o false.',
          );
        const parsed = programSchema.shape.days.element.shape.exercises.element.safeParse({
          id: context.nextId(),
          exercise: structuredClone(exercise),
          targets,
          notes: text(row, 'note'),
          superset: text(row, 'superset') || null,
          accumulation: accumulation === 'true',
        });
        if (parsed.success) mapped.exercises.push(parsed.data);
        else
          for (const err of parsed.error.issues)
            add('error', 'INVALID_POSITION', 'Esercizi', row.key, err.message);
      }
      draft.days.push(mapped);
    }
  for (const [index, row] of weeks.entries()) {
    if (numeric(row, 'ordine', 1, 52) !== index + 1)
      add('error', 'WEEK_ORDER', 'Settimane', row.key, 'Settimane consecutive da 1.');
    const name = text(row, 'fase'),
      phase = context.choices.phases[row.key] || name;
    if (name.length > 200) {
      add(
        'error',
        'INVALID_PHASE',
        'Settimane',
        row.key,
        'La fase supera 200 caratteri: correggi il file.',
      );
      continue;
    }
    if (!['test', 'base', 'accumulation', 'peak', 'deload'].includes(phase)) {
      unknownPhases.push({ key: row.key, name });
      add('choice', 'PHASE_MAPPING', 'Settimane', row.key, `Scegli la fase per ${name}.`);
    }
    const parsed = programSchema.shape.weeks.element.safeParse({
      name: text(row, 'nome'),
      phase,
      extraSets: numeric(row, 'extra_serie', 0, 3),
      rir: numeric(row, 'rir', 0, 10, true),
    });
    if (parsed.success) draft.weeks.push(parsed.data);
    else if (!unknownPhases.some((p) => p.key === row.key))
      for (const err of parsed.error.issues)
        add('error', 'INVALID_WEEK', 'Settimane', row.key, err.message);
  }
  const parsed = programSchema.safeParse(draft);
  if (issues.length > 1000)
    add(
      'error',
      'REPORT_LIMIT',
      '',
      null,
      'Troppe segnalazioni per un singolo report: dividi il file.',
    );
  if (!parsed.success && !issues.some((i) => i.severity === 'choice'))
    for (const err of parsed.error.issues)
      add('error', 'INVALID_PROGRAM', 'Programma', null, err.message);
  for (const other of workbook.sheets.filter(
    (s) =>
      !['programma', 'giorni', 'esercizi', 'serie', 'settimane'].includes(
        s.name.trim().toLowerCase(),
      ),
  ))
    add('info', 'SECTION_EXCLUDED', other.name, null, 'Foglio escluso dal programma.');
  return {
    program:
      parsed.success && !issues.some((i) => i.severity === 'error' || i.severity === 'choice')
        ? parsed.data
        : null,
    issues,
    unresolved,
    unknownPhases,
    positions: positions.length,
    days: days.length,
    weeks: weeks.length,
    profile: 'tr-lab-tabular-1',
  };
}
