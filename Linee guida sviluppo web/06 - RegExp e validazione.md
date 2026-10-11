# RegExp e validazione

RegExp:non sovraccaricare la regex di responsabilità architetturali:Strato 1 (Regex minimale - Client/Server),Strato 2 (Validazione di Rete - Server),Strato 3 (Validazione di Stato - Logica applicativa).

ripetere RegExp anche lato server

principio never trust the client

pattern matching, ancore, lookahead e never trust the client

regExp email:filtrare la maggior parte degli errori comuni (pippo@, @x, stringhe con spazi), non pretendere di catturare ogni caso limite."look good" come ^[^\s@]+@[^\s@]+\.[^\s@]+$

password robusta i requisiti tipici sono: minimo 8 caratteri e presenza di almeno una minuscola, una maiuscola, una cifra e un carattere speciale.password robusta si usa ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,16}$  oppure valida la password con più regex semplici in AND: /^.{8,16}$/.test(p) &amp;&amp; /[a-z]/.test(p) &amp;&amp; /[A-Z]/.test(p) &amp;&amp; /\d/.test(p) &amp;&amp; /[^A-Za-z0-9]/.test(p).

opzionale: {Il modo corretto di procedere in un'applicazione enterprise è utilizzare la Constraint Validation API di HTML5 pilotata da JavaScript. Questo approccio unisce la robustezza dichiarativa dell'HTML5 con la flessibilità estetica del JS.Si disabilita la UI nativa dei tooltip del browser usando l'attributo novalidate sul form, ma si riutilizzano i pattern HTML all'interno del codice JS tramite la proprietà validity.}

eseguire la sanitizzazione lato server.

Lato client si applicano con regex.test(valore) in JavaScript (bloccando l'invio con event.preventDefault()) o con l'attributo pattern dell'&lt;input&gt;.

La validazione e la sanitizzazione server (es. filter_var(..., FILTER_VALIDATE_EMAIL) in PHP) sono l'unica vera difesa contro dati malformati e injection.

evitare il Redos scrivendo pattern semplici e non annidando i quantificatori.
