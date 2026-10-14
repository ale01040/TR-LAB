import { expect, it } from 'vitest';
import { authPasswordRequirements } from '@tr-lab/contracts';

it('confini della passphrase: dodici caratteri e massimo 72 byte, senza troncamento', () => {
  expect(authPasswordRequirements('a'.repeat(11)).valid).toBe(false);
  expect(authPasswordRequirements('a'.repeat(12)).valid).toBe(true);
  expect(authPasswordRequirements('a'.repeat(72))).toMatchObject({ valid: true, bytes: 72 });
  expect(authPasswordRequirements('a'.repeat(73))).toMatchObject({ valid: false, bytes: 73 });
});
it('Unicode non confonde unità UTF-16 con caratteri e rispetta il limite UTF-8', () => {
  expect(authPasswordRequirements('🔐'.repeat(6))).toMatchObject({
    characters: 6,
    bytes: 24,
    valid: false,
  });
  expect(authPasswordRequirements('🔐'.repeat(12))).toMatchObject({
    characters: 12,
    bytes: 48,
    valid: true,
  });
  expect(authPasswordRequirements('🔐'.repeat(19))).toMatchObject({
    characters: 19,
    bytes: 76,
    valid: false,
  });
  expect(authPasswordRequirements('  abcdefghij  ')).toMatchObject({
    characters: 14,
    bytes: 14,
    valid: true,
  });
});
