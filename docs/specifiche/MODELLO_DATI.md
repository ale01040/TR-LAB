# Modello dati, vincoli e autorizzazioni

Versione 1.2 · Specifica logica della versione completa. La prima migrazione SQL è presente e testata su PGlite; nessuno schema cloud è ancora installato da questo lavoro. L'alpha usa aggregati JSONB validati, riferimenti relazionali e RLS: [adattamento motivato e percorso di normalizzazione](../architettura/SCELTE_IMPLEMENTAZIONE.md). Le tabelle dei moduli successivi qui descritte restano da implementare.

## 1. Convenzioni comuni

UUID generati anche offline; UTC per istanti (`timestamptz`), `date` + fuso IANA per giornate locali. L'ora del dispositivo non ordina la sincronizzazione. Entità personali con `owner_id`, `id`, `revision bigint`, date di creazione/aggiornamento server e `deleted_at` ove sincronizzabili. Non usare email come chiave applicativa.

Numeri decimali esatti nel database (`numeric` con scala dichiarata); per carichi e misure usare nel dominio quantità normalizzate a unità intere sufficientemente precise, ad esempio grammi e millimetri. Il DTO dichiara sempre unità e convenzione. Nessun arrotondamento intermedio nascosto. Valori mancanti sono `null` o campi assenti secondo lo schema, mai zero. RIR zero significa cedimento dichiarato, quindi è diverso dal dato mancante.

Le revisioni si incrementano sul server, non tramite timestamp del telefono. La precondizione è chiamata `base` nel contratto API: un record nuovo usa `{kind: 'server_revision', revision: '0'}`; uno aggiornato cita la revisione letta o il risultato di un comando precedente. Revisioni, numeri di versione persistenti e sequenze `bigint` sono stringhe decimali nei DTO e nei risultati RPC: convertirli a testo in SQL prima della serializzazione, per evitare perdita di precisione in JavaScript. Limiti e formato sono definiti nel contratto API. Indici e vincoli vanno verificati con query e casi realistici. Ogni modifica a un figlio aggiorna anche le revisioni delle evidenze e degli aggregati da cui dipendono completamento e proposte, senza far confliggere inutilmente i record figli distinti.

## 2. Aggregati e tabelle

| Aggregato / tabelle | Campi essenziali oltre a quelli comuni | Invarianti principali |
| --- | --- | --- |
| Identità: `profiles` | `auth_user_id`, display name, locale, timezone, account status | Una identità applicativa per utente Auth; nessuna password qui |
| Preferenze: `training_preferences`, `equipment_profiles`, `equipment_items` | Obiettivo, disponibilità, attrezzi, tagli consentiti, unità | Preferenze versionate; non riscrivono un programma già approvato |
| Catalogo: `exercises`, `exercise_variants`, `exercise_muscles` | Nome, sinonimi, movimento, modalità, muscoli, visibilità, revisione contenuto | Variante archiviata ancora leggibile nello storico; entry globale modificabile solo da curatore |
| Programma: `programs` | Nome, stato, `current_version_id` | Una versione corrente per programma; attivazione esplicita |
| Versioni: `program_versions` | Numero versione, stato bozza/approvata, provenienza, rule bundle, digest | Versione approvata immutabile; contenuto validato prima dell'attivazione |
| Prescrizioni: `program_days`, `exercise_blocks`, `prescribed_exercises`, `prescribed_sets` | Posizione, variante, gruppo, ripetizioni/durata, RIR, riposo, lato, carico e tipo serie | Figli della stessa versione/proprietario; ordine univoco entro il padre |
| Ciclo: `cycles`, `cycle_weeks`, `prescription_overrides` | Program version, fase, settimana, patch strutturata | Priorità di override deterministica; dose effettiva risolvibile senza formule Excel |
| Calendario: `scheduled_sessions` | Giorno ciclo, data prevista, stato e rinvio | Spostamento non altera le sedute eseguite; separare pianificato da reale |
| Diario: `workout_sessions`, `session_exercises`, `set_logs` | Snapshot target, stato, tempi, risultati, tipo serie, lato, device | Ogni serie appartiene a una sessione dell'utente; risultati distinti dai target |
| Misure: `measurements`, `weight_entries` | Data locale, tipo misura, valore, lato, unità, qualità/note | Peso in una sola tabella; niente zero automatico quando manca un campione |
| Nutrizione: `nutrition_target_versions` | Calorie/macro, input, metodo, decorrenza, approvazione | Cambi producono versioni; non alterano target storici |
| Proposte: `proposals`, `proposal_decisions` | Tipo, revisioni dipendenze, before/after, motivi, decorrenza, regole, stato | Payload di una revisione immutabile; una decisione terminale per revisione |
| Conferme: `confirmation_challenges` | Hash token, owner/session, proposal revision/hash, scadenza, consumo | Token monouso legato al riepilogo; niente credenziali in chiaro |
| Copie: `share_links`, `share_imports` | Hash token, snapshot consentito, scadenza, revoca, copia risultante | Revoca ferma nuovi accessi; copia acquisita indipendente dall'autore |
| Conoscenza: `knowledge_sources`, `source_revisions`, `rule_sets`, `rule_versions` | Fonte, hash, diritti, stato revisione, configurazione, test | Solo versioni attive revisionate nei metodi operativi |
| AI: `assistant_threads`, `assistant_messages`, `assistant_runs` | Owner, messaggi, revisioni fonti, provider/model id, esito | Nessun thread multiutente implicito; retention separata |
| Sync: `sync_operations`, `account_sync_state`, `change_events`, `device_cursors` | Operation id/hash, esito, sequenza, record revision, ack | Mutazione + ricevuta + evento atomici; cursore non basato sul tempo |
| Generazione sync: `sync_metadata` | Singleton privato con `sync_epoch` UUID, esposto solo tramite DTO autorizzato | Nuovo epoch dopo restore storico, prima di riaprire traffico; cursori/comandi di altra generazione rifiutati |
| Operazioni: `jobs`, `audit_events`, `deletion_requests` | Stato, lease, tentativi, autore, tipo evento, oggetto | Retry idempotente; nessun segreto o contenuto personale completo nel log |
| Sessioni web: `private.web_sessions`, `private.oauth_attempts` | Hash session id, token cifrati, scadenza, versione refresh, revoca | Schema non esposto; accesso solo tramite adapter server dedicato |

