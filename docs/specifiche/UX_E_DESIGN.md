# Esperienza d'uso e specifica dell'interfaccia

Versione 1.4 · 14 ottobre 2026. Specifica del comportamento. DEC-32–37: Open, Inter locale, scuro predefinito/chiaro opzionale, righe compatte, nessuna immagine, feedback secondo Nielsen e motion funzionale. [Piano del redesign](../piani/REDESIGN_OPEN.md), [piano UX](../piani/UX_NIELSEN.md), [motion](../design/MOTION_E_MICROINTERAZIONI.md) e [collaudo dell'incremento](../qualita/UX_NIELSEN_2026_10_14.md). Validazione sui telefoni reali ancora da completare.

## 1. Priorità di design

Il contesto principale è una persona in palestra, su telefono, con una mano occupata e rete incerta. Mostrare subito esercizio, target, ultimo risultato e campo da registrare. Le funzioni analitiche non devono competere visivamente con la serie corrente. Su desktop conservare la stessa gerarchia, sfruttando spazio per editor e confronto.

Navigazione proposta: Oggi, Programma, Progressi, Libreria, Profilo. Il centro proposte è visibile da Oggi/Programma; Misure e Nutrizione sono raggiungibili da Progressi. Ogni schermata ha URL ripristinabile, titolo comprensibile e collegamento indietro. Nessun dato sensibile nei parametri URL.

## 2. Flussi e stati

| Flusso | Passaggi | Errori/stati da progettare | Accettazione |
| --- | --- | --- | --- |
| Primo accesso | Registrazione → verifica → dati minimi → scelta scheda | Email in ritardo, account esistente, redirect scaduto | Ripresa senza ricompilare il profilo |
| Nuova scheda | Manuale/modello/generazione → editor → anteprima → attiva | Vincoli incompatibili, esercizio mancante, rete assente | Nessuna attivazione implicita |
| Seduta | Avvia → serie → recupero → esercizio successivo → riepilogo | Campi mancanti, quota locale piena, sospensione telefono | Dati recuperati alla riapertura |
| Progressione | Riepilogo → prima/dopo → motivazione → accetta/rifiuta | Proposta obsoleta, errore rete, doppio clic | Stato finale univoco, target invariati se rifiuta |
| Copia | Seleziona versione → anteprima → link → import destinatario | Scaduto/revocato, esercizio personale, copia già importata | Dipendenze incluse senza dati privati extra |
| Misure/nutrizione | Inserisci → grafico → eventuale proposta | Dato anomalo, unità sbagliata, serie storica incompleta | Nessuna diagnosi o modifica automatica |
| Cambio account | Verifica outbox → sync/export/scarta esplicito → esci | Offline e revoca remota pendente | Nessun dato dell'account precedente visibile |

Per ogni flusso produrre frame di loading, vuoto, errore, successo, permesso negato e offline. Il prototipo deve coprire gli errori, non solo il percorso perfetto.

## 3. Anatomia del diario

In alto: nome seduta, fase e stato del salvataggio. Scheda esercizio: nome/variante, convenzione carico, note essenziali, ultimo risultato confrontabile. Riga serie: numero, tipo, target, carico, ripetizioni o durata, RIR, lato e comando completa. Distinguere visivamente pianificato da registrato senza affidarsi solo al colore.

Accettare virgola decimale italiana e visualizzare unità accanto al campo. Non convertire `20,5` in `205`. Tenere il testo temporaneo del campo separato dal valore normalizzato: digitare `20,` non deve immediatamente cancellare l'input. Al blur/completamento validare e dare feedback. Carico del singolo manubrio, totale bilanciere, zavorra e assistenza devono avere etichette diverse.

Un valore suggerito non significa serie eseguita. “Completa” registra il risultato; “Salta” registra uno stato diverso da zero ripetizioni. “Annulla” dopo completamento crea correzione tracciata e coerente con il timer. Aggiungere serie, sostituire esercizio e terminare parzialmente devono restare disponibili.

Timer basato su scadenza; pulsanti pausa/aggiungi tempo/salta secondo il protocollo. Alla ripresa dal background ricostruire il tempo; audio, vibrazione e notifiche non sono l'unico segnale. Non promettere allarmi a schermo bloccato prima delle prove reali.

Un errore nei metadati del timer dopo il commit non può far apparire fallita una serie già salvata: confermare il risultato e avvisare separatamente del recupero manuale. Se fallisce il commit del diario, conservare l’input, mostrare l’errore e non dichiarare successo. Gestire anche errori di lettura/chiusura timer senza promettere persistenza quando quella scrittura fallisce.

## 4. Proposte e controllo finale

Ogni proposta mostra cosa cambia, da quando, perché, quali dati usa e quali mancano. Esempio di testo: “Dalla prossima seduta: 20 → 22 kg per manubrio; 10 → 8 ripetizioni iniziali”. Esporre dettagli e fonte senza sommergere la vista principale.

Azioni: Accetta queste modifiche, Rifiuta, Modifica bozza, Chiedi alternativa. Nessuna preselezione e nessun tasto “Continua” ambiguo usato come consenso. Un gruppo deve mostrare tutte le modifiche incluse; accettare una sola voce comporta ricalcolo delle altre se condividono vincoli. Revisione diversa significa nuova conferma.

Conflitti sync: mostrare contenuto locale e remoto, spiegare perché l'azione è sospesa, offrire scelta e conservare i dati. Non usare messaggi generici “Qualcosa è andato storto” senza rimedio o request ID copiabile privo di segreti.

## 5. Design system da consegnare

Token semantici per colori (`surface`, `text`, `muted`, `accent`, `danger`, `focus`), spaziatura, tipografia, bordi e densità; valori distinti per tema chiaro/scuro. Usare CSS custom properties e CSS Modules; unità relative per schermo secondo le raccolte, unità fisiche solo nelle regole print. Evitare componenti con colori e dimensioni sparsi nei file.

Componenti minimi: Button, Link, Input, NumberField, Select, FieldError, Dialog, Alert, Tabs quando necessarie, ExerciseCard, SetRow, SaveStatus, ProposalDiff, EmptyState e grafico con tabella equivalente. Non creare componenti solo per avvolgere un div senza comportamento o semantica.

Specificare per ogni componente varianti, stati focus/disabled/loading/error, comportamento tastiera e testo del lettore di schermo. La disabilitazione deve avere un motivo visibile; non cancellare il focus dopo una mutazione. Caricare una libreria di primitive accessibili solo quando risolve widget reali, verificandone tema e comportamento.

## 6. Accessibilità, contenuti e stampa

Obiettivo WCAG 2.2 AA. HTML nativo prima di ARIA, etichette vere, ordine logico, focus visibile e ritorno al controllo iniziale dopo chiusura dialog. Riordino editor anche con pulsanti, non solo drag-and-drop. Messaggi di salvataggio con annunci moderati, evitando un annuncio invasivo a ogni carattere. Grafici accompagnati da riepilogo e tabella; nessuna informazione solo cromatica.

Verificare zoom, reflow, tastiera, VoiceOver/TalkBack, contrasto in entrambi i temi, riduzione movimento e dimensione dei controlli. I target di tocco del diario sono generosi (obiettivo progettuale circa 44 CSS px, espressi in unità relative); questo non sostituisce la verifica dei criteri normativi. [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Italiano semplice, stessa parola per stessa azione, nessun dettaglio tecnico del backend nel normale flusso utente. Le spiegazioni degli algoritmi distinguono stima, dato osservato e proposta. Nessuna percentuale di affidabilità inventata.

Tutte le pagine devono poter essere stampate in modo sensato; scheda e riepiloghi hanno layout dedicato bianco/nero, serif circa 12 pt, intestazione, data e versione. Rimuovere navigazione, controlli e immagini inutili, ripetere intestazioni delle tabelle e prevenire righe tagliate. URL permanente solo se privo di token e dati riservati: non trasformare questo requisito in un link pubblico al diario. Inserire attribuzioni/copyright pertinenti.

## 7. Prototipo e prove con utenti

Prima tre task: registrare un allenamento, gestire una proposta, copiare una scheda. Misurare completamento senza assistenza, errori di convenzione carico, tempo perso per trovare un comando e comprensione del salvataggio offline. Target iniziale: almeno 90% di completamento nel gruppo concordato, riportando dimensione campione e limiti.

Output F1: mappa navigazione, flussi, componenti, frame mobile/desktop, temi e stampa, risultati delle prove e decisioni visuali. Nome e direzione visuale hanno già decisioni esplicite; collaudare l'applicazione sui dispositivi senza riaprire la scelta o bloccare le prove di persistenza.

## 8. Editor manuale implementato

L'editor delle bozze ha target individuali in «Serie e target»: carico, ripetizioni min/max, RIR, recupero, tipo e lato. Modificare un valore riguarda solo quella serie. Copia/riordino di giornate e serie conservano gli originali; le nuove copie hanno ID distinti. L'ordine della seduta raggruppa riscaldamento, lavoro ed extra. La selezione della giornata segue l'ID, non la posizione.

Il riepilogo consente «Anteprima settimana» con gli stessi target risolti per la seduta, senza mutare il programma. I campi sono bloccati durante il salvataggio. Specifica, limiti e prove: [editor delle schede](EDITOR_SCHEDE.md). Gli esercizi a tempo restano fuori da questa consegna. Calendario/rinvii e catalogo privato sono implementati nell'[incremento successivo](../qualita/INCREMENTO_SCHEDE_SYNC_MOTORE.md), con propri gate cloud; nessuna modifica automatica o approvazione implicita.

## 9. Accesso, feedback e movimento

L'accesso è completato quando il server verifica la sessione. Requisiti di formato, due password coincidenti, richiesta ricevuta e consegna email sono stati distinti. Il form conserva i valori in errore, blocca richieste doppie, mette a fuoco il primo campo invalido e mantiene stabile lo spazio dei messaggi: nessun pulsante deve sfuggire al tocco quando un campo perde focus. La cache locale non scrivibile produce un avviso distinto da un accesso valido.

Logout annullabile e conservazione locale esplicita; se manca la rete, la revoca remota resta pendente. Google non può aggirare questa guardia. Dialoghi e campi durante commit non si chiudono né cambiano, anche nelle note finali della seduta. Input falliti restano disponibili per correzione e nuovo invio.

Feedback globale fuori dal contenuto ricreato per account. Conferme ripetibili: toast success di cinque secondi, timer sospeso su puntatore, focus e scheda nascosta, annuncio separato stabile e cleanup. Errori, avvisi e informazioni critiche persistono; salvataggio locale e sincronizzazione remota sono sempre distinti. Il risultato resta riconoscibile anche dopo la scadenza della notifica.

Motion secondo la guida collegata: CSS locale breve, nessuna immagine o dipendenza nuova, nessun ritardo nell'azione o simulazione di progresso. «Riduci animazioni» nel Profilo è persistente; `prefers-reduced-motion` prevale anche se l'app segue il dispositivo. Nessuna animazione di uscita o snapshot conserva la vista dell'account precedente. Le conferme esplicite del dominio non dipendono dai tempi degli effetti.
