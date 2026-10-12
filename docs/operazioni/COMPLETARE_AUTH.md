# TR LAB — completare accesso email e Google

12 ottobre 2026 · Backend Preview e alpha Production collegati; Site URL/callback salvati nella Dashboard. Questa procedura descrive i controlli e le configurazioni residue; non richiede di condividere password o token in chat. [Rilascio verificato](../qualita/RILASCIO_DOMINIO_STABILE.md).

## 1. URL attualmente configurati

Aprire il progetto `mxaogzjquvhwurngktyz` in Supabase, **Authentication → URL Configuration**. Verificare prima le impostazioni esistenti; conservare callback di altri ambienti necessari, senza sostituirli indiscriminatamente.

- Site URL principale: `https://tr-lab.vercel.app`.
- Redirect URL Production: `https://tr-lab.vercel.app/api/auth/callback\?state=*`.
- Redirect URL Preview: `https://tr-9lstvuhyr-pere01040.vercel.app/api/auth/callback\?state=*`.
- Per sviluppo Vite: `http://localhost:5173/api/auth/callback\?state=*`.

Nel pattern il backslash prima del punto interrogativo lo rende letterale per il matcher glob. L'asterisco copre il valore casuale state; dominio e percorso restano specifici. Non usare wildcard su tutti i domini Vercel. Ogni nuova origine necessita della propria autorizzazione; per produzione scegliere un dominio stabile e allineare APP_ORIGIN. [Pattern e Site URL ufficiali](https://supabase.com/docs/guides/auth/redirect-urls).

In Production APP_ORIGIN è esplicitamente `https://tr-lab.vercel.app`; nella Preview deriva dal VERCEL_URL affidabile della piattaforma, non dall'Host inviato dal client. Usare l'origine prevista: un alias diverso può essere rifiutato dal controllo Origin. La Preview conserva la protezione Vercel del workspace; il dominio corto risponde anche senza credenziali piattaforma, come verificato con GET anonime. Il login personale TR LAB resta separato.

## 2. Email/password e invio email

Email/password e conferma email sono già abilitate nel provider. Mantenere la verifica dell'indirizzo. Per invitare persone esterne al team Supabase configurare un SMTP proprio: il mittente di test del provider limita destinatari e invii e non è un servizio di consegna per la registrazione pubblica. Nessuna credenziale SMTP è stata fornita o configurata. [SMTP e limiti Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

In **Authentication → Email / SMTP Settings** inserire host, porta, account/password del proprio servizio, mittente verificato e nome TR LAB. Conservare il segreto nel provider/gestore di segreti, non nell'app web. Verificare dominio mittente e requisiti SPF/DKIM/DMARC del servizio scelto; non acquistare un servizio o cambiare DNS senza il relativo incarico.

Controllare i template di conferma e recupero: per il flusso attuale usare il link di verifica del provider (`ConfirmationURL`) e preservare redirectTo/state/PKCE. Non copiare template che puntano a una rotta `/auth/confirm` non presente in questa app. Il browser apre il provider e ritorna a `/api/auth/callback` con code/state. Non aggiungere token Auth al frontend o ai log.

### 2.1 Scelta SMTP confermata e alternativa futura

Il committente non ha un dominio e ha scelto **Gmail dedicato per la prima fase** (DEC-31). Seguire [configurazione Gmail e Google](CONFIGURAZIONE_GMAIL_GOOGLE.md): host smtp.gmail.com, porta 465 con TLS implicito, utente/mittente coincidenti e password per app dopo verifica in due passaggi. Nessuna credenziale è stata fornita; configurazione e consegna email restano da collaudare. La richiesta di SPF/DKIM/DMARC del §2 riguarda il futuro dominio proprio, non il dominio Gmail gestito da Google.

