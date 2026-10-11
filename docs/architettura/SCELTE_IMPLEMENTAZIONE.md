# TR LAB — decisioni dell'implementazione alpha

11 ottobre 2026 · Complemento al [registro tecnico](SCELTE_TECNICHE.md). Gli ADR di pianificazione restano i criteri della versione completa. Qui si descrive il codice effettivo, senza presentare funzionalità future come disponibili.

## 1. Strumenti effettivi e alternative

È ora presente anche l'adapter preview Vercel: frontend CDN + stessa API in una funzione Node, senza cloud configurato. Motivazioni, alternativa persistente, pool/rate limiter e gate connected nella [procedura Vercel](../operazioni/DEPLOY_VERCEL.md). La riga Fastify descrive il server locale; il deploy non certifica ancora refresh/sync sul provider reale.

| Scelta | Motivazione nel codice | Costi / alternativa / condizione di revisione |
| --- | --- | --- |
| React 19, TypeScript strict, Vite 8 | Cinque sezioni responsive, editor e diario condividono contratti; pagine separate con lazy/Suspense | Routing, storage e server composti esplicitamente. Next.js utile se SSR/contenuti pubblici diventano centrali; non necessario per questi flussi locali |
| Fastify 5 su Node 24 | BFF persistente per cookie HttpOnly, controlli HTTP, nonce e rinnovi; stesso linguaggio dei contratti | Processo da gestire e distribuire. Express è valido ma non offre un vantaggio concreto qui; serverless richiede nuova prova di pool/refresh/limiti |
| Supabase Auth + PostgreSQL | DEC-18: scelta del committente, transazioni/RLS e Auth gestito | Quote, configurazione SMTP/OAuth e dipendenza dal provider. Non si riapre MySQLi come scelta tecnica |
| Dexie 4 / IndexedDB | Base remota e overlay locale separati, dato + intenzione atomici, isolamento per account | Quota/eviction, migrazioni e conflitti da gestire. localStorage non offre queste transazioni; CRDT non richiesti per copie indipendenti |
| Zod 4 e schemi SQL | Contratti condivisi validano input, snapshot, null, lati e limiti; DTO di uscita controllati | Validazioni SQL distinte da confrontare nei test. JSON Schema generato è documentazione della forma, non sostituzione delle regole semantiche |
| CSS Modules / custom properties | Stili espliciti, temi, Grid/Flex, stampa e adattamento palestra | Richiede controllo accessibilità; nessun kit acquisito senza prova. Tailwind non risolve i requisiti di diario/stampa da solo |
| Fetch e API same-origin | Un solo percorso per Auth/sync, nessun SDK Supabase nel browser | Timeout ed esiti sconosciuti da gestire. TanStack Query aggiungerebbe una seconda cache senza un bisogno misurato |
| Workbox injectManifest | Cache soltanto asset/navigation, niente risposte `/api`; aggiornamento su scelta esplicita | PWA installabile da collaudare su telefoni reali; precache comprende anche chunk lazy. Non promettere sync o timer affidabili in background |
| pg per session store | Transazioni e lock per coordinare refresh; query parametrizzate | Ruolo runtime limitato da preparare prima del pubblico. ORM non elimina RLS, consenso o controllo delle ricevute |
| Vitest / Testing Library / PGlite | Prove di dominio, input, IndexedDB, HTTP e PostgreSQL reale incorporato | PGlite non contiene GoTrue/PostgREST. Browser verificato manualmente; Playwright/axe presenti come strumenti, suite E2E automatica non ancora implementata |

Versioni esatte in manifest e `package-lock.json`, toolchain in `engines`/`packageManager`. Esbuild 0.28.2 è un override motivato da un advisory Windows del vecchio dev server; build e test ne verificano la compatibilità con tsup. Audit corrente senza advisory rilevati, non garanzia assoluta. Non eseguire aggiornamenti major o `audit fix --force` alla cieca.

## 2. Struttura effettiva e regole di codice

