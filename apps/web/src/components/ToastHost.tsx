import { useEffect, useEffectEvent, useRef } from 'react';
import { Feedback, type FeedbackNotice } from './Feedback';
import styles from '../styles/App.module.css';

/** Conferme temporanee; gli altri toni restano nel feedback persistente della pagina. */
export function ToastHost({
  notice,
  dismiss,
}: {
  notice: FeedbackNotice | null;
  dismiss: () => void;
}) {
  const confirmation = notice?.tone === 'success' ? notice : null;
  return (
    <>
      <div className={styles.srOnly} role="status" aria-atomic="true">
        {confirmation && <span key={confirmation.id}>{confirmation.message}</span>}
      </div>
      {confirmation && <TimedToast key={confirmation.id} notice={confirmation} dismiss={dismiss} />}
    </>
  );
}

function TimedToast({ notice, dismiss }: { notice: FeedbackNotice; dismiss: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  // I render del provider non devono riavviare il timer o conservare callback obsolete.
  const expire = useEffectEvent(dismiss);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const active = document.activeElement;
    previousFocus.current = active instanceof window.HTMLElement ? active : null;
    let remaining = 5000;
    let startedAt = 0;
    let timer: number | undefined;
    let hovered = false;
    let focused = node.contains(active);
    function pause() {
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    }
    function resume() {
      if (document.hidden || hovered || focused || timer !== undefined) return;
      startedAt = Date.now();
      timer = window.setTimeout(() => {
        timer = undefined;
        expire();
      }, remaining);
    }
    const enter = () => {
      hovered = true;
      pause();
    };
    const leave = () => {
      hovered = false;
      resume();
    };
    const focusIn = () => {
      focused = true;
      pause();
    };
    const focusOut = (event: FocusEvent) => {
      focused = event.relatedTarget instanceof window.Node && node.contains(event.relatedTarget);
      if (!focused) resume();
    };
    const visibility = () => (document.hidden ? pause() : resume());
    node.addEventListener('pointerenter', enter);
    node.addEventListener('pointerleave', leave);
    node.addEventListener('focusin', focusIn);
    node.addEventListener('focusout', focusOut);
    document.addEventListener('visibilitychange', visibility);
    resume();
    return () => {
      window.clearTimeout(timer);
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointerleave', leave);
      node.removeEventListener('focusin', focusIn);
      node.removeEventListener('focusout', focusOut);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return (
    <div
      ref={container}
      className={styles.toastRegion}
      role="region"
      aria-label="Notifica temporanea"
    >
      <Feedback
        tone="success"
        announce={false}
        dismiss={() => {
          if (previousFocus.current?.isConnected) previousFocus.current.focus();
          dismiss();
        }}
      >
        {notice.message}
      </Feedback>
    </div>
  );
}
