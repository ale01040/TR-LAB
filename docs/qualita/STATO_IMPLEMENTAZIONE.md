# TR LAB — stato dell'implementazione e collaudo

12 ottobre 2026 · Versione 0.1.0 alpha, con Supabase collegato a locale/Preview/Production HTTPS Vercel. [Dominio stabile verificato](RILASCIO_DOMINIO_STABILE.md). Questo rapporto distingue codice presente, prove eseguite e requisiti aperti. Non è una certificazione di sicurezza, accessibilità o validazione scientifica.

Aggiornamento: [revisione app e layout](REVISIONE_APP.md), [integrazione reale](INTEGRAZIONE_SUPABASE.md), [procedura Vercel](../operazioni/DEPLOY_VERCEL.md). La preview non chiude tutti i gate cloud della versione completa.

## 1. Cosa è disponibile

| Ambito / requisiti | Codice presente | Limite attuale |
| --- | --- | --- |
| Oggi e programma | Editor giorni/esercizi/serie/carichi/RIR/recupero/note/superserie/ciclo, bozza/approvazione/nuove versioni | Calendario e rinvio assistito da completare; alcuni target per serie/lati importati non hanno ancora editor avanzato |
| Struttura Excel | Fixture A/B/C, 25 posizioni, 7 settimane; 24 nomi originali diventano 23 movimenti catalogo dopo normalizzazione dichiarata | Non parser XLSX; dati personali e protocolli extra individuali esclusi |
| Diario offline | Avvio da approvato, snapshot ciclo, risultati per lato, RIR 0, salvataggio, saltate, timer e chiusura anche parziale | Non audio/background garantiti; quota/eviction ed errori storage da ampliare sui telefoni |
| Peso e misure | Registrazioni in g/mm, date/lati, grafico e tabella | Analisi avanzate e finestre confrontabili da completare |
| Nutrizione | Target manuali kcal/macro, decorrenza e controllo 4/9/4 | Nessun calcolo automatico di obiettivi ancora attivo |
| Catalogo | 26 esercizi iniziali (23 movimenti adattati + 3 a corpo libero), ricerca/filtro/dettagli | CRUD esercizi privati, media e varianti avanzate da completare |
| Copia e recupero | JSON v1, anteprima, ID nuovi, note opt-in, export locale di base/overlay/coda/conflitti | Link privati, export completo account/CSV, recupero importato e cancellazione cloud da implementare |
| Auth e sync | BFF collegato, ruolo minimo e RPC/RLS/grant/consenso verificati sul cloud, ricevute/pull; login Preview riuscito riferito dal committente, Site URL/callback salvati | Login positivo Production/email/recovery/refresh/multi-device/restore aperti; Google e SMTP da configurare |
| Progressioni/AI | Contratti, fonti candidate e una funzione pura candidata sotto test | Nessun generatore o assistente attivo, nessuna modifica automatica ai target |

Il codice implementa sezioni della roadmap in un percorso verticale anticipato. Le funzioni manuali locali restano utilizzabili durante l'indisponibilità del servizio online. Questo non modifica il perimetro della versione completa e non chiude F3/F5 sulla base dei soli mock/PGlite.

## 2. Prove realmente eseguite

| Verifica | Esito / evidenza | Portata |
| --- | --- | --- |
| TypeScript strict | Superato con `npm run check` | Sorgenti inclusi nel progetto TS; non equivalenza a correctness runtime |
| ESLint | Superato | Regole JS/TS e hooks, non revisione completa della sicurezza |
| Unit | 24 test superati, 7 file | Dominio/ciclo/progressione candidata, contratti, crypto, input, account/isolamento UI, TLS portabile, pool serverless e precedenza dell'origine stabile Production |
| Integration API | 6 test superati | Fastify reale in-process, payload/Origin, anonimo, readiness503 e Google disabilitato senza flusso |
| Integration IndexedDB | 5 test superati | Persistenza/isolamento, base-overlay/ricevute, conflitti conservati, immutabilità anche offline, overflow contatore con rollback |
| Integration SQL | 8 test superati | Migrazioni come non-superuser, runtime minimo, claim JSON/null, RPC/RLS/grant, consenso/snapshot/retry, revisioni oltre 2^53 e input ostili |
| Build e avvio | Web/PWA/server compilati; bundle server avviato realmente su loopback; CJS Vercel verificato su HTTP reale con 5 controlli | Esito del deploy HTTPS registrato separatamente; nessuna beta account implicita |
| Formattazione | Prettier check finale superato, compresi schema/esempio e configurazioni TS root | Sorgenti/configurazioni; Markdown verificato separatamente |
| Dipendenze | `npm audit --json`: 0 advisory sul lockfile all'11 ottobre 2026 | Fotografia degli advisory disponibili, non assenza universale di vulnerabilità |
| Config locale | valid true / supabaseConfigured true; preflight collegato, RLS/RPC/sessioni presenti e non-superuser | Collegamento reale; login positivo locale non provato |
| Database cloud | RPC/consenso/retry/pull/isolation superati in transazione annullata; grant runtime su connessione reale | Non equivale a E2E Auth/PostgREST |
| Vercel cloud | Preview READY con undici controlli; Production READY, dodici controlli su stage e dominio stabile, quattro GET pubbliche senza credenziali piattaforma | Nessun nuovo login positivo automatico; email, due dispositivi, telefoni e carico da provare |
| Entry Vercel isolato | Sei prove HTTP del wrapper e bundle generati, senza sorgenti/workspace o SDK installati; incluso in check/CI | Regressione aggiunta dopo API500 della build Git; test remoto necessario per il packaging del provider |

