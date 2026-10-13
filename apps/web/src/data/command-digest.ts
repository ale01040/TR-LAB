import { type Command } from '@tr-lab/contracts';
import { canonicalJson } from '@tr-lab/domain';
export async function textDigest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
export async function commandDigest(command: Command): Promise<string> {
  return textDigest(`tr-lab-jcs-1:${canonicalJson(command)}`);
}
