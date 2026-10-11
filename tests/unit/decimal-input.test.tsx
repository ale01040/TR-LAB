// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { DecimalInput } from '../../apps/web/src/components/DecimalInput';
afterEach(cleanup);
it('typing italiano non perde il separatore intermedio e preserva 12,5 kg', async () => {
  const commit = vi.fn();
  const user = userEvent.setup();
  render(
    <label>
      Carico
      <DecimalInput value={null} scale={1000} onValue={commit} />
    </label>,
  );
  const input = screen.getByLabelText('Carico');
  await user.type(input, '12,5');
  await user.tab();
  expect((input as HTMLInputElement).value).toBe('12,5');
  expect(commit).toHaveBeenLastCalledWith(12500);
});
it('zero valido, dato invalido visibile e required senza valore non sono sostituiti', async () => {
  const commit = vi.fn();
  const user = userEvent.setup();
  render(
    <label>
      RIR
      <DecimalInput value={null} max={10} required onValue={commit} />
    </label>,
  );
  const input = screen.getByLabelText('RIR') as HTMLInputElement;
  await user.type(input, '0');
  expect(commit).toHaveBeenLastCalledWith(0);
  await user.clear(input);
  await user.type(input, 'abc');
  await user.tab();
  expect(input.value).toBe('abc');
  expect(input.checkValidity()).toBe(false);
  expect(commit).toHaveBeenLastCalledWith(0);
});
it('Invio con separatore finale non salva un valore precedente apparentemente valido', async () => {
  const submitted = vi.fn((event: React.FormEvent) => event.preventDefault());
  const user = userEvent.setup();
  render(
    <form onSubmit={submitted}>
      <label>
        Carico
        <DecimalInput value={null} onValue={() => undefined} />
      </label>
      <button type="submit">Salva</button>
    </form>,
  );
  const input = screen.getByLabelText('Carico') as HTMLInputElement;
  await user.type(input, '12,');
  await user.keyboard('{Enter}');
  expect(input.value).toBe('12,');
  expect(input.checkValidity()).toBe(false);
  expect(submitted).not.toHaveBeenCalled();
});
