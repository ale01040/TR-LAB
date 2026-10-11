import { expect, it } from 'vitest';
import { decrypt, encrypt, hash, readCursor, signCursor } from '../../apps/server/src/crypto';
it('SHA-3 con vettore noto, cifratura autenticata e nonce distinto', () => {
  expect(hash('')).toBe('a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a');
  const key = Buffer.alloc(32, 1);
  const a = encrypt('token', key);
  expect(encrypt('token', key)).not.toBe(a);
  expect(decrypt(a, key)).toBe('token');
  expect(() => decrypt(a, Buffer.alloc(32, 2))).toThrow();
});
it('cursore firmato legato all’account e bigint esatto', () => {
  const owner = crypto.randomUUID();
  const key = Buffer.alloc(32, 1);
  const cursor = {
    v: 1 as const,
    owner,
    epoch: crypto.randomUUID(),
    sequence: '9007199254740993',
    ceiling: null,
  };
  const signed = signCursor(cursor, key);
  expect(readCursor(signed, owner, key)).toEqual(cursor);
  expect(() => readCursor(signed, crypto.randomUUID(), key)).toThrow();
  expect(() => readCursor(signed + 'x', owner, key)).toThrow();
});
