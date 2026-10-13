# Collaudo pratico della Preview isolata

13 ottobre 2026 · DEV-070 · SYNC-01/06, SCH-06, RF-01/07/18, WEB-11/12/14. [Risultati tecnici verificati](../qualita/STAGING_2026_10_13.md), [procedura completa e gate](INCREMENTO_SCHEDE_SYNC_MOTORE.md). I passaggi sotto sono ancora da eseguire, salvo quelli esplicitamente conclusi nel rapporto.

## 1. Quale ambiente usare

- App di prova: **https://tr-1hwubt4fq-pere01040.vercel.app**.
- Database: **TR-LAB-STAGING**, riferimento **hfwatspsfhdbiogritkt**.
- Codice pubblicato: **0529c0c**, ramo **codex/schede-sync-motore-20261013**; [CI Windows/Ubuntu riuscita](https://github.com/ale01040/TR-LAB/actions/runs/38429493830).
- Non usare tr-lab.vercel.app per questi test: usa il database Production e la versione precedente.

La Preview mantiene la protezione Vercel. Prima si accede al workspace Vercel, poi all'account personale TR LAB. Non condividere cookie/token o disattivare la protezione per un test. Per usare un telefono serve anche l'accesso Vercel autorizzato su quel browser. Gli account e i dati del sito precedente non vengono trasferiti automaticamente; una scheda eventualmente esportata si importa come copia/bozza, senza migrare credenziali o storico automaticamente.

## 2. Azioni tecniche delegate allo sviluppatore

Sono già concluse: otto migrazioni di schema, credenziale del ruolo limitato, TLS, override Preview del ramo e quindici prove delle funzioni collegate. Due account sintetici Auth collaudati con tre sessioni HTTP e token utente per RLS; percorso Chrome online Excel/calendario/diario ed esercizio/attrezzi riuscito, dati finali confrontati sul server. Dopo la sola correzione dei conteggi al singolare, nuova Preview READY con lo stesso backend: ripetute dieci verifiche HTTP, login Chrome e anteprima XLSX; Site URL e nuovo callback persistiti, precedente callback conservato. Il rapporto associa ogni prova al deployment effettivo. Questo non chiude consegna email, campagna offline/telefono o restore. Nessuna password amministrativa è richiesta.

In **Supabase → TR-LAB-STAGING → Authentication → URL Configuration**:

| Impostazione | Valore |
| --- | --- |
| Site URL | `https://tr-1hwubt4fq-pere01040.vercel.app` |
| Redirect URL attuale | `https://tr-1hwubt4fq-pere01040.vercel.app/api/auth/callback\?state=*` |
| Redirect URL precedente conservato | `https://tr-g2vtw9l89-pere01040.vercel.app/api/auth/callback\?state=*` |

Configurazione verificata dopo reload: [evidenza](../qualita/evidenze/TR-LAB-staging-corrected-auth-urls.jpg). Conservare eventuali altre origini di sviluppo realmente necessarie; niente wildcard su tutti i domini Vercel. Il backslash rende il punto interrogativo letterale nel matcher, l'asterisco copre solo state. L'origine BFF deriva dal VERCEL_URL del deployment; un altro alias non va usato senza allineare origine e callback. [Guida ufficiale](https://supabase.com/docs/guides/auth/redirect-urls).

La lettura delle impostazioni pubbliche ha confermato email abilitata, conferma email attiva, registrazione consentita e Google disabilitato. Mantenerle: non rimuovere la conferma per ottenere artificialmente un test riuscito. SMTP Gmail e OAuth Google richiedono le configurazioni della [guida dedicata](CONFIGURAZIONE_GMAIL_GOOGLE.md). Nello staging il callback **del provider Google**, da verificare nel dashboard prima dell'inserimento in Google Cloud, è `https://hfwatspsfhdbiogritkt.supabase.co/auth/v1/callback`; è distinto dal callback BFF sopra.

## 3. Interventi che richiedono il titolare

1. Accesso al [dashboard Supabase](https://supabase.com/dashboard) ripristinato dal titolare; callback salvato dallo sviluppatore. Non comunicare password o codici.
2. Quando callback e invio email sono pronti, creare due account di prova distinti A/B, con indirizzi e passphrase controllati dal titolare. Aprire ogni conferma nello stesso browser della relativa registrazione. Lo SMTP di test Supabase limita i destinatari ai membri dell'organizzazione: un secondo indirizzo o un amico esterno può richiedere SMTP proprio. Non confondere questo limite con un bug di login. [SMTP ufficiale](https://supabase.com/docs/guides/auth/auth-smtp).
3. Per Gmail dedicato, completare personalmente verifica in due passaggi e generazione/inserimento della password per app. Per Google Cloud, completare le autenticazioni/consensi richiesti. Nessun segreto in chat, repository o frontend.
4. Eseguire la prova fisica del telefono al §4: indicare modello, OS/browser, tab o PWA installata e risultato. L'emulazione desktop non dimostra sospensione o conservazione sul telefono reale.

Il collaudo automatico dell'import in Chrome è terminato. L'estensione ha richiesto «Consenti l'accesso agli URL dei file»: autorizzazione temporanea ricevuta e attivazione effettuata dal titolare. Ora il titolare deve disattivarlo da chrome://extensions → ChatGPT → Dettagli; chiusura richiesta, ancora da confermare. Il browser di automazione rifiuta gli URL chrome://; lo sviluppatore non aggira questo limite. È stato selezionato soltanto QA-STAGING.xlsx sintetico, senza caricare workbook personali. La disponibilità del permesso non cambia la politica dell'app: il parsing Excel rimane sul dispositivo.

Lo sviluppatore gestisce controlli SQL/API, analisi degli errori, eventuali correzioni con regressioni, documentazione, GitHub e rilascio dopo i gate. Il titolare comunica soltanto esito e testo/codice dell'errore; non invia link email, esportazioni personali o credenziali.

## 4. Percorso minimo su PC e telefono

Usare dati di prova semplici, riconoscibili e non clinici. Conservare un export prima del test offline; non svuotare lo storage o eliminare dati per fare sparire errori.

| Passo | Azione | Risultato da verificare |
| --- | --- | --- |
| 1 | Accedere come A sul PC e sul telefono | Stessa identità TR LAB; nessun token Auth nei payload API/frontend |
| 2 | Importare un Excel supportato dal PC in Programma | Report con fogli/celle/ambiguità; nessuna conversione JSON manuale e nessuna approvazione implicita |
| 3 | Risolvere le associazioni, salvare bozza, poi approvare esplicitamente | Nuova versione approvata; report conservato; stessi esercizi/serie/target sui due dispositivi dopo sync |
| 4 | Creare un esercizio personale e un profilo attrezzatura | Visibili solo ad A, persistono dopo riapertura; snapshot storici non cambiano modificando il nome |
| 5 | Pianificare un intervallo nel calendario dalla versione approvata | Date/giornate/settimane/fuso corrispondono all'anteprima; nessuna seduta creata dal solo passare del tempo |
| 6 | Avviare un'occorrenza sul telefono online, poi togliere connessione | Diario continua; registrare almeno tre serie con carico decimale, RIR0 e dato mancante distinto da zero |
| 7 | Chiudere e riaprire normalmente la PWA ancora offline | Serie e coda conservate, stato locale esplicito; nessuna cancellazione dello storage durante la prova |
| 8 | Tornare online e aprire il diario sul PC | Esattamente le serie registrate, nessun duplicato; coda inviata, ricevute conservate e calendario coerente |
| 9 | Accedere come B in un altro profilo/browser | Nessun programma, esercizio privato, misura, diario o outbox di A accessibile |
| 10 | Tornare come A e confrontare con le annotazioni del test | Dati originali conservati; niente overlay di B o scritture attribuite all'account sbagliato |

Il parser supporta i profili descritti in [Formato Excel implementato](../specifiche/FORMATO_EXCEL_IMPLEMENTATO.md), non qualunque workbook. Un report che chiede una mappatura è un comportamento previsto. Il collaudo completo aggiunge richieste ostili, due tab, guasti di rete, lease, consenso e restore secondo la procedura e il [piano sync](../piani/COLLAUDO_SINCRONIZZAZIONE.md).

## 5. Criteri per passare al sito definitivo

Registrare commit, ambiente, dispositivo, dati sintetici, operazioni, risultati e difetti nel rapporto. Lo sviluppatore confronta anche ricevute/revisioni e isolamento API/RLS: la sola visibilità della UI non basta. Servono backup ripristinato e rollback compatibile con scritture v2, oltre ai gate S/C/A/D/R applicabili. Il deploy riuscito non chiude questi gate.

Generatore, progressioni e analisi automatica restano separati: nessun metodo attivo finché le fonti/regole non sono revisionate; ogni modifica di target richiede conferma esplicita dell'utente interessato. Non attivare bundle fixture o esempi didattici come metodi reali per sbloccare la schermata.
