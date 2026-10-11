# TR LAB — ZIP per Netlify Drop

11 ottobre 2026 · Consegna locale richiesta dal committente. Il pacchetto contiene la build dell'alpha 0.1.0 in modalità dispositivo. La creazione dello ZIP non pubblica un progetto Netlify.

## 1. Caricamento

1. Estrai `TR-LAB-Netlify-2026-10-11.zip` in una cartella.
2. Apri [Netlify Drop](https://app.netlify.com/drop) e accedi al tuo account per gestire il progetto.
3. Trascina la cartella che contiene **direttamente `index.html`**, `assets/`, `_redirects` e `_headers`. Non caricare la radice del repository né la cartella esterna che contiene soltanto un'altra cartella.
4. Attendi l'esito del caricamento e apri l'URL HTTPS restituito. Non servono comandi di build o variabili ambiente: i file sono già compilati.
5. Prova apertura e ricarica di `/profilo` e `/programma`, crea una scheda sintetica, registra una serie e verifica il dato dopo la riapertura. Attendi il download iniziale della PWA prima di provare senza rete.

Netlify documenta l'estrazione preventiva dello ZIP e il caricamento della cartella di output. [Procedura ufficiale](https://docs.netlify.com/deploy/create-deploys/).

## 2. Capacità e limiti

Sono disponibili le funzioni locali dell'alpha: editor manuale, approvazione/versioni, modello Excel adattato, diario e timer, misure, target nutrizionali manuali, import/copia JSON ed export. Il contenuto funzionale è quello del [rapporto implementazione](../qualita/STATO_IMPLEMENTAZIONE.md).

Questo ZIP non distribuisce Fastify o funzioni server. Una risposta JSON **pubblica e costante**, riscritta su `/api/auth/session`, comunica `user: null` e `configured: false`: il Profilo mostra la modalità dispositivo senza simulare account. Le altre API restituiscono 404 con `BACKEND_NOT_CONFIGURED`; nessuna operazione cloud viene accettata. Non esiste autenticazione realizzata mediante file statici.

Login email/Google, sincronizzazione e backup cloud non sono attivi. Generatore, progressioni e AI restano nella roadmap. Supabase rimane la scelta confermata; nessuna credenziale entra nello ZIP. Il BFF HttpOnly previsto dovrà essere distribuito e collaudato separatamente prima degli account, con routing stesso Origin e gate F2–F3/F5. Non basta aggiungere una chiave al frontend o cambiare `configured` in `true`.

Ogni dominio e browser conserva un archivio IndexedDB distinto. Localhost, Vercel, Netlify, telefono e PC non condividono automaticamente i dati. Export delle schede JSON consente la copia; il backup personale di recupero va conservato privatamente. Evitare la cancellazione dello storage e mantenere il dominio negli aggiornamenti.

## 3. Scelte, alternative e configurazione

| Scelta | Perché | Limite / alternativa |
| --- | --- | --- |
| Build statica già compilata | Caricamento manuale semplice, nessuna dipendenza remota di build | Ogni aggiornamento richiede un nuovo pacchetto; Git/CLI permette una futura pipeline |
| Capacità anonima dichiarata | Riusa il Profilo esistente e rende esplicita l'assenza di cloud | Non sostituisce il backend; una funzione Netlify richiede adapter, configurazione e collaudo dedicati |
| `_redirects` nel contenuto pubblicato | Deep link SPA funzionanti, API e asset mancanti esclusi dal fallback | Non usare le stesse regole per la futura versione con server |
| `_headers` e asset con hash | CSP, noindex, JSON no-store, HTML/worker rivalidati, cache lunga solo per asset versionati | Header effettivi e aggiornamento PWA vanno controllati sul deploy reale |
| Pacchetto minimo | Esclude ambienti, password, vault, Excel personale, moduli e sorgenti | Per sviluppare usare il repository completo, che conserva entrambe le raccolte originali |

Le regole specifiche precedono `/* /index.html 200`. La sessione costante usa una riscrittura forzata; i guard degli asset lasciano prevalere i file realmente presenti. Non indicizzare l'alpha; `noindex` non è una protezione d'accesso. [Redirect e shadowing](https://docs.netlify.com/manage/routing/redirects/redirect-options/), [header dei file statici](https://docs.netlify.com/manage/routing/headers/).

## 4. Riproduzione su Windows

Dalla radice del repository, con Node/npm previsti dal progetto:

```powershell
npm ci
npm run build
node scripts/prepare-netlify-preview.mjs
```

L'ultimo comando stampa una directory nuova `.analysis/netlify-preview-<timestamp>/publish` e genera un inventario esterno con dimensioni e SHA-256. Non legge `.env` e non elimina pacchetti precedenti. Copia esclusivamente le estensioni statiche ammesse e rifiuta file non regolari.

Inserire il percorso effettivo stampato e un nome ZIP nuovo:

```powershell
$netlifyPublish = (Resolve-Path -LiteralPath '.analysis/netlify-preview-<timestamp>/publish').Path
$netlifyArchive = Join-Path (Get-Location).Path 'TR-LAB-Netlify-NUOVA-VERSIONE.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($netlifyPublish, $netlifyArchive)
```

La creazione non sovrascrive un archivio esistente e colloca `index.html` nella radice ZIP, senza una directory contenitore. I pacchetti e i metadati locali Netlify sono ignorati da Git. L'inventario resta fuori dalla cartella da caricare.

## 5. Tracciabilità e verifiche

Intervento `DEV-057`: confezionamento dell'alpha, collegato a RF-06/16/17/18, ADR-01/02/06/07, WEB-01/09/11/13 e specifica API/sync §9. Riferimenti QA-OFF-01/03, QA-SEC-04 e QA-UX-01: controllare installazione, riapertura offline, aggiornamenti e layout sul dominio risultante; il confezionamento non chiude questi casi.

Capitoli applicati: Appunti 00/01/06/08; Linee guida 00/01/07/08/09. Raccolte originali inalterate. Supabase e cookie HttpOnly non vengono sostituiti; nessun nuovo conflitto architetturale. SHA-256 identifica l'artefatto e non conserva password, coerentemente con la preparazione Vercel.

La build riutilizza il codice già verificato nel [rapporto dell'app](../qualita/REVISIONE_APP.md); solo il confezionamento cambia. Verificare inventario ZIP, integrità di tutti i file, presenza della shell/PWA e formato/lint dello script. Gli esiti specifici e il checksum sono nel [diario](../DIARIO_SVILUPPO.md). Nessun E2E Netlify, HTTPS/CDN o account Supabase viene dichiarato eseguito sulla base di un controllo locale dell'archivio.
