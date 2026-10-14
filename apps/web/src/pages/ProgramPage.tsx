import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowDownToLine, ArrowRight, Check, Copy, FileUp, Plus, Printer } from 'lucide-react';
import {
  programSchema,
  templateSchema,
  type Program,
  type WorkbookData,
  type ImportReport,
  type PrivateExercise,
} from '@tr-lab/contracts';
import { copyProgram, resolveDay } from '@tr-lab/domain';
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
import { ProgramEditor } from '../components/ProgramEditor';
import { ExcelImportReview } from '../components/ExcelImportReview';
import { CalendarPanel } from '../components/CalendarPanel';
import { ProposalCenter } from '../components/ProposalCenter';
import { useCatalog } from '../data/use-catalog';
import { importXlsx } from '../import/client';
import styles from '../styles/App.module.css';

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
  const catalog = useCatalog();
  const programs = entities
    .filter((r) => r.kind === 'program')
    .map((r) => r.data)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [draft, setDraft] = useState<Program | null>(null);
  const [importOrigin, setImportOrigin] = useState<{
    report: ImportReport;
    variants: PrivateExercise[];
    candidate: Program;
  } | null>(null);
  function openDraft(value: Program | null) {
    setImportOrigin(null);
    setDraft(value);
  }
  const [preview, setPreview] = useState<Program | null>(null);
  const [previewFromExcel, setPreviewFromExcel] = useState(false);
  const [approval, setApproval] = useState<Program | null>(null);
  const [sharing, setSharing] = useState<Program | null>(null);
  const [shareNotes, setShareNotes] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const [weekIndex, setWeekIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const importController = useRef<AbortController | null>(null);
  const [excel, setExcel] = useState<{
    workbook: WorkbookData;
    fileName: string;
    fileDigest: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  useEffect(() => () => importController.current?.abort(), []);
  const program = programs.find((p) => p.id === selected) ?? programs[0];
  const previewWeek = program?.weeks[weekIndex] ? weekIndex : 0;
  async function saveDraft(value: Program) {
    setBusy(true);
    setError('');
    try {
      const valid = programSchema.parse(value);
      if (importOrigin) {
        const variants = importOrigin.variants.filter((v) =>
          valid.days.some((d) => d.exercises.some((e) => e.exercise.id === v.exercise.id)),
        );
        const report = {
          ...importOrigin.report,
          editedInEditor: JSON.stringify(valid) !== JSON.stringify(importOrigin.candidate),
        };
        await save(
          'ImportProgramDraft',
          { id: valid.id, kind: 'program', revision: '0', data: valid },
          [
            { id: report.id, kind: 'import_report', revision: '0', data: report },
            ...variants.map((data) => ({
              id: data.id,
              kind: 'private_exercise' as const,
              revision: '0',
              data,
            })),
          ],
        );
      } else
        await save('SaveProgramDraft', {
          id: valid.id,
          kind: 'program',
          revision: '0',
          data: valid,
        });
      openDraft(null);
      setSelected(valid.id);
      setWeekIndex(0);
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
    event.target.value = '';
    importController.current?.abort();
    const controller = new AbortController();
    importController.current = controller;
    setImporting(true);
    try {
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const result = await importXlsx(file, controller.signal);
        if (!controller.signal.aborted) setExcel({ ...result, fileName: file.name });
        return;
      }
      if (file.size > 1024 * 1024)
        throw new Error('Il modello JSON deve essere inferiore a 1 MiB.');
      if (!file.name.toLowerCase().endsWith('.json'))
        throw new Error('Scegli una scheda .xlsx supportata o un modello JSON TR LAB.');
      const model = templateSchema.parse(JSON.parse(await file.text()));
      setPreviewFromExcel(false);
      setPreview(copyProgram(model.program, () => crypto.randomUUID(), new Date().toISOString()));
    } catch (error) {
      if (!controller.signal.aborted) notify(errorMessage(error));
    } finally {
      if (importController.current === controller) {
        setImporting(false);
        importController.current = null;
      }
    }
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
            openDraft(newProgram());
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
        <button disabled={importing} onClick={() => input.current?.click()}>
          <FileUp size={18} aria-hidden="true" />
          {importing ? 'Lettura Excel…' : 'Importa Excel o JSON'}
        </button>
        {importing && (
          <button
            onClick={() => {
              importController.current?.abort();
              setImporting(false);
            }}
          >
            Annulla lettura
          </button>
        )}
        <input
          ref={input}
          className={styles.hidden}
          type="file"
          accept=".xlsx,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => void importFile(e)}
        />
      </div>
      {programs.length ? (
        <div className={styles.programLayout}>
          <aside className={styles.programList} aria-label="Le tue schede">
            {programs.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelected(p.id);
                  setWeekIndex(0);
                }}
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
            <section className={`${styles.panel} ${styles.programDetail}`}>
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
                    openDraft(
                      program.status === 'draft'
                        ? structuredClone(program)
                        : {
                            ...structuredClone(program),
                            id: crypto.randomUUID(),
                            status: 'draft',
                            version: String(
                              programs
                                .filter(
                                  (p) => p.rootId === program.rootId && p.status === 'approved',
                                )
                                .reduce(
                                  (max, p) => (BigInt(p.version) > max ? BigInt(p.version) : max),
                                  0n,
                                ) + 1n,
                            ),
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
              <label className={styles.weekPreview}>
                Anteprima settimana
                <select value={previewWeek} onChange={(e) => setWeekIndex(Number(e.target.value))}>
                  {program.weeks.map((w, i) => (
                    <option key={i} value={i}>
                      Settimana {i + 1} · {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className={styles.hint}>
                Target della settimana {previewWeek + 1}, compresi accumulo e scarico. Questa
                anteprima non modifica la scheda.
              </p>
              {program.days
                .map((day) => resolveDay(program, day, previewWeek))
                .map((d) => (
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
                              {target.side === 'left'
                                ? ' SX'
                                : target.side === 'right'
                                  ? ' DX'
                                  : ''}{' '}
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
          <button className={styles.secondary} onClick={() => openDraft(newProgram())}>
            Costruisci il programma <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {draft && (
        <Dialog title="Editor della scheda" close={() => openDraft(null)}>
          <ProgramEditor
            catalog={[...catalog, ...(importOrigin?.variants.map((v) => v.exercise) ?? [])]}
            program={draft}
            setProgram={setDraft}
            submit={() => void saveDraft(draft)}
            busy={busy}
            error={error}
          />
        </Dialog>
      )}
      {excel && (
        <Dialog title="Anteprima del file Excel" close={() => setExcel(null)}>
          <ExcelImportReview
            workbook={excel.workbook}
            fileName={excel.fileName}
            fileDigest={excel.fileDigest}
            confirm={(program, report, variants) => {
              setImportOrigin({ report, variants, candidate: program });
              setDraft(program);
              setExcel(null);
              setError('');
            }}
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
              openDraft(preview);
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
      <CalendarPanel />
      <ProposalCenter />
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
                  exercises: d.exercises.map((p) => ({
                    ...p,
                    exercise: {
                      ...p.exercise,
                      id: p.exercise.id.startsWith('private:')
                        ? `embedded:${crypto.randomUUID()}`
                        : p.exercise.id,
                      instructions: shareNotes ? p.exercise.instructions : '',
                    },
                    notes: shareNotes ? p.notes : '',
                  })),
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
