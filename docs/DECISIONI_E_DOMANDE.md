# Decisioni confermate e domande residue

Versione 1.2 · 11 ottobre 2026. Registro delle decisioni del committente e dei punti da chiudere. Prima alpha locale sviluppata su autorizzazione successiva alla pianificazione; nessun servizio remoto attivato o modificato. Progetto Supabase e repository esistenti indicati dal committente. Indice in [README](README.md).

## 1. Registro delle decisioni confermate

| ID | Decisione | Conseguenza per lo sviluppo |
| --- | --- | --- |
| DEC-01 | Sito installabile su telefono e PC | PWA responsive, test iPhone/Android/desktop |
| DEC-02 | Ogni persona gestisce le proprie schede | Proprietà dei dati per account; nessun ruolo allenatore richiesto |
| DEC-03 | Condivisione tramite copia | Copie indipendenti, senza sincronizzazione con l'autore |
| DEC-04 | Budget, risorse e tempo senza limiti imposti | Roadmap guidata dalla qualità, con stime da rivedere e responsabilità assegnate |
| DEC-05 | Preparazione e proposte il più possibile automatiche | Generazione, analisi, riepiloghi e proposte attivati dai dati |
| DEC-06 | Decisione finale sempre esplicita | Nessuna applicazione per silenzio o approvazione permanente |
| DEC-07 | Fonti nel vault indicato | Corpus fitness selezionato, regole con provenienza e verifica |
| DEC-08 | Diario completo offline | Persistenza locale e sincronizzazione incluse nel nucleo |
| DEC-09 | Misure, peso, calorie e macro | Moduli presenti nella versione completa; diario alimentare non richiesto |
| DEC-10 | Ipertrofia e forza in palestra, home gym e corpo libero | Catalogo e metodi devono coprire tutti questi contesti |
| DEC-11 | Registrazione pubblica gratuita | Protezione abusi, supporto e capacità operativa prima dell'apertura |
| DEC-12 | Assistente AI conversazionale | Accesso alle fonti e proposte validate, conferma esterna al modello |
| DEC-13 | Email/password e Google | Due percorsi di accesso, gestione collegamento identità |
| DEC-14 | Import dell'Excel fornito e di un formato standard | Importatore delimitato, anteprima e rapporto degli errori |
| DEC-15 | Generazione destinata ad adulti, esclusi percorsi clinici/riabilitativi | Ambito dichiarato nell'onboarding e nelle regole di applicabilità |
| DEC-16 | Seguire sia `Appunti sviluppo web/` sia `Linee guida sviluppo web/` | Lettura dei capitoli pertinenti, applicazione e collaudo secondo `CONVENZIONI_SVILUPPO.md` |
| DEC-17 | Segnalare al committente gli eventuali conflitti | Registro delle incompatibilità, motivazioni e soluzioni; nessuna deroga silenziosa |
| DEC-18 | Usare Supabase, confermando il database già proposto nel piano e nella roadmap | Supabase/PostgreSQL confermato; il richiamo MySQLi nelle raccolte è superato da questa istruzione esplicita |
| DEC-19 | Commenti mirati e completi | Spiegare motivazioni, regole, sicurezza e passaggi non ovvi; sostituisce la richiesta di commentare ogni riga |
| DEC-20 | Documentazione completa, specifica e organizzata per chi sviluppa | Esplicitare codice, strumenti, motivazioni, alternative, pro/contro, futuro e collaudo in tutto il pacchetto |
| DEC-21 | Avviare lo sviluppo e registrare ogni intervento in Markdown | Diario con file, motivazioni, test eseguiti e limiti; non confondere prove documentali e software |
| DEC-22 | Nome dell'app TR LAB | Sostituisce i nomi provvisori precedenti; visual identity alpha modificabile |
| DEC-23 | SHA-256 nel database e SHA-3 nel server | Eccezione crittografica esplicita confermata; password gestite da Supabase Auth, non da questi digest |
| DEC-24 | Risolvere autonomamente scelte tecniche con analisi dei trade-off e fonti | Documentare motivazioni e alternative; non cambiare requisiti di prodotto o consenso senza istruzione |
| DEC-25 | Usare il progetto Supabase esistente mxaogzjquvhwurngktyz; prima preparare istruzioni | Configurazione d'esempio e procedura senza segreti; nessuna migrazione cloud eseguita in questa consegna |
| DEC-26 | Caricare il progetto nel repository ale01040/TR-LAB | Conservare main e cronologia esistente; pubblicare codice/documenti/fixture depurate, ignorare segreti e originale Excel personale |
| DEC-27 | Dopo le verifiche fare il deploy su Vercel | Preview richiesta e autorizzata; senza configurazione Supabase resta modalità dispositivo, nessuna beta account o migrazione automatica |

