# Stato, database, sessioni e cookie

gestione dello stato:

Gestione dello stato ◼ le applicazioni web devono mantenere informazioni sugli utenti quando navigano: ◼ tra pagine diverse ◼ in tempi successivi (minuti, ore, giorni) ◼ vari motivi: ◼ preferenze utente (es. lingua, dimensione font) ◼ dati di business (es. carrello dei prodotti) ◼ problema con HTTP: ◼ HTTP/1.0 effettua singole transazioni ed è stateless ◼ versioni successive introducono "raggruppamenti" e maggior efficienza... ma il problema di gestire lo stato rimane • es, HTTP/1.1 permette transazioni multiple sulla stessa connessione ma è stateless tra connessioni successive

metodi per gestire lo stato:

Possibili metodi per gestire lo stato ◼ a livello di applicazione: ◼ URL rewriting- URL generate dinamicamente ◼ es. www.x.com/basket/12ab34/ ◼ tramite campi “nascosti” (type=hidden) di un form ◼ passati in modo "invisibile" (metodo POST) ◼ passati in modo visibile (metodo GET) – es. www.x.com/basket?id=12ab34 ◼ a livello di protocollo: ◼ cookie in HTTP ◼ sessioni ◼ lato server ◼ lato client (local storage)

perchè gestire lo stato http:

Perché gestire lo stato in HTTP? ◼ gestire lo stato senza modificare le URL ◼ gli utenti possono scambiarsi le URL tra loro (senza per questo scambiarsi lo stato) ◼ non si “sporcano” le cache intermedie con ◼ dati uguali ma corrispondenti ad URL diverse ◼ pagine diverse ma corrispondenti ad URL uguali ◼ minimizzare l’impatto sulla configurazione del server e dell’applicazione ◼ associare l’utente allo stato anche se è anonimo (es. non passa da portale di autenticazione) ◼ salvare lo stato in memoria permanente ◼ permane tra reboot, start/stop di UA, cambio di IP

i comendamenti utente cookie:

I comandamenti utente dei cookie ◼ è lecito mantenere traccia dello stato di una sessione HTTP se … ◼ 1) l’utente ne è conscio e consenziente ▪ informativa chiara e consenso esplicito per cookie non tecnici ▪ mitiga tracking inconsapevole e violazioni GDPR/ePrivacy ◼ 2) l’utente può cancellare lo stato quando vuole ▪ eliminazione semplice, revoca del consenso, logout reale ▪ mitiga persistenza indesiderata, profilazione continua ◼ 3) informazioni di stato non fornite a terzi senza consensoesp licito dell’utente ▪ evitare tracking cross-site, limitare third-party cookie ▪ mitiga advertising invasivo, profilazione multi-sito ◼ 4) le informazioni di stato non contengono dati sensibili e non posso essere usate per ottenere dati sensibili ▪ evitare password, evitare dati finanziari, evitare informazioni personali critiche ▪ mitiga furto dati, leakage lato client, manipolazione cookie ◼ 5) I cookie devono essere trasmessi solo su connessioni sicure ▪ usare HTTPS + attributo Secure ▪ mitiga packet sniffing, MITM, furto sessione su reti pubbliche ◼ 6) I cookie di autenticazione non devono essere accessibili da JavaScript ▪ usare HttpOnly ▪ mitiga furto di cookie (es, tramite XSS)

cookie:

Cookie ◼ scopo: memorizzare informazioni da parte del server in locale sul client in cui “gira” il browser ◼ in questo modo si alleggerisce il server ◼ ... ma si introducono elementi di: ◼ aleatorietà (=UA che non supporta/accetta cookie) ◼ rischio (=cookie letti/manipolati sul client o in rete) 1. store the cookie! 2. stored 3. here is the cookie!

caratteristiche dei cookie:

Caratteristiche dei cookie ◼ dati di piccole dimensioni registrati sul client (persistent information) e inviati al server ◼ cookie creati dal server sul client tramite header: ◼ Set-Cookie: ... ◼ cookie trasmessi dal client al server tramite header: ◼ Cookie: ... ◼ i cookie sono nel formato nome=valore ◼ salvati localmente dal browser (in un file) ◼ dati comunicati al server ai successivi accessi ◼ usati per creare un collegamento logico tra richieste HTTP diverse verso lo stesso server

limiti dei cookie:

