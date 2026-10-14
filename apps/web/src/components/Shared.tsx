import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ZodError } from 'zod';
import type { Exercise } from '@tr-lab/contracts';
import styles from '../styles/App.module.css';

export function Dialog({
  title,
  children,
  close,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      // React rimuove il dialog: ripristiniamo il focus anche se il browser perde il trigger.
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else close();
      }}
      aria-labelledby={titleId}
    >
      <div className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className={styles.iconButton}
          disabled={busy}
          onClick={close}
          aria-label="Chiudi"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.empty}>
      <span className={styles.eyebrow}>IL TUO SPAZIO</span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export const kilos = (grams: number | null) =>
  grams === null
    ? '—'
    : new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(grams / 1000);
export const counted = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;
export const loadBasisLabel: Record<Exercise['basis'], string> = {
  total: 'totale',
  per_dumbbell: 'singolo manubrio',
  bodyweight: 'corpo libero',
  added: 'zavorra',
  assistance: 'assistenza',
  machine: 'pacco pesi',
};
export const dateTime = (date: string) =>
  new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
export function downloadJson(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const errorTextByCode: Record<string, string> = {
  NETWORK_ERROR:
    'Non riesco a raggiungere il servizio. Riprova tra poco; i dati già inseriti restano sul dispositivo.',
  SYNC_UNAVAILABLE:
    'La sincronizzazione non è disponibile. I dati locali sono conservati: riprova tra poco.',
  SESSION_EXPIRED:
    'L’accesso è scaduto. Accedi di nuovo prima di sincronizzare; i dati locali sono conservati.',
  UNAUTHORIZED: 'Accedi al tuo account per completare questa operazione.',
  FORBIDDEN: 'Questa operazione non è disponibile per il tuo account.',
  RATE_LIMITED: 'Troppi tentativi ravvicinati. Attendi prima di riprovare.',
  RULES_AWAITING_REVIEW: 'Questo metodo richiede ancora revisione e attivazione.',
  ENGINE_UNAVAILABLE: 'Il servizio delle proposte non è disponibile. Riprova più tardi.',
  DATA_WINDOW_REQUIRED:
    'Queste esposizioni superano il limite della valutazione. Seleziona meno sedute da confrontare.',
  PROPOSAL_STALE:
    'I dati della proposta sono cambiati. Sincronizza e richiedi una nuova valutazione.',
  PROPOSAL_NOT_PENDING:
    'Questa proposta ha già un esito oppure è stata ritirata. Sincronizza il riepilogo.',
  PROPOSAL_DECISION_FAILED:
    'Esito non verificato. Sincronizza o controlla la ricevuta prima di confermare di nuovo.',
  CONFIRMATION_REQUIRED:
    'Riapri la proposta online e verifica il contenuto prima di una nuova conferma.',
};
export function errorMessage(error: unknown): string {
  return error instanceof ZodError
    ? [
        ...new Set(
          error.issues.map((issue) => {
            const field = [...issue.path].reverse().find((part) => typeof part === 'string');
            const labels: Record<string, string> = {
              loadGrams: 'Carico',
              reps: 'Ripetizioni',
              rir: 'RIR',
              value: 'Valore',
              date: 'Data',
              calories: 'Calorie',
              protein: 'Proteine',
              fat: 'Grassi',
              carbs: 'Carboidrati',
              effectiveFrom: 'Decorrenza',
              name: 'Nome',
              restSeconds: 'Recupero',
              repsMin: 'Ripetizioni minime',
              repsMax: 'Ripetizioni massime',
            };
            const label = typeof field === 'string' ? (labels[field] ?? 'Campo') : 'Dati';
            if (issue.code === 'invalid_type') return `${label}: inserisci un valore valido.`;
            if (issue.code === 'invalid_format')
              return `${label}: il formato non è valido. Ricontrolla il campo.`;
            if (issue.code === 'too_small' || issue.code === 'too_big') {
              const bound = Number(issue.code === 'too_small' ? issue.minimum : issue.maximum);
              if (issue.origin === 'string')
                return `${label}: usa ${issue.code === 'too_small' ? 'almeno' : 'al massimo'} ${bound} caratteri.`;
              const unit =
                field === 'loadGrams' ? ' kg' : field === 'restSeconds' ? ' secondi' : '';
              return `${label}: usa un valore ${issue.code === 'too_small' ? 'non inferiore' : 'non superiore'} a ${field === 'loadGrams' ? bound / 1000 : bound}${unit}.`;
            }
            return issue.message;
          }),
        ),
      ].join(' ')
    : error instanceof Error
      ? (errorTextByCode[error.message] ??
        (error.name === 'AbortError' || error instanceof TypeError
          ? 'Il servizio non ha risposto. Riprova tra poco; i dati già inseriti restano disponibili.'
          : /^[A-Z][A-Z0-9_]+$/.test(error.message)
            ? 'Operazione non completata. Ricontrolla i dati e riprova; per il recupero apri Guida e aiuto.'
            : error.message))
      : 'Operazione non riuscita.';
}
