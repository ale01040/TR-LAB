# Completare schede, import Excel, esercizi personali e calendario

13 ottobre 2026 · Progettazione esecutiva, non funzionalità già disponibili. Ordine e compatibilità nel [piano principale](PIANO_PROSSIME_FUNZIONI.md).

## 1. Perimetro e flusso utente

RF-03/04/06/07/13/16; WP-06 per catalogo/editor/calendario, WP-07 per import, WP-09 per diario; ADR-02/04/07/08/09/10/11/12/13/17; WEB-01–09/11–14. Leggere [editor](../specifiche/EDITOR_SCHEDE.md), [import/export](../specifiche/IMPORT_EXPORT.md), [modello dati](../specifiche/MODELLO_DATI.md) e [UX](../specifiche/UX_E_DESIGN.md) prima del codice.

Percorso: **Programma → Importa Excel → scegli file → anteprima e correzioni → salva bozza → approva → pianifica le sedute**. Nessuna conversione manuale in JSON. JSON resta formato interoperabile per export/import e strumento di test, non un passaggio obbligato per l'utente.

La bozza contiene i target; il calendario contiene le date previste; la seduta conserva quello che era previsto al suo avvio e ciò che è stato realmente svolto. Le tre cose devono restare distinte.

## 2. Contratti da estendere prima della UI

Il contratto v1 supporta target a ripetizioni, metadati esercizio incorporati e cinque categorie di attrezzatura. Non aggiungere campi ignorati solo nel frontend. SCH-01 deve produrre schemi Zod, DTO, validazioni SQL, lettori/export versionati, migrazione locale e fixture di compatibilità.

| Oggetto v2 proposto | Campi/relazioni necessari | Invariante |
| --- | --- | --- |
| Riferimento esercizio | Tipo `global`/`private`, ID stabile, revisione del contenuto, snapshot descrittivo | Non risolvere l'identità dal nome; ID privato verificato per proprietario |
| Variante privata | ID/owner, nome, parent opzionale, pattern, muscoli, attrezzi, modalità, basis, istruzioni, stato attivo/archiviato | Modifica della variante non riscrive programmi approvati o sessioni |
| Profilo attrezzatura | Luogo, item ID, categoria, tagli di carico, convenzione, macchina identificabile | 20 kg per manubrio non equivalgono a 20 kg totali; assistenza non è carico negativo |
| Dose | Discriminante ripetizioni oppure durata; range della metrica, RIR quando applicabile, recupero, lato, tipo serie, carico | Una durata non viene salvata nel campo reps; risultato e target usano la stessa metrica |
| Programma/ciclo | Obiettivo forza/ipertrofia distinto da modalità corpo libero e luogo; versione e puntatore corrente, origine dell'import | Il v1 `goal: bodyweight` resta leggibile, ma non autorizza a inventare un obiettivo mancante |
| Occorrenza pianificata | ID/owner, ciclo, programVersionId, dayId, weekIndex, data locale, fuso IANA, stato, revisione, collegamento alla seduta | Nessuna dipendenza dalla data del telefono per decidere la fase del ciclo |
| Report import | Import ID, digest/versione parser/profilo, scelte di mapping, problemi con cella/path, mappa ID e programma creato | Nessun workbook binario dentro programma o log tecnico |

Per prescrizioni di forza più complesse non introdurre percentuali/e1RM senza il corrispondente metodo revisionato. Il passaggio al v2 conserva la semantica di grammi interi, secondi, RIR zero, null e stringhe di revisione. Un campo richiesto assente rimane un errore da risolvere: non assegnare RIR, carico o recupero “standard” per far passare lo schema.

Nuove tabelle normalizzate per esercizi/varianti private, attrezzatura, cicli istanziati, `scheduled_sessions` e import registrati; nomi SQL definitivi nella migrazione. Conservare programmi/sessioni dell'alpha in `tr_lab_records`, con snapshot e relazioni validate. RLS per letture personali, DML generico negato, comandi specifici e FK composte owner+parent. Ogni nuova entità entra nel protocollo versionato e nello stream dell'account; non creare un secondo sistema di sync per il calendario.

