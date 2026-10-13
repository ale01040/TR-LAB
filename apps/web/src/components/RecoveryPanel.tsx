import { useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { copyProgram } from '@tr-lab/domain';
import { useApp } from './AppProvider';
import { db, metadata, emergencyExport } from '../data/database';
import { archiveAndReload, importRecovery, resolveConflict } from '../data/recovery';
import { lookupRecoveredDecision } from '../data/proposal-decisions';
import { prepareRecoveredWorkout } from '../data/workout-recovery';
import type { RecoveredWorkout } from '@tr-lab/contracts';
import { Dialog, downloadJson, errorMessage } from './Shared';
import styles from '../styles/App.module.css';
export function RecoveryPanel() {
  const { account, notify, sync, save, user, online, isCurrentSession } = useApp();
  const conflicts = (
    useLiveQuery(() => db.conflicts.where('account').equals(account).toArray(), [account]) ?? []
  ).filter((r) => r.account === account);
  const history = (
    useLiveQuery(() => db.resolutions.where('account').equals(account).toArray(), [account]) ?? []
  ).filter((r) => r.account === account);
  const base = (
    useLiveQuery(() => db.base.where('account').equals(account).toArray(), [account]) ?? []
  ).filter((r) => r.account === account);
  const recoveryResult = useLiveQuery(
    async () => ({ account, value: await metadata(`${account}:recovery`) }),
    [account],
  );
  const recovery = recoveryResult?.account === account ? recoveryResult.value : null;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [workout, setWorkout] = useState<RecoveredWorkout | null>(null);
  async function action(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await action(async () => {
      if (file.size > 20 * 1024 * 1024) throw new Error('Il backup supera 20 MiB.');
      await importRecovery(await file.text(), account);
      notify('Backup conservato nel recupero. Nessuna operazione è stata reinviata.');
    });
  }
  return (
    <section className={styles.panel}>
      <h2>Conflitti e recupero</h2>
      <p className={styles.hint}>
        Confronta i valori prima di decidere. Le intenzioni sostituite rimangono nell’archivio di
        recupero.
      </p>
      {recovery && (
        <div role="alert">
          <p>
            Il database remoto è stato ripristinato. I dati precedenti sono conservati sul
            dispositivo.
          </p>
          <button disabled={busy} onClick={() => setConfirm(true)}>
            Conserva una copia e ricarica l’archivio remoto
          </button>
        </div>
      )}
      {!conflicts.length && !recovery && <p>Nessun conflitto da risolvere.</p>}
      {conflicts.map((conflict) => {
        const remote =
          base.find((r) => r.entity.id === conflict.operation.command.aggregate_id)?.entity ??
          conflict.receipt.records.find((r) => r.id === conflict.operation.command.aggregate_id) ??
          conflict.receipt.records.find(
            (r) => r.kind === 'recovered_workout' || r.kind === 'session',
          );
        return (
          <details key={conflict.key}>
            <summary>
              {conflict.receipt.code} · {conflict.operation.command.command}
            </summary>
            <h3>Intenzione sul dispositivo</h3>
            <pre>
              {conflict.operation.command.command === 'DecideProposal'
                ? 'Decisione da verificare online; credenziale di review omessa.'
                : JSON.stringify(conflict.operation.command.payload, null, 2)}
            </pre>
            <h3>Valore remoto disponibile</h3>
            <pre>{JSON.stringify(remote?.data ?? null, null, 2)}</pre>
            <div className={styles.actionStrip}>
              <button
                disabled={busy || conflict.operation.command.command === 'DecideProposal'}
                onClick={() =>
                  void action(async () => {
                    await resolveConflict(account, conflict.operation.operation_id, 'retry');
                    await sync();
                  })
                }
              >
                Mantieni il mio con un nuovo tentativo
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void action(() =>
                    resolveConflict(account, conflict.operation.operation_id, 'remote'),
                  )
                }
              >
                Conserva in recupero e usa il remoto
              </button>
            </div>
            <p className={styles.hint}>
              La scelta comprende le operazioni collegate. Se lo stato remoto non ammette più il
              cambiamento, il nuovo tentativo viene respinto.
            </p>
          </details>
        );
      })}
      <div className={styles.actionStrip}>
        <button
          disabled={busy}
          onClick={() =>
            void action(async () =>
              downloadJson(await emergencyExport(account), 'TR-LAB-recupero-locale.json'),
            )
          }
        >
          Esporta tutto il recupero
        </button>
        <button disabled={busy} onClick={() => input.current?.click()}>
          Apri un backup di questo account
        </button>
        <input
          ref={input}
          className={styles.hidden}
          type="file"
          accept=".json,application/json"
          onChange={(event) => void load(event)}
        />
      </div>
      {!!history.length && (
        <details>
          <summary>Archivio di recupero · {history.length} interventi</summary>
          {history.map((item) => (
            <details key={item.key}>
              <summary>
                {item.reason} · {item.createdAt}
              </summary>
              <p>
                {item.operations.length} intenzioni, {item.records.length} fotografie di record.
              </p>
              {item.redactedDecisions?.map((intent) => (
                <p key={intent.operationId}>
                  Decisione {intent.operationId.slice(0, 8)}: credenziale di review omessa, non
                  reinviabile.{' '}
                  <button
                    disabled={busy || !user || !online}
                    onClick={() =>
                      void action(async () => {
                        if (!user) return;
                        const result = await lookupRecoveredDecision(account, intent, () =>
                          isCurrentSession(user.sessionId),
                        );
                        notify(
                          result === 'applied'
                            ? 'Decisione già applicata: ricevuta recuperata.'
                            : result === 'rejected'
                              ? 'Decisione non applicata: rivedi la proposta prima di una nuova scelta.'
                              : 'Nessuna ricevuta trovata: riapri la proposta, verifica e conferma nuovamente se desideri applicarla.',
                        );
                      })
                    }
                  >
                    Controlla l’esito online
                  </button>
                </p>
              ))}
              {[
                ...new Map(
                  item.records
                    .filter(
                      (r) => r.entity.kind === 'session' && r.entity.data.status === 'completed',
                    )
                    .map((r) => [r.entity.id, r.entity]),
                ).values(),
              ].map((row) => (
                <button
                  key={row.id}
                  disabled={busy}
                  onClick={() => {
                    try {
                      setWorkout(prepareRecoveredWorkout(item, row.id));
                    } catch (e) {
                      setError(errorMessage(e));
                    }
                  }}
                >
                  Rivedi esecuzione storica {row.kind === 'session' ? row.data.snapshot.name : ''}
                </button>
              ))}
              {item.records
                .filter((r) => r.entity.kind === 'program')
                .map((row, index) => (
                  <button
                    key={`${row.key}:${index}`}
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        if (row.entity.kind !== 'program') return;
                        const p = copyProgram(
                          row.entity.data,
                          () => crypto.randomUUID(),
                          new Date().toISOString(),
                        );
                        p.days = p.days.map((d) => ({
                          ...d,
                          exercises: d.exercises.map((slot) => ({
                            ...slot,
                            exercise: slot.exercise.id.startsWith('private:')
                              ? { ...slot.exercise, id: `embedded:${crypto.randomUUID()}` }
                              : slot.exercise,
                          })),
                        }));
                        await save('SaveProgramDraft', {
                          id: p.id,
                          kind: 'program',
                          revision: '0',
                          data: p,
                        });
                        notify('Scheda recuperata come nuova bozza, da rivedere e approvare.');
                      })
                    }
                  >
                    Copia scheda come bozza
                  </button>
                ))}
              <pre>
                {JSON.stringify(
                  item,
                  (key, value) => (key === 'challenge' ? '[omessa]' : value),
                  2,
                )}
              </pre>
            </details>
          ))}
        </details>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {workout && (
        <Dialog
          title="Conserva questa esecuzione storica"
          close={() => {
            if (!busy) setWorkout(null);
          }}
        >
          <p>
            Iniziata {workout.session.startedAt}, conclusa {workout.session.endedAt}.{' '}
            {workout.sets.length} risultati registrati. Non verrà approvato o modificato il
            programma di origine.
          </p>
          <p>
            Le serie mancanti restano mancanti. Se una seduta con lo stesso ID è già sul server,
            servirà il confronto e il recupero verrà respinto, senza sostituire dati.
          </p>
          {workout.session.snapshot.exercises.map((p) => (
            <details key={p.id} open>
              <summary>{p.exercise.name}</summary>
              {workout.sets
                .filter((s) => s.prescriptionId === p.id)
                .map((s) => (
                  <p key={s.id}>
                    {s.side} · {s.status === 'skipped' ? 'Saltata' : `${s.reps} ripetizioni`} ·{' '}
                    {s.loadGrams === null ? 'Carico non registrato' : `${s.loadGrams / 1000} kg`} ·
                    RIR {s.rir ?? 'non registrato'} · {s.notes}
                  </p>
                ))}
            </details>
          ))}
          {workout.session.notes && <p>{workout.session.notes}</p>}
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await save('ReconcileExecutedWorkout', {
                  id: workout.id,
                  kind: 'recovered_workout',
                  revision: '0',
                  data: workout,
                });
                setWorkout(null);
                notify(
                  'Esecuzione storica conservata sul dispositivo, con provenienza e snapshot originali.',
                );
              })
            }
          >
            Confermo questi dati di allenamento realmente svolto
          </button>
        </Dialog>
      )}
      {confirm && (
        <Dialog title="Conserva i dati prima del recupero" close={() => setConfirm(false)}>
          <p>
            Conserverò base, risultati e operazioni precedenti nell’archivio di recupero. Scaricherò
            poi i dati remoti. Le vecchie operazioni richiederanno un confronto e nuove decisioni.
          </p>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await archiveAndReload(account);
                setConfirm(false);
                await sync();
              })
            }
          >
            Confermo la conservazione e il nuovo download
          </button>
        </Dialog>
      )}
    </section>
  );
}