Limiti dei cookie ◼ limitazioni riguardo il minimo numero di cookie che devono essere trattati ◼ totale minimo per user agent (su disco): ◼ una volta max 300 cookie, oggi gestito dinamicamente ◼ per server/dominio (su disco dell'UA, nella RAM del server ma solo per gli utenti simultanei): ◼ max da 50 a 200 cookie / client • poi cancellazione dei cookie più vecchi ◼ max 4 kB per cookie ◼ totale = 200-800 kB max / client

trasmissione dei cookie:

Trasmissione dei cookie (v1): S &gt; C ◼ cookie inserito nell’header della risposta HTTP ◼ sintassi del cookie: Set-Cookie: cookieName=cookieValue [ ; EXPIRES=dateValue ] [ ; MAX-AGE=seconds ] [ ; DOMAIN=domainName ] [ ; PATH=pathName ] [ ; SECURE ] [ ; SAMESITE=Strict|Lax|None ] [ ; HTTPONLY ]

valore e scadenza:

Cookie: valore e scadenza ◼ il nome del cookie ed il relativo valore sono stringhe qualsiasi: ◼ prive di virgola, punto-e-virgola e spazio ◼ tali caratteri devono essere espressi in esadecimale (%2C, %3B, %20) ◼ EXPIRES: data di scadenza dopo la quale il cookie può essere eliminato dal client ◼ formato RFC-822 Wdy, DD Mon YY hh:mm:ss GMT ◼ MAX-AGE: numero di secondi di validità del cookie ◼ prevale su expires ◼ se non viene specificata una scadenza, il cookie scade alla chiusura del browser (memorizzato non su disco ma in RAM: cookie volatile / temporaneo)

dominio, path, secure:

◼ DOMAIN indica il dominio autorizzato a gestire il cookie (ad es. polito.it) ◼ soltanto le richieste effettuate a tale dominio provocano la trasmissione del cookie ◼ se il dominio non è specificato, il browser usa il nome del server che ha mandato il cookie ◼ PATH indica il percorso in cui si è autorizzati a usare il cookie (ad es. /didattica/ ) ◼ soltanto le richieste a URL in tale percorso potranno provocare la trasmissione del cookie ◼ se il path non è specificato, il browser usa quello della URL che ha scatenato l'invio del cookie ◼ SECURE: cookie trasmesso solo su canale HTTPS

httponly e samesite:

Cookie: HttpOnly e SameSite ◼ HTTPONLY indica che il cookie non deve essere accessibile da javascript lato client ◼ senza, javascript può leggere i cookie (document.cookie) ◼ e quindi un eventuale script malevolo potrebbe rubare i dati, ed anche impersonare l'utente (rubando il session ID) ◼ SAMESITE controlla quando il browser può inviare il cookie in richieste provenienti da altri siti ◼ SameSite=Strict cookie inviato SOLO se la navigazione parte dallo stesso sito (massima sicurezza) ◼ SameSite=Lax cookie inviato in navigazioni “normali”, ma non in molte richieste automatiche cross-site (default nei browser) ◼ SameSite=None cookie inviato anche cross-site - Necessario per federated login, embedding, SSO, servizi terzi. • richiede obbligatoriamente Secure

trasmissione di un cookie:

Trasmissione di un cookie (V1): C &gt; S ◼ quando il browser sta per effettuare accesso ad una URL, controlla se esistono cookie associati al dominio e al percorso ◼ in caso affermativo include nell’header HTTP della richiesta tutte le coppie nome/valore dei relativi cookie ◼ se l’URL specificata nella richiesta HTTP è quella di una pagina dinamica (es. PHP), l'applicazione troverà la stringa dei cookie nella variabile d’ambiente HTTP_COOKIE Cookie: nome1=valore1; nome2=valore2

problema dei cookie:

Problemi dei cookie ◼ il meccanismo basato su cookie permette di creare profili degli utenti ◼ user tracking = termine usato per indicare la possibilità di tracciare i siti visitati da un utente e quindi le sue abitudini e i suoi interessi ◼ esempio: se un utente scarica un banner pubblicitario da un sito, oltre a ricevere un’immagine riceve anche un cookie ◼ per tutti i siti appartenenti al circuito è possibile impostare e recuperare il valore dei cookie riguardanti le preferenze di navigazione di un utente ◼ i cookie possono essere disabilitati sul browser ◼ autenticazione tramite cookie (es. siti commerciali che associano l’utente al carrello virtuale, one-click order) è fortemente sconsigliata: ◼ lettura dei cookie durante la trasmissione e sul client ◼ attacchi che permettono di intercettare i cookie: ◼ packet sniffing ◼ web spoofing ◼ attacchi al client (virus, worm, javascript, ...) ◼ sub-domain attack (quale parte del dominio è responsabile del servizio web che usa il cookie?)

Rifiuto di un cookie:

Rifiuto di un cookie:◼ lo UA può rifiutare un cookie per motivi di sicurezza se è "sospetto" ◼ rifiuti consigliati (RFC-2109, sezione 4.3.2): ◼ Path non è un prefisso della URI richiesta ◼ Domain non contiene punto o non inizia con punto ◼ Domain non contiene l'host della URI ◼ esempi di rifiuti per la URI http://a.b.com/test/x.html ◼ path=/pagamenti/ path non è prefisso della URI ◼ domain=b.com. domain non inizia con punto ◼ domain=.com. domain non contiene punto ◼ domain=.x.com domain non OK con host

Local Storage:

Local Storage ◼ salvare dati client-side (similmente ai cookie) ◼ persistente fino a cancellazione manuale/da codice ◼ Introdotto da HTML5 (Web Storage API) ◼ più spazioso dei cookie (5-10MB per dominio) ◼ esempi d'uso ▪ preferenze utente (es. tema scuro/chiaro) ▪ memorizzare dati di un carrello ▪ conservare stato dell’interfaccia in app SPA ▪ caching di risposte API per uso offline ◼ esempi di codice ▪ localStorage.setItem('username', 'alice'); ▪ localStorage.removeItem('username');

sessine server:

Sessione server ◼ generazione di un ID di sessione univoco ▪ associato a uno spazio di memorizzazione (es. Database o file) per salvare i dati dell’utente ◼ ID di sessione inviato al client ▪ il cookie con l'ID viene scambiato come un cookie ▪ Il server tiene traccia dei dati inerenti quella sessione ◼ esempi d'uso: ▪ informazioni utente (es. ID, nome) ▪ carrello acquisti ▪ permessi o ruoli ▪ stato di avanzamento (es, quiz per un esame) ◼ maggiore sicurezza dei dati memorizzati

Gestione dei cookie in PHP:

Gestione dei cookie in PHP ◼ meccanismo per memorizzare dati nel browser remoto ▪ es. tenere traccia degli utenti o identificarli al loro ritorno ◼ PHP supporta i cookie in maniera trasparente ▪ $_COOKIE contiene i cookie inviati dal browser • manipolazione dei cookie ricevuti ▪ setcookie( ) (e setrawcookie( )) creano un cookie coi parametri indicati • servono ad inviare cookie al browser (con e senza codifica automatica, rispettivamente) • assenza di codifica utile quando il dato non deve esser modificato (es, payload json) ◼ impostazione dei cookie prima di output HTML ▪ perché modifica l'header del pacchetto HTTP (e genera err)

Funzione setcookie( ) ◼ restituisce Boolean (TRUE se OK, altrimenti FALSE) ◼ tutti i parametri sono opzionali tranne "name" ◼ per saltare un parametro usare la stringa vuota o l'intero zero (a seconda del tipo) ◼ parametri (nell'ordine): ◼ string name, string value = nome e valore del cookie ◼ int expire = scadenza (secondi da Unix Epoch) ◼ string path = path virtuale della risorsa sul server ◼ string domain = dominio del cookie ◼ bool secure = trasmissibile solo in modo sicuro ◼ bool httponly = usabile solo da HTTP ◼ options è un array associativo che può avere come chiave expires, path, domain, secure, httponly e samesite

