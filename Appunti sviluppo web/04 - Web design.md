# Web design

Principi generali:

leggibilità ◼ uso di palette di colori armoniosa ed "accessibile" • buon contrasto per facilitare "lettura" (di scritte e di forme) ◼ scelta di font oculata (attenzione a caratteri stravaganti e dimensioni inappropriate, non usarne troppi diversi,...) ◼ spaziatura sufficiente tra lettere e tra righe ◼ qualità delle immagini adeguata ◼ evitare abuso di "movimento" (oggetti mobili, lampeggianti) ◼ consistenza visiva ◼ coerenza estetica in tutto il sito • colori, tipografia, stili di pulsanti e elementi di navigazione ◼ evita "spaesamento" negli utenti

usabilità ◼ "intuitivo" e facile da usare • struttura di navigazione chiara • caricamento delle pagine veloce e "completo" • uso di (semplici) icone per arricchire la lettura • feedback per l'utente • … euristiche di Nielsen

Euristiche di Nielsen (1994, ma ancora usate) ◼ visibilità e stato del sistema - ◼ tenere sempre informati gli utenti su ciò che sta succedendo, tramite feedback chiari e tempestivi. ◼ corrispondenza tra sistema e mondo reale ◼ parlare il linguaggio degli utenti ◼ controllo e libertà dell’utente ◼ annullare facilmente azioni indesiderate ◼ coerenza e standard ◼ parole, azioni o elementi diversi non devono significare la stessa cosa ◼ prevenzione degli errori ◼ evitare gli errori prima che accadano

riconoscimento piuttosto che memorizzazione ◼ informazioni necessarie devono essere visibili o facilmente recuperabili ◼ flessibilità ed efficienza d’uso ◼ funzionare bene sia per principianti sia per utenti esperti ◼ design estetico e minimalista ◼ no informazioni inutili o irrilevanti ◼ aiutare gli utenti a riconoscere, diagnosticare e recuperare dagli errori ◼ messaggi di errore devono essere chiari e comprensibili ◼ aiuto e documentazione ◼ offrire aiuto e documentazione facilmente accessibili.

adattabilità ◼ buona fruizione su molteplici dispositivi (responsive design) ◼ dimensioni e disposizione variabili ed adattabili • primo check su mobile (mobile-first design) ◼ performance e velocità ◼ velocità di caricamento • "reale" e percepita dagli utenti ◼ sicurezza ◼ tramite programmazione robusta e protocolli sicuri

non usare più di 2 o 3 font diversi per pagina ◼ non cambiare il font nel mezzo di una frase (a meno di avere una più che valida ragione ...) ◼ scelta tipica di "leggibilità" dei font: ◼ sans-serif per testo da visualizzare nel browser ◼ serif per la versione di stampa ◼ monospace per codice o input da tastiera ◼ script e/o fantasy per accentuare l’enfasi • cautela! ◼ attenzione a non richiedere un font “raro” perché aumenta la possibilità che non sia disponibile

Serif contro Sans-serif:

i font privi di grazia affaticano meno la vista (che è già molto sollecitata dagli schermi video) inoltre hanno una migliore resa visiva sugli schermi (che hanno spesso densità ~100 PPI) ◼ ...con molta variabilità, es iPhone 12 ~460 PPI ◼ invece il testo stampato risulta più gradevole usando font con grazia, che sono resi bene grazie alla migliore qualità della stampa (minimo 300 DPI ma normale anche 600 o 1200 DPI) ◼ alcuni font sans-serif: ◼ Arial, Geneva, Helvetica, Lucida Sans, Trebuchet, Verdana (progettato per il web) ◼ alcuni font serif: ◼ Garamond, Georgia (progettato per il web), New York, Palatino, Times, Times New Roman

alcuni font monospace: ◼ Courier, Courier New, Lucida Console, Monaco ◼ alcuni font fantasy: ◼ Copperplate, Desdemona, Impact, Kino ◼ Impact è quello più presente su Mac, Win e Linux ◼ alcuni font cursive: ◼ Comic Sans MS, Lucida Handwriting, Zapf Chancery ◼ i font fantasy/cursive sono da usarsi con estrema parsimonia e mai per grandi porzioni di testo: ◼ sono difficili da leggere ◼ spesso non includono i caratteri accentati

