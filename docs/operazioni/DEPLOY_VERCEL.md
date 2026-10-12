# TR LAB — deploy Vercel

12 ottobre 2026 · Alpha 0.1.0. [Dominio stabile Production verificato](../qualita/RILASCIO_DOMINIO_STABILE.md), Preview HTTPS collegata a Supabase e cronologia della precedente preview dispositivo. Il collegamento verificato non chiude i gate della beta pubblica.

## 1. Contenuto e limiti

Frontend React/Vite/PWA su CDN e stessa API Fastify in una funzione Node 24. Asset e codice sono pubblici; dati utente, vault, Excel personale e credenziali non entrano nel pacchetto. Diario, misure e bozze restano in IndexedDB.

La prima preview usa `DEPLOYMENT_MODE=device-preview`: nessuna credenziale cloud ammessa, sessione anonima dichiarata, login e sincronizzazione disattivati. La preview corrente usa `DEPLOYMENT_MODE=connected`: BFF, session store privato, SDK Supabase e ruolo DB limitato sono collegati. Il provider richiede conferma email; SMTP e OAuth non sono configurati dal deploy. Telefono/PC e localhost/Vercel hanno archivi distinti. Il JSON standard copia le schede; il backup di recupero contiene dati personali e non va condiviso.

## 2. Scelte e alternative

| Scelta | Vantaggio | Limite / alternativa |
| --- | --- | --- |
| CDN asset e singola funzione API | Asset rapidi, stesso Origin e BFF | Cold start e limiti piattaforma; server persistente valido per futuri worker |
| Fastify già implementato | Riusa sessioni HttpOnly, contratti e test; pool serverless max2 con attachDatabasePool | Rate limiter globale, lease refresh e capacità da collaudare prima della beta |
| Modalità dispositivo / collegata | Prima prova senza provider; seconda con ruolo limitato e readiness reale | La connessione non dimostra Auth positivo, SMTP o offline su due device |
| Bundle CJS + asset verificati | Niente moduli Windows/documenti; prova HTTP del file distribuito | Pacchetto manuale distinto dalla build Git; verificare anche l'eventuale deploy automatico dopo il push |

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
2. `DEPLOYMENT_MODE=connected`, valori Supabase/sessione e CA configurati, APP_ORIGIN HTTPS esatta e callback email/Google per dominio stabile. Nessun segreto frontend. Preview e alpha Production sono collegate allo stesso progetto per DEC-30: documentare e risolvere questa differenza prima della beta completa.
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

Variabili configurate in Preview l'11 ottobre, progetto `pere01040/tr-lab` già verificato; per Production autorizzata il 12 ottobre vedere §9:

| Nome | Tipo | Contenuto / confine |
| --- | --- | --- |
| SUPABASE_URL | Config | URL pubblico del progetto |
| SUPABASE_PUBLISHABLE_KEY | Config | Chiave pubblicabile, non service/secret key |
| DATABASE_CA_CERT_BASE64 | Config | Certificato CA pubblico PEM in base64 |
| DATABASE_URL | Secret | Connessione del ruolo runtime limitato, sslmode=verify-full; nessun percorso PC |
| SESSION_ENCRYPTION_KEY | Secret | 32 byte base64, distinta dalla chiave locale |
| DEPLOYMENT_MODE | Config | connected |

Non eseguire `env pull` in una directory pubblicata. Conservare i segreti nel gestore di segreti e nelle variabili della piattaforma, usando stdin protetto per la CLI; non passarli in argomenti, log o file versionati. Production è stata configurata soltanto dopo il consenso esplicito DEC-30.

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

## 9. Dominio stabile pubblicato, 12 ottobre 2026

Il committente ha autorizzato esplicitamente con DEC-30 il funzionamento di `https://tr-lab.vercel.app`, il trasferimento dei valori indicati e la pubblicazione dell'alpha. Il dominio punta a Production; Preview e Production hanno variabili separate e le modifiche valgono per nuovi deployment. DEC-29 resta l'autorizzazione storica del solo Preview.

