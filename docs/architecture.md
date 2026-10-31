# Architettura del frontend

VolleyEye usa React e Vite con entrypoint `src/main.jsx`. Le pagine e i dialoghi sono componenti React; la logica è suddivisa in moduli ES con dipendenze importate direttamente. Gli store condividono le viste tramite `useSyncExternalStore`. Vedi [architettura React e verifiche](react-migration.md).

## Scout live e analisi

Le opzioni del tipo d’attacco e le etichette con scorciatoie appartengono a `scout/skill-control-model.js`: campo, dialogo e selettore delle scorciatoie riusano la stessa formattazione senza importare il controller della tastiera. `live/scout-shortcuts.js` mantiene i gesti; frecce, combinazioni Shift e avanzamento per fotogramma riusano `seekPlaybackBy`. Il gesto da tastiera conserva la durata locale acquisita all’inizio; YouTube ha precedenza sul video locale e la riproduzione riprende solo se già attiva.

I file sono raggruppati per dominio in `src/features/`:

- `live/`: acquisizione dello scout, modali dei fondamentali, rendering dei due
  campi, registrazione eventi, flusso automatico, formazioni, punteggio,
  traiettorie e layout del workspace. Per cambiare la sequenza
  battuta-ricezione-alzata-attacco-muro-difesa partire da `live/flow-model.js`; l’inferenza degli esiti del muro è in
  `events/block-inference-model.js` e gli indicatori in `scout/flow-view.js`.
- `analysis/`: metriche, grafici, tabelle, filtri, viste giocatrice, traiettorie,
  match sheet, distribuzioni e report.
- `events/`: selezione condivisa, schema delle tabelle, modelli degli editor e comandi di modifica.
- `video/`: eventi e ordinamento video, sorgenti, tempi, editor e playback.
- `io/`: import ed export di match, database e demo; codec, inserimento live,
  import ed export DataVolley sono moduli separati.
- `core/`: lifecycle, caricamento dello stato, binding dei controlli e bootstrap.
  `core/bootstrap.js` deve soltanto orchestrare i moduli di inizializzazione.

Lo stato locale dei controller è in `src/features/state/`; i controller importano questi moduli senza essere importati da essi. `createDomainState` conserva i dati inizializzati pigramente, mentre risolve i riferimenti DOM a ogni accesso: una lettura prima del montaggio non memorizza `null` e un rimontaggio non conserva nodi rimossi.

`src/app/application.js` coordina avvio e API esterna. `actions.mjs` compone i comandi; `view-publication.js` coordina le pubblicazioni e osserva gli eventi di dominio. I moduli delle feature non importano questi registri. `browser-effects.js` registra listener e timer; `dispose.js` li rimuove e libera player, observer e trascinamenti. Un nuovo avvio ripristina gli effetti; il completamento di un avvio precedente smontato non rende pronta la nuova sessione.

## Selezioni e reset

`scout/selection-state.js` contiene pulizia dei metadati, prompt e zone; `scout/serve-keyboard.js` registra un solo listener di battuta e lo libera esplicitamente. `scout/skill-modal-state.js` gestisce apertura, chiusura e annullamento del dialogo senza importare i controller della registrazione. `scout/selection-flow.js` coordina le selezioni asincrone di battuta e attacco; `scout/trajectory-dialog.js` gestisce il dialogo delle traiettorie. Campo e dialogo compongono questi flussi tramite callback espliciti. Le operazioni di formazione appartengono a `live/lineup-editor.js`; selezione del fondamentale e reset dell’alzata a `live/flow-model.js`.

I reset condividono `video/reset-model.js` per dati/preset/orologio e `video/reset-commands.js` per selezioni/cache/player. L’opzione `includeScout` conserva la differenza fra reset completo e reset dall’archivio; la cancellazione della cache resta asincrona e non blocca i player. La navigazione usa un solo catalogo dei renderer di analisi e una sola pianificazione, mantenendo scelta iniziale o rilettura della scheda corrente secondo il percorso originale.