```text
apps/web/src/pages/          Oggi, Programma, Seduta, Progressi, Libreria, Profilo
apps/web/src/components/     provider, dialog nativo, input decimali, funzioni UI
apps/web/src/data/           Dexie, sync, catalogo e fixture Excel depurata
apps/web/src/styles/         temi, layout, stampa e tipi CSS generati
apps/server/src/             config, Auth, HTTP/RPC, crittografia e avvio
packages/contracts/src/      schemi Zod / tipi / comandi / DTO
packages/domain/src/         regole pure, risoluzione ciclo e transizioni locali
supabase/migrations/         SQL, grant, RPC, ricevute, change log e RLS
tests/unit/                  dominio, contratti, input, crypto, config, account
tests/integration/           IndexedDB, API, SQL/RLS
schemas/ ed examples/        formato JSON v1 pubblicabile e fixture sintetica
scripts/                    tipi CSS, schema, chiave nuova, config e preflight
```

La struttura `features/modules/adapters/worker` della pianificazione è il punto d'arrivo quando cresce il numero di responsabilità; non si creano moduli o worker vuoti. Nessuna cartella attuale giustifica import di rete/SDK nel dominio. I pacchetti puri possono importare soltanto tipi/utility pure dei contratti. Componenti UI non chiamano il database remoto direttamente.

Scrivere funzioni piccole con input espliciti, validazione ai confini, messaggi italiani e `unknown` per input non verificati. Vietati cast per sopprimere errori reali, `any` di comodo, segreti nel frontend, catch che fingono salvataggi, fallback null→zero e commenti per ogni riga. Commentare motivazioni, invarianti, consenso e sicurezza; mantenere i riferimenti ai test nel rapporto/ticket. Il file dei tipi CSS è generato: aggiornare CSS e generatore, non correggere la dichiarazione a mano.

Per una nuova modifica: leggere capitolo/spec pertinenti → collegare RF/ADR/WEB/caso QA → definire l'invariante → implementare nel modulo appropriato → provare comportamento e casi ostili → aggiornare spec e diario. I test devono verificare effetti, non replicare il codice. Le prove su dati sintetici non giustificano attivazione di regole nutrizionali o scientifiche non revisionate.

## 3. Adattamento del modello dati: aggregati JSONB

L'alpha persiste programmi, sedute, serie, misure e target in `public.tr_lab_records`: colonne owner/id/kind/revision/parent, payload JSONB validato e riferimento composito owner+parent. Le serie hanno un indice univoco per sessione/prescrizione/target/lato. Non è la piena normalizzazione delle tabelle obiettivo del [modello dati](../specifiche/MODELLO_DATI.md).

**Perché ora:** snapshot completi preservano i target scelti; i sette comandi e il protocollo di ricevute sono verificabili senza anticipare tutti i moduli futuri. JSONB non significa payload libero: chiavi, tipi, limiti, stato, relazioni e consenso sono verificati nella RPC. Le query generiche degli utenti non hanno permessi di scrittura; RLS limita le letture all'owner derivato da Auth.

**Svantaggi:** programmi e snapshot ripetono metadati degli esercizi; controlli strutturali sono anche in SQL; reporting e indici interni richiedono lavoro; ogni SaveSet incrementa la revisione della seduta ed emette anche il suo snapshot, con costo di storage/rete. Nessuna retention o compattazione del change log è attiva: non introdurla senza snapshot/bootstrap/restore provati.

**Alternativa:** schema completamente normalizzato fin dall'inizio, utile per integrità tabellare e analisi complesse, ma più relazioni/mapping nel primo protocollo offline. **Condizione di revisione:** prima del catalogo privato condiviso, query analitiche pesanti, proposte persistenti o crescita misurata dei log. Migrare in modo additivo, mantenendo DTO/ID, backfill verificato, compatibilità client offline e nuovo epoch solo quando effettivamente necessario. Non convertire automaticamente programmi approvati in nuove prescrizioni.

Questo adattamento è una scelta tecnica interna documentata (DEC-24); non elimina requisiti di isolamento, versionamento, catalogo o portabilità. Tabelle di proposte, conoscenza, condivisioni per link, job e cancellazione account non sono ancora presenti.

## 4. Auth: BFF, cookie e permessi

Il server riceve password durante login/signup e le inoltra a Supabase Auth senza salvarle. Access/refresh token restano cifrati in `tr_lab_private.sessions`, cookie opaca HttpOnly, hash SHA3-256 del token opaco, nonce CSRF per le mutazioni, Origin esatta e header applicativo per le POST. La connessione pg gestisce solo archivio sessioni/flussi; il dominio remoto viene modificato tramite SDK server con JWT dell'utente e RPC.

