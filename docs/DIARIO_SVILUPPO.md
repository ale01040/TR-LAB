# Diario di sviluppo dell'applicazione

Questo file registra gli interventi sul progetto: file creati o modificati, motivazione, riferimenti ai requisiti, verifiche e limiti. Gli interventi collegati possono formare una voce unica, che elenca tutti i file interessati. Gli artefatti generati (dipendenze, build e risultati dei test) sono registrati per cartella e comando, senza elencare ogni file di terze parti. L'aggiornamento del diario è incluso nella voce che descrive l'intervento.

## 11 ottobre 2026 · DEV-001 · Avvio autorizzato

- **Creato:** `docs/DIARIO_SVILUPPO.md`.
- **Richiesta:** iniziare lo sviluppo completo secondo piano/roadmap e registrare ogni intervento.
- **Letture:** AGENTS, indice progetto, indici delle due raccolte e skill karpathy-guidelines.
- **Decisioni rispettate:** Supabase, PWA, offline, commenti mirati, proposte con conferma esplicita, proprietà personale dei dati.
- **Prossimo percorso:** leggere i capitoli pertinenti; costruire fondazione, dominio e prima esperienza completa; verificare codice e comportamento prima di estendere i moduli.
- **Domande aperte:** progetto Supabase disponibile e nome dell'app; le attività locali indipendenti proseguono.
- **Stato:** nessuna implementazione dell'app verificata in questa voce.

## 11 ottobre 2026 · DEV-002 · Identità e fondazione

- **Confermato dall'utente:** nome `TR LAB`; nessun progetto Supabase esistente, preparare ambiente locale e istruzioni.
- **Creati:** `package.json`, `.npmrc`, `.gitignore`, `apps/web/package.json`, `apps/server/package.json`, `packages/domain/package.json`, `packages/contracts/package.json`.
- **Motivazione:** repository npm workspaces con web/server e dominio/contratti distinti; versioni runtime dichiarate, installazioni esatte e cache npm nella workspace; esclusione dei segreti e degli artefatti generati da Git.
- **Riferimenti:** F0–F2, ADR-02/04/10/15, WEB-01/07/11/14. Letture delle raccolte originali e delle specifiche pertinenti in corso; riferimenti ufficiali Vite, Dexie, Fastify e Supabase consultati.
- **Verifiche ambiente:** Node 24.21.0, npm 11.19.0 e Git disponibili; Docker e CLI Supabase non rilevati. I comandi npm del progetto saranno operativi dopo installazione e implementazione, non sono già collaudati.
- **Esito consultazione npm:** configurazione iniziale solo-cache impediva il recupero dei metadati; configurazione di progetto predisposta per installare le dipendenze necessarie.

## 11 ottobre 2026 · DEV-003 · Dipendenze, contratti e dominio minimo

