# Interfaccia React e build

L'applicazione usa React per pagine, controlli, dialoghi e viste dinamiche. Vite genera la build statica per GitHub Pages. La logica di scouting, i calcoli, la persistenza e i formati di import/export sono stati conservati per mantenere il comportamento e i dati esistenti.

## Interfaccia

- Archivio e creazione/modifica partite, squadre e giocatrici, editor, foto, import CAMP3 e unione delle identità.
- Scout live: campo, fondamentali, punteggio, set, formazioni, contatori, opzioni e scorciatoie.
- Inserimento DataVolley: input, anteprima strutturata, coda, rimozione, applicazione e messaggi.
- Tabelle eventi, modifica singola e multipla, filtri, preset, metriche, grafici SVG, analisi giocatrici, confronto, tabellino e note.
- Video locale e YouTube, sorgenti condivise, comandi, sincronizzazione, overlay e navigazione mobile.
- Import/export del database e delle partite, reset, selettori file e dialoghi.
- Portal per i dialoghi sul campo, con contenitori stabili che preservano controlli e canvas durante il cambio desktop/mobile.

I limiti sono in `js/globals.js`: 8 cambi e 2 tempi. Il superamento rimane consentito. I contatori mostrano zero dopo aver esaurito il limite, conservando tutti gli eventi ulteriori.

## Componenti condivisi

Le strutture ricorrenti sono definite una sola volta e ricevono dati e callback tramite props:

- `src/components/ui/Modal.jsx`: contenitore, intestazione, corpo e chiusura dei dialoghi, incluse formazione, punto/errore, squadre, traiettorie e sorgente video mobile. I dialoghi mantengono i propri contenuti e le proprie azioni. Il contenitore inoltra i ref al nodo DOM e permette di omettere il backdrop quando il dialogo originario non lo prevede.
- `AttackShortcutModal`: un solo dialogo configurabile per base, tipo di attacco, numero di muri e palleggiatrice.
- `ScoutTeamSettings`: lo stesso pannello per entrambe le squadre, con contatori e opzioni configurati dalla prop `scope`.
- `FilterField`: struttura comune dei campi filtro nelle analisi, nei video e nei dialoghi.
- `CommandButton` e `FileImportInput`: esecuzione dei comandi e importazione file condivise. `immediate` conserva il gesto sincrono del browser richiesto da selettori file e clipboard.
- `AnalysisFilterFields`: gruppi di filtri configurati tramite dati, senza ripetere il markup.
- `ScoutWidgetHandle` e `LiberoBench`: interazioni condivise per pannelli e liberi di entrambe le squadre.
- `src/state/view-store.mjs`: snapshot e sottoscrizioni comuni delle viste e dei dialoghi.
- `src/hooks/useViewStore.js`: sottoscrizione comune agli store tramite `useSyncExternalStore`, con cleanup automatico delle sottoscrizioni.

Per nuove viste, riutilizzare questi componenti e i controlli di dominio già presenti, come `AnalysisFilter`, `TeamCounter` e `VideoSourceControls`. ID, classi e attributi dell’interfaccia restano stabili; i contenuti con interazioni specifiche rimangono nei componenti di dominio.

## Moduli e stato

`src/main.jsx` monta l'app e avvia i servizi dal ciclo di vita React. Le funzionalità in `src/features/` e le librerie in `src/domain/` sono moduli ES con import ed export espliciti. Le azioni in `src/app/actions.mjs` chiamano direttamente questi moduli e pubblicano gli aggiornamenti delle viste. Non esistono un caricatore di script ordinati, un modulo virtuale o adattatori del programma classico.

React genera pagine, campi, tabelle e dialoghi. I componenti condividono i modelli tramite gli store in `src/state/` e `useViewStore`; i moduli di dominio conservano le regole di scouting, i calcoli e i formati dei dati. Navigazione, bozze, selezioni e inserimento DataVolley sono controllati dallo stato. I riferimenti al browser servono per player, canvas, geometria del trascinamento, focus, clipboard e stampa.

Gli effetti di avvio e stampa vengono registrati da `useEffect` e rimossi alla chiusura dell'app. La pulizia dei servizi conserva il tempo video, disconnette gli observer, ferma i player e libera le risorse locali. L'export autonomo usa lo stesso entrypoint React, con dati, CSS e immagini incorporati nel documento e un bundle `analysis-react.js`.

## GitHub Pages

`npm run build` genera `dist/` con asset e service worker basati sui chunk effettivi. Il percorso di produzione rimane `/VolleyEye/`, mantenendo origine e storage del sito.

Il workflow `.github/workflows/pages.yml` esegue installazione, test della logica, build e prove browser. Le pull request verso `main` vengono verificate; i push su `main` pubblicano `dist/` con GitHub Pages. Per attivarlo, la Source di Pages deve essere **GitHub Actions**. Alla verifica del 13 ottobre 2026, Pages usa ancora la pubblicazione dalla radice di `main` (`build_type: legacy`). Per pubblicare React occorrono la Source **GitHub Actions** e il workflow presente su `main`. Lavorare su un branch di migrazione non pubblica automaticamente il sito.

## Verifiche

I test di integrazione compilano e caricano il vero grafo dei moduli ES e montano i componenti React. Le unità che simulano dipendenze estraggono i corpi delle funzioni dalle sorgenti native; non mantengono copie del programma classico. I riferimenti di 93 prove su campo, grafici, editor, tabelle e anteprima DataVolley sono salvati in `tests/fixtures/react-ui-reference.json`, acquisiti prima della rimozione dei renderer. Le prove DOM dei campi e dei match importati montano i componenti React reali. Le prove Playwright esercitano la build sotto `/VolleyEye/`, compresi persistenza, riapertura offline, import/export, contatori oltre i limiti e identità del canvas nei portal.

Il video locale usa una fixture WebM di 10 secondi. La prova YouTube usa un SDK simulato e non verifica il servizio esterno reale.
