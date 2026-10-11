// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import type { Entity } from '@tr-lab/contracts';
import { program } from '../helpers/fixtures';
import { AppProvider, useApp } from '../../apps/web/src/components/AppProvider';
import { db } from '../../apps/web/src/data/database';

const mock = vi.hoisted(() => ({ records: vi.fn(), api: vi.fn() }));
vi.mock('../../apps/web/src/data/database', async (original) => ({
  ...(await original<typeof import('../../apps/web/src/data/database')>()),
  records: mock.records,
}));
vi.mock('../../apps/web/src/data/sync', () => ({
  api: mock.api,
  setCsrf: vi.fn(),
  synchronize: vi.fn().mockResolvedValue(undefined),
}));

function Probe() {
  const { account, entities, refreshAuth } = useApp();
  return (
    <>
      <span>{account}</span>
      <button onClick={() => void refreshAuth()}>Cambia account</button>
      {entities.map((r) => (
        <p key={r.id}>{r.kind === 'program' ? r.data.name : ''}</p>
      ))}
    </>
  );
}
afterEach(async () => {
  cleanup();
  await db.delete();
  vi.clearAllMocks();
});
it('il cambio account nasconde subito i dati precedenti anche se la nuova lettura è lenta', async () => {
  const p = program();
  const privateData: Entity = {
    id: p.id,
    kind: 'program',
    revision: '1',
    data: { ...p, name: 'Privato del dispositivo' },
  };
  let finishRead!: (value: Entity[]) => void;
  const slow = new Promise<Entity[]>((resolve) => {
    finishRead = resolve;
  });
  mock.records.mockImplementation((account: string) =>
    account === 'device' ? Promise.resolve([privateData]) : slow,
  );
  const id = crypto.randomUUID();
  mock.api.mockResolvedValue({ configured: true, user: null });
  render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  );
  await screen.findByText('Privato del dispositivo');
  mock.api.mockResolvedValue({
    configured: true,
    user: {
      id,
      email: 'synthetic@example.org',
      sessionId: crypto.randomUUID(),
      csrf: 'synthetic-nonce',
      recovery: false,
    },
  });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Cambia account' }));
  await screen.findByText(id);
  expect(screen.queryByText('Privato del dispositivo')).toBeNull();
  finishRead([{ ...privateData, data: { ...p, name: 'Scheda del nuovo account' } }]);
  await waitFor(() => expect(screen.getByText('Scheda del nuovo account')).toBeTruthy());
});
