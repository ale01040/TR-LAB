import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, Clock3, Flag, Save } from 'lucide-react';
import { setSchema, type Prescription, type SetLog, type Target } from '@tr-lab/contracts';
import { countRequired, parseDecimal, targetSides, journalData } from '@tr-lab/domain';
import { useApp } from '../components/AppProvider';
import { metadata, setMetadata } from '../data/database';
import { counted, Dialog, errorMessage, kilos } from '../components/Shared';
import styles from '../styles/App.module.css';

export function WorkoutPage() {
  const { id } = useParams();
  const { entities, save, notify, account } = useApp();
  const record = entities.find(
    (r) => ['session', 'recovered_workout'].includes(r.kind) && r.id === id,
  );
  const journal = journalData(entities);
  const session = journal.sessions.find((s) => s.id === id) ?? null;
  const logs = journal.sets.filter((l) => l.sessionId === id);
  const [finish, setFinish] = useState(false);
  const [busy, setBusy] = useState(false);
  const finishing = useRef(false);
  const [finishError, setFinishError] = useState('');
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let cancelled = false;
    setDeadline(null);
    void metadata(`${account}:timer:${id}`)
      .then((value) => {
        if (cancelled) return;
        const end = Number(value);
        if (Number.isFinite(end) && end > 0) {
          setNow(Date.now());
          setDeadline(end);
        }
      })
      .catch(() => {
        if (!cancelled)
          notify('Ripristino del timer non disponibile; gestisci il recupero manualmente.');
      });
    return () => {
      cancelled = true;
    };
  }, [account, id, notify]);
  useEffect(() => {
    if (deadline === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  if (!session || !record)
    return (
      <>
        <h1>Seduta non trovata</h1>
        <Link to="/">Torna a Oggi</Link>
      </>
    );
  const expected = countRequired(session.snapshot);
  const missing = expected - logs.length;
  const completed = logs.filter((l) => l.status === 'completed').length;
  async function saveSet(log: SetLog, rest: number) {
    if (!session || record?.kind !== 'session') return;
    await save('SaveSet', { id: log.id, kind: 'set', revision: '0', data: setSchema.parse(log) }, [
      record,
    ]);
    if (log.status === 'completed' && rest > 0) {
      const end = Date.now() + rest * 1000;
      try {
        await setMetadata(`${account}:timer:${id}`, String(end));
        setNow(Date.now());
        setDeadline(end);
      } catch {
        // La serie è già confermata: un accessorio non deve dichiarare fallito il commit.
        setDeadline(null);
        notify(
          'Serie salvata sul dispositivo. Timer non disponibile; gestisci il recupero manualmente.',
        );
        return;
      }
    }
    notify('Serie salvata sul dispositivo.', 'success');
  }
  async function endSession() {
    if (!session || finishing.current) return;
    finishing.current = true;
    setFinishError('');
    setBusy(true);
    try {
      const value = {
        ...session,
        status: 'completed' as const,
        endedAt: new Date().toISOString(),
        notes,
      };
      await save('FinishWorkout', {
        id: value.id,
        kind: 'session',
        revision: record?.revision ?? '0',
        data: value,
      });
      setFinish(false);
      setDeadline(null);
      notify('Seduta conclusa. I risultati e i target originali sono conservati.', 'success');
    } catch (error) {
      setFinishError(errorMessage(error));
    } finally {
      finishing.current = false;
      setBusy(false);
    }
  }
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  return (
    <>
      <Link className={styles.textLink} to="/">
        <ChevronLeft size={16} aria-hidden="true" />
        Torna a Oggi
      </Link>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>
            {session.status === 'active' ? 'SEDUTA IN CORSO' : 'DIARIO / SEDUTA CONCLUSA'} ·
            SETTIMANA {session.weekIndex + 1}
          </span>
          <h1>{session.snapshot.name}</h1>
          <p>
            {counted(completed, 'serie eseguita', 'serie eseguite')} ·{' '}
            {counted(
              logs.filter((l) => l.status === 'skipped').length,
              'serie saltata',
              'serie saltate',
            )}
            {' · '}
            {Math.max(0, missing)} da registrare
          </p>
        </div>
        {session.status === 'active' && (
          <button
            className={styles.secondary}
            onClick={() => {
              setNotes(session.notes);
              setFinish(true);
            }}
          >
            <Flag size={18} aria-hidden="true" />
            Concludi seduta
          </button>
        )}
      </div>
      {record.kind === 'recovered_workout' && (
        <p className={styles.hint}>
          Storico recuperato da dati locali, di sola lettura. Conserva snapshot ed esecuzioni; non
          approva sul server il piano da cui proviene.
        </p>
      )}
      {session.status === 'active' && (
        <details>
          <summary>Come registrare e salvare una serie</summary>
          <p>
            Il target è ciò che era previsto. Inserisci il risultato reale e premi Salva o Invio.
            RIR indica le ripetizioni che pensi di avere ancora disponibili: zero è valido. Il
            carico segue la convenzione indicata per l’esercizio.{' '}
            <Link to="/aiuto#diario">Apri la guida del diario</Link>.
          </p>
        </details>
      )}
      {session.status === 'completed' && session.notes && (
        <section className={styles.panel}>
          <h2>Note della seduta</h2>
          <p>{session.notes}</p>
        </section>
      )}
      <div
        className={styles.progressTrack}
        aria-label={`${counted(logs.length, 'registrazione', 'registrazioni')} su ${expected}`}
      >
        <span style={{ width: `${Math.min(100, (logs.length / expected) * 100)}%` }} />
      </div>
      {seconds !== null && session.status === 'active' && (
        <div className={styles.timer} role="timer" aria-label="Tempo di recupero">
          <Clock3 size={18} aria-hidden="true" />
          <strong>
            {seconds
              ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
              : 'Recupero terminato'}
          </strong>
          <button
            onClick={() => {
              setDeadline(null);
              void setMetadata(`${account}:timer:${id}`, '0').catch(() => {
                notify(
                  'Timer chiuso. Lo stato non è stato salvato: potrebbe ricomparire alla riapertura.',
                );
              });
            }}
          >
            Chiudi timer
          </button>
        </div>
      )}
      {session.snapshot.exercises.map((p, i) => (
        <section className={styles.workoutExercise} key={p.id}>
          <div className={styles.exerciseTitle}>
            <span className={styles.exerciseNumber}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <span className={styles.eyebrow}>
                {p.exercise.muscle}
                {p.superset ? ` · SUPERSET ${p.superset}` : ''}
              </span>
              <h2>{p.exercise.name}</h2>
              <p>
                {p.exercise.basis === 'per_dumbbell'
                  ? 'Carico del singolo manubrio'
                  : p.exercise.basis === 'assistance'
                    ? 'Assistenza: un valore minore aumenta la difficoltà'
                    : p.exercise.basis === 'bodyweight'
                      ? 'Corpo libero · carico facoltativo'
                      : p.exercise.basis === 'machine'
                        ? 'Carico indicato sul pacco pesi'
                        : 'Carico totale'}{' '}
                ·{' '}
                {p.exercise.unilateral ? 'Registra separatamente SX e DX' : 'Esecuzione bilaterale'}
              </p>
            </div>
          </div>
          {p.notes && (
            <details className={styles.exerciseNotes}>
              <summary>Note della prescrizione</summary>
              <p>{p.notes}</p>
            </details>
          )}
          <div className={styles.setHeader}>
            <span>SERIE / TARGET</span>
            <span>KG</span>
            <span>RIP.</span>
            <span>RIR</span>
            <span>AZIONE</span>
          </div>
          {p.targets.flatMap((t, n) =>
            targetSides(p, t).map((side) => {
              const log = logs.find(
                (l) => l.prescriptionId === p.id && l.targetId === t.id && l.side === side,
              );
              return (
                <SetRow
                  key={`${t.id}:${side}`}
                  sessionId={session.id}
                  prescription={p}
                  target={t}
                  number={n + 1}
                  side={side}
                  log={log ?? null}
                  readOnly={session.status !== 'active'}
                  save={saveSet}
                />
              );
            }),
          )}
        </section>
      ))}
      {finish && (
        <Dialog title="Concludi questa seduta" close={() => setFinish(false)} busy={busy}>
          <p>
            {counted(completed, 'serie eseguita', 'serie eseguite')}.{' '}
            {missing > 0
              ? `${counted(missing, 'registrazione mancante', 'registrazioni mancanti')} ${missing === 1 ? 'rimarrà tale' : 'rimarranno tali'}: non vengono inventati risultati.`
              : 'Tutte le serie sono registrate.'}
          </p>
          <label>
            Note finali
            <textarea
              disabled={busy}
              value={notes}
              maxLength={3000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {finishError && (
            <p role="alert" className={styles.error}>
              {finishError} Le note restano disponibili; riprova il salvataggio.
            </p>
          )}
          <button className={styles.primary} disabled={busy} onClick={() => void endSession()}>
            {busy ? 'Concludo la seduta…' : 'Confermo la conclusione'}{' '}
            <Check size={18} aria-hidden="true" />
          </button>
        </Dialog>
      )}
    </>
  );
}
function SetRow({
  sessionId,
  prescription,
  target,
  number,
  side,
  log,
  readOnly,
  save,
}: {
  sessionId: string;
  prescription: Prescription;
  target: Target;
  number: number;
  side: SetLog['side'];
  log: SetLog | null;
  readOnly: boolean;
  save: (log: SetLog, rest: number) => Promise<void>;
}) {
  const [load, setLoad] = useState(
    log?.loadGrams === null || log?.loadGrams === undefined
      ? target.loadGrams === null
        ? ''
        : String(target.loadGrams / 1000)
      : String(log.loadGrams / 1000),
  );
  const [reps, setReps] = useState(log?.reps?.toString() ?? '');
  const [rir, setRir] = useState(log?.rir?.toString() ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saving = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackId = useId();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'load' | 'reps' | 'rir', string>>>(
    {},
  );
  useEffect(() => {
    if (!dirty && log) {
      setLoad(log.loadGrams === null ? '' : String(log.loadGrams / 1000));
      setReps(log.reps?.toString() ?? '');
      setRir(log.rir?.toString() ?? '');
    }
  }, [log, dirty]);
  async function commit(status: 'completed' | 'skipped') {
    if (saving.current) return;
    const weight = load.trim() ? parseDecimal(load) : null;
    const repetitions = parseDecimal(reps);
    const reserve = rir.trim() ? parseDecimal(rir) : null;
    const invalid: Partial<Record<'load' | 'reps' | 'rir', string>> = {};
    if (load.trim() && (weight === null || weight < 0))
      invalid.load = 'Carico non valido. Usa un numero non negativo, ad esempio 12,5 kg.';
    if (
      status === 'completed' &&
      (repetitions === null ||
        !Number.isInteger(repetitions) ||
        repetitions < 1 ||
        repetitions > 1000)
    )
      invalid.reps = 'Inserisci le ripetizioni eseguite: un intero tra 1 e 1000.';
    if (rir.trim() && (reserve === null || reserve < 0 || reserve > 10))
      invalid.rir = 'Inserisci un RIR tra 0 e 10. Zero è valido.';
    setFieldErrors(invalid);
    const first = Object.keys(invalid)[0];
    if (first) {
      setError('Controlla i campi indicati. La serie non è stata salvata.');
      const field = formRef.current?.elements.namedItem(first);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (load.trim() && weight === null)
        throw new Error('Carico non valido. Usa ad esempio 12,5.');
      const value = setSchema.parse({
        id: log?.id ?? crypto.randomUUID(),
        sessionId,
        prescriptionId: prescription.id,
        targetId: target.id,
        side,
        loadGrams: weight === null ? null : Math.round(weight * 1000),
        reps: status === 'skipped' ? null : parseDecimal(reps),
        rir: rir.trim() ? parseDecimal(rir) : null,
        status,
        recordedAt: new Date().toISOString(),
        notes: log?.notes ?? '',
      });
      if (rir.trim() && parseDecimal(rir) === null) throw new Error('RIR non valido.');
      await save(value, target.restSeconds);
      setDirty(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const label = `Serie ${number}${side === 'left' ? ' sinistra' : side === 'right' ? ' destra' : ''}`;
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void commit('completed');
  };
  return (
    <form
      ref={formRef}
      className={`${styles.setRow} ${log && !dirty ? styles.setSaved : ''}`}
      onSubmit={onSubmit}
      aria-busy={busy}
    >
      <div className={styles.setLabel}>
        <strong>
          {number} {side === 'bilateral' ? '' : side === 'left' ? 'SX' : 'DX'}
        </strong>
        <span>
          {target.repsMin}–{target.repsMax} rip. · RIR {target.rir}
        </span>
        {target.kind !== 'work' && (
          <small>{target.kind === 'warmup' ? 'Riscaldamento' : 'Extra'}</small>
        )}
      </div>
      {readOnly ? (
        <>
          <div className={styles.setField}>
            <span className={styles.setFieldCaption}>Kg</span>
            <strong>{kilos(log?.loadGrams ?? null)}</strong>
          </div>
          <div className={styles.setField}>
            <span className={styles.setFieldCaption}>Ripetizioni</span>
            <strong>{log?.reps ?? '—'}</strong>
          </div>
          <div className={styles.setField}>
            <span className={styles.setFieldCaption}>RIR</span>
            <strong>{log?.rir ?? '—'}</strong>
          </div>
          <span className={styles.setStatus}>
            {log ? (log.status === 'completed' ? 'Eseguita' : 'Saltata') : 'Non registrata'}
          </span>
        </>
      ) : (
        <>
          <label className={styles.setField}>
            <span className={styles.setFieldCaption}>Kg</span>
            <input
              name="load"
              disabled={busy}
              aria-invalid={!!fieldErrors.load}
              aria-describedby={fieldErrors.load ? `${feedbackId}-load` : undefined}
              aria-label={`${label}, carico in kg`}
              inputMode="decimal"
              placeholder="—"
              value={load}
              onChange={(e) => {
                setLoad(e.target.value);
                setFieldErrors((value) => ({ ...value, load: '' }));
                setError('');
                setDirty(true);
              }}
            />
            {fieldErrors.load && (
              <span id={`${feedbackId}-load`} className={styles.fieldError}>
                {fieldErrors.load}
              </span>
            )}
          </label>
          <label className={styles.setField}>
            <span className={styles.setFieldCaption}>Ripetizioni</span>
            <input
              name="reps"
              disabled={busy}
              aria-invalid={!!fieldErrors.reps}
              aria-describedby={fieldErrors.reps ? `${feedbackId}-reps` : undefined}
              aria-label={`${label}, ripetizioni`}
              inputMode="numeric"
              placeholder="—"
              value={reps}
              onChange={(e) => {
                setReps(e.target.value);
                setFieldErrors((value) => ({ ...value, reps: '' }));
                setError('');
                setDirty(true);
              }}
            />
            {fieldErrors.reps && (
              <span id={`${feedbackId}-reps`} className={styles.fieldError}>
                {fieldErrors.reps}
              </span>
            )}
          </label>
          <label className={styles.setField}>
            <span className={styles.setFieldCaption}>RIR</span>
            <input
              name="rir"
              disabled={busy}
              aria-invalid={!!fieldErrors.rir}
              aria-describedby={fieldErrors.rir ? `${feedbackId}-rir` : undefined}
              aria-label={`${label}, RIR`}
              inputMode="decimal"
              placeholder="—"
              value={rir}
              onChange={(e) => {
                setRir(e.target.value);
                setFieldErrors((value) => ({ ...value, rir: '' }));
                setError('');
                setDirty(true);
              }}
            />
            {fieldErrors.rir && (
              <span id={`${feedbackId}-rir`} className={styles.fieldError}>
                {fieldErrors.rir}
              </span>
            )}
          </label>
          <div className={styles.setActions}>
            <button
              aria-label={`${log && !dirty ? 'Salvata' : 'Salva'} ${label}`}
              className={log && !dirty ? styles.savedButton : styles.saveButton}
              disabled={busy}
              type="submit"
            >
              {log && !dirty ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              <span>{busy ? 'Salvo…' : log && !dirty ? 'Salvata' : 'Salva'}</span>
            </button>
            {!log && (
              <button type="button" disabled={busy} onClick={() => void commit('skipped')}>
                Salta
              </button>
            )}
          </div>
        </>
      )}
      {!readOnly && (
        <p className={styles.setFeedback} role="status">
          {busy
            ? 'Salvataggio in corso…'
            : dirty
              ? 'Modifiche da salvare: premi Salva.'
              : log
                ? log.status === 'skipped'
                  ? 'Serie saltata e registrata sul dispositivo.'
                  : 'Serie salvata sul dispositivo.'
                : 'Da registrare. I valori previsti non sono risultati salvati.'}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.setError}>
          {error}
        </p>
      )}
    </form>
  );
}
