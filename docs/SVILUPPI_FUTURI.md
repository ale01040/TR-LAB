# Evoluzione del prodotto e condizioni per estenderlo

Versione 1.1 · Nessuna voce qui è una dipendenza nascosta della prima versione completa.

## 1. Funzioni già incluse

Account pubblici gratuiti, Google/email, catalogo, editor, generatori per ipertrofia/forza/corpo libero, periodizzazione, diario offline, proposte confermate, volume, misure, target nutrizionali, copie indipendenti e assistente AI fanno parte della roadmap principale. Non rimandarle in questa lista per ridurre artificialmente il perimetro.

## 2. Estensioni con motivazione e costo

| Estensione | Valore | Dipendenze / controindicazioni progettuali | Quando valutarla |
| --- | --- | --- | --- |
| Lingue e unità aggiuntive | Più utenti, convenzioni internazionali | Test conversioni e traduzioni di esercizi/fonti; storico canonico necessario | Richieste reali da utenti fuori dal gruppo iniziale |
| Promemoria facoltativi | Aiuto alla continuità | Permessi e supporto browser variabile; mai requisito per diario | Dopo stabilità della PWA |
| Ruolo allenatore | Assegnazioni e feedback | Modello di delega/revoca, ruoli, privacy, consenso distinto dal semplice share | Nuovo perimetro approvato |
| Collaborazione sulla stessa scheda | Editing condiviso | Conflitti più complessi, permessi granulari; possibile studio CRDT | Solo con casi reali che la copia indipendente non risolve |
| Diario alimentare | Registrazione pasti e prodotti | Database alimenti/licenze, unità/porzioni e qualità dati; prodotto molto più ampio | Conferma esplicita della domanda |
| Wearable/sensori | Import attività e segnali | API/licenze, duplicati, fusi, attendibilità e consenso | Provider specifico e valore dimostrato |
| Applicazioni native | Hardware/background più profondi | Due distribuzioni, store, migrazioni locali e manutenzione; dominio riusabile, UI non automaticamente | Limite PWA misurato che impedisce una funzione richiesta |
| Analisi video della tecnica | Feedback su esecuzione | Video personali, validazione tecnica e di dominio, falsi risultati; non promettere diagnosi | Progetto separato con competenze e prove |
| Minori, clinica o riabilitazione | Nuovi destinatari | Cambia responsabilità, requisiti e validazione; escluso dalla base attuale | Nuova iniziativa esplicitamente autorizzata |
| Servizi a pagamento | Sostenibilità economica | Billing, supporto e requisiti commerciali | Cambiamento esplicito della gratuità confermata |

## 3. Evoluzione tecnica guidata da misure

| Segnale | Prima azione | Solo dopo, se necessario |
| --- | --- | --- |
| Query lente | EXPLAIN, indici, paginazione, eliminare richieste ridondanti | Aggregazioni materializzate o capacità maggiore |
| Build lente | Profilare pacchetti e cache CI | Orchestratore monorepo |
| Job AI saturano API | Limiti concorrenza, worker e coda | Servizio indipendente con scaling dedicato |
| Lock per account molto contesi | Misurare operazioni e durata transazioni | Protocollo cursori più evoluto, mantenendo assenza di buchi |
| Limiti di sync diventano troppo costosi | Confronto su fixture tra motore attuale e servizio specializzato | Migrazione documentata, mai cambio durante una seduta |
| Molti contenuti pubblici e SEO centrale | Pre-render delle pagine pubbliche | Framework con SSR o sito editoriale distinto |
| Retrieval AI non trova fonti pertinenti | Curare corpus e benchmark ricerca testuale | Ricerca vettoriale/ibrida con filtri di autorizzazione prima dei risultati |

Non aggiungere microservizi, Kubernetes, Redis, vector database esterno o modello addestrato su misura senza una domanda misurabile e una prova comparativa. La disponibilità di risorse non elimina il costo cognitivo e operativo.

## 4. Come proporre un'estensione

Descrivere problema utente, evidenze, alternative semplici, dati aggiuntivi, cambi ai permessi, costo operativo, impatto su offline e controllo finale, criterio di successo e modalità di rimozione. Preparare prototipo e prova tecnica, aggiornare DEC/ADR e approvare il nuovo perimetro prima di integrarlo nella roadmap.

Ogni estensione mantiene esportabilità, versioni storiche e consenso esplicito. Nuovo algoritmo o nuovo modello AI non possono cambiare automaticamente i target già approvati.
