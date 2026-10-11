# TR LAB — deploy Vercel

11 ottobre 2026 · Preview dell'alpha 0.1.0 richiesta dal committente dopo il collaudo. Permette di provare il percorso locale; non apre la beta con account.

## 1. Contenuto e limiti

Frontend React/Vite/PWA su CDN e stessa API Fastify in una funzione Node 24. Asset e codice sono pubblici; dati utente, vault, Excel personale e credenziali non entrano nel pacchetto. Diario, misure e bozze restano in IndexedDB.

La prima preview usa `DEPLOYMENT_MODE=device-preview`: nessuna credenziale cloud ammessa, sessione anonima dichiarata, login e sincronizzazione disattivati. Il Profilo spiega i limiti e offre export. Telefono/PC e localhost/Vercel hanno archivi distinti. Il JSON standard copia le schede; il backup di recupero contiene dati personali e non va condiviso.

## 2. Scelte e alternative

| Scelta | Vantaggio | Limite / alternativa |
| --- | --- | --- |
| CDN asset e singola funzione API | Asset rapidi, stesso Origin e BFF | Cold start e limiti piattaforma; server persistente valido per futuri worker |
| Fastify già implementato | Riusa sessioni HttpOnly, contratti e test | Pool DB/rate limiter per istanza da adattare prima della beta |
| Preview senza cloud | Deploy utile senza database non verificato | Nessun account/sync finché non si chiudono F2–F3/F5 |
| Bundle CJS + asset verificati | Niente moduli Windows/documenti; prova HTTP del file distribuito | Nuovo pacchetto/deploy dopo ogni build, CI deploy ancora da attivare |

L'adapter usa `ready()` e `server.emit('request', ...)`, separando factory e server locale. Origine CSRF da `APP_ORIGIN` o `VERCEL_URL` della piattaforma, mai da Host. Nessuna riscrittura Next.js né JWT browser. [Fastify serverless](https://fastify.dev/docs/latest/Guides/Serverless/), [Fastify Vercel](https://vercel.com/docs/frameworks/backend/fastify), [Node supportato](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 3. Preparazione riproducibile

Dalla radice:

```powershell
npm ci
npm run check
npm run format:check
node scripts/prepare-vercel-preview.mjs
```

L'ultimo comando stampa una nuova directory `.analysis/vercel-preview-<timestamp>`; non elimina pacchetti precedenti. Contiene `public/`, funzione `api/index.js` CommonJS, manifest/config e inventario SHA-256. Copia solo estensioni ammesse; rifiuta file inattesi. Nessuna lettura `.env`.

Collaudare il percorso stampato:

```powershell
node scripts/check-vercel-preview.mjs .analysis/vercel-preview-<timestamp>
```

Cinque prove HTTP locale su porta effimera: sessione anonima no-store, CSRF 403, login indisponibile 503, sync anonima 401 e API ignota 404. Il controllo svuota le variabili cloud nel proprio processo; non modifica file ambiente o impostazioni PC.

## 4. Caricamento e proprietà

Con CLI autenticata verificare team/progetto e scegliere Preview. Il repository offre `vercel.json` e `api/index.ts`; build con Node/npm previsti dal progetto. Il pacchetto compilato evita strumenti diversi nella build remota. Non usare `--prod` per questa anteprima.

Se la CLI manca, la skill Vercel Deploy offre il servizio rivendicabile. Caricare **solo il pacchetto minimo**, mai la radice con file ignorati/personali. Consegnare il link di gestione al proprietario senza pubblicarlo nel repository: permette di rivendicare il deployment. Registrare l'esito dopo la risposta, senza equiparare comando avviato a deploy riuscito.

Mai token Vercel in comandi, chat o diario. Login/consenso spettano al proprietario. La preview non abilita automaticamente Git deploy continui e non assegna un dominio produzione.

## 5. Routing, cache e aggiornamenti

API alla funzione, pagine SPA al documento; asset/worker/manifest mancanti non devono diventare HTML. CSP/noindex anche sugli asset. Asset con hash cache lunga, HTML/worker rivalidati, API no-store. Mai risposte personali nella CDN.

La PWA propone aggiornamento con clic esplicito dopo aver salvato i campi. Conservare la stessa origine per la beta: cambiare dominio non migra IndexedDB. Installazione telefoni, modalità aereo, asset di vecchie release ed eviction richiedono ancora prove reali.

## 6. Prima degli account

1. Supabase staging isolato secondo [AVVIO_LOCALE](AVVIO_LOCALE.md). Nessuna migrazione automatica dal deploy.
2. `DEPLOYMENT_MODE=connected`, quattro valori Supabase/sessione protetti, APP_ORIGIN HTTPS esatta e callback email/Google per dominio stabile. Nessun segreto frontend.
3. Pooler/ruolo runtime limitato, connessioni per istanza, regione vicina al DB, limiti globali/WAF, cleanup sessioni, log depurati, backup/restore provato. Non copiare alla cieca il pool persistente locale in serverless.
4. Auth/rinnovi/CSRF/recovery, due account/dispositivi, RLS/RPC reale, perdita risposta, conflitti ed epoch: PGlite e bundle non sostituiscono questi gate.
5. Privacy/cancellazione/export, accessibilità e dispositivi secondo roadmap; poi produzione separata e reversibile.

Registrare URL, ambiente, commit codice, hash artefatti, stato e prove effettive. Non chiamare «senza bug» o «produzione pronta» la sola preview.
