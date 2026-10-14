export const AUTH_PASSWORD_MIN_CHARACTERS = 12;
export const AUTH_PASSWORD_MAX_BYTES = 72;

/** Stessa misura nei form e nel server; niente trim, normalizzazione o troncamento. */
export function authPasswordRequirements(password: string) {
  const characters = Array.from(password).length;
  const bytes = new TextEncoder().encode(password).byteLength;
  return {
    characters,
    bytes,
    minimumMet: characters >= AUTH_PASSWORD_MIN_CHARACTERS,
    maximumMet: bytes <= AUTH_PASSWORD_MAX_BYTES,
    valid: characters >= AUTH_PASSWORD_MIN_CHARACTERS && bytes <= AUTH_PASSWORD_MAX_BYTES,
  };
}
