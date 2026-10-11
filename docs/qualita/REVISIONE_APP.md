# TR LAB — revisione dell'app e preparazione del deploy

11 ottobre 2026 · Alpha 0.1.0 · Verifica del codice presente e della build, distinta dalla futura versione completa. Il deploy è una preview in modalità dispositivo; l'esito remoto viene registrato nella guida Vercel e nel diario dopo il caricamento.

## 1. Esito e perimetro

La revisione ha trovato e corretto difetti concreti di input, isolamento visivo tra account, backup, layout e testi. I controlli elencati sotto sono passati; non dimostrano assenza universale di bug. Rimangono i gate cloud, dispositivi reali e accessibilità della roadmap. Nessun dato reale del committente è stato usato nei risultati o negli screenshot pubblicati.

L'Excel rimane una fonte di struttura: giorni A/B/C, ciclo, serie, carichi, RIR, recuperi, note, misure e nutrizione. La fixture è una trasformazione dichiarata, non una copia integrale di protocolli personali. L'app permette l'approvazione esplicita della scheda; progressioni automatiche, generatore e assistente AI non sono ancora attivi. Supabase resta il database confermato; nessuna sostituzione con MySQL o altro servizio.

## 2. Difetti corretti e motivazioni

| Area | Difetto osservato | Correzione e compromesso | Evidenza |
| --- | --- | --- | --- |
| Input decimali | `12,` poteva lasciare valida l'ultima cifra e consentire Invio | Testo incompleto conserva la digitazione ma blocca il submit; virgola, zero e vuoto restano distinti | Regressione `decimal-input.test.tsx` |
| Identità UI | Una query locale ritardata poteva lasciare visibili i risultati del precedente account | Risultati associati all'account e form rimontati al cambio identità; breve stato vuoto durante la nuova lettura | `account-ui.test.tsx` con due account e lettura ritardata |
| Backup | Letture separate potevano combinare stati prima e dopo una ricevuta | Un'unica transazione readonly per base, overlay, coda e conflitti | Revisione della transazione; gli scenari di restore completo restano aperti |
| Contatori | Incremento oltre il massimo intero sicuro | Verifica prima della scrittura; transazione annullata senza dati parziali | Test IndexedDB con overflow e rollback |
| Contratti | Versione scheda zero ammessa dal contratto mentre SQL parte da uno | Versione >=1; revisione record zero ancora ammessa per nuove entità | Test contratti e rigenerazione schema; refinement Zod necessarie |
| Navigazione mobile | Ultimo link oltre il bordo a 320px | Griglia a cinque colonne con min-width zero | Misura DOM: clientWidth/scrollWidth 305px, controlli entro il bordo |
| Diario piccolo schermo | Input del carico largo circa 34px | Sotto 400px tre campi ampi con etichette e azioni su riga separata; più spazio verticale | Registrazione e chiusura sintetiche a 320px; risultati leggibili a 390px |
| Dialog | Focus perso dopo Escape | Cattura del trigger e ritorno se ancora presente; titolo con ID univoco | Escape e Chiudi nel dettaglio libreria riportano al pulsante esercizio |
| Cambio sezione | Scroll precedente lasciava fuori vista il titolo | Reset sul nuovo pathname, senza reset alla digitazione | Home torna a scrollY 0; ripristino storico Back ancora da progettare |
| Testi | Conteggi al plurale con valore uno e termini non italiani nell'editor | Concordanze corrette, chiarimento dei campi che modificano tutte le serie | Percorso singola serie/misura e riepilogo scheda nel browser |
| Catalogo/provenienza | Documento dichiarava 27 esercizi, app ne mostrava 26; source JSON poteva simulare provenienza Excel | 23 movimenti adattati +3 corpo libero; provenance riservata al template integrato | 25 posizioni/24 nomi originali confermati; normalizzazione esplicitata |
| Configurazione | Errore URL nativo poteva includere il valore ricevuto | Messaggio generico depurato, modalità preview distinta da connected | Test con URL sensibile sintetica e produzione senza cloud |
| Profilo preview | Login mostrato con servizio non configurato | Spiegazione modalità dispositivo e backup; login disponibile soltanto col servizio configurato | Nessun form di credenziali nella preview |

## 3. Verifiche automatiche realmente eseguite

| Comando / livello | Risultato | Limite della prova |
| --- | --- | --- |
| `npm run check` | TypeScript strict, ESLint, 21 unit in 7 file, 15 integration in 3 file, build web/PWA/server superati | PGlite e provider assente non provano GoTrue/PostgREST o due dispositivi reali |
| Controlli dopo ultime modifiche UI | Formattazione, typecheck, lint e nuova build superati | Non una ripetizione automatica E2E di ogni vista |
| `npm run format:check` | Sorgenti/configurazioni uniformati con Prettier | I Markdown e le fonti originali hanno controlli separati |
| `npm audit --json` | Zero advisory noti sul lockfile alla data del rapporto | Nessuna certificazione di sicurezza generale |
| GitHub Actions | Job `local-checks` Windows e Ubuntu superati sul commit codice `70c23a4`, nessun passo fallito | Controlli locali della CI; non cloud Auth o browser su telefoni |
| `check-vercel-preview.mjs` | Cinque richieste HTTP reali sul bundle CJS locale: sessione 200/no-store, CSRF 403, login 503, sync 401, API ignota 404 | Non verifica il routing/CDN del deployment remoto |

