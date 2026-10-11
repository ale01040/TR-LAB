# TR LAB — completare accesso email e Google

11 ottobre 2026 · Backend Preview già collegato. Questa procedura chiude le configurazioni ancora necessarie; non richiede di condividere password o token in chat.

## 1. URL da usare in questa preview

Aprire il progetto `mxaogzjquvhwurngktyz` in Supabase, **Authentication → URL Configuration**. Verificare prima le impostazioni esistenti; conservare callback di altri ambienti necessari, senza sostituirli indiscriminatamente.

- Site URL della preview: `https://tr-9lstvuhyr-pere01040.vercel.app`.
- Redirect URL: `https://tr-9lstvuhyr-pere01040.vercel.app/api/auth/callback\?state=*`.
- Per sviluppo Vite: `http://localhost:5173/api/auth/callback\?state=*`.

Nel pattern il backslash prima del punto interrogativo lo rende letterale per il matcher glob. L'asterisco copre lo state UUID; dominio e percorso restano specifici. Non usare wildcard su tutti i domini Vercel. Ogni nuova origine necessita della propria autorizzazione; per produzione scegliere un dominio stabile e allineare APP_ORIGIN. [Pattern e Site URL ufficiali](https://supabase.com/docs/guides/auth/redirect-urls).

Nella preview APP_ORIGIN deriva dal VERCEL_URL affidabile della piattaforma, non dall'Host inviato dal client. Usare esattamente il dominio sopra: un alias diverso può essere rifiutato dal controllo Origin. La protezione Vercel richiede anche accesso al workspace; non equivale al login personale TR LAB e non è stata disabilitata.

## 2. Email/password e invio email

Email/password e conferma email sono già abilitate nel provider. Mantenere la verifica dell'indirizzo. Per invitare persone esterne al team Supabase configurare un SMTP proprio: il mittente di test del provider limita destinatari e invii e non è un servizio di consegna per la registrazione pubblica. Nessuna credenziale SMTP è stata fornita o configurata. [SMTP e limiti Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

In **Authentication → Email / SMTP Settings** inserire host, porta, account/password del proprio servizio, mittente verificato e nome TR LAB. Conservare il segreto nel provider/gestore di segreti, non nell'app web. Verificare dominio mittente e requisiti SPF/DKIM/DMARC del servizio scelto; non acquistare un servizio o cambiare DNS senza il relativo incarico.

Controllare i template di conferma e recupero: per il flusso attuale usare il link di verifica del provider (`ConfirmationURL`) e preservare redirectTo/state/PKCE. Non copiare template che puntano a una rotta `/auth/confirm` non presente in questa app. Il browser apre il provider e ritorna a `/api/auth/callback` con code/state. Non aggiungere token Auth al frontend o ai log.

## 3. Primo collaudo con account reale di prova

1. Aprire [Profilo TR LAB](https://tr-9lstvuhyr-pere01040.vercel.app/profilo) con accesso Vercel del proprietario.
2. Registrare un indirizzo di prova controllato dal proprietario, passphrase di almeno 12 caratteri entro 72 byte UTF-8 e conferma dell'ambito adulti. Non comunicare la passphrase all'agente.
3. Aprire il link email **nello stesso browser** della registrazione; verifier PKCE e cookie del tentativo devono essere presenti. Verificare ritorno al Profilo e identità riconosciuta.
4. Verificare nei DevTools la cookie `__Host-tr-lab`: HttpOnly, Secure, SameSite Lax, Path=/, nessun Domain. Le risposte API non devono contenere access/refresh token.
5. Creare una bozza sintetica, approvarla esplicitamente, avviare una seduta e registrare una serie. Verificare coda inviata e ricevuta; accedere allo stesso account in un secondo browser e controllare i dati sincronizzati. Con un secondo account distinto verificare invece che i dati del primo non siano accessibili.
6. Verificare logout, login email/password, recupero nello stesso browser, cambio password e blocco degli altri account. Non inviare password/cookie/URL email all'agente o nelle issue.

Registrare soltanto esiti/codici HTTP e ambiente; niente email personali, export del diario o token nelle prove. Non eliminare utenti/dati di prova permanenti senza una procedura concordata. Le fixture SQL di questa consegna erano invece sempre transazionali con rollback.

## 4. Attivare Google quando pronto

Serve un client OAuth web nella propria Google Cloud, consenso configurato e account di test autorizzati quando l'app Google è in Testing. Client ID/secret non sono stati forniti. Copiare da Supabase il redirect del **provider**, normalmente `https://mxaogzjquvhwurngktyz.supabase.co/auth/v1/callback`, e verificarlo nella Dashboard prima di inserirlo tra i redirect URI Google.

Inserire ID/secret esclusivamente nel provider Google di Supabase, abilitarlo e poi configurare `GOOGLE_AUTH_ENABLED=true` nel BFF dell'ambiente scelto e ripubblicare. Il codice attuale restituisce GOOGLE_NOT_CONFIGURED prima di scrivere un tentativo PKCE quando il flag è false; la UI mostra una spiegazione. Non attivare il flag per aggirare la configurazione del provider. [Guida Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google).

Collaudare ritorno, state/PKCE, rifiuto dei tentativi scaduti e identità account. Questo lavoro non sostituisce il collaudo di refresh concorrente, lease, cancellazione, backup e limiti globali richiesto prima della produzione. Rapporto aggiornato: [integrazione verificata](../qualita/INTEGRAZIONE_SUPABASE.md).
