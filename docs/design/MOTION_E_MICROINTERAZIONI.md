# TR LAB — motion e microinterazioni

14 ottobre 2026. Sintesi dell'allegato «Testo incollato.txt», fonti consultate e contratto di applicazione a TR LAB. Questo documento completa [UX Nielsen](../piani/UX_NIELSEN.md), [redesign Open](../piani/REDESIGN_OPEN.md) e [specifica UX](../specifiche/UX_E_DESIGN.md). Le prove effettivamente eseguite e i loro limiti appartengono al rapporto di consegna: una decisione documentata non equivale a una funzione collaudata.

## 1. Scopo e vincoli del prodotto

Il movimento deve aiutare a riconoscere un'azione, un nuovo stato o un cambio di contesto. In TR LAB una persona registra serie su telefono, spesso con una mano occupata: input, target, esito del salvataggio e recupero dell'errore hanno priorità. Il feedback mantiene un testo esplicito anche quando il movimento è disabilitato. Questa applicazione riprende il criterio di movimento breve, intenzionale e opzionale delle [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion?changes=l_9_3) e il collegamento tra azione e riscontro delle [microinterazioni NN/g](https://www.nngroup.com/articles/microinteractions/).

La direzione Open resta confermata: Inter locale, scuro predefinito, chiaro opzionale, superfici tipografiche e gradienti statici. Nessuna fotografia, video, illustrazione o media decorativo. I riferimenti statici e le misure nel [README design](README.md) non dimostrano le animazioni dell'app privata Open: durata, curva e comportamento qui descritti sono scelte TR LAB.

Per questo incremento si usano CSS Modules e API HTML esistenti, senza nuove dipendenze. L'animazione non determina autenticazione, consenso, scrittura del diario o sincronizzazione. Nessun target approvato cambia per effetto di una transizione. L'esito arriva dal caso d'uso; il movimento lo rende percepibile senza anticiparlo.

## 2. Vocabolario operativo

| Termine | Significato | Uso appropriato in TR LAB |
| --- | --- | --- |
| Motion design / UI animation | Progettazione del movimento come parte dell'interazione | Stabilire scopo, causa, stato finale, alternativa statica e condizioni di interruzione prima di scegliere una libreria |
| Microinterazione | Un evento produce un riscontro piccolo e contestuale; può anche essere statico | Pressione di un pulsante, stato «Salvataggio…», messaggio dopo un commit riuscito |
| Transizione di stato | Passaggio tra stati dello stesso controllo o contenitore | Apertura di un dialogo, selezione di un filtro; semantica e focus cambiano subito |
| Page / view transition | Collegamento visuale tra due viste | Un ingresso leggero del titolo aiuta a riconoscere la nuova pagina; non implica l'uso della View Transition API |
| Crossfade | Vecchio e nuovo contenuto si sovrappongono variando opacità | Candidato futuro solo per viste compatibili con privacy e router; l'ingresso CSS del solo titolo è un fade, non un crossfade tra pagine |
| Slide | Traslazione associata a una direzione | Eventuale navigazione gerarchica futura: avanti e indietro coerenti; evitare sul diario e sui cambi account |
| Shared element transition | Un elemento riconoscibile conserva continuità fra due posizioni o viste | Candidato per riga di programma → dettaglio; non richiede una foto e non anima risultati ancora non salvati |
| Scroll-driven | Lo scorrimento guida direttamente il progresso, anche all'indietro | Non previsto nel diario; eventuale dimostrazione informativa separata dal compito |
| Scroll-triggered | Una soglia di scroll avvia, arresta o inverte una normale animazione temporale | Non usare per nascondere le righe in attesa di uno scroll o per obbligare a leggere una rivelazione |
| Parallax | Elementi scorrono a velocità relative diverse, producendo una percezione di profondità | Escluso dal presente incremento: non aiuta a registrare una serie |
| Skeleton screen | Segnaposto della struttura attesa durante un caricamento reale | Candidato per un catalogo lento con struttura prevedibile; mai contenuto finto né risultati suggeriti |
| Easing | Curva che distribuisce la variazione lungo una durata | Curva sobria e coerente per feedback brevi, senza rimbalzo |
| Spring | Modello a molla, con risposta dipendente da parametri fisici e velocità | Candidato per un futuro gesto interrompibile; non necessario per un fade di opacità |

La distinzione fra scroll-driven e scroll-triggered è esplicita nella [guida MDN sui trigger](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animation_triggers/Using_scroll-triggered_animations). I nomi descrivono comportamenti; la presenza di una libreria non dimostra che siano corretti o accessibili.

## 3. Scelte tecniche e limiti

### 3.1 CSS come base

Una `transition` interpola proprietà quando cambia lo stato; `@keyframes` descrive una sequenza, adatta all'ingresso di un elemento. Specificare le proprietà interessate, evitando `transition: all`. Mantenere lo stato finale leggibile nel CSS ordinario, anche senza animazione. Non subordinare un commit a `animationend` o `transitionend`: con riduzione del movimento, rimozione del nodo o cancellazione l'evento può non rappresentare il percorso atteso. Riferimenti: [transizioni](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions/Using_CSS_transitions), [animazioni](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations), [keyframes](https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes).

Preferire opacità e trasformazioni piccole; altezza, larghezza, margini, `top` e `left` possono richiedere layout o paint a ogni frame. Non animare il riordino automatico dei campi mentre si digita. I nuovi meccanismi per dimensioni intrinseche o proprietà discrete richiedono verifica separata: non assumere che `height: auto` sia interpolabile in tutti i browser. Il posizionamento del dialogo resta quello del componente nativo, senza introdurre un `transform` che ne alteri il centraggio.

### 3.2 View Transition API: approfondimento futuro

La modalità same-document avvolge un aggiornamento DOM con `document.startViewTransition()`. Il browser cattura il vecchio stato, esegue l'aggiornamento e costruisce pseudo-elementi per il collegamento visuale. `view-transition-name` abbina elementi e deve essere univoco nei partecipanti alla cattura. Le promise distinguono aggiornamento, preparazione e fine del movimento: un errore visuale non deve ripetere un comando già eseguito. [Guida Chrome SPA](https://developer.chrome.com/docs/web-platform/view-transitions/same-document), [MDN API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API).

La modalità cross-document riguarda due documenti della stessa origine che partecipano alla navigazione. L'opt-in CSS `@view-transition { navigation: auto; }` appartiene a questo caso; aggiungerlo alla SPA React non anima da solo le rotte. Non richiede lo stesso callback JavaScript della modalità SPA. [Guida Chrome MPA](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document), [MDN at-rule](https://developer.mozilla.org/docs/Web/CSS/Reference/At-rules/@view-transition).

TR LAB rinvia entrambe le integrazioni native finché non esistono un caso d'uso utile, un flag disattivabile, fallback immediato e prove con router reale. Devono essere gestiti navigazione avanti/indietro, lazy loading, scroll, focus, URL, doppio clic e aggiornamenti concorrenti. Il commit React deve essere visibile nel momento previsto dal callback: un generico `setState` non costituisce da solo una prova. Verificare la specifica API del router e la versione React effettivamente installata, senza migrare a una release sperimentale per ottenere un effetto.

**Confine di privacy:** niente catture della vecchia vista durante accesso, uscita, cambio account o viste con credenziali e segreti. Nessuna animazione di uscita conserva il DOM dell'account precedente dopo che deve essere rimosso. Evitare anche il crossfade dell'intero `main`: la continuità visuale non può prevalere sull'isolamento. Questa è una regola di progetto derivata dal funzionamento delle snapshot, non l'affermazione che l'API invii immagini a un servizio remoto.

### 3.3 Confronto degli strumenti

| Strumento | Quando avrebbe valore | Costo e cautela | Decisione TR LAB |
| --- | --- | --- | --- |
| CSS nativo | Stati semplici, ingresso breve, pressione, focus | Nessun runtime aggiunto; responsabilità su proprietà, semantica e media query | Base di questo incremento |
| View Transitions native | Continuità fra viste e pochi elementi riconoscibili | Snapshot, compatibilità per singola funzione, coordinamento router/React e fallback | Rinvio; nessun opt-in globale |
| Motion per React | Layout dichiarativo, elementi condivisi, entrata/uscita, gesti e molle | `layout`/`layoutId` lavorano sugli elementi reali; scala può deformare testo e bordi; `AnimatePresence` mantiene nodi durante l'uscita | Valutare solo per un bisogno React dimostrato; escluso sui cambi account |
| GSAP | Sequenze con timeline, controllo di pause/interruzioni, SVG o geometrie più articolate | Importare e registrare solo ciò che serve; orchestrazione imperativa deve rispettare il ciclo React | Prima opzione da valutare se emerge una vera coreografia, senza aggiungerlo ora |
| GSAP Flip | Transizione misurata tra due layout | Cattura geometria, modifica stato, anima gli offset; misure e resize vanno controllati | Candidato per riordino editor esplicito; nessun automatismo nel diario |
| GSAP ScrollTrigger | Trigger di scroll o avanzamento collegato a scroll con `scrub` | Listener, misure, pinning e cleanup; non rende utile il parallax per definizione | Non richiesto nel presente prodotto |
| Lottie / dotLottie | Riproduzione di una composizione illustrata già progettata | Player e asset, controllo riproduzione, licenza, fallback testuale, caricamento e offline | Fuori dal requisito attuale senza media decorativi |
| AutoAnimate | Piccole liste in cui aggiunta, rimozione e spostamento sono il solo bisogno | Osserva i figli immediati; può cambiare posizionamento del contenitore; attenzione a flex e controllo della densità | Non introdurlo sul diario; CSS basta all'incremento |

Riferimenti per il confronto: [Motion layout](https://motion.dev/docs/react-layout-animations), [AnimatePresence](https://motion.dev/docs/react-animate-presence), [GSAP Flip](https://gsap.com/docs/v3/Plugins/Flip/), [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [dotLottie JS](https://docs.lottiefiles.com/en/runtimes/distributions/js), [AutoAnimate](https://auto-animate.formkit.com/). Le comparazioni del produttore di una libreria aiutano a identificare differenze, ma non sono un benchmark TR LAB né una verità immutabile sulle API native che continuano a evolvere.

Se in futuro si sceglie GSAP in React, usare `useGSAP`, un `scope` basato su ref e cleanup/revert del contesto. Le animazioni create in handler successivi devono entrare nel contesto tramite `contextSafe`; rimuovere anche i listener aggiunti manualmente. Valutare `revertOnUpdate` quando le dipendenze ricreano le animazioni. Nessun selettore globale che coinvolga altre rotte. Import e contenuto restano locali e disponibili offline, con costo del bundle misurato. [Integrazione ufficiale React](https://gsap.com/resources/React/).

## 4. Contratto del movimento TR LAB

### 4.1 Vocabolario visuale dell'incremento

| Elemento / evento | Movimento scelto | Invariante |
| --- | --- | --- |
| Titolo della nuova pagina | Ingresso CSS di 160 ms, opacità 0,94 → 1, curva di uscita sobria, nessun ritardo | Titolo e contenuto presenti da subito; nessuna traslazione dell'intero modulo o dei campi |
| Nuovo feedback contestuale | Lo stesso ingresso breve una sola volta | Testo/esito subito disponibili; non ripetere il movimento a ogni render o carattere |
| Apertura dialogo | Ingresso di opacità breve; centraggio e gestione del dialogo nativi | Focus immediato, Escape/annullamento secondo lo stato applicativo, ritorno focus alla chiusura |
| Pressione pulsante abilitato | Spostamento massimo di 1 CSS px, espresso in unità relativa coerente con gli stili | Nessun cambiamento di layout, nessuna attesa per invio; disabled non simula una pressione riuscita |
| Hover e selezione | Transizioni esistenti brevi e mirate dove aiutano a riconoscere il controllo | Hover non è l'unico riscontro su touch; focus visibile immediatamente |
| Salvataggio serie, login, logout, sync | Stato testuale reale, blocco del doppio invio già previsto, feedback dopo esito | Una pressione indica attivazione, non successo; commit locale e sync restano distinti |
| Cambio tema, stampa, timer, grafici | Stato informativo immediato, senza sequenza decorativa | Nessun count-up dei risultati o lampeggio a ogni secondo; stampa nello stato finale |

160 ms e l'ampiezza del fade sono scelte dell'incremento, non valori misurati da Open né obblighi Apple/Material. Affinamenti futuri richiedono confronto su telefono. Le transizioni cromatiche già presenti vanno trattate separatamente: possono produrre paint e non appartengono alla garanzia di compositing delle trasformazioni. Evitare rimbalzi, shake degli errori, confetti, gradiente in movimento e animazione in loop.

### 4.2 Accessibilità e riduzione del movimento

Il controllo «Riduci animazioni» dell'app e `prefers-reduced-motion: reduce` hanno precedenza: basta una delle due richieste per disabilitare gli effetti opzionali. Una preferenza dell'app non può riattivare il movimento contro la richiesta del sistema. Il caricamento iniziale della preferenza non deve produrre un lampo di animazione prima che sia applicata. Verificare il cambiamento a pagina aperta e la persistenza attraverso reload/offline secondo il repository delle preferenze esistente. [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

Con riduzione attiva: nessuna animazione di ingresso, nessun transform da pressione, nessuno scroll animato e nessuna sequenza di uscita. Lo stato finale rimane visibile senza introdurre una dissolvenza sostitutiva obbligatoria. Non usare una regola che porti tutto a 0,01 ms e dipendere poi da eventi di fine: il flusso deve funzionare indipendentemente dai tempi CSS.

Focus, etichette e annunci restano responsabilità dei componenti semantici. Successo/informazione possono essere annunciati moderatamente; gli errori restano associati al campo e disponibili fino alla correzione o chiusura esplicita. Nessun errore sparisce perché termina il fade. Il dialogo non perde focus durante l'apertura; i controlli non diventano cliccabili soltanto a fine effetto. Le applicazioni delle [WCAG 2.2](https://www.w3.org/TR/WCAG22/) richiedono verifiche manuali; il criterio sulle animazioni da interazione 2.3.3 è AAA, mentre il progetto mantiene l'obiettivo AA e adotta comunque la riduzione del movimento come requisito proprio.

### 4.3 Loading e prestazioni

Usare un testo esplicito per un'operazione in corso. Un indicatore indeterminato comunica attività, non percentuale. Un avanzamento determinato usa dati reali del processo: non far arrivare una barra al 90% con un timer per rendere gradevole una risposta incerta. Non introdurre una durata minima artificiale del salvataggio per mostrare meglio l'animazione.

Uno skeleton sarebbe utile solo quando struttura e dimensioni sono prevedibili e l'attesa è misurata. Riservare spazio, rimuoverlo su successo/errore e nascondere i segnaposto alle tecnologie assistive mantenendo un messaggio di caricamento. Nel primo incremento basta la variante statica; nessuno shimmer in loop. La scelta fra skeleton, spinner e barra dipende dal compito, come ricorda la [pagina NN/g del confronto](https://www.nngroup.com/videos/skeleton-screens-vs-progress-bars-vs-spinners/); il video non è stato riprodotto in questa lettura.

Budget dell'incremento: zero nuove librerie e asset di movimento; soli effetti brevi su pochi elementi. Misurare comunque input, frame persi, layout/paint e memoria su un percorso del diario e durante un dialogo. `transform` e `opacity` favoriscono il compositing, ma non garantiscono 60 fps su ogni dispositivo. `will-change` si aggiunge soltanto dopo una misura che ne dimostri l'utilità e si limita a pochi elementi: più layer possono consumare memoria. [Guida web.dev](https://web.dev/articles/animations-guide), [prestazioni delle animazioni](https://web.dev/articles/animations-and-performance).

## 5. Compatibilità: verifica del 14 ottobre 2026

L'allegato include dati di supporto che non vanno trasformati in condizioni basate sullo user agent. Verificare la funzione concreta e mantenere il comportamento statico completo. Una tabella di disponibilità non sostituisce un test nei browser supportati dalla PWA.

| Funzione | Riscontro aggiornato e limite | Conseguenza |
| --- | --- | --- |
| Same-document View Transitions, nucleo Level 1 | Chrome/Edge 111, Safari 18, Firefox 144; Baseline Newly available dal 14 ottobre 2025 secondo [web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available). Le [note Firefox 144](https://www.firefox.com/en-US/firefox/144.0/releasenotes/) confermano Level 1 | Feature detection su `document.startViewTransition`; questo dato non copre automaticamente `types`, scope o tutte le estensioni |
| Cross-document / `@view-transition` | [MDN browser-compat-data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/view-transition.json) indica Chrome 126, Safari 18.2 e `version_added: false` per Firefox. [caniuse](https://caniuse.com/cross-document-view-transitions) mostra invece supporto parziale su versioni Firefox recenti | Registrare la discrepanza; non dire che Firefox abbia supporto MPA completo, né estendere una voce aggregata a ogni API. Opt-in e browser reali restano gate |
| CSS scroll-driven / `animation-timeline` | [BCD della proprietà](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/animation-timeline.json): Chrome/Edge 115, Safari 26, Firefox `preview` | La nota «dietro flag nella stabile» dell'allegato non è una prova corrente di supporto predefinito. Non richiedere flag all'utente; fallback statico |
| CSS scroll-triggered | [Guida MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animation_triggers/Using_scroll-triggered_animations) descrive trigger di animazioni temporali | Verificare separatamente proprietà e trigger usati: non eredita il supporto di `animation-timeline`; nessuna implementazione nel diario |
| Riduzione del movimento | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) classifica la media feature come ampiamente disponibile | Trattarla come parte del contratto base, anche per eventuali future librerie |

I file BCD su `main` sono fonti aggiornabili: data e risultati riportati descrivono questa verifica, non una promessa perpetua. In una futura implementazione nativa, fissare nel rapporto anche versione/commit del dataset e browser realmente provati.

Anche Material va precisato: il vecchio link a easing/duration non è l'intero sistema attuale. La [pagina Motion ufficiale](https://m3.material.io/styles/motion) descrive il sistema fisico introdotto con M3 Expressive, che sostituisce quello precedente e distingue movimento spaziale ed effetti come colore/opacità. Questo non impone a TR LAB un'interfaccia Material, molle o rimbalzi: una dissolvenza sobria resta una scelta motivata dal compito.

## 6. Roadmap e accettazione

Tracciabilità di base: RF-16/18; DEC-19 e DEC-32–35; ADR-11/12; WEB-01–07/09. I flussi mantengono gli invarianti account, diario, conferma e offline della specifica UX. I seguenti ticket sono attività e criteri di uscita, non attestazioni di PASS.

| Ticket | Dipendenze e consegna | Prova / criterio di uscita |
| --- | --- | --- |
| MOT-01 | UX-01/04/08, DES-02: token/effetti CSS su titolo, feedback, dialogo e pressione | Effetti una volta per evento, zero nuove dipendenze, nessun movimento del contenuto durante digitazione |
| MOT-02 | MOT-01, WEB-05/06: preferenza app più media query, entrambe prevalenti | QA-MOT-01: sistema ridotto, app ridotta e combinazioni; cambio a pagina aperta; reload/offline e stampa senza effetti |
| MOT-03 | MOT-01/02, UX-03/05/09: stati, focus e isolamento | QA-MOT-02: login/logout/cambio account, rete lenta/fallita, doppio invio, dialogo annullato e commit; nessun falso successo o residuo account |
| MOT-04 | MOT-03, ADR-12/WEB-09: regressione e prestazioni | QA-MOT-03: due temi, 320/390/430/768/1280 px, tastiera/zoom, input decimali/RIR zero, timer/reload/offline; profilo prestazioni locale con condizioni annotate |
| MOT-05 | Dopo gate MOT-04: spike opzionale View Transitions/shared element | Flag e fallback, niente auth/snapshot sensibili, router e focus corretti, browser mancanti/errore API/navigazione rapida provati; adottare solo se la continuità aiuta |
| MOT-06 | Solo dopo bisogno dimostrato: valutazione Motion o GSAP | ADR con caso concreto, confronto CSS/native, licenza/versione, bundle, offline e cleanup; nessuna installazione di librerie equivalenti senza scopo |

QA-MOT-01 deve controllare proprietà calcolate ed effetto osservabile; uno screenshot statico non dimostra l'assenza del movimento. QA-MOT-02 verifica esiti e conservazione dell'input, non soltanto classi CSS. QA-MOT-03 comprende ispezione manuale delle catture e prove durante l'interazione: axe non valuta da solo comfort vestibolare, tempi o screen reader.

La consegna distingue typecheck/lint/build e prove funzionali realmente eseguite dalle verifiche ancora aperte su telefoni, VoiceOver/TalkBack, tastiera virtuale e browser fisici. La documentazione non chiude i gate cloud, restore o revisione dei metodi di allenamento. Il movimento resta nell'adapter UI; domain e contracts non importano librerie visuali, SDK o rete. Nessun rilascio o servizio remoto è conseguenza implicita di questa sintesi.

## 7. Registro delle fonti fornite e stato della consultazione

L'allegato è stato letto integralmente. Le 40 destinazioni sono inventariate di seguito; la consultazione riguarda le pagine fornite e le sezioni pertinenti disponibili nel testo web della sessione, non l'intera documentazione ricorsiva di ogni libreria. Le pagine d'ingresso restano tali. Non sono stati riprodotti video, né collaudate le demo con i loro effetti. La lettura non include aree private o autenticazione nei siti di riferimento.

Stati: **L** = testo/sezione tecnica pertinente consultata; **I** = pagina di ingresso/panoramica consultata, capitoli collegati non letti integralmente; **J** = apertura resa come shell JavaScript, con recupero del testo ufficiale indicizzato indicato; **D** = pagina dimostrativa repertoriata, comportamento non collaudato; **V** = descrizione della pagina video, nessuna visione; **C** = tabella di compatibilità consultata, senza esecuzione nei browser. La voce «punto conservato» è una parafrasi breve e non una copia delle fonti.

| ID | Fonte fornita | Stato e punto conservato / limite |
| --- | --- | --- |
| M-01 | [Material, easing e duration](https://m3.material.io/styles/motion/easing-and-duration) | J — link storico; aggiornamento ufficiale `/styles/motion` letto tramite testo indicizzato, sistema fisico descritto sopra |
| M-02 | [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | J — shell all'apertura; testo ufficiale con `?changes=l_9_3` consultato: intenzionalità, brevità, opzionalità e libertà di agire |
| M-03 | [NN/g Microinteractions](https://www.nngroup.com/articles/microinteractions/) | L — relazione fra trigger e riscontro contestuale; prevenzione degli errori e stato visibile |
| M-04 | [NN/g Skeleton Screens 101](https://nngroup.com/articles/skeleton-screens/) | L — variante senza `www` non accessibile in un tentativo; pagina canonica [con www](https://www.nngroup.com/articles/skeleton-screens/) raggiunta; caricamento e struttura attesa |
| M-05 | [NN/g video skeleton/barre/spinner](https://www.nngroup.com/videos/skeleton-screens-vs-progress-bars-vs-spinners/) | V — descrizione del confronto consultata; nessuna visione o trascrizione completa dichiarata |
| M-06 | [easings.net](https://easings.net/) | I — repertorio di curve; supporto visuale alla scelta, non regola di usabilità né benchmark |
| M-07 | [GSAP Eases](https://gsap.com/docs/v3/Eases) | I — repertorio/visualizzatore; non tutte le curve hanno equivalenti CSS diretti |
| M-08 | [MDN CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions/Using_CSS_transitions) | L — proprietà, tempi e curva; cautela su `auto` e proprietà discrete |
| M-09 | [MDN CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations) | L — durata, iterazioni, fill mode e sequenza; nessun loop obbligatorio |
| M-10 | [MDN @keyframes](https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes) | L — tappe della sequenza e stato iniziale/finale |
| M-11 | [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | L — SPA/MPA, catture e pseudo-elementi; singole estensioni hanno supporto distinto |
| M-12 | [MDN CSS view transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_view_transitions) | I — modulo CSS, proprietà e riferimenti; non promessa di copertura uniforme |
| M-13 | [MDN @view-transition](https://developer.mozilla.org/docs/Web/CSS/Reference/At-rules/@view-transition) | L — opt-in cross-document, non automatismo del router SPA |
| M-14 | [Chrome panoramica View Transitions](https://developer.chrome.com/docs/web-platform/view-transitions) | I — distinzione delle due modalità e percorsi di approfondimento |
| M-15 | [Chrome same-document](https://developer.chrome.com/docs/web-platform/view-transitions/same-document) | L — callback DOM, pseudo-elementi, nomi univoci e fallback |
| M-16 | [Chrome cross-document](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document) | L — navigazioni compatibili, stessa origine e opt-in dei documenti |
| M-17 | [Stack Navigator MPA](https://view-transitions.chrome.dev/stack-navigator/mpa/) | D — esempio di navigazione; nessun test della demo o trasferimento diretto a TR LAB |
| M-18 | [Profiles MPA](https://view-transitions.chrome.dev/profiles/mpa/) | D — esempio di elemento condiviso; immagini della demo non autorizzano immagini nell'app |
| M-19 | [caniuse same-document](https://caniuse.com/view-transitions) | C — supporto aggregato confrontato con Baseline e note ufficiali |
| M-20 | [caniuse cross-document](https://caniuse.com/cross-document-view-transitions) | C — voce Firefox parziale; discrepanza con BCD dello specifico `@view-transition` registrata, nessun supporto pieno dedotto |
| M-21 | [MDN scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations) | I — avanzamento dipendente dallo scroll; modulo con più proprietà |
| M-22 | [MDN scroll-driven timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations/Timelines) | L — timeline legate al progresso dello scroll o alla visibilità di un elemento |
| M-23 | [MDN animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline) | L — scelta della timeline; supporto verificato anche nel dataset BCD |
| M-24 | [Chrome animate on scroll](https://developer.chrome.com/docs/css-ui/scroll-driven-animations) | L — meccanismi nativi; nessuna adozione implicita di pinning/parallax |
| M-25 | [scroll-driven-animations.style](https://scroll-driven-animations.style) | I/D — raccolta di esempi e strumenti; demo non eseguite, non consultate ricorsivamente |
| M-26 | [MDN scroll-triggered](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animation_triggers/Using_scroll-triggered_animations) | L — trigger e animazioni a tempo distinti dalle scroll-driven |
| M-27 | [Motion React get started](https://motion.dev/docs/react) | I — ingresso alla libreria React; non tutti i capitoli/versioni consultati |
| M-28 | [Motion layout/shared layout](https://motion.dev/docs/react-layout-animations) | L — `layout`, `layoutId`, scroll container, scala e confronto con API native; confronto del produttore, non misura locale |
| M-29 | [Motion AnimatePresence](https://motion.dev/docs/react-animate-presence) | L — permanenza dei nodi per exit e chiavi stabili; incompatibile con conservazione visuale fra account |
| M-30 | [GSAP docs](https://gsap.com/docs/) | I — ingresso a core/timeline/plugin; API non lette tutte ricorsivamente |
| M-31 | [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | L — trigger, `scrub`, pin e controllo; nessuna installazione nel presente incremento |
| M-32 | [GSAP Flip](https://gsap.com/docs/v3/Plugins/Flip/) | L — rileva geometria e anima differenze dopo modifica layout; non sostituisce lo stato React |
| M-33 | [dotLottie JS player](https://docs.lottiefiles.com/en/runtimes/distributions/js) | I — player `.lottie`/JSON e percorsi di playback/performance; API collegate non lette integralmente |
| M-34 | [dotLottie web component](https://docs.lottiefiles.com/en/runtimes/distributions/web-component) | I — `<dotlottie-wc>` avvolge il player; indice di attributi/API non equivalente a lettura completa |
| M-35 | [Lottie format docs](https://lottiefiles.github.io/lottie-docs/) | I — panoramica del formato JSON e capitoli; schema/formato completo non verificati |
| M-36 | [AutoAnimate docs](https://auto-animate.formkit.com/) | L — aggiunta/rimozione/spostamento dei figli immediati; reduced motion, hook e limiti flex |
| M-37 | [AutoAnimate GitHub](https://github.com/formkit/auto-animate) | I — repository/README di ingresso; nessun audit integrale del codice o della supply chain |
| M-38 | [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | L — richiesta di ridurre/rimuovere il movimento opzionale, applicabile anche a pagina aperta |
| M-39 | [web.dev CSS animations guide](https://web.dev/articles/animations-guide) | L — pipeline, layout/paint, transform/opacity e uso misurato di `will-change` |
| M-40 | [web.dev animations/performance](https://web.dev/articles/animations-and-performance) | L — costo del rendering e necessità di misurare sul dispositivo; nessuna garanzia assoluta di fluidità |

Fonti primarie supplementari consultate per risolvere i punti incerti: [Material Motion attuale](https://m3.material.io/styles/motion), [Apple Motion con testo indicizzato](https://developer.apple.com/design/human-interface-guidelines/motion?changes=l_9_3), [BCD animation-timeline](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/animation-timeline.json), [BCD @view-transition](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/view-transition.json), [web.dev Baseline same-document](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available), [Firefox 144 release notes](https://www.firefox.com/en-US/firefox/144.0/releasenotes/), [GSAP React](https://gsap.com/resources/React/). La fonte normativa [WCAG 2.2](https://www.w3.org/TR/WCAG22/) è il riferimento dei criteri di accettazione, non una certificazione già ottenuta.

Capitoli originali applicati: Appunti 01–05 e Linee guida 01–05/07, letti per semantica, CSS, media query, Nielsen, tastiera, stampa, modularità e prestazioni. Il divieto di abuso del movimento negli Appunti è coerente con questa scelta funzionale; DEC-19 mantiene commenti mirati. Il presente documento non modifica le raccolte, la scelta Supabase o i contratti di salvataggio. Le verifiche del software e i capitoli ulteriori su auth/sicurezza vengono tracciati nella consegna dell'incremento che modifica il codice, separatamente dalla verifica documentale qui raccolta.
