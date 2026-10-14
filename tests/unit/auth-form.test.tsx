// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthForm } from '../../apps/web/src/components/AuthForm';
import { ApiError } from '../../apps/web/src/data/http';

const mock = vi.hoisted(() => ({
  api: vi.fn(),
  metadata: vi.fn(),
  refreshAuth: vi.fn(),
  notify: vi.fn(),
  logout: vi.fn(),
  googleAvailable: false,
}));
vi.mock('../../apps/web/src/data/http', async (original) => ({
  ...(await original<typeof import('../../apps/web/src/data/http')>()),
  api: mock.api,
}));
vi.mock('../../apps/web/src/data/database', () => ({ metadata: mock.metadata }));
vi.mock('../../apps/web/src/components/AppProvider', () => ({
  useApp: () => ({
    online: true,
    googleAvailable: mock.googleAvailable,
    loggingOut: false,
    refreshAuth: mock.refreshAuth,
    notify: mock.notify,
    logout: mock.logout,
  }),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mock.metadata.mockResolvedValue(null);
  mock.googleAvailable = false;
  mock.refreshAuth.mockResolvedValue(null);
});
it('Google non parte se la revoca del logout precedente è ancora pendente', async () => {
  mock.googleAvailable = true;
  mock.metadata.mockResolvedValue('synthetic-session-pending');
  mock.refreshAuth.mockRejectedValue(new Error('LOGOUT_PENDING'));
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Continua con Google' }));
  await screen.findByRole('alert');
  expect(mock.refreshAuth).toHaveBeenCalledTimes(1);
  expect(mock.api).not.toHaveBeenCalled();
});
function setup() {
  render(
    <MemoryRouter>
      <AuthForm />
    </MemoryRouter>,
  );
  return userEvent.setup();
}
it('errori locali e password diverse sono mostrati e non inviano richieste', async () => {
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Registrati' }));
  await user.type(screen.getByLabelText('Email (obbligatoria)'), 'incompleta');
  await user.type(screen.getByLabelText('Password (obbligatoria)'), 'frase-lunga-qa');
  await user.type(screen.getByLabelText('Ripeti la password (obbligatoria)'), 'altra-frase-qa');
  await user.click(screen.getByRole('button', { name: 'Crea account' }));
  expect(screen.getByRole('alert').textContent).toContain('Nessuna richiesta è stata inviata');
  expect(screen.getByText(/Le due password non coincidono/)).toBeTruthy();
  expect(screen.getByLabelText('Email (obbligatoria)').getAttribute('aria-invalid')).toBe('true');
  expect(mock.api).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Continua con Google' })).toBeNull();
});
it('un errore di accesso conserva email e password e permette di correggere', async () => {
  const user = setup();
  mock.api.mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 401));
  await user.type(screen.getByLabelText('Email (obbligatoria)'), 'synthetic@example.org');
  await user.type(screen.getByLabelText('Password (obbligatoria)'), 'synthetic-wrong-password');
  await user.click(
    within(screen.getByRole('form', { name: 'Accesso' })).getByRole('button', {
      name: 'Accedi',
    }),
  );
  await screen.findByText(/Non riesco ad accedere con questa email e password/);
  expect((screen.getByLabelText('Password (obbligatoria)') as HTMLInputElement).value).toBe(
    'synthetic-wrong-password',
  );
  expect(mock.notify).not.toHaveBeenCalled();
  expect(mock.refreshAuth).not.toHaveBeenCalled();
});
it('richiesta lenta e doppio clic: un solo invio e successo solo dopo verifica della sessione', async () => {
  const user = setup();
  let complete!: (value: { message: string }) => void;
  mock.api.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  mock.refreshAuth.mockResolvedValue({ id: 'synthetic-user', recovery: false });
  await user.type(screen.getByLabelText('Email (obbligatoria)'), 'synthetic@example.org');
  await user.type(screen.getByLabelText('Password (obbligatoria)'), 'synthetic-passphrase');
  await user.dblClick(
    within(screen.getByRole('form', { name: 'Accesso' })).getByRole('button', {
      name: 'Accedi',
    }),
  );
  await screen.findByText('Attendi l’esito. Non serve premere di nuovo il pulsante.');
  expect(mock.api).toHaveBeenCalledTimes(1);
  const passwordField = screen.getByLabelText('Password (obbligatoria)') as HTMLInputElement;
  await user.type(passwordField, 'ignored-edit');
  expect(passwordField.value).toBe('synthetic-passphrase');
  expect(mock.notify).not.toHaveBeenCalled();
  complete({ message: 'Accesso completato.' });
  await waitFor(() =>
    expect(mock.notify).toHaveBeenCalledWith(
      'Accesso verificato. Sei nel tuo account personale.',
      'success',
    ),
  );
});
it('HTTP 200 senza sessione verificata non dichiara accesso completato', async () => {
  const user = setup();
  mock.api.mockResolvedValue({ message: 'Accesso completato.' });
  await user.type(screen.getByLabelText('Email (obbligatoria)'), 'synthetic@example.org');
  await user.type(screen.getByLabelText('Password (obbligatoria)'), 'synthetic-passphrase');
  await user.click(
    within(screen.getByRole('form', { name: 'Accesso' })).getByRole('button', {
      name: 'Accedi',
    }),
  );
  await screen.findByText('Accesso da verificare');
  expect(mock.notify).not.toHaveBeenCalled();
});
it('registrazione: la ripetizione resta nel browser e la risposta non garantisce consegna email', async () => {
  const user = setup();
  mock.api.mockResolvedValue({
    message: 'Se la registrazione è possibile, riceverai le istruzioni via email.',
  });
  await user.click(screen.getByRole('button', { name: 'Registrati' }));
  await user.type(screen.getByLabelText('Email (obbligatoria)'), 'synthetic@example.org');
  await user.type(screen.getByLabelText('Password (obbligatoria)'), 'synthetic-passphrase');
  await user.type(
    screen.getByLabelText('Ripeti la password (obbligatoria)'),
    'synthetic-passphrase',
  );
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Crea account' }));
  await screen.findByText('Controlla la tua email');
  expect(mock.api).toHaveBeenCalledWith('/auth/signup', 'POST', {
    email: 'synthetic@example.org',
    password: 'synthetic-passphrase',
    adults: true,
  });
  expect(mock.notify).not.toHaveBeenCalled();
});
