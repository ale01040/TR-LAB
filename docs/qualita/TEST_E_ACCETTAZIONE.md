# Strategia di verifica e accettazione

Versione 1.1 · Test da implementare, non risultati già ottenuti. Una schermata completa o una percentuale di coverage non dimostrano da sole il requisito.

## 1. Livelli e strumenti

| Livello | Strumento raccomandato | Responsabilità |
| --- | --- | --- |
| Dominio | Vitest, fixture e proprietà | Calcoli, vincoli, determinismo, arrotondamenti |
| Contratti | Zod + fixture JSON + confronto OpenAPI | Campi ammessi, errori e compatibilità |
| Componenti | Testing Library e axe | Comportamento visibile, input e semantica |
| Database | PostgreSQL/Supabase locale, SQL/pgTAP o test integrazione | RLS, grant, vincoli, transazioni e concorrenza |
| HTTP | Fastify injection + integrazione reale Auth su ambiente test | Sessioni, cookie, CSRF, errori |
| E2E | Playwright Chromium/Firefox/WebKit | Percorsi completi e rete controllata |
| Dispositivi | iPhone/Safari, Android/Chrome, desktop reali | Sospensione, tastiera, installazione, storage |
| Carico | k6 o equivalente, scelto dal team | Latenze, pool DB, code e limiti |
| Operazioni | Esercitazioni staging | Restore, rollback, cancellazione e segreti |

Mock dei provider per i casi deterministici e di errore; prove reali separate per integrazioni. Mai considerare un mock RLS prova dell'isolamento. Test UI su ruoli/testi/etichette e comportamento, non su nomi interni delle funzioni. [Playwright](https://playwright.dev/docs/best-practices).

## 2. Dataset di riferimento

Account A/B senza relazioni, anonimo e curatore. Scheda Excel normalizzata senza dati personali; scheda quattro giorni/otto settimane; corpo libero assistito; esercizio privato; serie per lato; ciclo di scarico; due dispositivi dello stesso utente; campioni incompleti e unità diverse. Fixture con attesi calcolati indipendentemente dal codice produttivo.

Il dataset AI comprende richieste italiane normali, vincoli impossibili, esercizi inesistenti, prompt malevoli nelle fonti, dati di altri utenti richiesti e conferme ambigue. Nessun dato personale reale necessario per far girare la CI.

## 3. Matrice dei casi bloccanti