## 3. Quali Excel supportare

Prima implementazione: `.xlsx` Open XML, profilo del file originario e template tabellare TR LAB documentato. Rifiutare con messaggio utile `.xls`, `.xlsm`, file protetti da password, archivi arbitrari e layout non riconosciuti. Non rinominare un file in `.xlsx` per renderlo valido.

Il file originario inventariato nel [piano generale §2](../PIANO_OPERATIVO.md) è `SCHEDA PALESTRA 3 GIORNI.xlsx`, con 25 posizioni in A/B/C e sette settimane. Il successivo `SCHEDA PALESTRA 3 GIORNI - UPPER BODY.xlsx` fornito nella conversazione è **una fixture distinta da acquisire e verificare** in SCH-02: non attribuirgli il medesimo hash o presumere identiche celle/quantità. Per entrambi conservare localmente l'originale senza modificarlo e preparare fixture sintetiche pubblicabili con struttura equivalente. Non inserire dati personali dei fogli nel repository pubblico.

Il riconoscimento usa nomi dei fogli normalizzati, intestazioni, aree e relazioni attese. Digest serve a identificare una revisione, non come unica condizione di compatibilità: cambiare un carico non deve rendere “sconosciuto” il file. Un layout simile con intestazioni mancanti produce richiesta di mapping o rifiuto motivato, non un'importazione per tentativi.

Per il template tabellare TR LAB documentare fogli `Programma`, `Giorni`, `Esercizi`, `Serie`, `Settimane`: ID locali, relazioni, unità nelle intestazioni, esempi validi e limiti. È un profilo aggiuntivo dell'importatore; non sostituisce il supporto del file concreto. Definire il mapping automatico fra questo XLSX e JSON v2 con test di equivalenza.

## 4. Pipeline XLSX da implementare

1. **Selezione e controllo iniziale.** File picker accessibile, nome/dimensione; formato reale e struttura ZIP/Open XML validati. L'estensione/MIME da soli non sono affidabili. Non inviare il file per analytics o diagnosi automatica.
2. **Worker.** Trasferire ArrayBuffer a un worker dedicato, con job ID e messaggi tipizzati. UI presenta avanzamento per fasi e Annulla; cambio file invalida il job precedente. Nessuna percentuale inventata se la libreria non comunica progressi.
3. **Contenitore limitato.** Controllare numero delle entry, nomi/percorso, byte compressi ed effettivamente decompressi, XML e shared strings prima dell'allocazione completa. La directory ZIP può mentire: un controllo soltanto sugli header non chiude il test ZIP bomb. Abortire durante la decompressione al limite; non estrarre su filesystem né seguire riferimenti esterni.
4. **Parsing strutturale.** Adapter SheetJS/ExcelJS → modello intermedio di fogli/celle/tipi/formule/merge e provenienza. Nessun tipo della libreria nel dominio. Non espandere un `!ref` enorme in milioni di celle vuote.
5. **Mapping puro.** Profilo riconosciuto → programma candidato, catalogo da risolvere e report. Conservarne foglio/riga/cella per ogni valore problematico; non pubblicare dati esclusi nel programma.
6. **Normalizzazione.** Virgole decimali, unità dichiarate, range, lati, tipo serie, recuperi, settimane. Celle unite propagabili solo nelle colonne strutturali previste dal profilo; celle vuote nelle dosi restano vuote. Niente correzione fuzzy automatica delle identità.
7. **Validazione e anteprima.** Stessi contratti dell'editor e controlli del ciclo effettivo, oltre ai problemi specifici del file. Mostrare sezioni importate/escluse, anteprima per settimana e varianti ancora da associare.
8. **Conferma import.** Salvare una bozza, report minimo e nuove eventuali varianti private in una transazione locale con un'intenzione idempotente. Non approvare né pianificare automaticamente la scheda.
9. **Sync e validazione remota.** Il BFF/RPC riceve dati normalizzati non fidati, verifica proprietà, limiti, relazioni, revisioni e stato. Non accetta un campo `validated: true` come garanzia. Comando proposto `ImportProgramDraft` atomico per report/mapping/dipendenze/bozza; payload entro i limiti dichiarati.

