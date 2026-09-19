# Architettura del frontend

VolleyEye usa ancora script classici caricati in ordine, perché lo stato applicativo esistente è condiviso globalmente. Il codice non è però più raccolto in due bundle monolitici: ogni responsabilità ha un file riconoscibile. L'ordine dichiarato in `index.html` è parte del contratto applicativo.

## Scout live e analisi

I file sono raggruppati per dominio in `js/scout/`:

- `live/`: acquisizione dello scout, modali dei fondamentali, rendering dei due
  campi, registrazione eventi, flusso automatico, formazioni, punteggio,
  traiettorie e layout del workspace. Per cambiare la sequenza
  battuta-ricezione-alzata-attacco-muro-difesa partire da `live/game-flow.js`.
- `analysis/`: metriche, grafici, tabelle, filtri, viste giocatrice, traiettorie,
  match sheet, distribuzioni e report.
- `video/`: selezione degli eventi, sorgenti video, editor e playback.
- `io/`: import ed export di match, database e demo; codec, inserimento live,
  import ed export DataVolley sono moduli separati.
- `core/`: lifecycle, caricamento dello stato, binding dei controlli e bootstrap.
  `core/bootstrap.js` deve soltanto orchestrare i moduli di inizializzazione.

`js/scout-ui.js` contiene soltanto riferimenti DOM, stato UI condiviso e primitive comuni.

## Squadre, rose e match

I file sono raggruppati per dominio in `js/roster/`:

- `core/`: snapshot applicativo e modello delle giocatrici.
- `court/`: campo, rotazioni, libero, panchina e relativi binding UI.
- `storage/`: repository di squadre e match, più azioni sull'archivio.
- `imports/`: import e revisione Camp3.
- `settings/`: metriche, codici attivi e regole punto.
- `editor/`: editor completo della squadra e formazione predefinita.

`js/roster-lineup.js` conserva solo i riferimenti DOM e il rendering di base condiviso.

## Stili

`style.css` contiene fondamenta, variabili e componenti comuni. I fogli in `styles/` separano match/formazioni, analisi, metriche, video, modali, gestione squadra, responsive, Scout Live e stampa. Devono essere caricati nell'ordine indicato in `index.html`, così la cascata rimane deterministica.

## Regole per le modifiche

1. Una nuova funzione va nel modulo della sua responsabilità, non nel file entrypoint.
2. Un modulo JavaScript applicativo non deve superare 1.500 righe; un foglio CSS non deve superare 1.800.
3. Ogni nuovo asset runtime deve comparire sia in `index.html` sia nel service worker.
4. Le estrazioni strutturali devono mantenere l'ordine del codice e passare l'intera suite prima di ulteriori refactor logici.
5. La migrazione futura a moduli ES deve partire dalle primitive pure, senza mescolarla a correzioni funzionali.

## API condivise

Le API che attraversano un confine di dominio sono raccolte nell'unico namespace
`window.VolleyEye`. Formazioni, auto-role, isolamento dello stato, rendering dei
roster e impostazioni match non devono creare nuovi identificatori globali.
