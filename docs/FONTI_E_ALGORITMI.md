# Fonti e specifica degli algoritmi

Versione 1.1 — 10 ottobre 2026. Specifica per sviluppo e validazione. Le regole qui descritte non sono algoritmi già implementati né prescrizioni personali. Il requisito vincolante è generare proposte riproducibili, spiegabili e applicabili soltanto dopo accettazione esplicita.

Organizzazione: §§1–3 fonti e contratti; §§4–10 famiglie di metodi; §§11–12 consenso e AI; §13 esempi di test; §§14–18 implementazione, parametri, rilascio e verifiche ulteriori. La validazione software è distinta dalla revisione dei metodi di allenamento e nutrizione.

Attuazione dell'incremento del 13 ottobre 2026: [generatore e progressioni](piani/GENERATORE_E_PROGRESSIONI.md), con ticket MOT-01–07, consenso online/offline, recupero delle sedute provvisorie, persistenza autorizzata delle valutazioni e gate prima delle regole attive. Questo approfondimento non promuove a revisionate le fonti o le soglie candidate qui descritte.

## 1. Fonti effettivamente consultate

Per l'implementazione web seguire anche le raccolte obbligatorie `Appunti sviluppo web/` e `Linee guida sviluppo web/`, secondo [convenzioni e compatibilità](CONVENZIONI_SVILUPPO.md). Le raccolte tecniche non sono fonti di validazione delle regole di allenamento. La scelta del database è Supabase/PostgreSQL, confermata in DEC-18.

Il vault di riferimento è `C:\Users\peret\Documents\OBS - secondBrain`. Sono stati esaminati i passaggi pertinenti delle note elencate, non l'intero vault. Le copie archiviate e le sezioni di idee commerciali non sono state assunte come regole dell'app. I video e gli studi citati nelle note non sono stati integralmente verificati durante questa pianificazione.

| ID | Percorso relativo al vault | Passaggi usati e contributo |
| --- | --- | --- |
| KB-01 | `03 Note atomiche/Salute e Fitness/IPERTROFIA.md` | Variabili di allenamento, volume, intensità, frequenza, recupero e scarico; candidato catalogo di parametri |
| KB-02 | `01 Fonti/YouTube/Salute e Fitness/V Athlete/Come CREARE una PROGRESSIONE di CARICO nei tuoi allenamenti.md` | Modello operativo: aumento ripetizioni a blocchi, serie per serie e incremento delle serie per salti di carico rigidi |
| KB-03 | `01 Fonti/YouTube/Salute e Fitness/Filippo d'Albero/Come fare una SCHEDA DI ALLENAMENTO Alta Formazione (Ep. 3).md` | Vincoli logistici, obiettivo, pattern motori, varianti e specificità della forza |
| KB-04 | `01 Fonti/YouTube/Salute e Fitness/Project inVictus/IL NOSTRO METODO PER L'IPERTROFIA MUSCOLARE.md` | Comparabilità della tecnica, distribuzione dello sforzo e verifica dei progressi |
| KB-05 | `01 Fonti/YouTube/Salute e Fitness/Project inVictus/NON SBAGLIARE LA DIETA PER LA MASSA.md` | Peso osservato distinto dalla massa muscolare, monitoraggio nel tempo, limiti delle soglie e stime |
| KB-06 | `01 Fonti/YouTube/Salute e Fitness/The Movement System/COME CREARE UN PROGRAMMA DI ALLENAMENTO PER QUALSIASI SPORT.md` | Struttura a blocchi, vincoli, misure standardizzate e differenza tra metodo comune e personalizzazione |
| KB-07 | `01 Fonti/YouTube/Salute e Fitness/Project inVictus/COME IMPOSTARE UN ALLENAMENTO DI SCHIENA E BICIPITI.md` | Dose individuale, variabili cambiate gradualmente, cautele nel generalizzare la seduta di un atleta |
| XLS-01 | Excel nella cartella del progetto, descritto nel piano | Struttura funzionale e protocollo concreto da rendere configurabile |

