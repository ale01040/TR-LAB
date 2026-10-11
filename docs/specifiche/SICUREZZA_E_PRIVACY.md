# Identità, sicurezza e gestione dei dati personali

Versione 1.1 · Specifica tecnica; classificazioni giuridiche, basi di trattamento e testi informativi richiedono revisione prima dell'apertura pubblica. Non è una certificazione di conformità.

## 1. Modello di minaccia concreto

Proteggere da accesso tra account, token rubati, script malevoli, richieste contraffatte, abusi della registrazione gratuita, file ostili, istruzioni incorporate nelle fonti AI e errori di cache. Considerare anche sviluppatore/worker troppo privilegiato e dispositivo condiviso. Il browser dell'utente può essere manipolato: nessun owner, ruolo, costo o esito algoritmico inviato dal client è autorevole da solo.

## 2. Flusso Supabase Auth e sessione applicativa

1. Login email/password su HTTPS al server, inoltro a Supabase Auth senza registrare la password nei log. Nessuna conservazione applicativa delle password.
2. Dopo successo generare un session ID casuale crittograficamente robusto. Conservare solo il suo hash nell'archivio sessioni; browser riceve cookie `__Host-session`, `Secure`, `HttpOnly`, `Path=/`, senza Domain, con SameSite adatto ai flussi verificati (base Lax).
3. Token di accesso/refresh Supabase cifrati a riposo nell'archivio privato; chiave tramite gestione segreti, separata dal DB. Definire rotazione chiavi e migrazione dei token cifrati.
4. Ogni richiesta risolve sessione, stato account, scadenza e privilegi server. Client Supabase istanziato per richiesta, senza sessioni condivise in variabili globali.
5. Rinnovo con lock/lease per sessione e confronto della versione del token: due richieste non devono usare contemporaneamente un refresh token ruotato. Non mantenere una transazione DB aperta durante la chiamata remota; lease con scadenza, compare-and-swap alla scrittura e recupero del processo interrotto.
6. Logout online revoca prima la sessione applicativa e cancella il cookie, poi revoca la sessione Supabase con scope `local` esplicito. “Esci da tutti i dispositivi” usa invece `global` e revoca tutte le sessioni applicative dell'utente. Fallimento remoto diventa job di retry; non riabilitare la sessione locale. Non affidarsi allo scope predefinito. [Supabase, sign-out](https://supabase.com/docs/guides/auth/signout).

Se il processo termina dopo la rotazione remota ma prima del salvataggio dei nuovi token, non fingere che il rinnovo sia certamente ritentabile: recuperare secondo le garanzie del provider o richiedere nuovo accesso. La coda del diario resta intatta. Testare esplicitamente questo intervallo di guasto.

Login Google: creare tentativo breve con state, PKCE e destinazione ammessa; callback verifica stato, scadenza e associazione al browser. Nessun redirect arbitrario ricevuto dal client. Nuovo ID di sessione dopo login; impedire session fixation. Collegare identità solo con verifica, evitando merge per semplice email dichiarata.

