# CSS (Cascading Style Sheets)

Sintassi CSS uno o più selettori (separati da virgola), una o più coppie proprietà:valore 

definizione dell’attributo class

Pseudo-classi 

Pseudo-elementi

Selettori ":first-letter" e ":first-line"

Selettori "::after" e "::before"

CSS: colori

rappresentazioni

background: background-color: colore | inherit | transparent, background-image: url("image_URI"), background-repeat: repeat | repeat-x | repeat-y | no-repeat | inherit, background-position: posizione_h posizione_v, background-attachment: fixed | scroll | inherit, background: color image_URI repeat attachment position | inherit

unità di lunghezza: relative (fortemente consigliate): "em" = altezza della lettera "M" nel font corrente , "ex" = altezza della lettera "x" nel font corrente

assolute (sconsigliate tranne che per output su media a dimensione fissa, es. stampante A4)

unità relative CSS3 offre nuove unità relative: rem, ch, vw, vh, vmin, vmax

text properties: color: colore, text-align: left | right | center | justify text-transform: none | capitalize | uppercase | lowercase  text-decoration: none | underline | overline | line-through | blink text-indent: lunghezza | percentuale , line-height: normal | fattore | lunghezza | percentuale, 

font properties

font-style: normal | italic | oblique, font-weight: normal | bold | bolder | lighter | 100 | 200 | … | 900, font-variant: normal | small-caps font-stretch: ultra-condensed | extra-condensed | condensed | semi-condensed | normal | semi-expanded | expanded | extra-expanded | ultra-expanded, font-size: dimensione_del_font, font-family: lista_di_nomi_di_font , font generici (e compatibilità): serif (times, “times new roman”, palatino, ...) sans-serif (arial, helvetica, verdana, ...) monospace (courier, “courier new”, fixed, …) cursive (“comic sans MS”, florence, ...) fantasy (impact, oldtown, ...)

Dimensioni dei font “pt” è un’unità di misura tipografica

font: font-style font-variant font-weight font-size / line-height font-family | font-ref  font-ref chiede lo stesso font di un’altra area:

Immagini opacity. width, height, per definire lo stile dei link nei vari stati si usano pseudoclassi:

Proprietà "content:"

Contatori

Ereditarietà gerarchica

Selettori gerarchici

Selettori condizionali

Media query

Media-type

@media

Includere un foglio di stile (@import)

Media feature

 modello di formattazione

 dimensioni dei contenitori

width: lunghezza | percentuale | auto | inherit  min-width: lunghezza | percentuale | inherit  max-width: lunghezza | percentuale | none | inherit  larghezza (fissa, minima, massima) del contenuto  height: lunghezza | percentuale | auto | inherit  min-height: lunghezza | percentuale | inherit  max-height: lunghezza | percentuale | none | inherit  altezza (fissa, minima, massima) del contenuto

dimensioni margini e padding

margin-left, margin-right, margin-top, margin-bottom: auto | lunghezza | percentuale  la percentuale è riferita alla larghezza del genitore  margin: m_top_bottom_left_right margin: m_top_bottom m_left_right margin: m_top m_right_left m_bottom margin: m_top m_right m_bottom m_left  formato sintetico (in quattro versioni) per le dimensioni dei margini  corrispondenza tra numero parametri e margini seguita anche per i bordi  padding-left, padding-right, padding-top, padding-bottom, padding: auto | lunghezza | percentuale

 bordi dei contenitori

border-top-style, border-right-style, border-bottom-style, border-left-style, border-style: none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset  stile di uno specifico bordo o forma sintetica  border-top-width, border-right-width, border-bottom-width, border-left-width, border-width: thin | medium | thick | lunghezza  dimensione di uno specifico bordo o forma sintetica  border-top-color, border-right-color, border-bottom-color, border-left-color, border-color: colore | transparent | inherit  colore di uno specifico bordo o forma sintetica

 formati sintetici per i bordi

border-top, border-right, border-bottom, border-left, border: [ width ] [ style ] [ color ]

box-sizing: content-box|border-box

CSS: layout/disposizione

layout CSS è il sistema con cui si definisce  come sono disposti gli elementi nella pagina  come si comportano rispetto allo spazio disponibile  come reagiscono a schermi diversi (responsive) esistono diverse modalità di layout in CSS  utili per capire  come il browser distribuisce i componenti  come gli elementi interagiscono spazialmente nella viewport  quali regole "invisibili" lavorano dietro le quinte

