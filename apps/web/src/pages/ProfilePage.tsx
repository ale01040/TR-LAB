import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, LogOut, Moon, Sun } from 'lucide-react';
import { useApp } from '../components/AppProvider';
import { emergencyExport, metadata, setMetadata } from '../data/database';
import { counted, Dialog, downloadJson, errorMessage } from '../components/Shared';
import { AuthForm } from '../components/AuthForm';
import { Feedback } from '../components/Feedback';
import styles from '../styles/App.module.css';
import { RecoveryPanel } from '../components/RecoveryPanel';

export function ProfilePage() {
  const {
    account,
    user,
    configured,
    online,
    pending,
    blocked,
    logout,
    notify,
    sync,
    syncing,
    loggingOut,
    authVerified,
    accountCacheError,
    authServiceState,
    refreshAuth,
  } = useApp();
  const [exitDialog, setExitDialog] = useState(false);
  const [light, setLight] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    document.documentElement.dataset.motion === 'reduce',
  );
  const [motionBusy, setMotionBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([metadata('theme'), metadata('motion')])
      .then(([theme, motion]) => {
        if (cancelled) return;
        setLight(theme === 'light');
        setReduceMotion(motion === 'reduce');
      })
      .catch(() =>
        notify(
          'Non riesco a leggere le preferenze salvate. Puoi riprovare a scegliere il tema.',
          'warning',
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [notify]);
  useEffect(() => {
    let cancelled = false;
    void metadata(account + ':last-sync')
      .then((value) => {
        if (!cancelled) setLastSync(value);
      })
      .catch(() => {
        if (!cancelled) setLastSync(null);
      });
    return () => {
      cancelled = true;
    };
  }, [account, pending, syncing]);
  async function changeTheme() {
    if (themeBusy) return;
    setThemeBusy(true);
    try {
      const next = !light;
      await setMetadata('theme', next ? 'light' : 'dark');
      setLight(next);
      document.documentElement.dataset.theme = next ? 'light' : 'dark';
      notify(next ? 'Tema chiaro salvato.' : 'Tema scuro salvato.', 'success');
    } catch {
      notify(
        'Non è stato possibile salvare la preferenza. Il tema precedente è ancora attivo.',
        'error',
      );
    } finally {
      setThemeBusy(false);
    }
  }
  async function exportLocal() {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      downloadJson(await emergencyExport(account), 'TR-LAB-recupero-locale.json');
      notify(
        'Backup preparato. Controlla il download del browser e conservalo in un posto sicuro.',
        'success',
      );
    } catch (error) {
      notify(errorMessage(error), 'error');
    } finally {
      setExportBusy(false);
    }
  }
  async function changeMotion() {
    if (motionBusy) return;
    setMotionBusy(true);
    try {
      const next = !reduceMotion;
      await setMetadata('motion', next ? 'reduce' : 'system');
      document.documentElement.dataset.motion = next ? 'reduce' : 'system';
      setReduceMotion(next);
      notify(
        next
          ? 'Animazioni ridotte su questo dispositivo.'
          : 'Animazioni impostate secondo le preferenze del dispositivo.',
        'success',
      );
    } catch {
      notify(
        'Non posso salvare la preferenza delle animazioni. L’impostazione precedente resta attiva.',
        'error',
      );
    } finally {
      setMotionBusy(false);
    }
  }
  const conflicts = user ? blocked : 0;
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>PERSONALE / SEMPRE TUO</span>
          <h1>Il tuo spazio.</h1>
          <p>Accesso, preferenze e controllo dei tuoi dati.</p>
        </div>
      </div>
      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>
              {user ? 'Account personale' : configured ? 'Accedi a TR LAB' : 'Modalità dispositivo'}
            </h2>
            <span className={styles.badge}>
              {user
                ? authVerified
                  ? 'Accesso verificato'
                  : 'Account sul dispositivo'
                : configured
                  ? 'Accesso da completare'
                  : 'Modalità dispositivo'}
            </span>
          </div>
          {user?.recovery ? (
            <AuthForm recovery />
          ) : user ? (
            <>
              {accountCacheError && (
                <Feedback tone="warning" title="Memoria locale dell’account non aggiornata">
                  La sessione sul server è verificata. Controlla lo spazio del browser prima di
                  usare il diario offline: non posso memorizzare l’account per il prossimo avvio
                  senza rete.
                </Feedback>
              )}
              <p>
                <strong>{user.email}</strong>
              </p>
              <p className={styles.hint}>
                I dati sul dispositivo sono isolati da altri account. Per sincronizzare è necessaria
                una sessione valida sul server.
              </p>
              <div className={styles.actionStrip}>
                <button
                  className={styles.secondary}
                  disabled={!online || syncing || loggingOut}
                  onClick={() => void sync(true)}
                >
                  {syncing ? 'Sincronizzazione in corso…' : 'Sincronizza adesso'}
                </button>
                <button
                  className={styles.secondary}
                  disabled={loggingOut || exportBusy}
                  onClick={() => setExitDialog(true)}
                >
                  <LogOut size={18} aria-hidden="true" />
                  Esci da questo dispositivo
                </button>
              </div>
              <p className={styles.hint}>
                {counted(pending, 'operazione locale', 'operazioni locali')} ·{' '}
                {counted(conflicts, 'conflitto da rivedere', 'conflitti da rivedere')}
                {lastSync
                  ? ` · Ultima sincronizzazione: ${new Date(lastSync).toLocaleString('it-IT')}`
                  : ''}
                .
              </p>
            </>
          ) : !configured && authServiceState === 'unreachable' ? (
            <>
              <p role="alert" className={styles.error}>
                Il servizio account non risponde. I dati locali restano disponibili; questo non
                significa che email o password siano sbagliate.
              </p>
              <button
                type="button"
                className={styles.secondary}
                disabled={!online || retryBusy}
                onClick={async () => {
                  setRetryBusy(true);
                  try {
                    await refreshAuth();
                  } catch {
                    notify(
                      'Il servizio account non è ancora raggiungibile. Riprova più tardi.',
                      'warning',
                    );
                  } finally {
                    setRetryBusy(false);
                  }
                }}
              >
                {retryBusy ? 'Verifico la connessione…' : 'Riprova la connessione'}
              </button>
            </>
          ) : !configured ? (
            <p className={styles.setupNote}>
              In questa anteprima puoi usare schede, diario e misure sul dispositivo. Login e
              sincronizzazione saranno disponibili dopo il collegamento e il collaudo del servizio
              account. Esporta regolarmente un backup: i dati locali non si trasferiscono
              automaticamente tra telefono e PC.
            </p>
          ) : (
            <AuthForm />
          )}
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <h2>Preferenze e dati</h2>
            <span className={styles.eyebrow}>CONTROLLO</span>
          </div>
          <div className={styles.preference}>
            <div>
              <strong>Aspetto</strong>
              <small>{light ? 'Tema chiaro' : 'Tema scuro'}</small>
            </div>
            <button
              className={styles.secondary}
              disabled={themeBusy}
              onClick={() => void changeTheme()}
            >
              {light ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
              {light ? 'Scuro' : 'Chiaro'}
            </button>
          </div>
          <div className={styles.preference}>
            <div>
              <strong>Animazioni</strong>
              <small>{reduceMotion ? 'Ridotte in TR LAB' : 'Secondo il dispositivo'}</small>
            </div>
            <button
              className={styles.secondary}
              disabled={motionBusy}
              aria-pressed={reduceMotion}
              onClick={() => void changeMotion()}
            >
              {motionBusy
                ? 'Salvo…'
                : reduceMotion
                  ? 'Usa preferenza dispositivo'
                  : 'Riduci animazioni'}
            </button>
          </div>
          <div className={styles.preference}>
            <div>
              <strong>Backup del dispositivo</strong>
              <small>Archivio base, risultati e operazioni in attesa.</small>
            </div>
            <button
              className={styles.secondary}
              disabled={exportBusy || loggingOut}
              onClick={() => void exportLocal()}
            >
              <ArrowDownToLine size={18} aria-hidden="true" />
              {exportBusy ? 'Preparo il backup…' : 'Esporta'}
            </button>
          </div>
          <p className={styles.hint}>
            Il backup locale contiene dati personali e non è una scheda da condividere. Conservalo
            in un posto sicuro. Non viene caricato automaticamente.
          </p>
          {conflicts > 0 && (
            <div className={styles.error}>
              <strong>Operazioni da rivedere</strong>
              <p>
                Esporta il backup prima della riconciliazione. I dati locali restano conservati; i
                comandi rifiutati non vengono ripetuti automaticamente.
              </p>
            </div>
          )}
          <details>
            <summary>Stato di questa versione</summary>
            <p>
              Schede manuali, import Excel nei formati supportati, calendario, esercizi personali,
              diario offline, peso, circonferenze e target manuali. L’area account indica se hai
              effettuato l’accesso.
            </p>
            <p>
              Generatore, progressioni e assistente AI non sono ancora attivi. Le schede già
              approvate non vengono modificate automaticamente; ogni proposta richiede la tua
              conferma.
            </p>
            <p className={styles.hint}>
              Questa alpha non è ancora un servizio pubblico collaudato. Privacy operativa,
              cancellazione cloud e ripristino vanno verificati prima del rilascio.
            </p>
          </details>
          <button
            className={styles.textLink}
            onClick={async () => {
              try {
                const persistent = await navigator.storage?.persist?.();
                notify(
                  persistent
                    ? 'Il browser ha concesso la conservazione persistente.'
                    : 'Il browser non garantisce la conservazione. Esporta regolarmente un backup.',
                  persistent ? 'success' : 'warning',
                );
              } catch {
                notify(
                  'Non riesco a verificare la conservazione del browser. Esporta un backup.',
                  'warning',
                );
              }
            }}
          >
            Richiedi conservazione persistente
          </button>
        </section>
      </div>
      <RecoveryPanel />
      <p className={styles.hint}>
        <Link to="/aiuto#accesso">Guida per accesso, dati e sincronizzazione</Link>
      </p>
      {exitDialog && (
        <Dialog
          title="Uscire da questo dispositivo?"
          busy={loggingOut || syncing}
          close={() => setExitDialog(false)}
        >
          <p>
            I dati del tuo account restano conservati in questo browser. Dopo l’uscita saranno
            nascosti fino al prossimo accesso.
          </p>
          <p>
            {pending
              ? counted(
                  pending,
                  'modifica ancora da sincronizzare',
                  'modifiche ancora da sincronizzare',
                ) + '. Uscire non le cancella, ma non le invia ad altri dispositivi.'
              : 'Nessuna modifica in attesa di sincronizzazione.'}
          </p>
          {!online && (
            <p className={styles.hint}>
              Sei offline: la sessione sul server potrà essere chiusa quando torna la connessione.
            </p>
          )}
          {syncing && <p role="status">Sincronizzazione in corso. Attendi l’esito.</p>}
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={loggingOut || syncing}
              onClick={() => setExitDialog(false)}
            >
              Resta nel tuo account
            </button>
            {!!pending && online && (
              <button
                type="button"
                className={styles.secondary}
                disabled={syncing || loggingOut}
                onClick={() => void sync(true)}
              >
                Sincronizza prima
              </button>
            )}
            <button
              type="button"
              className={styles.primary}
              disabled={loggingOut || syncing}
              onClick={async () => {
                await logout();
                setExitDialog(false);
              }}
            >
              {loggingOut ? 'Uscita in corso…' : 'Esci conservando i dati'}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
