# Programmazione in ambiente web

World Wide Web (WWW):

anche abbreviato semplicemente“web” ◼ insieme di: ◼ protocolli di comunicazione ◼ formati dati ◼ appoggiato su canali TCP/IP IP TCP HTTP FTP HTML CSS JS XHTML PNG protocolli

Protocolli per il web:

in origine, usabili molti protocolli già esistenti (es. FTP) ◼ limitazioni / complicazioni perché non pensati per il web ◼ Utilizzabili per funzioni specifiche (es. con FTP solo GET e PUT di file) ◼ venne poi definito un nuovo protocollo applicativo: ◼ HTTP ◼ oggi praticamente usato per la maggior parte delle trasmissioni di info sul web

Il web statico:

pagina web non varia mai il suo contenuto ◼ … finché l’autore non la cambia esplicitamente ◼ il contenuto della pagina: ◼ non dipende dall’interazione con l’utente ◼ non dipende dalle informazioni inviate al server dal client ◼ non dipende dall’istante di tempo o dal luogo (del browser) in cui viene richiesta ◼ pagina implementata in HTML / CSS

pro e contro ◼ ad ogni pagina web corrisponde un file HTML ◼ (+) massima efficienza (basso carico di CPU) ◼ (+) possibilità di fare caching delle pagine: ◼ in RAM (sul server) o su disco (sul client o proxy) ◼ sul server ◼ sul client ◼ sui proxy ◼ (+) pagine indicizzabili dai motori di ricerca ◼ (–) staticità dei dati ◼ (–) nessuna adattabilità ai client ed alle loro capacità

Prestazioni ◼ valutare l'esperienza utente per evitare frustrazione degli utenti e alto tasso di abbandono (bounce rate) ◼ velocità di caricamento • anche meno di un secondo può influire sulla percezione ◼ interattività • risposte lente alle molteplici azioni utente (es. click) danno senso di sito di basso livello ◼ valutare l'impatto del traffico di rete • ottimizzare gli scambi dati, valutare se modificare le dimensioni e numero di richieste/risposte, considerare condizioni di stress • compressione e caching

Velocità di caricamento ◼ Componenti principali ▪ interazione di rete (DNS lookup, TCP handshake) ▪ trasferimento dati "utente" ▪ rendering ◼ Modello semplificato ▪ tempo totale T=T_latenza+(dimensione_dato/banda_trasm) ◼ Esempio: ▪ dimensione: 1.5 MB, banda: 20 Mbps , latenza: 100 ms • trasferimento: 12/20=0.6 s • tempo totale: T=0.1+0.6=0.7s ▪ se dimensione pari a 4MB? • Tempo totale: 32/20+0.1 =1.7s (peggioramento percepibile)

SEO e visibilità ◼ Search Engine Optimization ◼ tecniche utilizzate per migliorare la visibilità e il posizionamento di un sito web nei risultati organici (non a pagamento) dei motori di ricerca • contenuti richiesti, tag appropriati (&lt;h1&gt;,&lt;h2&gt;, alt, …) • keyword, meta tag • backlink, citazioni ◼ I motori di ricerca usano anche velocità di caricamento come fattore di ranking • Core Web Vitals (Google) ◼ LCP (Layout Contentful Paint): velocità di caricamento ◼ INP(Interaction to Next Paint): reattività delle pagine ◼ CLS (Cumulative Layout Shift): stabilità della pagina

Tipologia di SEO ◼ On-Page SEO ◼ tutto ciò che riguarda il contenuto e la struttura tecnica della singola pagina (HTML, keyword, meta tag, velocità, ecc.) ◼ Off-Page SEO ◼ fattori esterni al sito, come i backlink provenienti da altri domini e le citazioni del brand sul web ◼ Technical SEO ◼ l'architettura tecnica che consente ai crawler dei motori di indicizzare correttamente il sito (sitemap, robots.txt, HTTPS, Core Web Vitals, ecc.) ◼ Google pubblica linee guida ufficiali (Google Search Essentials) e comunicati tecnici (Google Search Central Blog) ◼ fonte autorevole per comprendere fattori del SEO

