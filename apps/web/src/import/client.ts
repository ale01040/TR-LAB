import { z } from 'zod';
import { workbookSchema } from '@tr-lab/contracts';
const resultSchema = z
  .object({ workbook: workbookSchema, fileDigest: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export type XlsxResult = z.infer<typeof resultSchema>;
export async function importXlsx(file: File, signal: AbortSignal): Promise<XlsxResult> {
  if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 10 * 1024 * 1024)
    throw new Error('Scegli un file .xlsx fino a 10 MiB.');
  const buffer = await file.arrayBuffer();
  if (signal.aborted) throw new Error('Importazione annullata.');
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./xlsx.worker.ts', import.meta.url), { type: 'module' });
    const finish = (error?: Error, value?: XlsxResult) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      worker.terminate();
      if (error) reject(error);
      else if (value) resolve(value);
    };
    const abort = () => finish(new Error('Importazione annullata.'));
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event) => {
      try {
        const result: unknown = event.data;
        if (typeof result !== 'object' || result === null || !('ok' in result))
          throw new Error('Risposta del lettore non valida.');
        if (result.ok && 'workbook' in result && 'fileDigest' in result)
          finish(
            undefined,
            resultSchema.parse({ workbook: result.workbook, fileDigest: result.fileDigest }),
          );
        else
          finish(
            new Error('message' in result ? String(result.message) : 'Lettura Excel non riuscita.'),
          );
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Lettura Excel non riuscita.'));
      }
    };
    worker.onerror = () =>
      finish(new Error('Il lettore Excel non è disponibile. Riprova dopo aver aggiornato l’app.'));
    const timer = setTimeout(
      () => finish(new Error('Il file richiede troppo tempo. Riduci la dimensione del workbook.')),
      10000,
    );
    worker.postMessage({ buffer }, [buffer]);
  });
}
