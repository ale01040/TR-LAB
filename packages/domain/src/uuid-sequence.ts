import { z } from 'zod';
export function uuidSequence(seed: string, existing: readonly string[] = []): () => string {
  z.uuid().parse(seed);
  const prefix = seed.slice(0, 14) + '8' + seed.slice(15, 24),
    used = new Set([seed, ...existing]);
  let counter = BigInt('0x' + seed.slice(24));
  // Allocatore deterministico di identità, non hash di sicurezza o credenziale.
  return () => {
    let id: string;
    do {
      counter = (counter + 1n) % (1n << 48n);
      id = prefix + counter.toString(16).padStart(12, '0');
    } while (used.has(id));
    used.add(id);
    return id;
  };
}