On-page SEO ◼ Semantica HTML e la Gerarchia dei Contenuti ◼ &lt;h1&gt; titolo principale della pagina- Corrisponde all'argomento centrale del documento • deve essere unico per pagina ◼ &lt;h2&gt; a &lt;h6&gt; (sezioni principali, sottosezioni, e così via), aiuta a individuare i sotto-argomenti trattati • Non saltare livelli gerarchici (es. da &lt;h1&gt; a &lt;h4&gt;) • Inserire keyword correlate (LSI – Latent Semantic Indexing) all'argomento principale • copertura tematica completa (topical authority) degli &lt;h2&gt;

On-page SEO ◼ Meta robots (&lt;meta name="robots" content="index, follow"&gt; ) controlla l'indicizzazione e il crawling • index/noindex: permette/vieta l'inserimento della pagina nell'indice • follow/nofollow: permette/vieta al crawler di seguire i link presenti nella pagina • noarchive: impedisce a Google di mostrare una versione cache della pagina ◼ nosnippet: impedisce la visualizzazione di snippet nella SERP (Search Engine Results Page)

Off-page SEO - PageRank o Backlink e citazioni ◼ collegamenti ipertestuali che partono da un sito esterno ◼ interpretati come 'voti di fiducia' • "se un sito affidabile linka il tuo, significa che i tuoi contenuti sono considerati rilevanti e di qualità" ◼ PageRank (PR) ◼ una funzione di quantità e qualità dei link ricevuti ◼ Formula concettuale: PR(A) = (1-d) + d × Σ [ PR(Ti) / C(Ti) ] • d = fattore di smorzamento (~0.85), • Ti = pagine che linkano ad A • C(Ti) = numero di link uscenti dalla pagina Ti ◼ Il PageRank si 'propaga' tra le pagine: ogni link trasmette una frazione del PR della pagina sorgente.

Technical SEO o Dal 2018 Google utilizza velocità di caricamento come fattore ◼ pagine lente offrono un'esperienza utente scadente ◼ consumano più risorse dei crawler (crawl budget) o Ottimizzazione delle immagini ◼ Formato: es. JPEG, WebP o AVIF ◼ Responsive images: es. srcset per servire immagini dimensionate al dispositivo dell'utente ◼ lazy loading: &lt;img loading="lazy"&gt; carica le immagini solo quando entrano nel viewport (riducepeso iniziale della pagina) ◼ Compressione/ottimizzazione (es, ImageOptim, rimozione profili di colore, metadati etc) possono ridurre ulteriormente

Ottimizzazione di CSS e JavaScript ◼ Minification: rimozione di spazi, commenti e caratteri superflui da CSS e JS ◼ Bundling: aggregazione di più file in uno solo per ridurre le richieste HTTP ◼ Code splitting: caricamento del JavaScript solo quando necessario (lazy loading del codice) ◼ Critical CSS: inline del CSS necessario per il rendering abovethe-fold (parte visibile senza scorrimento) per evitare il renderblocking ◼ defer e async: attributi per script JS che impediscono il blocco del parsing HTML

core web vitals

Core Web Vitals ◼ Insieme di metriche standardizzate definite da Google per misurare l'esperienza utente reale (User Experience – UX) ◼ da 05/2021 (Page Experience Update) fattori di ranking. ◼ misurano esperienze percepite dall'utente ◼ velocità, interattività, stabilità visiva ◼ non parametri oggettivi • a.k.a. metriche tecniche di laboratorio. ◼ la metrica deve essere nella soglia 'buona' per almeno il 75% delle sessioni degli utenti. ◼ ottimizzare solo per i casi medi non è sufficiente

