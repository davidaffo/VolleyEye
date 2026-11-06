# VolleyEye

Applicazione open source per lo scouting della pallavolo. Funziona nel browser, anche offline, su desktop e mobile. Include scout live e video, analisi e import/export DataVolley.

Sito: https://davidaffo.github.io/VolleyEye/

## Sviluppo

- `npm ci`
- `npm run dev` — sviluppo React con Vite, porta 3000.
- `npm run serve` — compila e avvia la versione di produzione in locale: http://localhost:4173/VolleyEye/.
- `npm test` — regressioni della logica e dell'interfaccia.
- `npm run build` — genera il sito statico in dist/.
- `npm run preview` — verifica la build su /VolleyEye/.
- `npx playwright install chromium` e `npm run test:e2e` — verifiche nel browser dopo la build.

Il progetto usa React e moduli ES nativi per interfaccia, azioni e servizi. Calcoli, formati e dati salvati mantengono il comportamento precedente. Vedi [architettura e verifiche](docs/react-migration.md).

`dev` usa http://localhost:3000/ e `serve` usa http://localhost:4173/VolleyEye/: le porte diverse separano gli archivi del browser (IndexedDB e localStorage). Entrambi conservano i dati tra gli avvii e propongono le demo al primo accesso. I dati già presenti sulla porta 3000 restano lì; `serve` parte con un archivio separato. Per trasferirli si può usare l'export/import del database.

Usare sempre lo stesso indirizzo per ciascuna modalità: anche `localhost` e `127.0.0.1`, browser o profili diversi hanno archivi distinti. Le porte sono fisse: se occupate, il server segnala l'errore anziché passare automaticamente a un'altra porta e mostrare un archivio diverso. `preview` condivide l'archivio di `serve` quando aperto allo stesso indirizzo.

## GitHub Pages

In Settings → Pages selezionare **GitHub Actions** come Source. Il workflow `.github/workflows/pages.yml` verifica e compila l'app, poi pubblica dist/ dopo i push a main. Le pull request eseguono le verifiche senza pubblicare.

La build usa esplicitamente la modalità `production`, sia con `serve` sia nel workflow Pages; i dati locali del browser non vengono inclusi nella pubblicazione. Anche Pages mantiene il proprio archivio separato e le demo al primo avvio.

Vite usa /VolleyEye/ come percorso di produzione. Il service worker viene generato dalla build includendo i chunk React, i documenti, le immagini e le risorse necessarie all'export offline. L'URL del sito e i dati salvati nel browser mantengono la stessa origine e lo stesso percorso.

Per aggiornare la versione: `npm run release`. Vedi [procedura release](RELEASE_PROCESS.md).
