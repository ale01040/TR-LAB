# Revisione della documentazione v1.1

Data: 10 ottobre 2026. Oggetto: i 18 documenti Markdown del progetto, confrontati con le decisioni del committente e i materiali di riferimento. Questa verifica riguarda la progettazione; non è un collaudo dell'applicazione.

## 1. Risultato della revisione

La revisione ha individuato e corretto imprecisioni tecniche, casi di guasto non sufficientemente specificati, incongruenze negli esempi e formulazioni poco chiare. Piano, roadmap, contratti e casi di accettazione sono stati allineati. Nei controlli descritti sotto non sono emersi ulteriori errori; questo esito non certifica la futura implementazione né la validità scientifica di ogni metodo candidato.

Le scelte confermate restano PWA, Supabase, registrazione pubblica gratuita, account personali, copie indipendenti, diario offline e applicazione delle proposte soltanto dopo conferma esplicita. Restano inclusi forza/ipertrofia/corpo libero, misure, target nutrizionali e assistente AI. I commenti nel codice devono essere mirati e completi. Nessuna correzione elimina questi requisiti o attiva servizi remoti.

## 2. Correzioni di questa verifica

| Punto riscontrato | Correzione e conseguenza per lo sviluppo |
| --- | --- |
| Cursori e ricevute potevano tornare indietro dopo un restore del database | Introdotto `sync_epoch`, diverso dalla versione del protocollo; prima della riapertura si cambia generazione. I vecchi client preservano anche la base locale e avviano una riconciliazione, senza replay automatico |
| Logout offline descritto senza precisare come evitare un nuovo accesso automatico tramite cookie HttpOnly | Specificati marcatore persistente, coordinamento tab, logout remoto prima di sync/nuovo login e stato di revoca pendente. Distinti scope Supabase `local` e `global` |
| Revisioni PostgreSQL `bigint` rappresentate come numeri JavaScript negli esempi | Richieste stringhe decimali esatte, cast SQL prima di PostgREST, limiti espliciti e test oltre `Number.MAX_SAFE_INTEGER` |
| Esempio di proposta con carico privo di unità nel valore e formato diverso da SaveSet | Uniformato a grammi interi con convenzione esplicita per il singolo manubrio; distinti numero di versione e UUID |
| Retry di accettazione dopo consumo/scadenza della challenge non definito | Il recupero della ricevuta di un comando già eseguito precede la verifica di una nuova challenge; nessuna seconda applicazione |
| Dipendenza da un comando che aggiorna più record ambigua | La precondizione identifica il record della ricevuta; il server verifica corrispondenza con il tipo e l'aggregato attesi |
| PWA classificata insieme alle raccomandazioni sostituibili | ADR-01 marcato confermato; una sostituzione della piattaforma richiede nuova decisione del committente |
| Due ruoli generici nel piano non coincidevano con i permessi granulari delle specifiche | Distinte aree personale/amministrativa e responsabilità di curatore, supporto, worker e infrastruttura |
| `packageManager` presentato come blocco sufficiente della versione npm | Richieste installazione e verifica esplicita della toolchain, oltre a metadati e lockfile |
| Refusi e formulazioni improprie | Corretti “Respinta un'eccezione”, il calco “redatto” per dati oscurati, la descrizione di SHA-3 e altri passaggi ambigui; uniformata la versione del pacchetto |

Le specifiche esecutive sono in [API e sincronizzazione](../specifiche/API_E_SINCRONIZZAZIONE.md), [modello dati](../specifiche/MODELLO_DATI.md), [sicurezza](../specifiche/SICUREZZA_E_PRIVACY.md) e [rilascio e manutenzione](../operazioni/RILASCIO_E_MANUTENZIONE.md). Le motivazioni e gli strumenti rimangono nelle [scelte tecniche](../architettura/SCELTE_TECNICHE.md) e nelle [convenzioni](../CONVENZIONI_SVILUPPO.md).

## 3. Coerenza con informazioni e fonti

