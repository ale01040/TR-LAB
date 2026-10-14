import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from '../styles/App.module.css';

export type FeedbackTone = 'info' | 'success' | 'warning' | 'error';
export type FeedbackNotice = { id: number; message: string; tone: FeedbackTone };
const titles: Record<FeedbackTone, string> = {
  info: 'Stato dell’operazione',
  success: 'Operazione completata',
  warning: 'Attenzione',
  error: 'Operazione non riuscita',
};
export function Feedback({
  tone = 'info',
  title,
  children,
  dismiss,
  announce = true,
}: {
  tone?: FeedbackTone;
  title?: string;
  children: ReactNode;
  dismiss?: () => void;
  announce?: boolean;
}) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'info' ? Info : CircleAlert;
  return (
    <div className={`${styles.feedback} ${tone === 'error' ? styles.feedbackError : ''}`}>
      <Icon size={20} aria-hidden="true" />
      <div role={announce ? (tone === 'error' ? 'alert' : 'status') : undefined} aria-atomic="true">
        <strong>{title ?? titles[tone]}</strong>
        <div className={styles.feedbackBody}>{children}</div>
      </div>
      {dismiss && (
        <button
          type="button"
          className={styles.iconButton}
          onClick={dismiss}
          aria-label="Chiudi il messaggio"
        >
          ×
        </button>
      )}
    </div>
  );
}
