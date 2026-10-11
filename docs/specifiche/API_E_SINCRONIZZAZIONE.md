# API, comandi e sincronizzazione offline

Versione 1.2 · Contratto obiettivo della versione completa. L'alpha implementa sette comandi e API `/api/auth/*`, `/api/sync/*`; source of truth eseguibile in `packages/contracts/src/index.ts` e `apps/server/src/`. Stato nel [rapporto implementazione](../qualita/STATO_IMPLEMENTAZIONE.md). Job, risoluzione guidata dei conflitti, restore multi-device e gli altri endpoint restano da implementare/collaudare sul provider.

Ogni richiesta sync dell'alpha include `X-Account-ID` con l'account della coda locale. Il server confronta questa precondizione con l'identità derivata dalla cookie prima della RPC; header mancante/diverso produce 409 `ACCOUNT_CHANGED`. L'header non concede permessi e non sostituisce Auth/RLS. Protegge anche GET bootstrap/pull dal cambio account durante richieste concorrenti.

## 1. Principi e responsabilità

Il salvataggio locale conclude l'azione del diario anche senza rete. La sincronizzazione è un processo successivo osservabile. Il server resta autorevole per revisioni condivise, permessi e decisioni applicate. Nessuna risposta remota deve cancellare un'operazione locale non confermata.

Separare tre stati: `saved_local`, `pending_sync`, `synced`. Un errore IndexedDB è `not_saved`, non un generico errore di rete. Un timeout HTTP è esito remoto sconosciuto, non dimostrazione che il comando sia fallito.

Comunicazione JSON su HTTPS tramite `/api/v1`, cookie HttpOnly e protezione CSRF per mutazioni. Owner ricavato dalla sessione, mai accettato come identità dal payload. I DTO devono essere espliciti; non serializzare direttamente righe di database.

Revisioni e sequenze PostgreSQL `bigint` viaggiano come stringhe decimali canoniche, per esempio `"3"`: cifre senza segno o zeri iniziali, salvo `"0"`, con valore massimo `9223372036854775807`. Il cast SQL a testo deve avvenire prima della serializzazione JSON di PostgREST, non dopo che l'SDK ha già letto un numero impreciso. Nel codice usare confronto esatto o `BigInt`, mai `Number` per questi contatori; convertire a stringa prima di serializzare. Quantità fisiche intere con limiti di dominio entro gli interi sicuri possono restare numeri JSON. [Limiti degli interi JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER).

## 2. Operazioni HTTP

| Endpoint / metodo | Funzione | Rete richiesta |
| --- | --- | --- |
| `POST /auth/signup`, `/auth/login`, `/auth/logout` | Identità tramite Supabase e sessione applicativa | Sì |
| `GET /auth/google/start`, `/auth/google/callback` | OAuth con stato e PKCE | Sì |
| `GET /session` | Profilo minimo, scadenza applicativa, capacità e `sync_epoch` corrente | Sì; offline mostra l'identità locale già inizializzata, salvo logout locale |
| `POST /commands` | Un comando di dominio, con ricevuta | Sì per applicazione remota |
| `POST /sync/push` | Batch limitato di comandi con dipendenze | Sì |
| `GET /sync/pull?cursor=...&limit=...` | Cambiamenti ordinati dell'account | Sì |
| `POST /sync/bootstrap` | Snapshot iniziale consistente e cursore | Sì |
| `POST /proposals/{id}/review` | Riepilogo corrente e challenge di conferma online | Sì |
| `POST /imports`, `GET /jobs/{id}` | Caricamento autorizzato ed esito elaborazione | Sì |
| `POST /exports` | Export remoto tracciato; distinta l'esportazione locale d'emergenza | Sì |
| `POST /shares/resolve` | Risolve token ricevuto, restituisce anteprima consentita | Sì |
| `POST /assistant/runs` | Avvia risposta/proposta, supporto streaming e annullamento | Sì |

Registrazione, recovery, cambio email/password e collegamento Google devono avere contratti e test dedicati in F3. Il contratto esecutivo OpenAPI elenca tutti gli endpoint, limiti e campi: questa tabella non autorizza endpoint CRUD generici per ogni tabella.