Il digest identifica il file e la revisione del mapping, non è un permesso. Uno stesso `importId` confermato due volte restituisce la stessa bozza; caricare intenzionalmente un'altra copia richiede un nuovo import ID, dopo avviso di possibile duplicato. Non deduplicare globalmente fra utenti usando un hash, né rivelare che un altro possiede lo stesso file.

## 5. Formule, dati personali e casi ambigui

SheetJS CE ed ExcelJS leggono rappresentazioni di formule ma non calcolano automaticamente risultati affidabili. Il valore memorizzato da Excel può essere assente o vecchio. [Fonti T09/T10](FONTI_TECNICHE.md).

| Contenuto | Comportamento richiesto |
| --- | --- |
| Scheda e periodizzazione | Import di target/struttura; override trasformati in regole esplicite supportate |
| Formula in un target obbligatorio | Segnalare formula/cache; calcolare solo una regola di dominio già definita sul profilo noto, oppure richiedere valore/mapping esplicito. Mai eseguire espressioni Excel o codice |
| Volume/esiti derivati | Ricalcolare dal modello normalizzato; mostrare eventuale discrepanza, non copiare il totale come verità |
| Diario, peso, misure e nutrizione | Esclusi per default; il report spiega cosa resta fuori. L'import dello storico richiede un percorso distinto con selezione, date/unità e deduplicazione, non la creazione di risultati dimostrativi |
| Date Excel | Distinguere seriali 1900/1904, anomalie del calendario 1900 e date locali; non applicare il fuso UTC indiscriminatamente |
| Esercizio sconosciuto/omonimo | Proporre associazioni spiegate oppure “crea mio esercizio”; scelta esplicita, nessun ID inventato |
| Macro, OLE, link esterni, HTML/rich text | Non eseguire o scaricare; bloccare contenuti attivi non ammessi e rendere eventuale testo con escaping |
| Convenzione di carico o metrica non supportata | Errore localizzato; non convertire secondi in ripetizioni né assistenza in peso sollevato |

Conservare le cinque incoerenze già censite nel piano §2.2 come fixture: RIR ignorato, quarta serie mancante dal controllo, singola variazione del peso, carboidrati troncati a zero e scarto DX−SX. I relativi calcoli devono seguire le regole dell'app; importarli non approva un metodo nutrizionale o una diagnosi.

## 6. Libreria e budget del parser

Prima candidata: **SheetJS Community Edition**, per lettura di celle/tipi/merge e mapping su modello intermedio. Confronto: **ExcelJS**, utile anche nella gestione e produzione di workbook. Nessuna delle due risolve la semantica della scheda o la sicurezza del contenitore da sola. Il benchmark deve misurare fedeltà sulle fixture, formule/cache, date, memoria, tempo, worker/Vite, dimensione del chunk, licenza e advisory pertinenti; integrare soltanto la vincitrice.

La documentazione SheetJS avverte che il pacchetto `xlsx` nel registry npm è obsoleto rispetto alla distribuzione ufficiale: non prescrivere `npm install xlsx` senza verifica. In SCH-02 fissare versione/tarball ufficiale e integrity nel lockfile, con provenienza e licenza; nessun caricamento del parser da CDN a runtime. Non sopprimere avvisi di sicurezza soltanto perché lo suggerisce una pagina del fornitore. [Fonte T09](FONTI_TECNICHE.md).

Budget iniziali del profilo locale: 10 MiB compressi, 100 MiB decompressi, 20 fogli, 50.000 righe complessive, 500.000 celle valorizzate, 32.768 caratteri per cella, 10 secondi di parsing prima di timeout. Sono massimi tecnici proposti, **da ridurre o motivare dopo misura sui telefoni**, non promesse di sostenibilità di ogni combinazione. Il worker non impone un tetto di memoria affidabile: il limite dei byte va applicato prima delle allocazioni; se non dimostrabile, il parser non supera il gate.

