# Import Excel implementato — formati, unità e limiti

13 ottobre 2026 · SCH-02/03/04, RF-03/04/13. Descrive il codice locale di questo incremento; non certifica il rilascio remoto. [Piano completo](../piani/SCHEDE_EXCEL_CATALOGO_CALENDARIO.md), [import/export obiettivo](IMPORT_EXPORT.md), [rapporto](../qualita/INCREMENTO_SCHEDE_SYNC_MOTORE.md).

## 1. Percorso nell'app

Programma → Importa file → selezione `.xlsx` → lettura locale nel worker → report → associazioni esplicite → conferma della struttura → editor → salvataggio bozza → approvazione separata. Non occorre convertire manualmente in JSON. Il binario del workbook non viene caricato su Supabase.

Il riconoscimento del file produce una bozza, non una prescrizione approvata. L'utente sceglie nome e obiettivo, risolve esercizi/fasi sconosciuti, legge le esclusioni e verifica il ciclo nell'editor. I nuovi esercizi preparati durante l'import rimangono in memoria: vengono salvati con report e bozza soltanto al salvataggio. Annullare prima di quel punto non scrive questi record.

Il comando `ImportProgramDraft` conserva digest SHA-256 del file, versione del parser, profilo, scelte e report minimizzato. Non conserva i fogli personali esclusi. `editedInEditor` indica modifiche successive al mapping: il report descrive la conversione iniziale, il programma salvato descrive i target finali. Lo stesso import ID con contenuto diverso viene respinto. Dopo un esito di rete incerto si ritenta la stessa operazione, senza cambiarne payload o ID.

## 2. Profilo Scheda + Periodizzazione

Profilo `scheda-abc-1`, verificato in lettura sui due workbook indicati dal committente. Le intestazioni del foglio Scheda devono includere Giorno, Esercizio, Gruppo primario, Serie, Rip min, Rip max, RIR, Recupero (s). Ogni riga esercizio deve avere una giornata esplicita; le celle unite non vengono propagate automaticamente. Le colonne sono cercate per intestazione, non per posizione fissa.

| Campo | Conversione | Scelta o limite |
| --- | --- | --- |
| Giorno | Gruppo di posizioni nella stessa giornata | Etichetta esplicita di massimo 30 caratteri, con lettere/numeri/spazi/trattino/underscore |
| Esercizio | Corrispondenza univoca sul nome normalizzato o associazione scelta | Nessuna identità ricavata dalla sola somiglianza; nome massimo 200 caratteri |
| Serie | Numero di target lavoro | Intero 1–30; non una formula |
| Rip min / Rip max | Range per ciascun target | Interi 1–100, max almeno min |
| RIR | Numero 0–10 | Per intervalli, scelta esplicita dell'estremo inferiore o superiore; zero conservato |
| Recupero (s) | Secondi | Intero 0–1800; zero è distinto da valore assente |
| Carico iniziale | `null` | Non viene stimato da nomi, pesi corporei o formule del file |
| Esecuzione/note/alternativa/fonte dichiarata | Testo della posizione | La fonte dichiarata dal file non diventa un metodo revisionato |
| Ordine `1a`/`1b` | Etichetta di superserie `1` | Non converte una superserie in una serie unica |
| +1 serie sett. 3–6 | Flag di accumulo | Applicato soltanto attraverso il ciclo approvato |

Periodizzazione richiede settimane consecutive da 1. Fasi riconosciute: Test, Base, Accumulo, Picco, Scarico. Una fase diversa richiede una scelta. Sono importati nome/fase e il marcatore +1; RIR distinti per categoria, tecniche di intensità e istruzioni testuali di scarico non diventano regole automatiche. L'editor mostra l'effetto della regola del ciclo già implementata: va controllato prima dell'approvazione.

Serie extra SX non vengono convertite silenziosamente: il report chiede di aggiungerle nell'editor, con lati e ciclo verificati. Differenze di muscolo o lateralità rispetto alla variante associata sono segnalate. Gli altri fogli, compresi Diario, Misure e Nutrizione, sono esclusi dal programma. Non viene importata una cronologia di esecuzioni da formule o totali.

Upper Body contiene nello stesso foglio Scheda un prospetto successivo con intestazioni Giorno / Focus / Serie base / Stato. Solo questa firma completa chiude la tabella esercizi; il riepilogo e le righe successive sono esclusi con una segnalazione. Una generica riga malformata continua a essere un errore.

La prima scheda riconosce 25 posizioni, 3 giornate e 7 settimane. Upper Body riconosce 28 posizioni, 3 giornate e 7 settimane; con il catalogo iniziale richiede 22 associazioni di posizione e una scelta di fase. Questo numero non rappresenta 22 nuovi esercizi obbligatori: più posizioni possono riferirsi alla stessa variante. Nessuna associazione viene inventata per rendere verde il report.

## 3. Formato tabellare documentato

Profilo `tr-lab-tabular-1`: cinque fogli obbligatori, intestazioni nella prima riga, una riga per entità. Nomi dei fogli e delle intestazioni sono confrontati senza distinzione fra maiuscole/minuscole. Le formule nelle colonne importate richiedono valori espliciti verificati; i valori cached non vengono accettati come target.

### Programma

