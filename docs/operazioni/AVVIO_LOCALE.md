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

Nel progetto aprire **Connect**, scegliere una connection string PostgreSQL e copiarla senza indovinare host o regione. Per questo server persistente, **Session pooler, porta 5432**, è la scelta iniziale quando il PC usa IPv4. La connessione diretta richiede normalmente IPv6. Il pooler transaction, porta 6543, è destinato soprattutto a connessioni brevi e comporta limiti sullo stato di sessione. [Connessioni Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

La password è quella del **database**, non la password del proprio login Supabase. Se non la si conosce, seguire la funzione di reset della Dashboard verificando prima quali altri servizi la utilizzano. Sostituire il segnaposto della connection string con la password codificata per URL; caratteri come `@`, `#`, `%`, `?`, `/` non possono essere incollati senza codifica. Un password manager o l'editor devono conservare il valore finale fuori dai documenti del progetto.

Usare `sslmode=verify-full`. Quando è necessaria la CA del progetto, scaricarla dalla sezione **Database settings → SSL Configuration**, conservarla in `.local/supabase-ca.crt` e aggiungere `sslrootcert=.local%2Fsupabase-ca.crt` alla connection string. Il driver installato legge il certificato da quel percorso rispetto alla radice di avvio. Verificare che sia un certificato pubblico PEM, non una chiave privata. SSL cifrato senza verifica dell'identità non offre la stessa protezione. [SSL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres#ssl).

Esempio **fittizio**, da completare con host e utente copiati dalla propria Dashboard:

```dotenv
DATABASE_URL="postgresql://UTENTE_COPIATO:PASSWORD_CODIFICATA@HOST_COPIATO:5432/postgres?sslmode=verify-full&sslrootcert=.local%2Fsupabase-ca.crt"
```

Se l'URL contiene già `?`, aggiungere le opzioni successive con `&`, senza duplicare `sslmode`. Non disattivare la verifica TLS per aggirare errori: controllare CA, percorso, host, data del PC e rete. `.local/` è esclusa da Git.

Per il collaudo iniziale il proprietario può usare la connessione amministrativa fornita dalla Dashboard. **Prima del rilascio** configurare un ruolo BFF con i soli permessi necessari sulle sessioni e sui flussi PKCE, separato dal ruolo delle migrazioni. Le RPC di dominio continuano a usare il JWT dell'utente, non questa connessione amministrativa. Non considerare chiuso il gate pubblico con il server collegato come amministratore.

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
```

I segnaposto non sono valori utilizzabili. Non scrivere `export`, parentesi o virgolette tipografiche. La chiave base64 può terminare con `=`: conservarla interamente. I quattro valori devono essere tutti presenti oppure tutti assenti; una configurazione parziale blocca l'avvio.

Per la modalità dispositivo senza provider, non creare ancora `.env`, oppure lasciare **tutti e quattro** i campi vuoti nel file effettivo. L'URL già compilato nell'esempio serve per il collegamento cloud, non rende valido da solo un `.env` parziale.

Verificare senza stampare i valori:

```powershell
npm run config:check
git check-ignore .env .local/supabase-ca.crt
```

Il primo comando deve riportare `valid: true` e `supabaseConfigured: true`. Il secondo deve indicare che quei percorsi sono ignorati. `config:check` verifica forma e completezza; **non** dimostra che chiave o password siano corrette.

## 7. Verificare il database prima della migrazione

```powershell
npm run db:preflight
```

Questo comando esegue soltanto SELECT: controlla connessione, presenza di tabella/RPC/sessioni e flag RLS. Non stampa password, email o connection string. Su un progetto nuovo le verifiche di presenza saranno `false`: è atteso. Un collegamento riuscito non prova il comportamento di Auth/PostgREST né tutti i grant.

La migrazione locale è `supabase/migrations/202610110001_core.sql`. Prima di applicarla al cloud:

1. Verificare che il progetto sia quello corretto; inventariare tabelle, ruoli, funzioni e migrazioni già presenti. Cercare collisioni `tr_lab_*`, ruolo `tr_lab_command` e schema `tr_lab_private`.
2. Su un database già utilizzato preparare un backup verificabile; non usare `db reset`, DROP o comandi che cancellano dati.
3. Provare il SQL su un ambiente di collaudo. La suite PGlite locale verifica SQL e RLS, ma non sostituisce Supabase reale.
4. Applicare la migrazione una sola volta con il percorso migrazioni concordato o SQL Editor della Dashboard. Non rilanciare l'intero file dopo un errore senza controllare lo stato; non contiene una strategia di upgrade idempotente per installazioni già parziali.
5. Registrare commit, checksum, ambiente, esito, ruolo usato e piano di rollback. Rieseguire `db:preflight` e i casi di isolamento di due utenti reali di test.

Il codice non applica migrazioni automaticamente al primo avvio. L'URL ricevuto non autorizza a presumere che lo schema sia già pronto. Il registro di questa consegna segnala esplicitamente che non è ancora stata eseguita alcuna migrazione cloud.

## 8. Configurare Auth: email, callback e Google

Per l'ambiente Vite impostare la **Site URL** a `http://localhost:5173`. Autorizzare il callback applicativo `http://localhost:5173/api/auth/callback?state=*`. Per provare la build aggiungere separatamente `http://localhost:3001/api/auth/callback?state=*`. Limitare i pattern all'origine e al percorso corretti; non autorizzare domini arbitrari.

Abilitare email/password, conferma email e policy minima di 12 caratteri coerente con l'app. Verificare SMTP e limiti effettivi prima di invitare gli amici: l'alpha non configura un mittente, non promette consegna email e non aggira i limiti del provider. Conferma email e recupero PKCE vanno aperti nello **stesso browser** da cui sono stati richiesti. [Flusso PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

Per Google: creare/configurare un client OAuth web nel proprio Google Cloud, copiare dalla Dashboard il callback **del provider Supabase** e autorizzarlo in Google. Inserire client ID e client secret nella configurazione del provider Google di Supabase; il secret non va nel frontend né nel `.env` di questa app. Abilitare il provider e provare un utente consentito dalla schermata di consenso Google. [Guida ufficiale Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google).

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