esistono diverse modalità di disposizione dei blocchi layout che organizzano la disposizione dei componenti flow layout • comportamento di default • segue il "flusso" dei tag HTML • gli elementi "block" occupano tutta la larghezza disponibile, gli "inline" quella "necessaria" • si dispongono in sequenza float layout • elementi "fluttuanti" all'interno della pagina e dei contenitori permettendo agli altri elementi di fluirgli attorno • sfrutta la proprietà "float"

I layout più moderni usano un'organizzazione strutturata in righe o colonne (o entrambe) ◼ flexbox layout • organizza gli elementi in un'unica direzione o lungo una riga (in orizzontale) o lungo una colonna (in verticale) • efficace per layout non particolarmente complessi (adattabilità degli elementi allo spazio) ◼ grid layout • pagina divisa in righe e colonne ben definite • puntiglioso controllo dello spazio (con conseguente rigidità)

proprietà di layout/disposizione:

esistono diverse proprietà in grado di influenzare il posizionamento (reale o "apparente") degli elementi ◼ display ◼ specifica il comportamento di "rendering" di un elemento HTML ◼ visibility ◼ specifica se un elemento è visibile o meno... ◼ ...continuando ad occupare il suo spazio ◼ position ◼ determina il metodo di posizionamento di un elemento ◼ quale sia il suo punto di riferimento specifico ◼ se esca dal "flusso" (e quindi consumi spazio nella posizione originale)

float ◼ indica contenitori mobili e relativo comportamento ◼ rimuove l'elemento dal normale flusso del documento • originariamente serviva a far scorrere il testo attorno all'immagine ◼ clear ◼ in combinazione con float ◼ impedisce lo stare accanto ad un elemento flottante ◼ overflow ◼ determina il comportamento in caso il contenuto superi i limiti della box in cui è contenuto • es: troppo testo in un box troppo piccolo

proprietà Display:

none ◼ elemento invisibile e che non occupa spazio ◼ default per elementi da non visualizzare, come tag script ◼ block ◼ elemento visibile, inizia una nuova riga, occupa tutta la larghezza disponibile (se non specificato altrimenti) e va a capo ◼ default per i tag div, h, header, footer, p,

{ display: block; width: 50%; background: red; } /* Il prossimo elemento andrà SOTTO questo box. */

inline ◼ elemento visibile, segue elemento precedente (senza iniziare una nuova riga), occupa solo la larghezza necessaria (se non specificato altrimenti) ◼ default per i tag span, a, img, … ◼ inline-block ◼ comportamento "inline", ma con possibilità di impostare larghezza ed altezza (come block) © A.Atzeni (Politecnico di Torino, 2025) 86 .testo { display: inline; padding: 2rem; /* Funziona orizzontalmente, ma non sposta le righe verticalmente */ } .button { display: inline-block; width: 30%; text-align: center; }

flex ◼ attiva il modello flexbox • i figli si affiancano automaticamente e diventano "flessibili" ◼ dispone e dimensiona gli elementi lungo la verticale o l'orizzontale (modello "unidimensionale") ◼ grid ◼ attiva il modello grid (modello "bidimensionale") ◼ definisce una "scacchiera" dove posizionare i contenuti ◼ inline-flex, inline-grid ◼ come inline (non va a capo e non occupa tutto li spazio orizzontale), ma con proprietà flex e grid ◼ ...e diversi altri (es: contents, table, list-item, meno utilizzati)

proprietà Visibility:

visibility: visible | hidden | collapse | initial | inherit ◼ visible ◼ elemento visibile ed occupa spazio ◼ hidden ◼ "invisibile" (e non letto da screen reader) ma occupa spazio ◼ collapse ◼ per righe o colonne di una tabella • funziona anche nei flexbox ◼ "collassa" (rimuove) l'elemento (una riga o una colonna) rendendo il relativo spazio disponibile per altri elementi

proprietà Position:

5 possibili valori ◼ tutti (tranne static) usano le proprietà direzionali (top, right, bottom, left e z-index) per indicare gli spostamenti ◼ static ◼ è il default ◼ obbedisce alla sequenza specificata in HTML • ed ignora i valori direzionali eventualmente impostati ◼ si sposta insieme al contenuto ◼ relative ◼ spostamento rispetto alla posizione normale ◼ lascia un "buco" nella sua posizione di default, ed eventualmente si sovrappone ad altri elementi ◼ si sposta insieme al contenuto

