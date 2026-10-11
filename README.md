# TR LAB

PWA per schede, diario di allenamento offline, misure e target nutrizionali personali. Versione **0.1.0 alpha locale**: codice avviabile, contratti, migrazione PostgreSQL e test. Il progetto Supabase indicato è predisposto nella configurazione d'esempio, ma non ancora collegato: mancano i valori locali e il collaudo cloud.

```powershell
npm ci
npm run dev
```

Senza `.env`, aprire **http://localhost:5173** per usare la modalità dispositivo. Per collegare il progetto esistente seguire [Avvio locale e Supabase](docs/operazioni/AVVIO_LOCALE.md), senza inserire segreti nel repository. `npm run build` e `npm run preview` servono per la prova della PWA con service worker.

Controlli: `npm run check`, `npm run format:check`, `npm audit --audit-level=low`. Esiti e limiti nel [rapporto implementazione](docs/qualita/STATO_IMPLEMENTAZIONE.md). Ogni intervento è registrato nel [diario di sviluppo](docs/DIARIO_SVILUPPO.md).

Scelte confermate: PWA per telefono/PC, Supabase, account personali, diario offline, condivisione per copia e proposte automatiche applicate soltanto dopo conferma esplicita. Lo sviluppo segue entrambe le raccolte web incluse, con gli adattamenti registrati e commenti mirati e completi.

Disponibili: editor manuale e ciclo, approvazione esplicita e versioni, struttura Excel adattata con anteprima, formato JSON documentato, sedute/serie/lati/RIR/timer, peso e circonferenze, macro manuali, copia della scheda e backup locale. Account email/Google e protocollo sync sono implementati nel BFF e richiedono il collaudo sul provider reale. Generatore, progressioni operative, assistente AI, parser XLSX completo, gestione definitiva dei conflitti e apertura pubblica restano nella roadmap; nessuna proposta candidata cambia target approvati.

Per chi sviluppa: leggere [AGENTS.md](AGENTS.md), [manuale di progetto](docs/README.md), [decisioni](docs/DECISIONI_E_DOMANDE.md) e [scelte implementative](docs/architettura/SCELTE_IMPLEMENTAZIONE.md). Le due raccolte web originali sono incluse. L'Excel originale con dati personali resta nella consegna locale e viene ignorato da Git; la fixture depurata è nel codice. Il vault personale e i suoi contenuti integrali non sono pubblicati.