I publisher di tabelle e traiettorie accettano ID dello store. Il confronto fra giocatrici passa gli ID dei pannelli visibili e un’opzione esplicita di confronto; non cerca le tabelle con `querySelector` o `closest`. Lo scorrimento, i riferimenti delle righe per focus e selezione, i canvas e le misure dei colori restano operazioni del browser. La tabella eventi conserva le righe montate per queste operazioni, senza memorizzare checkbox e intestazioni duplicate dello stato React.

Il log eventi pubblica sempre la vista degli ultimi 40 eventi. Il precedente ramo di append imperativo era irraggiungibile dopo la pubblicazione completa: rimosso insieme al relativo flag e alla chiave non più letta. I chiamanti usano i publisher direttamente dove il precedente metodo inoltrava soltanto la chiamata. Pubblicazioni consecutive identiche sono state unificate.

## Modelli e comandi delle analisi

`analysis/stats-model.js` ricalcola le statistiche del match senza importare viste o controller: conserva invalidazione delle cache, filtri degli eventi e codici personalizzati. Inizializzazione e fondamentali non previsti riusano `emptyCounts`, con oggetti distinti per giocatrice e fondamentale. `stats-update.js` coordina il percorso ordinario dati → punteggio live → analisi → video. `renderAnalysisViews` coordina gli aggiornamenti completi: tabellino senza aggiornamenti annidati, traiettorie attacco, battuta, distribuzione e giocatrice, una volta ciascuno. Il tabellino chiamato direttamente conserva gli aggiornamenti correlati preesistenti. Filtri, multiscout e sincronizzazione dell’editor video usano il percorso completo; l’editor ricalcola i dati prima di log e viste senza passare da un primo rendering completo ridondante. Conservati salvataggio prima della modifica video ordinaria e dopo la sincronizzazione forzata del log, sospensione durante la modifica multipla e scorrimento soppresso nella sincronizzazione.

I publisher `analysis/trajectory-filters.js` e `analysis/video-filters.js` hanno dipendenze acicliche e non importano più handler, salvataggi o controller dei pannelli. Caselle, filtri divisi per squadra, selettori del fondamentale precedente e radio del lato campo condividono la pubblicazione dei descrittori di comando; `AnalysisFilter` e `PreviousSkillSelect` aggiornano lo store prima del dispatch. Le azioni sul lato campo leggono l’ambito corrente al momento del gesto, salvano e aggiornano solo il pannello interessato. `buildAttackTrajectoryFilterOptions` condivide la preparazione fra analisi generale e giocatrice: i tipi d’attacco usano l’elenco completo, gli altri filtri gli eventi con traiettoria.

`analysis/shared-filter-view.js` pubblica filtri di squadra, match e set senza importare i controller delle analisi. Tabellino, giocatrici, distribuzioni e traiettorie importano questo publisher direttamente. I filtri condivisi e il multiscout espongono `changeAction` con comando e argomenti clonabili; `AnalysisFilter` aggiorna lo store prima di inviare il gesto nativo a `runAnalysisFilterAction` attraverso gli eventi pronti. Il registro risolve solo i propri comandi e conserva l’esecuzione sincrona. Gli altri controlli mantengono i callback specifici delle loro viste. `domain/analysis-filter-schema.js` definisce campi, ID, ordine e conversioni numeriche condivisi dalla UI e dai comandi. I filtri pubblicano e leggono chiavi dello store; `FilterField` e `FilterVisibility` applicano la visibilità da React, senza cercare o modificare contenitori DOM. Preset e multiscout usano direttamente i rispettivi publisher, senza wrapper intermedi.

`analysis/cache-model.js` centralizza l’invalidazione senza importare controller: grafici (cache e token di rendering), eventi (anche revisione e chiave) e analisi completa (anche statistiche e ambito). Il ricalcolo delle statistiche invalida eventi e grafici conservando la precedente semantica della cache statistica. `analysis/reset-model.js` azzera le selezioni del match usando la stessa operazione di dominio dei reset individuali, conserva l’identità dei Set e ripristina la squadra predefinita prima di invalidare le cache. Caricamento, modifica eventi e gestione squadre importano direttamente queste operazioni; non attraversano il controller dei filtri. Persistenza e aggiornamento delle viste restano nei chiamanti.