**Resend via SMTP** resta un'alternativa per la futura apertura pubblica con dominio verificato; il mittente sandbox non risolve l'invio agli amici. Non acquistare o attivare servizi implicitamente. [Prerequisiti e SMTP Resend](https://resend.com/docs/send-with-smtp).

| Opzione | Perché usarla | Compromesso |
| --- | --- | --- |
| Resend SMTP | Configurazione host/utente/chiave diretta, invii visibili nella dashboard | Dominio e quote da gestire; non espone log SMTP completi per il debug |
| AWS SES SMTP | Alternativa se si gestiscono già servizi AWS e invio per regione | Endpoint e credenziali SMTP specifici della regione, identità verificata e quote; più configurazione operativa per questo progetto |
| SMTP di test Supabase | Primo collaudo con indirizzo di un membro del team | Destinatari limitati e consegna senza SLA; non adatto all'accesso degli amici |

La valutazione di semplicità è un'inferenza dalle procedure ufficiali; non è un benchmark. Fonti: [Resend SMTP](https://resend.com/docs/send-with-smtp), [SES SMTP](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Verificare quote/prezzi prima dell'attivazione; non fissare quantità nel codice.

Configurazione dell'alternativa futura Resend, da usare soltanto dopo la scelta e la verifica del dominio:

| Campo | Valore |
| --- | --- |
| Host | smtp.resend.com |
| Porta | 465, TLS implicito supportato dal servizio |
| Utente | resend |
| Password | Chiave privata Resend inserita direttamente nel provider, mai in questo documento |
| Sender email | Indirizzo del dominio verificato del committente, da definire |
| Sender name | TR LAB |

Completare DNS/verifica con i valori forniti dal servizio, senza inventarli o sostituire record esistenti alla cieca. Salvare SMTP nel progetto Supabase corretto; verificare i limiti Auth e del servizio. Eseguire conferma e recupero con indirizzi di prova controllati, verificando email ricevuta, link e ritorno con sessione. Ripetere poi con un destinatario di prova esterno al team. Il cambio SMTP non modifica il codice o i segreti già autorizzati su Vercel.

## 3. Collaudo con account reale sul dominio stabile

1. Aprire [Profilo TR LAB](https://tr-lab.vercel.app/profilo). Il committente ha già riferito un login riuscito nella Preview; ripetere la prova nel dominio stabile. Non trasferire manualmente cookie o token fra domini.
2. Registrare un indirizzo di prova controllato dal proprietario, passphrase di almeno 12 caratteri entro 72 byte UTF-8 e conferma dell'ambito adulti. Non comunicare la passphrase all'agente.
3. Aprire il link email **nello stesso browser** della registrazione; verifier PKCE e cookie del tentativo devono essere presenti. Verificare ritorno al Profilo e identità riconosciuta.
4. Verificare nei DevTools la cookie `__Host-tr-lab`: HttpOnly, Secure, SameSite Lax, Path=/, nessun Domain. Le risposte API non devono contenere access/refresh token.
5. Creare una bozza sintetica, approvarla esplicitamente, avviare una seduta e registrare una serie. Verificare coda inviata e ricevuta; accedere allo stesso account in un secondo browser e controllare i dati sincronizzati. Con un secondo account distinto verificare invece che i dati del primo non siano accessibili.
6. Verificare logout, login email/password, recupero nello stesso browser, cambio password e blocco degli altri account. Non inviare password/cookie/URL email all'agente o nelle issue.

Registrare soltanto esiti/codici HTTP e ambiente; niente email personali, export del diario o token nelle prove. Non eliminare utenti/dati di prova permanenti senza una procedura concordata. Le fixture SQL di questa consegna erano invece sempre transazionali con rollback.

## 4. Attivare Google quando pronto

Serve un client OAuth web nella propria Google Cloud e il consenso configurato. Per i soli scope openid, userinfo.email e userinfo.profile, Google documenta un'eccezione in Testing: nessuna lista tester obbligatoria o scadenza del consenso a sette giorni. Aggiungere altri permessi cambia i requisiti. [Audience ufficiale](https://support.google.com/cloud/answer/15549945?hl=en).

Client ID/secret non sono stati forniti. Copiare da Supabase il redirect del **provider**, normalmente `https://mxaogzjquvhwurngktyz.supabase.co/auth/v1/callback`, e verificarlo nella Dashboard prima di inserirlo tra i redirect URI Google. Procedura completa, valori esatti e prove in [configurazione Gmail e Google](CONFIGURAZIONE_GMAIL_GOOGLE.md).

Inserire ID/secret esclusivamente nel provider Google di Supabase, abilitarlo e poi configurare `GOOGLE_AUTH_ENABLED=true` nel BFF dell'ambiente scelto e ripubblicare. Il codice attuale restituisce GOOGLE_NOT_CONFIGURED prima di scrivere un tentativo PKCE quando il flag è false; la UI mostra una spiegazione. Non attivare il flag per aggirare la configurazione del provider. [Guida Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google).

Collaudare ritorno, state/PKCE, rifiuto dei tentativi scaduti e identità account. Questo lavoro non sostituisce il collaudo di refresh concorrente, lease, cancellazione, backup e limiti globali richiesto prima della produzione. Rapporto aggiornato: [integrazione verificata](../qualita/INTEGRAZIONE_SUPABASE.md).
