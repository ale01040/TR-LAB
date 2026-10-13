import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ZodError } from 'zod';
import type { Exercise } from '@tr-lab/contracts';
import styles from '../styles/App.module.css';

export function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
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
    <dialog ref={ref} className={styles.dialog} onCancel={close} aria-labelledby={titleId}>
      <div className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button className={styles.iconButton} onClick={close} aria-label="Chiudi">
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
    ? [...new Set(error.issues.map((issue) => issue.message))].join(' ')
    : error instanceof Error
      ? (errorTextByCode[error.message] ?? error.message)
      : 'Operazione non riuscita.';
}
