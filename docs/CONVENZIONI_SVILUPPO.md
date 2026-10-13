# Convenzioni di sviluppo e riferimenti obbligatori

Versione 1.1 — 10 ottobre 2026. Integra DEC-16 (raccolte obbligatorie), DEC-17 (conflitti espliciti), DEC-18 (Supabase) e DEC-19 (commenti mirati e completi). Questo è il manuale di scrittura e revisione del codice; strumenti e alternative sono motivati nelle [scelte tecniche](architettura/SCELTE_TECNICHE.md).

Percorso: §§1–5 applicazione delle raccolte; §§6–10 organizzazione e codice; §§11–13 strumenti, revisione e consegna. Le regole di questo documento sono da implementare e verificare, non conformità già ottenute.

## 1. Fonti e modalità di consultazione

| Raccolta | Percorso completo | Ruolo |
| --- | --- | --- |
| Appunti sviluppo web | `C:\Users\peret\Desktop\VIBE CODING\APP ALLENAMENTI\Appunti sviluppo web` | Fondamenti e spiegazioni per comprendere le scelte tecniche |
| Linee guida sviluppo web | `C:\Users\peret\Desktop\VIBE CODING\APP ALLENAMENTI\Linee guida sviluppo web` | Indicazioni operative da applicare e verificare |

Punti di ingresso: [indice appunti](../Appunti%20sviluppo%20web/00%20-%20Indice.md) e [indice linee guida](../Linee%20guida%20sviluppo%20web/00%20-%20Indice.md).

Entrambi gli indici dichiarano che i materiali conservano formulazioni e indicazioni non sottoposte a revisione tecnica. Seguire i materiali significa leggerli, applicarne i requisiti e risolverne in modo esplicito i punti dubbi; non copiare indistintamente ogni esempio nel codice di produzione.

Prima dello sviluppo leggere indici e regole generali. Prima di ogni modulo leggere integralmente i capitoli pertinenti di entrambe le raccolte. Registrare nella consegna capitoli applicati, interpretazione, verifiche e punti aperti. La matrice seguente facilita la consultazione e non sostituisce nessuna disposizione contenuta nelle fonti.

Le richieste esplicite del committente sono vincolanti e prevalgono sulle raccolte. Supabase/PostgreSQL è confermato e sostituisce il richiamo MySQLi; le altre proposte del piano devono rispettare i requisiti applicabili. Correggere refusi tecnici sulla base della documentazione ufficiale, annotando la correzione; sottoporre al committente le scelte che cambiano un suo requisito, dopo aver preparato alternative concrete. Non richiedere nuovamente una decisione già ricevuta.

## 2. Matrice di applicazione

I numeri indicano i capitoli nei rispettivi indici. Le verifiche elencate sono attività da eseguire durante lo sviluppo, non controlli già superati dall'app.