LCP (Largest Contentful Paint) ◼ tempo necessario affinché l'elemento di contenuto più grande visibile nel viewport venga renderizzato ◼ rappresenta la percezione dell'utente di quando il contenuto principale della pagina è 'pronto' • Esempi tag candidati: &lt;p&gt;, &lt;h1&gt;, &lt;div&gt; &lt;img&gt;, &lt;image&gt; (dentro svg), ... ◼ Il browser calcola l'LCP monitorando continuamente la dimensione degli elementi durante il caricamento ◼ LCP finale quello dell'elemento più grande registrato prima del primo input dell'utente (click, scroll, tap). • ≤ 2.5 secondi = buono • 2.5 – 4.0 secondi = da migliorare • &gt; 4.0 secondi = scarso

INP – Interaction to Next Paint ◼ 98° percentile delle latenze dellle interazioni di una sessione • o la peggiore se le interazioni sono meno di 50 ◼ Tecnicamente misura il tempo tra • evento di input dell'utente (mousedown, pointerdown, keydown) • completamento del rendering successivo (il frame in cui il browser mostra visivamente la risposta) • ≤ 200 ms = buono • 200 – 500 ms = da migliorare • &gt; 500 ms = scarso ◼ causa principale: codice javascript bloccante e lungo

CLS - Cumulative Layout Shift ◼ La stabilità visiva della pagina • quanto gli elementi della pagina si spostano inaspettatamente • durante il caricamento o la navigazione ◼ CLS alto indica che i contenuti 'saltano' visivamente mentre l'utente interagisce con la pagina ◼ Somma di tutti i layout shift individuali ◼ Layout shift=impact fraction*distance fraction ◼ Impact fraction= % della viewport influenzata dallo spostamento ◼ distance fraction= massima distanza percorsa da un elemento instabile - espressa in frazione della dimensione del viewport

Esempio di CLS ◼ un elemento occupa il 50% del viewport (impact fraction = 0.5) ◼ si sposta del 25% verso il basso (distance fraction = 0.25). ◼ layout shift score = 0.5 × 0.25 = 0.125. ◼ Se questo è l'unico shift, il CLS totale è 0.125 ◼ Soglie di CLS • ≤ 0.1 = buono • 0.1 – 0.25 = da migliorare • &gt; 0.25 = scarso ◼ cause comuni di ritardo: immagini senza dimensioni definite, banner pubblicitari (iniettati dinamicamente) e in generale iniezione dinamica dei contenuti

agent, server, proxy e gateway:

User Agent = browser (ma anche spider, robot, …) ◼ Origin Server = fornitore del servizio desiderato ◼ possibile avere elementi intermedi tra UA ed OS che fungono sia da client sia da server: ◼ Proxy lato server/gateway ◼ interfaccia pubblica per server ◼ es. per sicurezza o load balancing ◼ proxy lato client ◼ lavora per conto dei client ◼ inoltra la domanda al server o risponde lui stesso tramite una cache ◼ anche per autenticazione / autorizzazione

cache http:

permette al proxy (o browser) di riutilizzare risposte già ottenute senza contattare il server ◼ influenzata da header HTTP ◼ Cache-Control • se e per quanto tempo una risposta può essere riutilizzata • se permessa cache, l'agente risponde subito (cache hit) • se vietata ogni richiesta va al server (più lenta) • Cache-Control: public, max-age=3600 ◼ risorsa riusabile per 1 ora senza nuove richieste ◼ ETag • definisce ID della risorsa e permette di verificare se cambiata • es: client manda l’ETag, se server risponde 304 Not Modified client usa cache ◼ Last-Modified (indica data ultima modifica, effetto simile a ETag)

web statico con pagine dinamiche

il client elabora il contenuto dinamico della pagina (script client-side, applet Java o controlli Active-X)

pagina varia il suo contenuto in relazione all’interazione con l’utente ◼ es. menù a tendina che appare quando il mouse transita su una particolare area ◼ si parla genericamente di DHTML: ◼ HTML 4.0 o superiore ◼ CSS (Cascaded Style Sheet) ◼ In generale, possibilità di eseguire codice lato client • oggi, sostanzialmente linguaggio di script lato client

