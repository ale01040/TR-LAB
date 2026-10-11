# Rilascio, gestione e manutenzione

Versione 1.1 · Procedure da rendere eseguibili in F2–F11. Account e servizi appartengono al committente o alla sua organizzazione.

## 1. Ambienti

| Ambiente | Dati | Accessi e utilizzo |
| --- | --- | --- |
| Locale | Seed sintetico, Supabase locale | Sviluppatore, reset consentito solo su ambiente identificato |
| CI/preview | Database isolato e fixture | Nessuna chiave produzione; preview protetta se espone strumenti interni |
| Staging | Dati sintetici rappresentativi | QA, prove Auth/OAuth/email con configurazione distinta |
| Produzione | Dati reali | Privilegi minimi, audit, backup e processi approvati |

Separare progetti Supabase, bucket, redirect OAuth, domini cookie, chiavi AI/email e log. Non collegare una preview al database reale per comodità. Le copie per diagnosi devono essere minimizzate/anonimizzate secondo procedura.

## 2. Comandi che il repository dovrà offrire

Questa è una convenzione da implementare in F2, non una lista di comandi già funzionanti:

| Comando | Risultato |
| --- | --- |
| `npm ci` | Dipendenze esatte dal lockfile |
| `npm run dev` | Web e server locali con configurazione documentata |
| `npm run typecheck` | Tutti i pacchetti, senza emissione |
| `npm run lint` / `npm run format:check` | Errori statici e stile |
| `npm run test:unit` / `test:integration` / `test:e2e` | Livelli separati, esito non ambiguo |
| `npm run db:verify` | Ricostruzione e aggiornamento schema in ambiente isolato + RLS |
| `npm run contracts:check` | Coerenza DTO, OpenAPI e fixture |
| `npm run build` | Asset versionati e artefatti server |
| `npm run check` | Sequenza dei controlli richiesti prima del merge |

Gli script che possono resettare database controllano ambiente e project reference e rifiutano produzione. Documentare prerequisiti, runtime, porte, file ambiente di esempio e recupero dopo errore. Non salvare segreti negli esempi.

## 3. Pipeline CI e promozione

1. Checkout del commit, installazione e verifica delle versioni esatte Node/npm, quindi `npm ci` con lockfile invariato.
2. Tipi, lint, formato, segreti e dipendenze; classificare vulnerabilità pertinenti con responsabile.
3. Test unitari/contratti; DB vuoto da migrazioni e aggiornamento dalla release precedente.
4. Test policy e transazioni; build; E2E critici su staging temporaneo o dedicato isolato.
5. Pubblicazione degli stessi artefatti verificati, identificati da commit e checksum.
6. Migrazioni compatibili → backend → frontend → worker compatibile; ordine diverso solo se ADR e prova lo richiedono.
7. Smoke test account sintetico, login, sync, proposta, export; monitoraggio del periodo iniziale.

Branch principale protetto, cambi piccoli e revisionabili; release con note, migrazioni e piano di rollback. La CI non deve applicare migrazioni produzione dai branch di prova. Il via libera al rilascio richiede le evidenze del responsabile definito, non soltanto un workflow verde.

## 4. Rollback e client offline

Rollback applicativo all'artefatto precedente se lo schema resta compatibile. Preferire migrazioni additive e correzioni forward; il rollback distruttivo del DB è una procedura straordinaria, non il comando normale di deploy. Conservare asset necessari ai client ancora supportati durante il rollout.

Client offline possono tornare dopo una release: protocollo versionato, risposte di aggiornamento guidato e outbox preservata. Non usare una modifica del service worker per forzare cancellazione di IndexedDB. Disabilitare con feature flag una nuova regola o l'AI in caso di incidente, mantenendo diario e dati.

## 5. Backup e ripristino

