import { useState, type FormEvent } from 'react';
import { Check, Plus, Ruler, Scale } from 'lucide-react';
import { measurementSchema, nutritionSchema, type Measurement } from '@tr-lab/contracts';
import { parseDecimal, workoutVolume } from '@tr-lab/domain';
import { useApp } from '../components/AppProvider';
import { counted, errorMessage } from '../components/Shared';
import styles from '../styles/App.module.css';

const labels = { weight: 'Peso', waist: 'Vita', chest: 'Torace', arm: 'Braccio', thigh: 'Coscia' };
const today = () => new Date().toLocaleDateString('sv-SE');
export function ProgressPage() {
  const { entities, save, notify } = useApp();
  const measurements = entities
    .flatMap((r) => (r.kind === 'measurement' ? [r.data] : []))
    .sort((a, b) => b.date.localeCompare(a.date));
  const weights = measurements
    .filter((m) => m.kind === 'weight')
    .slice(0, 30)
    .reverse();
  const nutrition = entities
    .flatMap((r) => (r.kind === 'nutrition' ? [r.data] : []))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const activeNutrition = nutrition.find((n) => n.effectiveFrom <= today());
  const completedSessions = entities.flatMap((r) =>
    r.kind === 'session' && r.data.status === 'completed' ? [r.data] : [],
  );
  const totals: Record<string, { left: number; right: number }> = {};
  for (const session of completedSessions) {
    const logs = entities.flatMap((r) =>
      r.kind === 'set' && r.data.sessionId === session.id ? [r.data] : [],
    );
    for (const [muscle, volume] of Object.entries(workoutVolume(logs, session.snapshot))) {
      const old = totals[muscle] ?? { left: 0, right: 0 };
      totals[muscle] = { left: old.left + volume.left, right: old.right + volume.right };
    }
  }
  const [kind, setKind] = useState<Measurement['kind']>('weight');
  const [side, setSide] = useState<Measurement['side']>('none');
  const [date, setDate] = useState(today());
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [from, setFrom] = useState(today());
  const [nutritionError, setNutritionError] = useState('');
  async function addMeasurement(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const quantity = parseDecimal(value);
      if (quantity === null) throw new Error('Inserisci un numero valido.');
      const m = measurementSchema.parse({
        id: crypto.randomUUID(),
        date,
        kind,
        side,
        value: Math.round(quantity * (kind === 'weight' ? 1000 : 10)),
        unit: kind === 'weight' ? 'g' : 'mm',
        notes: '',
      });
      await save('SaveMeasurement', { id: m.id, kind: 'measurement', revision: '0', data: m });
      setValue('');
      notify('Misurazione salvata.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function confirmNutrition(event: FormEvent) {
    event.preventDefault();
    setNutritionError('');
    setBusy(true);
    try {
      const n = nutritionSchema.parse({
        id: crypto.randomUUID(),
        calories: parseDecimal(calories),
        protein: parseDecimal(protein),
        fat: parseDecimal(fat),
        carbs: parseDecimal(carbs),
        effectiveFrom: from,
        method: 'manual',
        confirmedAt: new Date().toISOString(),
      });
      await save('SaveNutritionTarget', { id: n.id, kind: 'nutrition', revision: '0', data: n });
      notify('Target confermati con la decorrenza indicata.');
    } catch (error) {
      setNutritionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const energy =
    (parseDecimal(protein) ?? 0) * 4 +
    (parseDecimal(fat) ?? 0) * 9 +
    (parseDecimal(carbs) ?? 0) * 4;
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>DATI / CONSAPEVOLEZZA</span>
          <h1>Leggi il tuo percorso.</h1>
          <p>Misure e risultati, con il contesto che serve.</p>
        </div>
      </div>
      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>Il peso nel tempo</h2>
            <Scale size={22} aria-hidden="true" />
          </div>
          {weights.length ? (
            <>
              <div className={styles.bigMetric}>
                {((weights.at(-1)?.value ?? 0) / 1000).toLocaleString('it-IT')}
                <span> kg</span>
              </div>
              <WeightChart measurements={weights} />
              <details>
                <summary>Mostra i dati del grafico</summary>
                <table>
                  <caption>
                    {counted(weights.length, 'pesata', 'pesate')}, senza medie inventate
                  </caption>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Peso (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weights.map((m) => (
                      <tr key={m.id}>
                        <td>{m.date}</td>
                        <td>{(m.value / 1000).toLocaleString('it-IT')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          ) : (
            <div className={styles.inlineEmpty}>
              <Scale size={32} strokeWidth={1} aria-hidden="true" />
              <p>Il primo dato fa partire il grafico.</p>
              <span>Nessuna pesata inserita.</span>
            </div>
          )}
          <p className={styles.hint}>
            Il peso varia anche per acqua e condizioni di misura. Il grafico descrive i dati
            inseriti e non stima la massa muscolare.
          </p>
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>Aggiungi una misura</h2>
            <Ruler size={22} aria-hidden="true" />
          </div>
          <form onSubmit={(e) => void addMeasurement(e)}>
            <div className={styles.formGrid}>
              <label>
                Tipo
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as Measurement['kind']);
                    setSide('none');
                  }}
                >
                  {Object.entries(labels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Valore ({kind === 'weight' ? 'kg' : 'cm'})
                <input
                  required
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
              <label>
                Lato
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as Measurement['side'])}
                  disabled={kind === 'weight' || kind === 'waist' || kind === 'chest'}
                >
                  <option value="none">Non applicabile</option>
                  <option value="left">Sinistro</option>
                  <option value="right">Destro</option>
                </select>
              </label>
            </div>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className={styles.primary}>
              <Plus size={18} aria-hidden="true" />
              Salva misurazione
            </button>
          </form>
        </section>
      </div>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <h2>Nutrizione essenziale</h2>
          <span className={styles.eyebrow}>TARGET / CONFERMA MANUALE</span>
        </div>
        {activeNutrition ? (
          <div className={styles.macroStrip}>
            <div>
              <span>CALORIE</span>
              <strong>{activeNutrition.calories}</strong>
              <small>kcal / giorno</small>
            </div>
            <div>
              <span>PROTEINE</span>
              <strong>{activeNutrition.protein}</strong>
              <small>g / giorno</small>
            </div>
            <div>
              <span>GRASSI</span>
              <strong>{activeNutrition.fat}</strong>
              <small>g / giorno</small>
            </div>
            <div>
              <span>CARBOIDRATI</span>
              <strong>{activeNutrition.carbs}</strong>
              <small>g / giorno</small>
            </div>
          </div>
        ) : (
          <p className={styles.hint}>
            Nessun target attivo. Puoi inserire gli obiettivi che hai scelto; non vengono calcolati
            automaticamente in questa alpha.
          </p>
        )}
        <details>
          <summary>Imposta nuovi obiettivi</summary>
          <form onSubmit={(e) => void confirmNutrition(e)}>
            <div className={styles.formGrid}>
              {[
                { label: 'Calorie (kcal)', value: calories, set: setCalories },
                { label: 'Proteine (g)', value: protein, set: setProtein },
                { label: 'Grassi (g)', value: fat, set: setFat },
                { label: 'Carboidrati (g)', value: carbs, set: setCarbs },
              ].map((field) => (
                <label key={field.label}>
                  {field.label}
                  <input
                    required
                    inputMode="decimal"
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                  />
                </label>
              ))}
              <label>
                Decorrenza
                <input
                  type="date"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
            </div>
            <p className={styles.hint}>
              Energia dei macro: {energy.toLocaleString('it-IT')} kcal (4 / 9 / 4). Sono ammessi
              arrotondamenti entro il 2%, con minimo 20 kcal.
            </p>
            {nutritionError && (
              <p role="alert" className={styles.error}>
                {nutritionError}
              </p>
            )}
            <button className={styles.primary} disabled={busy} type="submit">
              Confermo questi target <Check size={18} aria-hidden="true" />
            </button>
          </form>
        </details>
        {nutrition
          .filter((n) => n.effectiveFrom > today())
          .map((n) => (
            <p className={styles.hint} key={n.id}>
              Target futuro: {n.calories} kcal dal {n.effectiveFrom}.
            </p>
          ))}
      </section>
      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>Volume completato</h2>
            <span className={styles.eyebrow}>TUTTE LE SEDUTE CONCLUSE</span>
          </div>
          {Object.keys(totals).length ? (
            <table>
              <caption>Serie dirette per lato, riscaldamento escluso</caption>
              <thead>
                <tr>
                  <th>Gruppo</th>
                  <th>SX</th>
                  <th>DX</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(totals).map(([muscle, count]) => (
                  <tr key={muscle}>
                    <td>{muscle}</td>
                    <td>{count.left}</td>
                    <td>{count.right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.hint}>Il riepilogo apparirà dopo la prima seduta conclusa.</p>
          )}
          <p className={styles.hint}>
            Una serie bilaterale conta una volta per ciascun lato. Una coppia SX / DX conta una
            volta per lato. Le serie indirette non sono stimate in questa vista.
          </p>
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>Registro misure</h2>
            <span className={styles.eyebrow}>{counted(measurements.length, 'DATO', 'DATI')}</span>
          </div>
          {measurements.length ? (
            <div className={styles.tableScroll}>
              <table>
                <caption>Misure inserite</caption>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Misura</th>
                    <th>Valore</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.slice(0, 50).map((m) => (
                    <tr key={m.id}>
                      <td>{m.date}</td>
                      <td>
                        {labels[m.kind]}
                        {m.side !== 'none' ? (m.side === 'left' ? ' SX' : ' DX') : ''}
                      </td>
                      <td>
                        {(m.value / (m.unit === 'g' ? 1000 : 10)).toLocaleString('it-IT')}{' '}
                        {m.unit === 'g' ? 'kg' : 'cm'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.hint}>
              Peso e circonferenze rimangono nello stesso archivio personale.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
function WeightChart({ measurements }: { measurements: Measurement[] }) {
  const values = measurements.map((m) => m.value / 1000);
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const points = values.map(
    (value, i) =>
      `${25 + (i * 550) / Math.max(1, values.length - 1)},${150 - ((value - min) / (max - min)) * 115}`,
  );
  return (
    <svg
      className={styles.chart}
      viewBox="0 0 600 180"
      role="img"
      aria-labelledby="weight-chart-title"
    >
      <title id="weight-chart-title">
        Andamento: {counted(measurements.length, 'pesata', 'pesate')}. Dati nella tabella seguente.
      </title>
      {[35, 92, 150].map((y) => (
        <line key={y} x1="25" x2="575" y1={y} y2={y} stroke="currentColor" opacity="0.12" />
      ))}
      <polyline points={points.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="3" />
      {points.map((point, i) => {
        const [x, y] = point.split(',');
        return <circle key={measurements[i]?.id} cx={x} cy={y} r="4" fill="var(--accent)" />;
      })}
    </svg>
  );
}