Funzioni time( ) e mktime( ) ◼ utili per impostare la data di scadenza dei cookie visto che PHP usa la Unix Epoch: ◼ 1/1/1970 00:00:00 GMT ◼ int time( ) ◼ secondi da Unix Epoch all'istante attuale ◼ int mktime (ora,minuti,secondi, mese,giorno,anno) ◼ secondi da Unix Epoch alla data indicata ◼ si possono omettere parametri da destra a sinistra e saranno considerati come i valori attuali

gestione delle sessioni:

Gestione delle sessioni ◼ disponibile da PHP 4.1 ◼ mantiene informazioni sulla sessione attiva di un client, ad esempio: ◼ il nome utente dopo un login ◼ le preferenze (lingua di visita o dimensione font grosso) di un utente anonimo ◼ tiene traccia dei movimenti di un client ◼ informazioni associate ad un cookie volatile, in maniera trasparente per il programmatore ◼ nome di default PHPSESSID ◼ se i cookie non sono disponibili, parametri passati in GET (pericolo!) ◼ Astrazione in PHP tramite array $_SESSION ◼ un flusso "robusto" di programmazione consiste nel ◼ verificare se le sessioni siano disponibili • per configurazione del server (indipendente dal programmatore) potrebbero non esserlo ◼ se disponibili, inizializzare la sessione • apposita funzione PHP session_start() ◼ "usare" la sessione • cioè memorizzare e accedere le informazioni di sessione, tramite array $_SESSION ◼ distruggere la sessione • per evitare permanenza di eventuali dati sensibili int session_status ( void ) ◼ possibili risultati ◼ PHP_SESSION_DISABLED ◼ PHP_SESSION_NONE nessuna sessione attiva ◼ PHP_SESSION_ACTIVE c’è una sessione attiva ◼ bool session_start( void ) ◼ deve essere richiamata prima di qualsiasi output ◼ perché manipola il cookie nell'header ◼ crea una nuova sessione (o usa quella esistente) ◼ string session_name ( [ string newname ] ) ◼ restituisce (o imposta) il nome del cookie associato alla sessione (default: PHPSESSID) ◼ da richiamare prima di session_start() $_SESSION[ " var " ] = valore ◼ registra la variabile $var nella sessione corrente e le assegna il valore indicato ◼ unset( $_SESSION[ "var" ] ) ◼ cancella la variabile $var dalla sessione corrente ◼ void session_write_close( void ) ◼ salva i dati della sessione e la chiude ◼ fatto automaticamente al termine dello script ◼ c’è un lock sui dati della sessione finché non si chiama questa funzione (problema con accesso concorrente, ad esempio tramite vari frame) ◼ bool session_destroy( void ) ◼ cancella i dati associati alla sessione ◼ … ma non l’ID ◼ … e neanche le variabili in $_SESSION ◼ string session_id( void ) ◼ restituisce l’identificativo della sessione (se esiste) altrimenti la stringa vuota ◼ identificativo disponibile anche come SID ◼ string session_id( string id ) ◼ fissa l’identificativo della sessione ◼ da chiamarsi prima di session_start( ) ◼ bool session_regenerate_id ( [ bool delete_old_session ] ) ◼ crea un nuovo identificativo della sessione ◼ opzionalmente cancella i dati associati alla vecchia sessione (default = false) ◼ int session_cache_expire (int time) ◼ specifica un timeout in minuti (default 180’) ◼ un valore piccolo (es. minore di 4’) fa perdere lo stato, troppo grande sovraccarica il server ◼ da chiamare prima di avviare la sessione