Preparazione locale: pacchetto minimo connected con lo stesso codice verificato; `APP_ORIGIN=https://tr-lab.vercel.app`, mai il dominio immutabile del build. SESSION_ENCRYPTION_KEY nuova e distinta; stesso ruolo DB limitato e progetto Supabase indicato dal committente. È ancora un'alpha con database condiviso tra ambienti, non una separazione staging/produzione completata. Configurazione privata in `.local/vercel-production.env`, esclusa da Git e dal deploy.

Configurati soltanto Production del progetto `pere01040/tr-lab` (ID `prj_IpG5DKSPZX4Tn1yw90eAfILehujH`) e i valori autorizzati: cinque valori cloud più i Config APP_ORIGIN, DEPLOYMENT_MODE=connected, GOOGLE_AUTH_ENABLED=false. DATABASE_URL e SESSION_ENCRYPTION_KEY come Secret, mai in argomenti o sorgenti. Variabili Preview preservate. La procedura seguente vale per aggiornamenti autorizzati, non richiede di ricreare i segreti a ogni deploy.

Usare la procedura del §8 dalla directory effettiva del nuovo pacchetto, sostituendo il comando di deploy con `deploy --prod --skip-domain`: controllare prima la nuova Production senza assegnare il dominio. Verificare READY/target/artefatto, DB/readiness, sessione anonima, CSRF dall'origine stabile, routing/cache e indisponibilità Google esplicita. Poi `promote` di quella stessa Production, senza ricostruire una Preview con altri valori. Conservare l'ID precedente per rollback; nessuna cancellazione di deployment o dati.

In Supabase sono stati salvati il callback `https://tr-lab.vercel.app/api/auth/callback\?state=*`, quelli specifici Preview/Vite e Site URL `https://tr-lab.vercel.app`. Conferma e recupero vanno collaudati nello stesso browser; SMTP ancora da configurare secondo l'ultima risposta del committente. Il semplice login email/password non dimostra consegna email o configurazione Google. Stage, promozione, ID/artefatti ed esiti effettivi nel [rapporto del rilascio](../qualita/RILASCIO_DOMINIO_STABILE.md).

Il dominio stabile ha un archivio IndexedDB distinto dalla Preview. I dati già sincronizzati si recuperano dopo l'accesso allo stesso account; quelli rimasti soltanto nel dispositivo della Preview richiedono export/import esplicito. Nessuna cancellazione della cache o del diario per aggiornare il dominio.

## 10. Integrazione Git già presente

Il push della consegna cd9c90c ha avviato un nuovo deployment Production da main tramite l'integrazione Git del progetto, già presente e non creata da questa attività. La build usa vercel.json della radice (`npm run build`, apps/web/dist e api/index.ts) e i valori Production appena configurati. Non usa il pacchetto CJS preparato localmente.

Quel primo deploy Git era READY ma restituiva API500 per un export TypeScript del workspace non incluso. Ripristinato il pacchetto manuale verificato. La build del repository ora genera apps/server/dist/vercel.cjs con la stessa funzione di compilazione del pacchetto manuale; api/index.ts carica il bundle e includeFiles lo conserva nella funzione. Non caricare dist manualmente nel repository, non incorporare ambienti e non aggiungere dipendenze SDK ai pacchetti puri. `npm run check` esegue anche sei prove HTTP dell'entrypoint compilato e isolato tramite check:vercel. Gli esiti remoti della correzione devono essere verificati separatamente, non dedotti da queste prove locali.

Controllare la build automatica e il dominio anche dopo il push: può sostituire la Production promossa manualmente. La CI di qualità GitHub è separata; l'avvio del deploy Git non prova che la CI sia già passata. Prima della beta adottare un gate di rilascio e una promozione controllata coerenti con il [manuale](RILASCIO_E_MANUTENZIONE.md), senza trasferire segreti a un altro servizio implicitamente. Non disabilitare un'integrazione del committente o il deploy durante questa verifica.