absolute ◼ elemento rimosso dal flusso normale del documento • gli altri elementi si comportano come se nella posizione d'origine non ci fosse ◼ posizionamento assoluto rispetto all'ultimo predecessore posizionato (ossia non static) o rispetto al body (in questo caso si muove con la pagina) ◼ fixed ◼ rimosso dal flusso normale (non lascia un buco) ◼ posizionamento assoluto rispetto alla viewport ◼ non si sposta anche quando si fa scroll ◼ sticky ◼ come relative fino a quando raggiunge una posizione indicata, poi fixed

sovrapposizione di elementi:

z-index ◼ numero intero (positivo o negativo), default è zero ◼ indica l'ordine dello stack con cui visualizzare elementi che si sovrappongono ◼ con stesso z-index si segue l'ordine in HTML ◼ es. figura sul bordo superiore, con testo sopra img { position: absolute; left: 0px; top: 0px; width: 100%; height: auto; z-index: -1; }

contenitori mobili:

float: left | right | none ◼ contenitore mobile ◼ posizionamento orizzontale rispetto al genitore sino a toccare il suo bordo o quello di un altro float ◼ clear: left | right | both | none ◼ quali lati di un contenitore NON possono essere adiacenti a contenitori float precedenti

Responsive design:

sito usabile su tutti i dispositivi: ◼ desktop, laptop ◼ tablet ◼ Smartphone ◼ ... ◼ usa solo HTML e CSS (no JS) ◼ dimensionare il contenuto per scroll verticale (ma non orizzontale!) ◼ no elementi troppo larghi ◼ non assumere una larghezza specifica ◼ usare CSS media query per caricare regole diverse per schermi di dimensioni diverse ◼ pilastri tecnici: viewport, media query, unità relative

Proprietà Gap:

definisce la dimensione dello spazio vuoto (gutter) tra gli elementi di un contenitore ◼ funziona solo in contesto Flexbox o Grid ◼ risolve il problema, nei layout complessi della difficoltà di gestione nell'uso di margin (che appartiene ai figli) ◼ gap appartiene al "padre", quindi permette di considerare lo spazio tra i figli, non all'esterno ◼ Sintassi: ◼ gap: 1rem; Applica uno spazio di 1rem sia verticalmente che orizzontalmente. ◼ gap: 2rem 1rem; Il primo valore è per le righe (row-gap), il secondo per le colonne (column-gap).

Flexbox:

distribuzione dello spazio e l'allineamento degli elementi (flex items) all'interno di un contenitore (flex container) ◼ anche elementi con dimensioni dinamiche o sconosciute ◼ alterazione di altezza e larghezza dei figli per riempire lo spazio disponibile ◼ gli elementi possono "gonfiarsi" per riempire lo spazio o "restringersi" per non uscire dai bordi. ◼ funzionamento governato da due assi perpendicolari ◼ Main Axis (Asse Principale): Definito dalla proprietà flexdirection. È la direzione lungo la quale vengono disposti i figli. ◼ Cross Axis (Asse Trasversale): L'asse perpendicolare al main axis.

Flexbox - proprietà:

del contenitore ◼ display: flex inizializza il contesto di formattazione flex ◼ flex-direction determina il vettore di crescita (row, column, rowreverse, column-reverse) - cioè il sistema di riferimento ◼ justify-content: gestisce l'algoritmo di distribuzione dello spazio lungo il main axis ◼ align-items: gestisce l'allineamento dei figli lungo il cross axis. ◼ dei figli ◼ flex-grow: fattore di espansione (quanto l'elemento cresce rispetto agli altri se c'è spazio libero). ◼ flex-shrink: fattore di contrazione (quanto l'elemento si restringe se lo spazio è insufficiente). ◼ flex-basis: la dimensione teorica "ideale" dell'elemento prima della distribuzione dei resti.

justify-content ◼ flex-start (default): elementi "ammassati" all'inizio dell'asse. ◼ flex-end: elementi "ammassati" alla fine. ◼ center: elementi "ammassati" al centro. ◼ space-between: primo elemento all'inizio, ultimo alla fine, spazio rimanente diviso equamente. ◼ space-around: spazio distribuito equamente attorno a ogni elemento (i bordi esterni risulteranno la metà dello spazio tra due elementi). ◼ space-evenly: tutto lo spazio (bordi inclusi) è distribuito in modo identico.

align-items ◼ stretch (default): Se gli elementi non hanno un'altezza (o larghezza, a seconda dell'asse) definita, si allungano per coprire tutto lo spazio del contenitore. ◼ flex-start: Gli elementi si allineano all'inizio dell'asse trasversale (es. in alto se row). ◼ flex-end: Gli elementi si allineano alla fine (es. in basso se row). ◼ center: Gli elementi sono centrati perpendicolarmente. ◼ baseline: Gli elementi si allineano in modo che le linee di base del loro testo siano coordinate (molto utile se hai font di dimensioni diverse).

