# Integrazione di main nella conversione React

Rami di partenza: `migrate/react` a `79c4d77`, `main` e `origin/main` a
`ffbe06536396ce2e90c14ab36ca8af289fb5e6f9`. Base comune: `de8c850`.
L'integrazione conserva entrambi i rami nella storia Git.

## Revisione per commit

| Commit main | Modifiche | Integrazione React |
| --- | --- | --- |
| `bd1cedc` — fixed bench update bug | Aggiornamento delle riserve durante la digitazione; rinomina dei riferimenti nella formazione e del libero preferito. | `TeamEditor` mantiene gli input con la stessa chiave; `editor-view.js` pubblica subito il nome e aggiorna i riferimenti. La ricerca nell'archivio resta alla perdita del focus. Test del modello e caso browser con identità del nodo e focus conservati. |
| `fe67103` — UI Fixes | Pannello avversaria in singola squadra, rotazioni, widget campo, misure non scalate, foto, rientro libero, filtro liberi già in campo; prime correzioni dell'annullamento. | Componenti `SingleTeamOpponentPanel`, `ScoutTeamPanel`, portal del campo e zona `center-court`; rotazioni montate nel pannello pertinente da React. Misura `offsetHeight`; observer foto con pulizia; pulsante rientro fuori dall'intestazione; filtro nel modello della panchina. L'annullamento usa il successivo disegno persistente di `5edecc2`. CSS integrato. |
| `c14387e` — version update | Aggiornamento di versione e cache. | Conservata la versione React più recente `0.19.23`, senza retrocedere a `0.19.14`; cache generata dagli asset Vite e metadati della build. Non viene ripristinato il service worker classico. |
| `5edecc2` — better undo | Ricevute persistenti per azione; annullamento atomico, set e fine partita; statistiche avversarie; rinomina negli stati di annullamento; isolamento del set; riparazione del caso 23 ottobre. | `events/history-model.js` e `history-commands.js`, ricevute prima di cambiare campo/set, timeout e sostituzioni; patch reversibili dell'attacco inferito dal muro; riferimenti aggiornati per squadra. Statistiche ricalcolate per entrambe le squadre. Procedura di riparazione collegata alle regole ES native. Importati e adattati i test di transazioni, persistenza, legacy e riparazione. |
| `765f6e8` — various bugfixes | Opzione difesa dopo muro per squadra, reset asincrono delle traiettorie dopo cambi, libero in zona 1 al servizio, rientri in formazione, cambio campo relativo, dialogo set indipendente, esportazione dalla navigazione, numeri, scorrimento log e punti rete specchiati. | Opzioni in default, store, import/export e componenti; versione del flusso per invalidare richieste pendenti. Modelli condivisi per libero e formazioni; `NextSetPreparation` in portal su `document.body`, focus e semantica dialogo. Checkbox relativa, scelta del lato assoluta. Export desktop/mobile; input numerici testuali filtrati; scorrimento dell'ultima riga e punti rete specchiati. Export HTML verificato con il bundle React autonomo, navigazione completa e rete disabilitata. |
| `40f6da4` — better video analysis instruments | Salvataggio JPEG del fotogramma; tagli senza overlay e ricodifica; rimozione della scelta CPU/GPU. | Fotogramma alla risoluzione originale in `playback.js`; primitive dei nomi in `export-model.js`. Rimosso il dialogo FFmpeg, relativo store e codice degli encoder. Il taglio intermedio via comando è sostituito dalla funzionalità finale del commit seguente. |
| `ffbe065` — direct video download | Download locale di gruppi completi di fotogrammi compressi, senza audio, con avanzamento; gestione del file locale e libreria MediaBunny. | `clip-export.js` usa il vendor originale fissato a 1.62.1, con licenza conservata. Import dinamico letterale gestito da Vite e precache offline. `clip-commands.js` e store React per avanzamento e stato occupato. File locale liberato quando si cambia sorgente o partita; test dei byte compressi, B-frame, durate, codec, audio assente, errori e download reale nel browser. |

## Risoluzione dei conflitti

I file classici eliminati dalla conversione restano eliminati. I loro cambiamenti
sono applicati ai moduli equivalenti, senza ricaricare un secondo runtime.
`index.html` conserva l'entrypoint React; markup e listener nuovi sono nei
componenti. Workflow Pages, bundle autonomo e generazione del precache restano
quelli della conversione.

La libreria MediaBunny vendorizzata è quella usata dal codice: non viene aggiunta
anche una seconda copia npm inutilizzata. Fixture MP4, licenza, manuale e
procedura di riparazione introdotti su main sono conservati. La funzione
`swapTeamsInMatch` non aveva chiamanti né controlli associati su main: resta
eliminata con il codice inutilizzato della conversione.

Il test dell'export HTML classico, che concatenava gli script globali, è sostituito
nel browser dall'export React reale: tutte le sottoschermate vengono aperte senza
rete. Gli altri test nuovi sono adattati ai moduli reali e alle viste React;
non viene ricreato un runtime classico per farli passare.

Durante l'integrazione è stata corretta anche l'interazione fra pulizia del flusso
parziale e annullamento: il servizio in attesa ripristinato dalla ricevuta viene
conservato mentre si cancellano le selezioni UI obsolete.


Il caso browser del passaggio set verifica il comportamento corretto di main:
annullare la preparazione rimuove la vittoria assegnata durante il passaggio e
ripristina il risultato precedente. La vecchia aspettativa React, che conservava
erroneamente quella vittoria, è stata aggiornata.

La visibilità dei comandi avversaria singola appartiene al pannello React:
rimossi i precedenti aggiornamenti imperativi dei figli, che potevano lasciare
punto/errore/freeball nascosti dopo il passaggio dalla modalità doppia.


## Verifica conclusiva

- **600 test unitari/integrati superati**, senza test saltati nell'ambiente locale.
- **42 scenari browser verificati sulla build finale**: esecuzione completa con
  due worker e ripetizione mirata del caso di digitazione/numeri dopo aver corretto
  la fixture per il limite nativo `maxlength` e l'ordinamento delle righe.
- Verificati percorso Pages, PWA offline, tutte le schede dell'export autonomo,
  download effettivo di MP4 e JPEG, export match desktop/mobile, focus e input,
  annullamento dopo riapertura e limiti superabili di 8 cambi e 2 tempi.
- Nessun ciclo nel grafo applicativo e nessun import relativo mancante. Nessun
  candidato nell'audit duplicazioni alle soglie documentate.
- Build Vite e `git diff --check` superati. La ricostruzione della sola
  documentazione conserva identici JS, CSS, chunk delle clip ed export autonomo
  rispetto agli asset verificati nel browser.