Revoca di un refresh token non implica invalidazione istantanea di tutti gli access token già emessi. Il BFF controlla il proprio stato di sessione a ogni richiesta e applica controlli aggiuntivi alle operazioni sensibili; testare gli accessi diretti residui e scegliere la durata dei token coerente con il rischio. [Supabase, sessioni](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

## 3. Policy delle credenziali

Supabase Auth conserva gli hash secondo il meccanismo gestito del provider. Non fare pre-hash lato browser, non introdurre password in `profiles`, non sostituire il sistema con SHA-3. Documentare i parametri effettivamente disponibili e la politica di reautenticazione. [Supabase, password](https://supabase.com/docs/guides/auth/password-security).

Superare l'esempio 8–16 caratteri delle raccolte: supportare passphrase entro limiti espliciti, nessun troncamento silenzioso, password manager e incolla consentiti. Testare Unicode e limiti byte del provider; non promettere un massimo che il servizio non può gestire. OWASP raccomanda lunghezza massima consentita almeno 64 caratteri e privilegia lunghezza/blocco password note rispetto a composizioni obbligatorie. Le divergenze con i suggerimenti del provider vanno documentate nella policy F3. [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

Abilitare verifica email, recovery a scadenza, risposta pubblica che non faciliti enumerazione, rate limit e protezione password compromesse se disponibile nel servizio scelto. MFA per operatori prima del rilascio; eventuale MFA utente è un'estensione compatibile, non ostacolo al diario offline.

## 4. Controlli obbligatori

| Minaccia | Controllo | Prova |
| --- | --- | --- |
| CSRF | Token/controllo Origin per mutazioni, metodi corretti, SameSite; login e logout compresi | Richiesta da sito esterno rifiutata |
| XSS | Rendering testo sicuro, markup AI limitato e sanitizzato, CSP, niente HTML arbitrario | Script in note/import/chat non eseguito |
| Injection SQL | RPC tipizzate/query parametrizzate; identificatori dinamici in allowlist | Payload SQL trattato come dato |
| BOLA/IDOR | Owner server, FK, RLS, grant e controlli comando | Account B non usa ID dei figli di A |
| Cache condivisa | Auth/API escluse da CDN e service worker; nessun Set-Cookie memorizzato | Due account con cache calda restano separati |
| Segreti nel frontend | Build controllata, adapter server separati, scansione repository | Nessuna service key, password DB o chiave AI negli asset |
| Abusi | Quote per account/IP, limiti dimensione, concurrency budget AI, timeout | Sovraccarico non rende inutilizzabile il diario locale |
| File ostili | Tipo reale, limiti compressi/decompressi, parsing isolato, niente macro/formule eseguite | ZIP bomb/worksheet enorme respinti |
| AI non autorizzata | Strumenti read/propose, filtri proprietario prima del retrieval | Prompt ostile non cambia dati attivi |

Validazione non sostituisce query parametrizzate, output encoding o permessi. Non cancellare indiscriminatamente caratteri leciti per “sanitizzare”: applicare la difesa nel contesto giusto. Non fare trim, normalizzazione Unicode o modifica delle password senza regola compatibile con il provider.

## 5. Dati sul dispositivo

Conservare il minimo necessario all'allenamento offline, con database separato per account e chiusura delle connessioni al cambio utente. L'isolamento applicativo non equivale a cifratura contro chi controlla il dispositivo. Un PIN solo grafico non rende sicuro IndexedDB; un eventuale blocco locale va progettato con gestione reale delle chiavi e recupero dati.

Non raccogliere foto, storia clinica o dati di terzi per funzioni che non li richiedono. Mostrare che cosa è disponibile offline e come eliminare i dati dal dispositivo. Un logout offline non revoca immediatamente la sessione server e JavaScript non può cancellare il cookie HttpOnly. Il marcatore persistente di uscita blocca riapertura automatica, sync e nuovo login finché il logout remoto non è concluso: applicare il flusso di [API e sincronizzazione, §9](API_E_SINCRONIZZAZIONE.md). Preservare o eliminare l'outbox solo secondo la scelta esplicita dell'utente.

## 6. Inventario e conservazione

| Categoria | Scopo | Regola iniziale da ratificare prima di produzione |
| --- | --- | --- |
| Account/identità | Accesso e recupero | Finché account attivo, poi procedura cancellazione |
| Schede, risultati, misure | Servizio personale | Finché richiesti dall'utente; export/correzione disponibili |
| Import temporanei | Parsing e diagnosi errori | Finestra breve proposta 7 giorni; eliminazione anticipata su richiesta |
| Export temporanei | Download privato | Scadenza proposta 24 ore; rigenerabile |
| Conversazioni AI | Continuità conversazione | Durata configurata e cancellazione autonoma; niente retention indefinita implicita |
| Log tecnici | Operatività | Solo metadati minimizzati; durata assegnata per finalità |
| Ricevute sync | Deduplicazione | Vita account nella base proposta, senza corpo del diario |
| Backup e registro cancellazioni | Ripristino coerente | Retention del servizio scelta e testata, registro usato dopo restore |

I tempi sono proposte operative, non obblighi legali già verificati. Definire titolare/responsabilità, regione, fornitori, trasferimenti, base del trattamento, diritti e necessità di ulteriori valutazioni con chi cura la privacy. [Quadro della Commissione europea](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en).

## 7. Cancellazione e condivisione

Cancellazione account: reautenticazione → disabilitazione nuove operazioni → revoca sessioni/link → job idempotente su DB, Storage, chat, indice AI e file temporanei → registrazione esito → scadenza dai backup secondo politica. Non rimuovere il registro necessario a non ripristinare per errore dati cancellati; minimizzarlo e attribuirgli una retention motivata.

La copia di una scheda non include diario, misure e chat. Revocare un link non richiama copie già importate. Anteprima esplicita per note libere e carichi prescritti; token imprevedibile, hash nel DB, scadenza, rate limit e nessun token nei log o analytics. Pagina di condivisione con referrer policy restrittiva e senza script di tracking.

## 8. Accessi operativi e incidenti

Ruoli distinti per catalogo, supporto e infrastruttura. Accessi straordinari a dati personali solo con procedura, durata, motivo e audit. Log con request ID, operation ID, esito e durata; eliminare contenuti, token e password anche dagli strumenti di error tracking.

Un incidente deve avere proprietario, contenimento, revoca/rotazione, valutazione impatto e comunicazioni secondo le procedure approvate. Testare una simulazione prima del rilascio. Checklist esecutive in [rilascio e manutenzione](../operazioni/RILASCIO_E_MANUTENZIONE.md).