- **Decisioni utente:** confrontate le 20 DEC con piano, roadmap e specifiche. Supabase prevale sul richiamo a MySQLi; commenti mirati prevalgono sull'indicazione di commentare ogni riga. Le altre raccomandazioni tecniche non possono cambiare i requisiti confermati.
- **Excel:** hash SHA-256 verificato: `F25B4134E29327E58ECB24AF9CC567ABE4EAA79F06D9035D99C0BF09D2DA69CD`, uguale al riferimento analizzato. Confermati 9 fogli, intervalli dichiarati, 25 posizioni esercizio (8 A, 8 B, 9 C) e 24 nomi distinti.
- **Formule e testi dell'Excel:** ricontrollati i cinque punti del piano §2.2: RIR assente dal controllo automatico, conteggio delle serie limitato a tre, trend nutrizionale di una sola variazione, carboidrati troncati a zero e scarto direzionale tra lati. Le formule originali non sono state modificate.
- **Vault fitness:** le 7 note del manifest esistono e i loro hash coincidono con quelli registrati. È una verifica di identità delle fonti selezionate, non una revisione scientifica dell'intero vault. Metodi e parametri mantengono lo stato candidato ove indicato.
- **Raccolte web:** mantenute le deroghe e gli adattamenti espliciti. Il refuso originale “use strinct” resta citato come errore da correggere nell'implementazione; non è una direttiva JavaScript valida.
- **Fasi e stime:** presenti F0–F11, dipendenze e gate; la somma delle stime preliminari è 37–62 settimane-persona. È un riferimento da ristimare dopo le prove, non una scadenza promessa né un limite imposto dall'utente.

Le fonti tecniche aggiuntive consultate in questa verifica riguardano [sign-out Supabase](https://supabase.com/docs/guides/auth/signout), [sessioni Supabase](https://supabase.com/docs/guides/auth/sessions), [limiti numerici JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) e [controlli della toolchain npm](https://docs.npmjs.com/cli/configuring-npm/package-json/). I riferimenti puntuali sono anche nelle specifiche interessate. Non è stato eseguito un audit integrale di ogni pagina esterna o di tutti i contenuti del vault.

## 4. Controlli ripetibili sui file

Eseguito `node .analysis/verify-documentation.cjs` dalla radice del progetto. Lo script legge i documenti, verifica destinazioni dei collegamenti locali, bilanciamento dei blocchi di codice, sintassi dei 3 esempi JSON, numero di colonne delle tabelle, definizioni/riferimenti degli ID e coerenza di alcuni esempi di contratto. L'esito dettagliato è salvato in `.analysis/documentation-audit.json`.

Sono presenti una sola volta le definizioni DEC-01–20, ADR-01–17, RF-01–18, WEB-01–14 e ALG-01–35. La matrice contiene 35 casi QA con ID distinti. I nuovi casi coprono restore con client precedenti, logout offline alla riapertura, scope del logout, precisione dei contatori, selezione della revisione dipendente, cursore del pull e retry di conferma dopo scadenza della challenge.

Esito dei controlli automatici documentali: nessun errore rilevato. La verifica editoriale ha inoltre corretto i passaggi elencati in §2. Un controllo sintattico dei Markdown non dimostra da solo la correttezza tecnica: per questo è stato affiancato al confronto dei contratti e delle informazioni di origine.

Le modifiche riguardano la documentazione del progetto e gli strumenti locali della verifica. Excel, cartelle originali e vault non sono stati riscritti.

## 5. Verifiche ancora necessarie

Non esiste ancora un'applicazione su cui eseguire build, test SQL/RLS, OAuth, sessioni, prove sui telefoni, restore o test end-to-end. I 35 casi QA e i 35 casi ALG sono specifiche da implementare, non test già superati. Le prove bloccanti sono nel [piano di collaudo](TEST_E_ACCETTAZIONE.md).

Prima dell'implementazione fissare versioni compatibili delle dipendenze e chiudere le decisioni con scadenza F0–F2. Prima dell'attivazione dei metodi completare le fonti e la revisione di dominio; prima dell'apertura pubblica assegnare responsabilità operative, retention, servizi e configurazioni. Lo stato è nel [registro delle decisioni](../DECISIONI_E_DOMANDE.md): una voce ancora aperta non è approvata implicitamente da questo rapporto.

La base progettuale è motivata rispetto ai requisiti dell'app. La scelta migliore tra alternative equivalenti dipende anche da competenze del team, dispositivi e carichi reali: le prove anticipate servono a confermare o correggere le raccomandazioni prima di estendere il prodotto.
