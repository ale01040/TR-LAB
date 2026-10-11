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

**Verificato l'11 ottobre 2026:** l'endpoint del fallback della skill restituisce ora istruzioni per la CLI, senza previewUrl/claimUrl. Non considerarlo un deploy riuscito e non continuare a ripetere il POST. La descrizione della skill locale non è aggiornata rispetto a questo comportamento del servizio.

Se manca la CLI, usare quella ufficiale (versione verificata 63.1.2, Node >=20, compatibile con Node24), anche via `npx --yes vercel@63.1.2`. Prima leggere `whoami`, poi ispezionare esplicitamente il progetto dall'esatta directory del pacchetto. Login/consenso spettano al proprietario; non richiedere token in chat. Non lasciare che un monorepo scelga implicitamente un progetto diverso. Nuovo progetto soltanto nel contesto del deploy autorizzato, con proprietario/destinazione verificati.

Caricare **solo il pacchetto minimo**, mai la radice con file ignorati/personali. Nessun segreto nel bundle né credenziali in Git. Registrare l'esito dopo la risposta, senza equiparare comando avviato a deploy riuscito. [CLI ufficiale](https://vercel.com/docs/cli).

Mai token Vercel in comandi, chat o diario. Login/consenso spettano al proprietario. La CLI può generare `.env.local` con OIDC durante link: conservarlo soltanto nella directory ignorata, escluderlo dall'upload con `.vercelignore` e verificare l'elenco reale via `deploy --dry --json`. Il pacchetto preparato usa whitelist di public/api e due manifest; la prova corrente include 22 file ed esclude ambiente/metadati.

La CLI 63.1.2 espone anche `--temporary`, alternativa per un deploy temporaneo senza accesso. Qui è stato scelto l'account autenticato del proprietario, per gestione stabile e protezioni del suo workspace. Nessun Git deploy continuo è stato attivato. Verificare **sempre** target/alias del risultato: il primo caricamento nel nuovo progetto è stato autoassegnato a production dal servizio pur richiedendo preview; vedere §7, senza generalizzare la causa non ancora verificata.

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

## 7. Stato della consegna all'11 ottobre 2026

- Codice verificato caricato su main: `70c23a42d9cd34fc0d365840222ece81531812ad`. [CI Windows/Ubuntu superata](https://github.com/ale01040/TR-LAB/actions/runs/38161285628).
- Pacchetto effettivo CLI: 22 file (19 asset, API e due manifest), 4384466 byte; cinque prove HTTP locali superate sull'API CJS. SHA-256 funzione `e4e729f7d7669f108ea6ba04dc3f3783e1255930400e123f35e9faf8dbf81bf7`. Il tarball precedente da 866595 byte/hash `0d8714497c8dda42d9dae56c21d7ade1086b4fcb51a86c8206849baceb196559` era il tentativo diagnostico sul fallback, non il nuovo upload CLI dopo link.
- CLI 63.1.2 locale, installata fuori dalle dipendenze dell'app; build remota CLI62.7.0. Login completato dal proprietario, progetto `pere01040/tr-lab`, ID `prj_IpG5DKSPZX4Tn1yw90eAfILehujH`, Node24/Other. Nessun token, email o codice OAuth nel repository.
- **Preview pronta:** [apri TR LAB](https://tr-90s24efqi-pere01040.vercel.app), ID `dpl_BeG6cBSh9p2etjnGHgFzW8rHDS99`; `inspect --json` conferma `readyState: READY`, `target: preview`, API lambda `api/index` su `nodejs24.x`. [Gestione deployment](https://vercel.com/pere01040/tr-lab/BeG6cBSh9p2etjnGHgFzW8rHDS99). Nessuna richiesta manuale alle pagine dell'app per attestare un E2E remoto non eseguito.
- Primo deploy `dpl_4iQ9KFC3eVqHMQTFKgGEpuftsanp` era stato assegnato automaticamente a production, senza `--prod`. Ripubblicato in Preview; rimosso l'alias automatico `tr-lab.vercel.app` con esito confermato. Primo deployment conservato nella cronologia e ancora disponibile al proprio URL immutabile: non dichiarato cancellato o inesistente. Per una futura produzione serve un rilascio separato dopo i gate della roadmap.
- Deployment Protection Vercel mantenuta; può richiedere l'accesso al workspace. Applicazione in device-preview senza Supabase collegato, senza migrazioni o account dell'app attivati. Origine HTTPS distinta da localhost e dai due deployment: IndexedDB non migra automaticamente. Le prove provider e dispositivi reali restano aperte.

Per aggiornamenti successivi del pacchetto usare il progetto già verificato, leggere help della CLI corrente e ispezionare il risultato:

```powershell
npx --yes vercel@63.1.2 link --project tr-lab --scope pere01040 --yes --non-interactive --cwd <PACCHETTO>
npx --yes vercel@63.1.2 deploy --dry --json --target=preview --scope pere01040 --cwd <PACCHETTO>
npx --yes vercel@63.1.2 deploy --target=preview --project tr-lab --scope pere01040 --yes --json --cwd <PACCHETTO>
npx --yes vercel@63.1.2 inspect <URL_RESTITUITO> --json --scope pere01040 --cwd <PACCHETTO>
```

Sostituire i placeholder; verificare prima owner/progetto con `project inspect`. `--skip-domain` è riservato a production, non usarlo come correzione di una preview. Nessun `--prod` in questo flusso.