`analysis/summary-model.js` costruisce il tabellino e restituisce dati, riepilogo e ambito. `analysis/aggregated-table.js` prepara i filtri, pubblica la vista e coordina gli altri pannelli. Il modello non richiama i controller.

Le celle interattive contengono `command` e `args`; `AggregatedTable` invoca i comandi registrati dall’applicazione. `summary-commands.js` gestisce dettaglio, scheda giocatrice, ritorno al riepilogo e formazione iniziale. Le intestazioni condivise risolvono la squadra al momento del clic; le righe di una squadra conservano il proprio ambito esplicito.

`skill-chart-model.js` costruisce serie e cache, `chart-model.js` la geometria SVG e i grafici individuali condivisi. I colori arrivano come dati dal publisher: la lettura del tema DOM è confinata in `chart-theme.js`, che rimuove il proprio nodo temporaneo anche in caso di errore. `score-model.js` e `timeline-model.js` calcolano statistiche, andamento e play by play. I comandi per metrica, selezione del punto e cambio set sono separati dai publisher.

Distribuzioni e filtri dei relativi eventi sono in `setting-model.js` e `player-setting-model.js`; la zona mancante usa il selettore del campo della squadra corretta, che riconosce anche la giocatrice sostituita dal libero. La geometria condivisa delle traiettorie è in `src/domain/trajectory-geometry.js`; `trajectory-model.js` e `player-trajectory-model.js` filtrano e raggruppano gli eventi senza importare i controller. `match-sheet-model.js` costruisce dati e geometria SVG della scheda partita; modifiche ai filtri e note sono comandi separati.

`filter-view.js` condivide pubblicazione, lettura delle selezioni e primitive dei filtri. Riceve dal chiamante la callback della feature; non importa i controller delle analisi. I publisher di distribuzioni, traiettorie e scheda partita sono separati dai controller che coordinano filtri e aggiornamenti.

`trajectory-canvas.js` gestisce disegno e caricamento delle immagini, senza importare i controller. I componenti React passano il callback di ridisegno, che smette di agire dopo lo smontaggio. La cache riusa anche le immagini ancora in caricamento e notifica una sola volta ciascun callback registrato, evitando nuove immagini a ogni ridisegno.

La scheda giocatrice separa statistiche e foto in `player-snapshot-model.js`, modifiche delle preferenze in `player-commands.js` e coordinamento dei pannelli in `skill-tables.js`. `player-view.js` pubblica i dati e compone le viste di confronto. `PlayerAnalysisRegion` usa lo store per visibilità di confronto, tabella, grafici e sezioni: conserva i pannelli montati e non richiede modifiche imperative delle classi.

`video-filter-model.js` definisce un unico schema per campi, tipi, snapshot, ripristino e conteggio dei filtri attivi. Anche il registro dei controlli usa quello schema. Preset e multiscout hanno publisher e comandi separati; il publisher multiscout riceve esplicitamente il callback di selezione. La pubblicazione delle metriche è in `settings/metrics-view.js`; la sincronizzazione dei pulsanti dello scout resta nel controller.

`video/overlay-model.js` seleziona l’evento e costruisce il testo dell’overlay senza dipendere da playback o editor. Il publisher video e i comandi dei controlli video sono moduli distinti.

`events/table-model.js` definisce ogni colonna una sola volta: intestazione, testo, ordinamento, modifica multipla e campo dell’editor. Produce righe e celle senza callback UI; `table-view.js` pubblica il modello e conserva i contesti e i riferimenti delle righe montate. `EventTable` richiama gli handler condivisi di `table-commands.js` per selezione, modifica, ordinamento e traiettorie attraverso gli eventi pronti dell’applicazione. I callback opzionali del chiamante restano nelle opzioni della tabella, senza replicarli in ogni cella. `edit-model.js` descrive i controlli e le modifiche ai dati senza importare playback o aggiornamenti delle viste. Il collegamento alle righe DOM indicizza le righe precedenti una sola volta, conservando i riferimenti necessari allo scorrimento.

