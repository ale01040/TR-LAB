# Incremento locale — schede, sincronizzazione e motore

13 ottobre 2026 · DEV-068/069. Questo rapporto descrive il codice nuovo, i controlli effettivi e i gate aperti. Il [ramo di consegna GitHub](https://github.com/ale01040/TR-LAB/tree/codex/schede-sync-motore-20261013) raccoglie l'incremento con deploy Git Vercel disabilitato per quel ramo. L'alpha pubblicata è documentata nei rapporti precedenti. Aggiornamento DEV-070: incremento pubblicato manualmente nella Preview isolata, migrazioni applicate soltanto a TR-LAB-STAGING e CI del commit bd0a62b riuscita; [evidenze e limiti del cloud](STAGING_2026_10_13.md). Il dominio stabile e il suo database restano sulla baseline. Le prove locali descritte qui non diventano automaticamente prove di Auth o di telefoni reali. Non è una dichiarazione di assenza universale di bug o di validazione scientifica.

## 1. Risultato e stato dei ticket

| Percorso | Implementato nel workspace | Stato rispetto al piano completo |
| --- | --- | --- |
| SYNC-02/03/04/05 | Lease refresh, guardie cambio account, bootstrap atomico, coda ordinata, backoff, conflitti e archivio di recupero | Prove locali passate; SYNC-01/06 e gate S su provider/telefoni aperti |
| SCH-01/03 | Protocollo v2 additivo, esercizi personali e profili attrezzatura, RLS/FK e proiezioni | Dose del programma ancora JSON v1; durata/strumenti avanzati aperti |
| SCH-02/04 | Parser locale dei due profili Excel, review e staging di varianti, import atomico con report | Formati supportati e limiti documentati; non import universale né prova heap mobile |
| SCH-05 | Pianificazione finita, occorrenze, rinvio/saltata/annullata, avvio/chiusura collegati al diario | Spostamenti multipli/ricorrenze e prove multi-device aperti |
| MOT-01/02/03 | Registro fonti, proposta/review/decisione persistenti, consenso esatto e recupero senza token | Consenso offline disabilitato; esecuzioni già presenti richiedono confronto dedicato |
| MOT-04/05/06 | Generatore a vincoli e progressioni pure, BFF autorevole e moduli UI | Nessun bundle attivo; revisione del dominio e pipeline automatica persistente ancora aperte |
| SCH-06 / MOT-07 | Suite locale e percorsi browser ripetibili | Gate C/A/D/R non chiusi dai soli test locali |

RF pertinenti: 01/02/03/04/05/06/07/08/09/13/16/17/18. ADR pertinenti: 01/02/04/05/06/07/08/09/10/11/12/13/14/16/17; il codice applica soltanto le parti descritte, non dichiara tutti gli ADR soddisfatti.

## 2. Uso delle nuove funzioni

In Programma, l'import `.xlsx` apre il report, richiede le associazioni/fasi mancanti e consente di preparare varianti private. La conferma della struttura apre l'editor. **Salvare una bozza e approvarla sono due azioni diverse.** [Formato e conversioni](../specifiche/FORMATO_EXCEL_IMPLEMENTATO.md).

In Libreria si creano o duplicano varianti personali, si correggono nome/istruzioni e si archiviano. L'identità fisica di una variante già salvata non cambia con una modifica di nome: per un diverso movimento/convenzione si duplica. Una variante archiviata resta negli snapshot storici, ma non è disponibile per nuove prescrizioni. Condivisione per JSON converte riferimenti privati in snapshot incorporati, senza accesso all'archivio del proprietario.

In Libreria, nel pannello attrezzatura, si dichiarano luoghi, categorie, convenzioni, tagli di carico effettivi e identificazione testuale della macchina. I kg dell'interfaccia diventano grammi interi; i tagli sono ordinati e i duplicati respinti. Dichiarare una categoria “macchina” non significa avere qualunque movimento disponibile.

Nel calendario si pianifica da una **versione approvata**, si rivedono tutte le date e si conferma l'intervallo. Ogni occorrenza conserva programma/giornata/settimana/fuso. Rinvio e data reale sono distinti; il passare dei giorni non chiude una seduta e non fa avanzare una progressione. Avvio e completamento sono collegati alle transizioni del diario.

Nel Profilo, Recupero mostra conflitti, backup e archivio delle intenzioni sostituite. È possibile conservare il remoto o preparare un nuovo tentativo esplicito; operazioni collegate sono gestite insieme. Un backup importato rimane una fonte di recupero, non una coda da reinviare. Le schede si copiano come nuove bozze; le esecuzioni concluse si rivedono con risultati mancanti conservati e provenienza, senza approvare il vecchio piano. Una seduta già presente sul server produce `HISTORY_ALREADY_PRESENT`, conservando i dati per il confronto.

Il centro Proposte presenta prima/dopo, ciclo, target/lati, fonti, versione del metodo e dipendenze. Il generatore richiede livello, perimetro adulto/non clinico, tempo, luogo e movimenti disponibili/praticati. La valutazione delle progressioni richiede versione/posizione, profilo e esposizioni che la persona dichiara confrontabili. Il BFF ricalcola dai propri record: il browser non sceglie direttamente i target server. Nessun metodo reale è attivo in questa consegna, quindi questi calcoli restano indisponibili agli utenti finché i gate non sono chiusi.

## 3. Codice e confini

| Modulo | Responsabilità |
| --- | --- |
| packages/contracts/src/core.ts | Contratti v1 conservati; niente SDK/rete |
| packages/contracts/src/features.ts, import-recovery.ts, engine.ts | Nuove entità, comandi, report, provenienza, bundle e consenso |
| packages/domain/src/workbook-import.ts, tabular-import.ts | Mapping puro; scelta esplicita per ambiguità, mai esecuzione di formule |
| apps/web/src/import/ | ZIP/XML limitati, worker terminabile e digest del binario originale |
| packages/domain/src/calendar.ts | Aritmetica di date civili, calendario finito con settimana congelata |
| generation.ts, progression-engine.ts | Input/seed/clock espliciti, vincoli prima delle preferenze, esiti conservativi |
| apps/web/src/data/sync-engine.ts, sync.ts | Trasporto separato, staging, ricevute, dipendenze, lease locale e guardie sessione |
| database.ts, recovery.ts, workout-recovery.ts | Transazioni IndexedDB, base/overlay/outbox, archive, recupero senza replay |
| proposal-decisions.ts, decision-intent.ts | Intenzione con operation ID stabile, nessun overlay approvato, export senza challenge |
| apps/server/src/auth.ts | Lease/CAS dei token, rete Auth fuori dai lock SQL |
| apps/server/src/engine.ts | Calcolo e pubblicazione da BFF autenticato, digest SHA-3 e review privata |
| supabase/migrations/ | Precondizioni, RLS/FK owner, ledger e transazioni atomiche |

Scrivere gli ulteriori moduli allo stesso modo: `unknown` ai confini, Zod prima dell'uso, funzioni pure senza accesso implicito a rete/clock, query parametrizzate e scritture tramite comandi. Commenti per invarianti/motivazioni/sicurezza. Non usare SDK Supabase nel frontend per aggirare HttpOnly e il BFF; non aggiungere un generico update ai target o una funzione accept accessibile al modello AI.

Le tabelle dedicate aggiungono chiavi relazionali/status/FK e indici alle nuove entità. La copia DTO in `tr_lab_records` resta il percorso di sincronizzazione; i trigger mantengono la proiezione nella stessa transazione, senza due API di scrittura concorrenti. Normalizzare tutto lo storico esistente non è necessario per questo incremento e richiederebbe un progetto di migrazione distinto.

## 4. Invarianti verificati

Intenzioni e dati locali vengono salvati insieme; rete e parsing restano fuori dalle transazioni IndexedDB. Base remota e overlay sono separati. La prima fotografia remota resta in staging fino all'ultima pagina; nessun bootstrap parziale viene presentato come completo. Le ricevute non avanzano il cursore di pull, evitando salti su eventi non ancora letti. Risposte tardive dopo logout/cambio account non vengono adottate; le live query controllano la partizione prima del rendering.

Lo stesso operation ID con lo stesso comando riusa la ricevuta. Un comando indipendente può proseguire dopo un conflitto; le sue dipendenze non vengono saltate. Epoch diversa mette in quarantena l'archivio: nessuna sostituzione automatica della coda con la nuova epoch. Backoff rispetta Retry-After per 429 e preserva l'intenzione su errori di rete/503.

Il rinnovo Auth coordina token version e lease breve con CAS. Una rotazione non tiene aperta una transazione SQL mentre chiama il provider. Logout/revoca prima del CAS impediscono la resurrezione della sessione. I test usano provider sintetico; revoca globale del provider e relativo job durabile restano aperti.

Review non modifica il programma. Accettazione richiede owner/sessione/epoch/revisione/digest/challenge esatti e validi; una sola transazione crea versione approvata, decisione, eventi e ricevuta. La ricerca della ricevuta precede la scadenza della challenge per un retry identico già riuscito. Metodo ritirato o dipendenze mutate bloccano nuovi effetti. La challenge rimane soltanto nell'intenzione online pendente e viene rimossa a esito terminale; backup/log/pull non la distribuiscono.

DEC-23: SHA-3 nel server per proposta/challenge; SHA-256 nel database per il ledger. SHA-256 JCS del browser è soltanto una traccia dell'intenzione per recupero: non è confrontato come se coincidesse col digest SQL. Fingerprint conserva versione della rappresentazione, seed e revisioni; Unicode con surrogate isolate viene respinto.

## 5. Scelte, alternative e compromessi

| Scelta | Perché utilizzata | Alternativa e costo della scelta |
| --- | --- | --- |
| SheetJS CE 0.20.3, tarball ufficiale con integrity | Legge entrambi i file reali, incluse formule senza risultato; JSON intermedio separato dal dominio | ExcelJS 4.4.0 fallisce sui commenti del primo file nella prova comparativa; non installato come dipendenza app. SheetJS non ricalcola formule e richiede guardie esterne |
| fflate 0.8.3 | Stream con conteggio espanso e ricostruzione ZIP validato, prima di SheetJS | DecompressionStream da sola non interpreta directory/CRC ZIP e non copre tutti i target. Repack duplica memoria temporaneamente |
| Worker locale | File personale sul dispositivo, UI annullabile, nessun upload invisibile | Job server isolato utile per file più grandi, ma richiede nuove retention/autorizzazioni. Worker non è isolamento rigido della heap |
| Dexie stesso database, upgrade additivo | Preserva coda v1 e identità già usate senza reset; nessuna cache concorrente | DB fisici distinti aiuterebbero alcuni audit, ma non proteggono da chi controlla il browser. Isolamento logico va provato anche con account reali |
| SQL parametrizzato/ruoli minimi, tabelle nuove additive | Consenso, ricevuta, revisioni e relazioni atomiche su PostgreSQL confermato | ORM non sostituisce RPC/RLS. Copia JSONB + proiezioni richiede verifica di coerenza e query/indici misurati |
| Ricerca deterministica entro 5.000 stati | Seed esplicito, vincoli obbligatori prima del ranking, esiti timeout distinti dall'impossibilità | OR-Tools aggiungerebbe runtime e distribuzione senza un limite misurato del problema attuale. LLM come unico decisore non garantirebbe gli invarianti |
| Date civili con funzioni UTC circoscritte | Nel calendario attuale si persistono date, non orari locali/istanti ricorrenti; prove DST/bisestile/anno0099 | Specializzazione rispetto al Temporal proposto. Nessuna somma di 24h nel fuso locale. Temporal/polyfill da introdurre se arrivano orari, allarmi o ricorrenze con disambiguazione; questa soluzione non li implementa |
| Vitest + PGlite + Chrome/Playwright | Copre dominio, SQL/RLS e percorso worker/PWA ripetibile senza credenziali | PGlite non copre provider/parallelismo TCP. Runner aggiuntivo verificato su PostgreSQL 17.11 locale; stack Supabase/telefoni ancora necessario |
| Consenso inizialmente online | Nessuna approvazione provvisoria presentata come conferma server | Riduce disponibilità delle proposte offline; il diario resta offline. Implementazione provvisoria richiede prima gate S/A e riconciliazione completa |

Licenze nelle dipendenze installate: SheetJS Apache-2.0, fflate MIT. ExcelJS è solo nel confronto locale ignorato. Il parser npm storico `xlsx` non è utilizzato: la fonte è il [tarball ufficiale](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), con versione/integrity nel lockfile. Non pubblicare gli originali personali o il vault per rendere riproducibile il benchmark: utilizzare fixture sintetiche e manifesto dei risultati.

Corretto inoltre un difetto precedente del limite HTTP: il caricamento degli asset PWA consumava la quota delle API e il builder senza status trasformava il limite in 500. Ora gli asset non consumano il budget API esistente e il limite risponde 429 con Retry-After. Riprodotto prima della correzione e verificato con regressioni. La [documentazione ufficiale del plugin](https://github.com/fastify/fastify-rate-limit) e il codice installato confermano il contratto del builder. Il contatore in memoria resta un limite in ambiente serverless: non sostituisce una politica distribuita di protezione del servizio.

## 6. Prove effettuate

| Controllo | Esito effettivo | Portata |
| --- | --- | --- |
| npm run check | Superato: TypeScript, lint, 67 unit in 15 file, 64 integration in 13 file, build web/server e sei HTTP standalone | Test locali, migrazioni in PGlite, provider sintetico |
| npm run format:check | Superato; verifica finale della consegna nel diario | Sorgenti/config, non originali web |
| npm audit --audit-level=low | Zero advisory rilevati sul lockfile | Nessuna garanzia universale di sicurezza |
| Browser desktop | Due percorsi superati: import/conferma/calendario/diario offline e esercizio/attrezzi | Build reale, worker reale, IndexedDB e SW, senza backend collegato |
| Browser viewport mobile | Entrambi i percorsi superati dopo la correzione HTTP; totale 4/4 browser | Chrome, 390×844; non telefono reale né account cloud |
| Excel originali | Hash invariati; 25/28 posizioni, 3 giornate, 7 settimane, nessun errore strutturale dopo riconoscimento riepilogo | Upper Body richiede ancora associazioni/fase; nessun file riscritto |
| Parser con guardie | Mediane circa 34,76/35,56ms nella verifica desktop Node, quattro letture dopo warm-up | Non misura worker end-to-end, picco heap o telefoni |
| PostgreSQL TCP | Superato su cluster locale temporaneo PostgreSQL 17.11: tutte le migrazioni, tre controlli con connessioni reali | Retry concorrente, CAS con un vincitore, RLS owner; identità SQL simulata, non Supabase Auth |
| Supabase/Vercel nuovi | Non eseguiti in questo incremento | Migrazioni nuove locali; nessuna prova remota implicita |

Suite nuove: auth-refresh (5), sync-faults (10), recovery (5), personal-calendar (7), proposal-consent (5), import-workout-recovery (4), decision-backup (3), rate-limit (2), engine-api (3); sommate alle suite precedenti fanno 64 test d'integrazione. Il percorso BFF→SDK con fetch sintetico→SQL→risposta verifica calcolo/review/accettazione, input ostili e finestra di evidenze su 1002 sedute. Le due copie Dexie e gli owner SQL sintetici provano conservazione/isolamento locale, non telefono+PC autenticati dal provider.

Il BFF legge solo le esposizioni selezionate, massimo 20; mantiene il limite di 1000 record della finestra e non aggrega l'intero storico per ogni valutazione. Finestre ancora troppo grandi richiedono una selezione più piccola e sono segnalate, senza troncare evidenze come se fossero complete. La guardia cloud del comando locale è 200 KiB, inclusi varianti/report: una bozza valida strutturalmente ma troppo grande viene respinta prima di accodarla, senza dichiarare un salvataggio remoto.

Controllo documentale: 40 Markdown, 277 link locali, 104 tabelle, 3 esempi JSON, 38 casi QA referenziati, zero errori automatici rilevati. Non significa che i 38 casi QA siano superati. Controllo sui 204 file testuali candidati alla consegna: nessuna occorrenza dei formati di segreto noti cercati o caratteri sostitutivi; `.env` non letto. `git diff --check` senza errori, raccolte originali senza modifiche. Questi controlli hanno portata circoscritta, non sono una certificazione completa di sicurezza.

Il diario conserva anche i fallimenti: parsing ESM del catalogo, fixture/locator, attesa commit mobile, guardie ZIP/CRC, risultato live query non disponibile e limite HTTP. Gli assert sono rimasti sostanziali; non è stata disabilitata la protezione per ottenere verde. Il warning PWA `inlineDynamicImports` è una deprecazione del tooling upstream: build riuscita, aggiornamento da valutare separatamente.

La prova TCP inizialmente rifiutata per ambiente assente è stata completata con binari portabili EDB indicati dal [sito PostgreSQL](https://www.postgresql.org/download/windows/). PostgreSQL 17.11, cluster nuovo in `.analysis`, porta 55432 solo su 127.0.0.1, nessun installer/servizio Windows/PATH o database account. Dopo il test il cluster è stato fermato, la porta verificata chiusa e dati/toolchain/archivio temporanei rimossi. Nel diario restano hash e problemi del wrapper d'avvio. Queste tre prove aggiuntive non chiudono l'intera matrice S/A, Auth/PostgREST, restore, telefoni o carico.

## 7. Fonti di dominio e automazione

[Registro](../fonti/REGISTRO_REGOLE.md), [manifest dei sette riferimenti del vault](../fonti/MANIFEST_CORPUS.json). KB-02 riletto integralmente; metadati/hash delle altre note non equivalgono a lettura nuova. Del position stand ACSM2026 sono stati consultati metadati/abstract e annuncio ufficiale; testo completo e traduzione in regole individuali non revisionati. Nessun testo dei libri/vault è distribuito.

Le 60 combinazioni sintetiche del generatore verificano vincoli/determinismo, non appropriatezza fisiologica. Il registro non contiene bundle attivi o revisori fittizi. Doppia progressione, sequenza ripetizioni e direzione dell'assistenza sono fondazioni; ponti fra scatti, stalli, forza percentuale/top set, varianti a corpo libero e durata richiedono metodi dedicati. Macchine/cavi non vengono confrontati finché manca l'identità nello storico.

L'automazione desiderata dal committente rimane un requisito: dopo i gate, aggiungere analisi persistente su conclusione/sync/cambio vincoli, snapshot/fingerprint/dedup, retry e aggiornamento delle proposte da rivedere. Il codice attuale calcola su richiesta dal modulo UI/BFF; non contiene ancora una coda/cron di analisi autonoma. Non chiamare questo incremento “automazione completa”.

## 8. Raccolte applicate e scostamenti espliciti

Indici/regole generali di entrambe le raccolte letti; capitoli pertinenti letti prima dei moduli. Originali conservati, senza correzioni silenziose.

| Capitoli | Applicazione | Ancora da collaudare |
| --- | --- | --- |
| Appunti01–04, Linee guida01–04/10 | Struttura semantica, form/label, dialog, Grid/Flex e ritorno a capo | AA completa, screen reader, stampa e telefoni |
| Appunti05–06, Linee guida05–06 | TypeScript/moduli, validazione runtime, funzioni pure e worker | Sottinsieme OpenXML e budget memoria su dispositivi |
| Appunti07–08, Linee guida08–09/11 | Supabase DEC-18, HttpOnly/BFF, query parametrizzate, minimi grant/RLS, lease, epoch e consenso | Auth reale, revoca provider, restore/rotazione segreti e rollback |
| Linee guida07, prestazioni/caching | Asset offline, niente cache API, chunk worker e suite geometrica | Core Web Vitals e quota/eviction su telefoni; SEO pubblico separato |

DEC-19 conserva commenti mirati; DEC-23 conserva digest distinti nei tre contesti. Temporal proposto è specializzato per l'attuale calendario di sole date, con motivazione sopra: non si modifica la raccolta originale e non si estende quel codice a orari/fusi senza un adapter adeguato. `goal: bodyweight` legacy del programma resta un limite del v1; input del generatore distingue già obiettivo/modalità/ambiente.

## 9. Lavoro rimasto e ordine di chiusura

1. Predisporre PostgreSQL/Supabase isolati e chiudere le prove S con due account, device, tab, lease, guasti, cursori e restore; bootstrap materializzato/compattazione e CURSOR_EXPIRED non sono ancora implementati.
2. Provare upgrade/rollback, import reale con scelte, catalogo/calendario e report su dispositivi; completare dose v2 e identità degli strumenti soltanto con migrazioni/test dedicati.
3. Chiudere A sul provider reale, incluse race sulla stessa base e risposta persa. Completare consenso provvisorio offline e confronto delle esecuzioni già presenti; non sovrascrivere per aggirare il conflitto.
4. Revisionare fonti, diritti, parametri/metodi e attesi indipendenti; attivare solo bundle approvati dopo D. Completare analisi automatica persistente e metodi mancanti.
5. Chiudere R: percorso completo collegato, accessibilità/prestazioni/carico, rollout e rollback su staging; poi pubblicare. SMTP/Google/assistente AI/nutrizione automatica restano nei rispettivi gate della roadmap, senza finti servizi funzionanti.

Procedura eseguibile e migrazioni: [operazioni dell'incremento](../operazioni/INCREMENTO_SCHEDE_SYNC_MOTORE.md). Tracciamento di ogni scrittura/modifica e verifica: [diario](../DIARIO_SVILUPPO.md).
