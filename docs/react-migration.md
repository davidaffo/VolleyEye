# Migrazione React — checkpoint

Stima di avanzamento: circa 80% della conversione complessiva. È una stima funzionale, non una misura delle righe di codice. La migrazione non è completa: React gestisce gran parte della UI, mentre il motore e alcuni controlli usano ancora il runtime di compatibilità.

## Parti convertite

- Avvio React/Vite, struttura delle pagine, navigazione, tema, archivio e dialogo partita.
- Punteggio, set, contatori, preparazione set, formazioni, campo e dialoghi dei fondamentali.
- Gestione squadre e giocatrici, editor squadra, foto, import e abbinamenti per unione.
- Tabelle eventi ed editor, filtri e preset, multiscout, metriche, grafici SVG, play by play, andamento set e match sheet.
- Tabelle aggregate e analisi giocatrice, confronto, distribuzioni e traiettorie.
- Dialoghi traiettorie, encoder e sorgente mobile; banner aggiornamenti e controlli della barra.
- Controlli delle sorgenti locale/YouTube in Scout e Analisi, player locale con sorgente dichiarativa, snapshot di riproduzione, overlay play by play e navigazione/filtri mobile.
- Opzioni inline dello scout, rotazione, libero, selezione della prossima skill e azioni di import/export, reset metriche e navigazione dei drawer.
- Portal React per i cinque dialoghi del campo: il contenitore resta stabile durante i cambi di posizione, preservando controlli, canvas e handler.

I limiti sono in `js/globals.js`: 8 cambi e 2 tempi. Rimane possibile registrare azioni oltre questi valori. Persistenza e formati di import/export restano compatibili.

## Confine temporaneo e lavoro restante

`AppLayout` viene montato prima di importare il motore. `config/runtime-files.mjs` dichiara le sorgenti compilate da `build/runtime-plugin.mjs` in un modulo ES isolato, senza eval o document.write. Gli adattatori pubblicano modelli di vista tramite store e mantengono i calcoli esistenti. I renderer classici restano disponibili per report e verifiche di compatibilità.

1. Separare i servizi di riproduzione e YouTube dal runtime. Il player locale e i suoi eventi sono React; l’integrazione SDK YouTube, seek e sincronizzazione restano effetti del servizio esistente.
2. Completare inserimento DataVolley, scorciatoie, import del database e controlli dello scout ancora collegati tramite listener imperativi. Le opzioni, rotazione e libero sono già React.
3. Separare stato, persistenza e logica di dominio dai riferimenti DOM; sostituire il modulo di compatibilità con import ES espliciti.
4. Trasferire la decisione della posizione dei dialoghi dal servizio di layout a React e completare il teardown degli effetti. I cinque dialoghi usano già portal con contenitori stabili; il servizio sposta i contenitori, non i nodi gestiti da React. StrictMode resta disattivato fino al teardown completo.
5. Verificare la versione finale e attivare il deploy GitHub Pages da Actions.

## Build e pubblicazione

`npm run build` genera `dist/`, asset e service worker con i chunk effettivi. Il workflow `.github/workflows/pages.yml` prepara verifiche, build e deploy GitHub Pages sotto `/VolleyEye/`. La pubblicazione richiede il push e l'impostazione Pages su GitHub Actions; questo checkpoint non attiva né pubblica il nuovo sito.

## Verifica

I test DOM usano il markup dei componenti React. I confronti differenziali verificano campo, grafici, editor eventi, tabelle aggregate e SVG rispetto ai calcoli precedenti. I test Playwright esercitano la build sotto `/VolleyEye/`, inclusi persistenza, dialoghi, analisi e comportamento oltre i limiti.

Le nuove prove browser usano un video WebM locale di 10 secondi e un SDK YouTube simulato: verificano caricamento condiviso, frame, sincronizzazione e undo, rimozione, bozze URL, navigazione mobile, persistenza delle opzioni e identità del canvas tra campo e popup. La prova YouTube non verifica il servizio esterno reale.