Il risultato normalizzato deve rispettare anche il limite comando dell'alpha: guardia locale 200 KiB, API/SQL 256 KiB. Un file piccolo può produrre un programma troppo grande. Non troncare dati e non aumentare globalmente il limite delle API per aggirarlo: indicare una divisione esplicita della scheda o progettare successivamente un'importazione server a job con limiti separati.

Il job server della specifica generale resta un'evoluzione per casi non coperti, con upload privato, elaborazione isolata, quote, retention e cancellazione. Non inviare automaticamente il file al server quando il telefono non riesce a leggerlo. [Fonte T11](FONTI_TECNICHE.md).

## 7. Esercizi personali

Libreria: filtri “Tutti”, “Catalogo”, “I miei”; azioni Crea, Duplica, Modifica e Archivia. Un esercizio globale si personalizza creando una variante privata, senza modificare il catalogo degli altri. Nome non univoco: segnalare possibili duplicati, consentire varianti legittime.

Campi minimi: nome, pattern/muscoli, attrezzatura, modalità, unilateralità, convenzione del carico, istruzioni opzionali. Alias facilitano la ricerca, non sostituiscono gli ID. Distinguere modifica descrittiva da cambio del gesto/macchina/basis: quest'ultimo richiede nuova variante o nuova revisione di comparabilità, senza fondere automaticamente gli storici.

Comandi proposti: `CreatePrivateExercise`, `UpdatePrivateExercise`, `ArchivePrivateExercise`, `SaveEquipmentProfile`, con precondizione di revisione e idempotenza. Una variante usata rimane leggibile negli snapshot dopo archiviazione; non può essere scelta per nuovi slot senza ripristino esplicito. Modificarla non cambia il programma approvato: l'editor propone l'aggiornamento in una nuova bozza.

Creazione offline consentita con UUID stabile e outbox. Se una nuova bozza dipende dalla variante, la dipendenza è esplicita; errore sul padre blocca la bozza senza cancellarla. La copia condivisa, quando implementata, deve copiare le dipendenze autorizzate con nuovi ID: non inviare a B un riferimento diretto all'esercizio privato di A.

## 8. Calendario: semantica da implementare

Scelta tecnica NEXT-D5 per OPEN-02: la settimana del ciclo è un'identità di programmazione, non il numero della settimana ISO. Materializzare occorrenze con `weekIndex` e `dayId` espliciti. L'utente approva calendario e collegamenti; il trascorrere del tempo non incrementa carichi, non conclude sedute e non salta fasi.

- **Pianificare:** scegliere versione approvata, data iniziale, giorni disponibili e settimane da collocare. Anteprima di date e fase, poi conferma. Creare per intervalli finiti; limite iniziale 100 occorrenze per comando atomico, con possibilità di aggiungere altri intervalli. Il limite del comando non limita il ciclo a poche settimane.
- **Rinviare una seduta:** modifica soltanto la sua data prevista; mantiene fase e dose. Esempio: A della settimana di base spostata da lunedì a giovedì resta nella stessa settimana del ciclo.
- **Spostare un gruppo:** selezionare le occorrenze future, mostrare il prima/dopo e le collisioni, confermare un comando atomico per il gruppo entro limite. Non spostare automaticamente sessioni avviate/concluse.
- **Saltare o annullare:** azione esplicita con stato proprio, nessuna sessione fittizia a zero. Una data trascorsa senza azione appare “da riprogrammare”, non “completata”.
- **Avviare:** usare l'occorrenza e una sessione con ID stabile; doppio clic/retry riapre la stessa sessione. Avviare offline su due device con due tentativi realmente differenti produce un conflitto da riconciliare, conservando entrambi i risultati, non una deduplicazione per sola data.
- **Terminare:** collega seduta reale e occorrenza nella stessa transazione; conserva la data prevista originaria e gli istanti reali. Svolgere più sedute nello stesso giorno è ammesso; una collisione è un avviso, non una prescrizione medica.
- **Nuova versione:** occorrenze esistenti rimangono ancorate alla versione scelta. Il passaggio delle future alla nuova versione richiede anteprima e conferma, eventualmente inclusa nella conferma della proposta; mai aggiornare le già avviate.