## 3. Envelope di comando

```json
{
  "protocol_version": 1,
  "sync_epoch": "7b2eac4e-a89c-41bf-a6bd-d6775ac8c666",
  "operation_id": "b5b9d796-3942-4a1d-9497-9e091a442222",
  "device_id": "4907d5b8-7961-4f12-9b75-2a4161601111",
  "command": "SaveSet",
  "aggregate_id": "2c13a7ed-f3ea-4765-b7e2-952549414444",
  "base": { "kind": "server_revision", "revision": "3" },
  "depends_on": [],
  "client_recorded_at": "2026-10-10T10:15:00Z",
  "payload": {
    "set_id": "2c13a7ed-f3ea-4765-b7e2-952549414444",
    "session_id": "1342048c-abce-49f2-bc1f-d2e592863333",
    "session_exercise_id": "bdc75de9-96c8-4349-b2a8-7fcf374d5555",
    "status": "completed",
    "reps": 10,
    "rir": 2,
    "load": { "grams": 20000, "basis": "per_dumbbell" }
  }
}
```

Esempio sintetico, non prescrizione. `aggregate_id` identifica l'entità versionata a cui si applica `base`: in SaveSet coincide con set_id; in FinishWorkout è la sessione, in SaveProgramDraft è la bozza. Il server controlla separatamente stato e proprietà dei padri. Device ID identifica una coda, non autentica una persona. Il timestamp client serve allo storico, non ai permessi o alla precedenza.

Modificare una serie incrementa anche la revisione delle evidenze/riepilogo della sessione. Due serie distinte possono essere salvate senza conflitto sulla loro revisione individuale; completare la sessione richiede invece la revisione aggiornata e il controllo dei risultati. Dopo chiusura, una modifica usa un comando esplicito di correzione, non un SaveSet che ignora lo stato del padre.

Per due modifiche locali consecutive allo stesso record, la seconda usa `base: {kind: 'operation_result', operation_id: '<prima>', record_id: '<record>'}` e dichiara la dipendenza. La ricevuta precedente espone le revisioni risultanti per tipo di entità e ID: il server seleziona quella del record indicato, che deve coincidere con il tipo atteso dal comando e con `aggregate_id`. Un riferimento mancante o non pertinente è rifiutato. Questo permette anche a FinishWorkout di usare la revisione della sessione aggiornata da SaveSet. Se quella revisione è stata poi cambiata da un altro dispositivo, restituisce conflitto. Non inviare due comandi entrambi con una revisione remota ormai vecchia sperando nel loro ordine di arrivo.

## 4. Idempotenza ed errori

Chiave di deduplicazione `(owner_id, operation_id)`. Hash del payload canonico e del comando, esclusi solo metadati di trasporto dichiarati. Stesso ID e stesso contenuto restituiscono la ricevuta precedente senza riapplicare; stesso ID e contenuto diverso restituiscono `OPERATION_ID_REUSED`. Non modificare una voce outbox già inviata: una correzione è un nuovo comando.

Ricevuta: operation ID, stato terminale, revisioni risultanti, mapping di ID se necessario e cursore informativo. Registrarla nella stessa transazione della mutazione. Dopo una risposta persa, il retry recupera la ricevuta. Conservare le ricevute minime finché l'account può ritentare comandi; base iniziale: per la vita dell'account, senza payload personale completo, con purge alla cancellazione. Un'eventuale retention più breve richiede prima un protocollo di scadenza dei device.

Ordine obbligatorio: autenticare e verificare account/epoch → sotto il lock dell'account cercare la ricevuta e confrontare l'hash → se esiste restituirla → altrimenti validare precondizioni, eventuale challenge e dominio → registrare esito e mutazioni atomiche. Un retry di AcceptProposal già riuscito recupera quindi la ricevuta anche se nel frattempo la challenge è stata consumata o è scaduta. Una challenge scaduta per un comando mai applicato richiede nuova review e conferma. Gli errori transitori di autenticazione, rate limit e infrastruttura non diventano ricevute terminali; un rifiuto di dominio registrato resta invece stabile per quell'operation ID. Dopo una risoluzione che modifica il comando serve un nuovo ID. Un errore inatteso nella transazione annulla anche ricevuta ed eventi.

