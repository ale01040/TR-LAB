import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Clock3, Dumbbell, Layers3 } from 'lucide-react';
import type { Program, WorkoutSession } from '@tr-lab/contracts';
import { countRequired, resolveDay, journalData } from '@tr-lab/domain';
import { useApp } from '../components/AppProvider';
import { counted, dateTime, errorMessage } from '../components/Shared';
import styles from '../styles/App.module.css';

export function TodayPage() {
  const { entities, save, notify } = useApp();
  const navigate = useNavigate();
  const programs = entities.flatMap((r) =>
    r.kind === 'program' && r.data.status === 'approved' ? [r.data] : [],
  );
  const journal = journalData(entities);
  const sessions = journal.sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const active = sessions.find((s) => s.status === 'active');
  const [selection, setSelection] = useState('');
  const program: Program | undefined = programs.find((p) => p.id === selection) ?? programs[0];
  const [dayIndex, setDayIndex] = useState(0);
  const [weekIndex, setWeekIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const day = program?.days[dayIndex] ?? program?.days[0];
  const week = program?.weeks[weekIndex] ?? program?.weeks[0];
  async function start() {
    if (!program || !day || active) return;
    setBusy(true);
    try {
      const session: WorkoutSession = {
        id: crypto.randomUUID(),
        programId: program.id,
        dayId: day.id,
        weekIndex: program.weeks[weekIndex] ? weekIndex : 0,
        snapshot: resolveDay(program, day, program.weeks[weekIndex] ? weekIndex : 0),
        status: 'active',
        startedAt: new Date().toISOString(),
        endedAt: null,
        notes: '',
      };
      await save('StartWorkout', { id: session.id, kind: 'session', revision: '0', data: session });
      navigate(`/seduta/${session.id}`);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const recent = sessions.filter((s) => s.status === 'completed').slice(0, 3);
  const completed = sessions.filter((s) => s.status === 'completed');
  const setCount = journal.sets.filter((r) => r.status === 'completed').length;
  const greeting = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>{greeting.toUpperCase()}</span>
          <h1>Il lavoro di oggi.</h1>
          <p>Il prossimo passo è quello che conta.</p>
        </div>
        <Link to="/programma" className={styles.textLink}>
          Schede e calendario <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <section className={styles.hero} aria-labelledby="next-workout">
        <div className={styles.heroText}>
          <span className={styles.pill}>
            <span />
            {active
              ? 'ALLENAMENTO IN CORSO'
              : program
                ? 'PRONTO QUANDO LO SEI TU'
                : 'IL TUO PUNTO DI PARTENZA'}
          </span>
          <h2 id="next-workout">
            {active ? (
              active.snapshot.name
            ) : (
              <>
                Una serie
                <br />
                alla volta<span>.</span>
              </>
            )}
          </h2>
          <p>
            {active
              ? `Iniziato ${dateTime(active.startedAt)}. I risultati già salvati ti aspettano.`
              : program
                ? `${program.name}. Scegli la giornata e la settimana, poi entra nella seduta.`
                : 'Costruisci il tuo programma. Registra ogni seduta, anche senza connessione. I dati restano tuoi.'}
          </p>
          {active ? (
            <Link className={styles.primary} to={`/seduta/${active.id}`}>
              Riprendi la seduta <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : !program ? (
            <Link className={styles.primary} to="/programma">
              Crea la prima scheda <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <a className={styles.primary} href="#start-workout">
              Scegli la seduta <ArrowRight size={18} aria-hidden="true" />
            </a>
          )}
        </div>
      </section>
      <div className={styles.stats}>
        <div>
          <span className={styles.statIcon}>
            <Check size={18} />
          </span>
          <span>SEDUTE CONCLUSE</span>
          <strong>{completed.length.toString().padStart(2, '0')}</strong>
        </div>
        <div>
          <span className={styles.statIcon}>
            <Layers3 size={18} />
          </span>
          <span>SERIE REGISTRATE</span>
          <strong>{setCount.toString().padStart(2, '0')}</strong>
        </div>
        <div>
          <span className={styles.statIcon}>
            <Dumbbell size={18} />
          </span>
          <span>SCHEDE APPROVATE</span>
          <strong>{programs.length.toString().padStart(2, '0')}</strong>
        </div>
      </div>
      <div className={styles.twoColumns}>
        <section id="start-workout" className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>La prossima seduta</h2>
            <span className={styles.eyebrow}>01 / PROGRAMMA</span>
          </div>
          {program && day && week ? (
            <>
              <div className={styles.formGrid}>
                <label>
                  Scheda
                  <select
                    value={program.id}
                    onChange={(e) => {
                      setSelection(e.target.value);
                      setDayIndex(0);
                      setWeekIndex(0);
                    }}
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · v{p.version}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Giornata
                  <select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}>
                    {program.days.map((d, i) => (
                      <option key={d.id} value={i}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Settimana del ciclo
                  <select value={weekIndex} onChange={(e) => setWeekIndex(Number(e.target.value))}>
                    {program.weeks.map((w, i) => (
                      <option key={i} value={i}>
                        {i + 1} · {w.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.workoutSummary}>
                <strong>{day.name}</strong>
                <span>{day.focus || 'Allenamento personale'}</span>
                <div>
                  <span>
                    <Dumbbell size={16} aria-hidden="true" />
                    {counted(day.exercises.length, 'esercizio', 'esercizi')}
                  </span>
                  <span>
                    <Layers3 size={16} aria-hidden="true" />
                    {counted(
                      countRequired(resolveDay(program, day, weekIndex)),
                      'registrazione',
                      'registrazioni',
                    )}
                  </span>
                </div>
              </div>
              <p className={styles.hint}>
                La settimana si sceglie esplicitamente. Il ciclo non avanza da solo se salti una
                seduta.
              </p>
              <button
                className={styles.primary}
                disabled={busy || !!active}
                onClick={() => void start()}
              >
                {busy
                  ? 'Salvataggio…'
                  : active
                    ? 'Concludi la seduta in corso'
                    : 'Inizia allenamento'}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </>
          ) : (
            <div className={styles.inlineEmpty}>
              <p>Il programma è ancora una pagina bianca.</p>
              <Link to="/programma">
                Prepara una scheda e approvala per iniziare{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>Ultime sedute</h2>
            <span className={styles.eyebrow}>02 / DIARIO</span>
          </div>
          {recent.length ? (
            recent.map((s) => (
              <Link className={styles.listRow} to={`/seduta/${s.id}`} key={s.id}>
                <span className={styles.rowIcon}>
                  <Check size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>{s.snapshot.name}</strong>
                  <small>
                    {dateTime(s.startedAt)}
                    {journal.recoveredIds.has(s.id) ? ' · Storico recuperato' : ''}
                  </small>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            ))
          ) : (
            <div className={styles.inlineEmpty}>
              <Clock3 size={32} strokeWidth={1} aria-hidden="true" />
              <p>Qui inizierà la tua storia.</p>
              <span>Le sedute concluse appariranno in questo diario.</span>
            </div>
          )}
          <div className={styles.smallNote}>
            <span className={styles.statusDot} />
            Ogni risultato racconta una parte del percorso.
          </div>
        </section>
      </div>
    </>
  );
}