pro e contro ◼ presentazione del contenuto variabile ◼ (+) funzionalità più ricca e miglior interazione con l’utente ◼ (+) efficiente (basso carico di CPU sul server) ◼ (–) inefficiente (medio-alto carico di CPU sul client, specie per gli applet) ◼ (~) possibilità di fare caching delle pagine ◼ (~) pagine indicizzabili dai motori di ricerca (ma solo i dati statici …) ◼ (–) staticità dei dati ◼ (–) funzionalità dipende dalla capacità del client (linguaggi di scripting, tipi di applet, CPU, RAM, …)

Modello delle prestazioni nel web statico con pagine dinamiche ◼ poca differenza con web statico per la parte di rete e lato server ◼ maggior carico computazionale e di memoria lato client: ◼ dipende dalla tecnologia dinamica scelta ◼ carico crescente per ◼ CSS ◼ script lato client ◼ dipende dalle scelte architetturali adottate/strategia di rendering ◼ script bloccanti provoca ritardo rendering ◼ CSS pesante provoca ritardo nel disegno degli elementi

Client-side scripting: a cosa serve ? ◼ generare dinamicamente parte della pagina HTML ◼ adattamento al browser o preferenze dell’utente ◼ alterare dinamicamente la pagina HTML ◼ AJAX (Asynchronous Javascript And XML) per non ricaricare completamente la pagina dal server ◼ eseguire una funzione associata ad un evento scatenato dall’interazione con la pagina: ◼ es. al completamento di un form, validare i dati prima di inviarli al server ◼ si risparmia traffico inutile sulla rete ◼ si semplifica l’applicazione server-side ◼ ma ... attenzione al rischio di ricevere dati errati!

minification:

rimozione di tutti i caratteri non necessari dal codice sorgente (principalmente HTML, CSS e JavaScript) ◼ senza alterarne la funzionalità logica ◼ vengono rimossi ◼ spazi vuoti e interruzioni di riga (new lines). ◼ commenti degli sviluppatori ◼ nomi di variabili e funzioni (spesso abbreviati in singole lettere - mangling). ◼ delimitatori di blocco non necessari

+ Il file finale può pesare dal 30% al 70% in meno ◼ risparmio banda, FCP e SEO migliorati - - peggioramento leggibilità ◼ difficilmente interpretabile e debuggabile per un essere umano • può richiedere ulteriori strumenti per identificazione e gestione del progetto di sviluppo

◼ parsing (Analisi Sintattica) ▪ il minifier trasforma codice in un AST (Abstract Syntax Tree) ▪ il codice diventa una mappa gerarchica che descrive la logica ◼ trasformazione e ottimizzazione ▪ "dead code elimination" - rimozione codice non eseguite • (es. funzioni dichiarate ma mai chiamate). ▪ "constant folding" – calcolo espressioni costanti • es da const x = 60*60*24; a const x = 86400; ▪ mangling - ridenominazione (di variabili con nomi corposi) • Es utenteLoggato diventa u • Il minifier tiene traccia degli "scope" per evitare conflitti ▪ Inlining: sostituzione di funzioni piccole/poco usate è molto il • viene inserito il codice direttamente dove viene chiamata

◼ generazione del codice ▪ AST ottimizzato viene riconvertito in testo ▪ rimozione di tutti gli spazi bianchi, commenti e nuove linee ▪ sostituzione di strutture verbose con versioni brevi (es. un if/else trasformato in un operatore ternario ? :). ◼ poiché l'algoritmo stravolge il codice (cambiando nomi e righe), viene generato un file .map. ▪ permette al browser di "mappare" il codice illeggibile in produzione con il codice originale ▪ facilita il debugging del codice di produzione senza sacrificare le performance