Comandi proposti: `ScheduleSessions`, `RescheduleSessions`, `CancelScheduledSession`, più estensioni tipizzate di `StartWorkout`/`FinishWorkout`. UUID dell'occorrenza stabile; vincolo unico sulla sua associazione corrente alla seduta per owner. Non imporre unicità `(owner, date)`. Rinvii concorrenti usano revisione e conflitto; archiviare un programma non cancella il diario.

Memorizzare `YYYY-MM-DD` e fuso IANA dell'occorrenza; istanti reali in UTC. Il calendario iniziale pianifica giorni, senza un sistema di appuntamenti orari. Viaggio/cambio fuso non sposta le date approvate. Un adapter Temporal per aritmetica di date evita somme di 24 ore durante i cambi d'ora; verificare il polyfill nei browser bersaglio. [Fonte T12](FONTI_TECNICHE.md).

UI: agenda come vista primaria mobile, settimana/mese su desktop; dettaglio con fase, versione e stato sync. Pulsante “Sposta” e selezione data accessibili anche senza trascinamento. Stampa di programma e calendario, temi chiaro/scuro, tastiera e focus. [Fonte T13](FONTI_TECNICHE.md).

## 9. Ticket e criteri di accettazione

| Ticket | Sviluppo e dipendenze | Prova richiesta |
| --- | --- | --- |
| SCH-01 — Modello e compatibilità | Backend/domain; 01a in M0/M1: contratti v2, mapping v1 e fixture per SYNC-05; 01b per M2: nuove tabelle/RLS, comandi, indici, schema Dexie, capacità e rollback | DB vuoto/upgrade, vecchia outbox conservata, pull v1 compatibile o blocco esplicito recuperabile, unità e modalità non inventate; QA-SEC-01/02, QA-OFF-03 |
| SCH-02 — Parser e fixture | Frontend/domain; prototipo indipendente dal cloud. Inventario dei due Excel, formato tabellare, benchmark SheetJS/ExcelJS, ZIP guard e modello intermedio | File noti e alterati, merge, formule/cache, date 1900/1904, Unicode, ZIP ostili e annullamento; QA-IMP-01 |
| SCH-03 — Catalogo privato | Frontend/backend dopo 01; editor varianti/attrezzi, comando/outbox e archiviazione, metadati per motore | A crea offline, A-PC ritrova, B non accede; stessa denominazione ≠ stessa variante; snapshot preesistente identico; ALG-09/33 |
| SCH-04 — Import completo | Dopo 01–03 e gate S; anteprima, mapping manuale, report, import atomico e riapertura bozza | Excel caricato da UI senza JSON manuale; retry una bozza, Annulla zero entità, errori preservati; QA-IMP-01, QA-EDT-01/02/03 |
| SCH-05 — Calendario | Dopo 01, integrato con 03 e gate S; date/cicli, agenda, pianificazione, rinvio, avvio e chiusura collegati | Cambio ora, anno bisestile, viaggio, rinvio, doppio avvio e concorrenza; storico invariato, QA-SYNC-03/07/10, QA-UX-01 |
| SCH-06 — Collaudo delle schede | Dopo 04/05; percorso file→bozza→approvazione→calendario→seduta→due dispositivi | Gate C: conformità fixture e isolamento, UI telefono/tastiera/stampa, import/export v1 e v2, nessuna perdita o approvazione implicita |

Ulteriori attesi obbligatori: import di quattro giorni/otto settimane; null diverso da zero; 25 posizioni e sette settimane **solo** per il file originario; formati sconosciuti e versioni future non supportate respinti; export→import preserva struttura al netto dei nuovi ID dichiarati; righe non mappate elencate; schema rifiuta un target obbligatorio senza valore; doppio avvio/chiusura non duplica sedute; archiviazione non elimina risultati.

Consegna di codice: adapter parser distinto dal mapping puro, worker fuori dal percorso del diario, componenti di anteprima/catalogo/calendario e casi d'uso circoscritti, nuovi comandi nello stesso circuito di validazione e sync. Creare cartelle e file solo quando implementano una responsabilità concreta; vietato aggiungere tutta la logica a `ProgramPage` o al solo file centrale dei contratti senza separazione leggibile.
