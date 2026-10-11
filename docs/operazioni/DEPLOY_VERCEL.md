# TR LAB — deploy Vercel

11 ottobre 2026 · Alpha 0.1.0. Preview HTTPS collegata a Supabase; conserva anche la procedura della precedente preview dispositivo. Il collegamento verificato non chiude i gate per la registrazione pubblica.

## 1. Contenuto e limiti

Frontend React/Vite/PWA su CDN e stessa API Fastify in una funzione Node 24. Asset e codice sono pubblici; dati utente, vault, Excel personale e credenziali non entrano nel pacchetto. Diario, misure e bozze restano in IndexedDB.

La prima preview usa `DEPLOYMENT_MODE=device-preview`: nessuna credenziale cloud ammessa, sessione anonima dichiarata, login e sincronizzazione disattivati. La preview corrente usa `DEPLOYMENT_MODE=connected`: BFF, session store privato, SDK Supabase e ruolo DB limitato sono collegati. Il provider richiede conferma email; SMTP e OAuth non sono configurati dal deploy. Telefono/PC e localhost/Vercel hanno archivi distinti. Il JSON standard copia le schede; il backup di recupero contiene dati personali e non va condiviso.

## 2. Scelte e alternative

| Scelta | Vantaggio | Limite / alternativa |
| --- | --- | --- |
| CDN asset e singola funzione API | Asset rapidi, stesso Origin e BFF | Cold start e limiti piattaforma; server persistente valido per futuri worker |
| Fastify già implementato | Riusa sessioni HttpOnly, contratti e test; pool serverless max2 con attachDatabasePool | Rate limiter globale, lease refresh e capacità da collaudare prima della beta |
| Modalità dispositivo / collegata | Prima prova senza provider; seconda con ruolo limitato e readiness reale | La connessione non dimostra Auth positivo, SMTP o offline su due device |
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

L'ultimo comando prepara device-preview. Per la modalità collegata usare `node scripts/prepare-vercel-preview.mjs connected`. Entrambi stampano una nuova directory `.analysis/vercel-preview-<timestamp>`, senza eliminare pacchetti precedenti. Contiene `public/`, funzione `api/index.js` CommonJS, manifest/config e inventario SHA-256. Copia solo estensioni ammesse; rifiuta file inattesi. Nessuna lettura `.env`.

Collaudare il percorso stampato:

```powershell
node scripts/check-vercel-preview.mjs .analysis/vercel-preview-<timestamp>
```

Cinque prove HTTP locale su porta effimera: sessione anonima no-store, CSRF 403, login indisponibile 503, sync anonima 401 e API ignota 404. Il controllo svuota le variabili cloud nel proprio processo; non modifica file ambiente o impostazioni PC.

