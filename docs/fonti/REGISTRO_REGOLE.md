# Registro del corpus e delle regole operative

13 ottobre 2026. MOT-01/04/05, RF-05/08, ADR-08/09/14, WEB-11/12/14. [Manifest dei metadati](MANIFEST_CORPUS.json), [specifica degli algoritmi](../FONTI_E_ALGORITMI.md), [piano del motore](../piani/GENERATORE_E_PROGRESSIONI.md).

## Stato effettivo

Nessun metodo attivo viene installato dalle migrazioni. Il generatore e la valutazione delle progressioni hanno implementazioni pure e fixture sintetiche, ma le soglie non sono prescrizioni revisionate. I testi del vault, i dati personali e le copie dei libri non entrano nel repository. Gli hash identificano la revisione delle note selezionate; non provano la correttezza delle loro affermazioni.

In questo incremento è stato riletto KB-02. Le altre note sono identificate dai metadati dell'inventario precedente; la loro hashatura non equivale a nuova lettura integrale. La ricerca primaria ha individuato il [position stand ACSM 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/) e l'[annuncio ufficiale](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/). Annuncio/abstract consultati; la revisione del testo completo e la traduzione in protocolli individuali restano aperte.

## Matrice di sviluppo e revisione

| Famiglia | Software disponibile | Prima dell'attivazione |
| --- | --- | --- |
| Generazione a ripetizioni, forza/ipertrofia | Template dichiarativi, obiettivo/modo/ambiente, vincoli, ricerca entro 5.000 stati, stima con assunzioni | Template, popolazione, livello, dose, limiti di tempo/volume e catalogo revisionati; matrice dei casi fisiologici indipendente |
| Doppia progressione | Tutte le serie/lati, RIR, carico osservato, taglio reale, esposizioni, reset dichiarato | Soglia dello sforzo, numero di esposizioni e salto massimo con fonte/revisore; comparabilità dello strumento |
| Ripetizioni serie per serie | Passo sulla prima serie entro il range, reset da parametro | Sequenza, condizione di passaggio, ambiti e controesempi revisionati |
| Assistenza/corpo libero | Direzione distinta; rifiuto dei cambi di variante privi di prerequisiti | Identità strumento/variante, prerequisiti, limiti; le macchine senza identità storica restano da rivedere |
| Ponte fra scatti, stallo, forza percentuale/top set | Esiti conservativi e confini di schema; nessun metodo completo attivo | Regole dedicate, parametri e baseline confrontabili; non sostituire con la sola doppia progressione |
| Esercizi a durata e variante più difficile | Metrica non supportata rifiutata, senza convertirla in reps | Dose/esito v2, editor, SQL, diario, fixture e metodi specifici |
| Nutrizione e assistente conversazionale | Fuori da questo incremento del motore | Gate delle fasi F7/F9; le regole di allenamento non autorizzano obiettivi clinici o strumenti di accettazione AI |

## Procedura di pubblicazione del bundle

1. Il curatore compila un `RuleBundle` conforme a `packages/contracts/src/engine.ts`: fonti, versione catalogo, esercizi ammessi, template, dosi, assunzioni temporali e parametri della progressione. Non copiare la fixture `software-fixture`.
2. Una competenza di allenamento distinta dall'autore del calcolo verifica condizioni, popolazione, limitazioni, controesempi e valori. Registra nominativo, data e motivazioni; le fonti prive di diritto di distribuzione restano solo riferimenti.
3. QA prepara attesi indipendenti per ciascun ambito. Le 60 combinazioni sintetiche del generatore verificano vincoli e determinismo del software; non dimostrano efficacia, idoneità individuale o copertura di tutte le famiglie.
4. Dopo gate S/A e revisione del dominio, il curatore autorizzato registra il bundle sul database di staging. Gli utenti e il runtime non hanno DML sul registro. Parametri e contenuto non cambiano sotto la stessa versione.
5. Solo un passaggio esplicito a `active` rende il metodo disponibile. Il BFF ricalcola e pubblica una proposta privata; la persona deve leggere e confermare. Il ritiro del bundle blocca nuove accettazioni e conserva lo storico.

Non automatizzare questa revisione impostando `reviewer` a un nome fittizio. Cron/esecutore persistente, consenso offline e recupero delle esecuzioni su piani provvisori rimangono gate separati; la sola presenza delle funzioni pure non li chiude.