Le integration comprendono 6 prove SQL, 5 IndexedDB e 4 API. Sono 36 test di suite, cui si aggiungono 5 controlli del bundle. Il dominio resta puro, senza SDK/rete; il BFF tiene le credenziali fuori dal frontend. Nella preview non viene creata né migrata alcuna risorsa Supabase.

La build finale ha entry JS circa 481kB, 152kB gzip, più chunk delle sezioni caricati al bisogno. La dipendenza Workbox segnala una deprecazione `inlineDynamicImports`: build riuscita, aggiornamento del plugin da monitorare. Non è una misura Lighthouse, LCP, INP o CLS su telefono reale.

Evidenza remota: [run CI del commit verificato](https://github.com/ale01040/TR-LAB/actions/runs/38161285628). Entrambi i job sono stati letti dall'API GitHub, non dedotti dalla sola presenza del workflow nel repository.

## 4. Collaudo manuale browser

Browser Chromium in-app, origine sintetica `localhost:3002`, distinta dal processo già aperto sulla porta 3001. Le dimensioni indicate sono viewport richieste; la scrollbar riduce la larghezza utile. Screenshot di viewport, non pagine intere.

| Viewport | Viste / operazioni osservate | Esito |
| --- | --- | --- |
| 320×740 | Oggi, Programma, Progressi, Libreria/dettaglio, Profilo; diario con 12,5kg/8rip/RIR0, salvataggio, timer, ricarica e chiusura | Nessun controllo oltre il bordo; diario ridisposto e risultati conservati |
| 390×844 | Diario concluso, libreria filtrata/dettaglio, Escape e Chiudi | Risultati e unità leggibili, focus restituito al trigger |
| 768×1024 | Programma, Progressi, Profilo | Nessun overflow della pagina o controllo fuori bordo nelle viste controllate |
| 1366×900 | Oggi e Programma, navigazione, riepilogo approvato | Nessun overflow, titolo visibile con scroll reset |

Provati anche tema chiaro/scuro sul solo archivio sintetico e aggiornamento PWA accettato senza campi non salvati. La console non segnala errori o warning nel percorso finale controllato. La viewport temporanea è stata ripristinata; le preferenze e i dati dell'origin utente non sono stati modificati.

Evidenze finali: [home desktop](evidenze/TR-LAB-revisione-desktop.jpg), [diario mobile](evidenze/TR-LAB-diario-mobile.jpg). Le prove precedenti a server spento sono descritte nel [rapporto implementazione](STATO_IMPLEMENTAZIONE.md); la prova corrente di ricarica non viene spacciata per modalità aereo.

## 5. Tracciabilità e capitoli applicati

Intervento di revisione QA collegato a WEB-01–WEB-08, WEB-11–WEB-14 e ai casi QA-SEC-03/04, QA-OFF-01/02/03/04, QA-SYNC-09 e QA-UX-01. Copertura parziale: questi riferimenti non chiudono l'intero caso di accettazione. Requisiti di prodotto e perimetro restano nel [piano](../PIANO_OPERATIVO.md), contratti nella [specifica offline](../specifiche/API_E_SINCRONIZZAZIONE.md), criteri nei [test di accettazione](TEST_E_ACCETTAZIONE.md).

Applicate entrambe le raccolte: indici e regole generali; HTML/CSS/web design; JavaScript/form; struttura e prestazioni; sicurezza, sessioni/stato/cookie e cache; SEO della parte privata. I numeri e i capitoli sono mappati nelle [convenzioni](../CONVENZIONI_SVILUPPO.md). Originali conservati; DEC-18/19/23 applicate, DEC-27 registra la richiesta Vercel. Nessun nuovo conflitto richiede riaprire la scelta del database.

## 6. Limiti e ordine delle verifiche successive

1. Configurazione e collaudo Supabase reale: email/Google/recovery, cookie HttpOnly, rinnovi concorrenti, minimo privilegio, grant/RLS, due utenti e due dispositivi. La preview mostra chiaramente login e sync indisponibili.
2. Diario su telefoni reali: modalità aereo, quota ed eviction, aggiornamento con campi aperti, timer/background, installazione e icone. E2E automatici, screen reader, tastiera completa, ingrandimento testo e contrasto prima di dichiarare conformità AA.
3. Sync/conflitti/restore e privacy: risoluzione esplicita, recupero del backup, revoca completa, esportazione/cancellazione account, rate limiter condiviso e pooler serverless.
4. Completamento editor avanzato, parser XLSX, catalogo privato, algoritmi validati e assistente con proposte versionate; nessuna applicazione senza accettazione dell'utente interessato.

Le istruzioni di deploy e i compromessi Vercel sono in [DEPLOY_VERCEL](../operazioni/DEPLOY_VERCEL.md). La [roadmap](../ROADMAP_SVILUPPO.md) conserva tutti i gate, e il [diario](../DIARIO_SVILUPPO.md) registra file, prove e risultati del caricamento.
