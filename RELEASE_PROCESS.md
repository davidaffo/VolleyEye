# Release Process

Durante lo sviluppo:

Chi esegue le modifiche, incluso Codex, aggiunge le note direttamente in `CHANGELOG.pending.md`, senza chiedere all'utente di scriverle. Usare una riga per modifica nel formato `- Descrizione in italiano delle novità per gli utenti`, sotto il titolo del file. Accorpare le note dello stesso intervento e conservare quelle già presenti. Il file è un appoggio temporaneo versionato insieme al codice, così le note sopravvivono a commit, cambi di sessione e passaggi tra collaboratori. Non eseguire una release per ogni modifica.

Quando viene richiesta una release:

1. Eseguire `npm run release`: legge le note in attesa, aumenta `baseVersion` di `0.0.1`, aggiunge in cima al changelog la versione con data e note, e sincronizza automaticamente i file. Dopo la sincronizzazione riuscita svuota `CHANGELOG.pending.md`, conservandone il titolo. Non occorre passare note al comando.
2. Verificare che siano aggiornati:
   - `version.config.json`
   - `version.json`
   - `js/app-version.js`
   - `docs/changelog.md`, con l'ultima versione in cima e le versioni precedenti conservate.
   - `CHANGELOG.pending.md`, senza le note appena pubblicate.
   - La build React importa `js/app-version.js`; `dist/index.html` e `dist/service-worker.js` vengono rigenerati da `npm run build`.

Varianti:
- `npm run release -- minor`: aumenta la minor e azzera la patch.
- `npm run release -- major`: aumenta la major e azzera minor e patch.
- `npm run release -- 1.2.3`: imposta una versione esplicita maggiore di quella attuale.
- `npm run version:sync`: sincronizza senza incrementare la versione.

In VS Code: **Terminale → Esegui attività → Aggiorna versione VolleyEye**, poi scegliere `patch`, `minor` o `major`. Le note vengono lette dal file di appoggio.
Non è necessario modificare file manualmente. Il comando non crea commit o tag e non pubblica l'app.

Note:
- Senza modifiche in attesa il comando non crea una release vuota e non incrementa la versione. I punti identici vengono inclusi una sola volta.
- Le note in attesa vengono conservate se la release fallisce; una release successiva userà soltanto le nuove note accumulate.
- Il sito mostra `docs/changelog.md` dal link **Changelog** nel footer, con indice delle versioni; il documento viene incluso nella build e nella cache offline.
- Lo storico iniziale è ricostruito dalle versioni presenti nei commit Git, inclusi i rami integrati: i messaggi storici sono conservati nella lingua originale con link ai commit. Non vengono inventate versioni per colmare i salti di numerazione. Le date storiche sono quelle dei commit.
- Il formato versione finale resta: `baseVersion+commitCount.commitHash`.
- GitHub Actions esegue `version:sync` e `build` prima del deploy; il service worker pubblicato viene generato dalla build con i nomi effettivi dei chunk.
- `src/pwa/service-worker.js` è il template del worker React; il precache e la versione della cache sono generati dalla build.
