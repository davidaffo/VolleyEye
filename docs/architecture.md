# Architettura del frontend

VolleyEye parte da React e Vite in `src/main.jsx`. La struttura delle pagine è in `src/components/layout/`. Durante la migrazione, il motore esistente viene compilato in un modulo di compatibilità seguendo l'ordine dichiarato in `config/runtime-files.mjs`. Gran parte di campo, tabelle, analisi e dialoghi è gestita da React; player video, alcuni controlli e il motore conservano parti imperative. Vedi [stato della migrazione](react-migration.md).

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

`style.css` contiene fondamenta, variabili e componenti comuni. I fogli in `styles/` separano match/formazioni, analisi, metriche, video, modali, gestione squadra, responsive, Scout Live e stampa. Devono essere caricati nell'ordine degli import in `src/main.jsx`, così la cascata rimane deterministica.

## Regole per le modifiche

1. Una nuova funzione va nel modulo della sua responsabilità, non nel file entrypoint.
2. Un modulo JavaScript applicativo non deve superare 1.500 righe; un foglio CSS non deve superare 1.800.
3. I nuovi moduli React si importano dall’entrypoint o dal loro componente. I moduli del motore temporaneo vanno in `config/runtime-files.mjs`; gli asset statici devono essere inclusi da `build/static-assets-plugin.mjs`. La build genera il precache del service worker.
4. Le estrazioni strutturali devono mantenere l'ordine del codice e passare l'intera suite prima di ulteriori refactor logici.
5. La conversione dei rendering imperativi deve mantenere i confini tra DOM gestito da React e DOM ancora gestito dal motore. Estrarre prima le primitive pure.

## API condivise

Le API che attraversano un confine di dominio sono raccolte nell'unico namespace
`window.VolleyEye`. Formazioni, auto-role, isolamento dello stato, rendering dei
roster e impostazioni match non devono creare nuovi identificatori globali.

### Persistenza locale

`js/shared/persistent-storage.js` gestisce l'archivio IndexedDB nel database
`volleyScoutStateDb`, versione 2, store `archive`. Partite, squadre, anagrafica
(con foto) e snapshot completo della sessione sono salvati qui. Le letture della
UI usano una copia in memoria caricata prima del bootstrap; le scritture aprono
subito una transazione e sono confermate solo al suo completamento. Importazioni
e unioni attendono il commit; le unioni aggiornano tutti i record in una sola
transazione. Durante scritture pendenti o fallite la chiusura della pagina richiede
conferma per evitare la perdita di modifiche.

`localStorage` conserva solo tema, preferenze, segnali di reset e uno snapshot
`__uiOnly` con selezioni e disposizione dell'interfaccia. Non contiene eventi,
rose, fotografie o copie dell'archivio. Gli HTML di analisi esportati lavorano in
memoria e non scrivono i dati incorporati nell'archivio del browser.

Al primo avvio la migrazione copia le vecchie chiavi `Data/…`, lo snapshot locale
e quello dello store IndexedDB `state`. Per la sessione sceglie lo snapshot più
recente. Il commit e una rilettura di verifica precedono la rimozione delle copie
locali. Un marcatore consente di riprendere la pulizia interrotta senza ripristinare
record successivamente eliminati. I vecchi match JSON e quelli salvati nel formato
compatto a colonne restano leggibili; esportazioni e backup mantengono il formato
JSON pubblico.

I test usano `fake-indexeddb` per verificare transazioni, migrazione, abort e
riapertura. La prova del runtime importa consecutivamente tutti i DVW in
`resources/data volley`, verifica la riapertura da un nuovo contesto e mantiene
il contenuto complessivo di `localStorage` sotto 10 KB di testo.
