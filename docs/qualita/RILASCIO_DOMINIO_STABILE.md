# TR LAB — rilascio dell'alpha sul dominio stabile

12 ottobre 2026 · Versione 0.1.0 alpha. [Apri TR LAB](https://tr-lab.vercel.app/profilo). Rapporto di configurazione e collaudo del link corto; non certifica il completamento della roadmap.

## 1. Problema e soluzione

Il dominio corto puntava a una Production priva delle variabili Supabase: la UI mostrava soltanto la modalità dispositivo. La Preview aveva invece il backend collegato. DEC-30 autorizza espressamente configurazione e pubblicazione Production nel progetto `pere01040/tr-lab`, ID `prj_IpG5DKSPZX4Tn1yw90eAfILehujH`.

Configurate otto variabili solo in Production: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DATABASE_CA_CERT_BASE64, DATABASE_URL del ruolo limitato tr_lab_runtime, SESSION_ENCRYPTION_KEY nuova e distinta, APP_ORIGIN, DEPLOYMENT_MODE e GOOGLE_AUTH_ENABLED. I due valori riservati sono Secret; trasferimento via stdin, esclusi da Git e dal pacchetto. Nessuna credenziale amministrativa. `APP_ORIGIN=https://tr-lab.vercel.app`, modalità connected, Google false.

La configurazione esplicita dell'origine stabile permette i POST dal dominio definitivo; il dominio immutabile dello stage è correttamente respinto. Preview e locale mantengono le rispettive configurazioni. Gli ambienti usano lo stesso database fornito dal committente: è un limite dell'alpha dichiarato nel consenso, da risolvere prima della beta completa.

## 2. Artefatto e promozione

Il pacchetto minimo comprende 22 file, 4437560 byte: 19 asset, funzione CJS e due manifest. SHA-256 funzione `61ffdf587b1c88ee02682beaeeddec396f7f80af8dc939ffeb3c4b414963f427`, uguale alla Preview verificata. Codice runtime di main `4f541be157c747590412f831a155463ffb46258b`; questa consegna aggiunge una regressione di configurazione e documenti, senza modificare il runtime.

Production creata con --skip-domain: `dpl_8EPipdWSN1uz89n9ydB5ea4sWTUL`, [URL immutabile](https://tr-8y9whe284-pere01040.vercel.app). READY/production verificati; dopo dodici controlli è stato promosso lo stesso deployment. La prima ispezione di tr-lab.vercel.app risolveva allo stesso ID. Versione precedente `dpl_CBqaXKtm1JdWKzz5wtozJ1d6rWVM` conservata per rollback; nessuna cancellazione di dati o deployment. Il successivo push avvia anche la build Git già presente, descritta nel §6.

Node24, funzione configurata dub1/max60 s, transaction pooler6543 e TLS con CA verificata; pool applicativo max2. Scanner del pacchetto con i valori privati reali superato. La CLI ha generato un .env.local con OIDC nella directory ignorata: il dry-run conferma che non è incluso nell'upload, insieme a .vercel e altri file privati.

## 3. Prove realmente eseguite

| Controllo | Risultato | Limite |
| --- | --- | --- |
| Suite locale completa | 24 unitari +19 integration; tipi, lint e build passati | Non E2E provider; avviso PWA inlineDynamicImports già noto |
| Bundle locale con valori Production | Sette prove HTTP, DB pronto e origine stabile | Non è un deploy remoto |
| Stage Production | Dodici controlli HTTP passati | Richieste tramite CLI Vercel autenticata |
| Dominio stabile dopo promozione | Stessi dodici controlli passati | Nessun account o email creati dalla prova |
| Accesso senza credenziali Vercel | Quattro GET 200: health, ready, sessione anonima e Profilo | Non prova il login personale |
| Browser Chrome sul dominio stabile | Moduli Accedi/Registrati visibili, aggiornamento PWA senza campi in corso | Nessuna password dell'utente utilizzata |
| Supabase URL Configuration | Site URL stabile e tre callback specifici salvati | Non prova consegna, conferma o recupero email |

I dodici controlli comprendono health/ready/sessione, sync anonima401, API404, Profilo200, asset mancante404, worker200/no-cache, input login vuoto400 dall'origine stabile, origini immutabile/estranea403 e Google non configurato503. API no-store. Il 400 del payload vuoto verifica Origin e validazione, non un login riuscito.

Il committente ha riferito il successo del login nella Preview. Non è una prova positiva eseguita dall'agente sulla nuova Production. Nessuna registrazione artificiale, invio email o accesso a dati personali per il collaudo.

Evidenze del browser: [Profilo](evidenze/TR-LAB-production-profilo.png) e [configurazione URL](evidenze/TR-LAB-production-auth-urls.png). Il badge Modalità dispositivo accanto al modulo è lo stato anonimo prima dell'accesso: non indica un backend scollegato. L'avviso che disabilitava login e sync non compare più.

## 4. Configurazione Auth e limiti residui

La Dashboard mostrava Site URL localhost:3000 e nessun Redirect URL. Salvati Site URL `https://tr-lab.vercel.app` e callback specifici:

- `https://tr-lab.vercel.app/api/auth/callback\?state=*`;
- `https://tr-9lstvuhyr-pere01040.vercel.app/api/auth/callback\?state=*`;
- `http://localhost:5173/api/auth/callback\?state=*`.

Nessuna wildcard su tutti i domini Vercel. SMTP ancora da configurare secondo l'ultima risposta del committente; Google disabilitato fino a credenziali/provider e nuovo flag. Conferma email, recupero, login positivo Production, rinnovi concorrenti, due account/dispositivi, backup/restore e gate privacy/abusi richiedono ancora prove. Procedura: [completare Auth](../operazioni/COMPLETARE_AUTH.md).

Il dominio corto e la Preview hanno IndexedDB distinti. Dati già sincronizzati: accedere allo stesso account. Schede rimaste anonime nella Preview: esportare una copia JSON e importarla dopo l'accesso nel dominio stabile. Non cancellare cache/diario per aggiornare; usare Aggiorna ora dopo aver salvato i campi.

## 5. Tracciabilità

RF-01/07/18, ADR-05/06/07, WEB-11/12/14, QA-AUTH/SEC/SYNC e DEC-30. Applicati Appunti 00/01/08 e Linee guida 00/01/08/09/11; originali invariati. Il [diario](../DIARIO_SVILUPPO.md) registra preparazione, autorizzazione, errore di parsing del helper, ripresa senza duplicare il deploy, configurazione, test e promozione. La [roadmap](../ROADMAP_SVILUPPO.md) mantiene i gate della versione completa.

## 6. Repository e build automatica

Commit della consegna `cd9c90c5d4e442bbc1f1b6a4b4e0ea0c2f099679` caricato su origin/main senza force. L'integrazione Git Vercel già presente ha creato `dpl_Fg7bEnLKit74S4M7ihiSHihA1Pvy`, [build del repository](https://tr-4ozs1ye0q-pere01040.vercel.app), READY/production e alias tr-lab.vercel.app verificati. Usa la configurazione della radice e gli stessi valori Production; è distinta dal bundle manuale del §2. Anche i successivi push di documenti possono creare nuove versioni: verificare sempre il dominio dopo il push, senza presumere che l'ID iniziale resti attivo.

[CI della consegna](https://github.com/ale01040/TR-LAB/actions/runs/38291376589) success sullo stesso SHA. Il controllo runtime successivo ha però rilevato API500: ERR_MODULE_NOT_FOUND per @tr-lab/contracts/src/index.ts assente nel packaging Git. Ripristinata la Production manuale del §2 e confermate quattro GET anonime riuscite. Il deployment fallito è conservato nella cronologia, non dichiarato funzionante. La CI precedente non includeva il nuovo controllo dell'artefatto.

Correzione: stesso builder CJS per pacchetto manuale e build Git, entrypoint che carica l'artefatto ed includeFiles esplicito. Il server locale resta ESM, pacchetti puri senza SDK e nessun cambio alla logica Auth/sync. Suite locale della correzione: 24 unitari +19 integration, tipi/lint/build e sei prove HTTP isolate del nuovo entrypoint passati. [Motivazioni e alternative](../architettura/SCELTE_IMPLEMENTAZIONE.md). La verifica remota della correzione viene registrata dopo il deploy; READY o CI verde non la sostituiscono.
