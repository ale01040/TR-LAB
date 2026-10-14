// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../../apps/web/src/App';
import { AppProvider } from '../../apps/web/src/components/AppProvider';
import { db, metadata } from '../../apps/web/src/data/database';

const mock = vi.hoisted(() => ({
  api: vi.fn(),
  records: vi.fn(),
  sync: vi.fn(),
  signed: false,
  failLogout: false,
}));
vi.mock('../../apps/web/src/data/http', async (original) => ({
  ...(await original<typeof import('../../apps/web/src/data/http')>()),
  api: mock.api,
}));
vi.mock('../../apps/web/src/data/sync', () => ({
  api: mock.api,
  setCsrf: vi.fn(),
  synchronize: mock.sync,
}));
vi.mock('../../apps/web/src/data/database', async (original) => ({
  ...(await original<typeof import('../../apps/web/src/data/database')>()),
  records: mock.records,
}));
const account = {
  id: '00000000-0000-4000-8000-00000000000a',
  email: 'synthetic@example.org',
  sessionId: '00000000-0000-4000-8000-00000000000b',
  csrf: 'synthetic-nonce',
  recovery: false,
};
beforeEach(async () => {
  await db.open();
  vi.resetAllMocks();
  mock.signed = false;
  mock.failLogout = false;
  mock.records.mockResolvedValue([]);
  mock.sync.mockResolvedValue(undefined);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  mock.api.mockImplementation(async (path: string) => {
    if (path === '/auth/session')
      return { configured: true, providers: { google: false }, user: mock.signed ? account : null };
    if (path === '/auth/login') {
      mock.signed = true;
      return { message: 'Accesso completato.' };
    }
    if (path === '/auth/logout') {
      if (mock.failLogout) throw new Error('NETWORK_ERROR');
      mock.signed = false;
      return { message: 'Uscita completata.' };
    }
    throw new Error('Unexpected test request');
  });
});
afterEach(async () => {
  cleanup();
  await db.delete();
  vi.restoreAllMocks();
});
async function login() {
  render(
    <MemoryRouter initialEntries={['/profilo']}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await screen.findByRole('form', { name: 'Accesso' });
  await user.type(screen.getByLabelText('Email (obbligatoria)'), 'synthetic@example.org');
  await user.type(screen.getByLabelText('Password (obbligatoria)'), 'synthetic-test-passphrase');
  await user.click(
    within(screen.getByRole('form', { name: 'Accesso' })).getByRole('button', {
      name: 'Accedi',
    }),
  );
  await screen.findByRole('region', { name: 'Notifica temporanea' });
  expect(
    within(screen.getByRole('region', { name: 'Notifica temporanea' })).getByText(
      'Accesso verificato. Sei nel tuo account personale.',
    ),
  ).toBeTruthy();
  return user;
}
it('conferme di accesso e uscita sopravvivono al remount del contenuto per account', async () => {
  const user = await login();
  expect(screen.getByText('synthetic@example.org')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Esci da questo dispositivo' }));
  await user.click(screen.getByRole('button', { name: 'Resta nel tuo account' }));
  expect(screen.getByText('synthetic@example.org')).toBeTruthy();
  expect(mock.api.mock.calls.filter((call) => call[0] === '/auth/logout')).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Esci da questo dispositivo' }));
  await user.click(screen.getByRole('button', { name: 'Esci conservando i dati' }));
  await waitFor(() =>
    expect(
      within(screen.getByRole('region', { name: 'Notifica temporanea' })).getByText(
        'Uscita completata. I tuoi dati restano conservati per il prossimo accesso.',
      ),
    ).toBeTruthy(),
  );
  expect(screen.queryByText('synthetic@example.org')).toBeNull();
  expect(await metadata('logout-pending')).toBeNull();
});
it('cache dell’account non scrivibile: accesso valido e avviso offline restano visibili insieme', async () => {
  const put = db.meta.put.bind(db.meta);
  vi.spyOn(db.meta, 'put').mockImplementation((value, key) => {
    if (value.key === 'last-user')
      return Promise.reject(new Error('Synthetic cache full')) as ReturnType<typeof db.meta.put>;
    return put(value, key);
  });
  await login();
  await screen.findByText('Memoria locale dell’account non aggiornata');
  expect(screen.getByText('synthetic@example.org')).toBeTruthy();
  expect(await metadata('last-user')).toBeNull();
});
it('uscita con server non raggiungibile è locale e non dichiara revoca remota completata', async () => {
  const user = await login();
  mock.failLogout = true;
  await user.click(screen.getByRole('button', { name: 'Esci da questo dispositivo' }));
  await user.click(screen.getByRole('button', { name: 'Esci conservando i dati' }));
  await screen.findByText(/Uscita completata sul dispositivo/);
  expect(await metadata('logout-pending')).toBe(account.sessionId);
  expect(screen.queryByText('synthetic@example.org')).toBeNull();
  expect(
    screen.queryByText(
      'Uscita completata. I tuoi dati restano conservati per il prossimo accesso.',
    ),
  ).toBeNull();
});
it('intenzione di uscita non persistita: account conservato e errore visibile dopo la chiusura del dialogo', async () => {
  const user = await login();
  vi.spyOn(db.meta, 'put').mockRejectedValueOnce(new Error('Synthetic storage failure'));
  await user.click(screen.getByRole('button', { name: 'Esci da questo dispositivo' }));
  await user.click(screen.getByRole('button', { name: 'Esci conservando i dati' }));
  await screen.findByText(/Sei ancora nel tuo account/);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('synthetic@example.org')).toBeTruthy();
  expect(mock.api.mock.calls.filter((call) => call[0] === '/auth/logout')).toHaveLength(0);
});
it('sync manuale fallita mostra un rimedio e non un falso completamento', async () => {
  const user = await login();
  mock.sync.mockRejectedValue(new Error('SYNC_UNAVAILABLE'));
  await waitFor(() =>
    expect(
      within(screen.getByRole('main'))
        .getByRole('button', { name: 'Sincronizza adesso' })
        .hasAttribute('disabled'),
    ).toBe(false),
  );
  await user.click(
    within(screen.getByRole('main')).getByRole('button', { name: 'Sincronizza adesso' }),
  );
  await screen.findByText(/La sincronizzazione non è disponibile/);
  expect(
    screen.queryByText('Dati aggiornati. Nessuna modifica in attesa di sincronizzazione.'),
  ).toBeNull();
});
