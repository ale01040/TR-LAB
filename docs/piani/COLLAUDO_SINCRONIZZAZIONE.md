# Collaudare e completare la sincronizzazione

13 ottobre 2026 · Specifica esecutiva futura · Collegata al [piano dell'incremento](PIANO_PROSSIME_FUNZIONI.md). Nessun caso di questo documento è dichiarato superato dalla sua sola stesura.

## 1. Scopo e collegamenti

RF-01/02/06/07/14/17; WP-02/04/05/08/09/14; ADR-01/04/05/06/07/08/09/10/12/13/17; WEB-01/04/05/07/08/11/12/13/14. Contratti autorevoli: [API e sincronizzazione](../specifiche/API_E_SINCRONIZZAZIONE.md), [modello dati](../specifiche/MODELLO_DATI.md), [sicurezza](../specifiche/SICUREZZA_E_PRIVACY.md). Casi generali nella [matrice QA](../qualita/TEST_E_ACCETTAZIONE.md).

Le due prove fondamentali sono diverse: **lo stesso account A su telefono e PC deve convergere**; **un account B deve rimanere isolato da A**, anche sul dispositivo condiviso. Due account che vedono dati differenti non dimostrano la sincronizzazione del medesimo account.

## 2. Ambiente e dataset

Usare prima Supabase locale completo, poi uno staging Supabase distinto da quello reale e un'origine web HTTPS stabile di collaudo. L'attuale Preview condivide il database Production: non è adatta a fault injection, restore, cancellazioni o manipolazioni di epoch. SYNC-01 deve registrare project reference ammesso, hostname, versione PostgreSQL, migrazioni e commit; gli script devono rifiutare il project reference Production anche se passato per errore nelle variabili ambiente.

Non creare servizi remoti durante questa pianificazione. In sviluppo, predisporre servizi/credenziali secondo la procedura operativa e gli accessi disponibili. I test locali possono avanzare senza SMTP pubblico o Google; sullo staging creare account sintetici controllati e collaudare login reale email/password. Un test che inietta una sessione mock non chiude questo prerequisito.

| Contesto | Identità | Scopo |
| --- | --- | --- |
| A-PC | Account sintetico A, profilo browser desktop dedicato | Modifiche concorrenti e lettura finale |
| A-telefono | Stesso A, iPhone/Safari o Android/Chrome reale | Allenamento offline, sospensione, riapertura e riconnessione |
| B-PC | Account B indipendente, altro profilo/context | Accesso negato, IDOR e contenuti distinti |
| Condiviso | Un unico profilo/origine: A→logout→B→logout→A | Cache, query residue, outbox e risposte tardive |
| A-tab2 | Seconda tab nello stesso profilo A-PC | Cookie di sessione condiviso, rinnovo/sync concorrenti, chiusura del mittente |

Playwright usa contesti separati per A-PC, A-mobile emulato e B. Per la riapertura del browser conservare un profilo di test persistente o provare esplicitamente l'esportazione/ripristino di IndexedDB supportata dallo strumento: chiudere un context effimero lo elimina e non simula la chiusura normale della PWA. Non salvare `storageState`, cookie o token in Git/artefatti pubblici. Le prove con SW richiedono service worker abilitato e attivo; i mock HTTP senza SW appartengono a una suite diversa. [Fonti T04/T05](FONTI_TECNICHE.md).

Fixture minima, esclusivamente sintetica: A ha una scheda approvata, un giorno con due target bilaterali e un target unilaterale da registrare SX e DX. Risultato atteso: quattro record di serie distinti, tre completati e uno saltato, una sola seduta conclusa. B ha una scheda diversa con un marcatore sintetico riconoscibile. UUID e valori attesi vengono da un manifest del test, non dal codice produttivo. Aggiungere fixture numerose per paginazione e contatori oltre 2^53.

## 3. Procedura manuale telefono–PC, ripetibile

1. Annotare commit, migrazioni, OS/browser e modalità tab/PWA installata. Accedere come A su entrambi i dispositivi, attendere download e stato sincronizzato; verificare stessi ID/versione della scheda e disponibilità offline.
2. Sul telefono togliere Wi-Fi e dati mobili. Aprire/avviare la scheda già scaricata, registrare i quattro risultati sintetici, note con accenti, RIR zero in un caso e valore mancante in un altro campo ammesso. Confermare la chiusura parziale o completa secondo la fixture.
3. Dopo ogni azione aspettare la conferma del **commit locale**. Chiudere l'app, sospendere il telefono e riaprirla ancora offline. Verificare ID, risultati, lati, note, ordine, snapshot e stato della seduta. Il solo fatto che i campi siano ancora visibili prima della chiusura non basta.
4. Sul PC, ancora online, creare una modifica indipendente: per esempio una misura sintetica. Il telefono dovrà riceverla dopo aver inviato il proprio lavoro. In un secondo run modificare invece lo stesso record per produrre un conflitto deliberato.
5. Ripristinare la rete sul telefono e riportare l'app in primo piano. Attendere autenticazione valida e sincronizzazione; se serve un nuovo login, la coda deve restare intatta. Nessuna conferma di salvataggio remoto mentre ci sono operazioni non applicate o conflitti.
6. Ricaricare il PC e confrontare il dataset canonico: una seduta, quattro risultati, tre completati/uno saltato, note e snapshot esatti. Controllare sul telefono la misura creata al punto 4. Confermare outbox vuota soltanto nel run privo di conflitti.
7. Ripetere il sync e riavviare i dispositivi: conteggi e ID invariati. Le ricevute delle stesse operazioni non devono creare revisioni/eventi aggiuntivi.
8. Accedere come B: nessun dato di A in viste, ricerca, export, IndexedDB accessibile tramite repository di B o risposte API. Eseguire anche richieste dirette con ID di A; nascondere righe nella UI non è una protezione sufficiente.
9. Nel profilo condiviso creare una coda A, uscire offline, riaprire e tornare online. Verificare il marcatore di logout, la scelta di conservazione/esportazione, il completamento della revoca prima del nuovo login e l'assenza di invii di A sotto B. Ripetere con richieste A ancora in volo.
10. Registrare report, confronto dati e difetti. Ripetere su iPhone e Android, da browser e installata; emulazione desktop e WebKit automatico non sostituiscono questi run.

## 4. Matrice di guasti e risultati obbligatori

| Caso operativo | Preparazione / guasto controllato | Risultato e riferimento |
| --- | --- | --- |
| S01 — Offline completo | Procedura §3, perdita rete prima/durante salvataggio | Commit persistente, nessuna serie inventata; QA-OFF-01/02 |
| S02 — Commit remoto, risposta persa | Proxy di test inoltra, attende conferma del commit, scarta solo la risposta; ripetere 100 invii | Un effetto per operation ID, stessa ricevuta terminale, nessun evento extra; QA-SYNC-01 |
| S03 — Replay alterato | Stesso ID con payload/codice comando diverso | Rifiuto, contenuto precedente invariato; QA-SYNC-02 |
| S04 — Concorrenza reale | Due device leggono revisione r e scrivono valori diversi sullo stesso record | Una modifica e un conflitto visibile; conservare entrambe le intenzioni; QA-SYNC-03 |
| S05 — Record distinti | Due device aggiungono serie distinte alla stessa sessione | Entrambe conservate; FinishWorkout usa revisione parent aggiornata; QA-SYNC-10 |
| S06 — Push e pull intercalati | Modifica PC tra lettura cursore telefono e risposta push | Anche la modifica PC arriva al telefono; non avanzare il pull usando il cursore della ricevuta; QA-SYNC-11 |
| S07 — Ordine di commit | Prima transazione rallentata, seconda concorrente; poi pull | Nessun evento saltato per ordine di assegnazione/commit; QA-SYNC-04 |
| S08 — Snapshot/paginazione | Più pagine e scritture durante bootstrap, interruzione a metà pagina | Base scambiata solo quando completa; overlay/coda preservati; QA-SYNC-05/06 |
| S09 — Scadenza Auth | Accesso scaduto durante coda, 401, 429 con Retry-After, 503 e timeout | Pausa/rientro/backoff distinti, stesso ID al retry; niente loop o cancellazione locale; QA-AUTH-02/03 |
| S10 — Refresh e crash | Due richieste, logout concorrente, crash dopo rotazione provider prima del commit locale server | Nessun token/account scambiato, nessuna sessione revocata riattivata, riautenticazione se recupero impossibile; QA-AUTH-02/03/04 |
| S11 — Tab e lease | Due tab inviano; il leader si chiude; una tab riprende molto tardi | Lease recuperabile, idempotenza protegge anche da due mittenti; QA-SYNC-07 |
| S12 — Cambio account | Cache calda A→B, richiesta/pull A arriva dopo B, vecchio header account | UI di B non riceve A; server rifiuta precondizione; QA-SEC-04, QA-OFF-04/05 |
| S13 — Client ostile | JWT test B su Data API/RPC, owner/parent A nel payload, DML diretto, anonimo | RLS/grant/FK e comandi impediscono lettura/scrittura, anche fuori BFF; QA-SEC-01/02/03 |
| S14 — Storage guasto | Abort della transazione, QuotaExceededError, timer fallito dopo commit serie | Salvataggio fallito resta tale; timer fallito non annulla serie già salvata; QA-OFF-02 |
| S15 — Aggiornamento | Vecchia PWA con outbox, nuova build/contratti/schema locale | Dati recuperabili, niente reload forzato o digest cambiato; QA-OFF-03 |
| S16 — Restore | Backup precedente ad alcune ricevute; nuovo epoch; device con dati già sincronizzati e pendenti | Vecchi comandi respinti senza replay; confronto/recupero esplicito; QA-SYNC-08, QA-OPS-01 |
| S17 — Numeri e orologi | Bigint vicino al limite, ora telefono avanti/indietro, fuso diverso | Valori stringa esatti; ordine da sequenza server, non dal tempo client; QA-SYNC-09 |
| S18 — Archivio/cancellazione | Dopo introduzione tombstone: archiviazione/remozione contro edit offline, dipendenti bloccati | Nessuna resurrezione o perdita silenziosa; QA-SYNC-07, ripetuto con SCH-03/05 |

S08 e S16 includono lavoro ancora mancante, non solo nuovi test. L'alpha rilegge un log non compattato; non introdurre retention del log finché snapshot consistente, ricevute, cursori scaduti e recupero non passano. Distinguere sempre compattazione del log da restore storico.

## 5. Come realizzare il banco di prova

Tenere tre livelli separati: test deterministici con fake IndexedDB/PGlite; Supabase locale completo con Auth/PostgREST e PostgreSQL; staging HTTPS su dispositivi reali. pgTAP può verificare policy/FK/grant; le prove HTTP e due transazioni reali verificano il percorso effettivo. RLS testata come proprietario del DB o service role non dimostra isolamento utente. [Fonti T01/T02/T03/T08](FONTI_TECNICHE.md).

Verificare anche l'atomicità locale: parsing, rete e altre attese esterne restano fuori dalla transazione IndexedDB; dato e intenzione in outbox devono riuscire o fallire insieme. Attendere il completamento della transazione prima di mostrare il successo. [Fonte T16](FONTI_TECNICHE.md).

Usare barriere/latch controllati dal test e un proxy locale per orchestrare i guasti. Interrompere genericamente una richiesta Playwright non dimostra che il commit sia avvenuto: nel caso S02 osservarlo prima di scartare la risposta. Non introdurre endpoint di fault injection accessibili in Production o flag che restituiscono token reali al browser.

Il verificatore deve confrontare una proiezione canonica attesa con database remoto e copia di ogni dispositivo: ID, proprietario, relazioni, snapshot, quantità/unità, lati, note, stati e decisioni. Escludere soltanto timestamp tecnici e altri campi dichiarati non semantici. Contare anche operazioni/ricevute/eventi e revisioni: gli stessi quattro record con revisioni cresciute a ogni retry nasconderebbero un difetto.

Le trace del browser possono contenere cookie e corpi HTTP. Conservarle in artefatti privati a scadenza, oscurare segreti, non allegare HAR grezzi o backup personali al repository. Nei rapporti pubblicabili: fixture sintetiche, ID run, codici esito, tempi e checksum.

## 6. Lavoro da assegnare

| Ticket | Attività, confini e dipendenze | Consegna / accettazione |
| --- | --- | --- |
| SYNC-01 — Ambiente e harness | Backend/QA/operazioni; WP-03/04/05. Manifest allowlist, seed A/B, login reale, profili separati, runner Playwright e fixture SQL; nessun reset implicito | Script documentati `test:e2e`, `test:db-real`, `test:sync-faults`; baseline S01/S13 e classificazione delle differenze rispetto ai mock |
| SYNC-02 — Sessioni e coordinamento | Dopo 01; Auth lease con token/versione e scadenza, rete fuori transazione, CAS che non può resuscitare una revoca; sync con backoff/jitter, annullamento al cambio account e coordinamento tra tab | S09–S12. Un timeout non è revoca definitiva; perdita del token ruotato porta a nuovo login preservando la coda |
| SYNC-03 — Conflitti risolvibili | Dopo 01; repository e UI confronto base/locale/remoto. Rifiuto terminale non modificabile; la risoluzione crea nuovo comando sulla revisione appena letta, ricostruisce dipendenti solo dopo verifica | S02–S07/S17. Nessun last-write-wins; “mantieni il mio” può incontrare un nuovo conflitto, senza forzarlo |
| SYNC-04 — Bootstrap e recupero | Dopo 03; snapshot temporaneo/watermark, cursore scaduto, ricevute, quarantena epoch e import del backup locale con owner/versione verificati | S08/S16. Ripristino che conserva anche dati prima confermati; niente applicazione massiva della vecchia outbox |
| SYNC-05 — Storage e aggiornamenti | Dopo 01, integrato con la specifica/fixture SCH-01a; `estimate`/`persist` dove supportati, errori quota, export, upgrade Dexie transazionale e vecchi asset | S14/S15. Il permesso storage persistente può essere negato; diario non deve fingere di avere un backup remoto |
| SYNC-06 — Campagna e regressioni | Dopo 02–05; suite browser, Android/iPhone reali, confronto dataset, report e retest dopo ogni nuovo tipo di record | Tutti i casi applicabili, zero perdite/duplicati/accessi tra utenti; S18 chiuso con le funzioni che lo rendono esercitabile |

`synchronize` usa oggi una mappa in memoria: impedisce duplicazioni nella singola istanza, non coordina tutte le tab. L'implementazione iniziale mantiene namespace account in Dexie (NEXT-D3): centralizzare ogni accesso, includere account nelle chiavi e nelle query, invalidare cache/listener e verificare la sessione catturata prima di applicare risultati asincroni. Non cancellare dati per nascondere un conflitto.

## 7. Gate S e rapporto richiesto

Gate S richiede S01–S17 sulle funzionalità pertinenti, incluse le implementazioni mancanti; S18 diventa obbligatorio prima di pubblicare archiviazione/tombstone in C. Isolamento e conservazione non ammettono tolleranze: **zero perdite, duplicati semantici o dati visibili fra A e B nei casi eseguiti**. Non è una garanzia assoluta contro qualsiasi guasto futuro.

Budget iniziali da misurare: commit locale p95 ≤200 ms sul telefono campione; convergenza di 20 comandi piccoli entro 30 s con app attiva, rete stabile e nessun rinnovo/login richiesto. Registrare ritardo della rete e del provider separatamente. Se il budget fallisce, analizzare round-trip, verifiche Auth e pool prima di introdurre batching; non sacrificare ricevute, RLS o atomicità. Il carico esteso della matrice QA generale resta distinto dal test a due utenti.

Rapporto: SHA, schema, environment manifest depurato, fixture/seed, browser/OS, tab o installazione, durata offline, punto preciso del guasto, aspettativa, risultato, confronto dati, difetto/ticket e revisore. Eseguire una seconda campagna dopo le correzioni senza dipendere dallo stato della prima.

Restano limiti strutturali da spiegare nella UI: dati eliminati dal browser prima della sincronizzazione non sono recuperabili dal server; primo accesso e dati non scaricati richiedono rete; la sincronizzazione garantita avviene con app attiva. Background Sync è un miglioramento opzionale. [Fonti T06/T07](FONTI_TECNICHE.md).