La prima fase del debug ha rilevato errori SQL, grant e bundle runtime che la sola lettura non aveva trovato; corretti e rieseguiti, con risultati registrati nel diario. Non nascondere quei fallimenti come se i test fossero stati verdi fin dall'inizio.

Le suite Windows richiedono sottoprocessi Vite/esbuild: eseguite con autorizzazione fuori dal sandbox dell'agente dopo `spawn EPERM`. Il progetto non contiene bypass dei controlli o disabilitazioni di validazione per far passare i test.

## 3. Prove browser e loro limiti

Browser in-app Chromium, dati sintetici su origine `127.0.0.1:3001` separata da quella di utilizzo: creazione bozza con carico 12,5 kg, approvazione esplicita, avvio, serie 8 ripetizioni/RIR 0, salvataggio e timer. Server spento, ricarica riuscita dalla cache, campi/snapshot/timer conservati; nuova serie 9 ripetizioni e chiusura salvate senza server. Prova registrata in DEV-019. Non è una prova di modalità aereo su telefono, Auth o sync remota.

Nuova build verificata su `localhost:3002` per non interrompere il processo già sulla porta 3001: desktop 1366×900, nessun overflow orizzontale della pagina iniziale; anteprima Excel con adattamenti visibili. Aggiornamento PWA notificato e accettato senza campi in corso; esempio JSON v1 importato con anteprima/conferma/editor, carico 12,5 digitato carattere per carattere e salvato come bozza sintetica. I browser di origini diverse hanno archivi separati: nessun trasferimento implicito di dati del committente.

Le prove browser sono **manuali**, non una suite E2E Playwright automatica già completata. Mobile emulato non equivale a un iPhone/Android reale. Stampa CSS presente ma PDF e impaginazione multipagina da collaudare. Icone installazione/iOS da completare prima di dichiarare installabilità completa.

Verifica finale anche a 390×844: pagina senza overflow orizzontale, navigazione mobile, carico 12,5 kg e target leggibili nel riepilogo; singolare/plurale corretto. Dialog di copia verificato con note personali escluse di default. Screenshot solo di dati sintetici: [desktop](evidenze/TR-LAB-desktop.jpg), [mobile](evidenze/TR-LAB-mobile.jpg). Viewport temporanea ripristinata dopo il controllo. Il primo tentativo di screenshot full-page non era supportato: sono state salvate le viewport effettivamente verificate.

## 4. Raccolte applicate e controlli aperti

| Fonte letta / WEB | Applicazione nel codice | Ancora aperto |
| --- | --- | --- |
| Indici e capitoli generali di entrambe le raccolte | Priorità istruzioni/DEC, commenti mirati, fonti originali conservate | Accettazione UX finale e manutenzione dei riferimenti |
| Appunti HTML/CSS + guide HTML/CSS/web design | HTML semantico italiano, Grid/Flex/rem, focus, dialog nativo, temi e stampa | AA, contrasto completo, tastiera/screen reader, validatori e stampa multipagina |
| Appunti JavaScript + guide JavaScript | Moduli TS, contratti, funzioni pure, lifecycle, input che conserva virgola/null/zero | Error boundary e gestione storage/quota su tutte le schermate |
| Appunti dati/backend + guide sicurezza/stato/sessioni/cookie | Supabase DEC-18, query parametrizzate, RLS/RPC, HttpOnly/CSRF, hash DEC-23 | Provider reale, ruolo BFF minimo, revoca globale, rotazione, HTTPS e restore |
| Guide struttura/performance/UX | Pagine separate, cache asset esplicita, stato locale/sync, nessuna cronologia fittizia | Budget performance su telefoni reali e test aggiornamento durante seduta |
| Guide SEO | noindex/no-store dell'area privata, nessun dato personale esposto per SEO | Pagine pubbliche separate e inventario Google Search Central pertinente |