| ID | Preparazione e azione | Risultato richiesto | Fase |
| --- | --- | --- | --- |
| QA-AUTH-01 | Registrazione, email, Google, recovery e linking | Identità corretta, nessuna fusione non verificata | F3 |
| QA-AUTH-02 | Due richieste rinnovano la stessa sessione | Un rinnovo coordinato, nessuno scambio token/account | F2/F3 |
| QA-AUTH-03 | Logout/revoca seguita da API sensibile | Sessione applicativa respinta, limiti JWT verificati | F3 |
| QA-AUTH-04 | Logout corrente e logout da tutti i dispositivi | Scope Supabase esplicito; revocate solo le sessioni applicative previste | F3 |
| QA-SEC-01 | B usa ID padre/figlio/file di A, anche su Data API/RPC | Nessuna lettura/scrittura tra account | F3–F8 |
| QA-SEC-02 | UPDATE diretto di piano/diario/decisione | Rifiutato; solo comando autorizzato mantiene invarianti | F3/F6 |
| QA-SEC-03 | CSRF, XSS in note/chat e injection import | Nessuna azione non autorizzata o codice eseguito | F3/F8/F9 |
| QA-SEC-04 | Cache calda, account A poi B, callback e Set-Cookie | Nessuna risposta personale servita all'altro account | F2/F3 |
| QA-OFF-01 | Download, modalità aereo, seduta completa, chiusura e riapertura | Tutti i dati confermati presenti localmente | F1/F5 |
| QA-OFF-02 | Fallisce commit IndexedDB o quota esaurita | Non mostra “salvato”; recupero/esportazione ove possibile | F5 |
| QA-OFF-03 | Nuova release durante seduta e migrazione locale | Nessun reload distruttivo o outbox persa | F5/F10 |
| QA-OFF-04 | Logout/cambio account con outbox e senza rete | Scelta esplicita, isolamento, stato revoca dichiarato | F3/F5 |
| QA-OFF-05 | Logout offline, riapertura, due tab, ritorno rete e nuovo login | Marcatore persistente, nessun rientro automatico; logout concluso prima del nuovo accesso, nessuna revoca tardiva della nuova sessione | F3/F5 |
| QA-SYNC-01 | Server applica, risposta si perde, client ritenta 100 operazioni | Una sola applicazione per operation ID | F5 |
| QA-SYNC-02 | Riutilizzo operation ID con payload diverso | Errore esplicito e dati invariati | F5 |
| QA-SYNC-03 | Due device modificano stessa revisione | Conflitto, nessuna sovrascrittura silenziosa | F5 |
| QA-SYNC-04 | Due transazioni concorrenti, prima rallentata | Cursore non salta eventi confermati in seguito | F5 |
| QA-SYNC-05 | Bootstrap/pull paginato durante scritture | Snapshot completo e recupero dopo watermark senza buchi | F5 |
| QA-SYNC-06 | Cursore scaduto e outbox vecchia | Nuova base, outbox preservata, ricevute rispettate | F5 |
| QA-SYNC-07 | Delete remoto + modifica offline; due tab; dipendenze fallite | Nessuna resurrezione automatica; niente lock eterno | F5 |
| QA-SYNC-08 | Restore storico perde eventi/ricevute; client con dati confermati e pendenti | Nuovo epoch; vecchi comandi respinti senza mutazioni; base locale preservata e recupero esplicito senza duplicati | F5/F10 |
| QA-SYNC-09 | Revisioni/sequenze oltre `Number.MAX_SAFE_INTEGER`, fino al limite `bigint` | Stringhe esatte da SQL a SDK/JSON/Dexie; nessun arrotondamento, valori fuori intervallo respinti | F2/F5 |
| QA-SYNC-10 | SaveSet aggiorna serie e sessione; comando seguente usa il suo risultato | Selezionata revisione del record richiesto; riferimenti errati respinti, concorrenza rilevata | F5 |
| QA-SYNC-11 | Risposta push contiene cursore successivo a eventi remoti non ancora letti | Pull acquisisce tutti gli eventi intermedi; ricevuta non avanza il cursore del pull | F5 |
| QA-APP-01 | Accetta due volte stessa proposta | Una decisione e una versione | F6 |
| QA-APP-02 | Cambiano dati, regola o versione tra review e accetta | Proposta obsoleta; serve nuova conferma | F6 |
| QA-APP-03 | Accettazione offline valida / obsoleta | Applica solo equivalente; preserva comunque allenamento reale | F6 |
| QA-APP-04 | AI prova applicazione diretta / conferma ambigua | Nessuno strumento autorizzato a farlo | F9 |
| QA-APP-05 | AcceptProposal applicato, risposta persa, retry dopo scadenza challenge | Ricevuta originale e nessuna seconda applicazione; challenge scaduta respinta se comando mai applicato | F6 |
| QA-IMP-01 | XLSX noto, formato standard, malformed/ZIP enorme | Mappatura/report corretti e limiti applicati | F4/F8 |
| QA-EDT-01 | Serie importate diverse, valori null/zero, lavoro/extra/lati e limite ciclo | Modifica solo il target scelto, nessun ultimo lavoro eliminato o limite aggirato | F4 |
| QA-EDT-02 | Copia e riordino giornate/esercizi/serie | ID della copia nuovi, selezione stabile e originali invariati | F4 |
| QA-EDT-03 | Anteprima settimana base, accumulo e scarico | Stessi target della seduta, approvato/storico invariati | F4/F5 |
| QA-SHR-01 | Link revocato e copia già acquisita | Niente nuove importazioni; copia autonoma conservata | F8 |
| QA-DATA-01 | Correzione misura, peso condiviso, macro incoerenti | Storico coerente, nessun dato mancante trattato come zero | F7 |
| QA-AI-01 | Fonte ostile, ID inventato, timeout, altro account | Nessuna fuga/applicazione; fallback utilizzabile | F9 |
| QA-UX-01 | Task senza assistenza su mobile e tastiera | Flussi principali completabili e stato dati comprensibile | F1/F10 |
| QA-OPS-01 | Restore database e oggetti, poi registro cancellazioni | Dati coerenti e utenti cancellati non riattivati | F10/F11 |

