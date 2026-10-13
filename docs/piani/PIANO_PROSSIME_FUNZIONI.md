# TR LAB — piano esecutivo delle prossime funzioni

13 ottobre 2026 · Versione 1.1 · Stato: **implementazione locale parziale e prove locali eseguite; gate di ambiente, dominio e rilascio aperti**. Baseline esaminata: commit `281a6f60ce70b4ea876e3598172fe8f9f9d685b4`. Il [rapporto dell'incremento](../qualita/INCREMENTO_SCHEDE_SYNC_MOTORE.md) distingue i ticket avviati da quelli completati; [procedura di collaudo](../operazioni/INCREMENTO_SCHEDE_SYNC_MOTORE.md).

## 1. Risultato da ottenere e documenti da usare

Una persona importa direttamente la propria scheda Excel, risolve le ambiguità, approva il programma, lo organizza nel calendario e completa una seduta senza rete. Alla riapertura e al ritorno online ritrova i dati sul PC. Un altro account non può leggerli. Il generatore e le progressioni preparano modifiche motivate, applicate soltanto dopo una conferma esplicita sul contenuto esatto.

Questo piano rende eseguibili parti di F3–F6 della [roadmap generale](../ROADMAP_SVILUPPO.md); non sostituisce il [perimetro completo](../PIANO_OPERATIVO.md), le DEC o le raccolte originali. AI conversazionale, nutrizione automatica e altre fasi rimangono nel progetto generale, senza diventare prerequisiti nascosti di queste consegne.

| Documento | Contenuto autorevole in questo incremento |
| --- | --- |
| Questo piano | Ordine, scelte trasversali, responsabilità, compatibilità e gate |
| [Collaudo sincronizzazione](COLLAUDO_SINCRONIZZAZIONE.md) | Ambiente, due account/due dispositivi, guasti, recupero e prove ripetibili |
| [Schede, Excel, catalogo e calendario](SCHEDE_EXCEL_CATALOGO_CALENDARIO.md) | Flussi, contratti da aggiungere, mapping, calendario e ticket |
| [Generatore e progressioni](GENERATORE_E_PROGRESSIONI.md) | Consenso, motore, fonti di dominio, automatismi e ticket |
| [Ricerca tecnica](FONTI_TECNICHE.md) | Fonti ufficiali consultate, implicazioni e limiti delle conclusioni |

Le nuove decisioni `NEXT-D*` sono raccomandazioni tecniche motivate secondo DEC-24, non nuove dichiarazioni del committente. I ticket `SYNC-*`, `SCH-*`, `MOT-*` tracciano l'incremento, comprese le parti ancora aperte; gli identificativi QA/ALG rimandano alle matrici già esistenti. Non confondere un ticket pianificato con una funzionalità pubblicata o un gate chiuso.

## 2. Punto di partenza verificato nel repository

| Area | Presente | Da completare per questa richiesta |
| --- | --- | --- |
| Identità | BFF Fastify, Supabase Auth, cookie di sessione opaco HttpOnly, controlli account e CSRF | Due identità reali di prova, rinnovo concorrente/revoca, collaudo positivo nell'ambiente isolato |
| Offline/sync | Dexie con base/overlay/outbox/ricevute/conflitti; sette comandi; sequenze e revisioni stringa; guardia epoch | E2E con provider, telefoni reali, retry coordinato tra tab, risoluzione guidata e recupero |
| Schede | Editor per target, giorni copiabili/riordinabili, approvazione, ciclo e snapshot seduta | Esercizi privati, calendario, archiviazione e modalità a tempo |
| Import | JSON v1 e fixture già adattata dal file originario | Lettura di veri file `.xlsx`; il pulsante del modello non è un parser Excel |
| Motore | `evaluateProgression` pura, etichettata `double-progression-candidate-1` | Regole revisionate, generatore, proposte persistenti, decisioni e applicazione atomica |
| Dati | `tr_lab_records` con payload JSONB chiusi e validati, RPC e RLS | Nuove entità e migrazioni additive, compatibilità degli stream e dei client offline |

Punti di ingresso reali: [contratti](../../packages/contracts/src/index.ts), [dominio](../../packages/domain/src/index.ts), [database locale](../../apps/web/src/data/database.ts), [sync](../../apps/web/src/data/sync.ts), [Auth](../../apps/server/src/auth.ts), [scelte dell'alpha](../architettura/SCELTE_IMPLEMENTAZIONE.md). Lo stato disponibile non dimostra da solo correttezza in concorrenza.

Il [rapporto precedente](../qualita/VERIFICA_2026_10_13.md) riporta 41 test unitari, 20 di integrazione e 6 controlli dell'artefatto Vercel, oltre a prove locali/browser. Questi sono **esiti precedenti**, non nuove esecuzioni di questo piano; non equivalgono al collaudo cloud con due account e telefoni.

## 3. Scelte tecniche e compromessi

| ID | Scelta per lo sviluppo | Perché / vantaggio | Costo, alternativa e criterio di revisione |
| --- | --- | --- | --- |
| NEXT-D1 | Conservare React/Vite, Fastify, Supabase, Dexie e comandi idempotenti | Riusa il codice, conserva HttpOnly e il lavoro offline; limita le migrazioni | Sync esplicita da mantenere. Realtime può segnalare disponibilità di dati, non sostituire ricevute/cursori. CRDT rinviati: la collaborazione simultanea sullo stesso documento non è richiesta |
| NEXT-D2 | Import XLSX iniziale nel browser, in Web Worker dedicato, poi comandi validati | File sul dispositivo, anteprima anche senza rete dopo download del modulo, nessun invio del foglio completo | Memoria/limiti dei telefoni da provare. Il worker non è una sandbox di sicurezza. Job server isolato resta evoluzione per file più grandi; niente fallback remoto invisibile |
| NEXT-D3 | Conservare partizioni locali per account nell'attuale Dexie, con accessi circoscritti e prove obbligatorie | Evita una migrazione distruttiva solo per rinominare database; mantiene coda e ricevute | Non è isolamento contro chi controlla il browser. Repository senza query globali personali, reset dei listener e prove A→B obbligatori; database fisici distinti se l'audit dimostra un beneficio concreto |
| NEXT-D4 | Nuove tabelle dedicate per catalogo privato, pianificazioni e proposte; conservare gli aggregati storici esistenti | Vincoli/FK/indici sui nuovi moduli senza riscrivere tutti i programmi | Due rappresentazioni da collegare attraverso un solo protocollo. Nessuna seconda copia autorevole dello stesso oggetto; normalizzazione del vecchio storico solo se giustificata |
| NEXT-D5 | Calendario di occorrenze esplicite collegate alla settimana del ciclo | Rinvio e data reale rimangono distinti; nessuna progressione causata dal passare dei giorni | Servono anteprime per spostamenti multipli. Ricorrenze illimitate e integrazione Google Calendar fuori da questo incremento |
| NEXT-D6 | Motore deterministico con template curati e ricerca limitata; consenso prima degli algoritmi | Riproducibilità, funzionamento locale, spiegazioni derivate dagli stessi calcoli | Richiede revisione dei metodi. LLM unico decisore scartato per questo ruolo; solver generale solo se i benchmark mostrano un limite concreto della ricerca |

SheetJS CE0.20.3 è stata selezionata in SCH-02 dopo il confronto reale con ExcelJS4.4.0; versioni/licenze, misure e limiti sono nel rapporto corrente. La suite Playwright locale è implementata; PostgreSQL TCP/pgTAP e stack Supabase reale restano controlli complementari aperti, PGlite è il controllo rapido. Per il calendario attuale di sole date, l'adapter usa aritmetica civile UTC con prove DST, senza sommare 24h nel fuso locale: specializzazione motivata nel rapporto rispetto a Temporal proposto. Orari/allarmi/ricorrenze richiedono Temporal o adapter equivalente con disambiguazione e polyfill testato sui target. Non installare librerie duplicate per lasciare aperta la scelta.

La [ricerca](FONTI_TECNICHE.md) motiva le raccomandazioni. Limiti di dimensione, tempi e carico sono budget del progetto da misurare; non garanzie offerte dai fornitori.

## 4. Divergenze rilevate e risoluzione prevista

| Punto | Classificazione | Trattamento |
| --- | --- | --- |
| Preview e Production condividono Supabase | Eccezione alpha già autorizzata DEC-30 | SYNC-01 prepara ambiente isolato prima di guasti, restore o test distruttivi; nessun reset sul progetto reale |
| `Auth.resolve` usa `FOR UPDATE` e chiama refresh prima del commit | Differenza tra implementazione e sicurezza §2.5 | SYNC-02 introduce lease breve e compare-and-swap, senza transazione aperta sulla rete; test crash/refresh/revoca prima del gate |
| Sicurezza descrive database locale separato, alpha usa un DB con partizioni account | Differenza implementativa | NEXT-D3 esplicita l'isolamento logico e i controlli richiesti; nessuna promessa di cifratura locale |
| Import/export §3 propone upload e job per ogni XLSX | Proposta tecnica precedente, non DEC | NEXT-D2 specializza il primo import in locale; pipeline server resta successiva e distinta. Aggiornato il rinvio nella specifica |
| Un passaggio della roadmap attribuisce tutto F4 a WP-07 | Errore di tracciabilità | WP-06: catalogo/editor/calendario; WP-07: parser/import; WP-09: registrazione delle nuove modalità |
| `goal: bodyweight` del v1 mescola ambiente e obiettivo | Limite del contratto attuale | In SCH-01 separare obiettivo forza/ipertrofia e modalità/attrezzatura. Import v1 preservato; per un obiettivo assente chiedere una scelta nell'app, senza inventarlo |

Supabase contro MySQLi, commenti per ogni riga e hash restano risolti da DEC-18/19/23. Non è emerso un nuovo requisito da sottoporre al committente per completare questa pianificazione. Le revisioni di dominio restano controlli professionali, non decisioni da inventare in sua assenza.

## 5. Roadmap di questo incremento

| Milestone | Ticket e dipendenze | Consegna dimostrabile | Gate |
| --- | --- | --- | --- |
| M0 — Baseline e prova isolata | SYNC-01; definizioni SCH-01 e MOT-01 possono procedere in parallelo | Manifest ambiente/fixture, report baseline, contratti di lavoro e registro fonti | Ambiente realmente distinto da Production, nessun segreto nei rapporti |
| M1 — Affidabilità del diario | SYNC-02–05, poi SYNC-06 | Sessione offline riaperta, convergenza tra dispositivi, isolamento, conflitti recuperabili | S: casi bloccanti del piano sync superati su stack reale e telefoni |
| M2 — Schede complete | SCH-01–06; parser prototipabile durante M1, rilascio dopo S | Excel→anteprima→bozza, esercizi privati, calendario, storico invariato | C: fixture, migrazioni/compatibilità, UI e prove su due dispositivi |
| M3 — Consenso verificato | MOT-01–03; MOT-02 dipende da S e contratti SCH-01 | Proposta sintetica accettata/rifiutata online e offline, senza perdita di sedute | A: QA-APP, race, bypass e recupero superati prima di regole attive |
| M4 — Metodi e generatore | MOT-04–06, dopo A; ricerca/revisione dominio avviata in M0 | Generazione e progressioni motivate nei contesti confermati | D: revisioni di dominio, suite ALG pertinente e benchmark riproducibile |
| M5 — Collaudo integrato | SYNC-06 + SCH-06 + MOT-07 | Percorso completo Excel→calendario→offline→sync→proposta→conferma | R: zero difetti bloccanti, compatibilità e rollback provati |

S/C/A/D/R sono gate di questo incremento, non sostituiscono G1–G4 della roadmap globale. La loro chiusura non dichiara completati AI, SMTP/Google, cancellazione account o l'intera beta. L'accesso email funzionante agli account di collaudo è un prerequisito; completare Google e SMTP pubblico rimane una consegna distinta, non un motivo per fermare i test locali.

Non fissare una data finale prima dei prototipi di M0. Al termine di ciascuna milestone aggiornare stima, rischi e capacità sulla base dei risultati; risorse illimitate non eliminano la dipendenza tra consenso, schema e sincronizzazione.

## 6. Compatibilità: attività obbligatoria prima dei nuovi dati

Il v1 ha oggetti Zod chiusi, cinque tipi di record e sette comandi. Aggiungere una colonna SQL non rende automaticamente compatibile un vecchio client: un nuovo tipo nel pull può bloccare l'intera risposta.

SCH-01 deve consegnare una matrice e fixture per quattro versioni distinte: formato file, protocollo di sync, schema IndexedDB e rule bundle. Introdurre un protocollo v2 per le nuove entità; mantenere il decoder v1 e un adapter esplicito per i vecchi comandi supportati. Non riscrivere payload o operation ID già inviati: il loro digest e le ricevute devono continuare a coincidere.

Separare SCH-01 in due consegne: **01a**, specifica dei contratti e fixture di compatibilità in M0/M1, usata da SYNC-05; **01b**, migrazioni e nuovi comandi completati per M2. Gate S richiede la prova dell'aggiornamento e del recupero della coda, non l'intero catalogo/calendario: questa distinzione evita una dipendenza circolare tra M1 e M2. Matrice minima: vecchio client/nuovo server, nuovo client/vecchio server, vecchio schema locale con outbox/nuova PWA, rollback del frontend dopo scritture v2; ogni cella dichiara percorso supportato oppure blocco con recupero, senza simulare compatibilità.

1. Rilasciare prima una versione ponte con negoziazione delle capacità, gestione di `UPGRADE_REQUIRED`, export e migrazione locale senza cancellazioni.
2. Aggiungere schema/RPC/serializer compatibili sul server, con funzioni nuove versionate: non modificare retroattivamente migrazioni distribuite o ricevute.
3. Distribuire il lettore v2, poi abilitare gradualmente le nuove scritture. Il v1 deve ancora poter inviare registrazioni compatibili delle sedute già iniziate e leggere i dati rappresentabili secondo un contratto documentato.
4. Se un account possiede dati indispensabili non rappresentabili nel vecchio protocollo, la risposta deve richiedere aggiornamento senza restituire JSON parziale o saltare eventi. È una transizione incompatibile esplicita: testare recupero della coda anche partendo dall'alpha precedente alla versione ponte. Non dichiarare in quel caso piena compatibilità del vecchio client.
5. Supportare release corrente e precedente nei rollout ordinari. Rimuovere il vecchio percorso soltanto con inventario dei client supportati e procedura di recupero verificata. Un utente assente a lungo mantiene la possibilità di recuperare/esportare il lavoro locale.

L'aggiornamento non deve interrompere una seduta. Niente `IndexedDB.deleteDatabase`, reset del service worker o cambio epoch come scorciatoie di migrazione. Il normale deploy non cambia `sync_epoch`; il restore storico segue il percorso dedicato. Il rollback preferito spegne la nuova funzione e mantiene i lettori compatibili; non ripristina uno schema vecchio sopra dati v2.

## 7. Come scrivere e verificare il codice

Applicare [convenzioni](../CONVENZIONI_SVILUPPO.md) e [architettura](../architettura/SCELTE_TECNICHE.md). In concreto:

- `packages/contracts`: input non fidato come `unknown`, schemi Zod e unioni discriminanti, DTO versionati, errori con codice e percorso. Mai usare cast per simulare la validazione.
- `packages/domain`: funzioni pure con snapshot, tempo/seed/configurazione espliciti. Quantità con unità; `null`, zero e assente distinti; niente SDK, fetch, SQL, React o accesso al vault.
- Adapter web: parsing XLSX nel worker; coordinamento nei casi d'uso; repository locale come unica fonte persistente. Dato e outbox nella stessa transazione, rete fuori dalla transazione.
- Adapter server: Auth→validazione→autorizzazione→caso d'uso→DTO. Nessuna query generica dal client, nessun owner affidabile nel body, nessun access/refresh token Supabase nel JavaScript della PWA. Il nonce CSRF e la challenge di conferma hanno ruoli distinti dai token di autenticazione. Lock brevi e ordine stabile; niente calcolo lungo o rete sotto lock.
- UI: testi italiani, semantica HTML, label/errori associati, input preservati, focus gestito, azioni alternative al drag. Riusare `DecimalInput`, dialog e stili esistenti quando adeguati; non estrarre astrazioni generiche prima del bisogno.
- SQL: nuove migrazioni, grant/RLS/FK composte, indici motivati, transazione unica per mutazione/ricevuta/eventi. Le scritture di proposte e job rispettano lo stesso ordinamento sync degli altri comandi.
- Commenti su motivazioni, invarianti e sicurezza (DEC-19); ticket/test spiegano l'effetto osservabile. Aggiornare il diario per ogni gruppo di file effettivamente scritto, inclusi documenti e rapporti.

Per ogni ticket: specifica/attesi → test che riproduce rischio o comportamento → modifica circoscritta → prove pertinenti → revisione → rapporto. Gli script attuali sono in `package.json`: `npm ci`, `npm run check`, `npm run format:check`. `test:e2e`, `test:db-real` e `test:sync-faults` sono **consegne da aggiungere**, non comandi già disponibili. Non lanciare reset o migrazioni su un URL letto implicitamente da `.env`.

## 8. Responsabilità, consegna e chiusura

Referente tecnico: contratti, compatibilità e scelte NEXT. Backend: transazioni/RLS, Auth, migrazioni. Frontend: storage, worker, calendario e consenso. QA: fixture indipendenti, guasti e dispositivi. Revisore del dominio: metodi/fonti e casi ammessi. Operazioni: ambiente, backup/restore e rollout. Una persona può coprire più ruoli, ma ogni ticket deve indicare chi sviluppa e chi verifica; l'autore del calcolo non è l'unico autore degli attesi scientifici.

Ogni consegna include commit, ticket→RF/WP/ADR/WEB/QA, versioni/schema, dataset, comandi, esiti, limitazioni, migrazione e rollback. Bloccare il rilascio in presenza di perdita dati, accesso tra utenti, duplicati non risolti, conferme aggirabili, modifica dello storico o impossibilità del diario offline promesso. Un test instabile non diventa verde aggiungendo retry che nascondono l'errore.

Capitoli applicati alla pianificazione: Appunti 01–08; Linee guida 01–11, con focus su 04–06/08–11 per form, sicurezza, stato e rete. WEB-10 resta pertinente alle sole pagine pubbliche, non una richiesta di indicizzare questi dati. Fonti originali conservate; nessuna loro correzione silenziosa.

Questa consegna verifica documentazione e coerenza con il codice letto. Test cloud, benchmark parser, migrazioni, review dei metodi, telefoni reali e nuovi moduli sono attività future descritte nei tre piani, con gate espliciti.