Il cursore informativo di una ricevuta non è il cursore dell'ultimo pull completato: non avanzare il secondo prima di aver acquisito atomicamente tutti gli eventi intermedi, altrimenti si perdono modifiche dell'altro dispositivo.

| HTTP / codice applicativo | Comportamento client |
| --- | --- |
| 400 `INVALID_PAYLOAD` | Evidenzia campi; niente retry cieco |
| 401 `AUTH_REQUIRED` | Sospende invio, conserva coda, richiede accesso |
| 403 `FORBIDDEN` o 404 coerente | Blocca operazione e non rivela dati di altri utenti |
| 409 `REVISION_CONFLICT` | Mostra versioni e risoluzione esplicita |
| 409 `PROPOSAL_STALE` | Non applica; prepara nuova proposta da confermare |
| 409 `OPERATION_ID_REUSED` | Errore di protocollo da diagnosticare |
| 409 `SYNC_EPOCH_CHANGED` | Sospende invio; recupero dopo restore come in §6.1, senza replay automatico |
| 410 `CURSOR_EXPIRED` | Bootstrap nuovo preservando outbox e modifiche locali |
| 413 `PAYLOAD_TOO_LARGE` | Riduce batch; import con limite distinto |
| 422 `DOMAIN_INVALID` | Spiega violazione di dominio, conserva input |
| 429 `RATE_LIMITED` | Rispetta Retry-After; diario locale disponibile |
| 503 / timeout / offline | Retry con backoff e jitter, stesso operation ID |

Risposta errore con `code`, `request_id`, messaggio pubblico e problemi dei campi. Non esporre stack, query SQL, token o dettagli di account terzi.

## 5. Transazione locale e invio

1. Validare input e convertirlo in quantità canoniche.
2. Nella stessa transazione Dexie aggiornare la proiezione locale e inserire comando/outbox.
3. Solo al commit locale mostrare “Salvato sul dispositivo”. Non attendere Internet per questa conferma.
4. Fuori dalla transazione locale, il processo di sync seleziona comandi pronti in ordine di dipendenza.
5. Invia batch limitati, per esempio massimo 50 comandi/256 KiB come valori tecnici iniziali da provare.
6. Applicare ricevute e stato outbox nella stessa transazione locale; poi eseguire pull.

Più tab del browser coordinano un solo mittente tramite lock con lease; la correttezza remota resta garantita anche se due mittenti partono insieme. Una tab che muore non deve lasciare un lock eterno. Il batch ha esiti per singolo comando: un comando fallito blocca i dipendenti, non tutte le altre sessioni. All'interno di un comando l'atomicità è completa.

Non eliminare l'outbox dopo la sola partenza di una richiesta. Non usare debounce che lasci una serie dichiarata salvata solo in memoria. Un campo ancora in modifica può essere bozza; il completamento serie deve eseguire una scrittura persistente.

## 6. Cursori, snapshot e pull

Non usare `updated_at > ultimo_timestamp`: orologi, parità e transazioni concorrenti possono perdere record. Usare una sequenza per account allocata sotto lock transazionale della riga `account_sync_state`. Ogni evento riceve una sequenza distinta; tutte le scritture personali, inclusi job, rispettano il lock. Una transazione successiva dello stesso account non alloca sequenze prima del commit della precedente.

`pull` restituisce eventi ordinati, tombstone, `next_cursor`, `has_more` e watermark. Il cursore è opaco, legato all'account, alla versione del protocollo e a `sync_epoch`; non è un'autorizzazione. Lettura degli eventi e watermark in snapshot coerente. Pagina e cursore si salvano atomicamente sul dispositivo.

Per bootstrap paginato creare uno snapshot consistente associato a un watermark H, con token breve e scadenza, poi scaricare le pagine e recuperare eventi successivi a H. Non paginare tabelle vive usando un H iniziale senza snapshot: si rischiano righe mancanti. Lo snapshot va scaricato in un'area locale temporanea; scambiarlo con la base sincronizzata solo se completo, mantenendo overlay e outbox.

