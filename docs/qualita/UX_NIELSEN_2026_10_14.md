# TR LAB — verifica dell'incremento UX e motion

14 ottobre 2026. Incremento pubblicato nella [Preview di staging](https://tr-bfq6gm2tu-pere01040.vercel.app), codice `8de6e070cf970788b7ebc507ed1b3f8f66515e3a`, con [CI Windows/Linux riuscita](https://github.com/ale01040/TR-LAB/actions/runs/38574207876). [Piano Nielsen](../piani/UX_NIELSEN.md), [motion e registro fonti](../design/MOTION_E_MICROINTERAZIONI.md). Questo rapporto riguarda il nuovo incremento, successivo al redesign 43e99b1; la relativa Preview precedente è una baseline storica, non la prova del codice nuovo.

## Modifiche e invarianti

Login verificato dopo il controllo della sessione; password con requisiti e ripetizione, errori vicini ai campi, mostra/nascondi e dati conservati dopo fallimento. Google visibile solo se disponibile e bloccato durante una revoca pendente. Logout confermabile/annullabile, dati locali conservati e revoca remota distinta dal logout locale. Il guasto della cache account resta visibile nel Profilo anche dopo il toast di accesso riuscito.

Diario con righe compatte, stato salvato/modificato/in corso, unità e RIR spiegati, invio singolo e controlli bloccati durante commit. Anche la conclusione seduta conserva le note dopo un errore e impedisce modifiche mentre salva. Misure, nutrizione, tema e backup hanno esiti espliciti. Filtri azzerabili e guida locale ricercabile. Le proposte conservano le conferme esplicite; generatore/AI non vengono presentati come già attivi.

Motion nativo: titolo 240 ms con spostamento di circa 5 px, errori 160 ms, dialogo 220 ms con sola opacità, toast 220 ms e pressione 120 ms/1 px. Note di sola lettura con apertura progressiva 220 ms nei browser compatibili; form e link esclusi dal clipping, chiusura immediata. Nessun movimento dei campi. «Riduci animazioni» è persistente; la richiesta del sistema prevale. Inter locale, palette Open scura/chiara e nessuna immagine decorativa. Zero nuove dipendenze applicative; nessuna migrazione, modifica RLS, cambio cookie o configurazione Production.

## Prove locali

| Controllo | Stato e ambito |
| --- | --- |
| Typecheck e lint | Passati sul codice dell'incremento; tipi CSS rigenerati |
| Unitari | 91 passati in 19 file nella campagna finale, comprese nove prove toast e sessione iniziale lenta |
| Integrazione | 71 passati in 14 file dopo correzione dell'aspettativa del rifiuto Unicode |
| Build | Frontend/PWA, server e funzione Vercel compilati |
| Pacchetto Vercel | Sei controlli passati, senza sorgenti workspace o credenziali disponibili al backend locale |
| E2E | Quattordici passati, sette su desktop e sette su viewport mobile; Chrome 155.0.8059.40, fixture sintetiche e auth simulata locale. Quattro prove motion ripetute dopo l'aggiunta del confronto con effetti ridotti |
| Formato | Prettier passato sui file previsti dalla configurazione del repository |
| Documenti e DNA | 48 Markdown e relativi link/tabelle: zero errori; 263 percorsi DNA presenti, zero vuoti, palette misurata preservata |
| Audit segreti | File di consegna controllati contro i valori locali effettivi; nessun segreto trovato, file personale escluso |
| CI | Commit 8de6e07 passato su Windows e Ubuntu; E2E CI su Chromium/Ubuntu, controlli pacchetto/tipi/lint/unit/integrazione/formato/audit su entrambi |
| Preview | READY su arn1, sola Preview e TR-LAB-STAGING; 16 controlli HTTP passati, font identico byte per byte, due account sintetici verificati |

Il primo tentativo `npm.cmd run check` è fallito nel nuovo test API: il minimo Unicode di Zod 4.6.5 respinge sei emoji prima della policy (`INVALID_INPUT`). La prova mantiene il rifiuto 400 e l'assenza di creazione del flusso; non è stato allentato il validatore. Il check del pacchetto aveva ancora l'aspettativa precedente, senza `providers.google`: aggiornata la risposta attesa completa. Errori di tipi nei nuovi test (`exact` non previsto da Testing Library) e dipendenza hook non necessaria corretti, senza disabilitare controlli.

I test locali di auth usano provider simulato e fixture sintetiche; non dimostrano consegna delle email. Le prove HTTP della nuova Preview sono indicate distintamente. Le regressioni esistenti includono consenso, import Excel, calendario, esercizi personali e diario offline; non si deduce il loro esito dalla sola presenza del codice. Un precedente E2E Linux ricaricava prima della transazione delle preferenze: corretto aspettando il commit reale, senza timeout artificiale; CI del predecessore successiva riuscita su entrambi i sistemi.

Comandi della campagna finale: `npm.cmd run check`, `npm.cmd run format:check`, `npm.cmd run test:e2e`; confronto aggiuntivo `npx.cmd playwright test tests/e2e/motion.spec.ts`. Nessuna perdita del click invalidante al blur, errori corretti e input conservati; lette le schermate effettive di validazione e misure. Test motion verifica durate calcolate, disattivazione app/OS a pagina aperta, reload, pannelli riaperti, Tab sul link, focus del dialogo, Escape e toast senza replay da focus. Lo screenshot da solo non prova il movimento. Warning non bloccante del plugin PWA su `inlineDynamicImports` deprecato, build riuscita; non modificata una dipendenza per correggere l'UX.

Campioni del dialogo in [desktop](evidenze/ux-2026-10-14/motion-desktop.json) e [viewport mobile](evidenze/ux-2026-10-14/motion-mobile.json): 24 frame normali e 24 ridotti per viewport, campi sempre nella stessa posizione e nessun transform sul dialogo. Mediana degli intervalli successivi al primo circa 16,7 ms; massimo 16,8 ms desktop normale e 49,9 ms mobile normale nel confronto, circa 16,8–16,9 ms con effetti ridotti. La prima campagna aveva un intervallo mobile di 167,6 ms: non rimosso dalla valutazione, non dimostra da solo la causa del ritardo. Campioni brevi su PC, senza CPU controllata, non certificano fluidità su telefono o assenza di frame persi. QA-MOT-03 e le porzioni hardware/fallback di QA-MOT-05 restano aperte.

## Preview, account e configurazione Auth

[Deployment READY](evidenze/ux-2026-10-14/deployment.json) `dpl_HzL8qRZhbEU122s7HuLmD2BU4MkW`, progetto Vercel `pere01040/tr-lab`, regione arn1, database separato `hfwatspsfhdbiogritkt`. [CI](evidenze/ux-2026-10-14/ci.json) e [controlli HTTP](evidenze/ux-2026-10-14/cloud.json) si riferiscono al medesimo commit 8de6e07. Font locale identico al bundle; API private con no-store; login, sessione, bootstrap e logout verificati con entrambi gli account sintetici. Nessuna nuova scrittura di allenamento o invio email durante questo controllo.

Nel browser Chrome del titolare verificati anche form → accesso reale dell'account QA A → sincronizzazione terminata senza operazioni in attesa → annullamento dell'uscita con account conservato → logout concluso e form ripristinato. Dialogo a 220 ms con focus interno e nessun transform. Preferenza ridotta elimina l'animazione; ripristinato «Secondo il dispositivo». Home: InterVariable, titolo a 240 ms, zero media decorativi e nessun overflow orizzontale nel viewport desktop osservato. [Cattura finale](evidenze/ux-2026-10-14/preview-home.png) e [registro browser](evidenze/ux-2026-10-14/browser.json); questa prova non equivale a un telefono fisico.

Site URL `https://tr-bfq6gm2tu-pere01040.vercel.app` e redirect `https://tr-bfq6gm2tu-pere01040.vercel.app/api/auth/callback\?state=*` salvati nello staging. Tre redirect precedenti conservati; totale quattro, verificato dopo reload. [Prova delle impostazioni](evidenze/ux-2026-10-14/preview-auth-config.png). La disconnessione Chrome aveva impedito la prima aggiunta: completata soltanto dopo il ripristino del titolare. La lista iniziale dopo salvataggio era ancora nella cache; il reload ha confermato il valore persistito. Nessuna wildcard sull'intero dominio Vercel, modifica di protezioni, SMTP o Google.

La Preview mantiene l'accesso Vercel del workspace prima del login TR LAB. La documentazione successiva può avere un commit più recente: contiene gli esiti, non modifica il runtime pubblicato 8de6e07. Il ramo non attiva deploy automatico e non è stato unito a main; il dominio Production conserva la baseline fino ai gate del rilascio.

## Revisione e capitoli applicati

Revisione indipendente dei confini account, doppio invio e conservazione: corretti avvio Google durante logout pendente, note finali editabili durante commit e avviso cache sostituito dal successo. Applicati componenti piccoli con responsabilità definite, lazy loading, cleanup di timer/listener, guardie ref e HTML nativo; CSS Modules confermati secondo ADR-11. Nessuna nuova libreria di animazione necessaria per gli effetti scelti.

Appunti: 01–05 e 07–08; Linee guida: 01–08, 10–11 per gli ambiti pertinenti. DEC-18/19/23 e DEC-32–37 prevalgono sugli esempi incompatibili. RF-01/02/03/04/06/07/10/11/13/14/16/18, ADR-11/12 e WEB pertinenti; UX-01–10 e MOT-01–04 collegano specifiche e casi.

## Limiti e gate aperti

Non è possibile garantire assenza assoluta di bug o motion «perfetto» su ogni hardware. Restano prove su telefono fisico, tastiera virtuale, VoiceOver/TalkBack, comfort vestibolare, profilo prestazioni sul campo e altri browser reali. I viewport simulati non equivalgono a quei dispositivi. Conservano i propri gate sincronizzazione cloud offline su due dispositivi, restore, metodi del motore, SMTP e Google. Il dominio stabile non viene aggiornato da questo ramo automaticamente.