quando preferire l'uso di sessioni:

◼ dati sensibili (es, credenziali di accesso) ▪ il contenuto della sessione è memorizzato sul server ▪ meno possibilità di manipolazione da parte dell'utente finale ◼ per dati temporanei (utili fino alla chiusura del browser) o per scadenze gestite in maniera centralizzata ▪ i cookie possono persistere dopo la chiusura del browser ◼ dimensione maggiori dei dati ▪ assenza limitazione dei dati rispetto ai cookie

php e database:

PHP e database ◼ PHP supporta molti DBMS: ◼ dbm, dBase, FrontBase, filePro, Informix, Interbase, Ingres II, Microsoft SQL Server, mSQL, MySQL, ODB, Oracle 8, Ovrimos, PostgreSQL, SESAM, SQLite, Sybase ◼ per ciascun DBMS esiste un’API dedicata (simile ma non identica per tutti i DBMS) ◼ esistono anche librerie di alto livello (es. PEAR DB, PDO) per accedere in modo uniforme a qualunque DBMS

terminologia:

◼ connessione ◼ canale tra l’interprete PHP ed uno specifico DBMS ◼ query ◼ comando SQL emesso dall’interprete PHP verso il DBMS tramite una connessione aperta ◼ result set ◼ una tabella (virtuale) coi risultati di una query ◼ un result set NON è trasferito automaticamente all’interprete PHP e non c’è garanzia che sia memorizzato nel DB (ossia è volatile) ◼ riga (row) ◼ la componente elementare di un result set

interfaccia mySqli:

Interfaccia MySQLi ◼ versione migliorata (i = improved) dell'interfaccia MySQL di basso livello ◼ accesso diretto a SQL ◼ doppia interfaccia: ◼ procedurale ◼ ad oggetti ◼ supporto dei prepared statement ◼ molto importanti per prestazioni e sicurezza

