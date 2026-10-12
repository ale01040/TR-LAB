import { Copy, Plus, Trash2 } from 'lucide-react';
import type { Prescription, Target } from '@tr-lab/contracts';
import { moveItem } from '@tr-lab/domain';
import { DecimalInput } from './DecimalInput';
import { counted, loadBasisLabel } from './Shared';
import styles from '../styles/App.module.css';

const kindOrder = { warmup: 0, work: 1, extra: 2 };
export function PrescriptionTargetsEditor({
  prescription: p,
  maxTargets,
  onChange,
}: {
  prescription: Prescription;
  maxTargets: number;
  onChange: (p: Prescription) => void;
}) {
  const workCount = p.targets.filter((t) => t.kind === 'work').length;
  const full = p.targets.length >= maxTargets;
  const update = (target: Target) =>
    onChange({ ...p, targets: p.targets.map((t) => (t.id === target.id ? target : t)) });
  function add(kind: 'work' | 'warmup') {
    const base = p.targets.findLast((t) => t.kind === 'work');
    if (!base || full) return;
    const target = { ...base, id: crypto.randomUUID(), kind };
    onChange({
      ...p,
      targets: [...p.targets, target].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]),
    });
  }
  return (
    <details className={styles.targetDetails}>
      <summary>Serie e target · {counted(p.targets.length, 'serie', 'serie')}</summary>
      <p className={styles.hint}>
        Modifica ogni serie separatamente. La seduta esegue riscaldamento, lavoro e infine extra;
        puoi riordinare le serie dello stesso tipo. Mantieni almeno una serie di lavoro.
      </p>
      {p.targets.map((t, index) => {
        const lastWork = t.kind === 'work' && workCount === 1;
        return (
          <fieldset className={styles.targetEditor} key={t.id}>
            <legend>Serie {index + 1}</legend>
            <div className={styles.formGrid}>
              <label>
                Tipo
                <select
                  value={t.kind}
                  onChange={(e) => {
                    const kind = e.target.value as Target['kind'];
                    if (lastWork && kind !== 'work') return;
                    // Il cambio di tipo sposta la serie nel gruppo previsto dalla seduta.
                    onChange({
                      ...p,
                      targets: p.targets
                        .map((target) => (target.id === t.id ? { ...target, kind } : target))
                        .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]),
                    });
                  }}
                >
                  <option value="work">Lavoro</option>
                  <option value="warmup" disabled={lastWork}>
                    Riscaldamento
                  </option>
                  <option value="extra" disabled={lastWork}>
                    Extra
                  </option>
                </select>
              </label>
              {p.exercise.unilateral ? (
                <label>
                  Lato
                  <select
                    value={t.side ?? 'both'}
                    onChange={(e) => update({ ...t, side: e.target.value as Target['side'] })}
                  >
                    <option value="both">Sinistro e destro</option>
                    <option value="left">Solo sinistro</option>
                    <option value="right">Solo destro</option>
                  </select>
                </label>
              ) : (
                <p className={styles.hint}>Esecuzione bilaterale</p>
              )}
            </div>
            <div className={styles.targetGrid}>
              {(['repsMin', 'repsMax', 'rir', 'restSeconds'] as const).map((field) => (
                <label key={field}>
                  {
                    {
                      repsMin: 'Rip. min',
                      repsMax: 'Rip. max',
                      rir: 'RIR',
                      restSeconds: 'Recupero (s)',
                    }[field]
                  }
                  <DecimalInput
                    required
                    min={field === 'rir' || field === 'restSeconds' ? 0 : 1}
                    max={field === 'rir' ? 10 : field === 'restSeconds' ? 1800 : 100}
                    integer={field !== 'rir'}
                    value={t[field]}
                    onValue={(value) => {
                      if (value !== null) update({ ...t, [field]: value });
                    }}
                  />
                </label>
              ))}
              <label>
                Carico (kg) · {loadBasisLabel[p.exercise.basis]}
                <DecimalInput
                  value={t.loadGrams}
                  scale={1000}
                  onValue={(value) =>
                    update({ ...t, loadGrams: value === null ? null : Math.round(value) })
                  }
                />
              </label>
            </div>
            {t.repsMax < t.repsMin && (
              <p className={styles.error} role="alert">
                Rip. max deve essere almeno pari a Rip. min.
              </p>
            )}
            <div className={styles.actionStrip}>
              <button
                type="button"
                disabled={full}
                onClick={() => {
                  if (full) return;
                  onChange({
                    ...p,
                    targets: [
                      ...p.targets.slice(0, index + 1),
                      { ...t, id: crypto.randomUUID() },
                      ...p.targets.slice(index + 1),
                    ],
                  });
                }}
              >
                <Copy size={16} aria-hidden="true" />
                Duplica serie {index + 1}
              </button>
              <button
                type="button"
                className={styles.danger}
                disabled={lastWork}
                onClick={() => {
                  if (!lastWork)
                    onChange({ ...p, targets: p.targets.filter((target) => target.id !== t.id) });
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
                Rimuovi serie {index + 1}
              </button>
              <button
                type="button"
                disabled={p.targets[index - 1]?.kind !== t.kind}
                onClick={() => onChange({ ...p, targets: moveItem(p.targets, index, index - 1) })}
              >
                Sposta serie {index + 1} sopra
              </button>
              <button
                type="button"
                disabled={p.targets[index + 1]?.kind !== t.kind}
                onClick={() => onChange({ ...p, targets: moveItem(p.targets, index, index + 1) })}
              >
                Sposta serie {index + 1} sotto
              </button>
            </div>
          </fieldset>
        );
      })}
      <div className={styles.actionStrip}>
        <button type="button" disabled={full} onClick={() => add('work')}>
          <Plus size={16} aria-hidden="true" />
          Aggiungi serie di lavoro
        </button>
        <button type="button" disabled={full} onClick={() => add('warmup')}>
          <Plus size={16} aria-hidden="true" />
          Aggiungi riscaldamento
        </button>
      </div>
      <p className={styles.hint}>
        Massimo {counted(maxTargets, 'serie base', 'serie base')} per questo ciclo; le altre sono
        riservate all'accumulo. Le nuove serie copiano i valori di lavoro: verifica i target.
      </p>
    </details>
  );
}
