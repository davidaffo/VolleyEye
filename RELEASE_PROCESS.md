# Release Process

Regola operativa per ogni modifica/fix/feature:

1. Eseguire `npm run release`: aumenta `baseVersion` di `0.0.1` e sincronizza automaticamente i file.
2. Verificare che siano aggiornati:
   - `version.config.json`
   - `version.json`
   - `js/app-version.js`
   - `index.html` (versione cache e URL delle risorse)
   - `service-worker.js` (versione cache)

Varianti:
- `npm run release -- minor`: aumenta la minor e azzera la patch.
- `npm run release -- major`: aumenta la major e azzera minor e patch.
- `npm run release -- 1.2.3`: imposta una versione esplicita maggiore di quella attuale.
- `npm run version:sync`: sincronizza senza incrementare la versione.

In VS Code: **Terminale → Esegui attività → Aggiorna versione VolleyEye**, poi scegliere `patch`, `minor` o `major`.
Non è necessario modificare file manualmente. Il comando non crea commit o tag e non pubblica l'app.

Note:
- Questa procedura vale sempre quando il programma viene aggiornato.
- Il formato versione finale resta: `baseVersion+commitCount.commitHash`.