Il refuso `use strinct` non è copiato nel codice; i moduli ESM applicano strict mode. Argon2id era un suggerimento, le password sono gestite dal provider. DEC-19 sostituisce il commento per ogni riga; DEC-23 autorizza digest differenti tra DB/server. Il requisito HttpOnly è implementato nel BFF ma il collaudo completo resta OPEN-06. Nessuna raccolta originale è stata modificata.

## 5. Prossime consegne in ordine

1. **Completamento Supabase F2–F3 / OPEN-05–OPEN-07:** schema/ruolo/connessione e callback già configurati; completare [Auth](../operazioni/COMPLETARE_AUTH.md), SMTP, login positivo Production, due account, Google/recupero, cookie/CSRF/refresh concorrente e lease. Riconciliare baseline migrazioni prima di db push, predisporre staging separato. Evidenza: E2E provider reale e controlli account fuori UI.
2. **Completamento sync F5:** scenari offline su due device, dipendenze/operation-result, paginazione watermark, ricevute rifiutate stabili, cambi account e logout offline; confronto/risoluzione esplicita dei conflitti, restore con nuovo epoch, import sicuro del recupero e gestione quota. Evidenza: nessun log perso/duplicato, nessun rebase silenzioso.
3. **Editor/catalogo/import F4 / WP-07:** CRUD privato, editor target per serie/lato/tempo, convenzioni macchina e assistenza, calendario/rinvii, parser XLSX con limiti ZIP/celle/formule e report; fixture reali/anomale. Schema normalizzato additivo quando necessario, nessuna riscrittura dello storico approvato.
4. **Motore F6:** corpus selezionato con diritti e regole forza/corpo libero/nutrizione revisionate; generatore a vincoli, proposta versionata con prima/dopo/motivo/dati mancanti; validazione server, consenso dell'utente e scadenza su revisione cambiata. ALG/QA e simulazioni devono passare prima dell'attivazione.
5. **Progressi/dati F7–F8:** finestre e confrontabilità, trend, volume, obiettivi proposti e manuali distinti, link per copia indipendente, export account/CSV/PDF, retention/cancellazione e recupero esercitato.
6. **Assistente F9:** adapter provider, corpus consentito, citazioni, valutazione italiana, prompt injection/dati A-B; output può soltanto creare una proposta validata e nessun modello può premere l'approvazione.
7. **Beta/rilascio F10–F11:** E2E automatici, accessibilità e telefoni reali, HTTPS, iconografia installazione, aggiornamenti PWA, test carico/backup/restore, osservabilità senza segreti, testi privacy/supporto e rilascio reversibile. DEC-30 autorizza l'alpha sul dominio stabile; non chiude questi gate né costituisce collaudo dell'apertura agli amici con email funzionanti.

I dettagli e tutti i requisiti restano nella [roadmap completa](../ROADMAP_SVILUPPO.md). Gli esempi scientifici sono candidati: una formula compilata o un test unitario non costituiscono approvazione del metodo.

## 6. Consegna e riproduzione

[Avvio/Supabase](../operazioni/AVVIO_LOCALE.md), [scelte del codice](../architettura/SCELTE_IMPLEMENTAZIONE.md), [diario](../DIARIO_SVILUPPO.md), [JSON Schema](../../schemas/workout-program.v1.schema.json), [esempio v1](../../examples/programma.v1.json).

Il repository conserva le raccolte web, codice, lockfile, quattro migrazioni, fixture depurate e la CA pubblica documentata in certificates/. Esclude `.env`, configurazioni/certificati locali, verifier privati, cache, `node_modules`, build, originali Excel personali e vault privato. Non include licenze inventate per materiale altrui. Le modifiche alle API future devono documentare compatibilità dei client offline e aggiornare nello stesso commit specifiche/test/diario.

La verifica documentale precedente comprendeva 22 Markdown, 94 link locali, 58 tabelle, 3 esempi JSON e riferimenti a 35 casi QA, zero errori automatici rilevati; hash e conteggi Excel confermati. L'esito sul pacchetto ampliato è registrato nel diario. Questo controllo non dimostra che i 35 casi QA siano già passati sul prodotto. Spazi finali presenti nelle due raccolte originali sono preservati, non corretti silenziosamente.
