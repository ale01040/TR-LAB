// @vitest-environment jsdom
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ToastHost } from '../../apps/web/src/components/ToastHost';
import type { FeedbackNotice } from '../../apps/web/src/components/Feedback';

const confirmation: FeedbackNotice = {
  id: 1,
  tone: 'success',
  message: 'Misura salvata sul dispositivo.',
};
let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
});
afterEach(() => {
  cleanup();
  if (vi.isFakeTimers()) {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
  vi.restoreAllMocks();
});
function elapse(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

it('richiede la chiusura dopo cinque secondi, senza riavviare il tempo ai render del provider', () => {
  const initialDismiss = vi.fn();
  const latestDismiss = vi.fn();
  const view = render(<ToastHost notice={confirmation} dismiss={initialDismiss} />);
  elapse(2000);
  view.rerender(<ToastHost notice={confirmation} dismiss={latestDismiss} />);
  elapse(2999);
  expect(screen.getByRole('region', { name: 'Notifica temporanea' }).textContent).toContain(
    confirmation.message,
  );
  expect(initialDismiss).not.toHaveBeenCalled();
  expect(latestDismiss).not.toHaveBeenCalled();
  elapse(1);
  expect(initialDismiss).not.toHaveBeenCalled();
  expect(latestDismiss).toHaveBeenCalledTimes(1);
});

it.each(['warning', 'error'] as const)(
  'una conferma sostituita da %s non può chiudere automaticamente il messaggio critico',
  (tone) => {
    const dismiss = vi.fn();
    const view = render(<ToastHost notice={confirmation} dismiss={dismiss} />);
    elapse(2000);
    view.rerender(
      <ToastHost
        notice={{ id: 2, tone, message: 'Il salvataggio richiede ancora attenzione.' }}
        dismiss={dismiss}
      />,
    );
    elapse(60000);
    expect(dismiss).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Notifica temporanea' })).toBeNull();
  },
);

it('sospende il tempo con il puntatore sulla conferma e riprende soltanto il tempo residuo', () => {
  const dismiss = vi.fn();
  render(<ToastHost notice={confirmation} dismiss={dismiss} />);
  const region = screen.getByRole('region', { name: 'Notifica temporanea' });
  elapse(2000);
  fireEvent.pointerEnter(region);
  elapse(20000);
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.pointerLeave(region);
  elapse(2999);
  expect(dismiss).not.toHaveBeenCalled();
  elapse(1);
  expect(dismiss).toHaveBeenCalledTimes(1);
});

it('mantiene la conferma mentre un controllo contiene il focus e riprende quando il focus esce', () => {
  const dismiss = vi.fn();
  render(
    <>
      <button type="button">Continua a registrare</button>
      <ToastHost notice={confirmation} dismiss={dismiss} />
    </>,
  );
  const close = screen.getByRole('button', { name: 'Chiudi il messaggio' });
  elapse(1000);
  act(() => close.focus());
  elapse(20000);
  expect(document.activeElement).toBe(close);
  expect(dismiss).not.toHaveBeenCalled();
  act(() => screen.getByRole('button', { name: 'Continua a registrare' }).focus());
  elapse(3999);
  expect(dismiss).not.toHaveBeenCalled();
  elapse(1);
  expect(dismiss).toHaveBeenCalledTimes(1);
});

it('non consuma il tempo mentre la scheda è nascosta', () => {
  const dismiss = vi.fn();
  render(<ToastHost notice={confirmation} dismiss={dismiss} />);
  elapse(1500);
  hidden = true;
  fireEvent(document, new Event('visibilitychange'));
  elapse(20000);
  expect(dismiss).not.toHaveBeenCalled();
  hidden = false;
  fireEvent(document, new Event('visibilitychange'));
  elapse(3499);
  expect(dismiss).not.toHaveBeenCalled();
  elapse(1);
  expect(dismiss).toHaveBeenCalledTimes(1);
});

it('la scadenza della vecchia conferma non chiude una conferma arrivata successivamente', () => {
  const dismiss = vi.fn();
  const view = render(<ToastHost notice={confirmation} dismiss={dismiss} />);
  elapse(4900);
  view.rerender(
    <ToastHost
      notice={{ id: 2, tone: 'success', message: 'Seconda misura salvata sul dispositivo.' }}
      dismiss={dismiss}
    />,
  );
  elapse(100);
  expect(dismiss).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: 'Notifica temporanea' }).textContent).toContain(
    'Seconda misura salvata sul dispositivo.',
  );
  elapse(4899);
  expect(dismiss).not.toHaveBeenCalled();
  elapse(1);
  expect(dismiss).toHaveBeenCalledTimes(1);
});

function ConfirmationExample() {
  const [notice, setNotice] = useState<FeedbackNotice | null>(null);
  return (
    <>
      <button type="button" onClick={() => setNotice(confirmation)}>
        Salva misurazione
      </button>
      <ToastHost notice={notice} dismiss={() => setNotice(null)} />
    </>
  );
}

it('usa un annuncio stabile e la chiusura da tastiera restituisce il focus al comando precedente', async () => {
  // user-event deve drenare le proprie attese asincrone; qui verifichiamo la tastiera, non la scadenza.
  vi.useRealTimers();
  const user = userEvent.setup();
  render(<ConfirmationExample />);
  const announcement = screen.getByRole('status');
  const trigger = screen.getByRole('button', { name: 'Salva misurazione' });
  expect(announcement.textContent).toBe('');
  await user.tab();
  expect(document.activeElement).toBe(trigger);
  await user.keyboard('{Enter}');
  expect(screen.getByRole('status')).toBe(announcement);
  expect(announcement.textContent).toBe(confirmation.message);
  expect(screen.getAllByRole('status')).toHaveLength(1);
  const region = screen.getByRole('region', { name: 'Notifica temporanea' });
  await user.tab();
  expect(document.activeElement).toBe(
    within(region).getByRole('button', { name: 'Chiudi il messaggio' }),
  );
  await user.keyboard('{Enter}');
  expect(screen.queryByRole('region', { name: 'Notifica temporanea' })).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(screen.getByRole('status')).toBe(announcement);
  expect(announcement.textContent).toBe('');
});

it('una conferma smontata non lascia una scadenza capace di chiudere altri messaggi', () => {
  const dismiss = vi.fn();
  const view = render(<ToastHost notice={confirmation} dismiss={dismiss} />);
  elapse(2500);
  view.unmount();
  elapse(10000);
  expect(dismiss).not.toHaveBeenCalled();
});
