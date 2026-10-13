import { useMemo, useState } from 'react';
import {
  importReportSchema,
  type ImportReport,
  type PrivateExercise,
  type Program,
  type WorkbookData,
} from '@tr-lab/contracts';
import { mapWorkoutWorkbook, uuidSequence, type ImportChoices } from '@tr-lab/domain';
import { useCatalog } from '../data/use-catalog';
import { PrivateExerciseForm } from './PrivateExerciseForm';
import styles from '../styles/App.module.css';
export function ExcelImportReview({
  workbook,
  fileName,
  fileDigest,
  confirm,
}: {
  workbook: WorkbookData;
  fileName: string;
  fileDigest: string;
  confirm: (program: Program, report: ImportReport, variants: PrivateExercise[]) => void;
}) {
  const storedCatalog = useCatalog();
  const [variants, setVariants] = useState<PrivateExercise[]>([]);
  const catalog = useMemo(
    () => [...storedCatalog, ...variants.map((v) => v.exercise)],
    [storedCatalog, variants],
  );
  const [creating, setCreating] = useState<{ key: string; name: string } | null>(null);
  const [name, setName] = useState(fileName.replace(/\.xlsx$/i, '').slice(0, 200));
  const [goal, setGoal] = useState<Program['goal']>('hypertrophy');
  const [choices, setChoices] = useState<ImportChoices>({ exercises: {}, phases: {} });
  const [acknowledged, setAcknowledged] = useState(false);
  const [seed] = useState(() => crypto.randomUUID());
  const [createdAt] = useState(() => new Date().toISOString());
  const originalMapping = useMemo(
    () =>
      mapWorkoutWorkbook(workbook, {
        catalog: storedCatalog,
        choices: { exercises: {}, phases: {} },
        name: fileName,
        goal,
        now: createdAt,
        nextId: uuidSequence(seed),
      }),
    [workbook, fileName, goal, createdAt, storedCatalog, seed],
  );
  const preview = useMemo(() => {
    return mapWorkoutWorkbook(workbook, {
      catalog,
      choices,
      name,
      goal,
      now: createdAt,
      nextId: uuidSequence(seed),
    });
  }, [workbook, choices, name, goal, seed, createdAt, catalog]);
  if (creating)
    return (
      <>
        <button onClick={() => setCreating(null)}>Torna alla revisione del file</button>
        <PrivateExerciseForm
          name={creating.name}
          stage={(variant) => {
            setVariants([...variants, variant]);
            setChoices({
              ...choices,
              exercises: { ...choices.exercises, [creating.key]: variant.exercise.id },
            });
            setAcknowledged(false);
          }}
          done={() => setCreating(null)}
        />
      </>
    );
  return (
    <>
      <p>
        {preview.days} giornate · {preview.positions} posizioni · {preview.weeks} settimane. Il file
        resta sul dispositivo.
      </p>
      <div className={styles.formGrid}>
        <label>
          Nome del programma importato
          <input required value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Obiettivo del programma importato
          <select value={goal} onChange={(e) => setGoal(e.target.value as Program['goal'])}>
            <option value="hypertrophy">Ipertrofia</option>
            <option value="strength">Forza</option>
            <option value="bodyweight">Corpo libero</option>
          </select>
        </label>
      </div>
      <label>
        Quando il file indica un intervallo RIR
        <select
          value={choices.rir ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            const next: ImportChoices = { exercises: choices.exercises, phases: choices.phases };
            if (value === 'lower' || value === 'upper') next.rir = value;
            setChoices(next);
            setAcknowledged(false);
          }}
        >
          <option value="">Scegli esplicitamente</option>
          <option value="lower">Conserva l’estremo inferiore</option>
          <option value="upper">Conserva l’estremo superiore</option>
        </select>
      </label>
      {originalMapping.unresolved.map((row) => (
        <div key={row.key}>
          <label>
            {row.cell} · Associa {row.name}
            <select
              value={choices.exercises[row.key] ?? ''}
              onChange={(e) => {
                setChoices({
                  ...choices,
                  exercises: { ...choices.exercises, [row.key]: e.target.value },
                });
                setAcknowledged(false);
              }}
            >
              <option value="">Scegli dalla libreria</option>
              {catalog.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setCreating({ key: row.key, name: row.name })}>
            Crea una variante per {row.name}
          </button>
        </div>
      ))}
      {originalMapping.unknownPhases.map((row) => (
        <label key={row.key}>
          {row.key} · Fase {row.name}
          <select
            value={choices.phases[row.key] ?? ''}
            onChange={(e) => {
              const next = { ...choices.phases };
              if (e.target.value)
                next[row.key] = e.target.value as Program['weeks'][number]['phase'];
              else delete next[row.key];
              setChoices({ ...choices, phases: next });
              setAcknowledged(false);
            }}
          >
            <option value="">Scegli la corrispondenza</option>
            <option value="test">Test</option>
            <option value="base">Base</option>
            <option value="accumulation">Accumulo</option>
            <option value="peak">Picco</option>
            <option value="deload">Scarico</option>
          </select>
        </label>
      ))}
      <h3>Report dell’importazione</h3>
      <ul>
        {preview.issues.map((issue, index) => (
          <li key={index}>
            <strong>
              {issue.severity === 'error'
                ? 'Da correggere'
                : issue.severity === 'choice'
                  ? 'Scelta richiesta'
                  : 'Informazione'}
            </strong>{' '}
            · {issue.sheet}
            {issue.cell ? `!${issue.cell}` : ''}: {issue.message}
          </li>
        ))}
      </ul>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        Ho letto gli adattamenti e le sezioni escluse. Rivedrò varianti, target e ciclo nell’editor
        prima di approvare.
      </label>
      <button
        className={styles.primary}
        disabled={!preview.program || !acknowledged}
        onClick={() => {
          if (!preview.program) return;
          const used = variants.filter((v) =>
            preview.program!.days.some((d) =>
              d.exercises.some((e) => e.exercise.id === v.exercise.id),
            ),
          );
          const report = importReportSchema.parse({
            id: seed,
            programId: preview.program.id,
            fileName,
            fileDigest,
            digestAlgorithm: 'sha256',
            parserVersion: 'sheetjs-ce-0.20.3/guard-2',
            profile: preview.profile,
            choices,
            issues: preview.issues,
            editedInEditor: false,
            createdAt,
          });
          confirm(preview.program, report, used);
        }}
      >
        Conferma la struttura e apri l’editor
      </button>
    </>
  );
}
