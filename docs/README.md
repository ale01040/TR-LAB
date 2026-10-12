# Manuale di progetto — indice e ordine di lettura

Per il dominio stabile [TR LAB](https://tr-lab.vercel.app): [rilascio verificato](qualita/RILASCIO_DOMINIO_STABILE.md) e [guida Vercel](operazioni/DEPLOY_VERCEL.md).
Per lo ZIP della modalità dispositivo: [caricamento manuale Netlify](operazioni/DEPLOY_NETLIFY.md).
Per le verifiche: [revisione dell'app](qualita/REVISIONE_APP.md) e [integrazione Supabase/Vercel](qualita/INTEGRAZIONE_SUPABASE.md). Configurazioni residue: [completare Auth](operazioni/COMPLETARE_AUTH.md) e [passaggi Gmail/Google](operazioni/CONFIGURAZIONE_GMAIL_GOOGLE.md), con preflight pubblico e collaudo reale separati.

Versione 1.3 · 12 ottobre 2026 · Stato: specifiche della versione completa e alpha implementata, Supabase collegato a locale/Preview/Production Vercel, prove database e HTTP remoto superate. Login Preview riuscito riferito dal committente; prove positive Production, email, due dispositivi e gate della roadmap restano aperti. Le specifiche non dichiarano chiuse tutte le fasi.

Per usare il codice iniziare da [avvio e Supabase](operazioni/AVVIO_LOCALE.md); per conoscere ciò che funziona e ciò che manca usare il [rapporto implementazione](qualita/STATO_IMPLEMENTAZIONE.md). Il [diario](DIARIO_SVILUPPO.md) registra file, motivazioni, prove ed errori corretti. Le [scelte implementative](architettura/SCELTE_IMPLEMENTAZIONE.md) esplicitano adattamenti e compromessi del codice rispetto alla progettazione.

Nuova consegna F4-EDITOR-02: [serie individuali, copia/riordino delle giornate e anteprima del ciclo](specifiche/EDITOR_SCHEDE.md), con prove di componente e persistenza sul contratto v1.

Questo pacchetto permette a uno sviluppatore di capire il prodotto, scegliere un'attività, implementarla e dimostrare che rispetta i requisiti. L'Excel fornisce la struttura funzionale; le raccolte web forniscono indicazioni di sviluppo; il vault fitness fornisce materiale da selezionare e validare. Nessuno di questi input va copiato indiscriminatamente nell'app.

## 1. Percorso di lettura

| Ordine | Documento | Domanda a cui risponde | Responsabile principale |
| --- | --- | --- | --- |
| 1 | [Decisioni](DECISIONI_E_DOMANDE.md) | Che cosa è già confermato e che cosa resta da decidere? | Prodotto |
| 2 | [Piano operativo](PIANO_OPERATIVO.md) | Che cosa deve poter fare l'utente? | Prodotto/design |
| 3 | [Scelte tecniche](architettura/SCELTE_TECNICHE.md) | Con quali strumenti, perché e con quali compromessi? | Referente tecnico |
| 4 | [Convenzioni](CONVENZIONI_SVILUPPO.md) | Come deve essere scritto e revisionato il codice? | Tutto il team |
| 5 | [UX e design](specifiche/UX_E_DESIGN.md) | Come si comportano le schermate, anche in errore? | Design/frontend |
| 6 | [Modello dati](specifiche/MODELLO_DATI.md) | Quali entità, vincoli e autorizzazioni persistono i dati? | Backend |
| 7 | [API e sincronizzazione](specifiche/API_E_SINCRONIZZAZIONE.md) | Come avvengono comandi, conflitti e funzionamento offline? | Frontend/backend |
| 8 | [Sicurezza e privacy](specifiche/SICUREZZA_E_PRIVACY.md) | Come si gestiscono identità, dati e abusi? | Backend/operazioni |
| 9 | [Fonti e algoritmi](FONTI_E_ALGORITMI.md) | Come si generano proposte verificabili? | Dominio/AI |
| 10 | [Import ed export](specifiche/IMPORT_EXPORT.md) | Come si trasferiscono schede e dati senza ambiguità? | Backend/dominio |
| 11 | [Test e accettazione](qualita/TEST_E_ACCETTAZIONE.md) | Quali prove autorizzano la chiusura di una fase? | QA |
| 12 | [Roadmap](ROADMAP_SVILUPPO.md) | In quale ordine si lavora e quali consegne si producono? | Referente tecnico/prodotto |
| 13 | [Rilascio e manutenzione](operazioni/RILASCIO_E_MANUTENZIONE.md) | Come si pubblica, ripristina e mantiene il servizio? | Operazioni |
| 14 | [Sviluppi futuri](SVILUPPI_FUTURI.md) | Che cosa si potrà aggiungere, e quando avrà senso? | Prodotto |

Leggere anche [AGENTS.md](../AGENTS.md), [indice appunti](../Appunti%20sviluppo%20web/00%20-%20Indice.md) e [indice linee guida](../Linee%20guida%20sviluppo%20web/00%20-%20Indice.md). Le raccolte originali restano parte della consegna.

## 2. Autorità dei documenti

1. Le istruzioni esplicite del committente e le decisioni DEC prevalgono.
2. Il piano definisce funzioni e perimetro. Le specifiche dettagliate definiscono i contratti; non aggiungono implicitamente funzioni al prodotto.
3. Le convenzioni applicano le raccolte con le deroghe confermate: Supabase al posto di MySQLi e commenti mirati al posto di commenti per ogni riga.
4. La roadmap organizza il lavoro; non può eliminare un requisito per rispettare una stima.

In caso di discrepanza aprire una voce nel registro decisioni, correggere tutti i riferimenti coinvolti e segnalare il punto. Non scegliere silenziosamente la formulazione più comoda.

## 3. Stati delle scelte

- **Confermato:** deciso dall'utente, modificabile soltanto con sua nuova indicazione.
- **Raccomandato:** soluzione tecnica motivata da adottare come base; il team può sostituirla con un ADR equivalente, rispettando i requisiti.
- **Candidato di dominio:** parametro o metodo da validare prima di generare prescrizioni per gli utenti.
- **Da collaudare:** disegno definito, prova su software ancora da eseguire.
- **Futuro:** fuori dal perimetro della prima versione completa.

Non esiste una scelta universalmente migliore per ogni team e ogni carico. La base raccomandata è valutata sui requisiti di questa app: affidabilità del diario, isolamento personale, consenso esplicito, manutenibilità e facilità operativa. I punti più rischiosi hanno prove anticipate in F1–F3.

## 4. Tracciabilità e manutenzione

Usare `DEC-*` per decisioni utente, `ADR-*` per architettura, `RF-*` per requisiti, `WEB-*` per raccolte, `ALG-*` per algoritmi e `QA-*` per accettazione. Ogni ticket collega requisito, sezione di specifica, test e prova di consegna. Una modifica al comportamento aggiorna nello stesso intervento i documenti interessati.

Il pacchetto v1.1 comprende l'ampliamento dei documenti 0.1/0.2 e la successiva verifica di correttezza e coerenza: corregge recupero dopo restore, logout offline, precisione dei contatori e alcuni esempi e formulazioni. L'Excel, le raccolte originali e il vault non sono stati modificati. Le fonti tecniche sono state consultate in questa pianificazione; versioni delle dipendenze, quote dei servizi e compatibilità vanno ricontrollate all'avvio effettivo.

Esito della revisione, controlli eseguiti e limiti: [rapporto di revisione documentale](qualita/REVISIONE_DOCUMENTAZIONE.md).