Colonne `chiave`, `valore`. Chiavi obbligatorie: `formato = tr-lab-tabular`, `versione = 1`. `obiettivo` facoltativo: `hypertrophy`, `strength` o `bodyweight` del contratto JSON v1. L'obiettivo scelto nella review prevale, con differenza segnalata. Il nome finale viene scelto nella review.

### Giorni

Colonne `id`, `ordine`, `nome`, `focus`. `id` è una chiave locale testuale univoca, massimo 100 caratteri; non deve essere un UUID. `ordine` è intero positivo e univoco nel foglio. Nome massimo 200 caratteri; focus può essere vuoto.

### Esercizi

Colonne `id`, `giorno_id`, `ordine`, `esercizio_id`, `nome`, `note`, `superset`, `accumulo`. Ogni `giorno_id` deve comparire in Giorni. `ordine` è univoco all'interno della giornata. `esercizio_id` è l'identità TR LAB del catalogo; può essere vuoto per richiedere corrispondenza univoca del nome o associazione esplicita. Un ID non riconosciuto non viene sostituito silenziosamente dal nome. Nome esplicito 1–200 caratteri, note massimo 3000, superserie vuota o etichetta massimo 30. `accumulo` deve essere `true` o `false`, anche come cella booleana Excel.

### Serie

Colonne `id`, `posizione_id`, `ordine`, `rip_min`, `rip_max`, `rir`, `recupero_s`, `carico_g`, `tipo`, `lato`. `posizione_id` deve comparire in Esercizi; ordine univoco nella posizione. Tutti i numeri sono espliciti, con gli stessi limiti del contratto dei target.

| Colonna | Unità / valori |
| --- | --- |
| rip_min / rip_max | Interi 1–100, max almeno min |
| rir | Numero 0–10, anche decimale |
| recupero_s | Secondi interi 0–1800 |
| carico_g | Grammi interi 0–1.000.000; 12,5 kg si scrivono 12500. Cella vuota significa carico non registrato, 0 significa zero |
| tipo | `work`, `warmup`, `extra` |
| lato | Vuoto, `both`, `left`, `right`, coerente con la variante; non un numero di arti |

La convenzione di carico appartiene alla variante: totale, per manubrio, corpo libero, aggiunto, assistenza o macchina. Il file non cambia questa identità compilando soltanto `carico_g`. Creare/associare prima la variante corretta.

### Settimane

Colonne `ordine`, `nome`, `fase`, `extra_serie`, `rir`. Ordine consecutivo 1–52; nome massimo 200 caratteri. Fasi: `test`, `base`, `accumulation`, `peak`, `deload`, oppure scelta esplicita in review. Extra serie intero 0–3. RIR 0–10 o vuoto per conservare i target delle singole serie.

Esempio minimo di relazioni: giorno `A` → posizione `P1` con `giorno_id=A` → serie `S1` con `posizione_id=P1`; settimana 1 Base. All'import vengono generati UUID nuovi: queste chiavi non sovrascrivono record già nell'account. Gli altri fogli sono esclusi con report.

## 4. Barriere del parser

Limiti attuali: 10 MiB compressi, 32 MiB complessivi espansi effettivamente, 1000 entry ZIP, 20 fogli, 50.000 righe presenti complessive, 100.000 celle, 32.768 caratteri per cella e 4 Mi caratteri di testo totale. Programma massimo 700 posizioni e 1000 target, con gli ulteriori limiti per giornata/posizione del contratto; report massimo 1000 segnalazioni. Per l'account collegato l'intero comando, inclusi report e varianti, deve anche restare entro 200 KiB UTF-8: i massimi strutturali non garantiscono un payload di quella dimensione. Un superamento è segnalato prima della scrittura locale; il dispositivo senza servizio non crea una coda cloud.

Directory ZIP, dimensioni effettive e CRC sono verificati. Parti con dimensioni false, ZIP64, archivi cifrati/multidisco, duplicati, macro, oggetti incorporati, relazioni esterne, DOCTYPE/ENTITY e fogli riutilizzati vengono respinti. Le parti validate vengono ricomposte in memoria prima di SheetJS. Nessuna rete o esecuzione delle formule. Un'estensione `.xlsx` da sola non è una verifica.

Il worker è terminabile e ha timeout 10 secondi. Non è un limite rigido alla heap del browser: repack e modello intermedio hanno un costo memoria ancora da misurare sui telefoni. Non aumentare soglie per aggirare un errore senza benchmark e nuove fixture ostili.

## 5. Compatibilità e sviluppi rimasti

Questo formato Excel produce il **programma JSON v1 a ripetizioni**, mentre i nuovi comandi di persistenza usano protocollo sync v2. Non sono la stessa versione. Dose a durata/distanza, percentuali di forza, superserie come gruppi strutturati, identità completa dello strumento nello storico e import universale di qualunque Excel rimangono consegne specifiche. Non convertire minuti in ripetizioni per far entrare una metrica nel v1.

Prove: `xlsx-import.test.ts`, `tabular-import.test.ts`, `import-workout-recovery.test.ts`, percorso Playwright del worker. Le prove sintetiche ripetibili non sostituiscono la review dell'utente sugli adattamenti del proprio file né il collaudo mobile reale.