La generazione usa solo contenuti e metodi pertinenti all'ambito confermato. Il diario è uno strumento di registrazione; non deve classificare condizioni mediche o formulare diagnosi dalle misure.

## 2. Raccomandazioni tecniche e assegnazione delle decisioni

Le [scelte ADR-01–ADR-17](architettura/SCELTE_TECNICHE.md) definiscono una base concreta con motivazioni e alternative. Il team può risolvere scelte interne senza chiedere ogni dettaglio al committente; deve documentare il cambiamento e rispettare tutte le DEC. Supabase e il criterio dei commenti sono già confermati e non tornano tra le domande aperte.

| Tema | Proposta di partenza | Chi decide e quando |
| --- | --- | --- |
| Stack applicativo | React/TypeScript/Vite e IndexedDB/Dexie; Supabase/PostgreSQL è già confermato da DEC-18 | Referente tecnico, F1–F2, per le sole parti non ancora confermate |
| Sessioni | Supabase Auth con livello server e cookie di sessione HttpOnly; dettagli nel piano §6.1 | Referente tecnico, prova F2–F3; mantiene il requisito delle raccolte |
| Hosting e regione | Servizio gestito HTTPS, regione coerente con utenti e gestione dati | Referente tecnico/privacy, F2 |
| Provider AI | Interfaccia sostituibile, scelta dopo valutazioni in italiano | Referente AI/prodotto, F9 |
| Lingua/unità | Italiano, kg/cm; struttura predisposta per unità alternative | Prodotto, F0 |
| Navigazione | Oggi, Programma, Progressi, Libreria, Profilo | Prodotto/design, F1 |
| Look | Interfaccia leggibile in palestra; palette, icona e immagini da concordare. Temi chiaro/scuro e stampa richiesti dalle raccolte | Prodotto/design, F1 |
| Cicli | Settimane esplicite e rinvio assistito delle sedute | Prodotto/dominio, F0 |
| Contenuti di riferimento | Pacchetto selezionato esportabile dal vault, senza accesso continuo al PC | Prodotto/dominio, F0 |
| Limiti tecnici | Quote ragionevoli sulle funzioni pubbliche e AI, senza pagamento per l'utente | Prodotto/operazioni, F3–F11 |
| Gruppo beta | 5–8 persone per le prime prove, poi ampliamento | Prodotto, F1/F10 |
| Carico di prova | 1.000 account sintetici e 100 sessioni concorrenti | Referente tecnico, F10 |
| Obiettivi operativi | Disponibilità 99,9%, RTO 4 h, RPO 1 h per dati sincronizzati | Operazioni, prima del rilascio |

Le dimensioni del gruppo reale e la crescita prevista non sono state specificate. I numeri proposti per prove e infrastruttura sono ipotesi esplicite, da misurare e adattare. La gratuità per chi si registra non elimina i costi sostenuti dal gestore.

## 3. Domande di affinamento per i prossimi incontri

Queste domande non impediscono di avviare le fasi F0–F2. Vanno affrontate nel momento indicato, evitando di chiedere al committente decisioni di dettaglio prima che esista qualcosa di concreto da valutare.

| Domanda | Scelta iniziale proposta | Momento |
| --- | --- | --- |
| Quale identità visiva definitiva deve avere TR LAB? Ci sono app di riferimento? | Nome TR LAB confermato, palette grafite/lime alpha da valutare | Prototipo F1 |
| Quante persone parteciperanno alle prime prove e quali telefoni usano? | Gruppo misto iPhone/Android, livelli di esperienza diversi | Prima delle prove F1 |
| La settimana deve seguire il calendario o avanzare al completamento delle sedute? | Calendario esplicito, rinvio assistito senza perdere la fase del ciclo | Definizione dominio F0 |
| Le proposte vanno mostrate una per volta o raggruppate? | Riepilogo per seduta con accettazione esplicita delle modifiche visibili | Prototipo F1 |
| Quali testi o media del vault possono essere distribuiti pubblicamente? | Sintesi originali e riferimenti, niente distribuzione integrale automatica | Corpus F0/F9 |
| Chi revisiona le regole di allenamento e nutrizione prima dell'attivazione? | Referenti nominati, con registro delle revisioni | F0/F6 |
| Quali dati devono comparire nell'esportazione e in quali formati aggiuntivi? | JSON/CSV personali, PDF scheda; XLSX se utile | F8 |
| Per quanto tempo conservare conversazioni AI, file importati e copie di backup? | Politica distinta per categoria, minima rispetto allo scopo | Revisione dati F3/F8 |
| Vuoi promemoria di allenamento e misurazione? | Facoltativi, attivati dall'utente; nessun requisito per usare l'app | Dopo stabilizzazione F7 |
| Chi gestirà assistenza e segnalazioni dopo l'apertura pubblica? | Responsabile operativo e canale di supporto assegnati | F10–F11 |
| Quale convenzione usare per i manubri e per le macchine del tuo gruppo? | Peso del singolo manubrio, macchina identificata, etichetta sempre visibile | Catalogo F4 |
| Come deve comportarsi l'app quando un allenamento viene saltato? | Chiedere se rinviare, saltare o ripetere, mostrando gli effetti | Prototipo F1 e ciclo F4 |

