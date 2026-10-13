import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, metadata } from '../data/database';
import {
  generationInputSchema,
  proposalReviewSchema,
  ruleBundleSchema,
  type GenerationInput,
  type Program,
  type RuleBundle,
} from '@tr-lab/contracts';
import { resolveDay } from '@tr-lab/domain';
import { useApp } from './AppProvider';
import { useCatalog } from '../data/use-catalog';
import { api } from '../data/http';
import { queueProposalDecision } from '../data/proposal-decisions';
import { ProgressionForm } from './ProgressionForm';
import { Dialog, errorMessage, kilos, loadBasisLabel } from './Shared';
import styles from '../styles/App.module.css';
type Review = z.infer<typeof proposalReviewSchema>;
export function ProposalCenter() {
  const { user, account, online, entities, sync, notify, isCurrentSession } = useApp();
  const [rules, setRules] = useState<{
      sessionId: string;
      bundles: RuleBundle[];
      error: string | null;
    } | null>(null),
    [review, setReview] = useState<Review | null>(null),
    [generating, setGenerating] = useState(false),
    [progressing, setProgressing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!user?.id || !online) return;
    let cancelled = false;
    void api('/engine/rules', 'GET', undefined, user.id)
      .then((value) => {
        const parsed = z.object({ bundles: z.array(ruleBundleSchema) }).parse(value);
        if (!cancelled)
          setRules({ sessionId: user.sessionId, bundles: parsed.bundles, error: null });
      })
      .catch((e) => {
        if (!cancelled)
          setRules({ sessionId: user.sessionId, bundles: [], error: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.sessionId, online]);
  const outcome = useLiveQuery(
    async () => ({ account, code: await metadata(`${account}:last-decision-code`, db) }),
    [account],
  );
  const bundles = rules?.sessionId === user?.sessionId ? (rules?.bundles ?? []) : [],
    proposals = entities
      .filter((r) => r.kind === 'proposal')
      .sort((a, b) => b.data.generatedAt.localeCompare(a.data.generatedAt));
  async function open(id: string) {
    setBusy(true);
    setError('');
    try {
      const value = proposalReviewSchema.parse(
        await api('/engine/review', 'POST', { id }, account),
      );
      if (user && isCurrentSession(user.sessionId)) setReview(value);
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function decide(choice: 'accept' | 'reject') {
    if (!review || !user) return;
    setBusy(true);
    setError('');
    try {
      await queueProposalDecision(account, review, choice, () => isCurrentSession(user.sessionId));
      setReview(null);
      await sync();
      notify(
        'Scelta salvata nella coda. Controlla l’esito della ricevuta: i target cambiano soltanto se il server la applica.',
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const before = review?.proposal.before
    ? entities.find((r) => r.kind === 'program' && r.id === review.proposal.before?.programId)
    : undefined;
  return (
    <section id="proposte" className={styles.panel}>
      <div className={styles.sectionHeading}>
        <h2>Proposte e progressioni</h2>
        <button disabled={!user || !online || !bundles.length} onClick={() => setGenerating(true)}>
          Genera una proposta
        </button>
        <button
          disabled={!user || !online || !bundles.some((b) => b.progression !== null)}
          onClick={() => setProgressing(true)}
        >
          Valuta una progressione
        </button>
      </div>
      <p>
        Ogni proposta mostra metodo, dati, motivazione e contenuto da confermare. Nessuna risposta o
        chiusura della finestra cambia i target.
      </p>
      {user && online && rules?.sessionId !== user.sessionId && (
        <p role="status">Verifica dei metodi in corso…</p>
      )}
      {rules?.sessionId === user?.sessionId && rules?.error && (
        <p role="alert">Impossibile caricare i metodi: {rules.error}</p>
      )}
      {outcome && outcome.account === account && outcome.code && (
        <p role="status">
          Ultima decisione:{' '}
          {outcome.code === 'APPLIED'
            ? 'applicata sul server'
            : `non applicata (${outcome.code}); riapri la proposta per verificare i dati prima di decidere nuovamente`}
          .
        </p>
      )}
      {user && online && rules?.sessionId === user.sessionId && !rules.error && !bundles.length && (
        <p className={styles.hint}>
          Il motore è in preparazione: nessun metodo revisionato è attivo per questo account. Schede
          manuali, import e diario restano disponibili.
        </p>
      )}
      {!online && (
        <p>
          Diario offline disponibile. La conferma delle proposte richiede connessione; le sedute già
          avviate conservano i target originali.
        </p>
      )}
      {proposals.map(
        (r) =>
          r.kind === 'proposal' && (
            <article key={r.id} className={styles.agendaItem}>
              <div>
                <strong>{r.data.afterProgram.name}</strong>
                <p>
                  {r.data.type === 'adapt_program' ? 'Adattamento' : 'Nuova scheda'} ·{' '}
                  {
                    (
                      {
                        pending: 'Da rivedere',
                        accepted: 'Accettata',
                        rejected: 'Rifiutata',
                        stale: 'Da ricalcolare',
                        withdrawn: 'Ritirata',
                      } as const
                    )[r.data.status]
                  }
                </p>
                {r.data.reasoning.map((reason, i) => (
                  <p key={i}>{reason.message}</p>
                ))}
              </div>
              {r.data.status === 'pending' && (
                <button disabled={!user || !online || busy} onClick={() => void open(r.id)}>
                  Rivedi questa proposta
                </button>
              )}
            </article>
          ),
      )}
      {generating && user && (
        <Dialog title="Genera una proposta" close={() => setGenerating(false)}>
          <GeneratorForm bundles={bundles} close={() => setGenerating(false)} />
        </Dialog>
      )}
      {progressing && user && (
        <Dialog title="Valuta una progressione" close={() => setProgressing(false)}>
          <ProgressionForm bundles={bundles} close={() => setProgressing(false)} />
        </Dialog>
      )}
      {review && (
        <Dialog
          title="Conferma il contenuto di questa proposta"
          close={() => {
            if (!busy) setReview(null);
          }}
        >
          <p>
            {review.proposal.type === 'generate_program'
              ? 'Aggiunge una nuova scheda; le altre restano disponibili.'
              : 'Crea una nuova versione dalla base indicata; le sedute e le date già pianificate mantengono la loro versione.'}{' '}
            Decorrenza: prossima seduta avviata dalla nuova versione.
          </p>
          <p>
            Metodo {review.proposal.ruleBundleId} · {review.proposal.ruleVersion}. Review valida
            fino a {new Date(review.expiresAt).toLocaleTimeString('it-IT')}.
          </p>
          {review.proposal.reasoning.map((reason, i) => (
            <p key={i}>{reason.message}</p>
          ))}
          <div className={styles.proposalColumns}>
            <div>
              <h3>Prima</h3>
              {before?.kind === 'program' ? (
                <ProposalProgram program={before.data} />
              ) : (
                <p>
                  {review.proposal.before
                    ? 'Versione di partenza da scaricare prima di confermare.'
                    : 'Nessun programma sostituito.'}
                </p>
              )}
            </div>
            <div>
              <h3>Dopo</h3>
              <ProposalProgram program={review.proposal.afterProgram} />
            </div>
          </div>
          <details>
            <summary>Provenienza e revisioni</summary>
            <p>
              Motore {review.proposal.engineVersion} · revisione proposta {review.revision} ·{' '}
              {review.proposal.dependencies.length} dipendenze verificate sul server.
            </p>
            {bundles
              .find((b) => b.id === review.proposal.ruleBundleId)
              ?.sources.map((source) => (
                <p key={source.id}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.id}
                  </a>{' '}
                  · {source.section}
                </p>
              ))}
          </details>
          {!review.applicable && (
            <p role="alert">
              Sono cambiati dati, programma o disponibilità del metodo. Questa proposta non è
              applicabile e deve essere ricalcolata.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button
              className={styles.primary}
              disabled={
                busy ||
                !online ||
                !review.applicable ||
                (review.proposal.before !== null && before?.kind !== 'program')
              }
              onClick={() => void decide('accept')}
            >
              Accetto esattamente questa proposta
            </button>
            <button disabled={busy || !online} onClick={() => void decide('reject')}>
              Rifiuto questa proposta
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
function ProposalProgram({ program }: { program: Program }) {
  const [week, setWeek] = useState(0);
  const index = program.weeks[week] ? week : 0;
  return (
    <>
      <p>
        {program.name} · versione {program.version} ·{' '}
        {program.goal === 'strength'
          ? 'Forza'
          : program.goal === 'hypertrophy'
            ? 'Ipertrofia'
            : 'Corpo libero'}
      </p>
      <label>
        Settimana da confrontare
        <select value={index} onChange={(e) => setWeek(Number(e.target.value))}>
          {program.weeks.map((w, i) => (
            <option key={i} value={i}>
              {i + 1} · {w.name}
            </option>
          ))}
        </select>
      </label>
      <ul>
        {program.weeks.map((w, i) => (
          <li key={i}>
            {i + 1}: {w.name} · {w.phase} · extra {w.extraSets} · RIR {w.rir ?? 'dei target'}
          </li>
        ))}
      </ul>
      {program.days.map((day) => {
        const actual = resolveDay(program, day, index);
        return (
          <details key={day.id} open>
            <summary>
              {day.name} · {day.focus}
            </summary>
            {actual.exercises.map((slot) => (
              <div key={slot.id}>
                <strong>{slot.exercise.name}</strong>
                <p>
                  {loadBasisLabel[slot.exercise.basis]} ·{' '}
                  {slot.exercise.unilateral ? 'Lati separati' : 'Bilaterale'}
                  {slot.superset ? ` · Superserie ${slot.superset}` : ''}
                </p>
                <ol>
                  {slot.targets.map((t) => (
                    <li key={t.id}>
                      {t.repsMin}–{t.repsMax} rip. · RIR {t.rir} · {t.restSeconds}s ·{' '}
                      {kilos(t.loadGrams)} kg · {t.kind} · {t.side ?? 'entrambi i lati previsti'}
                    </li>
                  ))}
                </ol>
                {slot.notes && <p>{slot.notes}</p>}
                {slot.exercise.instructions && <p>{slot.exercise.instructions}</p>}
              </div>
            ))}
          </details>
        );
      })}
    </>
  );
}
function GeneratorForm({ bundles, close }: { bundles: RuleBundle[]; close: () => void }) {
  const { account, entities, sync, notify, user, isCurrentSession } = useApp(),
    catalog = useCatalog();
  const profiles = entities.flatMap((r) => (r.kind === 'equipment_profile' ? [r.data] : []));
  const [ruleId, setRuleId] = useState(bundles[0]?.id ?? ''),
    [profileId, setProfileId] = useState(profiles[0]?.id ?? ''),
    [days, setDays] = useState(3),
    [minutes, setMinutes] = useState(60),
    [experience, setExperience] = useState<GenerationInput['experience'] | ''>(''),
    [adultConfirmed, setAdultConfirmed] = useState(false),
    [available, setAvailable] = useState<string[]>([]),
    [practiced, setPracticed] = useState<string[]>([]),
    [preferred, setPreferred] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const rule = bundles.find((r) => r.id === ruleId),
    profile = profiles.find((p) => p.id === profileId);
  const choices = catalog.filter(
    (e) =>
      rule?.allowedExerciseIds.includes(e.id) &&
      profile?.items.some((item) => item.category === e.equipment && item.basis === e.basis),
  );
  async function submit() {
    if (!rule || !profile || !user) return;
    setBusy(true);
    setError('');
    try {
      const constraints: GenerationInput = generationInputSchema.parse({
        experience,
        adultNonclinicalConfirmed: adultConfirmed,
        objective: rule.objective,
        mode: rule.mode,
        environment: profile.place,
        days,
        equipment: profile.items.map((i) => ({ category: i.category, basis: i.basis })),
        availableExerciseIds: available,
        excludedIds: [],
        preferredIds: preferred,
        practicedIds: practiced,
        requirePracticed: true,
        maximumMinutes: minutes,
        seed: crypto.randomUUID(),
      });
      const response = z
        .object({
          kind: z.enum([
            'proposal',
            'needs_review',
            'incompatible_constraints',
            'search_incomplete',
          ]),
          reason: z.string().optional(),
        })
        .parse(
          await api(
            '/engine/generate',
            'POST',
            { constraints, equipmentId: profile.id, ruleBundleId: rule.id },
            account,
          ),
        );
      if (!isCurrentSession(user.sessionId)) return;
      if (response.kind !== 'proposal')
        throw new Error(response.reason ?? 'Non è disponibile una proposta applicabile.');
      await sync();
      close();
      notify('Proposta calcolata: apri la review per verificare e decidere.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const toggle = (values: string[], id: string) =>
    values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset disabled={busy} className={styles.editorFields}>
        <legend>Vincoli e preferenze</legend>
        <label>
          Esperienza dichiarata
          <select
            required
            value={experience}
            onChange={(e) => setExperience(e.target.value as GenerationInput['experience'] | '')}
          >
            <option value="">Seleziona il livello</option>
            <option value="beginner">Principiante</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzato</option>
          </select>
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            required
            checked={adultConfirmed}
            onChange={(e) => setAdultConfirmed(e.target.checked)}
          />
          Confermo di essere adulto e di richiedere un programma di allenamento, fuori da percorsi
          clinici o riabilitativi.
        </label>
        <label>
          Metodo revisionato
          <select
            value={ruleId}
            onChange={(e) => {
              setRuleId(e.target.value);
              setAvailable([]);
              setPracticed([]);
              setPreferred([]);
            }}
          >
            {bundles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.objective === 'strength' ? 'Forza' : 'Ipertrofia'} · {r.mode}
              </option>
            ))}
          </select>
        </label>
        <label>
          Luogo e attrezzatura
          <select
            required
            value={profileId}
            onChange={(e) => {
              setProfileId(e.target.value);
              setAvailable([]);
              setPracticed([]);
              setPreferred([]);
            }}
          >
            <option value="">Scegli un profilo</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.formGrid}>
          <label>
            Giornate
            <input
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>
          <label>
            Tempo massimo stimato, minuti
            <input
              type="number"
              min={5}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
        </div>
        <p>
          Indica i movimenti disponibili e quelli che sai già eseguire. Una preferenza non supera
          un’esclusione o un limite obbligatorio. Il tempo è una stima con le assunzioni del metodo.
        </p>
        {choices.map((e) => (
          <fieldset key={e.id}>
            <legend>{e.name}</legend>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={available.includes(e.id)}
                onChange={() => setAvailable(toggle(available, e.id))}
              />
              Disponibile in questo luogo
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={practiced.includes(e.id)}
                onChange={() => setPracticed(toggle(practiced, e.id))}
              />
              Già praticato con esecuzione che dichiaro confrontabile
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={preferred.includes(e.id)}
                onChange={() => setPreferred(toggle(preferred, e.id))}
              />
              Preferito
            </label>
          </fieldset>
        ))}
        {error && <p role="alert">{error}</p>}
        <button
          className={styles.primary}
          disabled={busy || !profile || !available.length || !experience || !adultConfirmed}
        >
          Calcola e presenta la proposta
        </button>
      </fieldset>
    </form>
  );
}
