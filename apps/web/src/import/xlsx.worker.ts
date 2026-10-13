/// <reference lib="webworker" />
import { readWorkbook } from './xlsx-reader';
declare const self: DedicatedWorkerGlobalScope;
self.onmessage = async (event: MessageEvent<unknown>) => {
  const input = event.data;
  if (
    typeof input !== 'object' ||
    input === null ||
    !('buffer' in input) ||
    !(input.buffer instanceof ArrayBuffer)
  )
    return;
  try {
    const digest = await crypto.subtle.digest('SHA-256', input.buffer);
    const fileDigest = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
    self.postMessage({
      ok: true,
      workbook: readWorkbook(new Uint8Array(input.buffer)),
      fileDigest,
    });
  } catch (error) {
    self.postMessage({
      ok: false,
      message: error instanceof Error ? error.message : 'Lettura Excel non riuscita.',
    });
  }
};
