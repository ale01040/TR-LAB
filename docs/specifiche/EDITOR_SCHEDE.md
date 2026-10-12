# TR LAB — editor delle serie e organizzazione delle giornate

12 ottobre 2026 · Ticket F4-EDITOR-02, parte di WP-07. Requisito RF-04; ADR-01/02/04/07 e WEB-01/02/03/04/05/07/08/12. Questa consegna amplia l'editor manuale sul contratto v1 esistente, senza nuovi campi o migrazioni. Il parser XLSX e il catalogo privato rimangono attività separate.

## 1. Funzioni e invarianti

- Ogni serie ha ripetizioni min/max, RIR, recupero, carico facoltativo, tipo lavoro/riscaldamento/extra e lato dove previsto. Cambiare una serie non modifica quelle vicine. Null e zero restano distinti; virgola decimale supportata.
- Si aggiungono, duplicano, rimuovono e riordinano serie dello stesso tipo. La seduta raggruppa riscaldamento/lavoro/extra: aggiungere o cambiare tipo mostra questo ordine. I nuovi target ricevono nuovi UUID; quelli esistenti conservano gli ID. Duplicare copia i valori visibili, non una progressione scientifica. L'ultima serie di lavoro non può essere eliminata o convertita in altro tipo.
- Il massimo base tiene conto delle serie aggiunte nel ciclo, entro il limite di 30. Una variazione del ciclo che rende la bozza incoerente viene rifiutata al salvataggio senza perdere l'editor.
- Le giornate si duplicano e riordinano. La copia è indipendente, con ID nuovi per giornata/prescrizioni/target; nome entro 200 caratteri. La giornata attiva è identificata dal suo ID, così il riordino non cambia la giornata in modifica.
- Prima di cambiare, duplicare o aggiungere una giornata, correggere i campi invalidi del form: il testo temporaneo non può essere scartato salvando il numero valido precedente. I dettagli con l’errore vengono aperti per il focus. La rimozione esplicita resta possibile. Il reset esterno di un campo ricalcola anche la validità, senza un nuovo commit.
- Gli esercizi si spostano sopra o sotto. Il riordino non ricalcola target o superserie. I comandi hanno etichette testuali e sono utilizzabili da tastiera.
- L'anteprima della settimana usa resolveDay, la stessa regola delle sedute: RIR del ciclo, accumulo dove consentito e riduzione dello scarico. Non salva o approva nulla. Il riepilogo identifica chiaramente la settimana visualizzata.
- Il salvataggio resta una bozza; l'approvazione è distinta. La modifica di una scheda approvata crea una nuova versione. Snapshot e risultati delle sedute già avviate non sono riscritti. I campi sono bloccati durante il salvataggio.

## 2. Struttura e scelte tecniche

ProgramPage gestisce elenco, anteprima, import e approvazione. ProgramEditor gestisce la bozza e l'organizzazione; PrescriptionTargetsEditor gestisce soltanto i target di un esercizio. Copia/riordino sono funzioni pure in packages/domain, con generatore di ID passato dall'adapter UI. Nessuna rete/SDK nelle regole pure.

Si riusano DecimalInput, Zod, CSS Modules e il comando SaveProgramDraft con outbox atomica già presente. Le validazioni server/SQL restano obbligatorie: la UI previene errori ma non concede permessi. Aggiornamenti immutabili e chiavi basate su ID preservano lo stato dei campi. [Array in React](https://react.dev/learn/updating-arrays-in-state), [identità dello stato](https://react.dev/learn/preserving-and-resetting-state).

Non si aggiungono drag-and-drop, un nuovo gestore form o un secondo modello dati: i pulsanti risolvono il riordino anche su telefono/tastiera senza dipendenze. Compromesso: più controlli per serie; i target sono raccolti in una sezione espandibile. Durata/secondi di esecuzione e nuovi tipi di attrezzatura richiedono un'estensione documentata di schema, SQL, diario e compatibilità, quindi non sono aggiunti soltanto nel frontend.

## 3. Prove richieste

QA-EDT-01: modificare soltanto una serie importata, preservare altre serie/ID e valori null/zero; prevenire rimozione dell'ultimo lavoro e limite nel ciclo. QA-EDT-02: copia con ID nuovi, riordino con giornata attiva stabile e originali invariati. QA-EDT-03: anteprima accumulo/scarico coerente con lo snapshot delle sedute, senza mutare l'approvato.

Prove di componente con input reali, dominio su fixture, persistenza IndexedDB e RPC SQL sullo stesso payload v1; build/entrypoint Vercel. Verifica browser su desktop e mobile per etichette, salvataggio, riapertura e sovrapposizioni. Un emulatore non certifica telefoni reali o conformità AA completa. Esiti effettivi nel [diario](../DIARIO_SVILUPPO.md) e nello [stato implementazione](../qualita/STATO_IMPLEMENTAZIONE.md).