`events/selection-model.js` condivide lettura e potatura delle selezioni tra log, tabella video, overlay, inserimento, mobile e play by play. Le diverse priorità restano esplicite: l’overlay segue l’ordine della tabella, il play by play usa la prima chiave selezionata, il mobile può mostrare la prima riga senza selezionarla. `video/event-model.js` accede agli eventi e ne sincronizza i collegamenti alle giocatrici; `sort-model.js` ordina una copia, conservando la cronologia originale e lo spareggio crescente per ID. I tempi del play by play sono in `playback-model.js`; etichette di squadra e fondamentale sono condivise con la tabella in `events/display-model.js`.

I test verificano che il grafo dei modelli e dei publisher separati sia aciclico e che non importi comandi o controller UI; il controllo degli import mancanti copre anche i nuovi moduli. Un controllo aggiuntivo segnala chiamate a funzioni esportate del progetto prive di import o dichiarazione locale, per evitare che i globali delle fixture nascondano import mancanti. La suite browser esegue l’app effettiva sul percorso GitHub Pages.

## Stato del campo e operazioni dello scout

`teams/court-state-model.js` gestisce formazione base, cache dei ruoli, fase di gioco, disposizione visualizzata, zone, validazione dei posizionamenti e sostituzioni automatiche del libero. Non importa controller, publisher o salvataggi. Le operazioni possono modificare lo stato del match e le cache del campo; non leggono né aggiornano il DOM.

Cache e ripristino usano lo stesso codice con ambito `our`/`opponent`, senza esportazioni parallele per l’avversaria. Le rotazioni condividono spostamento degli slot e ripristino della titolare quando il libero entra in prima linea. Conservano la direzione predefinita dei due controlli, la rotazione della squadra interessata e le regole del libero al servizio.

`court-engine.js` mantiene i comandi che registrano cambi, salvano e aggiornano le viste. `court-ui-bootstrap.js` mantiene i gesti, le animazioni e il coordinamento dei controlli. `prepareAutoRolePositioning` restituisce se la disposizione è stata aggiornata: il controller salva e pubblica soltanto in quel caso, mantenendo l’ordine delle operazioni. La validazione restituisce un messaggio; il comando decide se mostrarlo.

Eliminati i precedenti richiami privi di effetti a `renderLineupChips` e `syncCurrentSetUI`. La panchina del libero pubblica entrambe le squadre una volta per aggiornamento; il test delle interazioni verifica anche il numero di pubblicazioni.

`scout/court-model.js` prepara i dati delle schede e della panchina: rosa della squadra, nomi, numeri, capitani, foto, ruoli, ordine sul campo e posizione del rientro. I dati delle singole schede sono clonabili e non contengono callback. La preparazione normalizza il campo come prima, senza leggere il DOM. `pick-model.js` legge ambito delle modalità punto/errore ed elenco ordinato delle riserve; previsione del fondamentale e selettori dell’attacco sono in `live/flow-model.js`, senza dipendere dai controller di layout.

`scout/court-commands.js` coordina cattura delle posizioni per l’animazione, dati, controlli dei fondamentali e pubblicazione. Costruisce ogni scheda insieme ai propri controlli: la preparazione di un attacco può cambiare il flusso sincrono prima della scheda successiva. La panchina viene preparata dopo le schede e l’orientamento finale viene letto al momento della pubblicazione. Il campo nascosto non esegue queste operazioni.

I comandi di campo, panchina e fondamentali condividono i descrittori di azione di `skill-control-model.js`; i componenti React li invocano attraverso `skill-actions.js`. Il publisher non importa il dispatcher. `live/team-rendering.js` passa per ogni chiamata i callback `onRender`, `onScheduleRender` e `onQueuedAttack` alla preparazione dei controlli. Le transizioni restano nei punti sincroni originali, anche fra una scheda e la successiva; non esiste un registro separato dei callback. Cattura delle posizioni e animazione FLIP sono in `layout/animation.js`.

