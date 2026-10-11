import { loadConfig } from '../apps/server/src/config';
try {
  const config = loadConfig();
  console.log(
    JSON.stringify(
      {
        valid: true,
        supabaseConfigured: !!config.DATABASE_URL,
        origin: config.APP_ORIGIN,
        environment: config.NODE_ENV,
      },
      null,
      2,
    ),
  );
} catch {
  // Gli errori di parsing potrebbero contenere input: il comando non stampa mai l'ambiente.
  console.error(
    'Configurazione incompleta o non valida. Controlla i valori con AVVIO_LOCALE.md; nessun segreto è stato stampato.',
  );
  process.exitCode = 1;
}
