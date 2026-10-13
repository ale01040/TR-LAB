import { useState } from 'react';
import { equipmentProfileSchema, type EquipmentProfile } from '@tr-lab/contracts';
import { parseDecimal } from '@tr-lab/domain';
import { useApp } from './AppProvider';
import { equipmentLabels } from './PrivateExerciseForm';
import { Dialog, errorMessage, loadBasisLabel } from './Shared';
import styles from '../styles/App.module.css';
type Editing = Omit<EquipmentProfile, 'items'> & {
  items: (EquipmentProfile['items'][number] & { loadsText: string })[];
};
export function EquipmentPanel() {
  const { entities, save, notify } = useApp();
  const profiles = entities.flatMap((r) => (r.kind === 'equipment_profile' ? [r.data] : []));
  const [editing, setEditing] = useState<Editing | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const begin = (profile?: EquipmentProfile) => {
    setError('');
    setEditing(
      profile
        ? {
            ...profile,
            items: profile.items.map((i) => ({
              ...i,
              loadsText: i.availableLoadsGrams.map((g) => String(g / 1000)).join('; '),
            })),
          }
        : {
            id: crypto.randomUUID(),
            name: '',
            place: 'gym',
            items: [],
            updatedAt: new Date().toISOString(),
          },
    );
  };
  async function submit() {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      const items = editing.items.map((item) => {
        const tokens = item.loadsText.trim() ? item.loadsText.split(';') : [];
        const loads = tokens
          .map((token) => {
            const value = parseDecimal(token.trim());
            if (
              value === null ||
              value < 0 ||
              Math.abs(value * 1000 - Math.round(value * 1000)) > 1e-6
            )
              throw new Error(
                'Usa tagli validi in kg, separati da punto e virgola; massimo tre decimali.',
              );
            return Math.round(value * 1000);
          })
          .sort((a, b) => a - b);
        return {
          id: item.id,
          category: item.category,
          basis: item.basis,
          machineId: item.machineId,
          availableLoadsGrams: loads,
        };
      });
      const data = equipmentProfileSchema.parse({
        id: editing.id,
        name: editing.name,
        place: editing.place,
        items,
        updatedAt: new Date().toISOString(),
      });
      await save('SaveEquipmentProfile', {
        id: data.id,
        kind: 'equipment_profile',
        revision: '0',
        data,
      });
      setEditing(null);
      notify('Attrezzatura salvata sul dispositivo.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeading}>
        <h2>I miei luoghi e attrezzi</h2>
        <button onClick={() => begin()}>Aggiungi un luogo</button>
      </div>
      <p>
        Indica i tagli realmente disponibili e la convenzione del carico. L’elenco viene ordinato al
        salvataggio; nessun taglio viene inventato.
      </p>
      {profiles.map((p) => (
        <button key={p.id} onClick={() => begin(p)}>
          {p.name} · {p.items.length} attrezzi
        </button>
      ))}
      {editing && (
        <Dialog
          title="Attrezzatura disponibile"
          close={() => {
            if (!busy) setEditing(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <fieldset disabled={busy} className={styles.editorFields}>
              <legend>Profilo del luogo</legend>
              <label>
                Nome del luogo
                <input
                  required
                  maxLength={200}
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label>
                Ambiente
                <select
                  value={editing.place}
                  onChange={(e) =>
                    setEditing({ ...editing, place: e.target.value as EquipmentProfile['place'] })
                  }
                >
                  <option value="gym">Palestra</option>
                  <option value="home">Home gym</option>
                  <option value="bodyweight">Corpo libero</option>
                </select>
              </label>
              {editing.items.map((item, index) => {
                const change = (patch: Partial<Editing['items'][number]>) =>
                  setEditing({
                    ...editing,
                    items: editing.items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)),
                  });
                return (
                  <fieldset key={item.id}>
                    <legend>Attrezzo {index + 1}</legend>
                    <div className={styles.formGrid}>
                      <label>
                        Categoria
                        <select
                          value={item.category}
                          onChange={(e) =>
                            change({ category: e.target.value as typeof item.category })
                          }
                        >
                          {Object.entries(equipmentLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Convenzione
                        <select
                          value={item.basis}
                          onChange={(e) => change({ basis: e.target.value as typeof item.basis })}
                        >
                          {Object.entries(loadBasisLabel).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      Tagli in kg, separati da punto e virgola
                      <input
                        placeholder="Es. 2,5; 5; 7,5; 10"
                        value={item.loadsText}
                        onChange={(e) => change({ loadsText: e.target.value })}
                      />
                    </label>
                    <label>
                      Nome o identificativo della macchina
                      <input
                        maxLength={200}
                        value={item.machineId ?? ''}
                        onChange={(e) => change({ machineId: e.target.value || null })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          items: editing.items.filter((i) => i.id !== item.id),
                        })
                      }
                    >
                      Rimuovi questo attrezzo
                    </button>
                  </fieldset>
                );
              })}
              <button
                type="button"
                disabled={editing.items.length >= 100}
                onClick={() =>
                  setEditing({
                    ...editing,
                    items: [
                      ...editing.items,
                      {
                        id: crypto.randomUUID(),
                        category: 'bodyweight',
                        basis: 'bodyweight',
                        availableLoadsGrams: [],
                        machineId: null,
                        loadsText: '',
                      },
                    ],
                  })
                }
              >
                Aggiungi attrezzo
              </button>
              {error && <p role="alert">{error}</p>}
              <button className={styles.primary} disabled={busy}>
                Salva il profilo
              </button>
            </fieldset>
          </form>
        </Dialog>
      )}
    </section>
  );
}
