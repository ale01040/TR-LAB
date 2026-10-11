import { useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Copy,
  FileUp,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import {
  exerciseSchema,
  programSchema,
  templateSchema,
  type Program,
  type Prescription,
} from '@tr-lab/contracts';
import { copyProgram, createPrescription } from '@tr-lab/domain';
import rawCatalog from '../data/catalog.json';
import rawTemplate from '../data/excel-template.json';
import provenance from '../data/excel-provenance.json';
import { useApp } from '../components/AppProvider';
import {
  counted,
  Dialog,
  downloadJson,
  errorMessage,
  kilos,
  loadBasisLabel,
} from '../components/Shared';
import { DecimalInput } from '../components/DecimalInput';
import styles from '../styles/App.module.css';

const catalog = rawCatalog.map((e) => exerciseSchema.parse(e));
function newProgram(): Program {
  const id = crypto.randomUUID();
  return {
    id,
    rootId: id,
    name: 'Il mio programma',
    goal: 'hypertrophy',
    version: '1',
    status: 'draft',
    days: [{ id: crypto.randomUUID(), name: 'Giorno A', focus: '', exercises: [] }],
    weeks: [{ name: 'Base', phase: 'base', extraSets: 0, rir: null }],
    createdAt: new Date().toISOString(),
    source: 'Editor personale',
  };
}

export function ProgramPage() {
  const { entities, save, notify } = useApp();
  const programs = entities
    .filter((r) => r.kind === 'program')
    .map((r) => r.data)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [draft, setDraft] = useState<Program | null>(null);
  const [preview, setPreview] = useState<Program | null>(null);
  const [previewFromExcel, setPreviewFromExcel] = useState(false);
  const [approval, setApproval] = useState<Program | null>(null);
  const [sharing, setSharing] = useState<Program | null>(null);
  const [shareNotes, setShareNotes] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const program = programs.find((p) => p.id === selected) ?? programs[0];
  async function saveDraft(value: Program) {
    setBusy(true);
    setError('');
    try {
      const valid = programSchema.parse(value);
      await save('SaveProgramDraft', { id: valid.id, kind: 'program', revision: '0', data: valid });
      setDraft(null);
      setSelected(valid.id);
      notify('Bozza salvata. Approvala quando i target sono pronti.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    if (!approval) return;
    setBusy(true);
    try {
      const value = { ...approval, status: 'approved' as const };
      await save('ApproveProgram', { id: value.id, kind: 'program', revision: '0', data: value });
      setApproval(null);
      notify('Scheda approvata. Puoi iniziare una seduta da Oggi.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024)
        throw new Error('Il modello JSON deve essere inferiore a 1 MiB.');
      if (!file.name.toLowerCase().endsWith('.json'))
        throw new Error(
          'In questa alpha è supportato il modello JSON TR LAB. Il parser XLSX completo è previsto nel pacchetto WP-07.',
        );
      const model = templateSchema.parse(JSON.parse(await file.text()));
      setPreviewFromExcel(false);
      setPreview(copyProgram(model.program, () => crypto.randomUUID(), new Date().toISOString()));
    } catch (error) {
      notify(errorMessage(error));
    }
    event.target.value = '';
  }
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>STRUTTURA / INTENZIONE</span>
          <h1>Il tuo programma.</h1>
          <p>Organizza le giornate. Scegli i target. Mantieni il controllo.</p>
        </div>
        <button
          className={styles.primary}
          onClick={() => {
            setDraft(newProgram());
            setError('');
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Nuova scheda
        </button>
      </div>
      <div className={styles.actionStrip}>
        <button
          onClick={() => {
            setPreviewFromExcel(true);
            setPreview(
              copyProgram(
                templateSchema.parse(rawTemplate).program,
                () => crypto.randomUUID(),
                new Date().toISOString(),
              ),
            );
          }}
        >
          <Copy size={18} aria-hidden="true" />
          Parti dalla struttura Excel
        </button>
        <button onClick={() => input.current?.click()}>
          <FileUp size={18} aria-hidden="true" />
          Importa modello JSON
        </button>
        <input
          ref={input}
          className={styles.hidden}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void importFile(e)}
        />
      </div>
      {programs.length ? (
        <div className={styles.programLayout}>
          <aside className={styles.programList} aria-label="Le tue schede">
            {programs.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={program?.id === p.id ? styles.selectedProgram : ''}
              >
                <span className={styles.eyebrow}>
                  {p.status === 'draft' ? 'BOZZA' : 'APPROVATA'} · V{p.version}
                </span>
                <strong>{p.name}</strong>
                <small>
                  {counted(p.days.length, 'giorno', 'giorni')} ·{' '}
                  {counted(p.weeks.length, 'settimana', 'settimane')}
                </small>
              </button>
            ))}
          </aside>
          {program && (
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    {program.goal === 'strength'
                      ? 'FORZA'
                      : program.goal === 'bodyweight'
                        ? 'CORPO LIBERO'
                        : 'IPERTROFIA'}
                  </span>
                  <h2>{program.name}</h2>
                </div>
                <span className={styles.badge}>
                  {program.status === 'draft' ? 'Bozza' : 'Approvata'}
                </span>
              </div>
              <div className={styles.actionStrip}>
                <button
                  onClick={() => {
                    setError('');
                    setDraft(
                      program.status === 'draft'
                        ? structuredClone(program)
                        : {
                            ...structuredClone(program),
                            id: crypto.randomUUID(),
                            status: 'draft',
                            version: String(BigInt(program.version) + 1n),
                            createdAt: new Date().toISOString(),
                          },
                    );
                  }}
                >
                  {program.status === 'draft' ? 'Modifica bozza' : 'Crea nuova versione'}
                </button>
                {program.status === 'draft' && (
                  <button
                    onClick={() => {
                      setError('');
                      setApproval(program);
                    }}
                  >
                    <Check size={16} aria-hidden="true" />
                    Approva scheda
                  </button>
                )}
                <button
                  onClick={() => {
                    setSharing(program);
                    setShareNotes(false);
                  }}
                >
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  Condividi una copia
                </button>
                <button onClick={() => window.print()}>
                  <Printer size={16} aria-hidden="true" />
                  Stampa
                </button>
              </div>
              <div className={styles.cycleStrip}>
                {program.weeks.map((w, i) => (
                  <div key={i} data-phase={w.phase}>
                    <span>SETT. {i + 1}</span>
                    <strong>{w.name}</strong>
                    <small>
                      {w.extraSets
                        ? `+${counted(w.extraSets, 'serie', 'serie')} dove previsto`
                        : 'Serie base'}
                      {w.rir !== null ? ` · RIR ${w.rir}` : ''}
                    </small>
                  </div>
                ))}
              </div>
              {program.days.map((d) => (
                <div className={styles.daySection} key={d.id}>
                  <h3>
                    {d.name} <span>{d.focus}</span>
                  </h3>
                  {d.exercises.map((p, i) => (
                    <div className={styles.exerciseRow} key={p.id}>
                      <span className={styles.exerciseNumber}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <strong>{p.exercise.name}</strong>
                        <small>
                          {p.exercise.muscle} · {p.exercise.unilateral ? 'SX / DX' : 'Bilaterale'}
                          {p.superset ? ` · Superserie ${p.superset}` : ''}
                        </small>
                        <p>{p.notes}</p>
                      </div>
                      <span className={styles.targetSummary}>
                        {counted(p.targets.length, 'serie', 'serie')} ·{' '}
                        {loadBasisLabel[p.exercise.basis]}
                        {p.targets.map((target, j) => (
                          <small key={target.id}>
                            S{j + 1} ·{' '}
                            {target.kind === 'warmup'
                              ? 'riscaldamento'
                              : target.kind === 'extra'
                                ? 'extra'
                                : 'lavoro'}
                            {target.side === 'left' ? ' SX' : target.side === 'right' ? ' DX' : ''}{' '}
                            · {target.repsMin}–{target.repsMax} rip. · RIR {target.rir} ·{' '}
                            {target.restSeconds}s ·{' '}
                            {target.loadGrams === null
                              ? 'carico non impostato'
                              : `${kilos(target.loadGrams)} kg`}
                          </small>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <p className={styles.hint}>{program.source}</p>
            </section>
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.eyebrow}>TUTTO PARTE DA QUI</span>
          <h2>Spazio alle tue giornate.</h2>
          <p>
            Crea una scheda libera o usa la struttura A / B / C come bozza. Puoi cambiare esercizi,
            serie e ciclo prima di approvare.
          </p>
          <button className={styles.secondary} onClick={() => setDraft(newProgram())}>
            Costruisci il programma <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {draft && (
        <Dialog title="Editor della scheda" close={() => setDraft(null)}>
          <ProgramEditor
            program={draft}
            setProgram={setDraft}
            submit={() => void saveDraft(draft)}
            busy={busy}
            error={error}
          />
        </Dialog>
      )}
      {preview && (
        <Dialog title="Importa come nuova bozza" close={() => setPreview(null)}>
          <p>
            <strong>{preview.name}</strong> · {counted(preview.days.length, 'giornata', 'giornate')}{' '}
            ·{' '}
            {counted(
              preview.days.reduce((n, d) => n + d.exercises.length, 0),
              'esercizio',
              'esercizi',
            )}{' '}
            · {counted(preview.weeks.length, 'settimana', 'settimane')}.
          </p>
          <p>
            La copia avrà nuovi identificativi. Non contiene diario, pesate o dati dell'altra
            persona. Potrai modificarla prima di approvarla.
          </p>
          {previewFromExcel ? (
            <>
              <h3>Adattamenti dichiarati</h3>
              <ul>
                {[...provenance.exclusions, ...provenance.choices].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.hint}>{provenance.warning}</p>
            </>
          ) : null}
          <button
            className={styles.primary}
            onClick={() => {
              setDraft(preview);
              setPreview(null);
            }}
          >
            Conferma importazione e apri l'editor <ArrowRight size={18} aria-hidden="true" />
          </button>
        </Dialog>
      )}
      {approval && (
        <Dialog title="Conferma i target della scheda" close={() => setApproval(null)}>
          <p>
            Stai approvando{' '}
            <strong>
              {approval.name} · versione {approval.version}
            </strong>
            , {counted(approval.days.length, 'giornata', 'giornate')} e{' '}
            {counted(approval.weeks.length, 'settimana', 'settimane')}. Le sedute conserveranno una
            copia dei target scelti.
          </p>
          <p>
            Controlla carichi, convenzioni, serie, RIR e ciclo. I carichi non impostati resteranno
            vuoti e saranno inseriti durante la seduta.
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button className={styles.primary} disabled={busy} onClick={() => void approve()}>
            Confermo e approvo questa versione <Check size={18} aria-hidden="true" />
          </button>
        </Dialog>
      )}
      {sharing && (
        <Dialog title="Prepara una copia da condividere" close={() => setSharing(null)}>
          <p>
            <strong>{sharing.name}</strong> · {counted(sharing.days.length, 'giornata', 'giornate')}{' '}
            · {counted(sharing.weeks.length, 'settimana', 'settimane')}.
          </p>
          <p>
            La copia contiene esercizi, target e ciclo. Gli identificativi sono nuovi; diario,
            misure, nutrizione e provenienza personale sono esclusi. Il destinatario dovrà
            approvarla.
          </p>
          <p>Controlla il nome della scheda e i testi degli esercizi prima di inviare il file.</p>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={shareNotes}
              onChange={(e) => setShareNotes(e.target.checked)}
            />
            Includi anche le note degli esercizi (possono contenere dati personali)
          </label>
          <button
            className={styles.primary}
            onClick={() => {
              const copied = copyProgram(
                sharing,
                () => crypto.randomUUID(),
                new Date().toISOString(),
              );
              const clean = {
                ...copied,
                source: '',
                days: copied.days.map((d) => ({
                  ...d,
                  exercises: d.exercises.map((p) => ({ ...p, notes: shareNotes ? p.notes : '' })),
                })),
              };
              downloadJson(
                JSON.stringify(
                  templateSchema.parse({
                    format: 'workout-program',
                    schema_version: 1,
                    kind: 'program_template',
                    program: clean,
                  }),
                  null,
                  2,
                ),
                'TR-LAB-scheda.json',
              );
              setSharing(null);
            }}
          >
            Scarica la copia selezionata <ArrowDownToLine size={18} aria-hidden="true" />
          </button>
        </Dialog>
      )}
    </>
  );
}

function ProgramEditor({
  program,
  setProgram,
  submit,
  busy,
  error,
}: {
  program: Program;
  setProgram: (p: Program) => void;
  submit: () => void;
  busy: boolean;
  error: string;
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [exerciseId, setExerciseId] = useState(catalog[0]?.id ?? '');
  const day = program.days[dayIndex] ?? program.days[0];
  if (!day) return null;
  const updateDay = (patch: Partial<Program['days'][number]>) =>
    setProgram({
      ...program,
      days: program.days.map((d) => (d.id === day.id ? { ...d, ...patch } : d)),
    });
  const updateExercise = (prescription: Prescription) =>
    updateDay({
      exercises: day.exercises.map((p) => (p.id === prescription.id ? prescription : p)),
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className={styles.formGrid}>
        <label>
          Nome della scheda
          <input
            required
            maxLength={200}
            value={program.name}
            onChange={(e) => setProgram({ ...program, name: e.target.value })}
          />
        </label>
        <label>
          Obiettivo
          <select
            value={program.goal}
            onChange={(e) => setProgram({ ...program, goal: e.target.value as Program['goal'] })}
          >
            <option value="hypertrophy">Ipertrofia</option>
            <option value="strength">Forza</option>
            <option value="bodyweight">Corpo libero</option>
          </select>
        </label>
      </div>
      <p className={styles.hint}>
        I valori iniziali sono campi dell'editor da verificare, non una prescrizione automatica.
      </p>
      <div className={styles.tabs} role="group" aria-label="Giornate">
        {program.days.map((d, i) => (
          <button
            type="button"
            key={d.id}
            className={i === dayIndex ? styles.activeTab : ''}
            onClick={() => setDayIndex(i)}
          >
            {d.name}
          </button>
        ))}
        <button
          type="button"
          disabled={program.days.length >= 14}
          onClick={() => {
            setProgram({
              ...program,
              days: [
                ...program.days,
                {
                  id: crypto.randomUUID(),
                  name: `Giorno ${program.days.length + 1}`,
                  focus: '',
                  exercises: [],
                },
              ],
            });
            setDayIndex(program.days.length);
          }}
        >
          <Plus size={16} aria-hidden="true" />
          Giorno
        </button>
      </div>
      <div className={styles.formGrid}>
        <label>
          Nome giornata
          <input
            required
            value={day.name}
            maxLength={200}
            onChange={(e) => updateDay({ name: e.target.value })}
          />
        </label>
        <label>
          Focus
          <input
            value={day.focus}
            maxLength={200}
            onChange={(e) => updateDay({ focus: e.target.value })}
          />
        </label>
        {program.days.length > 1 && (
          <button
            type="button"
            className={styles.danger}
            onClick={() => {
              setProgram({ ...program, days: program.days.filter((d) => d.id !== day.id) });
              setDayIndex(0);
            }}
          >
            Rimuovi giornata
          </button>
        )}
      </div>
      {day.exercises.map((p, index) => (
        <fieldset className={styles.editorExercise} key={p.id}>
          <legend>
            {index + 1}. {p.exercise.name}
          </legend>
          <p className={styles.hint}>
            I campi numerici mostrano la prima serie: modificarli applica il nuovo valore a tutte le
            serie di questo esercizio. Le differenze tra serie importate restano conservate finché
            non cambi il campo corrispondente. Controlla il riepilogo prima di approvare.
          </p>
          <div className={styles.doseGrid}>
            <label>
              Serie
              <input
                aria-label={`Serie ${index + 1}`}
                type="number"
                min="1"
                max="30"
                step="1"
                required
                value={p.targets.length}
                onChange={(e) => {
                  const count = Number(e.target.value);
                  const first = p.targets[0];
                  if (first && Number.isInteger(count) && count >= 1 && count <= 30)
                    updateExercise({
                      ...p,
                      targets: Array.from(
                        { length: count },
                        (_, i) => p.targets[i] ?? { ...first, id: crypto.randomUUID() },
                      ),
                    });
                }}
              />
            </label>
            {(['repsMin', 'repsMax', 'rir', 'restSeconds'] as const).map((field) => (
              <label key={field}>
                {
                  {
                    repsMin: 'Rip. min',
                    repsMax: 'Rip. max',
                    rir: 'RIR',
                    restSeconds: 'Recupero (s)',
                  }[field]
                }
                <DecimalInput
                  required
                  min={field === 'rir' || field === 'restSeconds' ? 0 : 1}
                  max={field === 'rir' ? 10 : field === 'restSeconds' ? 1800 : 100}
                  integer={field !== 'rir'}
                  value={p.targets[0]?.[field] ?? null}
                  onValue={(value) => {
                    if (value === null) return;
                    updateExercise({
                      ...p,
                      targets: p.targets.map((t) => ({
                        ...t,
                        [field]: value,
                      })),
                    });
                  }}
                />
              </label>
            ))}
          </div>
          <div className={styles.formGrid}>
            <label>
              Carico (kg) · {loadBasisLabel[p.exercise.basis]}
              <DecimalInput
                value={p.targets[0]?.loadGrams ?? null}
                scale={1000}
                onValue={(value) => {
                  updateExercise({
                    ...p,
                    targets: p.targets.map((t) => ({
                      ...t,
                      loadGrams: value === null ? null : Math.round(value),
                    })),
                  });
                }}
              />
            </label>
            <label>
              Superserie (opzionale)
              <input
                value={p.superset ?? ''}
                maxLength={30}
                onChange={(e) => updateExercise({ ...p, superset: e.target.value || null })}
              />
            </label>
          </div>
          <label>
            Note
            <textarea
              value={p.notes}
              maxLength={3000}
              onChange={(e) => updateExercise({ ...p, notes: e.target.value })}
            />
          </label>
          <div className={styles.actionStrip}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={p.accumulation !== false}
                onChange={(e) => updateExercise({ ...p, accumulation: e.target.checked })}
              />
              Aggiungi le serie previste nelle settimane di accumulo
            </label>
            <button
              type="button"
              className={styles.danger}
              onClick={() =>
                updateDay({ exercises: day.exercises.filter((item) => item.id !== p.id) })
              }
            >
              <Trash2 size={16} aria-hidden="true" />
              Rimuovi
            </button>
            {index > 0 && (
              <button
                type="button"
                onClick={() => {
                  const items = [...day.exercises];
                  items.splice(index, 1);
                  items.splice(index - 1, 0, p);
                  updateDay({ exercises: items });
                }}
              >
                Sposta sopra
              </button>
            )}
          </div>
        </fieldset>
      ))}
      <div className={styles.addExercise}>
        <label>
          Aggiungi esercizio
          <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            {catalog.map((e) => (
              <option value={e.id} key={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.secondary}
          disabled={day.exercises.length >= 50}
          onClick={() => {
            const exercise = catalog.find((e) => e.id === exerciseId);
            if (exercise)
              updateDay({
                exercises: [
                  ...day.exercises,
                  createPrescription(
                    exercise,
                    Array.from({ length: 4 }, () => crypto.randomUUID()),
                  ),
                ],
              });
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Aggiungi
        </button>
      </div>
      <h3>Ciclo e progressione delle settimane</h3>
      <p className={styles.hint}>
        Le modifiche del ciclo fanno parte dei target che approvi. “RIR invariato” conserva il
        valore di ogni esercizio. Scarico dimezza le serie di lavoro, arrotondando in alto.
      </p>
      {program.weeks.map((w, i) => (
        <div className={styles.weekEditor} key={i}>
          <label>
            Settimana {i + 1}
            <input
              required
              maxLength={200}
              value={w.name}
              onChange={(e) =>
                setProgram({
                  ...program,
                  weeks: program.weeks.map((item, j) =>
                    j === i ? { ...item, name: e.target.value } : item,
                  ),
                })
              }
            />
          </label>
          <label>
            Fase
            <select
              value={w.phase}
              onChange={(e) =>
                setProgram({
                  ...program,
                  weeks: program.weeks.map((item, j) =>
                    j === i ? { ...item, phase: e.target.value as typeof w.phase } : item,
                  ),
                })
              }
            >
              {[
                ['test', 'Test'],
                ['base', 'Base'],
                ['accumulation', 'Accumulo'],
                ['peak', 'Picco'],
                ['deload', 'Scarico'],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Serie aggiuntive
            <input
              type="number"
              min="0"
              max="3"
              required
              value={w.extraSets}
              onChange={(e) =>
                setProgram({
                  ...program,
                  weeks: program.weeks.map((item, j) =>
                    j === i ? { ...item, extraSets: Number(e.target.value) } : item,
                  ),
                })
              }
            />
          </label>
          <label>
            RIR della settimana
            <select
              value={w.rir ?? ''}
              onChange={(e) =>
                setProgram({
                  ...program,
                  weeks: program.weeks.map((item, j) =>
                    j === i
                      ? { ...item, rir: e.target.value === '' ? null : Number(e.target.value) }
                      : item,
                  ),
                })
              }
            >
              <option value="">Invariato</option>
              {Array.from({ length: 11 }, (_, n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {program.weeks.length > 1 && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Rimuovi settimana ${i + 1}`}
              onClick={() =>
                setProgram({ ...program, weeks: program.weeks.filter((_, j) => i !== j) })
              }
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className={styles.secondary}
        disabled={program.weeks.length >= 52}
        onClick={() =>
          setProgram({
            ...program,
            weeks: [...program.weeks, { name: 'Base', phase: 'base', extraSets: 0, rir: null }],
          })
        }
      >
        <Plus size={16} aria-hidden="true" />
        Settimana
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.dialogActions}>
        <button className={styles.primary} disabled={busy} type="submit">
          {busy ? 'Salvataggio…' : 'Salva la bozza'}
          <Check size={18} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