| ID | Ambito | Appunti | Linee guida | Applicazione e verifica | Fasi |
| --- | --- | --- | --- | --- | --- |
| WEB-01 | Regole generali | 01 | 01 | Codice semplice, leggibile e senza ridondanze; commenti mirati e completi secondo DEC-19; revisione del codice e strumenti indicati nelle fonti | F0–F11 |
| WEB-02 | HTML | 02 | 02 | Italiano, semantica, struttura, metadati, immagini con alternative testuali; controllo dell'HTML prodotto, non solo dei template sorgenti | F1/F4/F10 |
| WEB-03 | CSS | 03 | 03 | Nomi chiari, unità relative, tipografia, Grid/Flexbox, media query; verifica layout, ingrandimento testo e CSS | F1/F4/F10 |
| WEB-04 | Interazione | 01/04 | 04/10 | Euristiche di Nielsen, chiarezza, stato del sistema, annullamento, recupero dagli errori e aiuto; prove sui flussi del diario e delle proposte | F1/F5/F6/F10 |
| WEB-05 | Accessibilità | 04 | 02/04/10 | Conformità almeno AA, principi POUR, tastiera, focus, contrasto, HTML nativo e ARIA pertinente; verifica manuale oltre agli strumenti automatici | F1–F10 |
| WEB-06 | Temi e stampa | 03/04 | 03/04 | Tema chiaro e scuro; pagine stampabili, scheda e riepiloghi leggibili, navigazione non necessaria rimossa in stampa; verifica anteprima e PDF | F1/F4/F7/F8/F10 |
| WEB-07 | JavaScript | 05/06 | 05 | Modularità, gestione errori, eventi, modalità strict corretta, minificazione senza offuscamento; spostamento dei lavori pesanti fuori dalle interazioni del diario quando necessario | F2/F5/F6/F9 |
| WEB-08 | Form e validazione | 05/06 | 06/10 | Validazione client e server, pattern semplici, controlli di dominio, messaggi vicino ai campi e dati preservati; prove con input errati e ostili | F3–F9 |
| WEB-09 | Prestazioni | 06 | 01/05/07 | Misurare LCP, INP, CLS e percorsi reali; ottimizzare immagini, caricamenti e bundle; report Lighthouse/PageSpeed riproducibile | F2/F5/F10/F11 |
| WEB-10 | SEO pubblico | 01/06 | 01/07 | Consultare le risorse Google richiamate nelle fonti; contenuti e metadati delle pagine pubbliche, Schema.org quando pertinente; separare l'area personale dai contenuti indicizzabili | F2/F10/F11 |
| WEB-11 | Sicurezza | 08 | 06/08/10 | Password protette, HTTPS, autorizzazione, minimo privilegio, query parametrizzate, escaping, CSP, protezione CSRF/replay e limitazione abusi; test diretti delle API | F2–F11 |
| WEB-12 | Sessioni e stato | 07/08 | 08/11 | Cookie/sessioni, scadenze, logout, cancellazione e isolamento account; conciliare cookie HttpOnly e dati necessari al diario offline | F2/F3/F5/F8 |
| WEB-13 | Cache e rete | 06/07 | 09 | Cache differenziate, asset versionati, ETag e invalidazione; nessuna risposta personale nella cache pubblica/CDN; prove dopo aggiornamenti e cambio account | F2/F5/F11 |
| WEB-14 | Database | 07 | 08/11 | Applicare Supabase/PostgreSQL secondo DEC-18; contratti, query parametrizzate, codifica, grant e RLS; verificare migrazioni e isolamento tra utenti | F0/F2/F3/F4 |

## 3. Integrazioni concrete al prodotto

- Tema chiaro/scuro e supporto alla stampa diventano requisiti da collaudare, non semplici proposte estetiche. Progettare la stampa delle viste informative, della scheda e dei riepiloghi, con colori leggibili, tipografia adeguata e senza controlli interattivi superflui.
- Concordare icona, palette e immagini prima del design definitivo, come richiesto dalle linee guida HTML/web design. I placeholder del prototipo non sono l'identità finale.
- Definire feedback, conservazione dei campi e recupero degli errori per login, editor, diario, import e accettazione delle proposte.
- Applicare SEO e dati strutturati alle pagine effettivamente pubbliche. Non rendere pubblici diario, misure, chat o link privati per migliorare un punteggio SEO. Le analisi di traffico devono rispettare il modello privacy del progetto.
- Distinguere cache degli asset, dati locali dell'utente, risposte autenticate e pagine pubbliche. Una politica unica non è sufficiente per tutti i contenuti.
- Eseguire i validatori e gli strumenti indicati su pagine pubbliche o dati sintetici; non inviare a servizi esterni pagine con token o dati personali per ottenere un report.

## 4. Registro dei conflitti e degli adattamenti

| Punto | Evidenza nelle raccolte | Azione richiesta |
| --- | --- | --- |
| Database e backend — RISOLTO | `Linee guida sviluppo web/11 - Stato database sessioni e cookie.md` dice “usare MySQLi”; il committente ha successivamente scelto Supabase | Applicare DEC-18: Supabase/PostgreSQL. MySQLi è un'estensione PHP per accedere a MySQL, non un'alternativa equivalente all'intera piattaforma Supabase. Conservare gli altri requisiti su query, integrità e sicurezza |
| Sessioni web — SOLUZIONE PROPOSTA, DA COLLAUDARE | I capitoli 08 e 11 richiedono cookie di autenticazione non accessibili a JavaScript; l'integrazione Supabase con sessione gestita nel browser accede ai token | Usare il livello server del piano §6.1, con cookie di sessione HttpOnly e token Supabase gestiti sul server. Validare in F2–F3 login, Google, rinnovi concorrenti, revoca, CSRF e RLS. Non dichiarare il normale client browser conforme a HttpOnly |
| Password e crittografia — ADATTAMENTO TECNICO | Sono presenti il suggerimento di provare Argon2id, salt, SHA-3 e un esempio di password lungo 8–16 caratteri | Usare Supabase Auth senza duplicare le credenziali: il provider documenta bcrypt con salt. Argon2id è un suggerimento, non un obbligo di riscrivere Auth; SHA-3 è una famiglia di funzioni hash generiche, non un algoritmo dedicato alla conservazione delle password. Aggiornare e documentare la politica di lunghezza prima di F3 |
| Stato offline — AMBITI DISTINTI | Le raccolte chiedono dati sensibili di sessione sul server; DEC-08 richiede un diario completo offline | Segreti di autenticazione sul server; dati minimi di allenamento e coda in IndexedDB, isolati per account. Un'interpretazione che vietasse ogni dato locale sarebbe incompatibile con DEC-08. Riautenticare prima della sincronizzazione senza perdere il diario |
| Indicazioni non definitive | Refusi come “use strinct”, note “NON SONO SICURO”, esempi PHP e riferimenti storici | Aprire voci di verifica puntuali, correggere la sintassi nell'implementazione e annotare la fonte ufficiale. Non alterare silenziosamente i materiali originali |
| Funzioni opzionali | Le fonti distinguono alcuni consigli e opzioni, inclusa una taratura del password hashing da discutere prima dell'implementazione | Preservare queste distinzioni. Non trasformare ogni opzione in una dipendenza obbligatoria; valutare la soluzione concreta prima di richiedere decisioni |

