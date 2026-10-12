// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import type { Program, Prescription } from '@tr-lab/contracts';
import { ProgramEditor } from '../../apps/web/src/components/ProgramEditor';
import { PrescriptionTargetsEditor } from '../../apps/web/src/components/PrescriptionTargetsEditor';
import { program } from '../helpers/fixtures';

afterEach(cleanup);
function Targets({
  value,
  limit = 30,
  commit,
}: {
  value: Prescription;
  limit?: number;
  commit: (p: Prescription) => void;
}) {
  const [p, setP] = useState(value);
  return (
    <PrescriptionTargetsEditor
      prescription={p}
      maxTargets={limit}
      onChange={(next) => {
        setP(next);
        commit(next);
      }}
    />
  );
}
function Editor({
  value,
  commit,
  busy = false,
}: {
  value: Program;
  commit: (p: Program) => void;
  busy?: boolean;
}) {
  const [p, setP] = useState(value);
  return (
    <ProgramEditor
      program={p}
      setProgram={(next) => {
        setP(next);
        commit(next);
      }}
      submit={() => undefined}
      error=""
      busy={busy}
    />
  );
}

it('modifica una sola serie, mantiene null/zero e non omogeneizza il file importato', async () => {
  const p = structuredClone(program().days[0]!.exercises[0]!);
  p.targets[0]!.loadGrams = null;
  p.targets[1]!.loadGrams = 17500;
  const before = structuredClone(p);
  const commit = vi.fn();
  const user = userEvent.setup();
  render(<Targets value={p} commit={commit} />);
  await user.click(screen.getByText(/Serie e target/));
  const first = within(screen.getByRole('group', { name: 'Serie 1' }));
  const load = first.getByLabelText(/Carico/);
  await user.type(load, '12,5');
  await user.tab();
  await user.clear(first.getByLabelText('RIR'));
  await user.type(first.getByLabelText('RIR'), '0');
  const after: Prescription = commit.mock.lastCall![0];
  expect(after.targets[0]).toMatchObject({ id: before.targets[0]!.id, loadGrams: 12500, rir: 0 });
  expect(after.targets.slice(1)).toEqual(before.targets.slice(1));
  expect(p).toEqual(before);
  await user.clear(load);
  await user.tab();
  expect(commit.mock.lastCall![0].targets[0].loadGrams).toBeNull();
});

it('gestisce lati, duplicazione e limite, proteggendo l’ultima serie di lavoro', async () => {
  const p = structuredClone(program().days[0]!.exercises[0]!);
  p.exercise.unilateral = true;
  p.targets = [{ ...p.targets[0]!, kind: 'work', side: 'both' }];
  const commit = vi.fn();
  const user = userEvent.setup();
  render(<Targets value={p} limit={2} commit={commit} />);
  await user.click(screen.getByText(/Serie e target/));
  const first = within(screen.getByRole('group', { name: 'Serie 1' }));
  expect(
    (first.getByRole('button', { name: 'Rimuovi serie 1' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(
    (
      within(first.getByLabelText('Tipo')).getByRole('option', {
        name: 'Extra',
      }) as HTMLOptionElement
    ).disabled,
  ).toBe(true);
  await user.selectOptions(first.getByLabelText('Lato'), 'left');
  await user.click(first.getByRole('button', { name: 'Duplica serie 1' }));
  const next: Prescription = commit.mock.lastCall![0];
  expect(next.targets[1]).toMatchObject({ side: 'left', kind: 'work' });
  expect(next.targets[1]!.id).not.toBe(next.targets[0]!.id);
  expect(
    (screen.getByRole('button', { name: 'Aggiungi riscaldamento' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  const second = within(screen.getByRole('group', { name: 'Serie 2' }));
  await user.selectOptions(second.getByLabelText('Tipo'), 'extra');
  expect(
    commit.mock.lastCall![0].targets.map((t: Prescription['targets'][number]) => t.kind),
  ).toEqual(['work', 'extra']);
  expect(
    (
      within(screen.getByRole('group', { name: 'Serie 1' })).getByRole('button', {
        name: 'Rimuovi serie 1',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

it('duplica e riordina una giornata mantenendo la copia selezionata', async () => {
  const p = program();
  const original = structuredClone(p);
  const commit = vi.fn();
  const user = userEvent.setup();
  render(<Editor value={p} commit={commit} />);
  await user.click(screen.getByRole('button', { name: 'Duplica giornata' }));
  const copyName = `${p.days[0]!.name} (copia)`;
  expect((screen.getByLabelText('Nome giornata') as HTMLInputElement).value).toBe(copyName);
  await user.click(screen.getByRole('button', { name: 'Sposta giornata dopo' }));
  expect((screen.getByLabelText('Nome giornata') as HTMLInputElement).value).toBe(copyName);
  expect(commit.mock.lastCall![0].days[2].name).toBe(copyName);
  expect(p).toEqual(original);
});

it('riserva gli slot del ciclo e li rende disponibili quando disattivi l’accumulo', async () => {
  const p = program();
  const day = p.days[0]!;
  const prescription = structuredClone(day.exercises[0]!);
  prescription.accumulation = true;
  prescription.targets = Array.from({ length: 27 }, () => ({
    ...prescription.targets[0]!,
    id: crypto.randomUUID(),
    kind: 'work' as const,
  }));
  p.days = [{ ...day, exercises: [prescription] }];
  p.weeks = [{ name: 'Accumulo', phase: 'accumulation', extraSets: 3, rir: null }];
  const user = userEvent.setup();
  render(<Editor value={p} commit={vi.fn()} />);
  await user.click(screen.getByText(/Serie e target/));
  const add = screen.getByRole('button', { name: 'Aggiungi serie di lavoro' }) as HTMLButtonElement;
  expect(add.disabled).toBe(true);
  await user.click(
    screen.getByRole('checkbox', {
      name: 'Aggiungi le serie previste nelle settimane di accumulo',
    }),
  );
  expect(add.disabled).toBe(false);
});

it('blocca campi durante salvataggio e non rende editabile una versione approvata', () => {
  const p = program();
  const commit = vi.fn();
  const { unmount } = render(<Editor value={p} commit={commit} busy />);
  expect(
    (screen.getByLabelText('Nome della scheda') as HTMLInputElement).matches(':disabled'),
  ).toBe(true);
  unmount();
  render(<Editor value={{ ...p, status: 'approved' }} commit={commit} />);
  expect(screen.queryByLabelText('Nome della scheda')).toBeNull();
  expect(screen.getByText(/Crea una nuova versione/)).toBeTruthy();
});
