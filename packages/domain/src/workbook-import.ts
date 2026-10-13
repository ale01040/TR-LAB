import {
  programSchema,
  type Program,
  type Exercise,
  type WorkbookData,
  type ImportIssue,
} from '@tr-lab/contracts';
import { mapTabularWorkbook } from './tabular-import';
type Cell = WorkbookData['sheets'][number]['cells'][number];
export type ImportChoices = {
  rir?: 'lower' | 'upper';
  exercises: Record<string, string>;
  phases: Record<string, Program['weeks'][number]['phase']>;
};
export type WorkbookPreview = {
  program: Program | null;
  issues: ImportIssue[];
  unresolved: { key: string; name: string; sheet: string; cell: string }[];
  unknownPhases: { key: string; name: string }[];
  positions: number;
  days: number;
  weeks: number;
  profile: string;
};
const normal = (text: string) =>
  text
    .trim()
    .toLocaleLowerCase('it-IT')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
function cellRows(sheet: WorkbookData['sheets'][number]) {
  const rows = new Map<number, Map<number, Cell>>();
  for (const c of sheet.cells) {
    if (!rows.has(c.row)) rows.set(c.row, new Map());
    rows.get(c.row)!.set(c.column, c);
  }
  return [...rows].sort(([a], [b]) => a - b);
}
export function mapWorkoutWorkbook(
  workbook: WorkbookData,
  context: {
    catalog: readonly Exercise[];
    choices: ImportChoices;
    nextId: () => string;
    now: string;
    name: string;
    goal: Program['goal'];
  },
): WorkbookPreview {
  if (workbook.sheets.some((s) => normal(s.name) === 'programma'))
    return mapTabularWorkbook(workbook, context);
  const issues: ImportIssue[] = [],
    unresolved: WorkbookPreview['unresolved'] = [],
    unknownPhases: WorkbookPreview['unknownPhases'] = [];
  const issue = (
    severity: ImportIssue['severity'],
    code: string,
    sheet: string,
    cell: string | null,
    message: string,
  ) => issues.push({ severity, code, sheet, cell, message });
  const sheet = workbook.sheets.find((s) => normal(s.name) === 'scheda');
  const id = context.nextId();
  const draft: Program = {
    id,
    rootId: id,
    name: context.name,
    goal: context.goal,
    version: '1',
    status: 'draft',
    days: [],
    weeks: [],
    createdAt: context.now,
    source: 'Import XLSX locale, con revisione esplicita dei target e del ciclo',
  };
  const result = (positions: number, days: number) => ({
    program: null,
    issues,
    unresolved,
    unknownPhases,
    positions,
    days,
    weeks: draft.weeks.length,
    profile: 'unknown',
  });
  if (!sheet) {
    issue(
      'error',
      'UNKNOWN_LAYOUT',
      '',
      null,
      'Manca il foglio Scheda del profilo supportato. Consulta il formato Excel documentato.',
    );
    return result(0, 0);
  }
  const rows = cellRows(sheet);
  const header = rows.find(
    ([, cells]) =>
      [...cells.values()].some((c) => normal(String(c.value)) === 'esercizio') &&
      [...cells.values()].some((c) => normal(String(c.value)) === 'rip min'),
  );
  if (!header) {
    issue(
      'error',
      'MISSING_HEADER',
      sheet.name,
      null,
      'Servono Giorno, Esercizio, Gruppo primario, Serie, Rip min, Rip max, RIR e Recupero (s).',
    );
    return result(0, 0);
  }
  const columns = new Map([...header[1].values()].map((c) => [normal(String(c.value)), c.column]));
  if ([...header[1].values()].some((c) => c.formula))
    issue(
      'error',
      'FORMULA_IDENTIFIER',
      sheet.name,
      null,
      'Le intestazioni devono essere testi espliciti, senza formule.',
    );
  for (const key of [
    'giorno',
    'esercizio',
    'gruppo primario',
    'serie',
    'rip min',
    'rip max',
    'rir',
    'recupero (s)',
  ])
    if (!columns.has(key))
      issue('error', 'MISSING_COLUMN', sheet.name, null, `Colonna obbligatoria assente: ${key}.`);
  const days = new Map<string, Program['days'][number]>();
  let positions = 0,
    totalTargets = 0;
  for (const [rowIndex, cells] of rows) {
    if (rowIndex <= header[0]) continue;
    const get = (name: string) => cells.get(columns.get(normal(name)) ?? -1);
    // Il profilo Upper Body contiene un secondo prospetto di riepilogo nello stesso foglio.
    // Solo questa intestazione completa chiude la tabella; righe esercizio incomplete restano errori.
    if (
      normal(String(get('esercizio')?.value ?? '')) === 'giorno' &&
      normal(String(cells.get(4)?.value ?? '')) === 'focus' &&
      normal(String(cells.get(5)?.value ?? '')) === 'serie base' &&
      normal(String(get('serie')?.value ?? '')) === 'stato'
    ) {
      issue(
        'info',
        'SUMMARY_EXCLUDED',
        sheet.name,
        `C${rowIndex}`,
        'Il prospetto di riepilogo e le righe successive sono esclusi: non sono prescrizioni della tabella esercizi.',
      );
      break;
    }
    const dayLabel = String(get('giorno')?.value ?? '').trim(),
      name = String(get('esercizio')?.value ?? '').trim();
    if (!name) {
      if (/^[a-z0-9][a-z0-9 _-]{0,29}$/i.test(dayLabel))
        issue(
          'error',
          'EXERCISE_REQUIRED',
          sheet.name,
          get('esercizio')?.address ?? null,
          'La riga con giornata esplicita richiede il nome dell’esercizio.',
        );
      continue;
    }
    if (name.length > 200) {
      issue(
        'error',
        'NAME_TOO_LONG',
        sheet.name,
        get('esercizio')?.address ?? null,
        'Il nome dell’esercizio supera 200 caratteri; correggi il file senza troncare i target.',
      );
      continue;
    }
    if (!dayLabel || !/^[a-z0-9][a-z0-9 _-]{0,29}$/i.test(dayLabel)) {
      if (get('serie')?.value !== null && get('serie')?.value !== undefined)
        issue(
          'error',
          'DAY_REQUIRED',
          sheet.name,
          get('esercizio')?.address ?? null,
          `${name}: giornata esplicita richiesta. Nessuna riga viene importata per supposizione.`,
        );
      continue;
    }
    if (get('giorno')?.formula || get('esercizio')?.formula)
      issue(
        'error',
        'FORMULA_IDENTIFIER',
        sheet.name,
        get('esercizio')?.address ?? null,
        'Giornata e nome dell’esercizio devono essere valori espliciti.',
      );
    positions++;
    if (positions > 700) {
      issue(
        'error',
        'IMPORT_LIMIT',
        sheet.name,
        null,
        'La scheda supera 700 posizioni. Dividi esplicitamente il file.',
      );
      break;
    }
    const key = `${sheet.name}!${get('esercizio')?.address ?? rowIndex}`;
    const number = (field: string, min: number, max: number, integer = true): number | null => {
      const cell = get(field),
        raw = cell?.value;
      const value =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string' && /^\d+(?:[.,]\d+)?$/.test(raw.trim())
            ? Number(raw.replace(',', '.'))
            : NaN;
      if (
        cell?.formula ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (integer && !Number.isInteger(value))
      ) {
        issue(
          'error',
          'INVALID_TARGET',
          sheet.name,
          cell?.address ?? null,
          `${name}: ${field} assente, con formula o fuori limite. Inserisci un valore esplicito nel file.`,
        );
        return null;
      }
      return value;
    };
    const sets = number('serie', 1, 30),
      min = number('rip min', 1, 100),
      max = number('rip max', 1, 100),
      rest = number('recupero (s)', 0, 1800);
    const rirCell = get('rir'),
      rawRir = String(rirCell?.value ?? '')
        .trim()
        .replace(/–/g, '-'),
      range = /^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)$/.exec(rawRir);
    let rir: number | null;
    if (rawRir.length > 30) {
      issue(
        'error',
        'INVALID_RIR',
        sheet.name,
        rirCell?.address ?? null,
        'RIR troppo lungo: inserisci un numero o un intervallo esplicito breve.',
      );
      rir = null;
    } else if (range && !rirCell?.formula) {
      if (Number(range[1]?.replace(',', '.')) > Number(range[2]?.replace(',', '.'))) {
        issue(
          'error',
          'INVALID_RIR',
          sheet.name,
          rirCell?.address ?? null,
          'Intervallo RIR invertito.',
        );
        rir = null;
      } else if (!context.choices.rir) {
        issue(
          'choice',
          'RIR_RANGE',
          sheet.name,
          rirCell?.address ?? null,
          `${name}: RIR ${rawRir}. Scegli quale estremo conservare come target.`,
        );
        rir = null;
      } else {
        rir = Number((context.choices.rir === 'lower' ? range[1] : range[2])?.replace(',', '.'));
        if (rir < 0 || rir > 10) {
          issue('error', 'INVALID_RIR', sheet.name, rirCell?.address ?? null, 'RIR fuori limite.');
          rir = null;
        } else
          issue(
            'info',
            'RIR_CHOSEN',
            sheet.name,
            rirCell?.address ?? null,
            `${name}: RIR ${rawRir} trasformato in ${rir} per la tua scelta.`,
          );
      }
    } else rir = number('rir', 0, 10, false);
    const chosen = context.choices.exercises[key],
      canonicalName = normal(name.replace(' (più leggero, più ripetizioni)', ''));
    const matches = context.catalog.filter((e) =>
        chosen ? e.id === chosen : normal(e.name) === canonicalName,
      ),
      exercise = matches.length === 1 ? matches[0] : undefined;
    if (!exercise) {
      unresolved.push({ key, name, sheet: sheet.name, cell: get('esercizio')?.address ?? '' });
      issue(
        'choice',
        'EXERCISE_MAPPING',
        sheet.name,
        get('esercizio')?.address ?? null,
        `Associa esplicitamente ${name} a un esercizio della tua libreria.`,
      );
    }
    if (!days.has(dayLabel))
      days.set(dayLabel, {
        id: context.nextId(),
        name: `Giorno ${dayLabel}`,
        focus: '',
        exercises: [],
      });
    if (!exercise || sets === null || min === null || max === null || rest === null || rir === null)
      continue;
    totalTargets += sets;
    if (totalTargets > 1000) {
      issue(
        'error',
        'IMPORT_LIMIT',
        sheet.name,
        null,
        'La scheda supera 1.000 target. Dividi esplicitamente il file.',
      );
      break;
    }
    if (max < min) {
      issue(
        'error',
        'INVALID_RANGE',
        sheet.name,
        get('rip max')?.address ?? null,
        `${name}: ripetizioni massime inferiori alle minime.`,
      );
      continue;
    }
    const notes = [
      String(get('esecuzione e note')?.value ?? ''),
      get('alternativa (macchina occupata o assente)')?.value
        ? `Alternativa: ${get('alternativa (macchina occupata o assente)')?.value}`
        : '',
      get('perché questo esercizio (fonte nel vault)')?.value
        ? `Fonte dichiarata dal file: ${get('perché questo esercizio (fonte nel vault)')?.value}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    const order = String(get('#')?.value ?? '');
    days.get(dayLabel)!.exercises.push({
      id: context.nextId(),
      exercise: structuredClone(exercise),
      targets: Array.from({ length: sets }, () => ({
        id: context.nextId(),
        repsMin: min,
        repsMax: max,
        rir,
        restSeconds: rest,
        loadGrams: null,
        kind: 'work',
      })),
      notes,
      superset: /^\d+[ab]$/i.test(order) ? order.slice(0, -1) : null,
      accumulation: normal(String(get('+1 serie sett. 3-6')?.value ?? '')) === 'si',
    });
    if (Number(get('serie extra sx')?.value) > 0)
      issue(
        'info',
        'EXTRA_SIDE_REVIEW',
        sheet.name,
        get('serie extra sx')?.address ?? null,
        `${name}: serie extra SX escluse dalla conversione strutturale; aggiungile nell’editor dopo aver verificato il ciclo.`,
      );
    if ((Number(get('lati')?.value) === 2) !== exercise.unilateral)
      issue(
        'info',
        'LATERALITY_REVIEW',
        sheet.name,
        get('lati')?.address ?? null,
        `${name}: file ed esercizio associato indicano lati diversi. Verifica la variante nell’editor.`,
      );
    if (normal(String(get('gruppo primario')?.value ?? '')) !== normal(exercise.muscle))
      issue(
        'info',
        'MUSCLE_REVIEW',
        sheet.name,
        get('gruppo primario')?.address ?? null,
        `${name}: muscolo principale diverso dal catalogo associato. Il programma conserva i metadati della variante; verifica l’associazione.`,
      );
  }
  draft.days = [...days.values()];
  const period = workbook.sheets.find((s) => normal(s.name) === 'periodizzazione');
  if (period) {
    const phases: Record<string, Program['weeks'][number]['phase']> = {
      test: 'test',
      base: 'base',
      accumulo: 'accumulation',
      picco: 'peak',
      scarico: 'deload',
    };
    for (const [r, cells] of cellRows(period))
      if (
        typeof cells.get(1)?.value === 'number' &&
        Number.isInteger(cells.get(1)?.value) &&
        cells.get(2)?.value
      ) {
        const label = String(cells.get(2)?.value),
          key = `${period.name}!B${r}`,
          phase = phases[normal(label)] ?? context.choices.phases[key];
        if (label.length > 200) {
          issue(
            'error',
            'NAME_TOO_LONG',
            period.name,
            `B${r}`,
            'La fase supera 200 caratteri. Correggi il testo nel file.',
          );
          continue;
        }
        if (cells.get(2)?.formula || cells.get(3)?.formula)
          issue(
            'error',
            'FORMULA_IDENTIFIER',
            period.name,
            `B${r}`,
            'Fase ed extra del ciclo richiedono valori espliciti, senza formule.',
          );
        if (cells.get(1)?.formula || cells.get(1)?.value !== draft.weeks.length + 1)
          issue(
            'error',
            'WEEK_ORDER',
            period.name,
            `A${r}`,
            'Le settimane devono essere numerate consecutivamente da 1, con valori espliciti.',
          );
        if (!phase) {
          unknownPhases.push({ key, name: label });
          issue(
            'choice',
            'PHASE_MAPPING',
            period.name,
            `B${r}`,
            `Scegli la fase corrispondente a ${label}.`,
          );
        }
        draft.weeks.push({
          name: label,
          phase: phase ?? 'base',
          extraSets: /\+1/.test(String(cells.get(3)?.value)) ? 1 : 0,
          rir: null,
        });
      }
    issue(
      'info',
      'CYCLE_REVIEW',
      period.name,
      null,
      'Il ciclo importa nomi, fasi e accumulo. RIR distinti per categorie, tecniche di intensità e istruzioni di scarico richiedono revisione nell’editor: non diventano regole automatiche.',
    );
  } else
    issue(
      'error',
      'MISSING_CYCLE',
      'Periodizzazione',
      null,
      'Aggiungi Periodizzazione con settimane e fasi esplicite.',
    );
  for (const other of workbook.sheets.filter((s) => s !== sheet && s !== period))
    issue(
      'info',
      'SECTION_EXCLUDED',
      other.name,
      null,
      `${other.name}: escluso dal programma. Diario, misure e nutrizione restano separati.`,
    );
  if (!positions)
    issue('error', 'EMPTY_PROGRAM', sheet.name, null, 'Nessuna riga di esercizio riconosciuta.');
  const parsed = programSchema.safeParse(draft);
  if (issues.length > 1000)
    issue(
      'error',
      'REPORT_LIMIT',
      sheet.name,
      null,
      'Troppe segnalazioni per un singolo report: dividi il file e verifica le associazioni.',
    );
  if (!parsed.success && !issues.some((i) => i.severity === 'choice'))
    for (const error of parsed.error.issues)
      issue('error', 'INVALID_PROGRAM', sheet.name, null, error.message);
  return {
    program:
      parsed.success && !issues.some((i) => i.severity === 'error' || i.severity === 'choice')
        ? parsed.data
        : null,
    issues,
    unresolved,
    unknownPhases,
    positions,
    days: days.size,
    weeks: draft.weeks.length,
    profile: 'scheda-abc-1',
  };
}