La scelta del database è chiusa. Codice alpha, integrazione Supabase e rilascio Production sono disponibili: [evidenze e limiti](qualita/STATO_IMPLEMENTAZIONE.md). Il progetto Supabase fornito dall'utente è stato collegato e configurato nei successivi interventi autorizzati DEC-28/29/30; la precedente indicazione di assenza di modifiche remote descriveva soltanto la fase iniziale di pianificazione. Supabase non fornisce automaticamente progressioni o protocollo offline specifico; i gate provider/sicurezza/dispositivi restano aperti.

Fonti tecniche consultate per questi punti:

- [Manuale PHP MySQLi](https://www.php.net/manual/en/book.mysqli.php): ambito del driver e distinzione dal servizio gestito.
- [Supabase, sessioni e cookie](https://supabase.com/docs/guides/auth/server-side/advanced-guide): accesso ai token nell'integrazione browser. Il livello server con sessione opaca è una proposta architetturale del progetto.
- [Supabase, sicurezza delle password](https://supabase.com/docs/guides/auth/password-security): hashing gestito dal provider e configurazione della politica.
- [OWASP, autenticazione](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): raccomanda un massimo consentito di almeno 64 caratteri per supportare passphrase, in contrasto con il tetto 16 dell'esempio. Verificare limiti effettivi, caratteri Unicode e comportamento del provider; non troncare silenziosamente le password né dichiarare conformità senza prova.

Commenti — RISOLTO con DEC-19: il committente ha scelto commenti mirati e completi. Spiegare motivazioni, invarianti, sicurezza e passaggi non ovvi; non ripetere ogni riga in italiano. Il testo originale resta conservato, ma questa decisione sostituisce quella specifica prescrizione.

Ulteriori adattamenti da registrare: `use strinct` è un refuso di `use strict`; i moduli ES sono già strict. React gestisce il ciclo di rendering e gli eventi dichiarativi: non aggiungere manipolazioni DOM o listener globali per imitare letteralmente esempi didattici. Node è un runtime, non soltanto un server già pronto. [MDN, strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode).

Per SEO le raccolte richiedono l'analisi dell'intero Search Central: si tratta di un corpus ampio e in evoluzione. In F0/F10 inventariare le sezioni pertinenti, citare quelle applicate e motivare le non pertinenti; non dichiarare di aver letto tutte le pagine se non è stato fatto. Pagine private restano protette e non diventano contenuti pubblici per soddisfare un punteggio. Autocomplete delle credenziali deve consentire password manager; “disabilitare per campi sensibili” non va applicato ciecamente al login.

## 5. Evidenze richieste per le consegne

Ogni ticket o revisione deve indicare i capitoli applicabili, come sono stati applicati e dove si trova l'evidenza. Per un capitolo non pertinente spiegare brevemente il motivo; “non applicabile” non è una deroga a una disposizione pertinente.

La consegna finale include le due raccolte originali, questa matrice aggiornata, le decisioni architetturali, i rapporti di validazione HTML/CSS, accessibilità, contrasto e prestazioni, le prove dei form e delle sessioni, i controlli di stampa e cache e gli eventuali punti ancora aperti. Un buon punteggio automatico non sostituisce la verifica funzionale del diario e delle conferme.

Questa integrazione registra vincoli e verifiche. Alpha locale, Preview e dominio stabile Production collegati a Supabase sono implementati; conformità, esiti effettivi e controlli aperti sono distinti nel rapporto collegato e nel [rilascio verificato](qualita/RILASCIO_DOMINIO_STABILE.md). La presenza di codice o l'autorizzazione DEC-30 non chiudono automaticamente i requisiti della versione completa.

## 6. Organizzazione, nomi e confini

Seguire la struttura di [architettura](architettura/SCELTE_TECNICHE.md). Un modulo corrisponde a una capacità riconoscibile: workout, programs, proposals, sync, auth. Evitare una cartella `utils` dove finisce tutta la logica. File `.tsx` solo con JSX, `.ts` per dominio/contratti/adapters.

Nomi tecnici in inglese, UI e documentazione di prodotto in italiano. Componenti/tipi PascalCase, funzioni/variabili camelCase, tabelle/colonne SQL snake_case. Funzioni con verbi concreti: `saveSetLocally`, `evaluateProgression`, `acceptProposal`; evitare `handleData`, `processEverything`, abbreviazioni ambigue e booleani posizionali.

Funzioni piccole per responsabilità, senza limite artificiale di righe. Estrarre codice quando si separa una responsabilità o esiste riuso reale; non introdurre classi base, factory e repository generici per ogni entità. Dipendenze esterne dietro adapter solo dove serve testare/sostituire quel confine.

## 7. TypeScript e contratti

Impostazioni richieste: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, controllo delle variabili inutilizzate e compilazioni distinte browser/server. Configurare moduli/target rispetto ai browser supportati e al runtime scelto. [Riferimento TypeScript](https://www.typescriptlang.org/tsconfig/).

Usare `unknown` per input non fidati e validarli; vietare `any` non motivato, cast doppi e non-null assertion per nascondere errori. Tipi inferiti dagli schemi dove possibile; tipi DB generati sono distinti dai DTO pubblici e dal modello di dominio.

Campi opzionali: assente = nessuna modifica in una patch, `null` = valore esplicitamente mancante/cancellato se consentito, zero = valore numerico reale. Non usare `value || fallback` quando zero è valido. Rifiutare NaN/Infinity e date invalide. Errori di dominio come esiti tipizzati; eccezioni per guasti inattesi di infrastruttura.

Esempio di contratto di dominio, non implementazione completa:

```ts
// Stringa decimale canonica, validata al confine secondo il contratto API.
type Revision = string;

type Evaluation<T> =
  | { kind: 'proposal'; proposal: T; evidenceRevision: Revision }
  | { kind: 'keep_current'; reasonCode: string }
  | { kind: 'insufficient_data'; missingFields: readonly string[] }
  | { kind: 'incompatible_constraints'; constraintIds: readonly string[] }
  | { kind: 'needs_review'; reasonCode: string };
```

Lo switch UI deve gestire tutte le varianti. Il motore non restituisce `null` per cinque cause diverse e non produce testi tradotti come unico codice errore.

L'alias `Revision` dell'esempio non valida una stringa da solo: il costruttore/schema runtime deve controllare formato e intervallo. Non convertire contatori PostgreSQL `bigint` in `number`; mantenerli come stringhe canoniche ai confini e usare `BigInt` solo per operazioni interne esatte, riconvertendolo prima di JSON. I tipi generati dall'SDK non sostituiscono questo contratto di trasporto.

Zod valida struttura e limiti all'ingresso; controlli di proprietà, relazioni e stato seguono nel servizio/database. Con Fastify usare un'integrazione unica verificata: base semplice, `safeParse` dei DTO in un confine HTTP dedicato, error mapping e DTO di risposta espliciti; schema JSON/OpenAPI generato ove supportato. Non mantenere a mano una regex client, uno schema server e un OpenAPI discordanti.

## 8. Regole del dominio e dei numeri

Funzioni pure: input immutabile → esito, senza fetch, database, React, ora corrente implicita o casualità nascosta. Passare tempo, configurazione e seed come dipendenze esplicite quando servono. Non mutare array di prescrizioni condivisi con lo storico.

Unità nel nome/tipo o in un oggetto quantità; mai `weight: number` senza significato. Normalizzazione separata dalla formattazione: UI accetta virgola, DTO e dominio usano convenzione canonica. Arrotondamenti solo nei punti dichiarati dal metodo; taglio disponibile di carico ricavato dall'attrezzatura, non da un generico `+2`.

Una regola calcola una proposta e non scrive il programma. Non usare feature flag o job pianificati per applicare automaticamente una modifica mai accettata. Cambio di regola produce nuova versione e rivalutazione; le esecuzioni storiche conservano le revisioni originali.

## 9. React, form e stato

Componenti presentazionali ricevono dati e callback; hook applicativi coordinano repository e casi d'uso. Nessuna query Supabase dentro `SetRow` o chiamata AI durante il render. `useEffect` serve a sincronizzazioni con sistemi esterni, con cleanup, non a concatenare ricalcoli che possono essere derivati direttamente.

Stato UI effimero nel componente; dati persistenti nel repository locale; stato rete nella sync. Non duplicare gli stessi risultati in Context, Redux, cache query e IndexedDB come fonti indipendenti. Aggiungere uno state manager solo dopo un problema concreto, con ownership dei dati documentata.

Form con label, descrizione, messaggio associato, preservazione input e focus sul primo errore dopo invio. Distinguere valore testuale in digitazione da numero salvato. Non fare richieste a ogni tasto quando basta validazione locale. Prevenire doppio invio lato UI, ma affidare l'idempotenza al server.

Usare HTML semantico, CSS Modules e token; niente `dangerouslySetInnerHTML` per note/chat senza pipeline controllata. ARIA solo quando necessaria. Liste con chiavi stabili, non indice se le righe possono essere riordinate. Caricare grafici/editor/import separatamente dal diario; worker per calcoli pesanti dimostrati da misura.

## 10. Server, SQL e sessioni

Handler HTTP breve: autenticazione → schema → autorizzazione → caso d'uso → DTO. Non mescolare parsing file, SQL, chiamata AI e risposta in una funzione. Timeout e annullamento espliciti per provider; niente job affidabili in background non persistente.

Contesto utente per richiesta; nessun client Supabase autenticato condiviso globalmente. Chiavi privilegiate solo nei moduli operativi che ne hanno bisogno. Non usare `service_role` per semplificare le normali API utente. I contratti pubblici non accettano ruoli o owner autorevoli dal corpo.

Query parametrizzate, FK/CHECK/UNIQUE e policy nei file di migrazione. Commentare invarianti delle funzioni SQL, ordine dei lock e motivo di ogni definer. Nessuna modifica manuale in dashboard che resti fuori dalle migrazioni. Verificare il diff dello schema prima della promozione.

## 11. Commenti, documentazione e dipendenze

Commentare il **perché**: unità insolita, limite del metodo, ordinamento dei lock, prevenzione di perdita dati, workaround con link e condizione di rimozione. Documentare contratti esportati e invarianti. Un commento che non corrisponde più al codice è un bug di documentazione. TODO con motivo, ticket e condizione di chiusura; niente “fix later” indefiniti.

Ogni nuova dipendenza deve avere necessità, alternativa built-in valutata, manutenzione/licenza, effetto sul bundle o runtime, policy aggiornamenti e test pertinenti. Non installare contemporaneamente librerie equivalenti “per sicurezza”. Minificare gli asset; niente offuscamento come protezione dei segreti. Source map private per diagnosi, senza distribuirle automaticamente al pubblico.

README eseguibile, ambiente di esempio senza segreti, script della [procedura operativa](operazioni/RILASCIO_E_MANUTENZIONE.md), ADR per scelte rilevanti. Documentazione vicino al codice per i dettagli, qui i contratti di progetto.

## 12. Procedura per ogni ticket

1. Leggere requisito, capitoli delle raccolte e specifica pertinente; dichiarare assunzioni e rischio.
2. Scegliere la modifica minima che completa il comportamento; definire esempi osservabili e casi limite.
3. Implementare confini e invarianti prima del dettaglio visuale; niente placeholder spacciati per funzioni concluse.
4. Eseguire i controlli pertinenti: non tutti i test del mondo per ogni refuso, ma DB/RLS per permessi e guasti/concorrenza per sync.
5. Revisionare diff, segreti, accessibilità e documentazione; registrare evidenze e limiti.
6. Consegnare una dimostrazione riproducibile e aggiornare requisito/ticket. Il solo commit non chiude la fase.

Gli strumenti AI di sviluppo possono assistere, ma non sostituiscono verifica di API, licenze e logica. Non inviare segreti o dati personali al modello; non accettare codice generato soltanto perché compila.

## 13. Checklist di revisione

- Il caso d'uso è completo anche con dati mancanti, doppio invio e rete assente quando previsto?
- Esiste una sola fonte di verità per ciascun dato e i tipi/unità sono chiari?
- Server e database respingono un client ostile senza fidarsi della UI?
- Le modifiche proposte restano separate dalle decisioni e dallo storico?
- Il codice ha responsabilità leggibili, commenti utili e nessuna astrazione speculativa?
- I test verificano risultati osservabili e invarianti, con attesi indipendenti?
- Sono aggiornati migrazioni, contratti, compatibilità offline e documenti coinvolti?
- Esiste una prova di ritorno alla versione precedente o un piano di correzione sicuro?
