// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import type { Entity } from '@tr-lab/contracts';
import { ProgramPage } from '../../apps/web/src/pages/ProgramPage';
import { program } from '../helpers/fixtures';

const state = vi.hoisted(() => ({ entities: [] as Entity[], save: vi.fn(), notify: vi.fn() }));
vi.mock('../../apps/web/src/components/AppProvider', () => ({ useApp: () => state }));
afterEach(cleanup);

it('l’anteprima mostra accumulo e scarico senza modificare la scheda approvata', async () => {
  const p = program();
  p.status = 'approved';
  const day = p.days[0]!;
  const exercise = day.exercises[0]!;
  exercise.accumulation = true;
  exercise.targets = exercise.targets.slice(0, 3).map((t) => ({ ...t, kind: 'work', rir: 2 }));
  p.days = [{ ...day, exercises: [exercise] }];
  p.weeks = [
    { name: 'Base', phase: 'base', extraSets: 0, rir: null },
    { name: 'Accumulo', phase: 'accumulation', extraSets: 2, rir: 1 },
    { name: 'Scarico', phase: 'deload', extraSets: 3, rir: 4 },
  ];
  const before = structuredClone(p);
  state.entities = [{ id: p.id, kind: 'program', revision: '2', data: p }];
  state.save.mockClear();
  const user = userEvent.setup();
  render(<ProgramPage />);
  expect(screen.getAllByText(/· lavoro ·/)).toHaveLength(3);
  await user.selectOptions(screen.getByLabelText('Anteprima settimana'), '1');
  expect(screen.getAllByText(/· lavoro ·/)).toHaveLength(5);
  expect(screen.getAllByText(/RIR 1 ·/)).toHaveLength(5);
  await user.selectOptions(screen.getByLabelText('Anteprima settimana'), '2');
  expect(screen.getAllByText(/· lavoro ·/)).toHaveLength(2);
  expect(screen.getAllByText(/RIR 4 ·/)).toHaveLength(2);
  expect(p).toEqual(before);
  expect(state.save).not.toHaveBeenCalled();
});