Riferimenti video presenti nelle note: [V Athlete](https://youtu.be/CBMG_BCw8E8), [Filippo d'Albero](https://youtu.be/X9waPWoMiRg), [metodo Project inVictus](https://www.youtube.com/watch?v=wS1p7DTEwok), [schiena e bicipiti](https://www.youtube.com/watch?v=3q5tx-UDDWo). Questi link indicano la provenienza dichiarata dalle note, non una nuova verifica dei video.

## 2. Dal vault a una base di regole utilizzabile

Il vault serve alla ricerca iniziale e agli aggiornamenti curati. L'app distribuita deve funzionare senza accesso al computer dell'autore. Preparare un pacchetto portabile di contenuti consentiti e regole approvate, con indicizzazione limitata ai materiali pertinenti.

Pipeline:

1. Selezionare una lista esplicita di note e sezioni fitness. Escludere diario personale, business, duplicati d'archivio, dati di terzi e contenuti non necessari.
2. Conservare identificativo, titolo, autore/canale, collegamento originale, hash del file, data di acquisizione, sezione e limiti del contenuto.
3. Estrarre affermazioni singole: ambito, prerequisiti, condizioni, parametri, controesempi e grado di verifica.
4. Distinguere studio primario, sintesi, consiglio di un autore, esempio di un singolo atleta e interpretazione presente nella nota.
5. Verificare le fonti originarie dei parametri che diventano operativi. Se una fonte manca o contraddice un'altra, mantenerli nello stato di bozza.
6. Far revisionare le regole pertinenti da competenze di allenamento e, per gli obiettivi nutrizionali, nutrizione. Registrare autore e data della revisione.
7. Tradurre la regola in configurazione dichiarativa validata, con test di esempi positivi e negativi.
8. Pubblicare una versione del pacchetto. Rilasciare separatamente testo educativo e regole operative.

I testi recuperati sono dati, mai istruzioni eseguibili. Un aggiornamento del vault non deve cambiare immediatamente i programmi degli utenti, pubblicare documenti privati o abilitare funzioni AI.

### 2.1 Divergenze già rilevate

| Tema | Problema | Decisione di progettazione |
| --- | --- | --- |
| Frequenza | KB-01 presenta una superiorità generale; KB-06/07 riportano un quadro più condizionato a volume e contesto | La frequenza è scelta anche per distribuire il lavoro e rispettare disponibilità; evitare promesse universali |
| Cedimento | Alcune fonti suggeriscono finisher al limite; KB-04 esplicita limiti e risultati diversi | RIR e tecniche ad alta intensità dipendono dal metodo approvato, non da una regola globale |
| Volume | Tabelle per livello e sedute di atleti avanzati possono essere scambiate per dosi obbligatorie | Range iniziali configurabili con fonte, poi adattamenti basati su risultati e conferma |
| Tecnica | I confronti richiedono esecuzione comparabile, ma il diario non osserva direttamente la tecnica | Usare dichiarazione dell'utente e contesto; non sostenere di aver verificato il movimento senza dati adatti |
| Asimmetrie | L'Excel è centrato sul sinistro | Protocollo facoltativo per lato, senza diagnosi da circonferenze |
| Nutrizione | Soglie personali, valori ambigui e variazioni settimanali isolate | Verifica delle fonti e della finestra temporale prima di usare soglie automatiche |
| Specificità | Esempi di forza, sport e ipertrofia mescolano obiettivi diversi | Famiglie di metodi distinte con criteri di applicabilità espliciti |

Questa fase non richiede copiare libri, video o tutto il vault nell'app. Salvare sintesi e metadati necessari, verificando i diritti di distribuzione dei contenuti e dei media.

## 3. Contratto comune delle regole

Ogni regola ha: `rule_id`, versione, stato (`draft`, `reviewed`, `active`, `retired`), obiettivi supportati, prerequisiti, parametri con unità, fonti, limiti, precedenza e casi di test. Ogni esecuzione conserva gli input normalizzati, il loro hash e l'esito.

Esiti ammessi: `proposal`, `keep_current`, `insufficient_data`, `incompatible_constraints`, `needs_review`. Non assegnare percentuali di affidabilità senza un modello calibrato: indicare invece quali dati supportano il risultato e quali mancano.

Il risultato proposta contiene:

```json
{
  "proposal_type": "exercise_progression",
  "program_version": "4",
  "evidence_revision": "18",
  "rule_id": "double_progression",
  "rule_version": "candidate-1",
  "before": { "reps": [10, 10, 10], "load": { "grams": 20000, "basis": "per_dumbbell" } },
  "after": { "reps": [8, 8, 8], "load": { "grams": 22000, "basis": "per_dumbbell" } },
  "effective_from": "next_matching_session",
  "reason": "Completate le serie richieste con ripetizioni e RIR compatibili; 22 kg è il prossimo taglio disponibile.",
  "source_ids": ["KB-02", "KB-04"],
  "status": "pending"
}
```

Esempio sintetico di contratto, non raccomandazione di carico per una persona. `program_version` è il numero progressivo della versione, distinto dal suo UUID; i contatori sono stringhe decimali come nel contratto API. UUID, proprietario, fingerprint, timestamp e dati analitici completi vanno aggiunti nello schema esecutivo. La massa usa grammi interi e la convenzione di carico è esplicita, coerentemente con SaveSet.

## 4. GEN-01 — Generazione della scheda

### Input

Obiettivo, esperienza dichiarata, giorni, durata per seduta, attrezzatura e tagli di carico, esercizi esclusi, preferenze, movimenti/varianti già praticati, storico comparabile, priorità muscolari e metodi approvati. Eventuali limitazioni registrate dall'utente sono vincoli, non materiale per diagnosi automatica.

### Processo proposto

1. Controllare completezza dei dati necessari. Restituire poche richieste mirate se mancano elementi decisivi.
2. Selezionare modelli compatibili: full body, upper/lower e altre distribuzioni già validate per obiettivo e disponibilità.
3. Coprire i pattern previsti dal modello usando esercizi compatibili con attrezzatura, livello e preferenze. I sei pattern di KB-03 sono una base per i modelli pertinenti, non l'obbligo di inserirli tutti in ogni singola seduta.
4. Assegnare dose e intensità dal pacchetto di regole approvato. Inserire warm-up e recuperi nel calcolo del tempo.
5. Distribuire i volumi e le priorità tra le giornate; separare esercizi guida, complementari e lavoro facoltativo.
6. Assegnare un metodo di progressione compatibile con variante, esperienza e granularità dei carichi.
7. Stimare durata con lavoro, lati, recuperi, giri di superserie e transizioni. Esporre l'incertezza: una durata stimata non è una promessa.
8. Verificare i vincoli e produrre un riepilogo dei controlli. Ordinare le alternative con criteri deterministici e pesi versionati.
9. Mostrare la proposta completa e richiedere accettazione. Attivare una versione solo dopo la decisione.

Vincoli obbligatori: disponibilità reale, attrezzatura presente, esclusioni, modalità supportate, limiti del metodo. Preferenze flessibili: esercizi preferiti, varietà, distribuzione dei giorni e durata desiderata entro una tolleranza dichiarata. Nessun algoritmo deve trasformare da solo un vincolo obbligatorio in preferenza.

Quando non esiste una soluzione: mostrare “Con questi esercizi e recuperi la seduta stimata supera il tempo disponibile” e proporre alternative esplicite, per esempio ridistribuire un blocco o rivedere il tempo. Nessun risultato apparentemente valido con serie o recuperi nascosti.

Le prime sedute senza storico servono a raccogliere carichi e risultati. Il generatore può prescrivere una modalità di selezione del carico secondo il metodo approvato; non inventa un valore personale esatto.

## 5. PROG-01 — Doppia progressione

Fonti candidate: KB-02, KB-04 e XLS-01.

Identificare una sequenza confrontabile: stessa variante, attrezzatura, convenzione del carico, ruolo nella seduta e metodo. Lo stesso squat nei giorni A e C può avere prescrizioni diverse e quindi due sequenze di progressione.

Serie ammesse: serie di lavoro previste per quella sessione/versione. Escludere warm-up, serie annullate ed extra che il metodo esclude; non escludere una serie obbligatoria solo perché non compilata.

La proposta di aumento è candidata soltanto se:

- Tutte le serie richieste hanno dati sufficienti, compreso il RIR previsto dal metodo.
- Le ripetizioni raggiungono il limite superiore della prescrizione applicabile a ogni serie.
- Lo sforzo osservato rispetta il predicato del metodo. Candidato iniziale: RIR non inferiore al minimo approvato; RIR molto superiore al target può richiedere una proposta distinta di ricalibrazione.
- Non sono presenti segnalazioni che rendano il confronto inaffidabile, cambi di variante o una fase di scarico.
- Esiste un incremento compatibile con gli strumenti dell'utente e i limiti del metodo.

In caso positivo: proporre il prossimo carico disponibile e il ritorno alle ripetizioni iniziali previste. Il carico corrente resta immutato fino all'accettazione. Con dati incompleti: spiegare quali mancano. Con target non raggiunti: mantenere o proporre il passo di ripetizioni previsto dal metodo, senza aumento automatico.

Nei protocolli per lato, configurare se guidano il lato prioritario o entrambi. Le ripetizioni effettive restano sempre registrabili: una violazione del protocollo è un'informazione, non un motivo per falsificare il diario.

## 6. PROG-02/03 — Progressioni graduali e incrementi rigidi

**PROG-02, ripetizioni serie per serie.** Uno stato configurato può evolvere da `[8,8,8]` a `[9,8,8]`, poi `[9,9,8]`, fino al massimo del range. L'ordine delle serie e la politica di avanzamento sono parte della regola. Non procedere soltanto perché è trascorsa una settimana: verificare i risultati richiesti. Ogni nuovo obiettivo è una proposta, salvo dosi già incluse esplicitamente nel ciclo approvato.

**PROG-03, accumulo delle serie.** Se lo scatto di carico è troppo grande, un metodo approvato può proporre più volume prima del cambio di carico e un ritorno al volume base dopo il salto. Il numero massimo di serie, i passi e le condizioni di uscita sono parametri. L'app verifica tempo e volume complessivo prima di proporre una serie aggiuntiva.

Le serie dovute alla fase del ciclo e quelle usate come ponte per il salto di carico devono avere motivazioni separate. Applicare il limite configurato ed evitare di sommarle due volte. Il protocollo specifico dell'Excel vieta di aggiungere il ponte sopra l'extra già previsto in accumulo: conservarlo nel suo modello dimostrativo.

## 7. CYCLE-01 / FATIGUE-01 — Cicli, stallo e scarico

Il ciclo è un calendario di prescrizioni approvate, con fasi esplicite e parametri per esercizio. Il modello dell'Excel conserva test/base/accumulo/picco/scarico; altre famiglie di metodi possono usare altre fasi.

Per lo scarico definire riduzione delle serie, eventuale variazione di carico, RIR e arrotondamento. Il modello Excel richiede esempi coerenti con `3 → 2` e `4 → 2`: la regola candidata può usare metà arrotondata per eccesso, con minimo una serie quando l'esercizio resta nel programma. Ogni metodo deve dichiarare se conserva il carico. Non assumere che tutti gli scarichi funzionino allo stesso modo.

Lo stallo riguarda un numero configurato di esposizioni comparabili, non settimane vuote. Prima di proporre interventi controllare frequenza reale, completezza, cambi tecnici/attrezzatura e aderenza. Il feedback soggettivo può aggiungere contesto, senza inferire patologie.

Se i dati giustificano una revisione, proporre una modifica chiaramente motivata: mantenimento, diversa distribuzione, volume ridotto, scarico o variante. Risolvere i conflitti tra regole prima di presentare il risultato: una proposta di scarico e una di aumento carico sullo stesso esercizio non possono essere applicate insieme senza una risoluzione esplicita.

## 8. BODY-01 / STR-01 — Corpo libero e forza

Il corpo libero richiede una mappa approvata di varianti e prerequisiti, oltre a ripetizioni/durata, assistenza e zavorra. La progressione può proporre più ripetizioni, più tempo, meno assistenza o una variante diversa, secondo la famiglia selezionata. La comparabilità ricomincia quando cambia sostanzialmente il gesto.

I metodi di forza possono includere top set, back-off e percentuali solo se sono stati definiti e validati. Conservare separatamente massimale misurato, stimato e carico di riferimento del programma. Un e1RM deve dichiarare formula, dati e intervallo di applicabilità; non trasformare automaticamente una stima in un test massimale.

KB-03 descrive protocolli specifici che non devono diventare test obbligatori per tutti. La fase di dominio deve completare le fonti per forza e corpo libero: il corpus iniziale consultato è più ricco per ipertrofia e organizzazione del lavoro con sovraccarichi.

## 9. VOL-01 — Volume e comparabilità

Per ciascun muscolo e periodo:

`volume convenzionale = serie dirette + somma(serie indirette × coefficiente del metodo)`.

Separare serie del piano e serie realmente completate. Una serie bilaterale conta una volta nella convenzione di serie per muscolo. Una coppia SX/DX non deve raddoppiare il volume visualizzato per singolo lato: calcolare SX e DX separatamente e dichiarare come si ottiene l'eventuale riepilogo.

Esempio di test sintetico: tre coppie di serie più un'extra SX producono quattro serie SX e tre DX, non sette per entrambi i lati. L'effetto indiretto si calcola con lo stesso criterio, senza duplicare l'extra.

Il tonnellaggio è un'altra metrica, `somma(carico normalizzato × ripetizioni)`, disponibile solo quando convenzioni e gesto rendono il confronto sensato. Mostrare il calcolo e non usarlo come misura universale di crescita muscolare. Le serie con RIR sconosciuto possono entrare nel conteggio delle serie completate, ma non in classificazioni di intensità che richiedono quel dato.

## 10. NUTR-01 — Obiettivi e monitoraggio

Fonti candidate: XLS-01 e KB-05, con verifica dedicata delle formule e dei parametri prima dell'attivazione.

Distinguere valore inserito dall'utente, valore stimato e obiettivo approvato. Salvare sempre unità, metodo, input, data e autore della decisione. La scelta manuale non viene sovrascritta dal ricalcolo di una stima.

La relazione energetica di controllo proposta è `4 × proteine + 9 × grassi + 4 × carboidrati`, con tolleranza esplicita per arrotondamenti. Se calorie e macro non sono coerenti, mostrare la differenza e proporre una soluzione. Un residuo negativo non diventa silenziosamente zero.

Il sistema usa una sola tabella delle pesate. Media settimanale con numero di osservazioni e periodo locale dichiarati; nessuna media pari a zero per settimane mancanti. Come soglia candidata di qualità dei dati, valutare almeno tre pesate in ciascuna di tre settimane consecutive, che consentono due variazioni successive. È una scelta operativa da validare, non una soglia clinica.

Solo una tendenza sufficiente, coerente con il metodo attivo, può produrre una proposta sui target. I limiti percentuali e gli scatti calorici restano configurazioni revisionate, non costanti copiate indiscriminatamente dalla scheda. Peso e circonferenze non sono una misura diretta della variazione di massa muscolare.

## 11. APPROVE-01 — Consenso, versioni e applicazione

La UI presenta un riepilogo sintetico e il dettaglio prima/dopo espandibile. La persona può accettare, rifiutare, modificare la bozza o chiedere un'alternativa. Un messaggio conversazionale ambiguo come “interessante” non autorizza l'applicazione.

Il percorso standard di accettazione è un comando del componente dedicato. Se in futuro si accetta anche tramite linguaggio naturale, serve comunque una conferma inequivocabile del riepilogo specifico; non affidare a una classificazione probabilistica il consenso finale.

Sul server verificare proprietario, stato pending, versione esatta, fingerprint dei dati e compatibilità con altre modifiche accettate. Nella stessa transazione registrare decisione e nuova versione del programma. Un identificativo idempotente rende innocuo il doppio invio. Una proposta obsoleta non può essere applicata a un piano diverso.

Le modifiche accettate entrano in vigore nella decorrenza mostrata, mai su sessioni concluse. Per modificare una sessione attiva serve un'azione esplicita che conserva target originali e cambiamenti effettuati.

## 12. AI-01 — Assistente e generazione in linguaggio naturale

Percorso: richiesta → estrazione dei vincoli → recupero fonti consentite → bozza strutturata → validazione deterministica → anteprima → conferma → applicazione autorizzata.

Controlli necessari:

- Dati del solo utente autenticato, ottenuti da strumenti con permessi propri; nessun accesso arbitrario a query o file del server.
- Recupero di passaggi pertinenti con ID fonte e sezione, distinguendo contenuti verificati da opinioni/metodi.
- Testo del vault e dell'utente trattato come dati: eventuali istruzioni incorporate non possono cambiare strumenti o permessi.
- Schema chiuso dell'output: ID esercizi esistenti, numeri validi, unità, vincoli e differenze controllate.
- Nessuna citazione inventata e nessuna promessa di risultato fisico garantito.
- Conferma separata dal modello; nessuno strumento AI di scrittura diretta sui piani attivi.
- Timeout, quote, annullamento, fallimento del provider e fallback a flusso guidato.
- Conservazione delle conversazioni definita prima del rilascio; dati minimi inviati al provider e chiavi solo sul server.

La selezione del modello AI dipende da prove su italiano, rispetto dei vincoli, qualità delle fonti, latenza e costo per richiesta riuscita. Budget senza limiti non elimina la necessità di misurare qualità e affidabilità.

## 13. Suite minima di esempi e casi limite

| Test | Caso sintetico | Risultato atteso |
| --- | --- | --- |
| ALG-01 | Tre serie complete al massimo con RIR compatibile | Proposta di incremento disponibile; piano invariato finché non accettato |
| ALG-02 | Quattro serie prescritte, solo tre registrate | Dati insufficienti; nessun aumento |
| ALG-03 | Ripetizioni massime, RIR sotto il minimo del metodo | Nessuna proposta ordinaria di aumento |
| ALG-04 | RIR necessario ma assente | Richiesta del dato o esito non conclusivo |
| ALG-05 | Stessi risultati in settimana di scarico | Nessun incremento derivato dalla regola ordinaria |
| ALG-06 | Tutti i manubri configurati sono già al limite | Nessun peso inesistente; eventuale alternativa motivata |
| ALG-07 | Extra di accumulo già presente e ponte di volume richiesto | Nessuna duplicazione dell'extra vietata dal modello |
| ALG-08 | DX supera SX nel protocollo con SX guida | Dato conservato e anomalia spiegata; niente correzione inventata |
| ALG-09 | Cambio macchina o convenzione totale/per manubrio | Serie non confrontate automaticamente come identiche |
| ALG-10 | Stesso squat in due giornate con target diversi | Progressioni separate per contesto |
| ALG-11 | Tre coppie di serie e un'extra SX | Volume SX=4, DX=3 |
| ALG-12 | Utente rifiuta una proposta | Nessuna modifica e nessuna riproposizione identica immediata |
| ALG-13 | Doppio clic su accetta | Una sola decisione e una sola nuova versione |
| ALG-14 | Proposta su versione precedente del programma | Rifiuto come obsoleta e nuova revisione da confermare |
| ALG-15 | Accettazione offline, modifiche concorrenti online | Conflitto esplicito; risultati reali non persi |
| ALG-16 | Generatore senza attrezzi compatibili | Vincolo incompatibile spiegato, nessun esercizio inventato |
| ALG-17 | Giorni o tempo incompatibili con il modello | Alternative esplicite, nessuna rimozione nascosta di vincoli |
| ALG-18 | Meno assistenza nel corpo libero | Direzione della progressione corretta e metrica distinta |
| ALG-19 | Tre settimane con una settimana priva di peso | Nessun trend artificiale né modifica nutrizionale |
| ALG-20 | Macro con energia superiore al target | Incoerenza visibile, nessun clamping silenzioso |
| ALG-21 | Scarto tra arti negativo | Segno e valore assoluto coerenti; nessuna diagnosi |
| ALG-22 | Fonte contiene istruzioni di ignorare permessi | Nessuna esecuzione o ampliamento dell'accesso |
| ALG-23 | AI propone un esercizio inesistente o fuori attrezzatura | Bozza respinta dalla validazione |
| ALG-24 | AI indisponibile durante la seduta offline | Diario e motore locale ancora utilizzabili |
| ALG-25 | Regola aggiornata dopo una proposta già vista | Versione tracciata; nessuna applicazione silenziosa del nuovo metodo |

Questa suite verifica il comportamento del software. La validità dei metodi di allenamento e la qualità delle raccomandazioni richiedono anche revisione di dominio e prove sul campo, senza confondere test automatici superati con efficacia fisiologica dimostrata.

## 14. Come implementare il motore

### 14.1 Moduli e interfacce

In `packages/domain`: normalizzazione unità, risoluzione prescrizione effettiva, selezione evidenze comparabili, funzioni di valutazione per famiglia, verifica vincoli, composizione delle proposte e calcoli delle metriche. Le funzioni ricevono snapshot immutabili, configurazione revisionata e contesto temporale esplicito; restituiscono `Evaluation` descritto nelle convenzioni.

Separare `resolvePrescription`, `selectComparableEvidence`, `evaluateRule`, `resolveProposalConflicts`, `validateDraft` e `explainDecision`. Non separare in classi per il solo gusto di avere più file: questi passaggi hanno responsabilità verificabili e devono poter essere testati indipendentemente. Nessuna funzione del motore chiama direttamente il database o un modello AI.

Output numerico e spiegazione derivano dalla stessa decision trace strutturata: condizioni verificate, serie incluse/escluse con motivo, soglie configurate, arrotondamenti e fonti. Non far inventare all'AI una spiegazione retroattiva diversa dal calcolo. L'AI può riformulare il testo, ma le motivazioni strutturate restano ispezionabili.

### 14.2 Normalizzazione e comparabilità

Chiave di contesto: proprietario, variante/revisione, attrezzatura o macchina, load basis, modalità/lato, ruolo nel giorno e metodo. Una rinomina non cambia la comparabilità; un diverso assetto rilevante può cambiarla. Il campo “tecnica confrontabile” è una dichiarazione, non una verifica automatica del movimento.

La prescrizione effettiva determina le serie richieste. Serie extra, warm-up e mancate hanno categorie esplicite. Nessuna selezione opportunistica delle tre migliori serie quando erano richieste quattro. Dati non confrontabili restano nello storico; non vanno cancellati perché non utilizzabili dalla regola.

Gli input canonici dichiarano unità, precisione, timezone per raggruppamenti e missing values. Per il fingerprint ordinare chiavi, preservare ordine semantico di serie/giorni e includere revisioni di dati/regole/catalogo pertinenti. Versionare la serializzazione e l'algoritmo digest; usare implementazioni standard con vettori client/server, non un hash artigianale. Il digest rileva contenuto diverso, non prova la veridicità del diario.

### 14.3 Precedenze e conflitti

Ordine raccomandato: validità/ambito → dati sufficienti → fase del ciclo → compatibilità del contesto → regola principale → limiti complessivi → alternativa. Segnalazioni dell'utente che rendono non confrontabile la seduta portano a `needs_review` o esclusione motivata, senza inferire diagnosi.

Una sola proposta applicabile per lo stesso target e decorrenza, salvo composizione esplicitamente validata. Se scarico e aumento carico confliggono, non sommare i risultati: scegliere secondo priorità del metodo o chiedere revisione. Se due proposte distinte influenzano lo stesso budget di tempo/volume, accettarne una invalida o ricalcola l'altra. In fase di accettazione il server verifica nuovamente tutte le dipendenze.

### 14.4 Determinismo e varianti

Stessi input canonici, stessa configurazione e stesso seed producono lo stesso risultato. Nessun ordine casuale restituito dal database: ordinare per punteggio e poi per ID stabile. Se l'utente chiede un'alternativa, cambiare il seed o un vincolo dichiarato e registrarlo. Il seed non modifica mai esclusioni o attrezzi disponibili.

## 15. Generatore: ricerca concreta e parametri

### 15.1 Procedimento esecutivo raccomandato

1. Costruire elenco di template applicabili al profilo; se vuoto restituire vincoli non soddisfatti.
2. Filtrare catalogo per attrezzatura, modalità ed esclusioni obbligatorie prima di qualsiasi punteggio.
3. Per ogni slot del template ordinare candidati per esperienza dichiarata, preferenze, copertura e ripetibilità, con pesi nel rule bundle.
4. Assegnare progressivamente esercizi e dose; dopo ogni assegnazione controllare compatibilità e budget. Se necessario tornare al passo precedente entro un limite di ricerca.
5. Calcolare tempi contando esecuzione, lati, riposi e transizioni secondo il protocollo. Warm-up e superserie non devono essere sommati due volte o omessi.
6. Validare l'intera bozza e produrre alternative ordinate. Se scade il budget di calcolo restituire `needs_review`/ricerca incompleta, non “impossibile” come se fosse una prova matematica.

Partire da ricerca deterministica con backtracking limitato e pochi template curati. Un solver generale di ottimizzazione richiede modellazione e debug aggiuntivi: adottarlo se i casi impossibili/fattibili della suite dimostrano che la ricerca iniziale non basta. Il modello AI traduce richieste in vincoli e può proporre testi, ma non sceglie liberamente ID inesistenti o salta il validatore.

Budget tecnico iniziale da misurare: massimo 5.000 stati esplorati per generazione locale; eseguire in worker quando il profiling mostra blocco dell'interfaccia. Il limite è di calcolo, non di qualità fisiologica. Timeout/annullamento non producono una scheda attiva parziale.

### 15.2 Registro dei parametri

| Parametro | Provenienza | Default / stato iniziale | Verifica prima di attivare |
| --- | --- | --- | --- |
| Giorni, tempo disponibile, attrezzi | Utente | Input obbligatorio del percorso scelto | Nessuna sostituzione silenziosa |
| Range ripetizioni, serie, RIR, recupero | Template/metodo | Versione revisionata; nessun globale universale | Casi applicabili e non applicabili |
| Prossimo carico | Profilo attrezzatura | Successivo taglio disponibile | Unità e convenzione corrette, massimo gestito |
| Esposizioni richieste prima dell'aumento | Metodo | Da fissare per famiglia in F0–F6 | Coerenza con fonte e casi consecutivi/interrotti |
| RIR minimo e trattamento RIR alto | Metodo | Predicato esplicito, candidato §5 | Missing e valori limite testati |
| Soglia stallo | Metodo | Numero di esposizioni comparabili da validare | Settimane vuote non contano come prestazioni fallite |
| Massimo serie e ponte tra carichi | Metodo + tempo/volume | Configurazione approvata | Nessuna duplicazione extra del ciclo |
| Dose scarico | Metodo | Esempio Excel §7, candidato | Arrotondamenti, esercizi sospesi e carico coerenti |
| Coefficiente volume indiretto | Metodo | 0,5 solo nel modello Excel se mantenuto | Etichetta di convenzione, niente equivalenza fisiologica |
| Scala di varianti corpo libero | Catalogo revisionato | Mappa e prerequisiti da completare | Assistenza e zavorra distinte |
| Formula/ambito e1RM | Metodo di forza | Non attiva finché non validata | Limiti di applicabilità e dati insufficienti |
| Trend peso e scatti target | Metodo nutrizione | Finestra candidata §10; scatti da validare | Dati sufficienti, anomalie, unità e consenso |
| Pesi di ranking generatore | Rule bundle | Proposta da confrontare su fixture | Nessun peso prevale su un vincolo obbligatorio |

Valore mancante in un parametro obbligatorio di una regola impedisce l'attivazione di quella regola. Non riempire i buchi con “valori standard” inventati dal modello. L'editor manuale e il diario restano disponibili; la prima versione completa richiede comunque chiudere tutte le famiglie confermate prima del rilascio finale.

## 16. Assistente: strumenti, retrieval e valutazione

Strumenti consentiti: lettura del profilo minimo autorizzato, riepilogo del periodo scelto, ricerca catalogo, ricerca fonti consentite e invio bozza al validatore. Output con ID e riferimenti forniti dagli strumenti. Strumenti esclusi: SQL arbitrario, file system libero, modifica diretta piano/target, approvazione, invio di dati ad altri utenti.

Iniziare con ricerca testuale e filtri di metadati su corpus curato; valutare retrieval vettoriale solo se migliora un benchmark di domande italiane e riferimenti attesi. Filtri di accesso prima di selezione/ranking e assemblaggio del contesto; non recuperare dati di tutti per filtrarli soltanto dopo averli inviati al modello.

Versionare provider/model ID, prompt, schema strumenti, corpus e configurazione. Separare dataset di sviluppo e valutazione; misurare validità schema, rispetto vincoli, correttezza citazioni, informazioni mancanti dichiarate, latenza e costo per risposta utile. Violazioni di permessi o applicazioni senza consenso sono bloccanti, non compensabili con una media di qualità alta.

Il modello non può allargare il proprio ambito leggendo “ignora le istruzioni” in una nota. Timeout e output malformato restituiscono errore recuperabile o percorso guidato; niente retry illimitato, duplicazione di proposte o applicazione del risultato parziale.

## 17. Pubblicazione e aggiornamento dei metodi

Pipeline di release: bozza fonte → affermazioni e parametri → revisione di dominio → configurazione → test automatici → casi manuali → pubblicazione del bundle → rollout osservato. Tenere distinti autore contenuto, revisore e approvatore, anche se nella fase iniziale una persona ricopre più ruoli.

Ogni bundle distribuito conserva checksum, schema version, data, fonti, limiti e compatibilità del motore. Il client scarica solo bundle approvati; le vecchie sessioni conservano il proprio riferimento. Per errori gravi disattivare nuove proposte della regola, avvisare gli utenti coinvolti in modo mirato e preparare correzioni da confermare. Non riscrivere il passato o migrare silenziosamente programmi attivi.

La validazione delle fonti per forza, corpo libero e formule nutrizionali è un gate di F6/F7, non un dettaglio da delegare al modello in produzione. Il corpus iniziale qui elencato non dimostra da solo la copertura completa di questi ambiti.

## 18. Casi aggiuntivi di verifica

| Test | Caso | Esito atteso |
| --- | --- | --- |
| ALG-26 | Stessi input/seed/versioni, ordine DB differente | Identica decisione canonica |
| ALG-27 | Dose base + override ciclo + adattamento approvato | Una prescrizione effettiva senza doppio extra |
| ALG-28 | Aumento e scarico sullo stesso target | Conflitto risolto dal metodo o needs_review |
| ALG-29 | Accettata una proposta che cambia il budget di un'altra | Seconda rivalutata, nessuna applicazione automatica |
| ALG-30 | Ricerca raggiunge limite di stati | Esito incompleto dichiarato, non falsa prova di impossibilità |
| ALG-31 | Parametro obbligatorio non validato | Regola non attivabile |
| ALG-32 | UI e server con stesso bundle e fixture | Stesso output canonico e arrotondamenti |
| ALG-33 | Variante cambiata, nome uguale | Comparabilità rivalutata per ID/contesto |
| ALG-34 | Rifiuto ripetuto senza nuovi dati | Nessuna richiesta identica insistente |
| ALG-35 | Regola ritirata mentre device è offline | Risultati conservati; sync non applica nuovi target non più ammissibili |