## 4. Criterio per evitare assunzioni silenziose

Una modifica a una decisione DEC richiede aggiornamento di questo registro, del piano e dei ticket coinvolti. Una scelta implementativa interna può essere risolta dal team e documentata in una decisione architetturale, senza rinviare al committente ogni dettaglio.

Nuovi obiettivi di prodotto — allenatori, minori, riabilitazione, alimenti/pasti, pagamenti, wearable e app native — richiedono un'estensione esplicita del perimetro. Non sono obblighi impliciti derivanti da budget o tempo senza limiti.

## 5. Registro operativo dei punti da chiudere

| ID | Punto | Responsabile / scadenza | Evidenza per chiuderlo |
| --- | --- | --- | --- |
| OPEN-01 | Nome chiuso (TR LAB); palette, icona e immagini da validare | Prodotto/design, F1 | Prototipo approvato con asset/licenze |
| OPEN-02 | Semantica settimana calendario/ciclo e seduta saltata | Prodotto/dominio, F0 | Esempi di rinvio, pausa e ripresa verificati |
| OPEN-03 | Corpus e diritti di distribuzione | Contenuti/dominio, F0–F6 | Manifest, revisioni e ambiti consentiti |
| OPEN-04 | Metodi operativi forza/corpo libero e nutrizione | Referenti dominio, prima di attivare F6/F7 | Parametri, fonti primarie e fixture approvate |
| OPEN-05 | Hosting, regione, SMTP e backup | Tecnico/operazioni, F2–F3 | Prova deploy/restore, condizioni/costi verificati |
| OPEN-06 | Sessioni HttpOnly e rinnovi con Supabase | Tecnico/sicurezza, F2–F3 | QA-AUTH e QA-SEC superati |
| OPEN-07 | Policy password, retention e testi privacy | Sicurezza/privacy/prodotto, F3–F10 | Configurazioni testate e revisione assegnata |
| OPEN-08 | Parser XLSX, libreria grafici e primitive UI | Sviluppo, prima dei moduli | Fixture, manutenzione/licenza e prove accessibilità |
| OPEN-09 | Provider/modello AI e dataset di valutazione | AI/prodotto, F9 | Benchmark italiano, permessi, latenza e costo |
| OPEN-10 | Dispositivi beta e responsabilità supporto | Prodotto/operazioni, F1/F10 | Elenco bersagli, partecipanti e responsabili |

Questi punti non rendono incompleto il piano: identificano decisioni che richiedono prototipi, acquisti, validazione di dominio o misure reali. Non presentarli come problemi già risolti da questa documentazione.

## 6. Registro dei conflitti

| Tema | Stato | Decisione / trattamento |
| --- | --- | --- |
| MySQLi contro Supabase | Risolto | DEC-18 |
| Commenti per riga contro leggibilità | Risolto | DEC-19 |
| HttpOnly contro normale sessione browser Supabase | Soluzione proposta, da collaudare | BFF e sessione opaca; OPEN-06 |
| Password 8–16 e suggerimenti crittografici | Adattamento da configurare e provare | Auth gestito, passphrase, niente hashing personalizzato; OPEN-07 |
| Dati di sessione sul server e diario offline | Ambiti distinti | Segreti server; risultati minimi in storage locale per account |
| Esempi DOM/PHP e stack React/TypeScript | Traduzione tecnica | Conservare requisiti, usare lifecycle/strumenti dello stack |
| SEO e informazioni personali | Applicabilità delimitata | SEO pubblico; protezione/autorizzazione dell'area personale |

Dettagli e fonti in [convenzioni §4](CONVENZIONI_SVILUPPO.md). Nuovi conflitti sono segnalati al committente, distinguendo decisione di prodotto da normale scelta implementativa.

## 7. Modello di decisione futura

Registrare ID, stato, problema, vincoli, alternative, motivazione, conseguenze, fonte tecnica, decisore, data, prova richiesta e condizione di revisione. Un ADR tecnico non può cambiare una DEC senza nuova istruzione. Per decisioni reversibili preferire una prova breve; per dati/permessi/migrazioni descrivere anche rollback e impatto sui client offline.
