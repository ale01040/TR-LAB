import { useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { type Exercise, type PrivateExercise } from '@tr-lab/contracts';
import { useCatalog } from '../data/use-catalog';
import { useApp } from '../components/AppProvider';
import { PrivateExerciseForm } from '../components/PrivateExerciseForm';
import { EquipmentPanel } from '../components/EquipmentPanel';
import { counted, Dialog, errorMessage } from '../components/Shared';
import styles from '../styles/App.module.css';
const equipmentLabels = {
  barbell: 'Bilanciere',
  dumbbell: 'Manubri',
  cable: 'Cavi',
  machine: 'Macchine',
  bodyweight: 'Corpo libero',
};
export function LibraryPage() {
  const catalog = useCatalog(true);
  const { entities, save, notify } = useApp();
  const [scope, setScope] = useState('all');
  const [form, setForm] = useState<{ initial?: Exercise; editing?: PrivateExercise } | null>(null);
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState('all');
  const [selected, setSelected] = useState('');
  const exercise = catalog.find((e) => e.id === selected);
  const privateRecord = entities.find(
    (r) => r.kind === 'private_exercise' && r.data.exercise.id === selected,
  );
  const visible = catalog.filter(
    (e) =>
      (scope === 'catalog'
        ? !e.id.startsWith('private:')
        : scope === 'mine'
          ? e.id.startsWith('private:') &&
            entities.some(
              (r) =>
                r.kind === 'private_exercise' &&
                r.data.exercise.id === e.id &&
                r.data.status === 'active',
            )
          : scope === 'archived'
            ? entities.some(
                (r) =>
                  r.kind === 'private_exercise' &&
                  r.data.exercise.id === e.id &&
                  r.data.status === 'archived',
              )
            : !entities.some(
                (r) =>
                  r.kind === 'private_exercise' &&
                  r.data.exercise.id === e.id &&
                  r.data.status === 'archived',
              )) &&
      (equipment === 'all' || e.equipment === equipment) &&
      `${e.name} ${e.muscle}`
        .toLocaleLowerCase('it-IT')
        .includes(search.toLocaleLowerCase('it-IT')),
  );
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>MOVIMENTI / POSSIBILITÀ</span>
          <h1>La tua libreria.</h1>
          <p>Trova il movimento. Comprendi la convenzione. Inseriscilo nella scheda.</p>
        </div>
        <button className={styles.primary} onClick={() => setForm({})}>
          Crea il mio esercizio
        </button>
      </div>
      <div className={styles.libraryFilters}>
        <label>
          Mostra
          <select aria-label="Mostra" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">Tutti gli attivi</option>
            <option value="catalog">Catalogo</option>
            <option value="mine">I miei</option>
            <option value="archived">I miei archiviati</option>
          </select>
        </label>
        <label>
          <Search size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Cerca esercizio o muscolo</span>
          <input
            type="search"
            placeholder="Cerca esercizio o muscolo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Attrezzatura
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="all">Tutte</option>
            {Object.entries(equipmentLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.actionStrip}>
        <p className={styles.hint} role="status">
          {counted(visible.length, 'esercizio trovato', 'esercizi trovati')}
        </p>
        {(search || equipment !== 'all' || scope !== 'all') && (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              setSearch('');
              setEquipment('all');
              setScope('all');
            }}
          >
            Azzera i filtri
          </button>
        )}
      </div>
      {!visible.length && (
        <p>
          Nessun esercizio corrisponde ai filtri. Cambia la ricerca oppure azzera i filtri per
          vedere il catalogo.
        </p>
      )}
      <div className={styles.libraryGrid}>
        {visible.map((e, i) => (
          <button className={styles.libraryCard} key={e.id} onClick={() => setSelected(e.id)}>
            <div>
              <span className={styles.eyebrow}>{e.muscle.toUpperCase()}</span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </div>
            <strong>{e.name}</strong>
            <footer>
              <span>
                {equipmentLabels[e.equipment]}
                {e.unilateral ? ' · Unilaterale' : ''}
              </span>
              <span>{String(i + 1).padStart(2, '0')}</span>
            </footer>
          </button>
        ))}
      </div>
      <EquipmentPanel />
      {exercise && (
        <Dialog title={exercise.name} close={() => setSelected('')}>
          <span className={styles.pill}>{equipmentLabels[exercise.equipment]}</span>
          <p>
            Gruppo primario: <strong>{exercise.muscle}</strong>.
          </p>
          {exercise.secondary.length > 0 && (
            <p>Gruppi secondari: {exercise.secondary.join(', ')}.</p>
          )}
          <p>
            {exercise.unilateral
              ? 'Registra i lati sinistro e destro separatamente.'
              : 'La prescrizione prevede una registrazione bilaterale.'}
          </p>
          <p>
            Convenzione del carico:{' '}
            <strong>
              {
                {
                  total: 'totale',
                  per_dumbbell: 'singolo manubrio',
                  bodyweight: 'corpo libero',
                  added: 'zavorra aggiunta',
                  assistance: 'assistenza',
                  machine: 'valore della macchina',
                }[exercise.basis]
              }
            </strong>
            .
          </p>
          <p>{exercise.instructions}</p>
          <p className={styles.hint}>
            Gli esercizi personali appartengono al tuo spazio. Archiviare o modificare le istruzioni
            non riscrive le sedute e le schede precedenti.
          </p>
          <div className={styles.actionStrip}>
            <button
              onClick={() => {
                setForm({ initial: exercise });
                setSelected('');
              }}
            >
              Crea una mia variante
            </button>
            {privateRecord?.kind === 'private_exercise' && (
              <>
                <button
                  onClick={() => {
                    setForm({ initial: exercise, editing: privateRecord.data });
                    setSelected('');
                  }}
                >
                  Modifica nome e istruzioni
                </button>
                {privateRecord.data.status === 'active' && (
                  <button
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Archiviare questo esercizio? Gli snapshot precedenti restano disponibili.',
                        )
                      )
                        return;
                      void save('ArchivePrivateExercise', {
                        ...privateRecord,
                        data: { ...privateRecord.data, status: 'archived' },
                      })
                        .then(() => {
                          setSelected('');
                          notify('Esercizio archiviato sul dispositivo.', 'success');
                        })
                        .catch((e) => notify(errorMessage(e)));
                    }}
                  >
                    Archivia
                  </button>
                )}
              </>
            )}
          </div>
        </Dialog>
      )}
      {form && (
        <Dialog
          title={form.editing ? 'Modifica il mio esercizio' : 'Crea il mio esercizio'}
          close={() => setForm(null)}
        >
          <PrivateExerciseForm
            {...form}
            done={() => {
              setForm(null);
              notify('Esercizio personale salvato sul dispositivo.', 'success');
            }}
          />
        </Dialog>
      )}
    </>
  );
}
