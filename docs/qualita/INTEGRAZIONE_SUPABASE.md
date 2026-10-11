# TR LAB — integrazione Supabase e Vercel verificata

11 ottobre 2026 · Alpha 0.1.0. Evidenze effettive del collegamento; non chiude il collaudo completo Auth, offline multi-device o il rilascio pubblico.

## 1. Ambiente e risultato

Progetto Supabase esistente `mxaogzjquvhwurngktyz`, regione eu-west-1, PostgreSQL 17.11. Inventario iniziale senza utenti Auth, tabelle o migrazioni dell'app; originali Excel e vault non caricati. Schema e ruolo applicativo installati tramite il connettore autorizzato, senza reset del database o della password amministrativa.

Preview collegata: [TR LAB su Vercel](https://tr-9lstvuhyr-pere01040.vercel.app). Deployment `dpl_5aAmQLu4M6jrN4tDFuYUJr7aEVva`, READY/preview verificati anche con inspect; protezione Vercel mantenuta. API Node24, funzione configurata in dub1 vicino al database. Il luogo della build mostrato nei log, iad1, non indica la regione della funzione.

La preview usa il progetto Supabase indicato dal committente, ancora senza dati personali: non è un database staging separato. Prima della produzione predisporre la separazione descritta nel manuale operativo. Origine locale, Netlify e domini Vercel hanno IndexedDB distinti; nessun trasferimento automatico dei diari già esistenti.

## 2. Permessi e identità

| Ruolo | Consentito | Negato / protezione |
| --- | --- | --- |
| `tr_lab_runtime` | Login DB; SELECT/INSERT/UPDATE/DELETE su sessioni e flussi PKCE nello schema privato | Niente dominio, ledger, RPC, DDL, superuser, creazione ruoli o BYPASSRLS |
| `tr_lab_command` | Owner NOLOGIN delle tre RPC e operazioni di dominio con policy owner | Niente login o BYPASSRLS; nessun CREATE public dopo installazione |
| `authenticated` | Lettura dei propri record e invocazione RPC | Scritture tabellari generiche negate; owner dal contesto verificato dal provider |
| `anon` | Nessuna RPC o tabella dell'app | EXECUTE e permessi tabellari revocati |

Il postgres gestito non è superuser. Il migratore riceve temporaneamente SET/INHERIT sul ruolo command per trasferire owner e applicare gli ACL; entrambe le opzioni vengono revocate al termine. Le prove PGlite ora eseguono le migrazioni come ruolo non-superuser e simulano anche l'impossibilità di concedere grant nello schema Auth gestito.

Il nuovo helper privato `tr_lab_private.user_id()` legge gli stessi claim usati dalla `auth.uid()` del progetto. Non decodifica o verifica JWT: lo fa PostgREST prima di impostare il contesto della richiesta. Il client non decide owner/ruolo inviando il JSON del comando. Helper non esposto ad anon/authenticated/runtime; accessibile soltanto al ruolo command. Evita di ampliare i privilegi del nuovo owner nello schema gestito Auth.

## 3. TLS, credenziale e pool

Sul PC la connessione diretta IPv6 funziona; `.env` e preparatorio locale contengono la stessa password runtime e un percorso CA assoluto, senza pubblicarli. Su Vercel: shared transaction pooler verificato, porta 6543, utente composto da ruolo e riferimento progetto, CA pubblica in `DATABASE_CA_CERT_BASE64`. La connection string resta privata e richiede `sslmode=verify-full`; il driver usa CA e `rejectUnauthorized: true`, senza percorsi Windows. [Connessioni Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [SSL node-postgres](https://node-postgres.com/features/ssl).

La CA è il certificato pubblico ufficiale copiato in `certificates/supabase-prod-ca-2021.crt`, valido fino al 26 aprile 2031; fingerprint SHA-256 `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. Rivedere con la fonte ufficiale prima della scadenza/rotazione; non sostituirlo con una chiave privata.

**Incompatibilità rilevata:** verifier SCRAM a 65536 iterazioni valido sulla connessione diretta; il pooler gestito annunciava 4096 con lo stesso salt. Allineato il verifier al parametro nativo del database, confermato con SHOW scram_iterations, mantenendo la password casuale da 48 byte/64 caratteri. Connessione transaction successivamente riuscita. Il minore costo per tentativo sul verifier è un tradeoff esplicito; l'entropia della password di servizio resta 384 bit. Non riguarda le password degli utenti, gestite da Supabase Auth. Nessun MD5, credenziale amministrativa, password in SQL o disabilitazione TLS. Verifier sensibili solo nel provisioning privato; non pubblicarli in Git.

Pool applicativo riutilizzato tra richieste della stessa istanza, max2 su Vercel/max10 sul server persistente; idle5 s/30 s, connessione5 s, query25 s. `@vercel/functions` 3.9.11 registra il pool per consentire il rilascio prima della sospensione. Sul serverless non sono inviati parametri SQL di startup; query senza prepared statement nominati. Vercel sconsiglia max1 su Fluid concorrente, Supabase propone max1 come base conservativa: max2 è una scelta iniziale da misurare, non un risultato di test di carico. [Guida Vercel](https://vercel.com/kb/guide/connection-pooling-with-functions).

`/api/health` dichiara liveness/configurazione; `/api/ready` esegue una lettura senza righe su sessions e restituisce 503 se il database/grant manca. Nessuna credenziale o informazione personale nella risposta. Il controllo non prova SMTP/OAuth né la disponibilità di ogni RPC.

## 4. Migrazioni: corrispondenza da conservare

Il connettore assegna timestamp remoti diversi dai nomi locali; esistono inoltre due migrazioni di provisioning privato. **Non eseguire db push/reset/repair alla cieca su questo progetto.** Prima di adottare CLI/CI per gli upgrade: confrontare definizioni/hash e inventario, esportare la cronologia in privato, riconciliare il baseline con una procedura revisionata senza rieseguire CREATE già applicati. Il runtime non applica SQL automaticamente.

| File / operazione | Versione remota | Nome remoto |
| --- | --- | --- |
| `202610110001_core.sql` | 20261011205721 | tr_lab_core |
| `20261011205512_runtime_session_role.sql` | 20261011205735 | tr_lab_runtime_session_role |
| `20261011205803_database_access_hardening.sql` | 20261011205933 | tr_lab_database_access_hardening |
| Provisioning verifier privato, fuori Git | 20261011210059 | tr_lab_runtime_credential |
| `20261011210811_verified_request_identity.sql` | 20261011210926 | tr_lab_verified_request_identity |
| Compatibilità verifier privato, fuori Git | 20261011212324 | tr_lab_runtime_scram_compatibility |

Il core locale include correzioni di grant emerse durante il collaudo remoto e poi applicate dalle migrazioni correttive. Non presume identità byte per byte con il primo SQL remoto: confrontare lo stato risultante. Conservare i file del baseline; future migrazioni additive tramite CLI, senza segreti nel sorgente.

## 5. Prove effettive e limiti

| Prova | Risultato |
| --- | --- |
| Config/preflight locale | valid/configured true; schema, sessioni, RPC e RLS presenti; superuser false |
| Ruolo runtime su login DB reale | Lettura di due tabelle private riuscita; accesso a dominio/ledger/RPC negato |
| RPC nel PostgreSQL cloud | Bozza/approvazione/retry/pull/lettura propria superati; account B isolato, scrittura generica/anonimo respinti |
| Pulizia fixture cloud | Transazione ROLLBACK; utenti Auth e record applicativi rimasti zero |
| Suite completa locale finale | 23 unit +19 integration (API6, IndexedDB5, SQL8) superati; typecheck/lint/build e format:check passati |
| Bundle CJS collegato, HTTP locale | Cinque prove su pooler reale: ready, sessione anonima, login errato, sync anonima e CSRF |
| Vercel reale, CLI protetta | Undici prove: health/ready/sessione, sync401, API404, SPA200, asset mancante404, worker200/no-cache, CSRF403, login errato401, Google non configurato503 |
| Pacchetto / segreti | 22 file di upload; confronto con password/connection string/chiave reali senza corrispondenze; .env.local/OIDC escluso dalla whitelist |

Queste prove SQL simulano il contesto authenticated nella transazione: non sono un login GoTrue/PostgREST end-to-end. I tentativi HTTP con credenziali errate verificano il rifiuto del provider, non il successo di registrazione/login o refresh. Nessuna email inviata e nessun account persistente artificiale creato.

Il primo tentativo della suite finale nel sandbox Windows si è fermato su spawn EPERM di Vitest/Vite dopo typecheck/lint; la ripresa con i permessi necessari ai processi ha superato tutti i 42 test. Build riuscita con un warning di deprecazione inlineDynamicImports nel plugin PWA: non è un errore di compilazione, va seguito nell'aggiornamento del plugin. Audit dipendenze: zero vulnerabilità rilevate nel controllo eseguito; non equivale a un audit completo dell'app.

Provider settings reali: email abilitata, registrazione consentita, conferma email richiesta, Google disabilitato. Callback/Site URL/SMTP non modificati in questa consegna; login positivo, conferma, recupero, refresh concorrente, due dispositivi, cancellazione/restore restano aperti. Procedura concreta: [completare Auth](../operazioni/COMPLETARE_AUTH.md).

## 6. Advisor e rischi residui

Advisor sicurezza: tre avvisi per RPC SECURITY DEFINER accessibili agli utenti autenticati sono attesi nel modello di comandi; owner limitato, RLS e verifica identità/consenso collaudati. Non renderle SECURITY INVOKER o concedere DML generico per eliminare l'avviso. Rivalutare a ogni modifica SQL. [Indicazioni advisor authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

La funzione preesistente `public.rls_auto_enable()` è un event trigger del provider, owner postgres: l'advisor segnala EXECUTE anon/authenticated, ma il ritorno event_trigger non è una RPC ordinaria. Non è stata modificata. Conservare il rilievo e valutarlo con il provider prima della produzione; non dichiarare zero avvisi. [Indicazioni advisor anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

Advisor prestazioni: solo INFO indice sessioni user inutilizzato, atteso senza sessioni persistenti. Conservato perché supporta FK/revoche per account. Non prova le prestazioni con utenti reali. [Indice inutilizzato](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Refresh alpha mantiene ancora un lock DB durante la richiesta Auth: differenza già documentata rispetto alla lease prevista nella specifica, da risolvere/provare prima del pubblico. Rate limiter Fastify per istanza, cleanup/rotazione globale e backup/restore non completati. API offline/diario già disponibili non rendono automaticamente pronta la registrazione pubblica gratuita.

## 7. Tracciabilità della consegna

RF-01/06/07/18, ADR-05/06/07, WEB-11/12/14 e QA-AUTH/SEC/SYNC. Applicati Appunti 00/01/08 e Linee guida 00/01/08/11, con DEC-18/19/23 invariati. Nessuna modifica agli originali. File, fallimenti, riprese e autorizzazione esplicita ai segreti Vercel registrati nel [diario](../DIARIO_SVILUPPO.md).