`scout/court-view.js` pubblica soltanto negli store React. `skill-preparation.js` contiene la preparazione sincrona dei controlli dei fondamentali e le relative transizioni; sostituisce il precedente `live/court-view-model.js`, che importava registrazione eventi, modali, salvataggi e renderer. I due campi continuano a riusare gli stessi componenti React e le stesse funzioni di composizione con ambito esplicito.

`scout/skill-control-model.js` costruisce gruppi, pulsanti, intestazioni, colori e ordine dei codici. `buildPreparedScoutSkillView` trasforma la descrizione preparata in controlli, senza leggere lo stato del match o avviare operazioni: campo e dialogo riusano lo stesso costruttore per battuta, attacco e valutazione, conservando classi e intestazioni specifiche. Le azioni sono descrittori clonabili `command`/`args`, con un contesto immutabile della giocatrice condiviso dai pulsanti. La vista dei controlli non contiene callback né riferimenti DOM.

`skill-preparation.js` sceglie il tipo di controllo e restituisce dati clonabili dopo aver coordinato le transizioni che devono avvenire durante la preparazione: battuta pendente, conferma del muro, ascolto della tastiera e Damp automatico. `court-commands.js` esegue preparazione e costruzione della vista consecutivamente per ciascuna scheda; non esiste più un modulo intermedio `skill-controls.js`. `skill-actions.js` gestisce registrazione, pulizia dopo il successo, selezione, annullamento, muro e avvio dell’attacco. La registrazione normale e l’errore di battuta limitato mantengono le loro diverse pulizie; annullare una selezione parziale resta diverso dal tornare alla scelta del fondamentale.

`ScoutSkillControls` invia i descrittori al registro degli eventi pronti, che esegue il comando immediatamente e conserva il gesto originale. Il target DOM e i metadati vengono letti al clic, prima dell’attesa della registrazione. Campo e dialogo condividono tipi di battuta, ordine dei codici, costruzione dei gruppi e comandi; il contesto specifica quando aggiornare il campo e quando tornare ai codici o chiudere il dialogo. Tastiera e pulsanti riusano la selezione del tipo di battuta; i diversi avvii dell’attacco riusano lo stesso comando, mantenendo distinto il Damp automatico, che consuma il tipo prima dell’apertura e marca i metadati prima del ridisegno.

## Squadre, rose e match

L’archivio giocatrici separa `players/database-model.js` (associazioni alle squadre, ordinamento, righe clonabili, opzioni e conteggio delle giocatrici senza squadra), `database-view.js` (pubblicazione e apertura nello store) e `database-commands.js` (foto e unione ID). Il modello conserva esclusione delle giocatrici del template, etichette di ripiego e scelte predefinite della fusione. Le righe non contengono callback: clic e tastiera di `PlayersDbModal` invocano il comando foto tramite gli eventi pronti, conservando il gesto necessario al selettore file. Pulizia delle giocatrici senza squadra e vista riusano lo stesso calcolo delle associazioni; il publisher non importa più il controller dello scout.

`teams/player-reference-model.js` gestisce la rinomina nei riferimenti della partita con ambito esplicito: campo, liberi, capitani, associazioni del libero, eventi, formazioni iniziali e cache. Squadra e avversaria riusano la stessa logica, mantenendo la corrispondenza aggiuntiva per ID sugli eventi avversari e l’aggiornamento della battuta pendente solo per la squadra. Confronto dei roster, mantenimento degli indici correnti e lettura delle rimozioni sono nello stesso modulo aciclico. Il controller `core/player-model.js` coordina validazione con avvisi, applicazione del roster, salvataggio e viste; il motore del campo importa direttamente le operazioni sui riferimenti.

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

I parser DataVolley condividono le funzioni primitive di formato in
`io/datavolley-format.js`; l'export risolve il nome del file dal modello della
partita, senza importare il controller dell'export PDF. Etichette e stato
DataVolley vivono in `io/datavolley-entry-view.js`, separati dall'applicazione
dei comandi scout.

