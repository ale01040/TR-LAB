# JavaScript

le stringhe di input potrebbero essere "sporche" puliscile prima di salvarle nel database

robustezza del codice: single responsibility principle, modularità, gestione errori, leggibilità

validazione per evitare errori

usare "use strinct" all'inizio del codice js

usare api di html5

consiglio: per il dom: getElementById è il migliore mentre Usa querySelector/querySelectorAll quando ti serve un selettore CSS composito

consiglio: per associare un gestore a un evento: `addEventListener` è il migliore

e.preventDefault(): blocca il comportamento predefinito del browsers, È indispensabile, per esempio, per validare un form prima dell'invio.

Opzioni avanzate utili: `{ once: true }` (auto-rimozione dopo la prima esecuzione), `{ passive: true }` (ottimizzazione scroll/touch), `{ signal }` (rimozione batch con `AbortController`).

aspetta che il dom sia costruito prima di usare js:DOMContentLoaded

VALIDAZIONE CON REGEXP IN JAVASCRIPT.

usare i web worker per lavoro dell'ordine di secondi.

code splitting e defer/async per ridurre il JS bloccante, web worker per spostare i calcoli pesanti fuori dal main thread, ottimizzazione degli event handler.

NON SONO SICURO: usare i source map ( usare un sistema di Error Tracking )

NON USARE IN QUESTO CASO obfuscation

usare minification