◼ azioni del minifier ▪ cambio dei parametri: controllaEtà in c e anni in a. ▪ abbreviazione della logica: • l' if può essere trasformato in un operatore ternario per risparmiare byte. ▪ rimozione di blocchi inutili: rimuove le parentesi graffe {} se non sono strettamente necessarie ◼ Nota: Se l'AST rivelasse funzione chiamata sempre con valore fisso (es. controllaEtà(20)) eliminerebbe l'intero nodo IfStatement e la logica di controllo, sostituendo direttamente la chiamata alla funzione con la stringa "Accesso consentito".

Problemi di sicurezza degli script client-side ◼ codice trasmesso dal server al browser ◼ potrebbe essere modificato dal client ... ◼ script leggibile dal client ◼ non registrare dati riservati dentro lo script (es. verifica password, risposta giusta per un test) ◼ codice (potenzialmente non fidato!) eseguito sul client ◼ possibili azioni dannose, da semplici (es. cambio impostazioni, alterazione del DOM) a complesse (es. lettura dati introdotti o locali, trasmissione a terzi ◼ attacchi noti e diffusi come XSS (iniezione di codice malevolo), Denial of service

Funzionalità di sicurezza di JS ◼ per javascript nel Browser, set di funzionalità limitato ◼ il codice JavaScript NON può: ◼ leggere o modificare file sul sistema client ◼ per evitare navigazione/alterazione delle risorse locali (ma possibile inviare/salvare file locali) ◼ lanciare in esecuzione altri programmi (per evitare exploit di malware) ◼ effettuare richieste di rete in modo arbitrario ◼ esistono XMLHttpRequest e Fetch (più recente) per inviare e ricevere risorse web (HTML, immagini, …) con limitazioni CORS (Cross-Origin Resource Sharing) ◼ eseguire multithreading ◼ è single-thread per natura, anche se il browser ammette possibilità asincrone (come i Web Workers)

◼ Nel caso precedente, tutto gira sul Main Thread ◼ se il calcolo richiede 5 secondi, la pagina sarà "morta" per 5 secondi ◼ meglio separare per il calcolo ◼ thread principale delega il lavoro e resta libero di gestire l'interfaccia utente ◼ file worker.js che contiene la logica pesante (senza poter accedere al DOM) ◼ file main.js che gestisce l'interfaccia utente

web dinammico:

Web dinamico ◼ pagina generata dal server in modo dinamico ◼ varia il suo contenuto informativo in base a diverse variabili: ◼ richieste inviate dall’utente (es. campi di un form) ◼ contenuto di un database ◼ istante di tempo in cui avviene la richiesta • anche solo l'indicazione dell'ora :) ◼ permette interattività, personalizzazione, aggiornamento in tempo reale

◼ principali tecniche per realizzare il web dinamico: ◼ SSI (Server Side Include) • inclusione dinamica di contenuti • utile per operazioni semplici (es, inclusione di parti comuni) ◼ JSP (Java Server Pages) • pagine con codice Java incorporato • legacy n Servlet e framework moderni (Spring Boot, Jakarta EE) • ancora usato in ambienti enterprise/bancario ◼ linguaggi di script lato server (JavaScript, PHP, Ruby, Python, ...) e relativi framework e librerie (Express/Next.js, Laravel PHP)

pro e contro ◼ adattamento delle pagine a condizioni variabili: ◼ input fornito dal client ◼ capacità del client ◼ (+) massima dinamicità dei dati ◼ (+) ottima adattabilità ai client ed alle loro capacità ◼ (+) integrabilità con altri servizi ◼ analytics, social login, API terze, ... ◼ (–) bassa efficienza (alto carico di CPU) ◼ (–) impossibile fare caching delle pagine se i parametri di selezione non sono nella URL ◼ possibili errori se il caching è attivato ◼ (–) pagine non indicizzabili dai motori di ricerca ◼ (–) maggiore rischio di avere vulnerabilità

Output generato da applicazioni lato server ◼ l’applicazione deve restituire output valido ◼ HTML (completamente valido) ◼ JSON - API REST moderne ◼ XML - ancora usato in contesti enterprise e SOAP ◼ CSV, PDF, immagini - download e export ◼ niente - per operazioni che non restituiscono dati (es. una DELETE - codice HTTP "204 No Content")

