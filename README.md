# TR LAB

Alpha HTTPS sul dominio stabile: [TR LAB](https://tr-lab.vercel.app), collegata a Supabase. Build Git Production verificata con tredici controlli HTTP e quattro GET anonime senza credenziali Vercel. [Rilascio e limiti](docs/qualita/RILASCIO_DOMINIO_STABILE.md), [procedura](docs/operazioni/DEPLOY_VERCEL.md). La [Preview precedente](https://tr-9lstvuhyr-pere01040.vercel.app) resta separata e protetta dal workspace.

Per il pacchetto ZIP da estrarre e caricare manualmente su Netlify Drop: [procedura Netlify](docs/operazioni/DEPLOY_NETLIFY.md). Distribuisce l'alpha in modalità dispositivo, senza backend o credenziali cloud.

PWA per schede, diario di allenamento offline, misure e target nutrizionali personali. Versione **0.1.0 alpha**, utilizzabile sul dispositivo senza provider; Supabase collegato a locale, Preview e Production con ruolo limitato e TLS verificato. Login riuscito nella Preview riferito dal committente; login positivo sul dominio stabile, consegna email, Google e sync multi-device richiedono ancora collaudo. Site URL e callback sono configurati; SMTP e Google restano da attivare: [completare Auth](docs/operazioni/COMPLETARE_AUTH.md). Gli archivi locali non si trasferiscono automaticamente tra dispositivi o domini.

```powershell
npm ci
npm run dev
```

Senza `.env`, aprire **http://localhost:5173** per usare la modalità dispositivo. Per collegare il progetto esistente seguire [Avvio locale e Supabase](docs/operazioni/AVVIO_LOCALE.md), senza inserire segreti nel repository. `npm run build` e `npm run preview` servono per la prova della PWA con service worker.

Controlli: `npm run check`, `npm run format:check`, `npm audit --audit-level=low`. Esiti e limiti nel [rapporto implementazione](docs/qualita/STATO_IMPLEMENTAZIONE.md). Ogni intervento è registrato nel [diario di sviluppo](docs/DIARIO_SVILUPPO.md).

Scelte confermate: PWA per telefono/PC, Supabase, account personali, diario offline, condivisione per copia e proposte automatiche applicate soltanto dopo conferma esplicita. Lo sviluppo segue entrambe le raccolte web incluse, con gli adattamenti registrati e commenti mirati e completi.

Disponibili: editor manuale e ciclo, approvazione esplicita e versioni, struttura Excel adattata con anteprima, formato JSON documentato, sedute/serie/lati/RIR/timer, peso e circonferenze, macro manuali, copia della scheda e backup locale. BFF Auth e protocollo sync presenti; RPC/grant/isolamento verificati sul database reale. Google disabilitato finché provider e flag non sono configurati. Generatore, progressioni operative, assistente AI, parser XLSX completo, gestione definitiva dei conflitti e gate della beta pubblica restano nella roadmap. Il database condiviso fra ambienti è un limite esplicito dell'alpha autorizzata, non la separazione richiesta per la versione completa.

Per chi sviluppa: leggere [AGENTS.md](AGENTS.md), [manuale di progetto](docs/README.md), [decisioni](docs/DECISIONI_E_DOMANDE.md) e [scelte implementative](docs/architettura/SCELTE_IMPLEMENTAZIONE.md). Le due raccolte web originali sono incluse. L'Excel originale con dati personali resta nella consegna locale e viene ignorato da Git; la fixture depurata è nel codice. Il vault personale e i suoi contenuti integrali non sono pubblicati.
