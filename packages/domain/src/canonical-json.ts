export function canonicalJson(value: unknown): string {
  if (typeof value === 'string') {
    assertUnicode(value);
    return JSON.stringify(value);
  }
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype)
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => {
          assertUnicode(key);
          return JSON.stringify(key) + ':' + canonicalJson((value as Record<string, unknown>)[key]);
        })
        .join(',') +
      '}'
    );
  throw new Error('Il fingerprint richiede valori JSON finiti, senza undefined.');
}
function assertUnicode(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new Error('Unicode non valido nel fingerprint.');
    } else if (code >= 0xdc00 && code <= 0xdfff)
      throw new Error('Unicode non valido nel fingerprint.');
  }
}
