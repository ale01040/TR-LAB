import { useRef, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { exerciseSchema, type Program, type Prescription } from '@tr-lab/contracts';
import { copyDay, createPrescription, moveItem } from '@tr-lab/domain';
import rawCatalog from '../data/catalog.json';
import { PrescriptionTargetsEditor } from './PrescriptionTargetsEditor';
import styles from '../styles/App.module.css';

const catalog = rawCatalog.map((e) => exerciseSchema.parse(e));

export function ProgramEditor({
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
  const [dayId, setDayId] = useState(program.days[0]?.id ?? '');
  const [exerciseId, setExerciseId] = useState(catalog[0]?.id ?? '');
  const formRef = useRef<HTMLFormElement>(null);
  const day = program.days.find((d) => d.id === dayId) ?? program.days[0];
  const dayIndex = program.days.findIndex((d) => d.id === day?.id);
  if (!day) return null;
  if (program.status !== 'draft')
    return <p>Crea una nuova versione per modificare questa scheda.</p>;
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
      ref={formRef}
      onInvalidCapture={(event) => {
        // I target in dettagli chiusi devono diventare visibili prima del focus nativo.
        if (event.target instanceof HTMLElement) {
          const details = event.target.closest('details');
          if (details) details.open = true;
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <fieldset className={styles.editorFields} disabled={busy}>
        <legend className={styles.srOnly}>Modifica della bozza</legend>
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
              onClick={() => {
                // Non smontare i campi: il testo invalido non è ancora nel modello approvabile.
                if (d.id === day.id || formRef.current?.reportValidity()) setDayId(d.id);
              }}
            >
              {d.name}
            </button>
          ))}
          <button
            type="button"
            disabled={program.days.length >= 14}
            onClick={() => {
              if (!formRef.current?.reportValidity()) return;
              const id = crypto.randomUUID();
              setDayId(id);
              setProgram({
                ...program,
                days: [
                  ...program.days,
                  {
                    id,
                    name: `Giorno ${program.days.length + 1}`,
                    focus: '',
                    exercises: [],
                  },
                ],
              });
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
                setDayId(program.days.find((d) => d.id !== day.id)?.id ?? '');
              }}
            >
              Rimuovi giornata
            </button>
          )}
        </div>
        <div className={styles.actionStrip}>
          <button
            type="button"
            disabled={program.days.length >= 14}
            onClick={() => {
              if (!formRef.current?.reportValidity()) return;
              const copied = copyDay(day, () => crypto.randomUUID());
              setProgram({
                ...program,
                days: [
                  ...program.days.slice(0, dayIndex + 1),
                  copied,
                  ...program.days.slice(dayIndex + 1),
                ],
              });
              setDayId(copied.id);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            Duplica giornata
          </button>
          <button
            type="button"
            disabled={dayIndex === 0}
            onClick={() =>
              setProgram({ ...program, days: moveItem(program.days, dayIndex, dayIndex - 1) })
            }
          >
            Sposta giornata prima
          </button>
          <button
            type="button"
            disabled={dayIndex === program.days.length - 1}
            onClick={() =>
              setProgram({ ...program, days: moveItem(program.days, dayIndex, dayIndex + 1) })
            }
          >
            Sposta giornata dopo
          </button>
        </div>
        {day.exercises.map((p, index) => (
          <fieldset className={styles.editorExercise} key={p.id}>
            <legend>
              {index + 1}. {p.exercise.name}
            </legend>
            <PrescriptionTargetsEditor
              prescription={p}
              maxTargets={
                30 -
                Math.max(
                  0,
                  ...program.weeks.map((w) =>
                    w.phase === 'deload' || p.accumulation === false ? 0 : w.extraSets,
                  ),
                )
              }
              onChange={updateExercise}
            />
            <div className={styles.formGrid}>
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
              <button
                type="button"
                disabled={index === 0}
                onClick={() => updateDay({ exercises: moveItem(day.exercises, index, index - 1) })}
              >
                Sposta esercizio {index + 1} sopra
              </button>
              <button
                type="button"
                disabled={index === day.exercises.length - 1}
                onClick={() => updateDay({ exercises: moveItem(day.exercises, index, index + 1) })}
              >
                Sposta esercizio {index + 1} sotto
              </button>
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
      </fieldset>
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