Gli eventi possono essere compattati con watermark minimo supportato. Un device troppo vecchio riceve `CURSOR_EXPIRED`, scarica una nuova base e ripropone la propria outbox senza cancellarla. La versione del catalogo comune si sincronizza separatamente: non richiede duplicare ogni aggiornamento del catalogo in ogni stream utente.

### 6.1 Ripristino del server a uno stato precedente

`sync_epoch` è un UUID della generazione dei dati, distinto dalla versione del protocollo. Rimane stabile nei normali deploy e cambi di schema compatibili. Dopo un ripristino storico del database, prima di riaprire il traffico, l'operatore deve assegnare un nuovo UUID: recuperare dal backup il vecchio valore senza cambiarlo non è sufficiente. Handshake, comandi, cursori e snapshot di bootstrap portano l'epoch; il controllo server precede ogni mutazione di dominio sincronizzata. Anche i job preesistenti devono essere riconciliati prima di riattivare i worker.

Un epoch diverso rende invalidi cursori e precondizioni precedenti. Fermare push/pull ordinari, conservare base locale, overlay e outbox in un'area di recupero ed esporre un export locale. Dopo l'accesso, scaricare la nuova base completa e confrontarla con i dati conservati. Non riutilizzare automaticamente le operazioni della generazione precedente: anche le ricevute possono essere tornate indietro, quindi un replay cieco non garantisce più deduplicazione. Il percorso di riconciliazione controlla ID, contenuto e dipendenze, presenta le differenze e produce nuovi comandi/ID soltanto dopo risoluzione esplicita. Le proposte cambiate richiedono nuova accettazione.

Anche dati che il dispositivo ricordava come sincronizzati possono mancare dopo il restore. Non cancellarli automaticamente durante il bootstrap; renderli confrontabili nel recupero. I dispositivi possono contribuire al recupero dei dati effettivamente conservati, ma non sostituiscono i backup né annullano la perdita ammessa dall'obiettivo RPO. Questo caso è distinto da `CURSOR_EXPIRED`, che presuppone continuità del registro delle operazioni.

## 7. Conflitti, cancellazioni e record locali

| Caso | Risoluzione |
| --- | --- |
| A e B aggiungono serie con ID distinti | Conservare entrambe se relazioni valide |
| A e B modificano la stessa serie dalla revisione 3 | Primo comando produce 4; secondo riceve conflitto e i dati necessari al confronto |
| Il pull contiene un record con modifiche locali pendenti | Aggiornare base remota, preservare overlay; mostrare conflitto se non conciliabile |
| A cancella, B modifica offline | Non far risorgere automaticamente il record; offrire eventuale copia come nuova entità dopo scelta |
| A cancella il programma mentre B registra | Conservare i risultati con snapshot; collegamento storico a versione archiviata o provenienza locale |
| Doppio avvio della stessa seduta | UUID del tentativo stabile; se sono due sessioni realmente distinte richiedere scelta, non deduplicare per sola data |

Conflitto mostra valore locale, remoto, date informative e conseguenze. “Mantieni il mio” invia un nuovo comando basato sulla revisione remota appena vista; non equivale a sovrascrittura senza controllo. Campi distinti possono essere uniti soltanto con una regola documentata e testata, non con merge JSON universale.

## 8. Conferma delle proposte

Online: review restituisce contenuto esatto, revisione, hash canonico e challenge monouso legata a sessione/proprietario/scadenza. Il componente mostra differenze e decorrenza; il clic esplicito crea `AcceptProposal`. Il server verifica challenge, revisioni del programma e tutte le dipendenze, poi applica la transazione del modello dati. Nessun tool AI può ottenere o consumare conferme per conto dell'utente.

