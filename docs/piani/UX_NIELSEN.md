# TR LAB — miglioramento UI/UX secondo Nielsen

14 ottobre 2026. Il committente richiede di capire sempre cosa succede durante accesso, uscita e inserimento dei dati, estendendo il miglioramento al resto dell'app. Il design rimane quello [Open già definito](REDESIGN_OPEN.md): Inter locale, nero/avorio, chiaro opzionale, nessuna immagine. Il criterio visuale non viene sostituito da un UI kit diverso.

Riferimento primario: [dieci euristiche di Nielsen, NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/). Sono criteri di revisione, non una certificazione ottenibile con un punteggio inventato. Le azioni qui sotto derivano dai flussi e dal codice di TR LAB.

## 1. Problemi rilevati e priorità

Gravità alta: login/logout ricreano il contenuto per isolare gli account e cancellano lo stato locale del form; il feedback deve sopravvivere a quel cambio. Il logout non confermava l'esito online e non distingueva chiaramente revoca remota pendente. Il recupero password ignorava un errore restituito dal provider, mostrando una risposta apparentemente positiva. Questi problemi richiedono stati verificati, non soltanto messaggi più belli.

Gravità media: errori lontani dal campo, pochi requisiti password visibili, pulsanti di serie solo iconici, preferenze/backup senza riscontro, Google mostrato anche quando indisponibile, errore di rete confuso con modalità dispositivo. I filtri non avevano un ripristino evidente e mancava una guida orientata ai compiti.

Il diario e la separazione degli account restano invarianti prioritari. Non si risolve un problema di interfaccia cancellando storage, eliminando consensi, cambiando target o indebolendo sessioni/CSRF.

## 2. Mappa delle dieci euristiche e consegne

| Ticket | Euristica | Modifica concreta | Prova richiesta |
| --- | --- | --- | --- |
| UX-01 | Visibilità dello stato | Feedback persistente fuori dal contenuto ricreato per account; stati in corso/completato/errore; sincronizzazione esplicita | Login verificato, logout online/offline, salvataggio lento/fallito, feedback dopo remount |
| UX-02 | Corrispondenza con il mondo reale | Italiano, unità kg/cm, RIR spiegato, distinzione target/risultato e locale/server | Input con virgola e zero, errori senza codici grezzi, guida del diario |
| UX-03 | Controllo e libertà | Uscita confermata con annullamento e dati conservati; mostra/nascondi password; messaggi chiudibili | Annullare logout non cambia sessione; dialogo non si chiude durante il commit |
| UX-04 | Coerenza e standard | Componente Feedback comune, etichette Salva/Salvata, stessi contorni/focus, HTML nativo | Tastiera, focus, axe, entrambe le palette |
| UX-05 | Prevenzione degli errori | Requisiti e ripetizione password, validazione prima della rete, invio singolo, campi bloccati durante commit, Google condizionale | Errori/mismatch non inviano richieste; doppio clic non duplica; errore email provider non è successo |
| UX-06 | Riconoscimento | Requisiti visibili, stato della riga serie e modifiche da salvare, account/accesso riconoscibili | Dati inseriti non sono confusi con dati salvati; account ricordato offline non è accesso verificato |
| UX-07 | Flessibilità ed efficienza | Invio nei form, password manager/incolla, filtri azzerabili e guida ricercabile | Uso da tastiera, reset filtri, ricerca aiuto, nessun nuovo gesto obbligatorio |
| UX-08 | Estetica essenziale | Stile Open mantenuto; conferme brevi vicino al compito; dettagli in disclosure/guida | Nessuna immagine; movimento funzionale breve e opzionale, layout con feedback lunghi |
| UX-09 | Riconoscimento e recupero errori | Errori localizzati, dati conservati, rimedio operativo, rete distinta da credenziali, riprova connessione | Fallimenti reali/simulati, input ancora presente, nessuna falsa conferma |
| UX-10 | Aiuto e documentazione | /aiuto con ricerca e collegamenti per accesso, dati, schede, diario, sync e progressi | Guida raggiungibile da footer/form; fruibile offline dopo precache |

## 3. Codice e responsabilità

`Feedback.tsx`: rendering semantico comune e chiusura esplicita; testo principale, icona funzionale e tono. Nessun timer che faccia sparire un errore prima che sia letto. Il feedback globale appartiene ad AppProvider e sta fuori da `main key={account}`. Il messaggio non prova un salvataggio: viene emesso soltanto dopo l'esito corrispondente.

`AuthForm.tsx`: stato del form, requisiti, validazione locale, mostra/nascondi, verifica sessione dopo la risposta del server. Errori sul campo con aria-describedby/aria-invalid e riepilogo; input conservato in caso di fallimento. La ripetizione password resta nel browser e non entra nel payload. Nessuna password salvata in storage, log o URL.

`AppProvider`: esiti di sync manuale, blocco del doppio logout, differenza tra account ricordato e sessione verificata, servizio pronto/dispositivo/non raggiungibile. Persistire l'intenzione di uscita prima di nascondere l'account e mantenere la revoca pendente se il server non risponde. Non trasformare un controllo saltato per lock in una sincronizzazione riuscita.

