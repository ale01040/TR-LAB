# TR LAB

UI/UX: feedback verificati su accesso/uscita e salvataggi, errori vicino ai campi, guida offline e motion breve disattivabile, nello stile Open senza immagini. **[Preview corrente su TR-LAB-STAGING](https://tr-bfq6gm2tu-pere01040.vercel.app)**, codice `8de6e07`, con [CI Windows/Linux riuscita](https://github.com/ale01040/TR-LAB/actions/runs/38574207876). [Piano Nielsen](docs/piani/UX_NIELSEN.md), [guida motion e fonti](docs/design/MOTION_E_MICROINTERAZIONI.md), [prove, callback e limiti](docs/qualita/UX_NIELSEN_2026_10_14.md). Protezione Vercel conservata: occorre l'accesso al workspace. Conferme email/SMTP/Google restano da completare.

Redesign del 14 ottobre: **stile editoriale nero/avorio, Inter locale, tema chiaro opzionale e nessuna immagine**, con atmosfera calda in CSS e diario compatto. [Piano/roadmap del design](docs/piani/REDESIGN_OPEN.md), [fonti e DNA](docs/design/README.md), [collaudo e limiti](docs/qualita/REDESIGN_2026_10_14.md). Implementato sul ramo di consegna; il dominio Production resta soggetto ai gate del prodotto.

Incremento del 13 ottobre: **import diretto Excel con review e bozza, esercizi personali, attrezzatura, calendario, recupero dei conflitti e fondazioni del motore con consenso esplicito**. [Ramo di consegna su GitHub](https://github.com/ale01040/TR-LAB/tree/codex/schede-sync-motore-20261013), [funzioni/prove/limiti](docs/qualita/INCREMENTO_SCHEDE_SYNC_MOTORE.md), [formato Excel](docs/specifiche/FORMATO_EXCEL_IMPLEMENTATO.md), [migrazioni e collaudo](docs/operazioni/INCREMENTO_SCHEDE_SYNC_MOTORE.md). Questo ramo non attiva il deploy automatico Vercel e non contiene metodi di allenamento attivi. Il sito stabile resta sulla baseline: il rilascio dell'incremento richiede staging, quattro nuove migrazioni e validazione dei gate prima del merge in main.

**Baseline storica delle funzioni del 13 ottobre:** [TR LAB staging 0529c0c](https://tr-1hwubt4fq-pere01040.vercel.app/profilo), collegata a TR-LAB-STAGING, codice `0529c0c`. Otto migrazioni di schema, callback salvato e backend pronto; dieci controlli HTTP ripetuti sulla nuova Preview, login Chrome e anteprima XLSX verificati. Le quindici prove delle funzioni e il percorso Chrome online completo sono documentati sulla Preview precedente dello stesso backend, con isolamento tra due account Auth con dati sintetici. Corretti i conteggi al singolare; [CI del codice pubblicato](https://github.com/ale01040/TR-LAB/actions/runs/38429493830) superata su Windows/Ubuntu. Protezione Vercel conservata. Consegna email, Google, campagna offline/telefono reale e restore restano da completare: [rapporto aggiornato](docs/qualita/STAGING_2026_10_13.md), [passaggi di collaudo](docs/operazioni/COLLAUDO_PREVIEW_STAGING.md). Gli account e i dati del sito stabile non vengono copiati nello staging.

Alpha HTTPS sul dominio stabile: [TR LAB](https://tr-lab.vercel.app), collegata a Supabase. Build Git Production verificata con tredici controlli HTTP e quattro GET anonime senza credenziali Vercel. [Rilascio e limiti](docs/qualita/RILASCIO_DOMINIO_STABILE.md), [procedura](docs/operazioni/DEPLOY_VERCEL.md). La [Preview precedente](https://tr-9lstvuhyr-pere01040.vercel.app) resta separata e protetta dal workspace.

Per il pacchetto ZIP da estrarre e caricare manualmente su Netlify Drop: [procedura Netlify](docs/operazioni/DEPLOY_NETLIFY.md). Distribuisce l'alpha in modalità dispositivo, senza backend o credenziali cloud.

PWA per schede, diario di allenamento offline, misure e target nutrizionali personali. Versione **0.1.0 alpha**, utilizzabile sul dispositivo senza provider; Supabase collegato a locale, Preview e Production con ruolo limitato e TLS verificato. Login riuscito nella Preview riferito dal committente; login positivo sul dominio stabile, consegna email, Google e sync multi-device richiedono ancora collaudo. Site URL e callback sono configurati; SMTP e Google restano da attivare: [completare Auth](docs/operazioni/COMPLETARE_AUTH.md). Gli archivi locali non si trasferiscono automaticamente tra dispositivi o domini.

```powershell
npm.cmd ci
npm.cmd run dev
```

Senza `.env`, aprire **http://localhost:5173** per usare la modalità dispositivo. Per collegare il progetto esistente seguire [Avvio locale e Supabase](docs/operazioni/AVVIO_LOCALE.md), senza inserire segreti nel repository. `npm run build` e `npm run preview` servono per la prova della PWA con service worker.

Controlli: `npm run check`, `npm run format:check`, `npm audit --audit-level=low`. Esiti e limiti nel [rapporto implementazione](docs/qualita/STATO_IMPLEMENTAZIONE.md). Ogni intervento è registrato nel [diario di sviluppo](docs/DIARIO_SVILUPPO.md).

Scelte confermate: PWA per telefono/PC, Supabase, account personali, diario offline, condivisione per copia e proposte automatiche applicate soltanto dopo conferma esplicita. Lo sviluppo segue entrambe le raccolte web incluse, con gli adattamenti registrati e commenti mirati e completi.

Nella baseline pubblicata: editor manuale e ciclo, approvazione esplicita e versioni, struttura Excel adattata con anteprima, formato JSON documentato, sedute/serie/lati/RIR/timer, peso e circonferenze, macro manuali, copia della scheda e backup locale. BFF Auth e protocollo sync presenti; RPC/grant/isolamento della baseline verificati sul database reale. Google disabilitato finché provider e flag non sono configurati. Le nuove funzioni sono descritte nel rapporto sopra; metodi attivi, automazione completa, assistente AI e gate della beta pubblica restano nella roadmap. La Preview precedente condivide il database Production, limite esplicito dell'alpha autorizzata; la nuova Preview usa invece lo staging separato.

Per attivare Gmail SMTP e Google seguire la [guida dettagliata](docs/operazioni/CONFIGURAZIONE_GMAIL_GOOGLE.md). `npm run auth:preflight` controlla i servizi pubblici senza inviare email; `-- --require-google` richiede anche il provider abilitato. Non sostituisce un login reale o una prova di consegna.

Nell'editor puoi impostare target diversi per ogni serie, gestire riscaldamento/extra e lati, duplicare e riordinare giornate e vedere l'anteprima di accumulo/scarico. [Funzioni, limiti e prove](docs/specifiche/EDITOR_SCHEDE.md). Salvataggio bozza e approvazione restano azioni distinte.

Per chi sviluppa: leggere [AGENTS.md](AGENTS.md), [manuale di progetto](docs/README.md), [decisioni](docs/DECISIONI_E_DOMANDE.md) e [scelte implementative](docs/architettura/SCELTE_IMPLEMENTAZIONE.md). Le due raccolte web originali sono incluse. L'Excel originale con dati personali resta nella consegna locale e viene ignorato da Git; la fixture depurata è nel codice. Il vault personale e i suoi contenuti integrali non sono pubblicati.