Refresh serializzato con lock di riga; verifica del provider prima di utilizzare la sessione. Un errore transitorio Auth non viene interpretato come revoca definitiva. Stato PKCE cifrato, verifier associato a cookie HttpOnly e callback con stato; recupero richiede cambio password prima delle RPC di dominio. Cambio password revoca altre sessioni BFF. Le richieste sync hanno anche precondizione account, così un worker di A non può inviare dati sotto la cookie di B.

SHA-256 nel ledger SQL e SHA-3 nel server rispettano DEC-23. Non sono algoritmi per le password. AES-256-GCM gestisce cifratura con nonce casuale/tag; i cursori HMAC sono legati a owner, epoch e contatori esatti. Nessuna crittografia inventata per le progressioni.

In HTTP loopback la cookie non può essere Secure; produzione richiede HTTPS e prefisso `__Host-`. Prima del pubblico: ruolo pg minimo, verifiche login/email/Google/refresh/revoca/CSRF reali, session cleanup/rotazione, logout globale e processo cancellazione dati. Il logout offline conserva una richiesta di revoca e sospende il sync; non promette revoca istantanea del provider mentre il PC è offline.

## 5. Offline e consenso

`SaveProgramDraft`, `ApproveProgram`, `StartWorkout`, `SaveSet`, `FinishWorkout`, `SaveMeasurement`, `SaveNutritionTarget`. Gli ultimi due sono registrazioni manuali nell'alpha. Approvazione distinta dalla bozza; una scheda approvata si modifica con una nuova versione. La seduta conserva lo snapshot della settimana risolta. I risultati non riscrivono il programma.

Dexie salva overlay+outbox nella stessa transazione. Revisioni/sequenze server sono stringhe decimali, confrontate con BigInt: nessuna perdita oltre 2^53. Nuove intenzioni dipendono dalla ricevuta dell'operazione precedente e dagli aggregati parent; SaveSet restituisce revisioni sia del set sia della seduta. Retry con stesso operation ID e stesso payload riusa la ricevuta; contenuto diverso viene respinto.

Conflitti conservati e non forzati; l'alpha mostra conteggio ed export di recupero. La risoluzione guidata, il rebase esplicito e il recupero dopo restore sono consegne ancora aperte: non usare last-write-wins per completare il protocollo in modo rapido. Epoch diverso blocca l'invio e chiede recupero, non converte automaticamente la coda.

Le serie aggiuntive del ciclo sono determinate soltanto dai target già approvati, con ID UUIDv8 deterministici e verifica di collisioni uguale in JS/SQL. Non si tratta di nuove proposte generate da AI. La funzione candidata di doppia progressione è soltanto codice puro sotto test, non una funzione operativa attiva.

## 6. PWA, browser e distribuzione

Build senza source map pubbliche; pagine lazy riducono il chunk iniziale, tutti i chunk applicativi sono precached per mantenere il diario offline. Nessuna cache di `/api`. Aggiornamento service worker su scelta esplicita; mantenere i campi salvati prima della ricarica. Il timer conserva una scadenza, non promette audio/background sul telefono.

Il server bundle ESM include i contratti workspace ed esternalizza le dipendenze runtime: il primo bundle monolitico aveva fallito l'avvio per require dinamico. Distribuire con installazione riproducibile delle dipendenze server; la compilazione sola non dimostra l'avvio. Non copiare soltanto `dist/index.js` su un host vuoto.

CI predisposta Windows/Linux con azioni ufficiali fissate a SHA, permessi contents read e nessun deploy/segreto. Le prove locali superate non sono una dichiarazione di CI remota verde. Hosting, dominio, SMTP, HTTPS, telefoni e backup cloud restano gate. Non pubblicare dati di test personali nelle schermate di prova.

## 7. Compiti per il prossimo sviluppatore

Usare [rapporto e ordine delle prossime consegne](../qualita/STATO_IMPLEMENTAZIONE.md#5-prossime-consegne-in-ordine), [roadmap completa](../ROADMAP_SVILUPPO.md), [avvio Supabase](../operazioni/AVVIO_LOCALE.md) e [diario](../DIARIO_SVILUPPO.md). Chiudere prima integrazione e recupero sync; successivamente attivare automazioni soltanto con regole/fonti revisionate e test di consenso. L'app non deve dipendere da accesso continuo al vault privato del committente.