- **Modificati/generati:** `package.json`, `package-lock.json`, `node_modules/**`, `.analysis/npm-cache/**` tramite installazioni npm autorizzate.
- **Creati:** `tsconfig.json`, `eslint.config.mjs`, `.prettierrc.json`, `vitest.config.ts`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/public/icon.svg`, `apps/web/src/sw.ts`, `packages/contracts/src/index.ts`, `packages/domain/src/index.ts`.
- **Funzioni:** contratti runtime stretti, revisioni decimali esatte, modelli di scheda/sessione/serie/misure/macro, ciclo con snapshot e scarico, volume per lato, copia con nuovi ID e prima regola candidata di doppia progressione senza capacità di applicazione.
- **Scelte:** React/Vite verificati sul registro; service worker con soli asset statici e navigazione, API escluse; icona vettoriale TR LAB provvisoria. I valori iniziali dell'editor sono modificabili, non prescrizioni universali.
- **Riferimenti:** RF-03–09/11/12/14, ADR-01–03/07/10/12–15, WEB-01–14; ALG-01/03/04/05/09/10/13. Raccolte: HTML/CSS/design/JavaScript/rete/stato/sicurezza e capitoli corrispondenti delle linee guida.
- **Stato:** installazioni concluse; test applicativi ancora da eseguire. Warning npm su `glob` transitivo e script esbuild da verificare prima del collaudo; nessun aggiornamento globale eseguito.

## 11 ottobre 2026 · DEV-004 · Persistenza e sincronizzazione locale

- **Approvato:** SHA-256 nel database e SHA-3 nel server; l'utente delega le altre scelte tecniche dopo analisi dei compromessi e verifica delle fonti.
- **Creati:** `apps/web/src/data/database.ts`, `apps/web/src/data/sync.ts`.
- **Modificati:** `packages/contracts/src/index.ts`, `packages/domain/src/index.ts`, questo diario.
- **Funzioni:** base/overlay/outbox transazionali, dipendenze tra comandi, ricevute idempotenti, confronto revisioni bigint, isolamento per account, esportazione di emergenza, sospensione su epoch diverso e conflitti espliciti. Dati sul dispositivo distinti dall'account, senza upload implicito.
- **Correzioni:** cursore opaco nel contratto; volume esclude target sconosciuti; progressione candidata non interpreta assistenza/corpo libero come carico ordinario né inventa tagli oltre i limiti.
- **Riferimenti:** WP-02/08, RF-06/14, ADR-07/12–15, WEB-05/07/09/11/14; QA-SYNC/OFF/ALG pertinenti da eseguire.
- **Limite corrente:** gestione conflitti conservativa (blocco e recupero), test e server ancora in costruzione; nessun gate dichiarato superato.

## 11 ottobre 2026 · DEV-005 · Catalogo e struttura Excel portabile

- **Creati:** `scripts/create-excel-fixture.mjs`; output previsti `apps/web/src/data/catalog.json`, `excel-template.json`, `excel-provenance.json` tramite il comando Node.
- **Modificati:** contratti/dominio e diario; serie extra con lato esplicito, accumulo selettivo per esercizio, conteggio di serie richieste per lato.
- **Scelta:** esempio adattato dalla struttura reale (25 posizioni, 24 nomi), non import integrale. Nessun dato personale, nessuna priorità SX imposta agli amici. Le esclusioni e conversioni sono nel manifest visibile prima dell'uso.
- **Riferimenti:** WP-00/06/07, RF-03–06, WEB-08/14; ALG-02/07/10/11/27. Parser XLSX arbitrario resta distinto dalla fixture.
- **Verifiche:** letti valori e ciclo dell'Excel; generazione e contratti da collaudare. Gli output saranno inclusi nella consegna, senza dipendere dalla cache di analisi per usare l'app.

## 11 ottobre 2026 · DEV-006 · Shell e percorso iniziale

- **Creati:** `apps/web/src/main.tsx`, `App.tsx`, `components/AppProvider.tsx`, `components/Shared.tsx`, `pages/TodayPage.tsx`.
- **Funzioni:** navigazione telefono/PC, stato connessione/coda, apertura spazio personale, memoria offline senza token, uscita locale con revoca differita, ripresa seduta, selezione esplicita di giorno/settimana, snapshot al via e statistiche reali (nessuno storico fittizio).
- **Scelte:** nome definitivo TR LAB, identità grafica provvisoria; aggiornamento PWA solo con azione dell'utente; ciclo manuale esplicito finché non è definita la semantica calendario.
- **Riferimenti:** WP-01/02/04/08/09, RF-01/02/06/14, WEB-02–08/11–13. Capitoli HTML/CSS/design/form/stato delle due raccolte applicati; collaudo ancora da eseguire.

## 11 ottobre 2026 · DEV-007 · Editor e diario delle serie

- **Creati:** `pages/ProgramPage.tsx`, `pages/WorkoutPage.tsx` in `apps/web/src`.
- **Funzioni:** creazione/modifica bozza, nuovi giorni/esercizi, dose e ciclo configurabili, versioni approvate immutabili, approvazione esplicita, copia JSON/anteprima, stampa, log separati SX/DX, zero RIR valido, serie saltate, ripresa dei risultati, timer a scadenza persistente e chiusura parziale senza inventare dati.
- **Riferimenti:** WP-06/07/08/09, RF-03–06/11, WEB-02–08/12/14; contratti runtime riusati. Target originali nello snapshot; modifica dell'approved produce una nuova bozza.
- **Limiti dichiarati in UI:** fixture Excel adattata, import JSON da collaudare; import integrale XLSX non ancora presente. Timer non promette notifiche a schermo bloccato. Proposte automatiche non attivate prima della revisione del dominio.

## 11 ottobre 2026 · DEV-008 · Misure, macro, libreria e interfaccia

- **Creati:** `pages/ProgressPage.tsx`, `pages/LibraryPage.tsx`, `pages/ProfilePage.tsx`, `styles/global.css`, `styles/App.module.css` in `apps/web/src`.
- **Funzioni:** pesate/circonferenze con unità canoniche, grafico con tabella accessibile, volume diretto SX/DX, target macro con controllo 4/9/4 e decorrenza, ricerca catalogo, login/registrazione/Google/recupero predisposti, backup locale, preferenze chiaro/scuro, layout responsivo e stampa.
- **Scelte:** SVG per un grafico semplice (tabella come alternativa), niente libreria grafica pesante; lucide per icone decorative; navigazione mobile e desktop, controlli semantici e focus visibile. Identità e contrasto ancora da verificare nel browser.
- **Riferimenti:** WP-01/04/12, RF-01/02/07–10/14, WEB-02–13. Nessun alimento/pasto o dato clinico aggiunto al perimetro.
- **Stato:** implementazione locale in corso, server e controlli non ancora eseguiti; nessuna dichiarazione di conformità AA o produzione.

## 11 ottobre 2026 · DEV-009 · Database e ambiente Supabase

- **Creati:** `.env.example`, `scripts/create-secret.mjs`, `supabase/config.toml`, `supabase/migrations/202610110001_core.sql`.
- **Funzioni:** ruolo comandi NOLOGIN/NOBYPASSRLS, grant limitati, ownership e FK composite, session store privato, RPC tipizzate per stato, confronto revisioni, ricevuta/checksum SHA-256 e cambiamento/eventi nella stessa transazione, sequenze serializzate per account e epoch di ripristino. Target della seduta ricostruiti dal programma approvato anche sul DB.
- **Scelta implementativa da documentare in ADR:** aggregati JSONB per versioni di programma e snapshot immutabili, righe separate per risultati/misure/target; replay del changelog con watermark per bootstrap consistente. Trade-off: meno join/versioni più semplici, maggior costo di eventi/snapshot e guardie SQL da verificare; niente compattazione prima della prova di recupero.
- **Riferimenti:** WP-03/04/05/08, RF-01/03/06/14, WEB-11/12/14; integrazione PostgreSQL reale incorporata e controlli RLS da eseguire. Nessun servizio remoto creato.

## 11 ottobre 2026 · DEV-010 · Server e autenticazione predisposta

- **Creati:** `apps/server/src/{config,crypto,auth,app,index}.ts`, `apps/web/src/env.d.ts`.
- **Modificati:** `apps/server/package.json`, `apps/web/src/styles/global.css`, diario.
- **Funzioni:** API Fastify, cookie opaco HttpOnly (Secure in produzione), token cifrati AES-256-GCM nel session store privato, rinnovo serializzato con lock, SHA-3 per identificativi/cursori, CSRF con origine/header/nonce, limiti richieste e payload, RPC con JWT del proprietario, login/email/Google/PKCE/recupero e logout locale vincolato alla sessione.
- **Scelte:** nessuna service key; SDK Supabase solo sul server; sessioni separate per request. Font di sistema, nessuna richiesta Google Fonts che comprometta offline/privacy/CSP. Bundle server tsup per includere pacchetti workspace TS.
- **Verifiche iniziali:** typecheck ha rilevato due classi CSS opzionali su NavLink e dichiarazione PWA mancante; riparazione in corso. `glob@11.1.0` proviene da Workbox build, audit ancora aperto.
- **Limiti:** Auth/provider/SMTP/Docker non ancora configurati o collaudati; CSP produzione e cookie Secure richiedono prova HTTPS. Non è attestata l'operatività reale di Google/email.

## 11 ottobre 2026 · DEV-011 · Prime prove eseguibili

- **Creati:** `tests/helpers/fixtures.ts`, `tests/unit/{domain,contracts,crypto}.test.ts`, `tests/integration/{local,api}.test.ts`.
- **Modificati:** `apps/web/src/App.tsx` e diario; classe NavLink resa esplicita per TypeScript strict.
- **Copertura prevista:** serie effettive e lati, RIR zero/missing, metriche non confrontabili, precisione bigint, copia standard, energia macro, cifratura/cursori, IndexedDB/outbox/ricevute/conflitti e API senza configurazione/CSRF.
- **Stato:** test scritti, non ancora eseguiti in questa voce. Non equivalgono ai test Auth Supabase, HTTPS o telefono reale.

## 11 ottobre 2026 · DEV-012 · Prove PostgreSQL e tipi CSS

- **Creati:** `scripts/style-types.mjs`, output `apps/web/src/styles/App.module.css.d.ts`, `tests/integration/database.test.ts`.
- **Modificati:** `package.json`, `apps/server/src/app.ts`, diario.
- **Motivazione:** verificare migrazione e RPC su PostgreSQL incorporato (PGlite), non una simulazione di JavaScript; SDK Auth/GoTrue e PostgREST restano prove distinte. Tipi CSS generati dalle classi reali rendono visibili gli errori nel markup.
- **Test previsti:** consenso, snapshot ciclo, risultati con revisione sessione, retry, RLS fuori UI, immutabilità, payload ostili, precisione >2^53 ed epoch. I risultati saranno registrati dopo esecuzione.

## 11 ottobre 2026 · DEV-013 · Guardie SQL e avvio test

- **Modificati:** migrazione SQL, `tests/helpers/fixtures.ts`, diario; tipo generico della fixture e verifica stretta di chiavi/tipi/null in oggetti SQL, base delle revisioni compresa.
- **Motivazione:** `NULL` SQL non deve rendere vera una validazione assente; RPC dirette devono rispettare le invarianti anche senza Zod del server.
- **Esito avvio:** il sandbox Windows ha impedito il sottoprocesso Vite (`spawn EPERM`), quindi unit/integration non sono stati eseguiti in quell'avvio. Riprova autorizzata fuori sandbox per i soli comandi di collaudo; nessuna limitazione dei controlli viene rimossa dal codice.

## 11 ottobre 2026 · DEV-014 · Risultati iniziali e correzione SQL

- **Esiti:** TypeScript superato; 11 test unitari superati; 7 integrazioni API/IndexedDB superate. La suite DB si è fermata alla sintassi della migrazione (5 casi non eseguiti), rilevando una `CASE` da racchiudere tra parentesi nel controllo unità.
- **Modificati:** migrazione SQL (parentesi), `scripts/create-secret.mjs` (import Node esplicito per ESLint), diario.
- **Analisi:** il debug isolato PGlite ha localizzato l'errore; nessun database remoto toccato. Lint rilevava soltanto l'import `process`; nuova esecuzione richiesta. Warning Fastify su logging da aggiornare usando API corrente.

## 11 ottobre 2026 · DEV-015 · Permessi delle guardie

- **Modificati:** migrazione e diario, grant EXECUTE della sola funzione `shape` al ruolo dei comandi.
- **Esito precedente:** migrazione compilata; 8 integrazioni superate, 4 fallite per il grant mancante. Non è stato ampliato alcun permesso degli utenti autenticati o anonimi. Riprova necessaria.

## 11 ottobre 2026 · DEV-016 · Operatori JSON e dipendenza di build

- **Modificati:** migrazione SQL, `package.json`, diario; parentesi sugli operandi JSONB per disambiguare la precedenza di `->` e `-`.
- **Esito audit npm:** un avviso basso su esbuild 0.27.7 (lettura file nel dev server Windows), nessun avviso moderato/alto/critico. `glob` deprecato non risulta nell'audit, resta debito transitivo Workbox.
- **Scelta:** override esbuild 0.28.2, versione corretta già usata dal ramo tsx, senza `audit fix --force`. Trade-off: uscita dalla range originaria tsup; mantenere solo dopo prova di build/test. Lockfile/cache/dipendenze generati dalla reinstallazione sono inclusi in questa voce.

## 11 ottobre 2026 · DEV-017 · Ambiguità SQL e percorso build

- **Modificati:** migrazione SQL (variabile `record_kind` distinta dalla colonna `kind`), `apps/server/src/app.ts` (LogController ufficiale e directory web risolta dal file, indipendente dalla cwd), diario.
- **Esito precedente:** 8 integrazioni passate, 4 fallite per ambiguità PL/pgSQL. Esbuild aggiornato; compatibilità verificata nella prossima build. Logging aggiornato sulla documentazione Fastify presente nel pacchetto installato.

## 11 ottobre 2026 · DEV-018 · Build e avvio reali

- **Esiti:** 11 unit e 12 integration superati; web/PWA e server compilati. Il primo avvio del bundle server ha rilevato un `require` dinamico CJS, non emerso dalla sola compilazione.
- **Creati:** `apps/server/tsup.config.ts`, `scripts/start-preview.mjs`.
- **Modificati:** manifest root/server, diario; lockfile/dipendenze aggiornati dalla reinstallazione. Dipendenze runtime del server esterne, soli contratti workspace inclusi nel bundle. `npm run preview` avvia un solo server locale con origine coerente se .env non la specifica.
- **Trade-off:** distribuzione con `node_modules` runtime (installazione riproducibile), evitando un bundle monolitico di Fastify/pg; compatibilità CJS/ESM gestita da Node. Il warning chunk web >500 KiB verrà corretto dividendo le pagine; warning Workbox su una propria opzione deprecata resta transitivo.

## 11 ottobre 2026 · DEV-019 · Verifica browser offline e revisione Auth

- **Prova manuale:** nel browser in-app, origine sintetica `127.0.0.1:3001` separata da `localhost:3001`, creata/approvata una scheda, salvata serie 12,5 kg / 8 rip. / RIR 0. Server spento, pagina ricaricata dal service worker: snapshot, serie e timer conservati. Modifica a 9 rip. e conclusione salvate con server assente. Non è una prova di sync multi-device/Auth reale.
- **Modificati:** `components/AppProvider.tsx`, `apps/server/src/auth.ts`, diario.
- **Correzioni:** sync vincolata a identità/sessione appena riconfermate, polling visibile 30s per recuperare operazioni arrivate durante un sync; errore temporaneo provider distinto da logout; storage PKCE risponde solo alla chiave del verifier. Recupero password inizializza la sessione SDK solo sul server e revoca le altre sessioni BFF.
- **Fonti:** documentazione ufficiale Supabase PKCE e updateUser; Google noindex consultata per WEB-10. Le verifiche di codice non sostituiscono il collaudo del provider.

## 11 ottobre 2026 · DEV-020 · Collisioni e validazione in italiano

- **Modificati:** dominio, contratti, migrazione SQL, `components/Shared.tsx`, `tests/unit/domain.test.ts`, diario.
- **Problema rilevato in revisione:** la precedente derivazione degli ID extra poteva collidere con ID sequenziali del file standard. Sostituita con allocazione deterministica UUIDv8 che controlla tutti gli ID già presenti, identica in JS e SQL. Non è un hash né una primitiva crittografica.
- **Controlli:** aggiunta fixture che avrebbe rilevato il problema; programmi richiedono serie di lavoro, coerenza lato/modalità e massimo effettivo 30 serie anche nel ciclo; messaggi Zod italiani resi leggibili nei form.
- **Stato:** nuove modifiche da rieseguire nelle suite; nessuna sessione sintetica preesistente è stata riscritta.

## 11 ottobre 2026 · DEV-021 · Input decimali e strumenti di qualità

- **Creati:** `components/DecimalInput.tsx`, `tests/unit/decimal-input.test.tsx`, `.github/workflows/quality.yml`.
- **Modificati:** `package.json`, `tsconfig.json`, `vitest.config.ts`, diario; supporto test TSX e comando `test` effettivo. Rimosso il comando E2E vuoto: le prove browser svolte sono manuali e registrate, non una suite Playwright già esistente.
- **Motivazione:** mantenere il testo digitato (compresa la virgola intermedia), validare zero/null/limiti senza sostituzioni silenziose; CI locale Windows/Linux senza deploy/segreti. Azioni ufficiali verificate, tag da fissare a SHA prima del rilascio.
- **Intervento formattazione previsto:** Prettier su `apps/**`, `packages/**`, `tests/**`, `scripts/**`, configurazioni root e `.github/**`; solo formattazione, stessi contenuti. Tipi CSS e build generati tracciati nelle voci dei comandi.
- **Dipendenze:** tipi Node allineati alla linea 24.19.2 (runtime 24.21.0); manifest/lockfile/cache aggiornati dall'installazione. CLI Supabase presente come dipendenza, ma primo `--help` impedito dalla scrittura della propria telemetria fuori workspace; opt-out da configurare senza toccare HOME.

## 11 ottobre 2026 · DEV-022 · Collegamento richiesto e revisione prima di GitHub

- **Indicazioni ricevute:** progetto Supabase `mxaogzjquvhwurngktyz`, repository `ale01040/TR-LAB`; il committente richiede prima istruzioni per configurare i valori. Nessun segreto ricevuto, nessuna migrazione remota eseguita.
- **Modificati:** `.env.example`, `apps/web/src/data/sync.ts`, `apps/server/src/auth.ts`, `scripts/style-types.mjs`, `apps/web/src/App.tsx`, `components/AppProvider.tsx`, diario.
- **Creato:** `tests/unit/auth-account.test.ts`.
- **Correzioni:** tutte le richieste sync hanno precondizione account verificata dal BFF prima della RPC, anche per GET; previene invii incrociati quando cambia la cookie durante un worker. Tipi CSS con formato stabile, pagine caricate separatamente ma incluse nella cache offline, tema ripristinato all'avvio, URL di stampa privo di parametri personali.
- **Git:** repository remoto verificato in lettura, `main` contiene il commit `675b42bcd560b4cf97a31fcbb2960464cbd4b7ed`. Preparazione Git e caricamento richiesti; conservare la cronologia esistente, escludere Excel personale, cache, dipendenze e segreti dalla pubblicazione.
- **Stato:** nuove modifiche da collaudare; URL pubblico non equivale a collegamento Auth/database riuscito.

## 11 ottobre 2026 · DEV-023 · Git preservato e flussi personali

- **Modificati:** `.gitignore`, `pages/ProgramPage.tsx`, `pages/ProfilePage.tsx`, `pages/WorkoutPage.tsx`, workflow qualità, diario.
- **Git:** inizializzato repository, aggiunto `origin`, recuperato `main`, indice/riferimento collegati al commit esistente con reset mixed; nessun file di lavoro cancellato. Il remoto aveva soltanto `README.md` con il titolo TR-LAB. Primo tentativo di scrittura config impedito dal sandbox, operazione poi autorizzata; nessun rifiuto auto-review.
- **Privacy:** originale Excel escluso da Git ma conservato localmente; fixture depurata disponibile nell'app. Copia condivisa con anteprima, nuovi ID, fonte rimossa, note escluse salvo scelta esplicita. Nessun diario incluso.
- **UX:** input decimali collegati all'editor; modulo di recupero password per sessioni recovery; note concluse consultabili; rimossa azione interna fittizia. Azioni CI fissate agli SHA ufficiali verificati con `git ls-remote`.
- **Stato:** modifiche da collaudare prima del commit/caricamento.

## 11 ottobre 2026 · DEV-024 · Configurazione verificabile e guardie SQL

- **Creati:** `scripts/check-config.ts`, `scripts/database-preflight.ts`, `tests/unit/config.test.ts`.
- **Modificati:** migrazione SQL, configurazione server, test DB, manifest root, diario.
- **Motivazione:** valori Supabase tutti presenti o tutti assenti; accettare chiavi publishable e SSL remoto verificato. Preflight in sola lettura, errori oscurati senza connection string/password. CA tramite `sslrootcert` supportata dal driver `pg-connection-string` installato e verificato.
- **SQL:** guardie per almeno una serie di lavoro, lato coerente con unilateralità, massimo effettivo nel ciclo, limiti fonte/focus/superserie/versione; prova diretta fuori Zod/UI.
- **Fonti:** Supabase API keys, connessioni PostgreSQL e Google Auth consultate l'11 ottobre 2026; istruzioni operative in preparazione. Nessuna modifica al progetto Supabase remoto.
- **Stato:** test e build da eseguire dopo questi interventi.

## 11 ottobre 2026 · DEV-025 · Primo controllo e fixture HTTP

- **Comandi/output:** Prettier eseguito sui sorgenti/configurazioni previsti; `npm run check` si è fermato a TypeScript prima dei test, rilevando la conversione incompleta di una request nella nuova prova account.
- **Modificato:** `tests/unit/auth-account.test.ts`, diario. Il test ora usa request reali tramite Fastify inject; il provider rimane sostituito solo per verificare la precondizione account, non per dichiarare Auth Supabase superato.
- **Generati:** dichiarazioni CSS dal typecheck. Nuovo collaudo richiesto; nessun servizio cloud interessato.

## 11 ottobre 2026 · DEV-026 · Istruzioni Supabase richieste dal committente

- **Creato:** `docs/operazioni/AVVIO_LOCALE.md`.
- **Contenuto:** recupero URL/publishable key, password DB distinta, session pooler, codifica URL e CA, generazione chiave locale, `.env` completo, controlli senza segreti, preflight read-only, revisione/migrazione, callback email/Google, origini dev/preview, problemi comuni e limiti dell'alpha.
- **Trade-off:** BFF persistente con session pooler per IPv4; verifica TLS mantenuta; connessione amministrativa solo per collaudo iniziale, ruolo runtime limitato come gate pubblico. Nessun provider o migrazione configurato automaticamente.
- **Sicurezza consegna:** istruzioni senza password o token reali; originale Excel privato conservato sul PC e ignorato da Git. Cloud non ancora collegato.

## 11 ottobre 2026 · DEV-027 · Risultati e formato standard eseguibile

- **Esiti reali:** `npm run check` superato: TypeScript, ESLint, 16 unit, 13 integration (6 SQL PGlite, 4 API, 3 IndexedDB), build web/PWA/server. Formattazione superata; `npm audit --json` zero advisory rilevati sul lockfile corrente. Questi risultati non certificano assenza universale di vulnerabilità.
- **Creato:** `scripts/create-standard-schema.ts`; **modificati:** manifest root, diario. Genera JSON Schema dalla fonte Zod e esempio sintetico senza storico o carichi personali in `schemas/` ed `examples/`.
- **Generati:** `apps/web/dist/`, `apps/server/dist/`, tipi CSS. Chunk iniziale web 474,24 kB (149,10 gzip), pagine separate, 20 asset precache. Warning transitivo Workbox `inlineDynamicImports` da monitorare; nessun warning chunk >500 kB.
- **Configurazione:** comando locale provato, restituisce valid true / provider false senza `.env`; primo avvio dentro sandbox impedito da spawn, riprova autorizzata riuscita. Nessuna chiave reale configurata.
- **Preview:** la porta 3001 risulta già occupata; il nuovo tentativo non ha alterato il processo preesistente. Identificazione in sola lettura, nessun processo esterno terminato.

## 11 ottobre 2026 · DEV-028 · Invarianti locali e schema documentato

- **Creato:** `packages/domain/src/local-change.ts`; **modificati:** export dominio, database locale, test IndexedDB, specifica import/export, diario.
- **Correzioni:** transizioni locali coerenti anche senza server (target approvati immutabili, avvio da scheda approvata/snapshot corretto, chiusura senza modifica snapshot, serie solo su seduta attiva/lato valido); nessun record correlato arbitrario. Dipendenza esplicita dal programma radice nelle nuove versioni offline.
- **Limiti:** guardia 200 KiB sui comandi cloud prima della transazione persistita, inferiore ai 256 KiB API/SQL; messaggio operativo e campi mantenuti nell'editor. L'import JSON dispositivo mantiene limite 1 MiB.
- **Contratto:** sostituito esempio piatto non implementato con v1 eseguibile, unità/lati/null e vincoli descritti; schema ed esempio generati. Non dichiarata equivalenza dei soli JSON Schema alle validazioni semantiche.
- **Preview:** build separata avviata su `localhost:3002`, senza terminare la 3001. Ispezione desktop senza overflow e anteprima Excel con 3 giorni/25 esercizi/7 settimane e adattamenti visibili; questi dati strutturali non sono una nuova prescrizione automatica.
- **Stato:** guardie aggiunte da collaudare; nessuna migrazione remota applicata.

## 11 ottobre 2026 · DEV-029 · Correzione del nome comando e prova di chiusura

- **Modificati:** `packages/domain/src/local-change.ts`, test IndexedDB, diario.
- **Esito precedente:** TypeScript ha rilevato il nome abbreviato errato `SaveNutrition`; corretto nel nome di contratto `SaveNutritionTarget` prima di eseguire i test. La prova offline comprende ora anche avvio/chiusura e rifiuto di serie su seduta conclusa.
- **Interventi successivi di sola formattazione/build:** registrati per cartelle come nelle voci precedenti; ripetizione giustificata dalle nuove guardie, non da una certificazione generale del prodotto.

## 11 ottobre 2026 · DEV-030 · Documentazione riallineata al codice

- **Creati:** `docs/architettura/SCELTE_IMPLEMENTAZIONE.md`, `docs/qualita/STATO_IMPLEMENTAZIONE.md`.
- **Modificati:** README root/docs, piano operativo, roadmap, modello dati, API/sync, convenzioni, decisioni (DEC-21–DEC-26), architettura tecnica, diario. Un primo tentativo di patch è stato rifiutato perché un contesto non corrispondeva; la patch corretta è stata applicata dopo controllo.
- **Contenuto:** alpha avviabile distinta dalla versione completa; strumenti e alternative, struttura effettiva, aggregati JSONB/grant/snapshot e percorso di normalizzazione, prerequisiti Supabase, prove manuali vs automatiche, fasi ancora aperte e ordine operativo per il prossimo sviluppatore.
- **Esito finale guardie:** `npm run check` superato: 16 unit + 14 integration, TS/lint/build. Web iniziale 478,98 kB (150,74 gzip), 20 asset precache 590,52 KiB. Nessuna fase cloud/AI/dispositivi dichiarata completata.
- **Privacy Git:** identità commit già configurata sul PC, non inventata; nessuna credential estratta. Raccolte originali conservate, Excel originale/vault/cache/segreti esclusi.

## 11 ottobre 2026 · DEV-031 · Verifica browser del formato standard

- **Prova manuale:** nella build aggiornata, update PWA proposto e accettato senza campi in corso. Import di `examples/programma.v1.json` con anteprima, conferma separata, editor; nome sintetico e carico 12,5 digitato carattere per carattere, poi bozza salvata. Nessun account reale o dato del committente usato.
- **Modificato:** `package.json`, diario; Prettier include ora schema/esempio e configurazioni TypeScript root. Lo schema è generato dalla fonte Zod, la fixture è stata accettata anche dalla UI.
- **Osservazione UX:** etichette numeriche al singolare e carico nel riepilogo della scheda da rifinire prima della consegna; nessuna prescrizione automatica approvata.

## 11 ottobre 2026 · DEV-032 · Riepilogo leggibile e refusi UI

- **Modificati:** `components/Shared.tsx`, `pages/ProgramPage.tsx`, diario.
- **Correzioni:** singolare/plurale nelle anteprime e schede; riepilogo mostra ogni target (tipo, lato, ripetizioni, RIR, recupero, carico) anziché nascondere carichi e differenze tra serie. Convenzioni di zavorra/assistenza/macchina/manubrio esplicite anche nell'editor.
- **Scopo:** permettere di controllare ciò che si approva e si stampa, anche dopo import standard con target variabili. Non trasformare una serie mancante in zero né copiare solo il primo target nel riepilogo.
- **Verifica prevista:** TypeScript/lint/build e revisione browser finale; nessun test che replichi il solo testo di questi componenti.

## 11 ottobre 2026 · DEV-033 · Contenuto del commit e verifica finale

- **Creato:** `.gitattributes`; **modificati:** `.gitignore`, convenzioni, rapporto implementazione, `.analysis/verify-documentation.cjs`, diario.
- **Esiti finali:** TS, lint, 16 unit + 14 integration, build e Prettier superati. Audit npm zero advisory rilevati. Verifica documentale: 22 file, 92 link, 58 tabelle, 3 JSON, riferimenti QA validi, zero errori. Non equivalgono a 35 QA dell'app completati.
- **Pubblicazione:** indice Git verificato; file locale di password apparso durante il lavoro identificato per nome, escluso dal commit senza stamparne/trasmetterne il contenuto. `.env`, .local, Excel personale e cache ignorati. Raccolte originali incluse senza correggerne spazi finali/refusi.
- **Fine riga:** sorgenti e nuovi documenti LF riproducibili, cartelle originali senza conversione Git. Primo diff check segnala solo whitespace originario; controllare separatamente i file nuovi senza alterare le fonti.
- **Generati:** build e audit locale in cartelle ignorate; tipo CSS stabile e schema/esempio già inclusi. Nessuna migrazione remota eseguita.

## 11 ottobre 2026 · DEV-034 · Evidenze e preparazione consegna Git

- **Creati:** `.analysis/check-staged.cjs` (controllo locale ignorato), `docs/qualita/evidenze/TR-LAB-desktop.jpg`, `TR-LAB-mobile.jpg`; **modificati:** rapporto implementazione e diario.
- **Prove:** viewport 390×844 e 1366×900, assenza overflow, carico e target singoli visibili, dialog copia con note escluse. Primo screenshot full-page non supportato; salvate viewport reali via API documentata e ripristinato override. Tab di collaudo conservata come risultato locale.
- **Scansione commit:** 112 file preparati, nessun file riservato/possibile segreto rilevato; scanner stampa solo nomi/diagnosi, mai valori. Primo avvio scanner dentro sandbox impedito da spawn Git, riesecuzione autorizzata riuscita. Nessun rifiuto auto-review.
- **Consegna Git:** commit/push verso main richiesti dal committente, senza force, con cronologia iniziale conservata. Risultato remoto da verificare dopo il comando; questa voce non afferma che il push sia già riuscito.
- **Cloud:** soltanto istruzioni, schema e configurazione d'esempio; Supabase non ancora collegato, regole/AI non operative.

## 11 ottobre 2026 · DEV-035 · Commit locale e cattura desktop corretta

- **Commit locale:** `0b53d8f`, 114 file, cronologia iniziale preservata. Controllo Git dei file nuovi senza errori whitespace; le raccolte originali restano distinte.
- **Modificati:** screenshot desktop, rapporto implementazione, diario. La prima cattura via wrapper era limitata alla larghezza del pannello; sostituita con la cattura della pagina a 1366×900, aperta e verificata visivamente. Viewport ripristinata; nessun dato personale nelle evidenze.
- **Verifica documentale aggiornata:** 22 Markdown, 94 link locali, 58 tabelle, 3 JSON e zero errori; soltanto documentazione, non nuovi test dell'app.
- **Prossimo comando:** commit di queste evidenze/documenti, push non forzato e confronto SHA remoto/locale. Esito pubblicazione da verificare dopo l'esecuzione.

## 11 ottobre 2026 · DEV-036 · Accesso GitHub mancante

- **Commit locale:** `2c220d7` registra le evidenze finali dopo `0b53d8f`; working tree pulito prima della nuova istruzione documentale.
- **Esito push:** comando avviato, ancora in attesa di autenticazione e senza esito positivo. `git ls-remote` conferma main remoto al commit iniziale `675b42b`; `git credential-manager github list` non mostra account memorizzati. Non dichiarato caricamento riuscito.
- **Modificato:** guida avvio e diario, procedura di login/push senza token in chat, SHA da confrontare e divieto force. Documentata conservazione dei file di credenziali fuori docs.
- **Richiesta al committente:** completare login/consenso GitHub sul PC o scegliere di fare il push personalmente. Non è un rifiuto automatico di approvazione: manca l'autenticazione del servizio. Codice e istruzioni Supabase già pronti; nessuna credenziale consultata o salvata nel repository.

## 11 ottobre 2026 · DEV-037 · Revisione funzionale e autorizzazione deploy

- **Autorizzazioni:** il committente ha completato GitHub e richiesto deploy Vercel dopo il collaudo. Account GCM `ale01040` e main remoto `836ba1b` verificati: i commit precedenti risultano caricati. Nessun token letto o trascritto.
- **Applicati:** raccolte HTML/CSS/web design/form, regole generali; RF account/diario/import, ADR BFF/offline e WEB accessibilità/validazione. Skill React, Supabase e Vercel lette per la revisione e il deploy preview. Nessuna migrazione cloud autorizzata implicitamente dal deploy.
- **Modificati:** DecimalInput/test, database locale, contratto programma, AppProvider/App e diario. Separatore numerico finale resta digitabile ma invalido anche con Invio; backup in una transazione di lettura, controllo overflow del contatore locale; versione scheda >=1 coerente con SQL; query marcate per account e form rimontati al cambio account per evitare dati/form del precedente proprietario.
- **Osservazione:** pagina utente su 3001 ancora con bundle precedente; revisione della build corrente su 3002, nessun processo altrui interrotto. Prove aggiuntive e deploy ancora da eseguire.

## 11 ottobre 2026 · DEV-038 · Difetto responsive riprodotto e contenuti

- **Riproduzione:** a viewport 320×740, clientWidth 305 per scrollbar, ultimo link mobile a x=311,98: deborda di circa 7 pixel pur senza overflow del documento. Corretto Flex con cinque colonne Grid `minmax(0, 1fr)`; verificare tutti i link, non soltanto scrollWidth.
- **Modificati:** CSS globale/modulo, ProgramPage, ProgressPage, ProfilePage, diario. Titoli/testi lunghi possono spezzarsi e campi ridursi; singolare pesata; etichetta RIR italiana; editor dichiara l'applicazione dei campi a tutte le serie invece di nascondere questo limite.
- **Profilo preview:** quando il provider è assente mostra modalità dispositivo e limiti di trasferimento/backup senza form di login inutilizzabili o nomi di file tecnici nel percorso normale. Errori Google senza codici grezzi. Login resta disponibile quando il provider è configurato, da collaudare con account sintetici.
- **Prova dati:** pesata sintetica 70,5 salvata sul solo origin di test localhost:3002; nessun dato del profilo utente su 3001 alterato. Consistenza contratti/API e nuove prove da eseguire prima del deploy.

## 11 ottobre 2026 · DEV-039 · Adapter Vercel e test di regressione

- **Creati:** `apps/server/src/vercel.ts`, `api/index.ts`, `vercel.json`; **modificati:** config/server factory, test contratti/config/IndexedDB, ProgressPage, manifest/tsconfig/gitignore e diario.
- **Scelta:** frontend CDN e un'unica funzione Node per le stesse API Fastify. Nessuna riscrittura in Next.js né login browser con JWT: preservati BFF, HttpOnly e isolamento. Entry `ready`/`server.emit` dalla guida Fastify, origine da env piattaforma e non da Host. Cloud non configurato: preview dispositivo esplicita, rifiuta qualunque credenziale; produzione con account continua a richiedere tutti i valori e HTTPS.
- **Sicurezza:** CSP e noindex anche su asset statici; worker/HTML rivalidati, asset con hash cache lunga; `.vercel` ignorata. Messaggi di URL malformata depurati per non divulgare connection string. Il rate limiter per istanza richiederà protezione condivisa/WAF prima della beta account.
- **Fonti:** documentazione ufficiale Vercel Fastify/Node24/routing e guida Fastify serverless consultate; changelog Supabase letto (recupero Markdown via richiesta HTTPS dopo formato non supportato da web). Nessun GraphQL o adapter server deprecato utilizzato; cambi PostgreSQL/grant da ricontrollare nel gate cloud.
- **Regressioni aggiunte:** Invio numerico incompleto, versione scheda zero, overflow contatore con transazione annullata, separazione preview/connected e URL sensibile nel messaggio. Risultati da eseguire, nessuna certificazione implicita.

## 11 ottobre 2026 · DEV-040 · Isolamento UI e pacchetto preview minimo

- **Creati:** test UI account con lettura ritardata, `scripts/prepare-vercel-preview.mjs`; **modificati:** factory server e diario. Il test deve dimostrare che il vecchio risultato non riappare durante la lettura del nuovo account.
- **Pacchetto:** generazione in nuova directory ignorata, soli asset build ammessi e funzione BFF standalone CJS; niente `.env`, documenti, vault, Excel originale, password, credenziali Git/Vercel o node_modules Windows. Inventario e SHA server generati, zero reset/delete di directory esistenti. La preview rifiuta cloud; non equivale a beta con login.
- **Correzione adapter:** risoluzione path statico eseguita soltanto nel server che serve il frontend, evitando `import.meta.url` nel bundle CJS API-only. Nessuna rete nel dominio puro; adapter e packaging separati.
- **Esiti intermedi:** primo `npm run check` superato (20 unit/15 integration e build). Nuovi test/pacchetto ancora da collaudare. Formattazione ha cambiato solo i file elencati nelle voci DEV-037–DEV-040.

## 11 ottobre 2026 · DEV-041 · Collaudo del bundle e dipendenza esplicita

- **Creato:** `scripts/check-vercel-preview.mjs`; **modificati:** package.json/lockfile (esbuild 0.28.2 ora dipendenza dev esplicita, già presente tramite override), diario; formattazione dei nuovi file. npm segnala lo script postinstall esbuild non ancora presente nella allowlist npm11: installazione completata, nessun pacchetto da fonte estranea al registro.
- **Prova prevista:** HTTP reale su porta effimera locale con il bundle esatto, sessione anonima no-store, CSRF 403, login indisponibile 503, sync anonima 401 e API ignota 404. Nessuna chiamata al deploy remoto nel controllo.
- **Esiti:** 21 unit superati incluso cambio account con query ritardata; typecheck superato. Pacchetto minimo generato (20 asset), hash server in inventario ignorato. Non trascritte credenziali o dati personali nelle evidenze.

## 11 ottobre 2026 · DEV-042 · Risultato adapter e configurazione lint Node

- **Esito bundle:** tutte le cinque prove HTTP reali superate sul CJS standalone. Nessun token esposto e nessuna connessione cloud.
- **Modificati:** ESLint config (globali Node/fetch nativo per i soli script MJS), schema/esempio rigenerati, diario; Prettier sul nuovo script. Il lint iniziale ha correttamente segnalato globali MJS non dichiarati; corretto nella configurazione dedicata, senza disabilitare regole. Format check prima del formato sul file nuovo ha segnalato lo stile da uniformare.
- **Schema:** generazione da Zod rieseguita dopo il vincolo versione >=1. Le refinement semantiche continuano a richiedere validazione Zod; nessuna pretesa che il solo JSON Schema basti.

## 11 ottobre 2026 · DEV-043 · Conteggio catalogo e provenienza

- **Rilevato nel browser:** 26 esercizi in libreria, mentre il rapporto dichiarava 27. Verificato lo script: i 24 nomi originali includono la descrizione «più leggero, più ripetizioni», normalizzata nello stesso movimento; la fixture ha 25 posizioni e 23 movimenti distinti, più 3 a corpo libero. Nessun esercizio perso, target separati per posizione.
- **Modificati:** script fixture, output provenance rigenerato, ProgramPage, rapporto implementazione, diario. Conteggi calcolati, trasformazione dichiarata nel preview. Provenienza del template integrato controllata da stato interno, non dal campo source arbitrario di un JSON altrui.
- **Verifica intermedia:** check finale precedente superato, 21 unit + 15 integration, formato/build. Mobile barra ora entro clientWidth 305; libreria/ricerca/dettaglio senza controlli fuori bordo. Nuova build delle sole modifiche fixture/UI da verificare; test precedenti non attribuiti al codice successivo.

## 11 ottobre 2026 · DEV-044 · Focus dopo chiusura dialog

- **Rilevato:** chiusura con Escape del dettaglio libreria lasciava il focus alla pagina, anziché al controllo che lo aveva aperto. **Modificati:** Shared/Dialog e diario: trigger catturato prima di showModal e focus ripristinato al cleanup solo se ancora connesso; titolo con useId invece di ID globale ripetibile.
- **Verifica prevista:** chiusura con Escape e pulsante, focus al trigger dopo il rimontaggio effettivo; QA accessibilità ancora parziale, nessuna dichiarazione WCAG AA basata su questo singolo controllo.

## 11 ottobre 2026 · DEV-045 · Procedura Vercel e pacchetto pubblicabile

- **Creato:** `docs/operazioni/DEPLOY_VERCEL.md`; **modificati:** indici README, script package/check, diario. Due tentativi di patch rifiutati per contesto parziale dell'indice, nessun file alterato; applicata patch corretta dopo lettura. Filename function `index.js` con type commonjs, formato CJS invariato, routing `/api/index`.
- **Guida:** cosa è pubblicato, isolamento origini/device-only, pro/contro, comandi riproducibili, cinque prove HTTP, ownership tramite claim da non pubblicare in Git, cache/CSP, gate cloud e pool/rate limiter serverless. Nessun segreto o link di gestione nel repository.
- **Controlli restanti:** ultima build UI/fixture e focus browser, format/lint, inventario pacchetto e deploy. Autorizzazione Vercel esplicita confermata; non serve chiedere di nuovo il permesso di caricare il codice già richiesto.

## 11 ottobre 2026 · DEV-046 · Navigazione e decisioni allineate

- **Rilevato:** dalla pagina Profilo scorsa alla home, scrollY restava 332 e il titolo poteva risultare fuori vista. **Modificati:** App scroll reset su nuovo pathname, titolo Profilo coerente quando login assente, registro DEC-27, UX (nome TR LAB già confermato), architettura e diario; checker locale DEC portato a 27.
- **Trade-off:** reset semplice delle nuove sezioni, niente animazione o cambio dello scroll alla digitazione/rerender. Il ripristino della posizione precedente con Back richiede futura gestione storico, non dichiarato implementato.
- **Prove:** tema chiaro/scuro del solo origin sintetico, pulsanti Profilo almeno 44px, nessun controllo fuori bordo a 320. Tema scuro ripristinato. Appunti/reference originali invariati; nessuna modifica alle preferenze del profilo utente 3001.

## 11 ottobre 2026 · DEV-047 · Serie leggibili e concordanze italiane

- **Rilevato nel browser:** a 320px il carico aveva un input largo circa 34px; nessuna uscita dal bordo, ma lettura e tocco difficili. **Modificati:** WorkoutPage, CSS, TodayPage, ProfilePage, App e diario: sotto 400px serie su più righe, tre campi più ampi con etichette visibili e azioni separate. Anche i risultati conclusi hanno unità visibili; disposizione tabellare conservata oltre il breakpoint.
- **Testi:** conteggi singolari/plurali corretti per esercizi, registrazioni, serie, coda e conflitti; verbo coerente nel riepilogo di una registrazione mancante. Non aggiunti test che ripetano i testi statici; collaudo browser e controlli TypeScript/lint/build da eseguire dopo formattazione.

## 11 ottobre 2026 · DEV-048 · Rapporto e prove finali dell'interfaccia

- **Creati:** `docs/qualita/REVISIONE_APP.md`, evidenze `TR-LAB-diario-mobile.jpg` e `TR-LAB-revisione-desktop.jpg`; **modificati:** indici docs e stato implementazione, diario. La prima acquisizione mobile dopo resize era ritagliata: sostituita dopo osservazione stabile con la viewport effettiva completa. Le evidenze contengono soltanto dati sintetici. Tipi CSS rigenerati automaticamente dal typecheck dopo DEV-047.
- **Esiti ultime modifiche:** formato, typecheck, lint, build superati; entry 480,90kB/151,51kB gzip. Cinque controlli bundle precedenti superati; da ripetere una volta sul pacchetto finale da caricare. Warning Workbox di deprecazione registrato, nessun errore build.
- **Browser:** 320px diario completo con ricarica e chiusura, 390px risultati/focus Escape e Chiudi, 768px programma/progressi/profilo, 1366px home/programma; nessun controllo fuori bordo nelle viste misurate. RIR zero conservato, target originale RIR2 distinto dal risultato. Console finale senza warning/errori. Viewport ripristinata, archivio utente sulla porta 3001 invariato.
- **Consegna:** rapporto separa 36 test suite, 5 prove bundle, verifiche manuali e gate aperti; nessuna dichiarazione di app completa, assenza universale di bug o WCAG AA. Deploy ancora da eseguire, link di gestione non destinato al repository.

## 11 ottobre 2026 · DEV-049 · Pacchetto finale e verifica della consegna

- **Generati:** nuovo pacchetto minimo ignorato `.analysis/vercel-preview-1791724350920`, 19 asset (chunk condiviso incorporato dopo ultimo import), funzione CJS SHA-256 `e4e729f7d7669f108ea6ba04dc3f3783e1255930400e123f35e9faf8dbf81bf7`; inventario senza documenti, dati utente o ambiente. **Modificato:** diario.
- **Controlli:** cinque prove HTTP locali sul bundle finale superate, format check superato. Verifica documentale: 24 Markdown, 111 link locali, 62 tabelle, 3 JSON, 35 riferimenti QA, zero errori; hash Excel originale invariato. Non equivale all'esecuzione dei 35 casi QA.
- **GitHub:** autenticazione funzionante; main remota confermata al commit `836ba1b` prima del caricamento. Stage/scan/commit/push delle correzioni e deploy da eseguire in sequenza; nessun force push, nessuna migrazione cloud.
