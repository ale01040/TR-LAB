# TR LAB — piano operativo del redesign

14 ottobre 2026. Ambito: implementazione dell'interfaccia della PWA esistente, secondo il sito Open e i quattro riferimenti forniti. Le decisioni successive del committente prevalgono sulle immagini di riferimento: **non usare immagini**, Inter locale, scuro predefinito con chiaro opzionale, diario con righe compatte e campi comodi da toccare. Stato verificato, difetti e limiti nel [rapporto di collaudo](../qualita/REDESIGN_2026_10_14.md).

Questo piano specifica il lavoro visuale; non sostituisce [requisiti](../PIANO_OPERATIVO.md), [roadmap del prodotto](../ROADMAP_SVILUPPO.md), [specifica UX](../specifiche/UX_E_DESIGN.md), né i gate di [sincronizzazione](COLLAUDO_SINCRONIZZAZIONE.md). Le nuove schede e il motore conservano i vincoli del precedente incremento.

## 1. Risultato richiesto e confini

TR LAB deve trasmettere la calma e la pulizia editoriale dei riferimenti: nero, testo avorio, titoli grandi di peso regolare, pochi elementi decorativi e spazio tra le sezioni. La home ha un'atmosfera calda ottenuta da gradienti CSS statici. Programma usa un accento caldo più discreto. Il diario dà priorità a esercizio, target, campi e stato del salvataggio.

Non introdurre fotografie, video, texture bitmap, illustrazioni, sfondi caricati da URL o screenshot Open nell'app. Il marchio visibile è testo HTML «TR LAB». Si conservano icone SVG funzionali Lucide, grafici dei dati e la piccola icona tecnica SVG per favicon/installazione PWA: non sono contenuti fotografici o decorazioni editoriali. Le catture di collaudo sono evidenze fuori dal bundle dell'app.

Non riprodurre il nome Open, loghi Apple, premi «Editors' Choice», stelle o recensioni dei riferimenti come attestazioni di TR LAB. Non introdurre percorsi di meditazione estranei al prodotto. Nessun redesign può far sembrare attivo un metodo di allenamento non revisionato, trasformare un target in una serie eseguita o rimuovere la conferma di una proposta.

## 2. Analisi del riferimento: osservato e adattato