`auth-policy.ts` nei contracts: regola pura condivisa, senza rete/SDK. Minimo 12 codepoint Unicode e massimo 72 byte UTF-8, senza trim/normalizzazione/troncamento della password. Il controllo esplicito usava `string.length` (unità UTF-16); ora il riscontro del form e la regola del server condividono lo stesso conteggio. Zod 4.6.5 conta già i codepoint nel minimo: il collaudo conferma che sei emoji vengono respinte da `INVALID_INPUT` prima della policy aggiuntiva. Non è stato dimostrato un bypass della registrazione precedente. Il login delle password già esistenti mantiene il suo controllo minimo precedente. [Policy di sicurezza](../specifiche/SICUREZZA_E_PRIVACY.md), [Supabase](https://supabase.com/docs/guides/auth/password-security), [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

Il server continua a validare. Session response aggiunge soltanto `providers.google`, per nascondere un percorso indisponibile; non espone chiavi. Il frontend tollera l'assenza del campo nei backend precedenti. La risposta di recupero resta generica per non enumerare account, ma un errore effettivo del provider produce un errore controllato, non un falso successo.

Diario/Progressi: distinguere in corso, input modificato, commit locale riuscito, errore e sync. Bloccare edit durante il commit per evitare che una risposta tardiva cancelli una modifica successiva. Un messaggio di backup indica preparazione del file, non garantisce che l'utente lo abbia conservato. La preferenza tema viene dichiarata salvata solo dopo la scrittura.

## 4. Scelte e alternative

| Scelta | Vantaggio | Limite/alternativa |
| --- | --- | --- |
| Feedback inline e globale persistente | Visibile nel contesto, sopravvive al cambio account, controllabile dall'utente | Verificare sticky e focus su telefono; toast a scadenza rischia messaggi non letti |
| Componenti esistenti + AuthForm/Feedback | Responsabilità chiare, stile CSS coerente, nessuna migrazione | Richiede verifica dei widget; nuova libreria di form/UI duplicava stack e convenzioni senza necessità |
| Regola password condivisa | Client/server coerenti, casi Unicode testabili | Il formato non dimostra identità o robustezza assoluta; evitare un punteggio sicurezza inventato |
| Aiuto locale ricercabile | Disponibile offline, testi controllati e azioni specifiche | Non sostituisce il collaudo con persone; chat AI per supporto non necessaria né già attiva |
| Blocco del doppio invio e dei campi in commit | Evita richieste duplicate e aggiornamenti tardivi ambigui | Non sostituisce idempotenza/permessi del server; nessuna modifica ai contratti del diario |

## 5. Ordine operativo e accettazione

1. Stati verificati e guardie auth/sync, senza cambiare database, cookie o consenso.
2. Form account e componente feedback; quindi diario, misure, catalogo e dialoghi.
3. Guida e messaggi coerenti; confronto delle sei rotte nei due temi e a 320/390/430/768/1280 px.
4. Test unitari dei confini password e dei form; prove del remount account, logout fallito e input preservati; integrazione del recovery in errore; E2E reali locali con scenario Excel/offline.
5. Revisione React, tipi/lint/build/format, audit segreti e documenti, commit/push sul ramo di consegna. Nuova Preview soltanto sullo staging esistente, con HTTP e due account sintetici; callback e CI verificati separatamente.

Tracciabilità: RF-16/18 e invarianti account/diario del piano; ADR-11/12; WEB-02–09 e WEB-11–14 per validazione/stato/sicurezza pertinenti. Non si chiudono i gate cloud offline, hardware, SMTP/Google, restore o revisione dei metodi in virtù di un test della UI.

Estensione motion DEC-37: [contratto e fonti](../design/MOTION_E_MICROINTERAZIONI.md), MOT-01–04. CSS nativo, ingresso sobrio di titolo/dialogo/errori, pressione senza ritardo e preferenza persistente per ridurre gli effetti. Nessuna cattura della vista dell'account precedente, libreria aggiunta o animazione che ritardi il commit. Le conferme globali `success` usano ToastHost per cinque secondi con pausa su focus, puntatore e scheda nascosta; gli errori/avvisi/informazioni critiche restano persistenti. Il toast non sostituisce lo stato permanente del dato o dell'account. Le conferme sul campo restano vicino al compito.

Accettazione: niente messaggio “accesso completato” senza sessione verificata; niente “sincronizzato” dopo un semplice commit locale; niente password dichiarata corretta prima del servizio; logout annullabile e conservazione distinta dalla revoca remota; ogni percorso modificato ha prova positiva, negativa e stati intermedi pertinenti. Un audit euristico non dimostra assenza assoluta di bug.

## 6. Compatibilità e limiti

Applicare i capitoli originali su HTML, CSS, Web design, JavaScript, Form/validazione e sessioni/sicurezza. L'esempio regex 8–16 delle raccolte è già superato dalla policy passphrase; password manager consentiti secondo le convenzioni. Nessun requisito viene indebolito per migliorare la comodità. Supabase, RLS, HttpOnly e conferme esplicite rimangono confermati.

Le fonti statiche Open non dimostrano le microinterazioni dell'app privata: questa è una progettazione TR LAB coerente con lo stile approvato. Lettori di schermo, tastiera virtuale e telefoni fisici richiedono prove dedicate. Le funzioni del motore restano inattive finché i metodi non sono revisionati; l'aiuto non le presenta come già disponibili.