`live/next-set-model.js` e `live/set-start-draft.js` gestiscono le bozze delle
formazioni. Le viste leggono questi modelli; i controller coordinano apertura,
conferma e aggiornamenti del resto dell'applicazione. Analogamente, il modello
CAMP3 è indipendente dal controller che legge i file e applica l'importazione.
La vista dell'editor squadra gestisce gli aggiornamenti locali del proprio
roster e della formazione senza richiamare il controller di caricamento/salvataggio.

`events/selection-view.js` pubblica la selezione delle tabelle; il reset può
svuotarla senza importare i comandi di modifica degli eventi. La persistenza
dei riferimenti ai file video è in `video/local-file-storage.js`, mentre gli
snapshot di annullamento sono in `video/undo-model.js`. Questi moduli non
importano riproduzione, editor o registrazione scout. I test architetturali
verificano transitivamente l'assenza di cicli e di dipendenze dai controller
per 50 punti di ingresso, includendo riesportazioni e import dinamici letterali.
Un ulteriore test verifica l’assenza di cicli nell’intero grafo applicativo
`src/` e `js/` (esclusi i vendor), compresi i riferimenti dinamici letterali
e le riesportazioni. L’audit corrente non rileva cicli né import relativi mancanti.


Gli orologi scout e video, incluse pausa, ripresa e snapshot, appartengono a
`live/clocks.js`. `events/recording-model.js` costruisce i payload e assegna gli
ID; `video/media-state.js` legge lo stato dei player e pianifica aggiornamenti
compatibili con la riproduzione. Nessuno di questi moduli importa dialoghi,
registrazione dello scout o controller di riproduzione. L’integrazione con l’API
YouTube è in `video/youtube-player.js`; caricamento delle sorgenti e annullamento
restano nei comandi video.

`core/runtime-view.js` pubblica punteggio, stato partita e controlli scout.
`storage/match-repository.js` possiede i predicati sui dati salvati; il lifecycle
coordina il riallineamento dell’archivio con la navigazione. L’editor delle
metriche pubblica attraverso `settings/metrics-view.js`, senza dipendere dai
controller del campo. Gli aggiornamenti dei vecchi pulsanti che non eseguivano
più operazioni sono stati rimossi.

`core/viewport.js` coordina resize e aggiornamenti del campo; la geometria e il
disegno del canvas sono in `scout/trajectory-canvas.js`. Il dialogo traiettorie
può gestire puntatori, chiusura e risultato senza importare la registrazione
degli eventi. `layout/modals.js` possiede la soppressione dei clic transitori,
condivisa da formazione e traiettorie. `scout-ui.js` conserva layout, dimensioni
e reset senza importare i controller del campo.


`events/history-model.js` acquisisce gli snapshot dello scout e li associa agli
eventi come proprietà non enumerabili. `events/history-commands.js` possiede
ripristino, annullamento della contesa ed eliminazione degli eventi, mantenendo
la protezione contro la rimozione di un cambio o passaggio set nel mezzo dello
storico. Questi comandi non richiedono il lifecycle generale per acquisire uno
snapshot.

Caricamento ed entrata/uscita dalla partita appartengono ai comandi dell’archivio;
`core/match-reset.js` coordina il reset richiesto da creazione e importazione.
La rinomina dei riferimenti alle squadre negli archivi è in
`teams/team-reference-model.js`, separata dall’editor. `domain/roster-text.js`
interpreta il testo delimitato e `io/file-readers.js` legge i file scelti, senza
importare i comandi dell’archivio.

`teams/court-view.js` aggiorna le due indicazioni di rotazione.
`teams/lineup-commands.js` applica le formazioni predefinite, conserva l’ordine
fra aggiornamento della rotazione e cache dei ruoli e coordina l’eventuale
salvataggio dei liberi recuperati. Questi effetti restano fuori dai modelli
utilizzati dall’analisi. Le operazioni del dialogo formazione appartengono a
`live/lineup-editor.js`; il semplice aggiornamento della bozza del set successivo
appartiene alla sua vista. Tutti i percorsi di aggiornamento dei liberi usano
`scout/court-commands.js:renderLiberoBench`, senza quattro funzioni di inoltro.
