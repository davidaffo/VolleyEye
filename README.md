# VolleyEye

Applicazione open source per lo scouting della pallavolo. Funziona nel browser, anche offline, su desktop e mobile. Include scout live e video, analisi e import/export DataVolley.

Sito: https://davidaffo.github.io/VolleyEye/

## Sviluppo

- `npm ci`
- `npm run dev` — sviluppo React con Vite, porta 3000.
- `npm test` — regressioni della logica e dell'interfaccia.
- `npm run build` — genera il sito statico in dist/.
- `npm run preview` — verifica la build su /VolleyEye/.
- `npx playwright install chromium` e `npm run test:e2e` — verifiche nel browser dopo la build.

Il progetto usa React e moduli ES nativi per interfaccia, azioni e servizi. Calcoli, formati e dati salvati mantengono il comportamento precedente. Vedi [architettura e verifiche](docs/react-migration.md).

## GitHub Pages

In Settings → Pages selezionare **GitHub Actions** come Source. Il workflow `.github/workflows/pages.yml` verifica e compila l'app, poi pubblica dist/ dopo i push a main. Le pull request eseguono le verifiche senza pubblicare.

Vite usa /VolleyEye/ come percorso di produzione. Il service worker viene generato dalla build includendo i chunk React, i documenti, le immagini e le risorse necessarie all'export offline. L'URL del sito e i dati salvati nel browser mantengono la stessa origine e lo stesso percorso.

Per aggiornare la versione: `npm run release`. Vedi [procedura release](RELEASE_PROCESS.md).
