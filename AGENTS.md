# Istruzioni per chi sviluppa l'applicazione

Per richiesta esplicita del committente, lo sviluppo deve seguire entrambe queste raccolte presenti nella radice del progetto:

- `Appunti sviluppo web/`, a partire da `00 - Indice.md`.
- `Linee guida sviluppo web/`, a partire da `00 - Indice.md`.

Leggere gli indici e le regole generali prima di iniziare; leggere integralmente i capitoli pertinenti prima di intervenire sul relativo ambito. I rinvii e le sintesi nei documenti di progetto non sostituiscono le fonti originali. Conservare queste cartelle nel pacchetto di consegna.

Seguire inoltre:

- `docs/PIANO_OPERATIVO.md` per requisiti e struttura del prodotto.
- `docs/ROADMAP_SVILUPPO.md` per fasi, consegne e collaudo.
- `docs/FONTI_E_ALGORITMI.md` per il dominio allenamento e l'AI.
- `docs/DECISIONI_E_DOMANDE.md` per decisioni confermate e punti aperti.
- `docs/CONVENZIONI_SVILUPPO.md` per applicazione delle due raccolte, verifiche e compatibilità architetturale.
- `docs/README.md` come indice del pacchetto e ordine di lettura.
- `docs/architettura/SCELTE_TECNICHE.md` per strumenti, alternative, pro/contro e confini dei moduli.
- `docs/specifiche/` per UX, modello dati, API/offline, sicurezza e import/export.
- `docs/qualita/TEST_E_ACCETTAZIONE.md` e `docs/operazioni/RILASCIO_E_MANUTENZIONE.md` per prove e gestione.
- `docs/SVILUPPI_FUTURI.md` per estensioni fuori dal perimetro corrente.

Le indicazioni esplicite del committente prevalgono sulle proposte tecniche del piano. Non ignorare una disposizione delle raccolte perché lo stack proposto inizialmente usa un'altra tecnologia. Risolvere e documentare le incompatibilità prima di implementare la parte interessata; proseguire sulle attività indipendenti.

Le fonti dichiarano di non aver ricevuto una revisione tecnica. Distinguere requisiti, esempi didattici, refusi e indicazioni dubbie. Verificare i punti tecnici incerti sulla documentazione ufficiale aggiornata; registrare fonte, motivazione ed eventuale decisione del committente senza modificare silenziosamente gli originali.

Il committente ha confermato Supabase/PostgreSQL (DEC-18): questa scelta sostituisce esplicitamente il richiamo a MySQLi nelle raccolte. Non riaprire la scelta del database senza nuovi motivi o istruzioni. Il resto dello stack resta una proposta tecnica. Progettare le sessioni in modo coerente con il requisito dei cookie di autenticazione non accessibili a JavaScript; il piano propone un livello server per preservarlo senza sostituire Supabase. Verificare questa integrazione in F2–F3. Segnalare al committente ogni ulteriore conflitto, distinguendo incompatibilità, refusi e scelte implementative.

Ogni consegna deve indicare i capitoli applicati, i controlli eseguiti e quelli ancora aperti. Le proposte automatiche dell'app non possono cambiare target approvati senza accettazione esplicita dell'utente interessato.

Il committente ha scelto commenti mirati e completi (DEC-19): motivazioni, invarianti, regole e sicurezza, senza commentare meccanicamente ogni riga. Questa istruzione prevale sul passaggio corrispondente delle raccolte.

Prima di implementare un modulo leggere la sua specifica e collegare ticket, RF, ADR, WEB e test. Rispettare i confini domain/contracts/adapters; niente SDK o rete nelle regole pure, niente service key nel frontend, niente scritture generiche che aggirino consenso e sincronizzazione.

Gli esempi nei documenti sono specifiche e fixture, non codice già verificato in produzione. Non dichiarare test dell'app superati sulla base di una verifica dei Markdown. Non creare servizi remoti, acquistare prodotti o pubblicare l'app come effetto implicito di un incarico di sola pianificazione.