Integrare i casi ALG-01–ALG-35 e WEB-01–WEB-14; non ricopiare l'algoritmo nel test come oracolo. Ogni difetto critico corretto ottiene un caso di regressione riproducibile.

## 4. Budget di qualità proposti

| Area | Obiettivo iniziale | Metodo e limiti |
| --- | --- | --- |
| Salvataggio locale | p95 ≤200 ms | Commit locale e feedback, dispositivo campione dichiarato |
| API comuni | p95 ≤500 ms esclusa rete utente e job lunghi | Dataset/carico fissati, percentili e query riportati |
| Web Vitals | LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 | p75 dove esistono dati sul campo; laboratorio e utenti reali distinti |
| Usabilità | ≥90% task completati senza assistenza | Campione/attività espliciti, non promessa statistica universale |
| Accessibilità | WCAG 2.2 AA | Automazione + tastiera + screen reader + audit manuale |
| Affidabilità sync | Zero perdite/duplicati nei casi bloccanti | Fault injection con rete, processo e concorrenza |
| Servizio online | Disponibilità 99,9%, RTO 4 h, RPO 1 h proposti | Da dimostrare con infrastruttura acquistata; esclusi dati mai sincronizzati |

Le soglie Core Web Vitals provengono da [web.dev](https://web.dev/articles/vitals); gli altri budget sono scelte di progetto da ratificare dopo F1–F2. Lighthouse è una misura di laboratorio e non fornisce da solo INP reale o conformità WCAG.

Carico iniziale: 1.000 account sintetici, 100 sessioni concorrenti, almeno 12 mesi di storico per i profili interrogati. Documentare frequenza operazioni, distribuzione, picchi, rate limit e margine; i numeri non sono una previsione dei clienti.

## 5. Controlli di UI, stampa e contenuti

Validare HTML renderizzato e CSS, semantica dei form, gerarchia titoli, contrasto, focus, reflow/zoom e ordine tastiera. Stampare scheda e riepiloghi con pagine lunghe e note, temi chiaro/scuro e caratteri italiani. Non inviare dati reali ai validatori pubblici. I warning di strumenti vanno classificati e motivati, non ignorati perché il punteggio totale è alto.

Su iPhone/Android provare sospensione, riapertura dal sistema, assenza rete, cambio orientamento e tastiera numerica. WebKit automatizzato non equivale a un iPhone reale. Registrare versione OS/browser, modalità installata o tab e condizioni di storage.

## 6. Condizioni di merge e rilascio

Ogni modifica: controllo tipi, lint, test interessati e build; migrazioni aggiungono DB/RLS; sync aggiunge guasti/concorrenza; UI aggiunge verifica accessibilità del flusso; AI aggiunge eval pertinenti. Non scrivere test che controllano soltanto la presenza di una stringa nel sorgente o ripetono letteralmente l'implementazione.

Rilascio pubblico vietato con difetti di perdita dati, accesso tra utenti, applicazione senza consenso, impossibilità del diario offline promesso o restore non dimostrato. Problemi minori ammessi solo con gravità, workaround, responsabile e data di correzione. Non abbassare una soglia dopo un fallimento senza motivazione registrata.

## 7. Rapporto riproducibile

Ogni rapporto indica commit, migrazioni, versioni browser/tool, dataset, comandi, risultato, log con dati sensibili oscurati e difetti. Conservare artefatti in `docs/reports/<fase>/` o nel sistema CI con riferimenti stabili. Un'altra persona deve poter ripetere i casi principali.

La validazione di questa documentazione controlla coerenza, link e tracciabilità. È distinta dal collaudo dell'app, che deve ancora essere sviluppata.