Offline: il client può generare solo con pacchetto regole e dati già disponibili. Memorizza snapshot, fingerprint, revisione regole, decisione esplicita e versione locale provvisoria. Alla riconnessione un comando dedicato `AcceptOfflineProposal` invia questi dati: il server ricalcola/valida, confronta dipendenze e contenuto e applica soltanto se equivalenti. Non trasformare retroattivamente la vecchia accettazione in consenso a un contenuto cambiato. Non richiedere un challenge online a chi è offline; il ramo offline ha una suite specifica e non deve essere simulato aggirando la scadenza dei challenge online.

Il server può verificare identità e coerenza del comando, non dimostrare fisicamente che un umano abbia cliccato. La garanzia è architetturale: interazione esplicita nel client affidabile, endpoint distinti, log, permessi e nessuna capacità di applicazione concessa all'AI.

## 9. Vita della PWA

| Risorsa | Politica |
| --- | --- |
| JS/CSS con hash, icone e shell senza dati personali | Precache/versionamento; aggiornamento controllato |
| `/api`, auth, callback, risposte con Set-Cookie | Network only nel service worker; `private, no-store`, cache CDN esclusa |
| Diario, programmi scaricati, outbox | IndexedDB per account, indipendente da Cache Storage |
| Media pubblici del catalogo | Cache limitata per dimensione/età; non necessaria alla registrazione |
| File personali temporanei | Accesso autorizzato, scadenza; niente cache pubblica |

Il primo accesso e il download iniziale richiedono rete. Avvio/ripresa/chiusura, serie, timer e note offline sono obbligatori. Generazione remota AI, inviti e dati mai scaricati richiedono rete. Notifiche e background sync sono miglioramenti opportunistici: il percorso garantito è sync quando l'app torna attiva.

Non attivare un aggiornamento service worker a metà seduta o con campi non persistiti. Mostrare disponibilità della nuova versione; migrare IndexedDB senza azzerare dati. Al cambio account chiudere query/listener precedenti, sospendere sync e aprire lo storage corretto. Logout con outbox offre sync, export locale o eliminazione esplicita; niente accesso del nuovo account ai dati precedenti.

Il logout offline chiude subito l'accesso locale e scrive un marcatore persistente `logout_pending`, condiviso tra le tab e verificato prima di inizializzare l'app. JavaScript non può eliminare un cookie HttpOnly e la revoca server resta pendente: non mostrare che sia già avvenuta. Alla riconnessione, prima di sync, recupero dati personali o nuovo login, completare il logout protetto da CSRF e attendere la conferma; una sessione già scaduta/revocata produce comunque una conclusione sicura e il server cancella il cookie. Il percorso deve poter ottenere il minimo materiale anti-CSRF necessario senza riaprire l'area personale. Solo allora rimuovere il marcatore e consentire un login esplicito; nessuna riapertura automatica tramite il cookie rimasto. Coordinare le tab e impedire che una richiesta di logout ritardata chiuda una nuova sessione. Il marcatore è una protezione del flusso locale, non una revoca remota contro un client manomesso.

Logout ordinario revoca la sessione applicativa corrente e usa esplicitamente lo scope Supabase `local`; “Esci da tutti i dispositivi” è un'azione distinta con scope `global` e revoca delle sessioni applicative corrispondenti. Non affidarsi al valore predefinito del provider. [Scope e limiti del sign-out Supabase](https://supabase.com/docs/guides/auth/signout).

Quote esaurite o storage eliminato dal browser sono casi distinti: errore di salvataggio evidente, export se ancora possibile, recupero dei soli dati remoti esistenti. Non promettere recupero di dati mai sincronizzati e già eliminati dal dispositivo.

## 10. Versioni e compatibilità

Contratti HTTP versionati, schema Dexie versionato, rule bundle indipendente. Supportare almeno versione corrente e precedente durante i rollout ordinari; definire durata e comportamento per client più vecchi in F2. Il server può sospendere la sync di un protocollo non supportato ma deve permettere export locale e aggiornamento guidato prima della perdita di compatibilità. Stato non sincronizzato preservato fino a recupero.

Prove obbligatorie in [QA-SYNC e QA-OFF](../qualita/TEST_E_ACCETTAZIONE.md). Non dichiarare affidabile il protocollo sulla base di test con una sola tab e rete sempre presente.
