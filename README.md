# VolleyEye

Applicazione open source per lo scouting della pallavolo. Funziona nel browser, anche offline, su desktop e mobile. Include scout live e video, analisi e import/export DataVolley.

Sito: https://volleyeye.davidaffo.com/

## Sviluppo

- `npm ci`
- `npm run dev` — sviluppo React con Vite, porta 3000.
- `npm run serve` — compila e avvia la versione di produzione in locale: http://localhost:4173/.
- `npm test` — regressioni della logica e dell'interfaccia.
- `npm run build` — genera il sito statico in dist/.
- `npm run preview` — verifica la build su http://localhost:4173/.
- `npx playwright install chromium` e `npm run test:e2e` — verifiche nel browser dopo la build.

Il progetto usa React e moduli ES nativi per interfaccia, azioni e servizi. Calcoli, formati e dati salvati mantengono il comportamento precedente. Vedi [architettura e verifiche](docs/react-migration.md).

`dev` usa http://localhost:3000/ e `serve` usa http://localhost:4173/: le porte diverse separano gli archivi del browser (IndexedDB e localStorage). Entrambi conservano i dati tra gli avvii e propongono le demo al primo accesso. I dati già presenti sulla porta 3000 restano lì; `serve` parte con un archivio separato. Per trasferirli si può usare l'export/import del database.

Usare sempre lo stesso indirizzo per ciascuna modalità: anche `localhost` e `127.0.0.1`, browser o profili diversi hanno archivi distinti. Le porte sono fisse: se occupate, il server segnala l'errore anziché passare automaticamente a un'altra porta e mostrare un archivio diverso. `preview` condivide l'archivio di `serve` quando aperto allo stesso indirizzo.

## GitHub Pages

In Settings → Pages selezionare **GitHub Actions** come Source. Il workflow `.github/workflows/pages.yml` verifica e compila l'app, poi pubblica dist/ dopo i push a main. Le pull request eseguono le verifiche senza pubblicare.

La build usa esplicitamente la modalità `production`, sia con `serve` sia nel workflow Pages; i dati locali del browser non vengono inclusi nella pubblicazione. Anche Pages mantiene il proprio archivio separato e le demo al primo avvio.

Vite usa `/` come percorso di produzione per https://volleyeye.davidaffo.com/. In Settings → Pages → Custom domain impostare `volleyeye.davidaffo.com`; su Cloudflare configurare un CNAME `volleyeye` verso `davidaffo.github.io` in modalità DNS only e abilitare Enforce HTTPS su GitHub quando disponibile. Con il workflow GitHub Actions non serve un file CNAME nel repository.

Il service worker viene generato dalla build includendo i chunk React, i documenti, le immagini e le risorse necessarie all'export offline. Il nuovo sottodominio separa IndexedDB e localStorage dalle altre app su `davidaffo.github.io`. I dati del vecchio indirizzo non vengono trasferiti automaticamente: esportare quelli ancora disponibili e importarli sul nuovo dominio. Le installazioni PWA precedenti vanno sostituite installando l'app dal nuovo indirizzo.

Lo [storico delle versioni](docs/changelog.md) è consultabile anche dal link **Changelog** nel footer del sito, con l'ultimo aggiornamento in cima.

Durante lo sviluppo le note vengono accumulate in `CHANGELOG.pending.md` da chi esegue le modifiche, incluso Codex. `npm run release` le trasferisce automaticamente nel changelog, aggiorna la versione e svuota il file di appoggio. Vedi [procedura release](RELEASE_PROCESS.md).
