# Architettura del frontend

VolleyEye usa React e Vite con entrypoint `src/main.jsx`. Le pagine e i dialoghi sono componenti React; la logica è suddivisa in moduli ES con dipendenze importate direttamente. Gli store condividono le viste tramite `useSyncExternalStore`. Vedi [architettura React e verifiche](react-migration.md).

## Scout live e analisi

I file sono raggruppati per dominio in `src/features/`:

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

Lo stato locale dei controller è in `src/features/state/`; i controller importano questi moduli senza essere importati da essi. `createDomainState` conserva i dati inizializzati pigramente, mentre risolve i riferimenti DOM a ogni accesso: una lettura prima del montaggio non memorizza `null` e un rimontaggio non conserva nodi rimossi.

`src/app/application.js` coordina avvio e API esterna. `actions.mjs` compone i comandi; `view-publication.js` coordina le pubblicazioni e osserva gli eventi di dominio. I moduli delle feature non importano questi registri. `browser-effects.js` registra listener e timer; `dispose.js` li rimuove e libera player, observer e trascinamenti. Un nuovo avvio ripristina gli effetti; il completamento di un avvio precedente smontato non rende pronta la nuova sessione.

## Modelli e comandi delle analisi

`analysis/summary-model.js` costruisce il tabellino e restituisce dati, riepilogo e ambito. `analysis/aggregated-table.js` prepara i filtri, pubblica la vista e coordina gli altri pannelli. Il modello non richiama i controller.

Le celle interattive contengono `command` e `args`; `AggregatedTable` invoca i comandi registrati dall’applicazione. `summary-commands.js` gestisce dettaglio, scheda giocatrice, ritorno al riepilogo e formazione iniziale. Le intestazioni condivise risolvono la squadra al momento del clic; le righe di una squadra conservano il proprio ambito esplicito.

`skill-chart-model.js` costruisce serie e cache, `chart-model.js` la geometria SVG e i grafici individuali condivisi. I colori arrivano come dati dal publisher: la lettura del tema DOM è confinata in `chart-theme.js`, che rimuove il proprio nodo temporaneo anche in caso di errore. `score-model.js` e `timeline-model.js` calcolano statistiche, andamento e play by play. I comandi per metrica, selezione del punto e cambio set sono separati dai publisher.

Distribuzioni e filtri dei relativi eventi sono in `setting-model.js` e `player-setting-model.js`; la zona mancante usa il selettore del campo della squadra corretta, che riconosce anche la giocatrice sostituita dal libero. La geometria condivisa delle traiettorie è in `src/domain/trajectory-geometry.js`; `trajectory-model.js` e `player-trajectory-model.js` filtrano e raggruppano gli eventi senza importare i controller. `match-sheet-model.js` costruisce dati e geometria SVG della scheda partita; modifiche ai filtri e note sono comandi separati.

`filter-view.js` condivide pubblicazione, lettura delle selezioni e primitive dei filtri. Riceve dal chiamante la callback della feature; non importa i controller delle analisi. I publisher di distribuzioni, traiettorie e scheda partita sono separati dai controller che coordinano filtri e aggiornamenti.

`trajectory-canvas.js` gestisce disegno e caricamento delle immagini, senza importare i controller. I componenti React passano il callback di ridisegno, che smette di agire dopo lo smontaggio. La cache riusa anche le immagini ancora in caricamento e notifica una sola volta ciascun callback registrato, evitando nuove immagini a ogni ridisegno.

I test verificano che il grafo dei modelli e dei publisher separati sia aciclico e che non importi comandi o controller UI; il controllo degli import mancanti copre anche i nuovi moduli.

## Squadre, rose e match

I file sono raggruppati per dominio in `src/features/teams/`:

- `core/`: snapshot applicativo e modello delle giocatrici.
- `court/`: campo, rotazioni, libero, panchina e relativi binding UI.
- `storage/`: repository di squadre e match, più azioni sull'archivio.
- `imports/`: import e revisione Camp3.
- `settings/`: metriche, codici attivi e regole punto.
- `editor/`: editor completo della squadra e formazione predefinita.

`src/features/state/roster-lineup.js` conserva lo stato condiviso delle formazioni. `teams/roster-data.js`, `teams/selectors.js` e `teams/set-start-model.js` espongono dati e selettori senza dipendere dai controller. Campo e posizionamento automatico usano le librerie ES di dominio; non mantengono copie alternative per il vecchio caricamento tramite script.

## Workspace React

`ScoutWorkspace.jsx` possiede gli host stabili dei widget e i relativi portal. La disposizione viene da `workspaceStore`; il controller gestisce coordinate, tastiera e salvataggio senza spostare i nodi. L’effetto React colloca lo stesso host nella zona richiesta, conservando identità dei figli e focus. Annullamento e smontaggio rilasciano la cattura del puntatore e rimuovono il feedback.

Le impostazioni pubblicano un nuovo modello solo quando cambiano le proprie dipendenze, incluse le configurazioni annidate; una modifica agli eventi o al tempo video non ricostruisce questa vista.

## Stili

`style.css` contiene fondamenta, variabili e componenti comuni. I fogli in `styles/` separano match/formazioni, analisi, metriche, video, modali, gestione squadra, responsive, Scout Live e stampa. Devono essere caricati nell'ordine degli import in `src/main.jsx`, così la cascata rimane deterministica.

## Regole per le modifiche

1. Una nuova funzione va nel modulo della sua responsabilità, non nel file entrypoint.
2. Un modulo JavaScript applicativo non deve superare 1.500 righe; un foglio CSS non deve superare 1.800.
3. Importare moduli e componenti dal loro utilizzatore. Gli asset statici sono inclusi da `build/static-assets-plugin.mjs`; la build genera il precache del service worker dai file effettivamente emessi.
4. Verificare le modifiche con la suite della logica e con le prove browser dei flussi coinvolti.
5. React genera l’interfaccia; usare ref ed effetti per le API del browser e per misure, focus, player e canvas. Conservare i dati delle viste negli store.

## API condivise

Le librerie di dominio sono esportate da `src/domain/`; i servizi si importano da `src/features/`. `js/globals.js` contiene le costanti condivise, inclusi 8 cambi e 2 tempi per set, e il modello della partita. Il superamento dei limiti resta consentito. `window.VolleyEye.app` espone soltanto l’API esterna per automazione e diagnostica; i moduli interni non la usano per comunicare.

### Persistenza locale

`storage/state-snapshot.js` e `storage/match-payload.js` serializzano lo stato; `storage/state-db.js` gestisce la connessione, `storage/match-repository.js` i record e `storage/save-state.js` il salvataggio. Caricamento e navigazione restano nei controller. L’evento `match-archive-changed` notifica il coordinatore applicativo, che aggiorna le viste dell’archivio: il repository non importa i relativi controller.


`src/features/storage/persistent-storage.js` gestisce l'archivio IndexedDB nel database
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
riapertura. La prova dei moduli nativi importa consecutivamente tutti i DVW in
`resources/data volley`, verifica la riapertura da un nuovo contesto e mantiene
il contenuto complessivo di `localStorage` sotto 10 KB di testo.
