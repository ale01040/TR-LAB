import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
import { revisionSchema } from '@tr-lab/contracts';
export const opaque = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha3-256').update(value).digest('hex');
export function encrypt(text: string, key: Buffer): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return [nonce, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.');
}
export function decrypt(text: string, key: Buffer): string {
  const [nonce, tag, data] = text.split('.');
  if (!nonce || !tag || !data) throw new Error('INVALID_CIPHERTEXT');
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'base64url'));
  cipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString(
    'utf8',
  );
}
const cursorSchema = z
  .object({
    v: z.literal(1),
    owner: z.uuid(),
    epoch: z.uuid(),
    sequence: revisionSchema,
    ceiling: revisionSchema.nullable(),
  })
  .strict();
export type Cursor = z.infer<typeof cursorSchema>;
export function signCursor(value: Cursor, key: Buffer): string {
  const data = Buffer.from(JSON.stringify(cursorSchema.parse(value))).toString('base64url');
  const mac = createHmac('sha3-256', key).update(`tr-lab-cursor-v1:${data}`).digest('base64url');
  return `${data}.${mac}`;
}
export function readCursor(value: string, owner: string, key: Buffer): Cursor {
  if (value.length > 2000) throw new Error('INVALID_CURSOR');
  const [data, mac, rest] = value.split('.');
  if (!data || !mac || rest) throw new Error('INVALID_CURSOR');
  const expected = createHmac('sha3-256', key).update(`tr-lab-cursor-v1:${data}`).digest();
  const supplied = Buffer.from(mac, 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied))
    throw new Error('INVALID_CURSOR');
  const cursor = cursorSchema.parse(JSON.parse(Buffer.from(data, 'base64url').toString('utf8')));
  if (cursor.owner !== owner) throw new Error('INVALID_CURSOR');
  return cursor;
}