flex-basis ◼ spazio che l'elemento tenta di occupare inizialmente lungo l'asse principale ◼ auto (default): La dimensione è dettata dal contenuto o dalle proprietà width/height. ◼ 0: L'elemento non ha una dimensione iniziale (tutto lo spazio che occuperà sarà frutto del flex-grow). ◼ 200px, 15rem, 20%: una dimensione specifica fissa o relativa

flex-grow ◼ come l'elemento deve crescere se nel contenitore avanza dello spazio residuo positivo ◼ 0 (default): L'elemento non cresce oltre il suo flex-basis. ◼ 1, 2, 3...: Valori numerici proporzionali. Un elemento con grow: 2 crescerà il doppio rispetto a uno con grow: 1. ◼ flex-shrink ◼ come l'elemento deve restringersi se lo spazio nel contenitore è insufficiente (spazio residuo negativo) ◼ 1 (default): L'elemento si restringe proporzionalmente agli altri. ◼ 0: L'elemento rifiuta di restringersi. Questo può causare l'uscita (overflow) dal contenitore se lo spazio finisce. ◼ 2, 3...: L'elemento si restringe più velocemente degli altri.

Grid layout:

posizionare gli elementi pensando ad una griglia ◼ colonne tutte della stessa dimensione ◼ elementi sulle righe possono occupare più colonne ◼ tipicamente si usano 12 colonne, ognuna width:1/12

l'importanza del layout di tipo a griglia ha portato alla definizione di una modalità CSS specifica ◼ svincola da float e posizionamento sequenziale in HTML: ◼ permette di piazzare i blocchi tramite CSS (e quindi cambiare facilmente il layout agendo solo su CSS) ◼ un "grid container" è un elemento che può contenere altri elementi disposti a griglia ◼ si ottiene con "display: grid" (block-level) ◼ oppure con "display: inline-grid" (inline) ◼ documentazione utile: ◼ https://developer.mozilla.org/enUS/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_l ayout

proprietà di grid:

grid-template-row, grid-template-column ◼ definiscono la struttura della griglia ◼ griglia creata esplicitamente ◼ grid-column, grid-row, grid-gap (oggi Gap) ◼ In quali colonne/righe si posiziona l'elemento ◼ grid-auto-row, grid-auto-columns ◼ definisce la larghezza delle righe/colonne create automaticamente, utile quando aggiungi elementi oltre quelli definiti ◼ grid-auto-flow ◼ decide come vengono inseriti automaticamente gli elementi nella griglia. row (default) → riempie per righe, column → riempie per colonne, dense → compatta gli spazi vuoti

grid layout: righe e colonne:

numero e dimensione di righe e colonne: ◼ grid-template-columns: dim_col1 dim_col2 … ◼ grid-template-rows: dim_row1 dim_row2 … ◼ usando dimensioni fisse, percentuali, "auto" o "fr" ◼ "fr" è la frazione unitaria dello spazio disponibile ◼ spaziatura tra righe e colonne: ◼ grid-column-gap: gap ◼ grid-row-gap: gap ◼ grid-gap: col-gap row-gap

grid layout: posizionamento:

posizionamento di elementi all'interno della griglia indicando righe e colonne o area: ◼ grid-column: col-start / [ col-end | col-span ] ; ◼ grid-row-start: row-start / [ row-end | row-span ] ; ◼ grid-area: row-start / col-start / row-end / col-end ◼ grid-area: row-start / col-start / row-span / col-span ◼ il formato span richiede di indicare "span" col numero di righe o colonne ◼ allineamento orizzontale tramite "justify-content" e verticale tramite "align-content": ◼ space-evenly, space-around, space between, center, start, end

CSS grid layout: aree con nomi:

invece di indicare righe e colonne si può dare un nome ad un'area: ◼ grid-area: nome_dell_area ◼ … e poi usare questi nomi nella definizione di righe e colonne: ◼ grid-template-areas: 'nome_area1 nome_area2' … ◼ esempio: .theHeader { grid-area: header; } .theMenu { grid-area: menu; } .theMain { grid-area: main; } .grid-container { /* 3 columns and 2 rows */ grid-template-areas: 'header header header' 'menu main main' }
