# Migrazione React — checkpoint

Stima di avanzamento: circa 75% della conversione complessiva. È una stima funzionale, non una misura delle righe di codice. La migrazione non è completa: React gestisce gran parte della UI, mentre il motore e alcuni controlli usano ancora il runtime di compatibilità.

## Parti convertite

- Avvio React/Vite, struttura delle pagine, navigazione, tema, archivio e dialogo partita.
- Punteggio, set, contatori, preparazione set, formazioni, campo e dialoghi dei fondamentali.
- Gestione squadre e giocatrici, editor squadra, foto, import e abbinamenti per unione.
- Tabelle eventi ed editor, filtri e preset, multiscout, metriche, grafici SVG, play by play, andamento set e match sheet.
- Tabelle aggregate e analisi giocatrice, confronto, distribuzioni e traiettorie.
- Dialoghi traiettorie, encoder e sorgente mobile; banner aggiornamenti e controlli della barra.

I limiti sono in `js/globals.js`: 8 cambi e 2 tempi. Rimane possibile registrare azioni oltre questi valori. Persistenza e formati di import/export restano compatibili.

## Confine temporaneo e lavoro restante

`AppLayout` viene montato prima di importare il motore. `config/runtime-files.mjs` dichiara le sorgenti compilate da `build/runtime-plugin.mjs` in un modulo ES isolato, senza eval o document.write. Gli adattatori pubblicano modelli di vista tramite store e mantengono i calcoli esistenti. I renderer classici restano disponibili per report e verifiche di compatibilità.

1. Convertire il player video, i controlli delle sorgenti e la navigazione video mobile.
2. Completare opzioni e controlli dello scout ancora collegati tramite listener imperativi.
3. Separare stato, persistenza e logica di dominio dai riferimenti DOM; sostituire il modulo di compatibilità con import ES espliciti.
4. Sostituire il riposizionamento imperativo dei dialoghi con portal e completare il teardown degli effetti. StrictMode resta disattivato fino ad allora.
5. Verificare la versione finale e attivare il deploy GitHub Pages da Actions.

## Build e pubblicazione

`npm run build` genera `dist/`, asset e service worker con i chunk effettivi. Il workflow `.github/workflows/pages.yml` prepara verifiche, build e deploy GitHub Pages sotto `/VolleyEye/`. La pubblicazione richiede il push e l'impostazione Pages su GitHub Actions; questo checkpoint non attiva né pubblica il nuovo sito.

## Verifica

I test DOM usano il markup dei componenti React. I confronti differenziali verificano campo, grafici, editor eventi, tabelle aggregate e SVG rispetto ai calcoli precedenti. I test Playwright esercitano la build sotto `/VolleyEye/`, inclusi persistenza, dialoghi, analisi e comportamento oltre i limiti.
