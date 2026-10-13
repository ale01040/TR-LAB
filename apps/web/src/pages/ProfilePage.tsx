import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowRight, LogOut, Moon, Sun } from 'lucide-react';
import { useApp } from '../components/AppProvider';
import { emergencyExport, metadata, setMetadata } from '../data/database';
import { api, ApiError } from '../data/sync';
import { counted, downloadJson, errorMessage } from '../components/Shared';
import styles from '../styles/App.module.css';
import { RecoveryPanel } from '../components/RecoveryPanel';

const messages: Record<string, string> = {
  NOT_CONFIGURED:
    'Accesso non disponibile in questa anteprima. Schede e diario restano sul dispositivo.',
  INVALID_CREDENTIALS: 'Accesso non riuscito. Controlla email e password.',
  GOOGLE_NOT_CONFIGURED: 'Accesso Google non ancora configurato. Usa email e password.',
  RATE_LIMITED: 'Troppi tentativi. Attendi prima di riprovare.',
  INVALID_PASSWORD: 'Usa una passphrase di almeno 12 caratteri, entro 72 byte UTF-8.',
  CSRF_REJECTED: 'La sessione è cambiata. Ricarica la pagina e riprova.',
};
export function ProfilePage() {
  const { account, user, configured, online, pending, blocked, logout, refreshAuth, notify, sync } =
    useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'recover'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adults, setAdults] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [light, setLight] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  useEffect(() => {
    void metadata('theme').then((theme) => {
      const value = theme === 'light';
      setLight(value);
      document.documentElement.dataset.theme = value ? 'light' : 'dark';
    });
  }, []);
  useEffect(() => {
    void metadata(`${account}:last-sync`).then(setLastSync);
  }, [account, pending]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (await metadata('logout-pending')) {
        await refreshAuth();
        if (await metadata('logout-pending'))
          throw new Error('Completa l’uscita precedente prima di accedere.');
      }
      const result = await api<{ message: string }>(
        user?.recovery ? '/auth/password' : `/auth/${mode}`,
        'POST',
        user?.recovery
          ? { password }
          : mode === 'recover'
            ? { email }
            : { email, password, ...(mode === 'signup' ? { adults } : {}) },
      );
      setPassword('');
      notify(result.message);
      await refreshAuth();
    } catch (error) {
      setError(
        error instanceof ApiError
          ? (messages[error.code] ?? 'Operazione non riuscita. Riprova tra poco.')
          : errorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    try {
      const result = await api<{ url: string }>('/auth/google', 'POST', {});
      window.location.assign(result.url);
    } catch (error) {
      setError(
        error instanceof ApiError
          ? (messages[error.code] ?? 'Accesso Google non riuscito. Riprova tra poco.')
          : errorMessage(error),
      );
      setBusy(false);
    }
  }
  async function exportLocal() {
    try {
      downloadJson(await emergencyExport(account), 'TR-LAB-recupero-locale.json');
    } catch (error) {
      notify(errorMessage(error));
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
            <span className={styles.badge}>{user ? 'Personale' : 'Modalità dispositivo'}</span>
          </div>
          {user?.recovery ? (
            <form onSubmit={(e) => void submit(e)}>
              <p>
                Hai aperto il recupero password. Scegli una nuova passphrase per riattivare il tuo
                account.
              </p>
              <label>
                Nuova password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <p className={styles.hint}>
                Almeno 12 caratteri, entro 72 byte UTF-8. Le altre sessioni TR LAB saranno chiuse.
              </p>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className={styles.primary} disabled={busy || !online}>
                {busy ? 'Attendi…' : 'Conferma la nuova password'}
              </button>
              <button type="button" onClick={() => void logout()}>
                Annulla ed esci
              </button>
            </form>
          ) : user ? (
            <>
              <p>
                <strong>{user.email}</strong>
              </p>
              <p className={styles.hint}>
                I dati sul dispositivo sono isolati da altri account. Per sincronizzare è necessaria
                una sessione valida sul server.
              </p>
              <div className={styles.actionStrip}>
                <button className={styles.secondary} disabled={!online} onClick={() => void sync()}>
                  Sincronizza adesso
                </button>
                <button className={styles.danger} onClick={() => void logout()}>
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
          ) : !configured ? (
            <p className={styles.setupNote}>
              In questa anteprima puoi usare schede, diario e misure sul dispositivo. Login e
              sincronizzazione saranno disponibili dopo il collegamento e il collaudo del servizio
              account. Esporta regolarmente un backup: i dati locali non si trasferiscono
              automaticamente tra telefono e PC.
            </p>
          ) : (
            <>
              <div className={styles.tabs} role="group" aria-label="Modalità di accesso">
                <button
                  className={mode === 'login' ? styles.activeTab : ''}
                  onClick={() => setMode('login')}
                >
                  Accedi
                </button>
                <button
                  className={mode === 'signup' ? styles.activeTab : ''}
                  onClick={() => setMode('signup')}
                >
                  Registrati
                </button>
              </div>
              <form onSubmit={(e) => void submit(e)}>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                {mode !== 'recover' && (
                  <label>
                    Password
                    <input
                      type="password"
                      required
                      minLength={mode === 'signup' ? 12 : 1}
                      maxLength={128}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                )}
                {mode === 'signup' && (
                  <>
                    <p className={styles.hint}>
                      Passphrase di almeno 12 caratteri, fino a 72 byte UTF-8. La registrazione è
                      gratuita.
                    </p>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        required
                        checked={adults}
                        onChange={(e) => setAdults(e.target.checked)}
                      />
                      Confermo di essere maggiorenne. L'app è destinata all'allenamento non clinico.
                    </label>
                  </>
                )}
                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}
                <button className={styles.primary} type="submit" disabled={busy || !online}>
                  {busy
                    ? 'Attendi…'
                    : mode === 'signup'
                      ? 'Crea account'
                      : mode === 'recover'
                        ? 'Richiedi recupero password'
                        : 'Accedi'}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </form>
              <div className={styles.actionStrip}>
                <button
                  className={styles.secondary}
                  disabled={busy || !online}
                  onClick={() => void google()}
                >
                  Continua con Google
                </button>
                <button
                  onClick={() => {
                    setMode('recover');
                    setError('');
                  }}
                >
                  Password dimenticata?
                </button>
              </div>
              <p className={styles.hint}>
                Le schede create senza login rimangono sul dispositivo. Per trasferirle al tuo
                account, esporta una copia JSON e importala dopo l'accesso.
              </p>
            </>
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
              onClick={() => {
                const value = !light;
                setLight(value);
                document.documentElement.dataset.theme = value ? 'light' : 'dark';
                void setMetadata('theme', value ? 'light' : 'dark');
              }}
            >
              {light ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
              {light ? 'Scuro' : 'Chiaro'}
            </button>
          </div>
          <div className={styles.preference}>
            <div>
              <strong>Backup del dispositivo</strong>
              <small>Archivio base, risultati e operazioni in attesa.</small>
            </div>
            <button className={styles.secondary} onClick={() => void exportLocal()}>
              <ArrowDownToLine size={18} aria-hidden="true" />
              Esporta
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
              Schede manuali, struttura Excel adattata, diario offline, peso, circonferenze e target
              manuali. Il servizio account è predisposto per il collegamento e il collaudo.
            </p>
            <p>
              Progressioni, generatore, assistente AI, parser XLSX completo e condivisione tramite
              link richiedono i successivi gate della roadmap. Nessuna regola candidata è attiva sui
              tuoi target.
            </p>
            <p className={styles.hint}>
              Questa alpha non è ancora un servizio pubblico collaudato. Privacy operativa,
              cancellazione cloud e ripristino vanno verificati prima del rilascio.
            </p>
          </details>
          <button
            className={styles.textLink}
            onClick={async () => {
              const persistent = await navigator.storage?.persist?.();
              notify(
                persistent
                  ? 'Il browser ha concesso la conservazione persistente.'
                  : 'Il browser non garantisce la conservazione. Esporta regolarmente un backup.',
              );
            }}
          >
            Richiedi conservazione persistente
          </button>
        </section>
      </div>
      <RecoveryPanel />
    </>
  );
}
