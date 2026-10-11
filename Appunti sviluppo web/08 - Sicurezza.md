# Sicurezza

proprietà fondamentali:

Autenticazione (della controparte)

Mutua autenticazione (della controparte)

Autenticazione (dei dati)

Controllo accessi (autorizzazione)

Riservatezza (dati, azioni, posizione)

Integrità (modifica)

Integrità (cancellazione/filtraggio)

Attacchi di tipo “replay”

Proprietà (astratte) di sicurezza © A.Atzeni (Politecnico di Torino, 2024) 12 autenticazione ( semplice / mutua ) authentication ( simple / mutual ) autenticazione della controparte peer authentication autenticazione dei dati data / origin authentication autorizzazione, controllo accessi authorization, access control integrità integrity riservatezza, confidenzialità confidentiality, privacy, secrecy non ripudio non repudiation disponibilità availability tracciabilità traceability, accountability

Crittografia e fondamentali di cybersecurity:

crittografia:

Crittografia crittografia messaggio (cifrato) chiave-1 chiave-2 mittente messaggio (in chiaro) destinatario messaggio (in chiaro) decrittografia

Crittografia simmetrica:

◼ chiave unica (K1 = K2) ◼ chiave comune a mittente e destinatario ◼ anche detta crittografia a chiave segreta ◼ basso carico elaborazione &gt; OK cifratura dati ◼ problema: come condividere (in modo sicuro) la chiave segreta tra mittente e ricevente? riceventemittente hello! qa#%3&amp; hello!E D

Algoritmi di cifratura simmetrici nome chiave blocco note DES 56 bit 64 bit obsoleto 3-DES 168 bit 64 bit resistenza 112 bit IDEA 128 bit 64 bit RC4 variabile stream segreto AES 128-256 bit 128 bit più usato CHACHA20 256 bit stream molto efficiente

crittografia asimmetrica:

Crittografia asimmetrica ◼ chiavi generate a coppie: chiave privata ( Kpri ) e chiave pubblica ( Kpub ) ◼ chiavi con funzionalità reciproca: dati cifrati con una chiave sono decifrabili solo con l’altra ciao! ciao! ciao! ciao! Y?2gs3 D Kpri q #%3&amp; D KpubM I T T E N T E R I C E V E N T E

Riservatezza senza segreti condivisi ◼ possibile generare un messaggio segreto per uno specifico destinatario conoscendone solo la chiave pubblica © A.Atzeni (Politecnico di Torino, 2024) 26 X chiunque messaggio "privato" per X

firma digitale:

irma digitale ◼ firma digitale ~ cifratura asimmetrica dei dati con la chiave privata dell’autore ◼ solitamente non si cifrano direttamente i dati ma un loro riassunto ( digest ) ◼ fornisce autenticazione (e integrità) dei dati © A.Atzeni (Politecnico di Torino, 2024) 27 messaggio pubblico "firmato" da X

Algoritmi a chiave pubblica ◼ Per riservatezza e integrità (firma digitale) senza segreti condivisi ◼ RSA (Rivest - Shamir – Adleman) • chiave tipicamente 1024-4096bit, prodotto di numeri primi, fattorizzazione del risultato ◼ DSA (Digital Signature Algorithm) • chiave tipicamente 1024-3072bit, elevamento a potenza, logaritmo discreto • solo per firma digitale (buona efficienza), standard NIST per DSS (FIPS-186) ◼ Per scambio chiavi ◼ Diffie-Hellman • chiave tipicamente 2048-4096bit, Logaritmo discreto

ntegrità dei messaggi ◼ una persona che intercetti una comunicazione cifrata non può leggerla ... ◼ ... ma può modificarla in modo imprevedibile!

ntegrità con crittografia simmetrica: Keyed-digest message digest Mittente dati inviati message digest Ricevente dati ricevuti chiave segreta condivisa ??? keyed-digest kdR kdM

ntegrità con crittografia asimmetrica: Firma digitale md algoritmo asimmetrico message digest Mittente dati inviati algoritmo asimmetrico mdR mdM message digest Ricevente dati ricevuti = ?PRI PUB digital signature

Problema: distribuzione delle chiavi per crittografia asimmetrica ◼ chiave privata mai divulgata! ◼ chiave pubblica distribuita il più ampiamente possibile ◼ problema: chi garantisce la corrispondenza tra chiave pubblica ed identità della persona? ◼ soluzione #1: scambio di chiavi OOB (out-of-band) ◼ soluzione #2: algoritmi scambio chiavi ◼ soluzione #3: distribuzione della chiave pubblica all’interno di un certificato a chiave pubblica (= certificato d’identità digitale) ◼ formato del certificato? ◼ fiducia nell’emettitore del certificato?

