export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public retryAfterMs = 0,
  ) {
    super(code);
  }
}
let csrf: string | null = null;
export function setCsrf(value: string | null): void {
  csrf = value;
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  account?: string,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-TR-LAB': '1',
        ...(account ? { 'X-Account-ID': account } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const retry = response.headers.get('Retry-After');
      const delay =
        retry === null
          ? 0
          : /^\d+$/.test(retry)
            ? Number(retry) * 1000
            : Date.parse(retry) - Date.now();
      throw new ApiError(
        typeof result === 'object' && result !== null && 'code' in result
          ? String(result.code)
          : 'NETWORK_ERROR',
        response.status,
        Number.isFinite(delay) ? Math.max(0, Math.min(delay, 600000)) : 0,
      );
    }
    return result as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