Inventario distinto: PostgreSQL, oggetti Storage, configurazione Auth/OAuth, segreti/chiavi di cifratura, pacchetti regole e materiale del corpus. Supabase documenta che i backup DB non includono gli oggetti di Storage: predisporre una procedura separata e verificare riferimenti e checksum durante il restore. [Backup Supabase](https://supabase.com/docs/guides/platform/backups).

Gli obiettivi proposti RPO 1 h/RTO 4 h richiedono piano e configurazione adeguati, da acquistare e provare. Un backup giornaliero da solo non dimostra RPO 1 h; valutare PITR e protezione oggetti coerente. Nessuna garanzia remota copre dati rimasti soltanto offline sul telefono.

Esercitazione: creare dati/oggetti sintetici e client con copia locale → backup → modifiche e cancellazioni note, anche già sincronizzate → restore in ambiente isolato con traffico/worker sospesi → reimpostare credenziali necessarie e invalidare sessioni web ripristinate → riapplicare registro cancellazioni → assegnare un nuovo UUID `sync_epoch` → riconciliare i job → controllare RLS, file, eventi sync e integrità → riaprire in prova e riconnettere i client → misurare tempo e perdita. Il registro delle cancellazioni deve essere recuperabile indipendentemente dal punto temporale del backup restaurato.

Prima di riaprire produzione verificare che nessun processo usi ancora il vecchio epoch. Un rollback del solo codice non cambia epoch; un ritorno storico dei dati sì. I client con epoch precedente devono ricevere `SYNC_EPOCH_CHANGED` senza mutazioni e seguire [il recupero specificato nelle API](../specifiche/API_E_SINCRONIZZAZIONE.md). Provare sia operazioni pendenti sia dati precedentemente confermati: le ricevute possono essere state perse dal restore e non giustificano un replay automatico. Una sessione web recuperata dal backup non viene riaperta come se fosse corrente.

Conservare backup separati dall'account di deploy quando appropriato, accessi limitati e documentazione del recupero delle chiavi. Nessun backup è considerato utile finché non viene ripristinato con successo.

## 6. Job e affidabilità operativa

Job con ID, owner, tipo, idempotency key, stato, lease, tentativi, prossimo tentativo e risultato. Worker acquisisce lease, esegue lavoro limitato, salva risultato atomico e rinnova lease per attività lunghe. Dopo crash un altro worker può riprendere; chiamate esterne e scritture devono tollerare esecuzione almeno una volta.

Retry con backoff, limite e stato finale visibile; coda separata logicamente per AI/import/export. Un job AI annullato non deve pubblicare dopo l'annullamento una proposta senza segnalarlo. Un errore email non annulla un allenamento già salvato. Eliminazione account sospende/cancella job associati e impedisce di ricrearne i dati.

## 7. Monitoraggio e supporto

Metriche: errori HTTP per codice, latenza e saturazione, fallimenti login/email, rinnovi sessione, ritardo sync, conflitti, età outbox segnalata senza contenuto, job in stallo, costi AI per richiesta riuscita, errori di storage e restore. Log correlati con request/operation/job ID; contenuti personali esclusi.

Allarmi azionabili con responsabile e procedura: picco di 401 dopo deploy, sync in errore, crescente coda job, backup fallito, DB saturo o traffico anomalo. Un solo errore temporaneo non deve generare una tempesta di notifiche. Il prodotto mostra indisponibilità remote mantenendo registrazione locale quando possibile.

Supporto con riproduzione, versione app e diagnostica volontaria priva di contenuti personali. Nessuna richiesta di password o esportazione completa del diario per un problema di layout. Bug report separato da accesso ai dati personali.

## 8. Costi e capacità

Gratuito per gli utenti non significa infrastruttura gratuita. Inventariare compute/database, Auth/email, Storage/egress, backup/PITR, hosting/worker, AI, monitoraggio e supporto. Per ciascuno registrare quota, costo unitario attuale, utilizzo, allarme e responsabile; verificare prezzi ufficiali prima di acquisti, non fissarli in questo piano.

Usare dati misurati per stimare: utenti attivi × sessioni × serie × revisioni, dimensione media eventi/ricevute, retention e picchi di import/AI. Quote tecniche ragionevoli e comunicate; nessun paywall introdotto implicitamente. Aumentare capacità dopo profiling e misure, non perché il budget è illimitato.

## 9. Manutenzione assegnata

| Cadenza proposta | Attività |
| --- | --- |
| A ogni release | Smoke test, compatibilità offline, note e verifica metriche |
| Settimanale | Errori/abusi, job falliti, dipendenze urgenti, consegna email |
| Mensile | Aggiornamenti dipendenze con test, quote/costi, accessi privilegiati e contenuti segnalati |
| Trimestrale e dopo modifiche rilevanti | Restore completo, incident drill, audit permessi, revisione browser supportati |
| A ogni cambio regola/modello/corpus | Eval, revisione dominio, rollout controllato e possibilità di disattivazione |

Le cadenze vanno assegnate a persone e strumenti prima dell'apertura; questo documento non crea promemoria o automazioni reali.

## 10. Consegna e uscita dal fornitore

Consegnare proprietà repository/servizi, inventario segreti e procedure di recupero senza scriverli nei documenti pubblici, migrazioni e dump di prova, backup oggetti, contratti export, licenze, report, manuale e formazione. Un secondo sviluppatore deve avviare ambiente, eseguire test e ripristinare un backup.

La portabilità PostgreSQL riduce parte della dipendenza, ma Auth, Storage, API e semantica delle sessioni richiedono migrazione dedicata. Mantenere adapter circoscritti e formati dati esportabili; non costruire un'astrazione universale per ogni provider ipotetico.
