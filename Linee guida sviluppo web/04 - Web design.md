# Web design

principi generali del web design: leggibilità, palette colori armoniosa, buon contrasto, spaziatura sufficiente, qualità immagini, coerenza estetica,, intuitivo, struttura di navigazione chiara.

coerenza estetica

responsive design

performance reali e velocità

sicurezza

seguire tutte le EURISTICHE DI NIELSEN: visibilità e stato del sistema, corrispondenza tra sistema e mondo reale, controllo e libertà dell'utente, coerenza standard, prevenzione errori, riconoscimento piuttosto che memorizzazione, flessibilità e efficienza d'uso, design estetico e minimalista, aiutare gli utenti a riconoscere diagnosticare e recuperare dagli errori, aiuto e documentazione. adattabilità,

seguire le regole per le pagine printer-friendly: colori leggibili, preferibilmente testo nero su sfondo bianco, font con grazia, dimensione adeguata, circa 12pt, sottolineare i link, rimuovere immagini non necessarie, rimuovere menu/link per navigare le pagine, rimuovere maggior parte delle pubblicità, rimuovere js e immagini animate, inserire nota di copiright.

implementare sempre pagine printer-friendly

regole aggiuntive per la printer-friendly; inserire url permanente della pagina, inserire nota di copyright

uso adeguato dei colori

criteri di scelta delle immagini

usare formati grafici alternativi della stessa immagine

assicurarsi che tutti possano accedere al sito anche persone con disabilità

sito dev'essere accessibile

stare molto attenti all'accessibilità

seguire i principi WCAG

possibilità di avere il tema scuro o chiaro

implementare il lazy loading con immagini pesanti

ARIA accessible rich interne application

seguire le linee guida wcag https://www.w3.org/WAI/standards-guidelines/wcag/

avere un livello di conformità almeno AA

seguire i principi POUR:

Il principio P: Percepibile (Perceivable) contenuto è percepibile se le immagini hanno alternative testuali, i video hanno sottotitoli/trascrizioni, il contrasto testo/sfondo è sufficiente, e l'informazione non dipende solo dal colore.alt significativo sulle immagini (alt="" se decorative), sottotitoli e trascrizioni per audio/video.

Il principio O: Operabile (Operable)Un'interfaccia è operabile se tutto è raggiungibile e attivabile da tastiera, il focus è sempre visibile, non ci sono trappole di navigazione, c'è tempo a sufficienza per le azioni e nessuna animazione lampeggiante pericolosa (&lt; 3 flash/secondo).

Il principio U: Comprensibile (Understandable)Un sito è comprensibile se il linguaggio è chiaro, la lingua della pagina è dichiarata (lang), la navigazione è coerente tra le pagine, e gli errori dei moduli sono descritti in modo esplicito (non solo "Errore", ma "Il campo email deve contenere @").

Il principio R: Robusto (Robust)Un sito è robusto se usa HTML semanticamente corretto (&lt;button&gt; per i bottoni, &lt;nav&gt; per la navigazione, non &lt;div&gt; ovunque) e se i componenti custom comunicano il loro stato alle tecnologie assistive tramite ARIA.

L'approccio corretto è integrare l'accessibilità fin dall'inizio del progetto (inclusive by design).

 $\dfrac{L_1 + 0{,}05}{L_2 + 0{,}05}$, dove $L_1$ è la luminanza relativa del colore più chiaro e $L_2$ quella del più scuro. Il $+\,0{,}05$ modella la luce ambientale ed evita la divisione per zero.

mobile first: si aggiunge complessità man mano che lo schermo cresce, dimensiona per lo scroll verticale, mai per quello orizzontale.

miglioramento lcp: Comprimere e ridimensionare, Formati moderni, Prioritizzare il caricamento, Ridurre risorse render-blocking,  abbassare il TTFB.

decidere palette colo prima dello sviluppo.

usare il tag picture per permettere di specificare diverse immagini, lasciando al browser la scelta. es lasciando al browser la prima immagine con una dimensione coerente con la dimensione della finestra

mettere SEMPRE il testo alternativo sulle immagini.

mettere la possibilità di avere il tema scuro

contrasto sufficiente tra testo e sfondo

linee guida wcag

permettere agevole navigazione da tastiera

pagine arricchite da contenuti aria

usare attributo role
