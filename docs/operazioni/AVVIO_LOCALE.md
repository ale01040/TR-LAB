# TR LAB — avvio locale e collegamento Supabase

Versione 0.1.0 · 11 ottobre 2026. Procedura eseguibile per il codice presente nel repository. Non pubblica l'app e non crea un progetto remoto.

## 1. Che cosa serve

- Node.js 24.21.0 della linea 24 e npm 11.19.0 della linea 11; i limiti sono in `package.json`.
- Accesso al progetto Supabase già indicato: `mxaogzjquvhwurngktyz`.
- Editor di testo. Su Windows usare PowerShell nella radice del progetto.
- Docker soltanto per una istanza Supabase completamente locale; non serve per usare il progetto cloud indicato.

Il repository è [ale01040/TR-LAB](https://github.com/ale01040/TR-LAB). Dopo il clone, le due raccolte web sono incluse. L'Excel originale resta sul PC del committente: non si pubblicano le sue misure o il suo diario. La struttura adattata e depurata è già inclusa nei JSON dell'app.

## 2. Avvio immediato senza account cloud

Senza un file `.env`, dalla radice:

```powershell
npm ci
npm run dev
```

Aprire **http://localhost:5173**. Vite serve l'interfaccia e inoltra `/api` al server locale, porta 3001. Schede, diario, peso, circonferenze e target manuali sono utilizzabili sul dispositivo; il login dichiara che il provider non è configurato. Non vengono simulati account o sincronizzazioni riuscite.

Per provare la build con service worker:

```powershell
npm run build
npm run preview
```

Senza `.env`, aprire **http://localhost:3001**. La prima visita deve riuscire online; le visite successive possono usare la cache. Lo sviluppo Vite non costituisce una prova del service worker della build.

Usare sempre la stessa origine. `localhost`, `127.0.0.1`, porte diverse e HTTPS hanno archivi browser e cookie distinti. Cambiare indirizzo non trasferisce i dati. Esportare il backup prima di cancellare i dati del browser.

## 3. Recuperare URL e chiave pubblicabile

1. Aprire [Supabase Dashboard](https://supabase.com/dashboard), entrare nel progetto corretto e verificarne il riferimento `mxaogzjquvhwurngktyz`.
2. Aprire **Connect** o **Settings → API Keys**, secondo la versione della Dashboard.
3. Copiare la chiave **Publishable**, che comincia con `sb_publishable_`.
4. L'URL è già predisposto: `https://mxaogzjquvhwurngktyz.supabase.co`.

TR LAB usa la chiave pubblicabile nel BFF, insieme al JWT dell'utente. La chiave identifica l'app; i permessi dell'utente dipendono da Auth, RLS e RPC. Le chiavi `sb_secret_` e `service_role` aggirano RLS e non vanno inserite in questo campo. La configurazione le rifiuta. [Documentazione ufficiale API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Non serve un prefisso `VITE_`: le credenziali Supabase non vengono esportate nel bundle web. Non copiare chiavi segrete nella chat, nei Markdown, nei commit o nei log.

## 4. Recuperare DATABASE_URL e configurare SSL

Nel progetto aprire **Connect**, scegliere una connection string PostgreSQL e copiarla senza indovinare host o regione. Su questo PC è già verificata la connessione diretta IPv6, porta 5432; su Vercel è verificato il shared transaction pooler, porta 6543. Il session pooler 5432 resta un'alternativa per server persistenti su IPv4, ma non è stato dichiarato funzionante con questa credenziale: vedere [esiti e incompatibilità](../qualita/INTEGRAZIONE_SUPABASE.md#3-tls-credenziale-e-pool). Il transaction pooler limita lo stato di sessione e usa la configurazione serverless dell'app. [Connessioni Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

Il BFF usa la password del ruolo limitato **tr_lab_runtime**, già predisposto su questo progetto; non usa la password del proprietario Supabase o del ruolo postgres. Non resettare la password amministrativa per riconfigurare l'app. Su una nuova installazione, predisporre la credenziale runtime con una procedura privata approvata dopo le migrazioni. Sostituire il segnaposto con la password codificata per URL; caratteri come `@`, `#`, `%`, `?`, `/` richiedono codifica. Conservare il valore finale nel file ambiente locale e nel gestore di segreti, fuori dai documenti pubblici.

Usare `sslmode=verify-full`. Verificare la CA nella sezione **Database settings → SSL Configuration**: il certificato pubblico usato qui è anche in `certificates/supabase-prod-ca-2021.crt`, con fingerprint e scadenza nel rapporto di integrazione. Per la connessione locale, usare `sslrootcert` con **percorso assoluto codificato per URL**; gli script npm dei workspace possono cambiare directory di lavoro. Per Vercel, usare invece `DATABASE_CA_CERT_BASE64`, senza percorsi del PC e senza `sslrootcert/sslcert/sslkey` nella stessa URL. Verificare sempre che il PEM sia un certificato pubblico. [SSL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres#ssl).

Esempio **fittizio**, da completare con host e utente copiati dalla propria Dashboard:

```dotenv
DATABASE_URL="postgresql://tr_lab_runtime:PASSWORD_CODIFICATA@HOST_DIRETTO_COPIATO:5432/postgres?sslmode=verify-full&sslrootcert=PERCORSO_ASSOLUTO_CODIFICATO"
```

Se l'URL contiene già `?`, aggiungere le opzioni successive con `&`, senza duplicare `sslmode`. Non disattivare la verifica TLS per aggirare errori: controllare CA, percorso, host, data del PC e rete. `.local/` è esclusa da Git.

Il ruolo BFF deve avere soltanto i permessi sulle sessioni e sui flussi PKCE, separati da quelli del migratore. Le RPC di dominio continuano a usare il JWT dell'utente via Supabase, non la connessione PostgreSQL del BFF. I permessi effettivi del ruolo già installato sono stati provati sia sul database cloud sia da Vercel.

## 5. Generare e conservare la chiave delle sessioni

Eseguire sul proprio PC:

```powershell
node scripts/create-secret.mjs
```

Il comando stampa una **nuova** chiave casuale di 32 byte in base64. Copiarla in `SESSION_ENCRYPTION_KEY` del file locale e conservarne una copia nel proprio gestore di segreti. Non inviarla in chat. È diversa dalla password del DB e dalle chiavi Supabase.

Il server la usa per cifrare i token Auth in AES-256-GCM e firmare i cursori. Nel browser resta una cookie di sessione opaca HttpOnly. Se la chiave viene persa o cambiata, sessioni e flussi cifrati precedenti non sono recuperabili con la nuova chiave; pianificare revoca e nuovo login. Non rigenerarla a ogni avvio.

## 6. Creare il file .env completo

Copiare `.env.example` in `.env` con l'editor e compilare tutti e quattro i campi Supabase/sessione prima di avviare. Il file `.env` è ignorato da Git. Non sovrascrivere un `.env` già esistente.

```dotenv
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=http://localhost:5173
NODE_ENV=development
SUPABASE_URL=https://mxaogzjquvhwurngktyz.supabase.co
SUPABASE_PUBLISHABLE_KEY=INCOLLA_LA_CHIAVE_PUBLISHABLE
DATABASE_URL="INCOLLA_LA_CONNECTION_STRING_CON_SSL_VERIFICATO"
SESSION_ENCRYPTION_KEY=INCOLLA_LA_CHIAVE_GENERATA_LOCALMENTE
GOOGLE_AUTH_ENABLED=false
```

I segnaposto non sono valori utilizzabili. Non scrivere `export`, parentesi o virgolette tipografiche. La chiave base64 può terminare con `=`: conservarla interamente. I quattro valori Supabase/sessione devono essere tutti presenti oppure tutti assenti; una configurazione parziale blocca l'avvio. `DATABASE_CA_CERT_BASE64` è un'opzione aggiuntiva per il certificato pubblico; Google resta disabilitato finché il provider non è configurato e collaudato.

Per la modalità dispositivo senza provider, non creare ancora `.env`, oppure lasciare **tutti e quattro** i campi vuoti nel file effettivo. L'URL già compilato nell'esempio serve per il collegamento cloud, non rende valido da solo un `.env` parziale.

Verificare senza stampare i valori:

```powershell
npm run config:check
git check-ignore .env .local/supabase-ca.crt
```

Il primo comando deve riportare `valid: true` e `supabaseConfigured: true`. Il secondo deve indicare che quei percorsi sono ignorati. `config:check` verifica forma e completezza; **non** dimostra che chiave o password siano corrette.

Se si annotano temporaneamente valori in un file di testo, conservarlo in `.local/` e nel gestore di segreti, non sotto `docs/`. La consegna esclude inoltre file `*PASSWORD*.txt`, `*password*.txt` e `*credentials*.txt`; l'esclusione non sostituisce il controllo del commit. Non inserire dati reali nemmeno nelle fixture o nelle issue.

## 7. Verificare il database prima della migrazione

```powershell
npm run db:preflight
```

Questo comando esegue soltanto SELECT: controlla connessione, presenza di tabella/RPC/sessioni e flag RLS. Non stampa password, email o connection string. Su un progetto nuovo le verifiche di presenza saranno `false`: è atteso. Un collegamento riuscito non prova il comportamento di Auth/PostgREST né tutti i grant.

Il repository contiene quattro migrazioni SQL, da applicare in ordine su una **nuova installazione**: core, runtime_session_role, database_access_hardening e verified_request_identity. La suite `db:verify` le esegue tutte come migratore non-superuser. Prima di applicarle a un altro progetto:

1. Verificare che il progetto sia quello corretto; inventariare tabelle, ruoli, funzioni e migrazioni già presenti. Cercare collisioni `tr_lab_*`, ruolo `tr_lab_command` e schema `tr_lab_private`.
2. Su un database già utilizzato preparare un backup verificabile; non usare `db reset`, DROP o comandi che cancellano dati.
3. Provare il SQL su un ambiente di collaudo. La suite PGlite locale verifica SQL e RLS, ma non sostituisce Supabase reale.
4. Applicare ogni migrazione una sola volta con il percorso concordato. Non rilanciare un file dopo un errore senza controllare lo stato; il core non è una strategia di upgrade idempotente per installazioni parziali. La credenziale del ruolo runtime viene configurata separatamente, senza password o verifier nel repository.
5. Registrare commit, checksum, ambiente, esito, ruolo usato e piano di rollback. Rieseguire `db:preflight` e i casi di isolamento di due utenti reali di test.

Il codice non applica migrazioni al primo avvio. **Sul progetto mxaogzjquvhwurngktyz lo schema è già installato e verificato**: non ripetere queste istruzioni come prima installazione. Timestamp remoti del connettore e provisioning privato differiscono dai nomi locali; prima di usare `db push` o una nuova pipeline, riconciliare il baseline secondo la [corrispondenza registrata](../qualita/INTEGRAZIONE_SUPABASE.md#4-migrazioni-corrispondenza-da-conservare). Nessun reset o repair alla cieca.

## 8. Configurare Auth: email, callback e Google

Per l'ambiente Vite è già configurato il callback applicativo `http://localhost:5173/api/auth/callback\?state=*`. Per provare la build aggiungere separatamente `http://localhost:3001/api/auth/callback\?state=*`, non ancora incluso nel salvataggio del 12 ottobre. Il backslash rende `?` letterale nel pattern Supabase. La Site URL principale è ora `https://tr-lab.vercel.app`: non sostituirla quando si aggiungono callback locali. URL esatti e collaudo nella [guida Auth](COMPLETARE_AUTH.md).

Abilitare email/password, conferma email e policy minima di 12 caratteri coerente con l'app. Verificare SMTP e limiti effettivi prima di invitare gli amici: l'alpha non configura un mittente, non promette consegna email e non aggira i limiti del provider. Conferma email e recupero PKCE vanno aperti nello **stesso browser** da cui sono stati richiesti. [Flusso PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

Per Google: creare/configurare un client OAuth web nel proprio Google Cloud, copiare dalla Dashboard il callback **del provider Supabase** e autorizzarlo in Google. Inserire client ID e client secret nella configurazione del provider di Supabase; il secret non va nel frontend né nel `.env` dell'app. Abilitare il provider, impostare `GOOGLE_AUTH_ENABLED=true` nel server e provare un utente consentito dalla schermata Google. [Guida ufficiale Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google).

Il callback Google verso Supabase e quello Supabase verso TR LAB sono due passaggi distinti. Non sostituire uno con l'altro. I flussi email, recupero e Google restano gate aperti finché non vengono collaudati sul progetto reale.

## 9. Avviare con il progetto collegato

Modalità sviluppo, con `.env` completo e origine 5173:

```powershell
npm run config:check
npm run dev
```

Aprire `http://localhost:5173/profilo`. Registrare un account di test, confermare email, accedere e controllare che il server riconosca l'utente senza restituire access/refresh token al browser. La prima sincronizzazione inizializza epoch e cursore; attendere prima di creare intenzioni offline.

Modalità preview della build, in una nuova PowerShell:

```powershell
npm run build
$env:APP_ORIGIN = 'http://localhost:3001'
npm run preview
```

La variabile di processo prevale sul valore di `.env`. Aprire `http://localhost:3001`. Non avviare contemporaneamente due server sulla porta 3001. Dopo lo stop, se si riusa quella PowerShell per `npm run dev`, rimuovere la variabile con `Remove-Item Env:APP_ORIGIN`.

In sviluppo la cookie non è Secure per il loopback HTTP, resta HttpOnly/SameSite Lax. In produzione sono obbligatori HTTPS, cookie `__Host-` Secure e origine corretta. L'hosting e il proxy fidato devono essere progettati e collaudati prima di esporre il server; non cambiare `HOST` in `0.0.0.0` sul PC come scorciatoia di distribuzione.

## 10. Cosa fare in caso di errore

| Esito | Verifica concreta |
| --- | --- |
| Configurazione incompleta | Tutti i quattro campi presenti, chiave publishable, chiave sessioni base64 di 32 byte, origine senza slash finale |
| Preflight non riuscito | Progetto attivo, password DB corretta/codificata, host e utente copiati, rete/porta accessibili, CA presente e valida |
| Tabella/RPC assente | Migrazione non ancora applicata o ambiente sbagliato; non creare tabelle a mano fuori dal SQL versionato |
| Login non configurato | Server riavviato dopo `.env`, valori caricati dalla radice del repository |
| CSRF/sessione cambiata | Origine esatta, callback sullo stesso browser, ricarica profilo; nessun tentativo con cookie di altro account |
| Email non ricevuta | Stato SMTP, indirizzo confermato, spam, limiti provider, callback; niente log di password o token |
| Sync/conflitto | Esportare il recupero locale; non cancellare IndexedDB, non forzare revisioni o cambiare epoch |
| Diari apparentemente vuoti | Verificare origine e account; i dati dispositivo non sono trasferiti automaticamente al login |

Per assistenza comunicare codice dell'errore, comando e ambiente, oscurando valori e dati personali. Non incollare `.env` né l'export del proprio diario in una issue pubblica.

## 11. Verifiche di sviluppo

```powershell
npm run check
npm run format:check
npm audit --audit-level=low
```

Stato delle prove realmente eseguite, limiti e prossimi gate nel [rapporto implementazione](../qualita/STATO_IMPLEMENTAZIONE.md). Il database cloud, i telefoni reali, la beta e l'AI non sono dichiarati collaudati dalla sola esecuzione dei test locali.

## 12. Accesso GitHub per caricare i commit

Il repository remoto è `https://github.com/ale01040/TR-LAB.git`. Configurare il proprio account GitHub tramite Git Credential Manager già installato sul PC:

```powershell
git credential-manager github login --username ale01040 --web
```

Il proprietario completa personalmente login, eventuale secondo fattore e consenso richiesto da GitHub. Non incollare token nella chat, nei documenti o negli argomenti di un comando da condividere. Il nome/email Git di un commit non autenticano l'accesso al repository.

Quando l'accesso è pronto, controllare branch/remote e pubblicare senza force:

```powershell
git status --short
git remote -v
git push --set-upstream origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Gli SHA locale e remoto devono coincidere. Se `main` remoto è avanzato, recuperare e integrare il lavoro altrui prima di ritentare; non usare force per superare divergenze o protezioni del branch. Controllare la CI nel repository dopo il caricamento. Il push del codice non pubblica automaticamente il sito e non applica SQL a Supabase.

## 13. Stato della configurazione su questo PC

L'11 ottobre 2026 URL e chiave publishable del committente sono stati integrati con una credenziale runtime dedicata e una chiave sessioni locale. `.env` è ora attivo; `.local/supabase-connection.env` conserva il preparatorio, entrambi ignorati da Git. Connessione diretta TLS verificata, `config:check` valido/configured true e `db:preflight` riuscito. Non sovrascrivere questi file o rigenerare la chiave a ogni avvio.

Per proseguire:

1. Conservare la configurazione e le copie private nel gestore di segreti; non pubblicarle o condividerle in chat.
2. Dalla radice verificare senza stampare valori:

```powershell
npm run config:check
npm run db:preflight
```

3. Completare callback/account secondo [COMPLETARE_AUTH](COMPLETARE_AUTH.md), quindi collaudare con §9. Il committente ha indicato che sta configurando callback e account; SMTP ancora da scegliere. Questa intenzione non è un esito positivo di login.

La Preview Vercel usa cinque valori autorizzati esplicitamente dal committente, più DEPLOYMENT_MODE=connected. La chiave di cifratura Preview è distinta da quella locale; la password runtime è la stessa sul progetto condiviso. Il preparatorio `.local/vercel-connection.env` e i verifier di provisioning restano privati. Nessuna password amministrativa trasferita. Rapporto delle prove: [INTEGRAZIONE_SUPABASE](../qualita/INTEGRAZIONE_SUPABASE.md).

Il quickstart React/Vite fornito dal committente è valido per un client Supabase diretto. TR LAB ha già `@supabase/supabase-js` 2.117.3 e il client nel BFF Fastify: nessuna installazione o modifica dei lockfile è necessaria. Le variabili effettive sono `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, senza prefisso `VITE_`; non aggiungere una seconda autenticazione o sostituire l'app con l'esempio `todos`. Il client diretto con comportamento Auth predefinito conserva i token nel browser; il requisito di progetto li mantiene invece nel server con cookie opaca HttpOnly. Questa differenza è documentata, non una dichiarazione che il quickstart sia errato. [Quickstart React](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs), [storage dei token](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

Per Netlify il pacchetto statico resta senza server. Il collegamento online richiede una nuova distribuzione con BFF, origine HTTPS, callback e collaudo; i valori di questo file sono preparati per lo sviluppo locale, non una configurazione di produzione pronta.
