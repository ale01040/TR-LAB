# Generatore di schede e progressioni con conferma esplicita

13 ottobre 2026 · Specifica esecutiva futura. Non attiva metodi e non prescrive un allenamento personale. Collegamenti: [piano dell'incremento](PIANO_PROSSIME_FUNZIONI.md), [fonti e algoritmi](../FONTI_E_ALGORITMI.md), [API e consenso](../specifiche/API_E_SINCRONIZZAZIONE.md), [modello dati](../specifiche/MODELLO_DATI.md).

## 1. Obiettivo, confini e prerequisiti

RF-04/05/06/07/08, integrazione futura RF-15; WP-00/10/11, WP-15 solo dopo il nucleo; ADR-04/08/09/10/12/14/16/17; WEB-01/04/05/07/08/11/12/14; DEC-05/06/07/08/10/15/18/19/23. Il piano copre ipertrofia e forza in palestra, home gym e corpo libero per adulti, esclusi percorsi clinici/riabilitativi.

Automatizzare raccolta degli input già disponibili, selezione dei dati confrontabili, calcolo, controllo dei vincoli, spiegazione e presentazione. L'unico passaggio che cambia obiettivi approvati richiede sempre la decisione esplicita dell'utente. L'assenza di una risposta non è accettazione.

Prerequisiti di attivazione: sync affidabile, identificazione delle varianti e delle unità, snapshot effettivi della seduta, contratti compatibili, percorso di consenso collaudato e regole revisionate. La funzione candidata già presente in `packages/domain/src/index.ts` serve come punto di partenza e regressione: non basta esporla con un pulsante per avere un motore pronto.

## 2. Prima realizzare il consenso, poi collegare i calcoli

Usare inizialmente proposte sintetiche chiaramente riservate ai test. Il centro proposte mostra oggetto, stato, prima/dopo, decorrenza, ragione sintetica, dati usati/mancanti e fonti consultabili. Azioni: **Accetta questa modifica**, **Rifiuta**, **Modifica bozza**, **Chiedi alternativa**. Rifiuto, chiusura della finestra o annullamento lasciano il programma invariato; modificare il contenuto crea una nuova revisione da rivedere.

| Stato | Evento | Conseguenza ammessa |
| --- | --- | --- |
| Bozza di calcolo | Validazione ancora incompleta | Nessuna proposta applicabile, nessun nuovo target attivo |
| `pending` | Input/regole validi e contenuto persistito | Mostrare e sottoporre a review |
| `accepted` | Conferma esatta e transazione conclusa | Nuova versione, decisione e ricevuta atomiche |
| `rejected` | Rifiuto esplicito | Decisione conservata; nessuna nuova versione |
| `stale` | Dipendenza cambiata | Non applicabile, nuova proposta e nuova conferma |
| `superseded` / `withdrawn` | Alternativa sostitutiva o ritiro della regola | Conservare provenienza; impedire accettazione |
| Accettata localmente, sync pendente | Clic offline sulla revisione disponibile | Versione provvisoria sul device, conferma remota ancora da verificare |

La scadenza della challenge di review non modifica da sola lo stato della proposta: può richiedere una nuova review della stessa revisione, se ancora valida. Lo stato locale provvisorio non deve essere presentato come accettazione server conclusa.

### 2.1 Dati da conservare

`proposals`: owner, ID, tipo, revisione, stato, programma radice/versione di partenza, contenuto before/after immutabile per revisione, decorrenza, versione del motore, rule bundle, versioni catalogo/preferenze, dipendenze con revisioni, fingerprint degli input, trace e riferimenti alle fonti.

Distinguere `generate_program` da `adapt_program`: nel primo caso la versione di partenza può essere assente e `before` lo dichiara; il riepilogo specifica se si aggiunge un programma oppure si sostituisce quello corrente. L'eventuale puntatore corrente, anche assente, entra nelle precondizioni. Creare una scheda aggiuntiva non archivia implicitamente le altre. Nell'adattamento la versione di partenza è obbligatoria.

`proposal_decisions`: owner, proposta/revisione, decisione, operation ID, versione risultante, istante server e provenienza online/offline. Vincolo di una sola decisione terminale per revisione. `confirmation_challenges`: sul server token memorizzato solo come digest, sessione/owner, revisione/digest mostrato, scadenza e consumo. Nessuna capacità di review/accept concessa all'AI.

Il token di conferma arriva al browser per inviare il comando online, ma non è un token Supabase. Per il retry identico può restare nel solo comando pendente, nella partizione locale dell'account, fino alla ricevuta o al rifiuto definitivo; mai in cache HTTP/SW, stream di pull, log o export condivisi. Il backup di recupero lo omette e conserva intenzione, operation ID e digest originale, marcando la voce come non reinviabile. Il recupero consulta prima ricevuta e decisione come owner; se non applicata richiede nuova review, nuovo clic e nuovo operation ID. Non reinviare il payload oscurato sotto l'ID originale e non sostituire una challenge scaduta in un comando già inviato. MOT-02 deve verificare anche questi percorsi di riapertura ed export.

Metadati di calcolo e dati personali hanno retention distinta; non duplicare l'intero diario nel log della proposta quando bastano ID/revisioni e uno snapshot minimizzato necessario alla riproduzione. Gli snapshot conservati restano dati privati del proprietario.

### 2.2 Accettazione online

1. Client chiede review tramite BFF; il server autentica, controlla owner e restituisce il riepilogo esatto con challenge e scadenza.
2. La persona legge e clicca Accetta. L'intenzione comprende ID/revisione/hash e decorrenza già mostrati; viene salvata con operation ID stabile.
3. Server verifica identità/epoch e cerca la ricevuta sotto il lock account. Se quel comando è già riuscito, restituisce la stessa ricevuta anche se la challenge è ora scaduta. Stesso ID con contenuto diverso viene rifiutato.
4. Per una nuova operazione controlla challenge, proprietà, stato, programma corrente, dipendenze, bundle ancora ammissibile e hash del contenuto. La validazione della proposta non autorizza a eseguire JSON Patch arbitraria su qualsiasi campo.
5. In una sola transazione: nuova versione approvata, eventuale puntatore corrente/decorrenza, collegamenti alle sole occorrenze future incluse nel riepilogo, decisione, consumo challenge, ricevuta ed eventi. Niente chiamata AI, rete o ricerca combinatoria mentre i lock sono aperti.
6. Le altre proposte che condividono dipendenze mutate diventano obsolete. Le sessioni già iniziate o concluse mantengono lo snapshot precedente. Un ripensamento produce un'altra versione esplicita, senza cancellare la decisione storica.

La UI può disabilitare il doppio clic, ma l'idempotenza si verifica nel database. Due conferme concorrenti per la stessa revisione producono un solo effetto; due proposte diverse sullo stesso programma non possono vincere entrambe sulla medesima base senza rivalutazione.

### 2.3 Percorso offline e conservazione delle sedute

Consentire proposte locali soltanto con bundle pubblicato e dati necessari già scaricati. Conservare contenuto mostrato, fingerprint, revisioni, decisione esplicita e versione locale provvisoria. `AcceptOfflineProposal` è distinto dal comando online: non inventare una challenge, non estenderne la durata e non trasformare un vecchio clic in consenso a una nuova proposta.

Alla riconnessione: sincronizzare prima le evidenze da cui la proposta dipende, poi rivalutare sul server usando le versioni precise. Se input e contenuto coincidono ed è ancora ammissibile, applicare atomicamente. Se cambiano, mostrare `PROPOSAL_STALE` e preparare una nuova revisione da confermare.

**Dipendenza bloccante:** l'alpha può bloccare una catena dopo il rifiuto del padre. Prima di consentire una seduta su un piano provvisorio serve un comando di riconciliazione delle esecuzioni reali, con snapshot completo e provenienza locale, distinto dall'approvazione del piano. Tale percorso conserva serie/tempi/note anche quando l'accettazione è respinta; non crea una falsa versione remota approvata. ID e riferimenti vengono riconciliati una volta, con ricevuta e controlli di owner/stato/unità. Se manca questa funzione, l'accettazione offline del motore resta disabilitata, mentre il diario sulle schede già approvate continua a funzionare.

## 3. Fonti e validazione dei metodi

Usare le fonti KB-01–KB-07/XLS-01 già inventariate in [FONTI_E_ALGORITMI](../FONTI_E_ALGORITMI.md). Questa pianificazione ha riletto l'inventario, **non ha rivalidato scientificamente tutto il vault, i video o gli studi citati**. La ricerca tecnica allegata non sostituisce tale lavoro.

MOT-01 prepara un manifest ristretto del corpus: fonte originale, sezione, autore, data, hash/revisione, licenza/uso consentito, affermazione, popolazione/obiettivo, limiti e grado di verifica. Il vault completo non entra nel repository pubblico o in un servizio AI. Prima di adottare soglie operative, risalire alle fonti primarie e farle revisionare da competenze di allenamento; i parametri nutrizionali rimangono in F7.

Ogni regola contiene: ID/versione, stato `draft/reviewed/active/retired`, obiettivo/modo supportati, prerequisiti, parametri con unità, eccezioni, precedenza, sorgenti e casi attesi. Nessuna regola diventa attiva se manca un parametro richiesto, una fonte necessaria o la revisione. Non usare il numero di test verdi come prova di efficacia fisiologica.

L'utente può creare varianti private per registrare esercizi. Metadati sufficienti alla registrazione non sono automaticamente una revisione tecnica del gesto: la variante entra nel generatore soltanto se compatibile con un template/metodo supportato; altrimenti resta disponibile nell'editor manuale.

## 4. Architettura del motore e riproducibilità

Pipeline pura, con esiti tipizzati già previsti: `proposal`, `keep_current`, `insufficient_data`, `incompatible_constraints`, `needs_review`.

```text
snapshot + regole/versioni + preferenze + catalogo + tempo/seed espliciti
  → normalizzazione
  → risoluzione della prescrizione effettiva
  → selezione delle evidenze comparabili
  → valutazione o ricerca del programma
  → controllo dei vincoli e delle precedenze
  → proposta strutturata + trace + motivazione
  → persistenza privata e review
  → decisione esplicita → comando transazionale
```

Separare funzioni `resolvePrescription`, `selectComparableEvidence`, `evaluateRule`, `generateProgram`, `validateDraft`, `resolveProposalConflicts`, `explainDecision`. Nomi orientativi, responsabilità obbligatorie. Dominio senza React, clock globale, casualità nascosta, rete o database. Le traduzioni italiane derivano da codici e trace, senza essere l'unica rappresentazione dell'esito.

Stessi input canonici, seed e versioni producono lo stesso output, anche con ordine diverso delle righe DB. Ordinare candidati e spareggi con criteri stabili; conservare l'ordine semantico di giornate e serie. Il parametro oggi chiamato `increments` nella funzione candidata contiene carichi disponibili assoluti: rinominarlo chiaramente o documentarne il contratto, senza sommare di nuovo quel valore al carico corrente.

Fingerprint con serializzazione/versione dichiarate e vettori browser/server. RFC 8785 è un riferimento per la canonicalizzazione JSON, non un obbligo di cambiare retroattivamente l'hash SQL delle ricevute v1. Digest della proposta e digest del comando sono campi/versioni distinti. Rispettare DEC-23: SHA-256 nel database, SHA-3 nel server; testare le rappresentazioni prima di confrontarle e non confrontare direttamente digest di algoritmi diversi. [Fonte T14](FONTI_TECNICHE.md).

### 4.1 Dove si calcola e chi può persistere

Il client esegue il dominio per anteprima/offline; il server ricalcola o valida autorevolmente il risultato prima della sua pubblicazione. Un browser ostile non può creare una proposta “revisionata” inviando liberamente after/rule/status alla RPC.

Progettare un adapter server di pubblicazione delle valutazioni con privilegio minimo dedicato, non un DML pubblico. La funzione privata riceve il risultato validato dal servizio autorizzato, ricontrolla le revisioni di origine e registra proposta/eventi/ricevuta sotto lock breve. In alternativa una validazione SQL equivalente deve essere dimostrata: **il solo controllo TypeScript nel BFF non protegge una RPC chiamabile direttamente con JWT utente**. I normali comandi utente non possono firmare bundle, pubblicare regole, cambiare stato a `accepted` o scrivere decisioni genericamente.

Calcolare fuori dalla transazione, poi verificare che le evidenze non siano cambiate prima del commit; se cambiano rivalutare con tentativi limitati. Separare il ruolo tecnico di pubblicazione dalle normali API utente e dal ruolo curatore del catalogo; niente service role generica nel browser o nei test dell'isolamento.

## 5. Progressioni: comportamenti e limiti

| Famiglia | Dati e controllo | Esito consentito / rischio da evitare |
| --- | --- | --- |
| Doppia progressione | Tutte le serie di lavoro prescritte per quella fase, lati, ripetizioni, RIR, variante e carichi confrontabili | Prossimo taglio realmente disponibile solo alle condizioni del metodo; nessuna selezione delle sole serie riuscite |
| Ripetizioni serie per serie | Stato della sequenza approvata e prestazioni richieste | Passo dichiarato, ad esempio distribuzione fra serie; il tempo trascorso non basta |
| Ponte fra scatti di carico | Tagli reali, massimo volume/tempo del metodo e extra del ciclo | Non sommare ponte ed extra vietato dall'Excel; nessun peso inesistente |
| Ciclo e scarico | Fase approvata e override effettivi, regola di arrotondamento | Distinguere variazione già approvata nel ciclo da nuovo adattamento che richiede conferma |
| Stallo | Esposizioni comparabili sufficienti e continuità dei dati | Una settimana senza allenamento non equivale a un fallimento; se insufficiente non inventare una diagnosi |
| Forza | Template revisionati, riferimento misurato/stimato distinto, ambito della formula | Percentuali, top set/back-off ed e1RM solo dove definiti; niente test massimale automatico |
| Corpo libero | Variante/prerequisiti, ripetizioni o tempo, assistenza e zavorra distinte | Meno assistenza può aumentare difficoltà; il cambio gesto richiede nuova comparabilità, non un semplice +kg |

Chiave di confronto: variante e sua revisione semantica, attrezzatura/macchina, basis, modalità, lato, ruolo nel giorno, metodo e fase. Nomi simili non bastano. Warm-up ed extra hanno trattamento esplicito; serie obbligatorie mancanti non scompaiono dal denominatore. Dolore o esecuzione dichiarata non confrontabile producono revisione/limite del confronto, senza impedire di conservare il risultato reale.

Ogni proposta deve rispondere a: cosa cambia; quali dati lo giustificano; quali mancano; quale regola/versione/fonte è usata; da quando vale; quali altre proposte sono incompatibili. Non attribuire percentuali di “confidenza” senza calibrazione. Rifiuto della stessa proposta e stesso fingerprint ne impediscono la riproposizione insistente; nuovi dati o richiesta esplicita possono avviare una nuova valutazione.

## 6. Generatore: algoritmo operativo

Input richiesti progressivamente: obiettivo, livello dichiarato, giorni disponibili, limite/durata desiderata, luogo, attrezzatura e tagli, esercizi esclusi, preferenze, varianti praticate, priorità, eventuale storico confrontabile. L'assenza di storico non blocca una bozza generale, ma impedisce di inventare carichi personali esatti.

Distinguere vincoli obbligatori (attrezzi disponibili, esclusioni, modalità supportate, eventuale tempo massimo dichiarato) da preferenze (varietà, esercizi graditi, durata desiderata entro tolleranza). Non declassare un massimo a preferenza senza scelta esplicita nella UI.

1. Selezionare template revisionati compatibili con obiettivo, esperienza e disponibilità; restituire motivazione se nessuno è applicabile.
2. Filtrare esercizi per vincoli obbligatori e compatibilità prima del ranking; nessun ID creato dal modello AI.
3. Ordinare candidati con pesi versionati per preferenze, copertura e familiarità; spareggio stabile. Nessun punteggio può compensare un'esclusione obbligatoria.
4. Assegnare slot/dose e ricontrollare vincoli dopo ogni passo, con backtracking limitato. Budget iniziale già proposto: 5.000 stati, con contatore e annullamento; profilare e usare worker se il calcolo blocca la UI.
5. Stimare tempo con lavoro, lati, recuperi, warm-up, giri di superserie e transizioni; riportare intervallo/assunzioni, non una durata certa.
6. Validare intera settimana/ciclo, volume secondo convenzioni del metodo, completezza e assenza di doppioni vietati; produrre trace e lista degli eventuali vincoli incompatibili.
7. Presentare bozza e alternative. Nessuna soluzione trovata entro budget significa ricerca incompleta, non impossibilità matematica. Nuova alternativa usa seed/parametri registrati, senza cambiare di nascosto i vincoli.
8. Conferma tramite lo stesso centro proposte. Se l'utente modifica la bozza, rivalidare e mostrare il risultato nuovo prima dell'approvazione.

Per il primo motore non adottare un solver generale o un LLM come unica sorgente del programma. OR-Tools resta un'alternativa concreta da confrontare su casi fattibili difficili; introduce modellazione/integrazione e stati di risultato da trattare correttamente, compresa la ricerca non conclusa. [Fonte T15](FONTI_TECNICHE.md).

## 7. Automazione senza applicazioni nascoste

Eventi: seduta conclusa, correzione esplicita dei risultati, preferenze/attrezzatura cambiate, richiesta di nuova scheda e nuovo bundle ammissibile. Ogni evento invalida solo le valutazioni dipendenti; nessun ricalcolo su ogni tasto del diario.

Online: accodare un job persistente nella transazione che registra l'evento; esecutore con lease/scadenza, tentativi limitati e idempotency key su owner/ambito/fingerprint/versione motore. Non affidarlo a una Promise dopo la risposta HTTP. L'esecutore calcola fuori dai lock, ricontrolla le dipendenze e pubblica soltanto una proposta pending. La sua invocazione periodica e il recupero dei job dopo crash devono essere provati nell'hosting scelto prima di promettere analisi a pagina chiusa.

Offline: una valutazione locale opportunistica può preparare la proposta, con lo stesso fingerprint del calcolo server; riconciliare i due risultati senza duplicare notifiche. Diario e timer non attendono il motore. Se l'esecutore remoto è indisponibile, indicare “analisi in attesa” e consentire rivalutazione quando l'app torna attiva.

Un kill switch ferma nuove generazioni/accettazioni della regola ritirata; non cancella schede approvate, decisioni o risultati. Bundle offline ritirato: server blocca l'applicazione non più ammissibile e conserva comunque le esecuzioni reali. “Aggiorna tutto automaticamente” non deve essere un'impostazione che elude DEC-06.

## 8. Ticket e gate

| Ticket | Attività / dipendenze | Criterio di uscita |
| --- | --- | --- |
| MOT-01 — Contratto e corpus | Dominio/backend in M0; schemi proposta/trace, catalogo dipendenze, manifest fonti e matrice di copertura dei metodi | Parametri/fonte/revisore assegnati, casi indipendenti; draft non pubblicabili. Non richiede l'AI |
| MOT-02 — Consenso online | Dopo gate S e SCH-01; tabelle/RLS/challenge/RPC, UI prima/dopo, decisioni e decorrenza, sintesi di prova | QA-APP-01/02/05 e QA-SEC-01/02/03: retry, challenge scaduta, doppio clic, concorrenza, bypass, owner errato |
| MOT-03 — Consenso offline e recupero | Dopo 02 e SYNC-04; versione provvisoria, AcceptOfflineProposal, riconciliazione delle sedute, migrazione dei riferimenti | QA-APP-03, ALG-15/35: piano obsoleto respinto ma seduta reale recuperata; nessuna falsa approvazione |
| MOT-04 — Progressioni revisionate | Dopo gate A; evidenze comparabili, dose risolta, regole per ogni famiglia e trace, rifiuto/dedup | ALG-01–18/25–29/31–35 pertinenti al motore; risultati equivalenti client/server e fonti validate |
| MOT-05 — Generatore | Dopo contratti catalogo e 04; template, vincoli, ranking, ricerca limitata, validatore e UX alternative | ALG-16/17/18/26/30/31/32: vincoli mai sacrificati, timeout esplicito, zero carichi personali inventati |
| MOT-06 — Valutazione automatica | Dopo 02/04/05; job persistenti, invalidazione, retry/lease, rollout bundle, notifiche deduplicate | Crash prima/dopo pubblicazione, ritiro bundle, dati cambiati e rifiuto: una proposta coerente, mai applicazione diretta |
| MOT-07 — Campagna integrata | Dopo 03–06 e SCH-06; percorsi completi e revisione dominio/QA | Gate D/R: ambiti confermati coperti, consenso non aggirabile, storico intatto e dati offline conservati |

Gate A riguarda il consenso e precede regole attive. Prima di chiudere D, tutti gli ambiti confermati devono avere metodi operativi e casi di prova: l'assenza di una famiglia di forza/corpo libero non può essere nascosta dichiarando completo solo il caso ipertrofia più semplice.

Dataset di sviluppo proposto: almeno 60 profili sintetici distribuiti fra obiettivi/ambienti, con vincoli incompatibili, attrezzatura incompleta e storico mancante; fixture dei singoli algoritmi separate dal set di valutazione finale. È una soglia di progetto, non prova statistica di efficacia. Revisore prepara gli attesi dei casi normali/limite senza copiare il calcolo produttivo. Report per famiglia: schema valido, rispetto vincoli, identità/permessi, trace corretta, determinismo, latenza e memoria.

Le suite nutrizionali ALG-19/20 e AI ALG-22/23/24 restano obblighi delle rispettive fasi F7/F9, non finte verifiche eseguite in questo incremento. L'assistente futuro usa lettura/proposta/validazione, senza strumenti `AcceptProposal`, `ApproveProgram` o SQL arbitrario; deve passare dallo stesso consenso già collaudato.