Per `set_logs` distinguere `planned_set_id` facoltativo e `actual_set_id`: una serie extra non deve falsificare il numero delle prescritte. Per coppie unilaterali usare `set_group_id` e record lato SX/DX collegati, con massimo un risultato corrente per lato nel gruppo. Bilaterale è una modalità propria; non memorizzarla come due serie duplicate.

## 3. Proprietà, chiavi e integrità

- Rendere unico `(owner_id, id)` sui padri personali e usare FK composte nei figli: una foreign key sul solo ID non basta a impedire assegnazioni tra account se l'API è difettosa.
- Riferimenti al catalogo globale verificati per visibilità e revisione. Una variante privata di A non può essere usata da B senza copia autorizzata; questa relazione richiede un controllo di comando/trigger, oltre alla FK.
- CHECK per quantità finite, intervalli ordinati, unità ammesse, ripetizioni intere e stati supportati. Limiti tecnici distinti da soglie di allenamento.
- UNIQUE per `(owner_id, operation_id)`, `(program_id, version_number)`, `(proposal_id, proposal_revision)` nelle decisioni e posizione tra fratelli.
- Il piano approvato è append-only; una correzione crea nuova versione. Il diario può essere corretto esplicitamente con nuova revisione e traccia della correzione; non è immutabile a ogni costo.
- Una cancellazione sincronizzabile produce tombstone. La cancellazione account ha una procedura dedicata e non equivale a impostare `deleted_at` su una sola riga.

## 4. Snapshot e risoluzione della prescrizione

All'avvio della seduta risolvere: versione approvata → override della fase → adattamenti esplicitamente accettati applicabili. Produrre uno snapshot con nomi, unità, target per serie e riferimenti alle revisioni originali. Lo snapshot può essere JSON validato, ma gli effettivi risultati restano in righe interrogabili.

Modificare il catalogo non altera lo snapshot. Una seduta iniziata offline può riferirsi a una versione locale approvata in attesa di sync: deve portare `local_version_id`, proposta e accettazione locali, insieme allo snapshot completo. Anche se la proposta diventa obsoleta, il server conserva la seduta come esecuzione reale con provenienza segnalata. Non inventare un riferimento a una versione remota mai approvata.

## 5. Autorizzazioni e percorsi di scrittura

