import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { type ScheduledSession, type WorkoutSession } from '@tr-lab/contracts';
import { planCalendar, resolveDay } from '@tr-lab/domain';
import { useApp } from './AppProvider';
import { Dialog, errorMessage } from './Shared';
import styles from '../styles/App.module.css';
const labels = {
  planned: 'Pianificata',
  cancelled: 'Annullata',
  skipped: 'Saltata',
  active: 'In corso',
  completed: 'Conclusa',
};
const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
export function CalendarPanel() {
  const { entities, save, notify } = useApp(),
    navigate = useNavigate();
  const programs = entities.flatMap((r) =>
    r.kind === 'program' && r.data.status === 'approved' ? [r.data] : [],
  );
  const [planning, setPlanning] = useState(false),
    [selected, setSelected] = useState(''),
    [date, setDate] = useState(() => new Intl.DateTimeFormat('sv-SE').format(new Date())),
    [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    [weekdays, setWeekdays] = useState<number[]>([]),
    [fromWeek, setFromWeek] = useState(1),
    [weeks, setWeeks] = useState(1),
    [seed, setSeed] = useState(() => crypto.randomUUID()),
    [createdAt, setCreatedAt] = useState(() => new Date().toISOString()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [moving, setMoving] = useState<ScheduledSession | null>(null),
    [moveDate, setMoveDate] = useState(''),
    [limit, setLimit] = useState(50);
  const program = programs.find((p) => p.id === selected) ?? programs[0];
  const preview = useMemo(() => {
    if (!planning || !program) return null;
    let index = 0;
    try {
      return {
        value: planCalendar({
          program,
          startDate: date,
          timeZone,
          weekdays,
          fromWeek: fromWeek - 1,
          weeks,
          nextId: () => seed.slice(0, 24) + (++index).toString(16).padStart(12, '0'),
          now: createdAt,
        }),
        error: '',
      };
    } catch (e) {
      return { value: null, error: errorMessage(e) };
    }
  }, [planning, program, date, timeZone, weekdays, fromWeek, weeks, seed, createdAt]);
  const occurrences = entities
    .flatMap((r) => (r.kind === 'scheduled_session' ? [r.data] : []))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  async function confirmPlan() {
    if (!preview?.value) return;
    setBusy(true);
    setError('');
    try {
      const { cycle, occurrences } = preview.value;
      await save(
        'PlanCycle',
        { id: cycle.id, kind: 'cycle', revision: '0', data: cycle },
        occurrences.map((data) => ({
          id: data.id,
          kind: 'scheduled_session',
          revision: '0',
          data,
        })),
      );
      setPlanning(false);
      notify(
        'Calendario salvato sul dispositivo. Le date e le settimane del ciclo sono esplicite.',
        'success',
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function start(occurrence: ScheduledSession) {
    setBusy(true);
    try {
      if (occurrence.sessionId) {
        navigate(`/seduta/${occurrence.sessionId}`);
        return;
      }
      const p = programs.find((p) => p.id === occurrence.programId),
        day = p?.days.find((d) => d.id === occurrence.dayId);
      if (!p || !day)
        throw new Error('Scheda approvata non disponibile: completa il download prima di avviare.');
      const session: WorkoutSession = {
        id: crypto.randomUUID(),
        programId: p.id,
        dayId: day.id,
        weekIndex: occurrence.weekIndex,
        snapshot: resolveDay(p, day, occurrence.weekIndex),
        status: 'active',
        startedAt: new Date().toISOString(),
        endedAt: null,
        notes: '',
      };
      await save(
        'StartScheduledWorkout',
        {
          id: occurrence.id,
          kind: 'scheduled_session',
          revision: '0',
          data: { ...occurrence, status: 'active', sessionId: session.id },
        },
        [{ id: session.id, kind: 'session', revision: '0', data: session }],
      );
      navigate(`/seduta/${session.id}`);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="calendario" className={styles.panel}>
      <div className={styles.sectionHeading}>
        <h2>Calendario delle sedute</h2>
        <button
          disabled={!programs.length}
          onClick={() => {
            setSeed(crypto.randomUUID());
            setCreatedAt(new Date().toISOString());
            setPlanning(true);
            setError('');
          }}
        >
          Pianifica un ciclo
        </button>
      </div>
      <p>
        Una data passata resta da riprogrammare finché scegli cosa fare. Spostare una seduta
        conserva la fase e i target; nessun allenamento viene concluso automaticamente.
      </p>
      {!occurrences.length && (
        <p>Nessuna seduta pianificata. Approva una scheda e scegli le date del ciclo.</p>
      )}
      {occurrences.slice(0, limit).map((o) => {
        const p = programs.find((p) => p.id === o.programId),
          day = p?.days.find((d) => d.id === o.dayId),
          session = entities.find((r) => r.kind === 'session' && r.id === o.sessionId);
        const status =
          session?.kind === 'session' && session.data.status === 'completed'
            ? 'completed'
            : o.status;
        return (
          <article key={o.id} className={styles.agendaItem}>
            <div>
              <strong>
                {o.date} · {day?.name ?? 'Giornata'}
              </strong>
              <p>
                {p?.name ?? 'Scheda'} · versione {p?.version ?? '—'} · settimana {o.weekIndex + 1} (
                {p?.weeks[o.weekIndex]?.name ?? '—'}) · {labels[status]}
              </p>
              <small>{o.timeZone}</small>
            </div>
            <div className={styles.agendaActions}>
              {o.sessionId ? (
                <Link to={`/seduta/${o.sessionId}`}>
                  {status === 'completed' ? 'Apri diario' : 'Riprendi'}
                </Link>
              ) : (
                o.status === 'planned' && (
                  <>
                    <button disabled={busy} onClick={() => void start(o)}>
                      Avvia
                    </button>
                    <button
                      onClick={() => {
                        setMoving(o);
                        setMoveDate(o.date);
                        setError('');
                      }}
                    >
                      Sposta
                    </button>
                    {(['skipped', 'cancelled'] as const).map((status) => (
                      <button
                        key={status}
                        disabled={busy}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `${status === 'skipped' ? 'Segnare come saltata' : 'Annullare'} questa seduta? Il diario rimane invariato.`,
                            )
                          )
                            return;
                          void save('CancelScheduledSession', {
                            id: o.id,
                            kind: 'scheduled_session',
                            revision: '0',
                            data: { ...o, status },
                          }).catch((e) => notify(errorMessage(e)));
                        }}
                      >
                        {status === 'skipped' ? 'Salta' : 'Annulla'}
                      </button>
                    ))}
                  </>
                )
              )}
            </div>
          </article>
        );
      })}
      {occurrences.length > limit && (
        <button onClick={() => setLimit(limit + 50)}>Mostra altre sedute</button>
      )}
      {planning && (
        <Dialog
          title="Pianifica il ciclo"
          busy={busy}
          close={() => {
            if (!busy) setPlanning(false);
          }}
        >
          <fieldset disabled={busy} className={styles.editorFields}>
            <legend>Date e collegamenti</legend>
            <label>
              Scheda approvata
              <select
                value={program?.id ?? ''}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setFromWeek(1);
                  setWeeks(1);
                }}
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · v{p.version}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.formGrid}>
              <label>
                Da questa data
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Fuso delle date
                <input required value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
              </label>
              <label>
                Prima settimana del ciclo
                <input
                  type="number"
                  min={1}
                  max={program?.weeks.length ?? 1}
                  value={fromWeek}
                  onChange={(e) => setFromWeek(Number(e.target.value))}
                />
              </label>
              <label>
                Numero di settimane
                <input
                  type="number"
                  min={1}
                  max={program?.weeks.length ?? 1}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                />
              </label>
            </div>
            <fieldset>
              <legend>Giorni disponibili</legend>
              {dayNames.map((name, index) => (
                <label className={styles.checkbox} key={index}>
                  <input
                    type="checkbox"
                    checked={weekdays.includes(index)}
                    onChange={(e) =>
                      setWeekdays(
                        e.target.checked
                          ? [...weekdays, index]
                          : weekdays.filter((n) => n !== index),
                      )
                    }
                  />
                  {name}
                </label>
              ))}
            </fieldset>
            <p>
              Le giornate seguono l’ordine della scheda nei giorni disponibili. La settimana del
              ciclo avanza dopo tutte le sue giornate, anche se occupa più di una settimana di
              calendario.
            </p>
            {preview?.error && <p role="alert">{preview.error}</p>}
            {preview?.value && (
              <>
                <h3>Anteprima delle date</h3>
                <ul>
                  {preview.value.occurrences.map((o) => (
                    <li key={o.id}>
                      {o.date} · {program?.days.find((d) => d.id === o.dayId)?.name} · settimana{' '}
                      {o.weekIndex + 1}
                      {occurrences.some(
                        (existing) =>
                          existing.date === o.date &&
                          !['cancelled', 'skipped'].includes(existing.status),
                      )
                        ? ' · Altra seduta presente: verifica la sovrapposizione delle date.'
                        : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <button
              className={styles.primary}
              disabled={!preview?.value || busy}
              onClick={() => void confirmPlan()}
            >
              Confermo tutte le date mostrate
            </button>
          </fieldset>
        </Dialog>
      )}
      {moving && (
        <Dialog
          title="Sposta la seduta"
          busy={busy}
          close={() => {
            if (!busy) setMoving(null);
          }}
        >
          <label>
            Nuova data
            <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
          </label>
          <p>Settimana {moving.weekIndex + 1}, versione e target restano gli stessi.</p>
          {error && <p role="alert">{error}</p>}
          <button
            className={styles.primary}
            disabled={busy || !moveDate}
            onClick={() => {
              setBusy(true);
              void save('SaveScheduledSession', {
                id: moving.id,
                kind: 'scheduled_session',
                revision: '0',
                data: { ...moving, date: moveDate },
              })
                .then(() => setMoving(null))
                .catch((e) => setError(errorMessage(e)))
                .finally(() => setBusy(false));
            }}
          >
            Confermo il rinvio
          </button>
        </Dialog>
      )}
    </section>
  );
}
