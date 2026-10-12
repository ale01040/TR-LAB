// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Entity } from '@tr-lab/contracts';
import { program, session } from '../helpers/fixtures';
import { WorkoutPage } from '../../apps/web/src/pages/WorkoutPage';

const app = vi.hoisted(() => ({
  entities: [] as Entity[],
  account: 'device',
  save: vi.fn(),
  notify: vi.fn(),
}));
const db = vi.hoisted(() => ({ metadata: vi.fn(), setMetadata: vi.fn() }));
vi.mock('../../apps/web/src/components/AppProvider', () => ({ useApp: () => app }));
vi.mock('../../apps/web/src/data/database', () => db);
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  app.save.mockResolvedValue(undefined);
  db.metadata.mockResolvedValue(null);
  db.setMetadata.mockResolvedValue(undefined);
});
function renderWorkout() {
  const p = structuredClone(program());
  const day = p.days[0]!;
  const exercise = day.exercises[0]!;
  exercise.exercise.unilateral = false;
  exercise.targets = [{ ...exercise.targets[0]!, kind: 'work', restSeconds: 90 }];
  p.days = [{ ...day, exercises: [exercise] }];
  p.weeks = [{ name: 'Base', phase: 'base', extraSets: 0, rir: null }];
  const s = session(p);
  app.entities = [{ id: s.id, kind: 'session', revision: '0', data: s }];
  render(
    <MemoryRouter initialEntries={[`/seduta/${s.id}`]}>
      <Routes>
        <Route path="/seduta/:id" element={<WorkoutPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}
async function saveOneSet(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByLabelText('Serie 1, carico in kg'));
  await user.type(screen.getByLabelText('Serie 1, carico in kg'), '12,5');
  await user.type(screen.getByLabelText('Serie 1, ripetizioni'), '8');
  await user.type(screen.getByLabelText('Serie 1, RIR'), '0');
  await user.click(screen.getByRole('button', { name: 'Salva Serie 1' }));
}
it('distingue una serie salvata dal successivo fallimento del timer', async () => {
  db.setMetadata.mockRejectedValue(new Error('Timer non scrivibile'));
  const user = renderWorkout();
  await saveOneSet(user);
  await waitFor(() => expect(app.save).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(app.notify).toHaveBeenCalledWith(expect.stringMatching(/Serie salvata.*timer/i)),
  );
  expect(app.save.mock.lastCall![1].data).toMatchObject({ loadGrams: 12500, reps: 8, rir: 0 });
  expect(screen.queryByRole('alert')).toBeNull();
});
it('un salvataggio fallito conserva i dati e non dichiara successo né avvia il timer', async () => {
  app.save.mockRejectedValue(new Error('Salvataggio locale non disponibile'));
  const user = renderWorkout();
  await saveOneSet(user);
  expect((await screen.findByRole('alert')).textContent).toBe('Salvataggio locale non disponibile');
  expect((screen.getByLabelText('Serie 1, carico in kg') as HTMLInputElement).value).toBe('12,5');
  expect(db.setMetadata).not.toHaveBeenCalled();
  expect(app.notify).not.toHaveBeenCalled();
});
it('gestisce il ripristino indisponibile del timer senza impedire il diario', async () => {
  db.metadata.mockRejectedValue(new Error('Timer non leggibile'));
  renderWorkout();
  await waitFor(() =>
    expect(app.notify).toHaveBeenCalledWith(expect.stringMatching(/timer.*manual/i)),
  );
  expect(screen.getByRole('button', { name: 'Salva Serie 1' })).toBeTruthy();
  expect(screen.queryByRole('timer')).toBeNull();
});
it('chiude il timer anche se il suo stato non può essere salvato, avvisando del limite', async () => {
  db.metadata.mockResolvedValue(String(Date.now() + 90000));
  db.setMetadata.mockRejectedValue(new Error('Timer non scrivibile'));
  const user = renderWorkout();
  await screen.findByRole('timer');
  await user.click(screen.getByRole('button', { name: 'Chiudi timer' }));
  await waitFor(() =>
    expect(app.notify).toHaveBeenCalledWith(expect.stringMatching(/Timer chiuso.*riapertura/i)),
  );
  expect(screen.queryByRole('timer')).toBeNull();
  expect(db.setMetadata).toHaveBeenCalledWith(expect.stringMatching(/^device:timer:/), '0');
});