| Attore | Letture | Scritture |
| --- | --- | --- |
| Anonimo | Landing e contenuti pubblicati consentiti | Registrazione tramite Auth; nessuna tabella personale |
| Utente A | Dati propri e catalogo pubblicato | Comandi autorizzati sui propri aggregati; niente cambio proprietario |
| Utente B | Nessun dato di A; solo anteprima di copia autorizzata | Nuove entità proprie dopo import |
| Curatore | Catalogo e regole secondo ruolo | Pubblica revisioni; non sfoglia diari personali |
| Worker | Minimo insieme per il job autorizzato | Esito del job e artefatti previsti, non piani arbitrari |
| Operatore infrastruttura | Accesso tecnico separato e auditato | Manutenzione tramite procedura, non funzione normale dell'app |

Abilitare RLS su tabelle esposte e personali; grant minimi. `SELECT` non implica `INSERT/UPDATE/DELETE`. Le tabelle di piano approvato, decisioni, sync e diario non devono consentire DML generico al ruolo `authenticated`: aggirerebbe revisioni, audit e change log.

Percorso raccomandato: wrapper RPC `SECURITY INVOKER` nello schema API → funzione di comando in schema privato. Quando la funzione deve scrivere senza concedere DML generale, usare una funzione `SECURITY DEFINER` strettamente circoscritta, posseduta da un ruolo dedicato `NOLOGIN`, non superuser, senza `BYPASSRLS` e diverso dal proprietario delle tabelle. Concederle solo i privilegi necessari. Policy del ruolo di comando vincolate a `auth.uid()`; verificare inoltre proprietario e stato all'interno del comando.

Revocare EXECUTE predefinito da PUBLIC e anon, concedere soltanto quanto necessario; `search_path` vuoto e nomi qualificati; nessun SQL dinamico da input. Nessuna funzione definer nello schema esposto. Il ruolo di comando non è assegnabile dal client. Verificare anche helper, view, Storage e chiamate RPC dirette: il BFF non rende superflui questi controlli.

Questa struttura richiede una prova reale dei grant e delle policy in F2–F3. Preferire invoker quando sono sufficienti i privilegi ordinari; l'eccezione serve a proteggere l'atomicità dei comandi, non a far sparire un errore di permessi. [Funzioni Supabase](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 6. Transazioni critiche

| Comando | Operazioni che devono riuscire tutte o nessuna |
| --- | --- |
| SaveSet | Controllo revisione/proprietario → log serie → nuova revisione → ricevuta idempotente → change event |
| AcceptProposal | Lock → conferma/revisioni/evidenze → nuova versione e puntatore corrente → decisione → consumo challenge → ricevuta/eventi |
| ImportSharedProgram | Verifica link → snapshot → mappa nuovi ID → copia dipendenze → programma bozza → ricevuta |
| FinishWorkout | Verifica stato/versione → completamento anche parziale dichiarato → riepilogo coerente → job valutazione → ricevuta |

Tutte le scritture personali che generano eventi acquisiscono prima il lock della riga `account_sync_state` del proprietario; seguono poi i lock degli aggregati in ordine stabile. Questo serializza brevi scritture dello stesso utente e rende affidabile l'ordine dei cursori. Mai mantenere questi lock durante una chiamata AI o di rete. Deadlock/serialization failure hanno retry limitato con lo stesso operation ID. [Lock PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).

## 7. Indici, query e migrazioni

Indici iniziali: `(owner_id, performed_at DESC)` sulle sessioni; `(owner_id, session_id, position)` sulle serie; `(owner_id, status, created_at)` sulle proposte; `(owner_id, sequence)` sugli eventi; `(owner_id, operation_id)` ricevute. Aggiungere indici sulle FK usate e sulle colonne di filtraggio RLS. Verificare piano query su dati sintetici rappresentativi: non indicizzare ogni colonna.

Paginare storico e messaggi; aggregare grafici per periodo nel server o nel repository locale in base ai dati disponibili. Non introdurre viste materializzate prima di aver misurato un problema. Le view con dati personali devono rispettare i permessi del chiamante o restare private.

Migrazioni incrementali, dati di seed separati e sintetici. Prima aggiungere campi compatibili, poi distribuire il codice, infine rimuovere ciò che nessun client supportato usa. Ogni migrazione deve ricostruire un DB vuoto e aggiornare una copia della versione precedente senza perdita. Correzioni a migrazioni già distribuite avvengono con nuove migrazioni.
