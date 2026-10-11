# Stato, database, sessioni e cookie

qual è il modo migliore di gestire lo stato?

mantenere traccia dello stato di una sessione HTTP se :l’utente ne è conscio e consenziente, l’utente può cancellare lo stato quando vuole, informazioni di stato non fornite a terzi senza consenso implicito dell’utente, le informazioni di stato non contengono dati sensibili e non posso essere usate per ottenere dati sensibili, I cookie devono essere trasmessi solo su connessioni sicure, I cookie di autenticazione non devono essere accessibili da JavaScript.

usare se serve: EXPIRES,MAX-AGE,DOMAIN, PATH , SECURE, HTTPONLY, SameSite

utilizzo adeguato dei cookie

informativa chiara e consenso esplicito per i cookie non tecnici

che problemi vado incontro alla privacy?

rifiuti consigliati (RFC-2109, sezione 4.3.2)

Local Storage: preferenze utente (es. tema scuro/chiaro), memorizzare dati di un carrello, conservare stato dell’interfaccia in app SPA, caching di risposte API per uso offline, ecc.

Sessione server: informazioni utente (es. ID, nome), carrello acquisti, permessi o ruoli, stato di avanzamento (es, quiz per un esame).

Gestione delle sessioni: flusso robusto: verificare se le sessioni siano disponibili, se disponibili, inizializzare la sessione, usare la sessione, distruggere la sessione.

Quando preferire l'uso di sessione ai cookie: dati sensibili , dati temporanei o per scadenze gestite in maniera centralizzata, dimensione maggiori dei dati.

prepared statement per prevenire sql injection.

HTTP/1.1 `keep-alive`: più richieste possono viaggiare sulla stessa connessione TCP, evitando di riaprirla ogni volta. Questo migliora l'efficienza.

se il dato è sul client, è manipolabile e intercettabile; se è sul server, è più sicuro ma costa memoria al server.

gestire lo stato senza modificare le URL

usare MySQLi.

rispettare i sei "comandamenti" d'uso dei cookie (consenso, cancellabilità, niente terzi, niente dati sensibili, connessioni sicure, niente accesso da JS per i cookie di autenticazione).

user tracking

se non è un cookie tecnico serve consenso esplicito (GDPR/ePrivacy)
