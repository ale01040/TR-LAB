import { useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { authPasswordRequirements } from '@tr-lab/contracts';
import { useApp } from './AppProvider';
import { Feedback, type FeedbackTone } from './Feedback';
import { api, ApiError } from '../data/http';
import { metadata } from '../data/database';
import styles from '../styles/App.module.css';

type Mode = 'login' | 'signup' | 'recover';
type Field = 'email' | 'password' | 'confirmation' | 'adults';
const labels: Record<Field, string> = {
  email: 'Email',
  password: 'Password',
  confirmation: 'Ripeti la password',
  adults: 'Conferma maggiore età',
};
const messages: Record<string, string> = {
  INVALID_CREDENTIALS:
    'Non riesco ad accedere con questa email e password. Controllale e riprova. Se hai appena creato l’account, conferma prima l’email.',
  INVALID_PASSWORD:
    'La password non rispetta i requisiti. Controlla lunghezza e limite indicati sotto il campo.',
  SIGNUP_FAILED:
    'La registrazione non è stata completata. Ricontrolla i campi e riprova; se il problema continua, chiedi aiuto al gestore.',
  RECOVERY_UNAVAILABLE:
    'Non è stato possibile richiedere l’email di recupero. Riprova tra poco o chiedi al gestore di verificare il servizio email.',
  GOOGLE_NOT_CONFIGURED: 'L’accesso Google non è disponibile. Puoi usare email e password.',
  OAUTH_UNAVAILABLE:
    'Non è stato possibile avviare l’accesso Google. Riprova o usa email e password.',
  CSRF_REJECTED: 'La sessione è cambiata. Ricarica questa pagina prima di riprovare.',
  NOT_CONFIGURED:
    'Il servizio account non è disponibile in questa versione. Puoi continuare con il diario sul dispositivo.',
};
export function AuthForm({ recovery = false }: { recovery?: boolean }) {
  const { online, googleAvailable, loggingOut, refreshAuth, notify, logout } = useApp();
  const id = useId();
  const running = useRef(false);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [adults, setAdults] = useState(false);
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  const [action, setAction] = useState<Mode | 'password' | 'google' | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    title: string;
    message: string;
  } | null>(null);
  const requirements = authPasswordRequirements(password);
  const newPassword = recovery || mode === 'signup';
  const busy = action !== null || loggingOut;
  const errors: Partial<Record<Field, string>> = {};
  if (!recovery && !z.email().max(254).safeParse(email.trim()).success)
    errors.email = email.trim()
      ? 'Usa un indirizzo completo, ad esempio nome@dominio.it.'
      : 'Inserisci la tua email.';
  if (recovery || mode !== 'recover') {
    if (!password) errors.password = 'Inserisci la password.';
    else if (newPassword && !requirements.minimumMet) errors.password = 'Usa almeno 12 caratteri.';
    else if (newPassword && !requirements.maximumMet)
      errors.password = 'Supera il limite di 72 byte. Riducila prima di procedere.';
    if (newPassword && confirmation !== password)
      errors.confirmation = confirmation
        ? 'Le due password non coincidono. Ricontrolla questo campo.'
        : 'Ripeti la password per evitare errori di digitazione.';
    else if (newPassword && !confirmation) errors.confirmation = 'Ripeti la password.';
  }
  if (!recovery && mode === 'signup' && !adults)
    errors.adults = 'Conferma di essere maggiorenne prima di creare l’account.';
  const shown = Object.entries(errors).filter(([field]) => attempted || touched[field as Field]);
  function changeMode(next: Mode) {
    setMode(next);
    setPassword('');
    setConfirmation('');
    setVisible(false);
    setTouched({});
    setAttempted(false);
    setFeedback(null);
  }
  function showError(error: unknown) {
    const message =
      error instanceof ApiError
        ? error.code === 'RATE_LIMITED'
          ? `Troppi tentativi. ${error.retryAfterMs ? `Attendi almeno ${Math.ceil(error.retryAfterMs / 1000)} secondi` : 'Attendi qualche minuto'} prima di riprovare.`
          : (messages[error.code] ??
            'Il servizio non ha completato la richiesta. Riprova tra poco; i campi sono ancora disponibili.')
        : error instanceof Error && error.message === 'LOGOUT_PENDING'
          ? 'La precedente uscita dal server non è ancora terminata. Torna online e riprova; non cambiare account prima della conferma.'
          : 'Non è stato possibile verificare la richiesta. Controlla la connessione e riprova; i campi sono conservati.';
    setFeedback({ tone: 'error', title: 'Richiesta non completata', message });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || loggingOut || !online) return;
    setAttempted(true);
    setFeedback(null);
    const first = Object.keys(errors)[0];
    if (first) {
      const field = event.currentTarget.elements.namedItem(first);
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    running.current = true;
    setAction(recovery ? 'password' : mode);
    try {
      if (await metadata('logout-pending')) {
        await refreshAuth();
        if (await metadata('logout-pending')) throw new Error('LOGOUT_PENDING');
      }
      const result = z
        .object({ message: z.string().min(1).max(1000) })
        .parse(
          await api<unknown>(
            recovery ? '/auth/password' : `/auth/${mode}`,
            'POST',
            recovery
              ? { password }
              : mode === 'recover'
                ? { email: email.trim() }
                : { email: email.trim(), password, ...(mode === 'signup' ? { adults } : {}) },
          ),
        );
      const verifiedUser = await refreshAuth();
      // Il solo HTTP 200 non dimostra un login: attendiamo la verifica della sessione.
      if (verifiedUser && !verifiedUser.recovery) {
        setPassword('');
        setConfirmation('');
        notify(
          recovery
            ? 'Password aggiornata e accesso verificato.'
            : 'Accesso verificato. Sei nel tuo account personale.',
          'success',
        );
      } else if (mode === 'login' || recovery) {
        setFeedback({
          tone: 'warning',
          title: 'Accesso da verificare',
          message:
            'La richiesta è stata ricevuta, ma non riesco a verificare la sessione. Ricarica la pagina e riprova; non considerare completato l’accesso.',
        });
      } else {
        setPassword('');
        setConfirmation('');
        setAttempted(false);
        setTouched({});
        setFeedback({ tone: 'info', title: 'Controlla la tua email', message: result.message });
      }
    } catch (error) {
      showError(error);
    } finally {
      running.current = false;
      setAction(null);
    }
  }
  async function google() {
    if (running.current || !online) return;
    running.current = true;
    setAction('google');
    setFeedback(null);
    try {
      if (await metadata('logout-pending')) {
        await refreshAuth();
        if (await metadata('logout-pending')) throw new Error('LOGOUT_PENDING');
      }
      const result = z
        .object({ url: z.url() })
        .parse(await api<unknown>('/auth/google', 'POST', {}));
      window.location.assign(result.url);
    } catch (error) {
      showError(error);
      running.current = false;
      setAction(null);
    }
  }
  function fieldError(field: Field) {
    // Lo spazio stabile impedisce che il pulsante si sposti fra touch-down e click al blur.
    return (
      <span id={`${id}-${field}-error`} className={styles.authFieldMessage}>
        {(attempted || touched[field]) && errors[field] ? errors[field] : ''}
      </span>
    );
  }
  function invalid(field: Field) {
    return !!((attempted || touched[field]) && errors[field]);
  }
  const pendingTitle =
    action === 'login'
      ? 'Verifica dell’accesso…'
      : action === 'signup'
        ? 'Registrazione in corso…'
        : action === 'recover'
          ? 'Richiesta di recupero in corso…'
          : action === 'google'
            ? 'Apro l’accesso Google…'
            : 'Aggiornamento password in corso…';
  return (
    <>
      {!recovery && (
        <div className={styles.tabs} role="group" aria-label="Modalità di accesso">
          <button
            type="button"
            disabled={busy}
            aria-pressed={mode === 'login'}
            className={mode === 'login' ? styles.activeTab : ''}
            onClick={() => changeMode('login')}
          >
            Accedi
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={mode === 'signup'}
            className={mode === 'signup' ? styles.activeTab : ''}
            onClick={() => changeMode('signup')}
          >
            Registrati
          </button>
        </div>
      )}
      {recovery && (
        <p>Scegli una nuova password. Le altre sessioni TR LAB saranno chiuse dopo la conferma.</p>
      )}
      {mode === 'recover' && <h3>Recupera l’accesso</h3>}
      <form
        className={styles.authForm}
        aria-label={
          recovery
            ? 'Nuova password'
            : mode === 'login'
              ? 'Accesso'
              : mode === 'signup'
                ? 'Registrazione'
                : 'Recupero accesso'
        }
        noValidate
        onSubmit={(event) => void submit(event)}
        aria-busy={action !== null}
      >
        {attempted && shown.length > 0 && (
          <Feedback tone="error" title="Controlla questi campi">
            {shown.map(([field]) => labels[field as Field]).join(' · ')}. Nessuna richiesta è stata
            inviata.
          </Feedback>
        )}
        <fieldset disabled={busy}>
          <legend className={styles.srOnly}>Dati per l’accesso</legend>
          {!recovery && (
            <div className={styles.authField}>
              <label htmlFor={`${id}-email`}>Email (obbligatoria)</label>
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                aria-invalid={invalid('email')}
                aria-describedby={invalid('email') ? `${id}-email-error` : undefined}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((value) => ({ ...value, email: true }))}
              />
              {fieldError('email')}
            </div>
          )}
          {(recovery || mode !== 'recover') && (
            <>
              <div className={styles.authField}>
                <label htmlFor={`${id}-password`}>
                  {recovery ? 'Nuova password' : 'Password'} (obbligatoria)
                </label>
                <div className={styles.passwordControl}>
                  <input
                    id={`${id}-password`}
                    name="password"
                    type={visible ? 'text' : 'password'}
                    required
                    maxLength={128}
                    autoComplete={newPassword ? 'new-password' : 'current-password'}
                    value={password}
                    aria-invalid={invalid('password')}
                    aria-describedby={`${id}-password-help${invalid('password') ? ` ${id}-password-error` : ''}`}
                    onChange={(event) => setPassword(event.target.value)}
                    onBlur={() => setTouched((value) => ({ ...value, password: true }))}
                  />
                  <button
                    type="button"
                    aria-pressed={visible}
                    aria-label={visible ? 'Nascondi password' : 'Mostra password'}
                    onClick={() => setVisible((value) => !value)}
                  >
                    {visible ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldError('password')}
              </div>
              <p id={`${id}-password-help`} className={styles.helpText}>
                {newPassword
                  ? 'Almeno 12 caratteri, massimo 72 byte. Accenti ed emoji possono raggiungere il limite prima. La password non viene modificata o tagliata.'
                  : 'Usa la password del tuo account. La correttezza viene verificata quando premi Accedi.'}
              </p>
              {newPassword && (
                <>
                  <ul className={styles.requirements} aria-label="Requisiti della password">
                    <li data-met={requirements.minimumMet}>
                      {requirements.minimumMet ? (
                        <Check size={16} aria-hidden="true" />
                      ) : (
                        <Circle size={16} aria-hidden="true" />
                      )}
                      Almeno 12 caratteri: {requirements.characters} inseriti
                    </li>
                    <li data-met={requirements.maximumMet}>
                      {requirements.maximumMet ? (
                        <Check size={16} aria-hidden="true" />
                      ) : (
                        <Circle size={16} aria-hidden="true" />
                      )}
                      Limite rispettato: {requirements.bytes} di 72 byte
                    </li>
                  </ul>
                  <div className={styles.authField}>
                    <label htmlFor={`${id}-confirmation`}>Ripeti la password (obbligatoria)</label>
                    <input
                      id={`${id}-confirmation`}
                      name="confirmation"
                      type={visible ? 'text' : 'password'}
                      required
                      maxLength={128}
                      autoComplete="new-password"
                      value={confirmation}
                      aria-invalid={invalid('confirmation')}
                      aria-describedby={
                        invalid('confirmation') ? `${id}-confirmation-error` : undefined
                      }
                      onChange={(event) => setConfirmation(event.target.value)}
                      onBlur={() => setTouched((value) => ({ ...value, confirmation: true }))}
                    />
                    {fieldError('confirmation')}
                    {confirmation && confirmation === password && (
                      <small>Le due password coincidono.</small>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {!recovery && mode === 'signup' && (
            <div>
              <label className={styles.checkbox} htmlFor={`${id}-adults`}>
                <input
                  id={`${id}-adults`}
                  name="adults"
                  type="checkbox"
                  required
                  checked={adults}
                  aria-invalid={invalid('adults')}
                  aria-describedby={invalid('adults') ? `${id}-adults-error` : undefined}
                  onChange={(event) => setAdults(event.target.checked)}
                />
                <span>
                  Confermo di essere maggiorenne. L’app è destinata all’allenamento non clinico. La
                  registrazione è gratuita.
                </span>
              </label>
              {fieldError('adults')}
            </div>
          )}
        </fieldset>
        {!online && (
          <Feedback tone="warning" title="Sei offline">
            Accesso e richieste email richiedono Internet. I campi restano disponibili e puoi
            continuare con il diario locale.
          </Feedback>
        )}
        {loggingOut && (
          <Feedback title="Uscita in corso…">
            Attendi la conclusione prima di accedere a un altro account.
          </Feedback>
        )}
        {action && (
          <Feedback title={pendingTitle}>
            Attendi l’esito. Non serve premere di nuovo il pulsante.
          </Feedback>
        )}
        {feedback && (
          <Feedback tone={feedback.tone} title={feedback.title}>
            {feedback.message}
            {feedback.title === 'Controlla la tua email' && (
              <p>
                Apri il link nello stesso browser. Se non arriva, controlla spam e{' '}
                <Link to="/aiuto#accesso">le indicazioni per l’accesso</Link>.
              </p>
            )}
          </Feedback>
        )}
        <button type="submit" className={styles.primary} disabled={busy || !online}>
          {action
            ? pendingTitle
            : recovery
              ? 'Conferma la nuova password'
              : mode === 'signup'
                ? 'Crea account'
                : mode === 'recover'
                  ? 'Richiedi recupero password'
                  : 'Accedi'}
        </button>
      </form>
      <div className={styles.actionStrip}>
        {!recovery && googleAvailable && (
          <button
            className={styles.secondary}
            disabled={busy || !online}
            onClick={() => void google()}
          >
            Continua con Google
          </button>
        )}
        {!recovery && mode === 'login' && (
          <button type="button" disabled={busy} onClick={() => changeMode('recover')}>
            Password dimenticata?
          </button>
        )}
        {!recovery && mode === 'recover' && (
          <button type="button" disabled={busy} onClick={() => changeMode('login')}>
            Torna all’accesso
          </button>
        )}
        {recovery && (
          <button type="button" disabled={busy} onClick={() => void logout()}>
            Annulla ed esci
          </button>
        )}
      </div>
      {!recovery && !googleAvailable && (
        <p className={styles.hint}>
          L’accesso Google non è disponibile in questa versione. Usa email e password.
        </p>
      )}
      {!recovery && (
        <p className={styles.hint}>
          Le schede create senza login restano in un archivio separato sul dispositivo.{' '}
          <Link to="/aiuto#dati">Come trasferirle nel tuo account</Link>.
        </p>
      )}
    </>
  );
}
