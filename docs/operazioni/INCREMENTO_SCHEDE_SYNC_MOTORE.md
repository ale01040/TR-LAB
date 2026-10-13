# Collaudo e rilascio dell'incremento schede, sync e motore

13 ottobre 2026 · SYNC-01/06, SCH-06, MOT-02/03/07. [Rapporto](../qualita/INCREMENTO_SCHEDE_SYNC_MOTORE.md), [piano dei guasti](../piani/COLLAUDO_SINCRONIZZAZIONE.md), [regole](../fonti/REGISTRO_REGOLE.md). Questa procedura non autorizza reset o test distruttivi sul database degli utenti.

## 1. Stato e sequenza di rilascio

Il codice e le quattro migrazioni aggiuntive sono raccolti nel [ramo GitHub codex/schede-sync-motore-20261013](https://github.com/ale01040/TR-LAB/tree/codex/schede-sync-motore-20261013). Le nuove migrazioni non sono applicate al cloud. L'alpha pubblicata e i suoi rapporti precedenti restano una consegna separata. Un push su main può attivare Vercel: non usarlo come prima prova di queste migrazioni.

`vercel.json` disabilita i deploy Git soltanto per questo ramo, attraverso `git.deploymentEnabled`, secondo la [documentazione ufficiale](https://vercel.com/docs/project-configuration/git-configuration). Le Actions GitHub restano attive. La regola non protegge un merge in main o un deploy CLI manuale: prima di entrambi completare la sequenza sotto. Quando lo staging è isolato e aggiornato, rimuovere la sola regola del ramo per provarne la Preview; non cambiare le credenziali Production per una prova. Il caricamento su GitHub non equivale a un rilascio dell'app.

Ordine: controlli locali → PostgreSQL isolato con connessioni reali → Supabase di staging distinto da Production → due account/dispositivi → revisione del consenso e dei metodi → Preview collegata allo staging → aggiornamento e rollback provati → rilascio sul dominio stabile. Separare ambiente, account di test e dati sintetici; non applicare il ripristino o la sostituzione di epoch al progetto reale per ottenere una prova.

I test PGlite applicano tutte le migrazioni e validano RLS/RPC, ma simulano l'identità SQL. Non provano GoTrue, PostgREST, pooler/TLS o due transazioni TCP parallele. I test browser attuali usano la modalità dispositivo, senza credenziali cloud.

## 2. Riproduzione locale

Toolchain bloccata in package.json/lockfile: Node24.21 e npm11.19. Dalla radice:

```powershell
npm ci
npm run check
npm run format:check
npm audit --audit-level=low
npm run test:e2e
```

`check` comprende TypeScript, lint, unit, integrazione, build PWA/server e sei controlli HTTP del bundle Vercel isolato. `test:e2e` richiede la build e Chrome locale già installato; in CI Ubuntu il workflow installa Chromium. Il server di prova occupa 127.0.0.1:3007, non riusa altri server e non legge `.env` né contatta Supabase. Non spegnere la sessione di lavoro dell'utente sulla porta 3001.

Screenshot/tracce/report browser sono ignorati da Git, contengono solo fixture sintetiche e non costituiscono prove su telefoni. `test:sync-faults` seleziona le prove di lease/recupero/guasti; l'intera suite di integrazione aggiunge catalogo, calendario, import e consenso.

## 3. PostgreSQL con connessioni reali

Script `scripts/database-real-smoke.ts`, comando `npm run test:db-real`. Usa soltanto `TR_LAB_TEST_DATABASE_URL`, non legge DATABASE_URL o file ambiente dell'app. Rifiuta host diversi da localhost/127.0.0.1/::1, nomi diversi da `tr_lab_test_*`, cluster con ruoli provider già presenti, schema auth o relazioni pubbliche. È un test di migrazioni/MVCC, non di Supabase Auth.

Preparare un **cluster locale dedicato e vuoto**, con utenza amministrativa di test. Esempio riproducibile con Docker già installato, credenziale esclusivamente sintetica:

```powershell
docker run --name tr-lab-pg-test --rm -d -p 127.0.0.1:55432:5432 -e POSTGRES_DB=tr_lab_test_local -e POSTGRES_PASSWORD=local-test-only postgres:17
docker exec tr-lab-pg-test pg_isready -U postgres -d tr_lab_test_local
$env:TR_LAB_TEST_DATABASE_URL='postgresql://postgres:local-test-only@127.0.0.1:55432/tr_lab_test_local'
npm run test:db-real
Remove-Item Env:TR_LAB_TEST_DATABASE_URL
docker stop tr-lab-pg-test
```

Attendere `accepting connections` prima del test. Non utilizzare il nome di un container esistente con dati da conservare. `--rm` elimina soltanto questo container effimero allo stop; nessun volume dell'app è montato. Il runner crea ruoli/schema fake-provider, applica migrazioni come migrator limitato e prova invio duplicato da due connessioni, conflitto di revisione e isolamento owner. Per ripetere, creare un nuovo cluster vuoto: non aggiungere un reset al runner per superare la guardia.

Il primo tentativo di questa consegna ha restituito `LOCAL_DB_NOT_CONFIGURED`, senza test passato. Successivamente è stato preparato un cluster portabile PostgreSQL 17.11: il runner ha applicato tutte le migrazioni e superato i tre controlli TCP. Dopo il collaudo server fermato, porta 55432 chiusa e toolchain/dati/ZIP temporanei rimossi. Anche dopo queste prove servono ancora gli scenari del piano su Supabase/Auth e dispositivi reali.

Per un'alternativa Windows senza Docker, il [sito PostgreSQL](https://www.postgresql.org/download/windows/) rimanda agli [archivi EDB](https://www.enterprisedb.com/download-postgresql-binaries?lang=en). Usare versione/provenienza verificate, una directory nuova dedicata e solo loopback; non registrare un servizio per una prova effimera. `initdb` prepara il cluster, `pg_ctl start -D ... -l ... -o "-h127.0.0.1 -p55432"` lo avvia, `createdb` crea tr_lab_test_*, `pg_ctl stop -D ... -m fast` lo chiude. Passare percorsi assoluti quotati e controllare status/uscita secondo la [documentazione pg_ctl](https://www.postgresql.org/docs/17/app-pg-ctl.html). In PowerShell avviare helper nascosti; `Start-Process -Wait` aspetta anche i discendenti, quindi usare attesa sul solo processo pg_ctl ([Microsoft](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-process?view=powershell-7.5)). Nessuna ricetta portabile deve eliminare una directory già esistente o riusare un cluster dell'app.

## 4. Migrazioni nuove e compatibilità

Applicare tutte in ordine sullo staging riconciliato con la baseline già consegnata:

| File | Effetto | Controllo minimo |
| --- | --- | --- |
| 20261012233715_session_refresh_lease.sql | Versione token e lease breve delle sessioni BFF | Grant runtime, refresh simultaneo, crash, revoca durante refresh |
| 20261013092510_personal_catalog_calendar.sql | Comandi v2, catalogo/attrezzi/cicli/occorrenze e proiezioni normalizzate | RLS/FK owner, plan atomico, avvio/chiusura, compatibilità reader |
| 20261013094530_proposal_consent.sql | Registro bundle, proposta/decisione/challenge e funzioni private BFF | Nessun metodo seed attivo, bypass negati, SHA-3 server, versioni e dipendenze |
| 20261013104158_imports_and_executed_workout_recovery.sql | Import atomico/report/storico recuperato, validatori interi | Dedup, rollback completo, provenance, nessuna falsa approvazione |

Sono estensioni additive rispetto alle quattro migrazioni precedenti. I comandi/ricevute v1 già inviati non vengono rinumerati o riscritti. Alcune funzioni di comando sono ricreate dalle definizioni della baseline: esaminare diff e ordine, non assumere che una baseline remota diversa sia equivalente. Inventariare versioni installate prima di usare i comandi CLI della [procedura Supabase](AVVIO_LOCALE.md).

Capacità attuale: `tr_lab_capabilities` comunica protocollo 2, non flag per ogni modulo. Di conseguenza installare l'intero insieme prima di collegare questo frontend. In assenza della capacità, il frontend mantiene i sette comandi legacy e blocca le nuove scritture collegate. Non annunciare protocollo 2 con metà migrazioni applicate.

| Versione | Codice locale | Compatibilità |
| --- | --- | --- |
| File programma JSON | 1 | Decoder esistente conservato, nessuna metrica nuova forzata |
| Protocollo sync | 1 + 2 | I sette comandi v1 restano; v2 aggiunge entità/consenso |
| IndexedDB tr-lab-v1 | 2 | Upgrade additivo; stesso nome database, vecchia outbox conservata |
| Export recupero | 3 | Lettura legacy v1/v2; token di review oscurati, intenzioni conservate |
| Bundle dominio | Versione stringa per metodo | Nessun bundle attivo; contenuto immutabile sotto la stessa versione |

Il vecchio reader non riceve nuovi kind come se fossero legacy: ottiene `UPGRADE_REQUIRED`. Una nuova PWA non può sincronizzare questi kind con il vecchio servizio. Prima del rollout provare vecchia coda → upgrade e frontend rollback dopo una scrittura v2; non cancellare IndexedDB per nascondere una incompatibilità.

## 5. Casi di staging da chiudere

Due account A/B, telefono/PC e almeno due tab. Verificare isolamento fuori dalla sola UI tramite richieste/RPC con l'owner corretto. Allenamento offline con RIR0, valore mancante, carico decimale/lato, chiusura parziale e ritorno online. Simulare risposta persa dopo commit, 401/403/429/503, rete instabile e commit fuori ordine; conservare operation ID/digest e confrontare tutti i record finali.

Provare logout/cambio account durante pull e invio, rinnovo simultaneo con lease, revoca che precede il CAS, riapertura della PWA, aggiornamento con coda e campi in corso. Su database isolato provare restore/epoch e recupero conservativo; prima esportare il backup. Provare quota/eviction con fixture controllate senza eliminare dati reali.

Per consenso: sessione/owner/revisione/digest/challenge esatti, scadenza, doppio invio, due proposte sulla stessa base, metodo ritirato e ricezione perduta. Controllare transazione decisione+nuova versione+eventi+ricevuta. Il programma approvato originale e le sedute già avviate mantengono i target. Offline acceptance resta disabilitata in questa versione.

## 6. Rollback e recupero

Prima del rollout conservare build precedente, manifest migrazioni/grant, backup staging ripristinabile e report. La conferma dei metodi è un gate separato dal deploy del codice.

Con scritture v2 già avvenute, un semplice rollback al frontend legacy può essere bloccato correttamente. Preparare un frontend compatibile che disabiliti i percorsi nuovi, conservi outbox/base e renda disponibile recupero/export. Preferire correzione avanti delle migrazioni additive; non eliminare le nuove tabelle o righe per far tornare leggibile il vecchio client.

Un restore reale richiede gestione dell'epoch e riconciliazione secondo specifica: non basta ripristinare un backup. Il recupero di esecuzioni già presenti sul server viene respinto per confronto, non sovrascritto. Il rifiuto di un'approvazione scaduta conserva l'intenzione redatta, non una credenziale riutilizzabile.

## 7. Gate di pubblicazione

Gate S/C/A/D/R del piano restano aperti finché le prove richieste non hanno evidenze. Nessuna connessione reale, installazione mobile, login/email/Google o revisione scientifica può essere dichiarata completata da `check` o dai report Markdown. Registrare ambiente, revisione Git, fixture, esito e problemi rimasti nel rapporto e nel diario.
