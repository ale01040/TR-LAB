import { useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { exerciseSchema } from '@tr-lab/contracts';
import rawCatalog from '../data/catalog.json';
import { Dialog } from '../components/Shared';
import styles from '../styles/App.module.css';
const catalog = rawCatalog.map((e) => exerciseSchema.parse(e));
const equipmentLabels = {
  barbell: 'Bilanciere',
  dumbbell: 'Manubri',
  cable: 'Cavi',
  machine: 'Macchine',
  bodyweight: 'Corpo libero',
};
export function LibraryPage() {
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState('all');
  const [selected, setSelected] = useState('');
  const exercise = catalog.find((e) => e.id === selected);
  const visible = catalog.filter(
    (e) =>
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
        <span className={styles.badge}>{catalog.length} esercizi</span>
      </div>
      <div className={styles.libraryFilters}>
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
      {!visible.length && (
        <p className={styles.hint}>Nessun esercizio corrisponde a questi filtri.</p>
      )}
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
            Catalogo iniziale derivato dai nomi dell'Excel e tre movimenti a corpo libero. Tutorial
            e varianti private verranno aggiunti con revisione dei contenuti.
          </p>
        </Dialog>
      )}
    </>
  );
}
