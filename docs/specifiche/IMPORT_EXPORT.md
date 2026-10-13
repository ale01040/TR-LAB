# Importazione, formato standard ed esportazione

Versione 1.2 · 11 ottobre 2026. La prima alpha importa il formato JSON qui definito e una fixture già adattata dall'Excel. Il parser di file XLSX resta da implementare in WP-07; non promettere import universale di qualsiasi foglio.

Integrazione di pianificazione del 13 ottobre: [pipeline XLSX, mapping, librerie, limiti e ticket SCH](../piani/SCHEDE_EXCEL_CATALOGO_CALENDARIO.md). NEXT-D2 raccomanda il primo import nel browser/worker; non richiede conversione JSON manuale. Formato JSON v1 e limiti attuali restano effettivi finché non vengono implementati e collaudati i contratti successivi.

## 1. Formato standard raccomandato

JSON UTF-8 con `format: 'workout-program'`, `schema_version: 1`, `kind: 'program_template'` e `program`. Fonte eseguibile: `packages/contracts/src/index.ts`, `templateSchema` e schemi collegati; [JSON Schema generato](../../schemas/workout-program.v1.schema.json) e [esempio valido sintetico](../../examples/programma.v1.json). Gli ID sono locali al file e vengono rimappati: non concedono accesso al database.

```json
{
  "format": "workout-program",
  "schema_version": 1,
  "kind": "program_template",
  "program": {
    "id": "00000000-0000-4000-8000-000000000001",
    "rootId": "00000000-0000-4000-8000-000000000001",
    "name": "Esempio strutturale sintetico",
    "goal": "hypertrophy",
    "version": "1",
    "status": "draft",
    "days": [{
      "id": "00000000-0000-4000-8000-000000000002",
      "name": "Giorno A",
      "focus": "",
      "exercises": [{
        "id": "00000000-0000-4000-8000-000000000003",
        "exercise": {
          "id": "rematore-manubrio",
          "name": "Rematore con manubrio",
          "muscle": "dorso",
          "secondary": [],
          "equipment": "dumbbell",
          "pattern": "tirata",
          "unilateral": true,
          "basis": "per_dumbbell",
          "instructions": ""
        },
        "targets": [{
          "id": "00000000-0000-4000-8000-000000000004",
          "repsMin": 8, "repsMax": 10, "rir": 2,
          "restSeconds": 90, "loadGrams": null,
          "kind": "work", "side": "both"
        }],
        "notes": "", "superset": null, "accumulation": false
      }]
    }],
    "weeks": [{ "name": "Base", "phase": "base", "extraSets": 0, "rir": null }],
    "createdAt": "2026-10-11T00:00:00.000Z",
    "source": ""
  }
}
```

Fixture sintetica minima, non scheda consigliata. Il precedente esempio piatto della specifica 1.1 era una proposta non implementata: viene sostituito da questo primo contratto eseguibile v1, senza consumatori precedenti da migrare. Un formato piatto non viene interpretato per tentativi.

Unità interne: `loadGrams` intero in grammi, recupero in secondi, RIR numerico 0–10; null significa non impostato e zero resta un dato. `side: both` genera due registrazioni per esercizi unilaterali, una per quelli bilaterali. `superset` raggruppa etichette; l'alpha non ottimizza automaticamente l'ordine. Ciclo esplicito 1–52 settimane; serie aggiuntive solo dove consentito. Modalità a tempo, media, regole approvate e metriche avanzate richiederanno un'estensione documentata/versionata.

Gli oggetti sono chiusi: campi inattesi/versioni sconosciute vengono rifiutati. Il JSON Schema descrive la forma; controlli semantici come unicità degli ID, massimo effettivo nel ciclo e coerenza laterale sono anche validati da Zod e SQL. Non dichiarare equivalenza completa di un validatore generico JSON Schema alle invarianti runtime.

L'import alpha è locale, massimo 1 MiB: validazione → anteprima → nuovi ID → editor → salvataggio bozza → approvazione distinta. Per account autenticati la guardia locale limita il comando a 200 KiB prima di scrivere dati/coda, lasciando margine al limite API/SQL 256 KiB; se troppo grande l'editor conserva i campi e chiede di ridurre/dividere il contenuto. Il futuro import a job dovrà estendere esplicitamente questo limite. L'export di condivisione rimappa gli ID, rimuove provenienza e note per default; l'utente può includere note dopo averle controllate. Nessun diario, misura o target nutrizionale incluso.

## 2. Mappatura dell'Excel

