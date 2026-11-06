# Release e changelog

Per ogni modifica al programma, aggiungere autonomamente una nota in italiano a `CHANGELOG.pending.md`, una riga per punto nel formato `- Descrizione delle novità per gli utenti`. Aggiornare o accorpare le note della stessa modifica senza duplicarle; conservare tutte le note già presenti di altri interventi. Non chiedere all'utente di scrivere le note o passarle al comando.

Non eseguire una release per ogni intervento: accumulare le note nel file in attesa finché l'utente richiede una release. Solo allora eseguire `npm run release` (o la variante richiesta): il comando legge il file, aggiorna versione e `docs/changelog.md` e svuota le note dopo la sincronizzazione riuscita. Non cancellare le voci storiche. Includere `CHANGELOG.pending.md` nelle modifiche versionate, anche se è un appoggio temporaneo. Vedi `RELEASE_PROCESS.md`.

Eseguire `npm test` e `npm run build` prima di concludere modifiche al programma.