Analizzati il 14 ottobre 2026 la [homepage Open](https://o-p-e-n.com/) e il [catalogo pubblico](https://o-p-e-n.com/all), oltre alle quattro schermate fornite. L'analisi riguarda queste viste pubbliche; non dimostra il comportamento completo dell'app a pagamento.

| Elemento | Evidenza osservata | Applicazione in TR LAB |
| --- | --- | --- |
| Tipografia web | Monument Grotesk Regular, fallback Helvetica; metadati Semi-Mono. Titolo del catalogo 36 px/36 px, peso 400, tracking −0,36 px | InterVariable 4.1, peso 400 per titoli, numeri tabulari nei campi; non si distribuisce Monument Grotesk |
| Colori web | Catalogo nero `#000000`; testo `#EEECE7`; filtro selezionato avorio con testo nero | Nero/avorio misurati dal riferimento 02: `#010000` / `#EFEAE5`; token distinti per testo, bordo decorativo, bordo dei controlli e focus |
| Composizione | Titolo isolato, navigazione semplice, contenuto diviso in sezioni; fotografie come grandi campiture | Gerarchia tipografica e superfici piatte, gradienti CSS in home; nessun media nell'interfaccia |
| CTA | Contrasto netto, forma arrotondata, icone essenziali | Azione principale avorio, secondaria trasparente con contorno, etichette esplicite |
| Libreria dei riferimenti | Collezioni visive, testo essenziale, ordine riconoscibile | Catalogo di esercizi con righe/schede tipografiche, ricerca e filtri accessibili |
| Movimento | Le immagini statiche non attestano tempi, curve o tecnologia delle animazioni | Transizioni funzionali CSS di 180 ms; nessun effetto di scroll o animazione inferito come dato osservato |

La dimensione del titolo misurata nel sito desktop non va trasferita rigidamente su ogni telefono. La famiglia dell'app iOS non è identificata dal solo screenshot. I colori di persone, fotografie e sfondi nelle misure non sono automaticamente token di testo.

Le [quattro misure](../design/README.md) conservano dimensioni originali 1284×2778, palette e copertura dei pixel. Il [Design DNA](../design/TR_LAB_OPEN_DNA.json) usa il riferimento 02 come base scura e documenta gli adattamenti. Misurare una schermata intera include cornici, foto e contenuti: il confronto cromatico automatico va riportato integralmente e non equivale a un giudizio sulla leggibilità.

## 3. Sistema visuale da implementare

### 3.1 Colori e stati

I valori centrali vivono in `apps/web/src/styles/global.css` come custom properties. Vietati nuovi colori casuali nei TSX. Palette scura: fondo `#010000`, superficie `#100D0B`, superficie rialzata `#1D1815`, testo `#EFEAE5`, secondario `#B7AFA8`. Gradiente caldo: `#CC5B30`, `#E1735C`, `#3F0F05`; testo sopra il gradiente con token dedicati e velo scuro stabile. Il colore caldo non indica successo, errore o consenso.

Il bordo decorativo tenue non basta a identificare un campo: usare `--control-border` per input e pulsanti secondari, `--focus` per focus. Verificare testo normale ≥4,5:1, testo grande ≥3:1 e contorni necessari ≥3:1 rispetto alle superfici adiacenti, secondo i criteri applicabili [WCAG sul contrasto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). La misura dei token non prova automaticamente ogni punto di un gradiente o uno stato disabled.

Il chiaro è una variante completa: fondo caldo chiarissimo, superfici chiare, testo scuro, contorni e focus distinti. Preferenza persistita con il meccanismo IndexedDB già esistente; scuro in assenza di scelta. Il pannello hero mantiene la propria palette scura anche nel tema chiaro, con testo e CTA dedicati. La stampa resta bianco/nero e serif come previsto dalle raccolte.

### 3.2 Font e ritmo

Un solo file WOFF2 variabile locale, nessuna richiesta a Google Fonts o CDN durante l'uso. `@font-face` con `font-display: swap`, peso 100–900 e fallback di sistema; font incluso nel precache della PWA. [Inter](https://rsms.me/inter/) è distribuito con [SIL Open Font License](https://github.com/rsms/inter/blob/master/LICENSE.txt), conservata accanto al file.

Titoli di pagina con `clamp()` e peso 400, titolo hero più ampio, testo base 1 rem/1,5. Metadati compatti ma leggibili; usare dimensioni relative, non ridurre i campi per imitare una schermata promozionale. Campi del diario almeno 1 rem su mobile, numeri tabulari. Evitare slogan ripetuti e tracking eccessivo sulle frasi lunghe. Il marchio testuale può avere tracking più ampio.

Ritmo principale: sezioni separate da 2–3,5 rem; card di contenuto con padding 1,25–1,75 rem; meno bordi esterni e shadow rispetto all'alpha precedente. Non dilatare gli spazi nel diario al punto da nascondere la serie successiva.

### 3.3 Layout e interazione

Larghezza massima 82 rem; header orizzontale desktop con cinque destinazioni. Su schermi fino a 52 rem, header testuale e navigazione inferiore con cinque destinazioni e safe area. Stato offline/sync sempre disponibile. Nessun menu supplementare solo per fare scena.

Griglie con `minmax(0, 1fr)`, flex wrap e larghezze relative. Diario: cinque colonne quando c'è spazio; sotto 30 rem ogni serie conserva tre campi affiancati, con numero/target e azioni sulle righe adiacenti. Questa è una riga di registrazione responsiva, non un wizard che obbliga a procedere campo per campo. Provare 320, 390, 430, 768 e 1280 CSS px e testi lunghi. Non nascondere overflow orizzontale globale per mascherare un layout errato.

Controlli principali e campi mirano a 2,75 rem o più di altezza, senza sovrapposizione. Il progetto preferisce 44 CSS px di tocco, più generosi del minimo e delle eccezioni di [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Il focus deve essere visibile e il colore non può essere l'unico indicatore selezionato/salvato.

## 4. Schermate e componenti

| Vista | Modifica | Comportamento da conservare | Prova |
| --- | --- | --- | --- |
| Oggi | Hero caldo CSS, titolo grande, statistiche piatte e CTA chiara | Ripresa della seduta, scelta scheda/giorno/settimana, nessun risultato inventato | QA-DES-01/03, flusso diario |
| Programma | Titolo regolare, elenco più semplice, dettaglio con accento caldo discreto | Import Excel → revisione → bozza → approvazione; target e calendario | E2E Excel/calendario; QA-DES-02 |
| Seduta | Superfici essenziali, campi grandi, etichette locali su schermi stretti | Virgola decimale, RIR zero, salvataggio esplicito, timer, offline, conclusione confermata | E2E diario/reload/offline e controlli 320/430/768 |
| Libreria | Catalogo tipografico senza miniature, separatori e filtri | Ricerca, esercizi personali, profili attrezzi e persistenza | E2E esercizi/attrezzi; QA-DES-01/02 |
| Progressi | Tipografia, superfici e contrasto coerenti | Tabelle equivalenti ai grafici, misure e obiettivi esistenti | QA-DES-02; suite di dominio |
| Profilo | Accesso e preferenze con nuovi token | Auth HttpOnly, Google condizionale, backup, cambio tema e isolamento | QA-DES-01/02; collaudo Auth precedente resta distinto |
| Dialoghi, avvisi, proposte | Stessi token e CTA, focus distinguibile | Trappola focus nativa, ritorno focus, errori visibili, accettazione/rifiuto espliciti | axe sui dialoghi, E2E e revisione React |

Usare componenti esistenti `Shared`, `DecimalInput`, dialoghi/editor e CSS Modules. Estrarre una nuova primitiva solo se evita duplicazione reale o introduce comportamento accessibile verificabile. Non riscrivere il dominio per modificare un titolo o un padding.

## 5. Codice: strumenti, scelte e alternative

| Scelta | Perché e vantaggi | Limiti e alternativa scartata |
| --- | --- | --- |
| React/TypeScript/Vite esistenti | Rotte lazy, build e test già presenti; modifica controllabile | Non offre SSR editoriale nativo; passare a Next.js per il solo look aggiungerebbe una migrazione di Auth/offline senza beneficio richiesto |
| CSS Modules + custom properties, ADR-11 | Temi, media query e stampa leggibili; nessun runtime aggiuntivo; aderisce alle raccolte | Serve disciplina sui token. Tailwind è valido, ma introdurlo ora duplicherebbe la strategia degli stili; UI kit completo imporrebbe adattamenti al diario |
| InterVariable locale | Licenza libera conservata, singolo asset, uso offline, scelta esplicita dell'utente | ~352 kB aggiunti al precache. Font di sistema più leggero ma meno uniforme; Monument commerciale non autorizzato/licenziato |
| Gradienti statici CSS | Atmosfera calda senza immagini; niente download di media o animazioni continue | Non riproduce figure o sfocature fotografiche. Video/WebGL/Canvas/GSAP aumenterebbero peso e consumi senza necessità del flusso |
| HTML nativo e icone funzionali SVG | Semantica, tastiera, etichette e touch; nessun nuovo SDK | Richiede verifiche manuali oltre axe. Un'immagine del pulsante/testo renderebbe l'interfaccia meno adattabile |
| Playwright + axe + Vitest, ADR-12 | Regressione di flussi reali locali e controllo dei temi; suite esistente mantenuta | Non prova hardware, screen reader, SMTP o cloud offline; questi gate restano separati |

Scrivere TypeScript strict. Non usare `any`, cast per aggirare i contratti o selettori dipendenti dall'ordine DOM senza motivo. Gli handler di salvataggio e consenso rimangono negli adattatori già previsti; niente SDK Supabase, chiamate di rete o service key negli stili o nelle regole pure.

Commenti mirati: spiegare perché il hero usa token fissi nei due temi, perché le righe cambiano disposizione, e invarianti non ovvi. Non commentare ogni proprietà CSS. Se un colore è un dato misurato, annotarne fonte; se un breakpoint o una durata è scelto per il prodotto, dichiararlo come scelta, non come misura di Open.

Conservare stati disabled/loading/error e messaggi di salvataggio; niente animazione che ritardi input o conferma. `prefers-reduced-motion` elimina transizioni non necessarie. Vietati cursori custom, scroll hijacking e auto-play. Gli asset personali non entrano nel repository.

## 6. Roadmap eseguibile

| Ticket | Dipende da | Attività e consegna | Criterio di uscita |
| --- | --- | --- | --- |
| DES-01 | DEC-32–35 | Analisi, misure, font/licenza, DNA e questo piano | Osservazioni distinte da adattamenti; nessuna immagine aggiunta |
| DES-02 | DES-01 | Token scuro/chiaro, font locale, stampa | Build valida; coppie di contrasto misurate; font offline |
| DES-03 | DES-02 | Header, navigazione, Oggi, Programma, catalogo | Rotte e azioni riconoscibili; nessuna decorazione raster/video |
| DES-04 | DES-02 | Diario e dialoghi responsive | Target e risultati distinti; input ≥44 px nelle larghezze provate; nessuna perdita dopo reload/offline |
| DES-05 | DES-03/04 | Test funzionali e visuali, accessibilità, palette | Suite passata; differenze fotografiche documentate, nessun falso PASS di fedeltà |
| DES-06 | DES-05 | Revisione diff/secret scan, commit e consegna sul ramo | Modifiche e font/licenza tracciati; file personali esclusi |
| DES-07 | DES-06 | Preview sul solo staging esistente, verifica HTTP/UI | Build READY e corrispondenza dell'asset; Auth/callback e gate riportati separatamente |
| DES-08 | Gate S/C/A/D/R del prodotto | Promozione dopo collaudo cloud/telefono/restore | Backup, rollout/rollback e approvazioni previste chiusi; il redesign da solo non autorizza il merge |

Tracciabilità: RF-16 (responsive/temi/stampa/accessibilità), RF-18 (convenzioni); ADR-11/12; WEB-02 HTML, WEB-03 CSS, WEB-04 design/temi, WEB-05 accessibilità, WEB-06 stampa. DES-04 mantiene RF diario/offline e DEC-06 senza cambiare i contratti. Requisiti e gate completi restano nella matrice della roadmap.

## 7. Collaudo e rilascio

QA-DES-01: passare da scuro a chiaro, ricaricare e navigare; nessuna preferenza persa. Caricare il WOFF2 dalla stessa origine e riaprire offline dopo precache. Verificare zero immagini/video/canvas e sfondi `url()` nel contenuto di tutte le rotte principali.

QA-DES-02: axe per entrambe le palette e tutte le cinque rotte; controlli di overflow a 320/430/768 oltre ai progetti desktop/mobile. Il report automatico non sostituisce lettori di schermo, focus visivo, zoom reale o una valutazione WCAG completa.

QA-DES-03: ripetere il percorso sintetico Excel → bozza → approvazione → calendario → seduta → serie → reload/offline → conclusione. Provare virgola e RIR zero; nessuna azione di consenso scompare sotto il redesign. Catture home, libreria e diario da ispezionare realmente, non solo da generare.

QA-DES-04: stampa chiara dai due temi, navigazione e controlli esclusi, contenuti leggibili. Misurare i token e confrontare le palette con tutte le quattro misure usando il runner della skill. Riportare i FAIL di composizione dovuti alla rimozione deliberata delle foto: non introdurre immagini per far passare un confronto contrario alla richiesta più recente.

Eseguire format check, typecheck, lint, unit/integration, build, controllo pacchetto Vercel ed E2E. Le prove del database esistente non vengono dichiarate ripetute se non eseguite. Nessuna migrazione necessaria per questo incremento visuale. Per rollback usare un nuovo commit che ripristina i file visuali e il font; i dati e le migrazioni non vanno cancellati.

## 8. Compatibilità con le raccolte e sviluppi futuri

Applicati indici e regole generali, HTML, CSS e Web design di entrambe le raccolte. Gli Appunti riportano indicazioni storiche contrarie ai gradienti e riferimenti ai colori web-safe: la richiesta esplicita dell'utente giustifica gradienti CSS statici e colori misurati su browser moderni, mantenendo contrasto e fallback; originali invariati. Le Linee guida HTML invitano a chiedere immagini/icona: «non usare immagini» chiude quella scelta, non richiede un'altra domanda. Inter locale risolve la preferenza tipografica senza assumere una licenza Monument.

Possibili sviluppi successivi: ricerca e filtri più raffinati nel catalogo, sintesi dei progressi più leggibile, modalità diario ancora più densa selezionabile, font subset solo dopo controllo di accenti italiani/Unicode e licenza. Nessuna immagine va aggiunta come estensione futura automatica: occorre un nuovo requisito. Valutare animazioni solo dopo prove su telefono e budget misurato; le proposte automatiche e l'AI seguono la propria roadmap e revisione di dominio.