Leggibilità del testo:

contrasto ◼ testo chiaro su sfondo scuro (es. bianco su blu )più leggibile ... testo scuro su sfondo chiaro (es. nero su bianco) più bello ◼ combinazioni di colori ◼ entra in gioco il contrasto relativo, es. bene nero su grigio chiaro ma male rosso su arancione ◼ dimensione dei font ◼ font diversi ma di uguale dimensione occupano spazi verticali diversi (es. Verdana occupa 58%, Times New Roman 46%, Flemish Script 28%) ◼ ... font-size-adjust! • regola la dimensione sulla base dell'aspect-ratio (rapporto tra altezza della x e altezza del font) • non ampiamente supportato

spaziatura (tra righe dello stesso paragrafo) ◼ lasciare almeno 20-30% per leggibilità ◼ spaziatura tra le lettere ◼ font monospace o con buona spaziatura aumentano la leggibilità del testo ◼ font ◼ per schermo, preferire sans-serif ◼ in generale, evitare font "condensed" • con poco spazio tra I caratteri (per via della famiglia o delle direttive impostate ◼ limitare l’uso dello stile italico (es. solo per evidenziare termini speciali) perché meno leggibile

Pagine web “printer-friendly”:

le pagine sono sempre più complesse e meno agevoli da leggere a video (es. pubblicità, menù, intestazioni) e sempre più persone hanno problemi di vista ◼ in taluni casi (es. articoli lunghi, how-to, istruzioni dettagliate) è preferibile stampare la pagina per potervi prendere appunti ◼ stampare direttamente ciò che compare a video normalmente offre un pessimo risultato ◼ è importante cambiare il contenuto ed il formato della pagina quando viene stampata: web-design printer-friendly

colori leggibili, con preferenza per testo nero su sfondo bianco ◼ la carta è bianca ◼ approccio inclusivo (non assumere tutti abbiano una stampante a colori) ◼ font “con grazia” (serif) ◼ font con dimensione adeguata (consigliato 12pt) ◼ sottolineare i link (per evidenziarli, visto che sulla carta non sono cliccabili o evidenziabili in altro modo) ed eventualmente esplicitare la URL ◼ rimuovere le immagini non necessarie ◼ lasciare quelle essenziali per l’articolo ◼ accettabile il logo dell’azienda

rimuovere i menù / link per navigare le pagine ◼ non servono ◼ rimuovere tutta o la maggior parte della pubblicità ◼ meglio toglierla tutta, ma se è la nostra principale fonte di guadagno … ◼ rimuovere JS e le immagini animate ◼ non si stampano e possono creare problemi ◼ inserire la URL (permanente) della pagina ◼ riferimento all’originale e per pubblicizzare il sito ◼ inserire una nota di copyright ◼ non impedisce la copiatura ma è un avviso legale

definire tre CSS diversi ed includerli in modo condizionale (usando l’opzione “media”) ◼ uno generale (es. H1 in italico, TH centrati) ◼ uno con i formati per presentazione a video ◼ uno con i formati per la stampa ◼ oppure scrivere un unico CSS con sezioni condizionali (tramite @media) per i vari media ◼ assegnare ID logici e significativi ai vari box del layout (es. advertising, navigation) ◼ per nascondere (tramite “display: none”) i box inutili per un certo media

Le coordinate di colore:

colori esprimibili con vari sistemi di coordinate ◼ per la percezione umana è utile considerare le coordinate HSL (Hue – Saturation – Lightness)

hue = il colore ◼ saturation = la quantità di colore presente ◼ lightness = la percentuale di luce ◼ 0% = nero, 100% = bianco, 50% = colore puro ◼ anche usato HSV: ◼ V (value) è anche detto brightness (luminosità) ◼ 0% = nero, 100% = colore puro (bianco se S=0)

il parametro hue:

è quello che determina il colore base ◼ il cerchio dei colori in base al parametro Hue, con indicazione dei colori primari, secondari e terziari:

scelta dei colori:

a maggior differenza percepita è su Hue ◼ buon contrasto = colori con Hue distante / opposto ◼ differenze di luminosità e saturazione sono molto meno percepibili da persone con deficit visivi ◼ attenzione ai colori disponibili nell’UA: ◼ usare colori standard (es. per nome o valore RGB) ◼ evitare le sfumature

Modelli dei colori:

modello additivo ◼ colori creati combinando luci di diverse tonalità ◼ dal nero si aggiunge luce ◼ tipico dei dispositivi che emettono luce (video) ◼ colori primari RGB (Red – Green – Blue) ◼ + buona brillantezza ◼ - difficoltà resa colori scuri

modello sottrativo ◼ colori creati combinando pigmenti di diverse tonalità ◼ dal bianco si sottrae luce ("coprendola" con i pigmenti) ◼ tipico di stampa (su materiali che non emettono luce) ◼ colori primari CMY (Cyan – Magenta – Yellow) o CMYK = CMY + blacK ◼ + buona resa degli scuri ◼ - difficile rendere colori brillanti, processi di produzione più complessi (inchiostri, allineamenti)

Gamut:

intervallo di colori visibile/rappresentabile ◼ gamut diverso per ogni dispositivo video/stampa ▪ gamut di visualizzazione, gamut di stampa, gamut di modello di colore

Colori web-safe e web-smart:

colori web-safe: ◼ byte del codice RGB scelti tra 00, 33, 66, 99, cc, ff ◼ in totale 6^3 combinazioni = 216 &lt; 256 ◼ è l'insieme originale per monitor a 8 bit ◼ colori web-smart: ◼ byte del codice RGB con cifre identiche (00 … ff) ◼ in totale 16^3 combinazioni = 4096 ◼ è l'insieme esteso per monitor a 16 bit ◼ (per spermentare, carina la ruota interattiva dei colori websmart e web-safe) • https://www.ficml.org/jemimap/style/color/wheel.html

Uso compatibile dei colori:

scopo: mostrare i colori in modo consistente su qualunque monitor ◼ non solo PC ma anche smart-phone, tablet, televisori, ... ◼ colori web-safe e web-smart molto utili per compatibilità anche se oggi è frequente avere monitor a 24 bit ◼ evitare per quanto possibile i gradienti di colore ◼ disponibilità aleatoria e/o resa cromatica molto differente ◼ evoluzione dei colori nel web: ◼ https://en.wikipedia.org/wiki/Web_colors

Densità delle immagini:

si misura in DPI (dot-per-inch) per la stampa ed in PPI (pixelper-inch) per gli schermi video ◼ formula per il calcolo dei PPI ◼ dp = sqrt ( wp2 + hp2 ) ◼ PPI = dp / di ◼ esempi: ◼ notebook 15.4" con 1680 x 1050 ha densità 128 PPI ◼ notebook 15.4" con 1920 x 1200 ha densità 147 PPI ◼ schermo 22" con 1920 x 1080 (FHD) ha densità 100 PPI ◼ smartphone 4.8" con 1280 x 720 (HD) ha densità 306 PPI ◼ smartTV 43" 3840 x 2160 (UHD o 4K) ha densità 102 PPI ◼ l’occhio mediamente non distingue dettagli oltre i 300 DPI

Formati grafici: 

GIF (Graphics Interchange Format) ◼ versione base GIF 87a (1987) da Compuserve: ◼ tavolozza definibile ma massimo 256 colori ◼ compressione senza perdita (lossless) ◼ animazione (= sequenza di immagini) ◼ versione GIF 89a (1989) aggiunge a GIF 87a: ◼ trasparenza (binaria) • soprattutto per sfondo ◼ metadati ◼ temporizzazione delle sequenze ◼ adatto per immagini semplici (icone, simboli, grafica base, …) ed animazioni ◼ non adatto per immagini complesse (foto digitali)

JPEG (Joint Photographic Experts Group) ◼ versione base (1992): ◼ massimo 16M colori (2^24) in formato RGB (8 bit per canale) ◼ compressione con perdita (lossy) variabile a scelta ◼ ad alta compressione può generare artefatti (es. blocchettini) ◼ non supporta animazione, non supporta trasparenza (problema con immagini non rettangolari) ◼ adatto per immagini complesse (foto digitali) ◼ non adatto per immagini non rettangolari (trasparenza), con molto testo o animazioni ◼ altre versioni più recenti meno usate (JPEG-2000, JPEG-XR) ◼ supporto trasparenza, qualità adattativa, rendering progressivo, suddivisione immagine in sotto parti (tiling), …

PNG (Portable Network Graphics) ◼ versione base (1992) da W3C: ◼ massimo 16M colori (2^24) in formato RGBA (8 bit per canale) ◼ 256 livelli di trasparenza (da completa ad assente) sul canale detto "alpha" ◼ compressione senza perdita (lossless) migliore di GIF ◼ non supporta animazione ◼ adatto per immagini di media complessità e con trasparenza ◼ non adatto per immagini molto complesse (foto digitali) o animazioni ◼ supporto per animazioni offerto da APNG (Animated PNG) non standard ma supportato da molte implementazioni

Webp sviluppato da Google (2010): ◼ massimo 16M colori (2^24) in formato RGBA (8 bit per canale) ◼ 256 livelli di trasparenza (da completa ad assente) sul canale detto "alpha" ◼ compressione senza perdita (lossless) in formato RGBA ◼ compressione con perdita (lossy) in formato 8-bit YUV 4:2:0 ◼ YUV è una rappresentazione usata nelle trasmissioni TV ◼ supporta animazione ◼ ambisce a rimpiazzare tutti gli altri formati grafici per il web ma i suoi vantaggi non sono costanti su tutti i tipi di immagine ◼ per verificare il supporto corrente: https://caniuse.com/webp

Criteri scelta delle immagi:

prestazioni e tempi di caricamento ◼ immagini ad alta risoluzione o numerose aumentano il peso della pagina ◼ comprimere immagini, usare formati moderni, adattare al device (responsive design), implementare lazy loading (caricamento solo nella viewport) ◼ usabilità e chiarezza ◼ troppi elementi visivi possono distrarre l’utente ◼ Bilanciare immagini e testo, usare immagini solo quando aggiungono valore, uso sapiente dello spazio bianco ◼ a maggior ragione per utenti con disabilità visive/cognitive (e può complicare il funzionamento di screen reader) ◼ testo alternativo (attributo alt o collegato o proprio in sostituzione)

Il tag &lt;picture&gt;:

permette di specificare diverse immagini, lasciando al browser la scelta (es. formato grafico supportato, dimensione più adatta alla finestra del browser) ◼ &lt;source srcset=URI [ media=( media query ) ] &gt; ◼ mettere sempre come ultimo elemento un tag &lt;img&gt; che sarà l'immagine visualizzata in caso nessuna di quelle precedenti venga selezionata ◼ importante per non scalare le immagini quando varia la dimensione della finestra e non trasferire immagini più grosse del necessario il browser sceglierà il primo formato grafico che supporta, seguendo l'ordine dei tag ossia WEBP, PNG, JPG, GIF © A.Atzeni (Politecnico di Torino, 2024) 40 ... &lt;picture&gt; &lt;!-- esempio formati grafici alternativi --&gt; &lt;source srcset="flowers.webP"&gt; &lt;source srcset="flowers.png"&gt; &lt;source srcset="flowers.jpg"&gt; &lt;img srcset="flowers.gif" alt=flowers"&gt; &lt;/picture&gt; il browser sceglierà la prima immagine con una dimensione coerente con la dimensione della finestra ◼ attenzione ad elencarle in ordine di dimensione decrescente © A.Atzeni (Politecnico di Torino, 2024) 41 ... &lt;picture&gt; &lt;!-- esempio immagini dimensioni diverse --&gt; &lt;source media="(min-width=1600px)" srcset="flowers_large.jpg"&gt; &lt;source media="(min-width=800px)" srcset="flowers_medium.jpg"&gt; &lt;img srcset="flowers_small.jpg" alt=flowers"&gt; &lt;/picture&gt;

accessibilità web:

Accessibilità digitale ▪ Crescente digitalizzazione dei servizi ▪ Il web come infrastruttura critica ▪ Barriere di accesso per utenti con disabilità ▪ Necessità di progettazione inclusive by design ◼ In un contesto in cui ▪ oltre 1 miliardo di persone con disabilità nel mondo ▪ molte barriere derivano da scelte progettuali evitabili

Problemi di accessibilità:

disabilità visive ◼ cecità, ipovisione, daltonismo ◼ soluzioni: funzionalità di zoom, screen reading ◼ disabilità uditive ◼ da lieve a profonda perdità d'udito ◼ soluzioni: semplificazione testo, sottotitoli, trascrizioni ◼ disabilità motorie ◼ problemi fisici (es. perdita di un arto), neurologici (es. debolezza) ◼ soluzioni: accessibilità tramite tastiera ◼ disturbi cognitivi ◼ di origine genetica o traumatica, invecchiamento ◼ soluzioni: multimodalità, semplificazione (testo, immagini)

Attenzione sociale e normativa:

Accessibilità web ▪ "Capacità di un sistema informatico di essere utilizzato da persone con differenti abilità fisiche, sensoriali o cognitive." ◼ Principi fondamentali ▪ Inclusione ▪ pari accesso all’informazione ▪ progettazione universale ◼ Standard principali ▪ WCAG (Web Content Accessibility Guidelines) ▪ Linee guida internazionali del World Wide Web Consortium ◼ I 4 principi WCAG: ▪ Percepibile, Utilizzabile, Comprensibile, Robusto

Principi WCAG:

Percepibile ◼ Le informazioni e i componenti dell’interfaccia devono essere presentati in modo che gli utenti possano percepirli, indipendentemente dalle loro capacità sensoriali ◼ Utilizzabili ▪ componenti dell’interfaccia e navigazione utilizzabili tramite diverse modalità di interazione (non solo con il mouse) ◼ Comprensibile ▪ Le informazioni e il funzionamento dell’interfaccia devono essere facili da comprendere e prevedibili. L’utente deve capire come funziona il sito e cosa accadrà quando compie un’azione ◼ Robusto ▪ contenuto compatibile con diverse tecnologie e dispositivi, inclusi browser, screen reader e tecnologie assistive e software futuri.

Supporto di accessibilità:

chiara struttura semantica ◼ es, tramite uso di tag HTML5 come header, main, section, … ◼ testo "non grafico" ◼ evitare testo dentro immagini (testo rasterizzato) • non scalabile, non personalizzabile (contrasto), non leggibile da screen reader ◼ es, testo in HTML ovunque possibile, attributo alt per immagini (vuoto per immagini decorative) ◼ scalabilità ed adattamento del layout ◼ utenti ipovedenti utilizzano normalmente zoom fino a 200% ◼ es, uso di unità di misura relative, flexbox e gridbox per evitare sovrapposizioni

contrasto sufficiente tra testo e sfondo ◼ fondamentale per ipovedenti e scarsa sensibilità ai colori ◼ formula del contrast ratio=(L₁+0.05)/(L₂+0.05) • L₁ = luminanza relativa colore più chiaro • L₂ = luminanza relativa colore più scuro • L = 0.2126R+0.7152G+0.0722B ◼ linee guida WCAG • 3:1 → testo grande • 4.5:1 → testo normale (AA) • 7:1 → accessibilità migliorata (AAA) ◼ es. background-color: #ffffff; color: #222222; • raggiunge 15.9:1 • es: https://webaim.org/resources/contrastchecker/

uso del colore/multimodalità ◼ non usare solo il colore per comunicare informazioni ◼ poco efficace con daltonismo (es. protanopia, deuteranopia) e media con ridotto supporto cromatico ◼ es, aggiungere ulteriori elementi quali icone, testo esplicativo, pattern visivi, differenze tipografiche ◼ permettere agevole navigazione da tastiera ◼ :focus per evidenziare elementi attivi, tabindex per determinare ordine di navigazione con tab, outline per rendere sempre visibile l’elemento attivo ◼ etichette per descrivere i moduli (&lt;label&gt;) ◼ pagine arricchite da contenuti "ARIA"

ARIA:

standard W3C per facilitare e supportare accessibilità degli utenti ◼ attributo "role" • indica lo scopo dell'elemento, fornendo una descrizione informativa del ruolo stesso • può riferirsi alla struttura del documento o a elementi della UI ◼ alert, banner, button, definition, grid, heading, img, link, menu, row, tab, toolbar, … ◼ https://www.w3.org/WAI/PF/HTML/wiki/RoleAttribute ◼ https://www.w3.org/TR/wai-aria-1.1/#dfn-role • non utile se ridondante (es, se esistono tag HTML5 analoghi) ◼ attributi aria-* • aggiungere metadati, etichette, descrizioni a elementi HTML
