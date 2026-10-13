import { useState } from 'react';
import { z } from 'zod';
import { progressionRequestSchema, type GenerationInput, type RuleBundle } from '@tr-lab/contracts';
import { useApp } from './AppProvider';
import { api } from '../data/http';
import { errorMessage } from './Shared';
import styles from '../styles/App.module.css';

export function ProgressionForm({ bundles, close }: { bundles: RuleBundle[]; close: () => void }) {
  const { account, user, entities, sync, notify, isCurrentSession } = useApp();
  const programs = entities.flatMap((r) =>
    r.kind === 'program' && r.data.status === 'approved' ? [r.data] : [],
  );
  const profiles = entities.flatMap((r) => (r.kind === 'equipment_profile' ? [r.data] : []));
  const [programId, setProgramId] = useState(''),
    [prescriptionId, setPrescriptionId] = useState(''),
    [equipmentId, setEquipmentId] = useState(''),
    [ruleId, setRuleId] = useState(''),
    [sessionIds, setSessionIds] = useState<string[]>([]),
    [experience, setExperience] = useState<GenerationInput['experience'] | ''>(''),
    [adult, setAdult] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const program = programs.find((p) => p.id === programId),
    slot = program?.days.flatMap((d) => d.exercises).find((p) => p.id === prescriptionId);
  const methods = bundles.filter(
    (b) =>
      b.progression !== null &&
      b.objective === program?.goal &&
      slot &&
      b.allowedExerciseIds.includes(slot.exercise.id),
  );
  const sessions = entities
    .flatMap((r) =>
      r.kind === 'session' &&
      r.data.status === 'completed' &&
      r.data.programId === programId &&
      r.data.snapshot.exercises.some((p) => p.id === prescriptionId)
        ? [r.data]
        : [],
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  async function calculate() {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const request = progressionRequestSchema.parse({
        programId,
        prescriptionId,
        equipmentId,
        ruleBundleId: ruleId,
        comparableSessionIds: sessionIds,
        experience,
        adultNonclinicalConfirmed: adult,
        seed: crypto.randomUUID(),
      });
      const result = z
        .object({
          kind: z.enum(['proposal', 'needs_review', 'insufficient_data', 'keep_current']),
          reason: z.string().optional(),
        })
        .parse(await api('/engine/progression', 'POST', request, account));
      if (!isCurrentSession(user.sessionId)) return;
      if (result.kind !== 'proposal') {
        setError(result.reason ?? 'La valutazione non propone modifiche.');
        return;
      }
      await sync();
      close();
      notify('Proposta di progressione calcolata. Rivedi prima/dopo e scegli se accettarla.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void calculate();
      }}
    >
      <fieldset disabled={busy} className={styles.editorFields}>
        <legend>Dati della valutazione</legend>
        <p>
          Il confronto usa solo risultati delle esposizioni selezionate di questa versione. Dichiara
          la stessa esecuzione e lo stesso strumento; serie mancanti, varianti diverse o fasi
          incompatibili bloccano la proposta. Lo storico recuperato richiede prima una verifica
          dedicata.
        </p>
        <label>
          Versione approvata
          <select
            required
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setPrescriptionId('');
              setRuleId('');
              setSessionIds([]);
            }}
          >
            <option value="">Scegli la scheda</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · versione {p.version}
              </option>
            ))}
          </select>
        </label>
        <label>
          Posizione da valutare
          <select
            required
            value={prescriptionId}
            onChange={(e) => {
              setPrescriptionId(e.target.value);
              setRuleId('');
              setSessionIds([]);
            }}
          >
            <option value="">Scegli la posizione</option>
            {program?.days.flatMap((d) =>
              d.exercises.map((p) => (
                <option key={p.id} value={p.id}>
                  {d.name} · {p.exercise.name}
                </option>
              )),
            )}
          </select>
        </label>
        <label>
          Profilo attrezzatura
          <select required value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            <option value="">Scegli il profilo</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Metodo revisionato
          <select required value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
            <option value="">Scegli il metodo</option>
            {methods.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} · {b.version}
              </option>
            ))}
          </select>
        </label>
        {slot && !methods.length && (
          <p>Nessun metodo revisionato compatibile con questa posizione.</p>
        )}
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
            required
            type="checkbox"
            checked={adult}
            onChange={(e) => setAdult(e.target.checked)}
          />
          Confermo il perimetro adulto, fuori da percorsi clinici o riabilitativi.
        </label>
        <fieldset>
          <legend>Esposizioni che dichiaro confrontabili (massimo 20)</legend>
          {sessions.map((s) => (
            <label key={s.id} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={sessionIds.includes(s.id)}
                disabled={!sessionIds.includes(s.id) && sessionIds.length >= 20}
                onChange={() =>
                  setSessionIds((ids) =>
                    ids.includes(s.id) ? ids.filter((id) => id !== s.id) : [...ids, s.id],
                  )
                }
              />
              {s.snapshot.name} · {new Date(s.startedAt).toLocaleString('it-IT')} · settimana{' '}
              {s.weekIndex + 1}
            </label>
          ))}
          {prescriptionId && !sessions.length && (
            <p>Non ci sono sedute concluse da confrontare per questa posizione.</p>
          )}
        </fieldset>
        {error && <p role="status">{error}</p>}
        <button
          className={styles.primary}
          disabled={busy || !sessionIds.length || !ruleId || !experience || !adult}
        >
          Valuta e presenta l’esito
        </button>
      </fieldset>
    </form>
  );
}