Output generato da applicazioni lato server (II) ◼ l’applicazione deve restituire anche parte degli header HTTP, ad esempio ◼ Content-Type: tipo MIME della risposta ◼ text/html; charset=UTF-8 - application/json - application/pdf ◼ Location: indica ove presente una risorsa ◼ https://esempio.com/nuova-pagina (il server invia un redirect al client alla nuova risorsa) ◼ Cache-Control: indica per quanto la risposta sia riutilizzabile ◼ max-age=3600 ◼ ...e diversi altri per gestire sessioni e sicurezza ◼ Status: il server lo usa come status code nel suo header

codice di stato http

Codice di stato HTTP ◼ tutte le risposte contengono un codice di stato di 3 cifre XYZ ◼ la prima cifra (X) fornisce il major status dell’azione richiesta ◼ X=1 : informational ◼ X=2 : success ◼ X=3 : redirection ◼ X=4 : client error ◼ X=5 : server error ◼ seconda e terza cifra affinano lo stato

Esempi di codici di stato standard HTTP 100 Continue (Il server ha ricevuto gli header, il client può inviare il body) 101 Switching protocols (cambio a protocollo diverso – es webSocket) 200 OK 201 Created (es, POST) 202 Accepted (richiesta accettata) 203 Non-authoritative information (body non proveniente da server origin) 204 No content (niente da restituire) 205 Reset content (il server chiede il reset al client, es, di un form) 206 Partial content (risposta ricevuta in parte, come richiesto del client) 300 Multiple choices (risorsa possibile in più formati – scelta data al client) 301 Moved permanently 302 Found (spostata temporaneamente) 303 See other (risposta altrove, da reperire con GET) 304 Not modified 400 Bad request (richiesta malformata) 401 Unauthorized (non autenticato) 403 Forbidden (non autorizzato) 404 Not found 405 Method not allowed (HTTP) 422 Unprocessable Entity (dati errati – validazione fallita es. JSON invalido) 500 Internal server error 501 Not implemented 502 Bad gateway (proxy intermediario non riceve risposta da origin) 503 Service unavailable

redirect:

Redirect ◼ se l’oggetto richiesto non è disponibile alla URI indicata, il server può indicare la nuova URI tramite una risposta con codice 3xx e header Location: nuova-URI ◼ il browser può: ◼ connettere automaticamente il client alla nuova URI se il metodo richiesto era GET o HEAD … ◼ … mentre gli è vietato farlo se il metodo era POST ◼ per supportare i browser vecchi (= che non capiscono Redirect) o pigri si consiglia di inviare nella risposta un body costituito da una pagina HTML che fornisca la nuova URL in modo comprensibile da un essere umano

server side scripting

Server-side scripting ◼ tecnologie differenti, ma caratterizzate codice di scripting mescolato con il template HTML + client-side scripting ◼ JS/Node.js ◼ per usare javascript sia su client che su server (full-stack) ◼ adatto ad applicazioni realt-time/alto throughput ◼ ASP.NET ◼ derivato dallo storico ASP microsoft ◼ soprattutto in versione "Core", open source e cross-platform ◼ PHP ◼ open source e nato originariamente per Apache, oggi diffuso su più di metà dei server web attivi ◼ Python ◼ framework potenti ne rendono lo sviluppo veloce ed efficiente

server side o client side

Server-side o client-side? ◼ server-side: ◼ (pro) maggiore sicurezza ◼ (con) sovraccarico del server ◼ client-side: ◼ (pro) elaborazione sul client (scarico il server) ◼ (con) capacità del client (funzionalità e prestazioni) ◼ (con) minore sicurezza (manipolabile dall’utente) ◼ in generale: ◼ meglio server-side per sicurezza e funzionalità ◼ meglio client-side per migliorare le prestazioni ◼ spesso si usano entrambi simultaneamente
