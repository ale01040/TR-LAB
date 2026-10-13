import { useState } from 'react';
import { privateExerciseSchema, type Exercise, type PrivateExercise } from '@tr-lab/contracts';
import { useApp } from './AppProvider';
import { errorMessage, loadBasisLabel } from './Shared';
import styles from '../styles/App.module.css';
export const equipmentLabels = {
  barbell: 'Bilanciere',
  dumbbell: 'Manubri',
  cable: 'Cavi',
  machine: 'Macchina',
  bodyweight: 'Corpo libero',
};
export function PrivateExerciseForm({
  initial,
  editing,
  done,
  stage,
  name,
}: {
  initial?: Exercise;
  editing?: PrivateExercise;
  done: () => void;
  stage?: (variant: PrivateExercise) => void;
  name?: string;
}) {
  const { save } = useApp();
  const [id] = useState(() => editing?.id ?? crypto.randomUUID());
  const [exercise, setExercise] = useState<Exercise>(() => ({
    ...initial,
    id: `private:${id}`,
    name: initial?.name ?? name ?? '',
    muscle: initial?.muscle ?? '',
    secondary: initial?.secondary ?? [],
    equipment: initial?.equipment ?? 'bodyweight',
    pattern: initial?.pattern ?? '',
    unilateral: initial?.unilateral ?? false,
    basis: initial?.basis ?? 'bodyweight',
    instructions: initial?.instructions ?? '',
  }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const data = privateExerciseSchema.parse({
        id,
        exercise,
        semanticVersion: editing?.semanticVersion ?? '1',
        status: editing?.status ?? 'active',
        createdAt: editing?.createdAt ?? new Date().toISOString(),
      });
      if (stage) stage(data);
      else await save('SavePrivateExercise', { id, kind: 'private_exercise', revision: '0', data });
      done();
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
        void submit();
      }}
    >
      <fieldset disabled={busy} className={styles.editorFields}>
        <legend>{editing ? 'Modifica nome e istruzioni' : 'Nuova variante personale'}</legend>
        <label>
          Nome
          <input
            required
            maxLength={200}
            value={exercise.name}
            onChange={(e) => setExercise({ ...exercise, name: e.target.value })}
          />
        </label>
        <fieldset disabled={!!editing}>
          <legend>Identità del movimento</legend>
          <p>
            Questi dati rimangono fissi dopo il salvataggio. Per cambiarli, duplica l’esercizio.
          </p>
          <div className={styles.formGrid}>
            <label>
              Muscolo principale
              <input
                required
                maxLength={200}
                value={exercise.muscle}
                onChange={(e) => setExercise({ ...exercise, muscle: e.target.value })}
              />
            </label>
            <label>
              Schema di movimento
              <input
                required
                maxLength={200}
                placeholder="Es. spinta orizzontale"
                value={exercise.pattern}
                onChange={(e) => setExercise({ ...exercise, pattern: e.target.value })}
              />
            </label>
          </div>
          <label>
            Muscoli secondari, separati da virgola
            <input
              value={exercise.secondary.join(', ')}
              maxLength={1004}
              onChange={(e) =>
                setExercise({
                  ...exercise,
                  secondary: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <div className={styles.formGrid}>
            <label>
              Attrezzo
              <select
                value={exercise.equipment}
                onChange={(e) =>
                  setExercise({ ...exercise, equipment: e.target.value as Exercise['equipment'] })
                }
              >
                {Object.entries(equipmentLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Convenzione del carico
              <select
                value={exercise.basis}
                onChange={(e) =>
                  setExercise({ ...exercise, basis: e.target.value as Exercise['basis'] })
                }
              >
                {(
                  ['total', 'per_dumbbell', 'bodyweight', 'added', 'assistance', 'machine'] as const
                ).map((basis) => (
                  <option key={basis} value={basis}>
                    {loadBasisLabel[basis]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={exercise.unilateral}
              onChange={(e) => setExercise({ ...exercise, unilateral: e.target.checked })}
            />
            Movimento unilaterale, con registrazioni separate per lato
          </label>
        </fieldset>
        <label>
          Istruzioni
          <textarea
            maxLength={3000}
            value={exercise.instructions}
            onChange={(e) => setExercise({ ...exercise, instructions: e.target.value })}
          />
        </label>
        <p>
          Controlla attrezzo, muscoli, convenzione e lati prima di salvare. Il catalogo personale
          non modifica le schede già approvate.
        </p>
        {stage && (
          <p>
            Questa variante resta nell’anteprima fino al salvataggio della bozza importata.
            Annullare l’import non crea esercizi.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <button className={styles.primary} disabled={busy}>
          {stage ? 'Aggiungi questa variante all’importazione' : 'Salva il mio esercizio'}
        </button>
      </fieldset>
    </form>
  );
}
