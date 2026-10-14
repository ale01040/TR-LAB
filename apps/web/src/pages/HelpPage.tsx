import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from '../styles/App.module.css';

const articles = [
  {
    id: 'accesso',
    title: 'Accedere, uscire e ricevere le email',
    text: 'Inserisci email e password nel Profilo. Attendi “Accesso verificato”: il formato corretto da solo non significa che sei entrato. Per un account nuovo conferma prima l’indirizzo email. Apri il link di conferma o recupero nello stesso browser che ha fatto la richiesta. Se non arriva, controlla spam e chiedi al gestore di verificare il servizio email. Una richiesta ricevuta non garantisce la consegna dell’email. Per uscire controlla lo stato delle modifiche prima di confermare.',
    path: '/profilo',
    action: 'Apri il Profilo',
  },
  {
    id: 'password',
    title: 'Requisiti della password',
    text: 'Per una nuova password usa almeno 12 caratteri, entro 72 byte: accenti ed emoji possono raggiungere il limite prima. Una frase lunga e un password manager sono consentiti, così come incollare. Ripeti la password per evitare errori di digitazione. “Le due password coincidono” controlla i due campi. La correttezza della password del tuo account viene verificata dal servizio quando accedi.',
    path: '/profilo',
    action: 'Controlla l’accesso',
  },
  {
    id: 'dati',
    title: 'Dati sul dispositivo e account personale',
    text: 'L’archivio senza login è separato dal tuo account. Per trasferire una scheda esportala come JSON da Programma e importala dopo l’accesso. Il backup del Profilo recupera l’intero archivio ed è personale: non usarlo per condividere una scheda. Browser, telefono, PC e indirizzi diversi hanno archivi locali distinti. I dati compaiono su un altro dispositivo dopo la sincronizzazione dello stesso account. Uscire li nasconde senza cancellarli dal browser.',
    path: '/profilo',
    action: 'Controlla dati e backup',
  },
  {
    id: 'schede',
    title: 'Creare o importare una scheda',
    text: 'In Programma puoi caricare direttamente Excel nei formati supportati: non serve convertirlo in JSON. Controlla l’anteprima, risolvi le righe non riconosciute e conferma la struttura. Nell’editor salva una bozza, poi approvala dopo aver verificato esercizi, carichi, lati, ripetizioni e recuperi. Una bozza non avvia un allenamento. In Libreria trovi anche gli esercizi personali e le convenzioni di carico.',
    path: '/programma',
    action: 'Apri Programma',
  },
  {
    id: 'calendario',
    title: 'Pianificare e avviare le sedute',
    text: 'Da una scheda approvata scegli Pianifica un ciclo e controlla tutte le date prima di confermarle. Avvia dal calendario o scegli giornata e settimana in Oggi. Data pianificata e settimana del programma sono informazioni distinte. Rinvii e cancellazioni richiedono una scelta esplicita e non eliminano i risultati di sedute già concluse.',
    path: '/programma#calendario',
    action: 'Apri Programma',
  },
  {
    id: 'diario',
    title: 'Registrare una serie e capire il salvataggio',
    text: 'Il target indica cosa era previsto, non cosa hai già eseguito. Inserisci i risultati e premi Salva o Invio nel form della serie. Puoi usare la virgola, per esempio 12,5 kg. RIR indica quante ripetizioni pensi di poter ancora eseguire: zero è valido. Salta registra una serie saltata, non zero ripetizioni. “Modifiche da salvare” richiede una nuova conferma. Concludi la seduta dopo aver controllato il riepilogo.',
    path: '/',
    action: 'Apri Oggi',
  },
  {
    id: 'sincronizzazione',
    title: 'Offline, sincronizzazione e conflitti',
    text: 'Puoi registrare offline. “Salvata sul dispositivo” conferma il salvataggio locale; controlla lo stato per sapere se i dati sono anche sul server. Con accesso valido la sincronizzazione riprende online. Nel Profilo trovi ultima sincronizzazione, modifiche in attesa e controllo manuale. Per un conflitto apri Conflitti e recupero, confronta le versioni e scegli esplicitamente. Non cancellare i dati del browser per risolvere un errore.',
    path: '/profilo',
    action: 'Apri Conflitti e recupero',
  },
  {
    id: 'progressi',
    title: 'Misure, nutrizione e proposte',
    text: 'Inserisci peso in kg e circonferenze in cm, con data e lato quando servono. Le misure non sono diagnosi. Gli obiettivi nutrizionali sono manuali: controlla calorie, macro e decorrenza prima di confermare. Generatore, progressioni e assistente AI vengono indicati come disponibili dopo l’attivazione dei metodi revisionati. Nessuna proposta cambia la scheda approvata senza la tua accettazione esplicita.',
    path: '/progressi',
    action: 'Apri Progressi',
  },
];
export function HelpPage() {
  const [search, setSearch] = useState('');
  const { hash } = useLocation();
  useEffect(() => {
    const article = articles.find((item) => `#${item.id}` === hash);
    if (article) document.getElementById(article.id)?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const query = search.toLocaleLowerCase('it-IT').trim();
  const visible = articles.filter((article) =>
    `${article.title} ${article.text}`.toLocaleLowerCase('it-IT').includes(query),
  );
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>AIUTO / PASSI CONCRETI</span>
          <h1>Trova la risposta.</h1>
          <p>Accesso, schede e dati: cosa fare e come capire l’esito.</p>
        </div>
        <Link to="/" className={styles.textLink}>
          Torna a Oggi
        </Link>
      </div>
      <label>
        Cerca nella guida
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Per esempio: password, Excel, offline"
        />
      </label>
      {search && (
        <button type="button" className={styles.secondary} onClick={() => setSearch('')}>
          Mostra tutti gli argomenti
        </button>
      )}
      {!visible.length && (
        <p role="status">
          Nessun argomento trovato. Prova una parola più semplice o mostra tutti gli argomenti.
        </p>
      )}
      {visible.map((article) => (
        <section
          key={article.id}
          id={article.id}
          className={`${styles.panel} ${styles.helpArticle}`}
        >
          <h2>{article.title}</h2>
          <p>{article.text}</p>
          <Link className={styles.textLink} to={article.path}>
            {article.action}
          </Link>
        </section>
      ))}
    </>
  );
}
