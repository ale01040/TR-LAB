# TR LAB — verifica dell'incremento UX e motion

14 ottobre 2026. [Piano Nielsen](../piani/UX_NIELSEN.md), [motion e registro fonti](../design/MOTION_E_MICROINTERAZIONI.md). Questo rapporto riguarda il nuovo incremento, successivo al redesign 43e99b1; la relativa Preview è una baseline storica, non la prova del codice nuovo. Release e riferimenti definitivi vengono riportati dopo il collaudo.

## Modifiche e invarianti

Login verificato dopo il controllo della sessione; password con requisiti e ripetizione, errori vicini ai campi, mostra/nascondi e dati conservati dopo fallimento. Google visibile solo se disponibile e bloccato durante una revoca pendente. Logout confermabile/annullabile, dati locali conservati e revoca remota distinta dal logout locale. Il guasto della cache account resta visibile nel Profilo anche dopo il toast di accesso riuscito.

Diario con righe compatte, stato salvato/modificato/in corso, unità e RIR spiegati, invio singolo e controlli bloccati durante commit. Anche la conclusione seduta conserva le note dopo un errore e impedisce modifiche mentre salva. Misure, nutrizione, tema e backup hanno esiti espliciti. Filtri azzerabili e guida locale ricercabile. Le proposte conservano le conferme esplicite; generatore/AI non vengono presentati come già attivi.

Motion nativo breve su titolo/dialogo/errori e pressione, toast discreti, nessun movimento dei campi. «Riduci animazioni» è persistente; la richiesta del sistema prevale. Inter locale, palette Open scura/chiara e nessuna immagine decorativa. Zero nuove dipendenze applicative; nessuna migrazione, modifica RLS, cambio cookie o configurazione Production.

## Prove locali

| Controllo | Stato e ambito |
| --- | --- |
| Typecheck e lint | Passati sul codice dell'incremento; tipi CSS rigenerati |
| Unitari | 90 passati in 19 file nella campagna finale, comprese nove prove toast |
| Integrazione | 71 passati in 14 file dopo correzione dell'aspettativa del rifiuto Unicode |
| Build | Frontend/PWA, server e funzione Vercel compilati |
| Pacchetto Vercel | Sei controlli passati, senza sorgenti workspace o credenziali disponibili al backend locale |
| E2E | Dieci passati, cinque su desktop e cinque su viewport mobile; Chrome, fixture sintetiche e auth simulata locale |
| Formato | Prettier passato sui file previsti dalla configurazione del repository |
| Documenti e DNA | 48 Markdown, 365 link locali, 126 tabelle: zero errori; 263 percorsi DNA presenti, zero vuoti, palette misurata preservata |
| Audit segreti, CI e Preview | Da completare e registrare separatamente |

Il primo tentativo `npm.cmd run check` è fallito nel nuovo test API: il minimo Unicode di Zod 4.6.5 respinge sei emoji prima della policy (`INVALID_INPUT`). La prova mantiene il rifiuto 400 e l'assenza di creazione del flusso; non è stato allentato il validatore. Il check del pacchetto aveva ancora l'aspettativa precedente, senza `providers.google`: aggiornata la risposta attesa completa. Errori di tipi nei nuovi test (`exact` non previsto da Testing Library) e dipendenza hook non necessaria corretti, senza disabilitare controlli.

I test locali di auth usano provider simulato e fixture sintetiche; non dimostrano consegna delle email. Le prove HTTP della nuova Preview saranno indicate distintamente. Le regressioni esistenti includono consenso, import Excel, calendario, esercizi personali e diario offline; non si deduce il loro esito dalla sola presenza del codice.

Comandi della campagna finale: `npm.cmd run check`, `npm.cmd run format:check`, `npm.cmd run test:e2e`. E2E ripetuti dopo la correzione del reflow mobile: nessuna perdita del click invalidante, errori corretti e input conservati; lettura delle schermate effettive di validazione e misure. Test motion verifica durata calcolata normale, disattivazione app, reload e disattivazione OS; lo screenshot da solo non prova il movimento. Warning non bloccante del plugin PWA su `inlineDynamicImports` deprecato, build riuscita; non modificata una dipendenza per correggere l'UX.

## Revisione e capitoli applicati

Revisione indipendente dei confini account, doppio invio e conservazione: corretti avvio Google durante logout pendente, note finali editabili durante commit e avviso cache sostituito dal successo. Applicati componenti piccoli con responsabilità definite, lazy loading, cleanup di timer/listener, guardie ref e HTML nativo; CSS Modules confermati secondo ADR-11. Nessuna nuova libreria di animazione necessaria per gli effetti scelti.

Appunti: 01–05 e 07–08; Linee guida: 01–08, 10–11 per gli ambiti pertinenti. DEC-18/19/23 e DEC-32–37 prevalgono sugli esempi incompatibili. RF-01/02/03/04/06/07/10/11/13/14/16/18, ADR-11/12 e WEB pertinenti; UX-01–10 e MOT-01–04 collegano specifiche e casi.

## Limiti e gate aperti

Non è possibile garantire assenza assoluta di bug o motion «perfetto» su ogni hardware. Restano prove su telefono fisico, tastiera virtuale, VoiceOver/TalkBack, comfort vestibolare, profilo prestazioni sul campo e altri browser reali. I viewport simulati non equivalgono a quei dispositivi. Conservano i propri gate sincronizzazione cloud offline su due dispositivi, restore, metodi del motore, SMTP e Google. Il dominio stabile non viene aggiornato da questo ramo automaticamente.
