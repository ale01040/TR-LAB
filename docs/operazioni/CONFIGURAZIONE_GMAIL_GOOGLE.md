# TR LAB — configurare Gmail SMTP e accesso Google

12 ottobre 2026 · Procedura per il proprietario e per chi sviluppa. Scelta confermata: **Gmail dedicato, senza dominio proprio** (DEC-31). App di riferimento: [TR LAB — Profilo](https://tr-lab.vercel.app/profilo). Il collegamento al database funziona; questa guida prepara l'attivazione dei due servizi e distingue i passaggi completati da quelli ancora necessari.

## 1. Stato e ordine di lavoro

| Parte | Stato verificato in questa consegna | Passo residuo |
| --- | --- | --- |
| Dominio stabile e BFF | Health, ready/database, sessione anonima e Profilo rispondono HTTP200 | Collaudo con account reale |
| Supabase Auth | Email e registrazione attive; conferma email obbligatoria | Consegna conferma/recupero a destinatario controllato |
| SMTP | Il committente riferisce che non è configurato; nessuna password per app disponibile | Creare Gmail dedicato, proteggere account e salvare SMTP in Supabase |
| Google | Provider disabilitato nelle impostazioni pubbliche; nessun client OAuth disponibile | Creare client web, configurare Supabase e poi flag Vercel |
| Dashboard | Google Cloud e Supabase richiedono login nel browser disponibile | Il proprietario accede personalmente |

Ordine: **Gmail e password per app → SMTP Supabase → prova email → client Google → provider Supabase → flag Vercel e redeploy → prova Google**. SMTP e OAuth sono indipendenti: una configurazione non abilita automaticamente l'altra. Nessun account, credenziale o email agli amici è stato creato/inviato dall'agente in questa consegna.

I passaggi personali sono creazione/accesso dell'account Google, verifica in due passaggi, generazione della password per app e del client OAuth, inserimento dei segreti nelle dashboard. Gli accordi dei servizi e i controlli di identità restano al proprietario. Non inviare questi valori in chat.

## 2. Perché questa scelta e quando cambiarla

| Scelta | Vantaggio per TR LAB | Limite / alternativa |
| --- | --- | --- |
| Gmail dedicato via SMTP | Rispetta la scelta del committente; non richiede dominio o modifica DNS; non aggiunge SDK all'app | Mittente Gmail, quote e possibili blocchi antiabuso; soluzione iniziale per il piccolo gruppo, da rivalutare prima della beta pubblica |
| Resend via SMTP, futuro | Gestione dell'invio transazionale e mittente del proprio dominio | Richiede dominio verificato; il mittente di prova non consente gli invii agli amici |
| SMTP predefinito Supabase | Utile per prove iniziali del team | Non consegna agli indirizzi esterni al team; non risolve la richiesta |
| OAuth Google gestito da Supabase | Riusa BFF, PKCE e sessioni HttpOnly esistenti | Configurazione del client/provider e prova delle identità; aggiungere Google Identity Services nel browser introdurrebbe un secondo flusso senza necessità |

La semplicità è una valutazione per questo progetto, non un confronto misurato della consegna. Fonti: [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [SMTP Resend](https://resend.com/docs/send-with-smtp), [Google in Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google).

Gmail deve inviare soltanto messaggi di autenticazione pertinenti. Le notifiche di allenamento e le campagne email sono funzionalità diverse e non vengono attivate da questa procedura. Il sottodominio Vercel non fornisce il controllo DNS di gmail.com o vercel.app.

## 3. Preparare l'account Gmail dedicato

1. Aprire [creazione account Google](https://accounts.google.com/signup) oppure accedere a un account Gmail dedicato già creato. Scegliere un indirizzo disponibile riconoscibile per TR LAB; l'indirizzo definitivo non è stato deciso né riservato. Non utilizzare un segnaposto della guida come mittente reale.
2. Proteggere e recuperare l'account con i propri recapiti, conservando le credenziali nel proprio gestore di password. Il titolare deve poter recuperare l'account anche se cambia computer.
3. In [sicurezza dell'account](https://myaccount.google.com/security), attivare **Verifica in due passaggi** e completare personalmente i passaggi richiesti.
4. Aprire [Password per le app](https://myaccount.google.com/apppasswords), assegnare il nome `TR LAB Supabase SMTP` e generare la password. Google fornisce 16 caratteri: conservarli nel gestore di password e inserirli direttamente nel campo SMTP di Supabase. Se sono visualizzati in gruppi separati da spazi, inserire i 16 caratteri senza gli spazi di presentazione.

La password per app richiede la verifica in due passaggi; può non essere disponibile per account gestiti, Protezione avanzata o configurazioni con sole chiavi di sicurezza. Cambiare la password principale può revocarla. Se la funzione non è disponibile, verificare il motivo nell'account e rivalutare il provider SMTP; non disattivare le protezioni per aggirarlo. [Requisiti ufficiali Google](https://support.google.com/accounts/answer/185833?hl=it).

## 4. Configurare SMTP nel progetto Supabase corretto

Aprire [SMTP del progetto TR LAB](https://supabase.com/dashboard/project/mxaogzjquvhwurngktyz/auth/smtp). Se il percorso della Dashboard cambia, usare **Authentication → Email → SMTP Settings**. Prima di salvare verificare il riferimento `mxaogzjquvhwurngktyz`.

Abilitare **Custom SMTP** e compilare:

| Campo | Valore da inserire |
| --- | --- |
| Sender name / Nome mittente | `TR LAB` |
| Sender email / Email mittente | L'indirizzo completo del Gmail dedicato appena creato |
| Host | `smtp.gmail.com` |
| Port / Porta | `465` |
| Username / Utente | Lo stesso indirizzo Gmail completo del mittente |
| Password | La password per app di 16 caratteri, inserita personalmente; non la password principale Google |

Scelta tecnica: **465 con TLS implicito**. **587 con STARTTLS** è un'alternativa valida quando il client la supporta; non è più sicura per definizione e non va associata al TLS implicito. Qui il collegamento SMTP parte da Supabase: non occorre aprire porte sul PC né aggiungere un server email a Vercel. Parametri: [Gmail SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp), [tabella porte Google](https://knowledge.workspace.google.com/admin/gmail/send-email-from-a-printer-scanner-or-app?hl=en). Quest'ultima guida riguarda Workspace: non usare le sue quote per un Gmail personale.

Salvare e controllare che la Dashboard confermi l'attivazione. Conservare **Confirm email** attivo e i limiti Auth iniziali; non alzarli per aggirare errori. Controllare la quota effettiva in Authentication → Rate Limits e i [limiti Gmail personali](https://support.google.com/mail/answer/22839?hl=it). Un salvataggio riuscito non prova che l'email arrivi.

Il mittente deve coincidere con l'account Gmail autenticato; non inventare `no-reply@tr-lab.vercel.app`. Google gestisce il dominio Gmail: questa soluzione non richiede record SPF/DKIM/DMARC propri. Quando si passa a un dominio proprio, servono la verifica e i record indicati dal nuovo provider.

Password SMTP soltanto in Supabase e nel gestore privato del proprietario. Non serve inserirla in Vercel, `.env`, frontend o GitHub. I valori database e la chiave di cifratura delle sessioni già configurati restano validi.

## 5. Provare conferma e recupero email

Seguire il [collaudo Auth §3](COMPLETARE_AUTH.md#3-collaudo-con-account-reale-sul-dominio-stabile), usando un proprio indirizzo di prova esterno al team Supabase.

1. Da Profilo registrare l'account e attendere la conferma, controllando anche spam. Evitare richieste ripetute mentre si controlla l'invio.
2. Aprire il link nello **stesso browser** e dispositivo della registrazione. Deve tornare al Profilo di tr-lab.vercel.app e riconoscere l'account.
3. Provare logout e login email/password, poi recupero e cambio password nello stesso browser del recupero.
4. Annotare soltanto ambiente, ora ed esito. Password, link di conferma, token ed email personali non vanno in diario, screenshot condivisi o issue.

I template devono preservare `{{ .ConfirmationURL }}` e il percorso attuale con state/PKCE. Non copiare esempi per Next.js o una rotta `/auth/confirm` assente da TR LAB. Gli amici possono registrarsi dal dominio stabile dopo il collaudo. Non aggiungerli al team amministrativo Supabase per aggirare i limiti del mittente di test.

## 6. Creare il progetto e il client OAuth Google

### 6.1 Progetto, identità dell'app e pubblico

Accedere personalmente alla [console Google Cloud](https://console.cloud.google.com/). Se non esiste un progetto dedicato, aprire il selettore progetti → **Nuovo progetto**, nome `TR LAB`. Google assegna un ID: conservare quello effettivo, senza inventarlo nei file. Non attivare prove a pagamento, fatturazione o servizi Gmail/Drive per questa procedura di solo accesso.

Aprire **Google Auth Platform**. Se viene mostrato **Get started / Inizia**, compilare le sezioni richieste:

- Nome applicazione: `TR LAB`.
- Email assistenza e contatto sviluppatore: indirizzo del proprietario effettivamente disponibile nel selettore; il Gmail dedicato può essere usato se si gestisce da quell'account.
- Pubblico / Audience: **External / Esterno**, per gli amici con account Google personali.
- Branding: dati reali; inizialmente logo e collegamenti opzionali possono restare vuoti dove la console lo consente.

Non inserire una pagina privacy inesistente e non dichiarare di possedere vercel.app o supabase.co. Se una configurazione/verifica impone homepage, privacy o proprietà del dominio, soddisfarla con pagine reali e dominio verificabile prima di quel passaggio. La gestione pubblica del marchio richiede una verifica separata. [Campi e requisiti Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

### 6.2 Permessi minimi e modalità Testing

In **Data Access / Accesso ai dati**, configurare soltanto:

```text
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

Sono sufficienti per identificare chi accede. Non aggiungere permessi per leggere/inviare Gmail, Drive o Calendar. L'invio SMTP usa la password per app del proprietario e non richiede accesso alla posta degli utenti.

Per il primo collaudo mantenere **Testing** se presente. Google documenta un'eccezione per richieste limitate a questi permessi di base: non serve inserire gli utenti nella lista tester, non compare l'avviso per app non verificata previsto per altri scope e il consenso non scade dopo sette giorni. Non estendere questa eccezione a permessi aggiuntivi; restrizioni Workspace o Protezione avanzata possono comunque impedire l'accesso. La futura pubblicazione e verifica del marchio vanno gestite separatamente. [Audience e relativa eccezione](https://support.google.com/cloud/answer/15549945?hl=en).

### 6.3 Client web e indirizzi esatti

Aprire **Clients / Client → Create client / Crea client**. Tipo: **Web application / Applicazione web**. Nome operativo: `TR LAB Web`.

| Campo Google | Valore |
| --- | --- |
| Authorized JavaScript origins | `https://tr-lab.vercel.app` |
| Authorized redirect URIs | `https://mxaogzjquvhwurngktyz.supabase.co/auth/v1/callback` |

L'origine non contiene `/profilo`, wildcard o slash finale. Il redirect Google è il **callback del provider Supabase**: copiarlo anche dalla pagina Google di Supabase e confrontarlo prima di salvare. Non usare il callback applicativo `/api/auth/callback`, né `\?state=*`, nel client Google.

La prima configurazione usa il dominio stabile. Preview e sviluppo mantengono i callback applicativi già ammessi, ma l'abilitazione Google in questi ambienti è un'attività distinta; non aggiungere tutte le preview come origini.

Creare il client e conservare **Client ID** e **Client Secret** nel proprio gestore di password. Il proprietario copia il segreto direttamente in Supabase, senza allegare il JSON credenziali al repository. Procedura del flusso gestito: [configurazione Google Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 7. Abilitare il provider e il flag Production

1. In [Supabase → Sign In / Providers](https://supabase.com/dashboard/project/mxaogzjquvhwurngktyz/auth/providers), aprire **Google**.
2. Inserire Client ID e Client Secret nei rispettivi campi. Abilitare Google e salvare. Lasciare disabilitate eventuali opzioni che saltano il controllo nonce o consentono identità senza email; non cambiare altri provider.
3. Eseguire il preflight del §9: `googleProviderEnabled` deve diventare `true`. Questa lettura non certifica che il secret sia corretto.
4. In [Vercel → tr-lab → Environment Variables](https://vercel.com/pere01040/tr-lab/settings/environment-variables), controllare scope `pere01040` e progetto `prj_IpG5DKSPZX4Tn1yw90eAfILehujH`. Impostare soltanto **Production**: `GOOGLE_AUTH_ENABLED=true`, valore pubblico Config.
5. Eseguire un nuovo deployment Production dal codice verificato; il cambio variabile non modifica il deployment già pubblicato. Seguire [deploy, collaudo e promozione](DEPLOY_VERCEL.md#9-dominio-stabile-pubblicato-12-ottobre-2026), verificando il dominio dopo l'aggiornamento.
6. Provare **Continua con Google** da [Profilo](https://tr-lab.vercel.app/profilo): account di prova scelto dal proprietario, ritorno allo stesso dominio, identità corretta e logout/login funzionanti.

Ordine obbligatorio: prima client/provider, poi flag e deployment. Finché mancano le credenziali, mantenere `GOOGLE_AUTH_ENABLED=false`. Il Client Secret Google non va su Vercel; il backend usa l'integrazione Supabase già presente. Nessun Google SDK nel frontend, cambio CSP o nuova migrazione database è necessario per attivare questo flusso.

## 8. Indirizzi e credenziali: evitare scambi

| Elemento | Dove serve | Valore / conservazione |
| --- | --- | --- |
| Site URL | Supabase URL Configuration | `https://tr-lab.vercel.app` |
| Callback applicativo Production | Redirect allowlist Supabase | `https://tr-lab.vercel.app/api/auth/callback\?state=*` |
| Callback del provider Google | Redirect URI nel client Google | `https://mxaogzjquvhwurngktyz.supabase.co/auth/v1/callback` |
| Password per app Gmail | SMTP Supabase | Segreto del proprietario, diverso dalla password Gmail principale |
| Client Secret Google | Provider Google Supabase | Segreto distinto dalla password SMTP |
| Chiave publishable Supabase | Preflight/BFF già configurati | Identifica il progetto; non abilita Google né autorizza l'amministrazione |
| Password database / chiave sessioni | Backend già configurato | Non sono credenziali SMTP/OAuth; non sostituirle |

L'asterisco e il backslash del callback applicativo sono parte del pattern Supabase, non dell'URI registrato presso Google. [Configurazione URL già salvata](COMPLETARE_AUTH.md#1-url-attualmente-configurati).

## 9. Controllo automatico e prove finali

Dalla radice del repository con Node della toolchain e `.env` già configurato:

```powershell
npm run auth:preflight
```

Il comando esegue quattro GET senza cookie: health, readiness database, sessione anonima e impostazioni pubbliche Supabase. Richiede `SUPABASE_URL` del progetto indicato e la sua `SUPABASE_PUBLISHABLE_KEY`; legge solo queste due variabili. Non usa password DB, service key, password SMTP o Client Secret, non modifica account e non invia email. Rifiuta un progetto diverso, una chiave non publishable e redirect HTTP. Stampa soltanto esiti selezionati.

Dopo aver abilitato il provider:

```powershell
npm run auth:preflight -- --require-google
```

Con `--require-google`, provider disabilitato produce un errore e codice di uscita 1. Senza l'opzione, Google disabilitato viene segnalato e non blocca il controllo dell'accesso email. Nessuno dei due comandi prova il flag remoto Vercel, la validità delle credenziali OAuth, la consegna SMTP o un login positivo: questi richiedono i flussi reali.

| Prova da completare | Esito richiesto |
| --- | --- |
| Registrazione esterna al team | Conferma ricevuta e ritorno allo stesso browser con sessione |
| Recupero email | Link ricevuto, cambio riuscito, login con nuova password |
| Google | Ritorno al Profilo; nessun errore callback e identità corretta |
| Identità già esistente | Nessuna duplicazione o fusione non verificata; controllare l'UID reale in privato |
| Account distinto | Nessun accesso a schede/misure di un altro utente |
| Cookie e token | HttpOnly/Secure/SameSite Lax; nessun token Auth nel frontend o nei log |
| Login annullato/scaduto | Errore gestito, nessuna sessione attribuita all'account sbagliato |

Queste prove contribuiscono a **QA-AUTH-01**; non chiudono i test di refresh concorrente, sincronizzazione, restore e beta pubblica della roadmap. Tracciabilità: RF-01, ADR-05/06/07, WEB-11/12/14, [spec sicurezza](../specifiche/SICUREZZA_E_PRIVACY.md) e [matrice QA](../qualita/TEST_E_ACCETTAZIONE.md).

## 10. Problemi frequenti, ripristino e manutenzione

| Sintomo | Controllo / azione |
| --- | --- |
| Password SMTP rifiutata | Account completo, password per app corretta, mittente coincidente; verificare revoche Google |
| Email non arriva | Log Auth e spam, SMTP salvato, limiti effettivi; non riattivare l'autoconferma |
| Email arriva ma callback fallisce | Stesso browser/dispositivo, nuovo tentativo dall'app, state/PKCE e allowlist esatta |
| `redirect_uri_mismatch` | URI Google deve coincidere con il callback del provider Supabase, inclusi schema/host/percorso |
| `GOOGLE_NOT_CONFIGURED` | Il deployment attivo ha il flag false; attivarlo solo dopo il provider e fare redeploy |
| `OAUTH_UNAVAILABLE` | Verificare client ID/secret, provider abilitato e propagazione delle impostazioni |
| Google mostra autorizzazioni Gmail/Drive | Permessi e richiesta effettiva non corrispondono al solo login: correggerli prima di continuare |
| Errore 403 da account gestito | Verificare policy Google Workspace/Protezione avanzata, senza ridurre le difese dell'app |

Se Google non funziona, riportare il solo flag Production a false e ridistribuire; mantenere email/password operativo. Non ruotare la chiave delle sessioni o resettare il database per un errore OAuth. In caso di password per app compromessa, revocarla in Google e configurarne una nuova direttamente in Supabase; registrare solo nome del segreto e data, mai il valore.

Non lasciare SMTP vuoto credendo di avere un servizio di produzione: il mittente predefinito conserva i propri limiti. Prima di una crescita pubblica, scegliere un dominio e provider transazionale, aggiornare privacy/branding, protezioni antiabuso, monitoraggio di consegna e procedure di recupero; eseguire il collaudo prima della migrazione. Le quote sono quelle del servizio effettivo, da ricontrollare nel tempo.

Capitoli applicati: Appunti 00/01/07/08 e Linee guida 00/01/08/11; Supabase/PostgreSQL e commenti secondo DEC-18/19. Originali invariati. Fonti ufficiali consultate il 12 ottobre 2026; nessuna nuova incompatibilità architetturale richiesta. [Diario e controlli della consegna](../DIARIO_SVILUPPO.md).
