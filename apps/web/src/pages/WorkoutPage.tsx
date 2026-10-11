import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ChevronLeft, Clock3, Flag, Save } from 'lucide-react';
import { setSchema, type Prescription, type SetLog, type Target } from '@tr-lab/contracts';
import { countRequired, parseDecimal, targetSides } from '@tr-lab/domain';
import { useApp } from '../components/AppProvider';
import { metadata, setMetadata } from '../data/database';
import { Dialog, errorMessage, kilos } from '../components/Shared';
import styles from '../styles/App.module.css';

export function WorkoutPage() {
  const { id } = useParams();
  const { entities, save, notify, account } = useApp();
  const record = entities.find((r) => r.kind === 'session' && r.id === id);
  const session = record?.kind === 'session' ? record.data : null;
  const logs = entities.flatMap((r) =>
    r.kind === 'set' && r.data.sessionId === id ? [r.data] : [],
  );
  const [finish, setFinish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    void metadata(`${account}:timer:${id}`).then((value) => {
      if (value) setDeadline(Number(value));
    });
  }, [account, id]);
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
      await setMetadata(`${account}:timer:${id}`, String(end));
      setNow(Date.now());
      setDeadline(end);
    }
    notify('Serie salvata sul dispositivo.');
  }
  async function endSession() {
    if (!session) return;
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
      notify('Seduta conclusa. I risultati e i target originali sono conservati.');
    } catch (error) {
      notify(errorMessage(error));
    } finally {
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
            {completed} serie eseguite · {logs.filter((l) => l.status === 'skipped').length} saltate
            · {Math.max(0, missing)} da registrare
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
      {session.status === 'completed' && session.notes && (
        <section className={styles.panel}>
          <h2>Note della seduta</h2>
          <p>{session.notes}</p>
        </section>
      )}
      <div
        className={styles.progressTrack}
        aria-label={`${logs.length} registrazioni su ${expected}`}
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
              void setMetadata(`${account}:timer:${id}`, '0');
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
        <Dialog title="Concludi questa seduta" close={() => setFinish(false)}>
          <p>
            {completed} serie eseguite.{' '}
            {missing > 0
              ? `${missing} registrazioni mancanti rimarranno tali: non vengono inventati risultati.`
              : 'Tutte le serie sono registrate.'}
          </p>
          <label>
            Note finali
            <textarea value={notes} maxLength={3000} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button className={styles.primary} disabled={busy} onClick={() => void endSession()}>
            Confermo la conclusione <Check size={18} aria-hidden="true" />
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
  useEffect(() => {
    if (!dirty && log) {
      setLoad(log.loadGrams === null ? '' : String(log.loadGrams / 1000));
      setReps(log.reps?.toString() ?? '');
      setRir(log.rir?.toString() ?? '');
    }
  }, [log, dirty]);
  async function commit(status: 'completed' | 'skipped') {
    setBusy(true);
    setError('');
    try {
      const weight = load.trim() ? parseDecimal(load) : null;
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
      className={`${styles.setRow} ${log && !dirty ? styles.setSaved : ''}`}
      onSubmit={onSubmit}
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
          <strong>{kilos(log?.loadGrams ?? null)}</strong>
          <strong>{log?.reps ?? '—'}</strong>
          <strong>{log?.rir ?? '—'}</strong>
          <span>
            {log ? (log.status === 'completed' ? 'Eseguita' : 'Saltata') : 'Non registrata'}
          </span>
        </>
      ) : (
        <>
          <input
            aria-label={`${label}, carico in kg`}
            inputMode="decimal"
            placeholder="—"
            value={load}
            onChange={(e) => {
              setLoad(e.target.value);
              setDirty(true);
            }}
          />
          <input
            aria-label={`${label}, ripetizioni`}
            inputMode="numeric"
            placeholder="—"
            value={reps}
            onChange={(e) => {
              setReps(e.target.value);
              setDirty(true);
            }}
          />
          <input
            aria-label={`${label}, RIR`}
            inputMode="decimal"
            placeholder="—"
            value={rir}
            onChange={(e) => {
              setRir(e.target.value);
              setDirty(true);
            }}
          />
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
            </button>
            {!log && (
              <button type="button" disabled={busy} onClick={() => void commit('skipped')}>
                Salta
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className={styles.setError}>
          {error}
        </p>
      )}
    </form>
  );
}
