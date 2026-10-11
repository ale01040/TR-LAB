# Sicurezza

MAI password in chiaro

MAI cifratura reversibile

provare ad usare Argon2id piuttosto che un semplice hash con salt (non su xampp perché poi salta tutto).

opzionale: solo per server costosi. chidi prima di implementare: La regola d'oro (OWASP) è calibrare i parametri $(t, m, p)$ affinché il calcolo dell'hash impieghi circa 0.5 secondi. Questo è un ritardo impercettibile per un utente umano, ma devastante per chi fa brute-force, mantenendo il server stabile sotto stress. In aggiunta, devi implementare un rigido Rate Limiting (limitazione delle richieste) per IP o account al livello del Reverse Proxy (es. Nginx o API Gateway) prima ancora che la richiesta tocchi il tuo codice logico.

mettere sempre un salt

il pepper è opzionale (anche perché è un casino metterlo)

cookie di sessione e sicurezza:HTTPS ovunque (non solo sul login)Rigenerare il session ID dopo il login (session_regenerate_id): Scadenza / rotazione dell'ID e logout reale (distruzione della sessione lato server. Tenere i dati sensibili sul server (sessione).Combinazione raccomandata per il cookie di sessione: Secure; HttpOnly; SameSite=Lax.

attenzione alle query injections

sanitizzazione e validazione dell'input

Contromisura di contenimento: privilegi minimi sul DB

logica della defense in depth: prevenire l'attacco e limitarne l'impatto.

tutto ciò che arriva dalla rete è input non fidato

Poiché client e server eccellono su assi diversi, la soluzione corretta non è scegliere, ma usare entrambi: la doppia validazione.

evitare il Stored XSS e il Reflected XSS.

combattere XSS con: Output encoding (escaping),Content Security Policy (CSP), Cookie HttpOnly

evitare il session hijacking.

bloccare il  defacement e il phishing

combattere il CSRF con: Token anti-CSRF, Cookie SameSite=Lax,Verifica degli header Origin/Referer

proteggersi da packet sniffing, web spoofing, attacchi al client, sub-domain attack.

usare sha-3 per algoritmi di hash crittografico

insieme di proprietà da garantire e mantenere nel tempo. Le principali sono autenticazione, autorizzazione/controllo accessi, riservatezza, integrità, non ripudio, disponibilità e tracciabilità.

usare Let's Encrypt per andare in https.

prevenire gli attacchi replay con con nonce/sequenza/timestamp.

prevenire la cancellazione di un messaggio con la numerazione progressiva.

mantenere la riservatezza con la cifratura e il controllo degli accessi.(Dati, azioni  e posizione)

la password ci sta ma meglio se si usano sistemi biometrici.