connesione al dbms:

Connessione al DBMS ◼ si crea con la funzione $con = mysqli_connect( server, username, password, database, port, socket ) ◼ restituisce un oggetto che rappresenta la connessione al DBMS (o NULL in caso di errore) ◼ il numero associato all'errore (zero se no errori): int mysqli_connect_errno( void ) ◼ la descrizione testuale dell'errore: string mysqli_connect_error( void ) ◼ chiusura della connessione: boolean mysqli_close( con )

codifica della connesione:

codifica della connessione ◼ PHP comunica con il DB (es. invia stringhe) ◼ DB memorizza stringhe con una codifica precisa ◼ HTML (anche derivante da PHP) visualizza i dati all’utente ◼ se questi strati non usano lo stesso charset, i dati rischiano di essere interpretati male ▪ caratteri accentati che diventano   o ? ◼ dati che appaiono correttamente nel database ma corrotti nel browser (o viceversa) ◼ comparazione e ricerca di testo che non funziona ◼ string mysqli_character_set_name( $con ) ▪ restituisce la codifica della connessione ◼ mysqli_set_charset($con, "utf8mb4"); ▪ Imposta la codifica della connessione a utf8 (default di MySQL)

organizzazione di una query:

Organizzazione di una query ◼ ciascuna query è composta di 4 fasi (3 + 1): ◼ preparazione = costruzione di una stringa contenente il comando SQL da eseguire ◼ esecuzione = invio del comando SQL al DBMS, generazione e ricezione del result set ◼ estrazione = lettura dei dati presenti nel result set ◼ formattazione = costruzione del codice HTML per visualizzare i risultati nella pagina ◼ estrazione e formattazione solitamente sono organizzate in un ciclo (while o for) ◼ la formattazione è opzionale, dipende dalle esigenze (presentazione o uso per altre funzioni)

Query: preparazione ◼ comando SQL fisso ◼ esempi $query = "SELECT login FROM utenti"; $query = "INSERT INTO utenti (login, password) VALUES ('pippo', 'xyz')"; ◼ comando SQL con valori variabili ◼ esempio: $query = "SELECT login FROM utenti WHERE password = '" . $password . "'" ; ◼ si usa l’operatore di concatenazione (.) per inserire variabili PHP nella query SQL (N.B. usare gli apici singoli '…' intorno ad ogni stringa)

Query: esecuzione ◼ una volta preparata, è sufficiente inviare la query SQL al DBMS, usando la connessione attiva ed il database attualmente selezionato: $result = mysqli_query($con, $query) ◼ per le query di tipo INSERT, DELETE o UPDATE il lavoro è terminato ◼ per le query di tipo SELECT occorre estrarre ed analizzare il result set ◼ il valore di ritorno è un “riferimento” al result set attraverso cui si arriva al risultato vero e proprio ◼ liberare la memoria una volta esaminato il risultato mysqli_free_result($result)

Query: estrazione ◼ si basa sulla funzione array mysqli_fetch_assoc( rset ) ◼ rset è il result set ottenuto da mysqli_query ◼ il risultato è un array associativo ◼ indici = nomi dei campi ◼ ad ogni chiamata restituisce: ◼ un array coi valori della prossima riga del result set ◼ oppure NULL quando è terminato il result set ◼ numero di elementi nel result set dato da int mysqli_num_rows( rset )

prepared statement:

Prepared statement (I) ◼ sono query SQL con struttura fissa ma dati variabili (di input e/o di output) ◼ MOLTO utile per prevenire attacchi SQL injection ◼ creazione di un prepared statement: stmt = mysqli_prepare( conn, query* ) ◼ query* può contenere ? per i dati variabili ◼ dati associati a variabili tramite: mysqli_stmt_bind_param(stmt,types,vars) ◼ vars è l'elenco delle variabili da associare e types è una stringa che ne specifica ordinatamente il tipo: ◼ i = integer, d = double, s = string

◼ esecuzione di un prepared statement: mysqli_stmt_execute( stmt ) ◼ associazione del risultato (tutti i campi!) a variabili: mysqli_stmt_bind_result( stmt, vars ) ◼ caricamento dei valori del risultato nelle variabili: mysqli_stmt_fetch( stmt ) ◼ termine uso di un prepared statement: mysqli_stmt_close( stmt ) ◼ funzioni per gestione errori: int mysqli_stmt_errno( statement ) string mysqli_stmt_error( statement )