| Foglio | Import previsto | Regola |
| --- | --- | --- |
| Leggimi | Istruzioni e metadati del modello | Distinguere spiegazione da parametro operativo |
| Scheda | Giorni, blocchi, varianti, serie, recuperi, RIR, note | Normalizzare sinonimi con revisione, conservare provenienza cella |
| Periodizzazione | Ciclo e override | Nessun vincolo globale di sette settimane |
| Diario A/B/C | Eventuale storico selezionato | Per default dati campione esclusi; data reale e appartenenza esplicite |
| Volume | Dato di confronto/calcolo di origine | Ricalcolare dal modello, non importare totali come verità |
| Misure | Eventuale storico selezionato | Unità/lati e distinzione esempio/reale |
| Nutrizione | Eventuali target selezionati e metodo | Non attivare una formula non revisionata né duplicare le pesate |

Riconoscere fogli, intestazioni e struttura, oltre alle celle del file noto. Confrontare hash e versione per diagnosi; un hash diverso non implica necessariamente file illegittimo, ma richiede verifica strutturale. Celle unite, righe vuote e formule devono essere rilevate. Usare contenuti/formule come dati da analizzare, senza eseguire codice, macro, collegamenti esterni o richieste di rete.

## 3. Pipeline e sicurezza

Primo percorso XLSX raccomandato (NEXT-D2): selezione locale → limiti del contenitore → worker → modello intermedio → validazione → anteprima/mapping → conferma import → nuova bozza/report/outbox → validazione remota dei comandi. Il file completo rimane sul dispositivo. La conferma import non attiva automaticamente il programma.

La precedente pipeline con upload autenticato, archivio temporaneo privato e job server resta l'evoluzione per casi non coperti dal percorso locale: richiede limiti, quote, retention e autorizzazioni proprie. Non usarla come fallback invisibile. Il worker browser non è una sandbox: applicare i limiti effettivi durante decompressione e parsing come specificato nel piano SCH.

Definire limiti compressi, decompressi, fogli, righe, stringhe e timeout. Valori iniziali proposti: file 10 MiB, contenuto decompresso 100 MiB, 50.000 righe complessive; da tarare sulle fixture e sui telefoni. Il piano SCH aggiunge budget per celle, stringhe e tempo. Errori/annullamento locali non producono entità parziali; gli eventuali job server restano consultabili senza stack o dati di altri utenti, con pulizia dei file secondo retention.

Il parser XLSX viene scelto in F4 dopo verifica di manutenzione, licenza e vulnerabilità; provare almeno due opzioni mantenute se nessuna è già standard del team. Non selezionare una libreria perché “legge Excel” senza test su formule, celle unite e limiti ZIP. L'import deve funzionare senza Excel installato sul server.

## 4. Anteprima e report

Mostrare: giorni ed esercizi riconosciuti, nuove varianti private, ambiguità, conversioni, dati esclusi, metodi non attivabili e avvisi sulle formule incoerenti del piano §2.2. Ogni errore porta riferimento foglio/cella o JSON path, valore oscurato se necessario, gravità e rimedio.

Tre livelli: errore bloccante (schema o relazione invalida), richiesta di scelta (variante ambigua/unità mancanti), informazione (rinomina o campo facoltativo assente). Nessuna sostituzione silenziosa di esercizio o carico. Un campo non riconosciuto non deve sparire senza report.

Persistenza dell'import con operation ID, hash file e mapping ID. Ritentare la conferma non crea copie doppie. Il contenuto passa attraverso gli stessi comandi/controlli dell'editor; l'importatore non è una scorciatoia privilegiata.

## 5. Export e portabilità

| Export | Contenuto | Protezioni |
| --- | --- | --- |
| Modello programma JSON | Struttura e dipendenze selezionate | Anteprima, niente log/misure/chat predefiniti |
| Account JSON versionato | Dati dell'utente con riferimenti risolvibili | Reautenticazione, job privato e link a scadenza |
| CSV tabellari | Sessioni, serie, misure, pesate e decisioni pertinenti | Colonne e unità documentate, neutralizzazione formule nei campi testuali |
| PDF scheda | Versione scelta, target e note consentite | Layout stampa, nessun token o link privato stampato |
| Export locale d'emergenza | Base e operazioni non sincronizzate del device | Etichetta “include dati locali non sincronizzati”; file personale da conservare con cura |

Separare export del proprio account da condivisione di una scheda. Documentare il contratto di import del recupero locale: riesamina ricevute, ownership, schema e conflitti; non reinvia ciecamente comandi sotto un altro account. Non promettere migrazione completa da qualunque altra app.

## 6. Criteri di accettazione

Round-trip del formato standard preserva struttura, unità, lati, serie, ordine e ciclo, ignorando solo nuovi ID/server timestamp dichiarati. Import dell'Excel conserva tutte le sezioni supportate e segnala le cinque incoerenze note. I dati campione non diventano risultati personali senza scelta. File malformati/grandi vengono respinti entro il budget; retry non duplica programmi; export di A non contiene ID o contenuti personali di B.