Scambio chiave segreta mediante algoritmi asimmetrici ◼ la riservatezza senza segreti condivisi viene spesso usata per comunicare la chiave crittografica scelta per un algoritmo simmetrico q #%3&amp; D  Y?2gs3 KYpub K ciao!  K KYpri

Autenticazione della controparte:

metodologie di autenticazione:

Metodologie di autenticazione ◼ basate su meccanismi diversi ( 1/2/3-factors authentication ): ◼ qualcosa che so (es. una password) ◼ qualcosa che posseggo (es. una carta magnetica) ◼ qualcosa che sono (es. impronta digitale) ◼ possibilità di combinare meccanismi diversi per passare da semplice autenticazione ad identificazione

Password (ripetibili) utente (UID) segreto (PUID) UID richiesta della password PUID richiesta di autenticazioneserver { UID : PUID } o { UID : f (PUID) } password leggibile durante la tramissione!!!

autenticazione basata su password:

Autenticazione basata su password ◼ vantaggi: ◼ semplice per l’utente ◼ ... a condizione che ne abbia una sola ◼ svantaggi: ◼ conservazione della password lato utente (post-it!) ◼ password indovinabile (il nome di mio figlio!) ◼ password leggibile durante la trasmissione ◼ conservazione della password lato server: ◼ password in chiaro (pericolossimo!) ◼ digest della password (dictionary attack!)

password:

Password ◼ suggerimenti per renderle meno pericolose: ◼ caratteri alfabetici (maiuscoli + minuscoli) + cifre + caratteri speciali ◼ lunghe (almeno 8 caratteri) ◼ parole non presenti in dizionario ◼ cambiate frequentemente (ma non troppo!) ◼ non usarle :-) ◼ uso di almeno una password (o PIN o codice di accesso o ...) inevitabile a meno di usare sistemi biometrici

memorizzazione delle password:

Memorizzazione delle password ◼ MAI in chiaro, ovunque possibile ◼ password cifrata? server deve comunque conoscerla in chiaro! ◼ memorizzare un digest della password? HP = h(p) ◼ … si presta ad attacchi “dizionario” ◼ foreach (Word in Dictionary) do store ( DB, Word, hash(Word) ) ◼ w = lookup ( DB, HP ) ◼ if ( success ) then write ( “pwd = ”, w ) else write ( “pwd not in my dictionary ◼ … velocizzabili tramite “rainbow table” ◼ occorre quindi introdurre una variazione imprevedibile chiamata “salt”

uso del salt per memorizzare le password:

Uso del salt per memorizzare password ◼ per ogni utente UID: ◼ scegliere / chiedere la pwd ◼ generare un salt (diverso per ciascun utente): ◼ random (imprevedibile) e lungo (aumenta la complessità del dizionario) ◼ meglio se con caratteri poco usati o di controllo ◼ calcolare HP = hash ( pwd || salt ) ◼ memorizzare le triple { UID, HPUID, saltUID } ◼ evita di avere HP uguale per utenti diversi ma con stessa pwd ◼ rende praticamente impossibili gli attacchi dizionario (inclusi quelli basati su rainbow table)

lettura della password durante la trasmissione in rete:

Lettura della password durante la trasmissione in rete ◼ possibile tramite ◼ packet sniffing (reti broadcast) ◼ MITM (man-in-the-middle) fisico o logico ◼ traffic mirroring (su switch e router) ◼ soluzioni: ◼ cifrare la password durante la trasmissione ◼ sicurezza di rete ◼ usare password non ripetibili ◼ la lettura diventa inutile ... ◼ ... ma la password diventa difficile da memorizzare

password non ripetibili:

Password non ripetibili (usa-e-getta o OTP, One-Time-Password) utente (UID) P50UID P49UID P48UID P47UID P46UID

otp time-based:

OTP time-based utente (UID) UID richiesta della password delle 11:07 P1107UID richiesta di autenticazione server UID : SUID P1107 = p ( 11:07, SUID ) ?

otp a sfida asimmetrica:

OTP a sfida (asimmetrica) utente (UID) cert (UID, KpubUID) sfida = enc (R, KpubUID) RUID richiesta di autenticazione server UID validi R == RUID ? smart-card decifratura della sfida

autenticazione out-of-band:

Autenticazione out-of-band utente (UID) segreto (PUID) 2. UID + PUID 5. OOB data 1. richiesta di autenticazione server 4. trasmissione OOB