Questo script verifica soltanto device-preview e non deve essere descritto come un test connected. Per connected configurare i valori nel processo di prova protetto, verificare `/api/ready`, sessione anonima, login errato, sync401 e CSRF403; non inserire credenziali negli argomenti o negli esempi pubblici. Le cinque prove connected correnti sono registrate nel [rapporto](../qualita/INTEGRAZIONE_SUPABASE.md#5-prove-effettive-e-limiti).

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

## 6. Prima della beta pubblica

1. Supabase staging isolato secondo [AVVIO_LOCALE](AVVIO_LOCALE.md). Nessuna migrazione automatica dal deploy.
2. `DEPLOYMENT_MODE=connected`, valori Supabase/sessione e CA configurati, APP_ORIGIN HTTPS esatta e callback email/Google per dominio stabile. Nessun segreto frontend. La preview corrente è collegata al progetto fornito, senza staging separato: documentare e risolvere questa differenza prima della produzione.
3. Pooler/ruolo runtime limitato, connessioni per istanza, regione vicina al DB, limiti globali/WAF, cleanup sessioni, log depurati, backup/restore provato. Non copiare alla cieca il pool persistente locale in serverless.
4. Auth/rinnovi/CSRF/recovery, due account/dispositivi, RLS/RPC reale, perdita risposta, conflitti ed epoch: PGlite e bundle non sostituiscono questi gate.
5. Privacy/cancellazione/export, accessibilità e dispositivi secondo roadmap; poi produzione separata e reversibile.

Registrare URL, ambiente, commit codice, hash artefatti, stato e prove effettive. Non chiamare «senza bug» o «produzione pronta» la sola preview.

## 7. Cronologia: prima preview dispositivo

- Codice verificato caricato su main: `70c23a42d9cd34fc0d365840222ece81531812ad`. [CI Windows/Ubuntu superata](https://github.com/ale01040/TR-LAB/actions/runs/38161285628).
- Pacchetto effettivo CLI: 22 file (19 asset, API e due manifest), 4384466 byte; cinque prove HTTP locali superate sull'API CJS. SHA-256 funzione `e4e729f7d7669f108ea6ba04dc3f3783e1255930400e123f35e9faf8dbf81bf7`. Il tarball precedente da 866595 byte/hash `0d8714497c8dda42d9dae56c21d7ade1086b4fcb51a86c8206849baceb196559` era il tentativo diagnostico sul fallback, non il nuovo upload CLI dopo link.
- CLI 63.1.2 locale, installata fuori dalle dipendenze dell'app; build remota CLI62.7.0. Login completato dal proprietario, progetto `pere01040/tr-lab`, ID `prj_IpG5DKSPZX4Tn1yw90eAfILehujH`, Node24/Other. Nessun token, email o codice OAuth nel repository.
- **Prima preview dispositivo pronta:** [deployment precedente](https://tr-90s24efqi-pere01040.vercel.app), ID `dpl_BeG6cBSh9p2etjnGHgFzW8rHDS99`; `inspect --json` conferma `readyState: READY`, `target: preview`, API lambda `api/index` su `nodejs24.x`. [Gestione deployment](https://vercel.com/pere01040/tr-lab/BeG6cBSh9p2etjnGHgFzW8rHDS99). In quella consegna non erano stati eseguiti E2E remoti.
- Primo deploy `dpl_4iQ9KFC3eVqHMQTFKgGEpuftsanp` era stato assegnato automaticamente a production, senza `--prod`. Ripubblicato in Preview; rimosso l'alias automatico `tr-lab.vercel.app` con esito confermato. Primo deployment conservato nella cronologia e ancora disponibile al proprio URL immutabile: non dichiarato cancellato o inesistente. Per una futura produzione serve un rilascio separato dopo i gate della roadmap.
- Deployment Protection Vercel mantenuta; può richiedere l'accesso al workspace. Applicazione in device-preview senza Supabase collegato, senza migrazioni o account dell'app attivati. Origine HTTPS distinta da localhost e dai due deployment: IndexedDB non migra automaticamente. Le prove provider e dispositivi reali restano aperte.

## 8. Preview collegata corrente e aggiornamento

- [TR LAB corrente](https://tr-9lstvuhyr-pere01040.vercel.app), ID `dpl_5aAmQLu4M6jrN4tDFuYUJr7aEVva`: READY e target preview verificati, Deployment Protection mantenuta. [Gestione deployment](https://vercel.com/pere01040/tr-lab/5aAmQLu4M6jrN4tDFuYUJr7aEVva).
- Upload di 22 file, 4437560 byte; funzione SHA-256 `61ffdf587b1c88ee02682beaeeddec396f7f80af8dc939ffeb3c4b414963f427`. Scanner con i valori privati effettivi non ha trovato password DB, connection string o chiave sessioni nel pacchetto.
- Node24, configurazione funzione dub1/max60 s; pool max2/idle5 s, attachDatabasePool e CA pubblica con TLS verificato. Backend via transaction pooler6543, ruolo tr_lab_runtime. Nessuna credenziale amministrativa.
- Undici controlli reali via CLI protetta superati: health/ready/sessione, sync anonima401, API404, SPA200, asset mancante404, worker200/no-cache, CSRF403, login errato401, Google disabilitato503. Non costituiscono conferma di registrazione/login riusciti.
- Email con conferma richiesta; Google disabilitato esplicitamente. Completare [callback/account/SMTP](COMPLETARE_AUTH.md) e registrare le prove positive prima della beta.

Variabili presenti **soltanto in Preview**, progetto `pere01040/tr-lab` già verificato:

| Nome | Tipo | Contenuto / confine |
| --- | --- | --- |
| SUPABASE_URL | Config | URL pubblico del progetto |
| SUPABASE_PUBLISHABLE_KEY | Config | Chiave pubblicabile, non service/secret key |
| DATABASE_CA_CERT_BASE64 | Config | Certificato CA pubblico PEM in base64 |
| DATABASE_URL | Secret | Connessione del ruolo runtime limitato, sslmode=verify-full; nessun percorso PC |
| SESSION_ENCRYPTION_KEY | Secret | 32 byte base64, distinta dalla chiave locale |
| DEPLOYMENT_MODE | Config | connected |

Non eseguire `env pull` in una directory pubblicata. Conservare i segreti nel gestore di segreti e nelle variabili della piattaforma, usando stdin protetto per la CLI; non passarli in argomenti, log o file versionati. Le impostazioni Production non sono state configurate implicitamente.

Per aggiornamenti, costruire un nuovo pacchetto, verificarlo e **avviare la CLI dalla sua directory effettiva**, con il percorso assoluto del suo vercel.json. L'11 ottobre un primo tentativo connected ha selezionato il config root `api/index.ts` pur usando --cwd ed è fallito prima del deploy; l'indicazione esplicita evita questa ambiguità. Il pacchetto compilato contiene `api/index.js`.

```powershell
$trLabPackage = (Resolve-Path -LiteralPath '<PACCHETTO>').Path
$trLabConfig = Join-Path -Path $trLabPackage -ChildPath 'vercel.json'
Push-Location -LiteralPath $trLabPackage
try {
  npx --yes vercel@63.1.2 link --project tr-lab --scope pere01040 --yes --non-interactive
  if ($LASTEXITCODE -ne 0) { throw 'Link Vercel fallito: interrompere.' }
  npx --yes vercel@63.1.2 deploy --dry --json --target=preview --scope pere01040 --local-config $trLabConfig
  if ($LASTEXITCODE -ne 0) { throw 'Inventario upload fallito: interrompere.' }
  npx --yes vercel@63.1.2 deploy --target=preview --project tr-lab --scope pere01040 --yes --json --local-config $trLabConfig --non-interactive
  if ($LASTEXITCODE -ne 0) { throw 'Deploy Vercel fallito: controllare i log.' }
  npx --yes vercel@63.1.2 inspect '<URL_RESTITUITO>' --scope pere01040
  if ($LASTEXITCODE -ne 0) { throw 'Inspect fallita: stato non verificato.' }
} finally {
  Pop-Location
}
```

Sostituire i placeholder; verificare prima owner/progetto con `project inspect`. Fermarsi se un comando fallisce e controllare sempre target/READY del risultato; non pubblicare l'output JSON completo se contiene ambienti. `--skip-domain` è riservato a production. Nessun `--prod` in questo flusso.

Per controlli autorizzati di una preview protetta, usare `vercel curl` dalla directory collegata al progetto: non disattivare la protezione. Con CLI63.1.2 non aggiungere --cwd/--non-interactive a curl: risultano inoltrati al programma curl sottostante. Leggere help corrente e registrare solo esiti/codici, mai cookie o token. Rilascio completo: [manuale](RILASCIO_E_MANUTENZIONE.md).
