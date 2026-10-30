# Refactoring React: piano e criteri di accettazione

## Obiettivo e vincoli

Ridurre codice applicativo e duplicazioni attraverso logica condivisa e componenti React riutilizzati, mantenendo comportamento, struttura dei dati e funzionalità. Il lavoro è accettato sulla base di misure riproducibili e regressioni, non del numero di file convertiti.

Restano 8 cambi e 2 timeout, definiti in `js/globals.js`, con superamento consentito. Restano import/export DataVolley, archivio e migrazioni dei dati, scout singolo/doppio, video locale/YouTube, touch e tastiera, stampa, export HTML autonomo e PWA offline. GitHub Pages continua a ricevere la build Vite dal workflow; il refactoring non pubblica o cambia la configurazione remota.

## Misurazione iniziale

Riferimento: `main` a `de8c85075c6ef296cb7310c89ece9f0c4ae00c7a`.

| Misura | main | Prima di questo refactoring | Differenza |
| --- | ---: | ---: | ---: |
| Righe fisiche | 56.191 | 61.979 | +5.788 |
| Righe non vuote | 55.441 | 59.428 | +3.987 |
| Byte sorgente | 2.077.680 | 2.231.620 | +153.940 |

Perimetro identico: `.js`, `.jsx`, `.mjs`, `.css`, `.html` in `js/`, `src/`, `styles/`, più `index.html`, `style.css` e il worker alla radice se presente. Sono inclusi i file nuovi non committati e vendor, esclusi test, documentazione, strumenti, dipendenze installate e build. Vendor è identico nei due alberi: 2.377 righe; escluderlo non cambia la differenza. La differenza di righe vuote è 1.801: ridurle non costituisce refactoring.

Comando riproducibile: `node scripts/audit-source.mjs main > /tmp/volleyeye-audit.json`. Il report contiene inventario completo, righe/byte per area, metriche AST, funzioni candidate inutilizzate e cicli di import. Le candidate richiedono controllo: un conteggio statico non dimostra da solo che si possa cancellare codice. Il conteggio AST comprende i riferimenti JSX.

## Analisi per area

| Area | Righe iniziali | Problema osservato | Intervento |
| --- | ---: | --- | --- |
| Componenti | 10.467 | JSX ripetuto nei controlli, pagine e gruppi di filtri; etichette statiche conservate come stringhe con spazi di HTML | Componenti per struttura e dati, con varianti esplicite; preservare ID, ordine, accessibilità e CSS |
| Analisi | 8.711 | Costruzione opzioni, pruning delle selezioni, reset e sincronizzazione copiati per attacco/battuta/alzata, globale/individuale/video | Schema comune dei filtri e funzioni pure per opzioni/selezioni; mantenere differenze di origine eventi e scope |
| Scout live | 7.403 | Rendering e aggiornamenti di dominio accoppiati; flussi per squadra ripetuti | Operazioni per scope; separare calcolo delle viste dagli effetti necessari |
| Squadre/archivio | 6.915 | Operazioni simili per nostra squadra/avversaria; entry point di editor precedenti ancora presenti | Operazioni comuni per scope e rimozione dei soli percorsi dimostrati irraggiungibili |
| Import/export | 3.887 | Helper PDF, CSV e DOM precedenti affiancati ai percorsi correnti | Eliminare codice senza chiamanti; mantenere codec e regole di round trip |
| Video | 2.602 | Stato di presentazione e gestione media mescolati; controlli di esistenza su import statici | Stato condiviso, effetti media isolati, mantenimento del gesto utente sincrono |
| App e bootstrap | 3.210 | Wrapper identici per ogni comando/evento, pubblicazione ampia delle viste, dipendenze circolari | Factory di comandi/eventi; in seguito aggiornamenti mirati e dipendenze orientate |
| Store | 687 | Sottoscrizione e snapshot duplicati in 13 store | Un solo store base, uno per viste indicizzate; regole specifiche dei draft mantenute |
| CSS | 10.909 | Contratto con DOM, responsive, temi e stampa; eliminazione a vista rischiosa | Inventario e deduplica solo a parità di selettore, contesto e ordine di cascata |
| Dominio puro | 709 | API già condivise, indipendenti dal browser | Estendere queste API quando elimina logica ripetuta; non aggiungere wrapper senza utilità |

La scansione iniziale delle dichiarazioni trova 1.758 funzioni e 485 riferimenti a `document`. I riferimenti DOM comprendono letture, canvas e media: non sono tutti eliminabili. Le candidate senza chiamanti/import sono 1.199 righe prima della revisione; non sono una stima di risparmio garantito.

## Sequenza di implementazione

### 1. Store e invocazione dei comandi

- Unificare subscribe/getSnapshot/publish; distinguere patch da sostituzione completa.
- Preservare freeze, unsubscribe, selezione atomica su più tabelle, isolamento dei draft e blocco dei campi identitari in modifica.
- Centralizzare una volta gli stessi wrapper di comandi e gli eventi consentiti solo dopo il bootstrap. Eseguire il comando immediatamente per conservare file picker e clipboard attivati dall'utente.
- Verifica: test store, modali, editor; suite completa e browser dopo integrazione.

### 2. Filtri condivisi

- Unificare definizione delle selezioni, pruning, reset e pubblicazione dei controlli.
- Consolidare i blocchi comuni di opzioni: set, valutazione, zona, tipo alzata, base, fase e ricezione.
- Preservare differenze: indici numerici rispetto a chiavi `scope:index`, opzioni attacco derivate anche da eventi senza traiettoria, gestione codici manuali video, ordine delle opzioni e confronto dei valori.
- Verifica: selezioni persistenti valide, rimozione selezioni non più disponibili, filtri su squadra/set/player, preset video e analisi individuali.

### 3. Percorsi obsoleti e controlli del caricamento classico

- Per ogni candidata, verificare import, riferimenti locali/JSX, API debug, test e chiamate dinamiche; cancellare soltanto dopo revisione.
- Eliminare controlli `typeof funzioneImportata === "function"` soltanto se l'export è una dichiarazione di funzione garantita dal grafo ES. Non toccare controlli su API browser opzionali, dati, callback o risorse inizializzate dopo mount.
- Eliminare rami fallback obsoleti insieme ai loro helper, senza disabilitare funzionalità attive.
- Verifica: avvio pulito, import dei vecchi archivi, undo/reset, export autonomo e unit test pertinenti.

### 4. Componenti e operazioni per scope

- Estrarre strutture ripetute con gli stessi ruoli: navigazione, coppie di controlli punteggio, gruppi toggle, gruppi filtri, modali e campi.
- Consolidare operazioni squadra/avversaria dove le differenze sono dati/configurazione, senza nascondere differenze funzionali in flag generici.
- Conservare elementi e ID utilizzati da CSS, test e operazioni geometriche; rimuovere scritture DOM quando lo stesso attributo può avere una sola fonte nello stato React.
- Verifica: confronti del markup di riferimento dove significativo e browser desktop/mobile con drag/touch/tastiera.

### 5. Stato, effetti e dipendenze

- Usare il report dei cicli per spostare i calcoli puri fuori dai servizi che pubblicano UI.
- Primo percorso concreto da interrompere: `js/globals.js` importa i publisher foto da `src/app/application.js`; `application.js` importa `actions.mjs`; i comandi importano nuovamente stato e servizi. Spostare la gestione foto nel suo feature module, mantenendo i limiti in `globals.js`, e farle pubblicare direttamente il proprio store. Poi separare i controller di match/impostazioni/formazioni da bootstrap e registro dei comandi.
- Secondo percorso: normalizzazione e costruzione opzioni in `analysis-filters.js` importano indirettamente i servizi che a loro volta le usano. Estrarre le funzioni pure; aggiornare gli import effettivi, senza aggiungere re-export che conservano il ciclo. Le fixture che estraggono sorgenti in VM devono dichiarare le dipendenze o diventare test dei moduli nativi.
- Portare lo spostamento dei widget React a uno stato di layout invece di modificare direttamente l'albero DOM.
- Rendere gli aggiornamenti delle viste mirati: un comando punteggio non deve ricostruire tutte le opzioni di impostazioni e archivio.
- Conservare canvas, gestione video e misure geometriche in effetti con cleanup esplicito. Affrontare questo lotto dopo aver consolidato le strutture condivise: modificarlo insieme al codec/archivio rende le regressioni meno individuabili.
- Verifica: resize, cleanup/remount, PWA, local video/YouTube e export offline senza dipendenze esterne.

### 6. CSS e verifica conclusiva

- Rimuovere regole duplicate o senza utilizzatori soltanto dopo controllo di selettori dinamici, stampa, tema e responsive.
- Eseguire `npm test`, `npm run build`, `npm run test:e2e`, `git diff --check` e audit finale.
- Documentare righe fisiche, non vuote, byte, componenti realmente condivisi, dimensione build e regressioni coperte. Non attribuire a React il risparmio delle righe vuote o della sola formattazione.

## Criteri per chiudere il lavoro

1. Codice applicativo complessivo inferiore a `main`, con riduzione anche delle righe non vuote e dei byte sorgente: non basta spostare o compattare.
2. Ogni struttura consolidata deve avere più utilizzatori reali, oppure sostituire una responsabilità prima duplicata.
3. Nessun runtime classico, adapter o copia parallela della logica; un unico grafo ES e rendering React.
4. Test funzionali, build e browser superati, inclusi export autonomo e limiti superabili.
5. Risultati e interventi rimanenti dichiarati; nessuna affermazione di ottimizzazione totale basata sulla sola conversione.

## Registro degli interventi

### Lotto verificato

- Store: 13 implementazioni consolidate; sottoscrizioni e notifiche ora esistono soltanto in `view-store.mjs`. Store indicizzati distinguono sostituzione di una tabella e patch di un dialogo. Notifiche inutili su snapshot identici evitate.
- Comandi: 193 azioni e 34 eventi usano le due factory in `commands.mjs`; invocazione immediata e pubblicazione dopo il completamento preservate.
- Filtri: 36 blocchi ripetuti consolidati in `filter-controls.js`; selezioni/reset in `src/domain/filter-selections.js`. Opzioni video conservano i propri formatter e le proprie regole di fase.
- Percorsi obsoleti: 88 funzioni eliminate dopo controllo dei riferimenti, con rimozione delle dipendenze diventate inutili. Include vecchi helper PDF/CSV e operazioni di editor sostituite dai comandi correnti.
- Import statici: 338 controlli/rami ridondanti rimossi soltanto per funzioni dichiarate ed esportate nel grafo ES, preservando i controlli su browser, dati e callback. Le fixture isolate ora dichiarano esplicitamente le dipendenze che prima omettevano; le relative asserzioni funzionali restano attive.
- Componenti: toolbar/campo condivisi in `ScoutTeamPanel`, navigazione comune in `NavigationLinks`, 16 dialoghi usano `ModalDialog`, gruppi di intestazioni e opzioni usano `HeaderCells` e `SelectOptions`. I modelli delle tabelle condividono la costruzione delle celle per fondamentale.
- CSS: eliminate 7 regole identiche già sovrascritte da copie successive, con stesso selettore, dichiarazioni, condizioni media/supports e ordine effettivo di caricamento. Nessuna rimozione basata soltanto su ricerca testuale di selettori.

| Misura | Prima | Dopo il lotto | Riduzione del lotto | Differenza residua da main |
| --- | ---: | ---: | ---: | ---: |
| Righe fisiche | 61.979 | 59.028 | 2.951 | +2.837 |
| Righe non vuote | 59.428 | 56.524 | 2.904 | +1.083 |
| Byte sorgente | 2.231.620 | 2.093.904 | 137.716 | +16.224 |

La riduzione non deriva dalla cancellazione di righe vuote: 2.904 delle 2.951 righe eliminate contenevano codice. Il conteggio include tutti i nuovi helper applicativi. L'audit continua a rilevare un componente ciclico di 84 moduli: il criterio sulle dipendenze non è ancora soddisfatto.

Verifiche concluse: 366 test unitari/integrati, 31 test browser, build Vite ed export autonomo, `git diff --check`. Sei test nuovi coprono contratti condivisi: gesto utente sincrono, completamento/errori dei comandi, eventi prima/dopo bootstrap, patch/sostituzione/immutabilità degli store e selezioni numeriche/per scope.

Build applicativa JS: da 1.074,58 kB a 1.029,58 kB; gzip da 292,44 kB a 287,89 kB. Sono misure della build, distinte dalle righe sorgente e dalle dimensioni dell'export autonomo.

### Secondo lotto

- **Filtri:** un registro dei campi copre sette gruppi (attacco, battuta, alzata, individuali e video). Lettura, pruning e rendering risolvono gli stessi campi dopo il mount. I flag di conversione delle selezioni e quelli di rendering sono distinti: gli indici/set sono numerici, le chiavi video `our:0`/`opponent:0` restano stringhe. Label e ordinamento di giocatrici/alzatrici condivisi tra analisi di attacco, battuta e alzata; origine e ordine degli eventi restano specifici.
- **Formazioni:** `useLineupInteractions`, `LineupSlot` e `LineupChip` sono utilizzati da modal formazione, preparazione set e formazione default. Il prossimo set condivide il trasferimento tra i due campi per rifiutare i drop tra squadre; l'editor default mantiene il proprio touchend. Click, navigazione dei numeri con Tab/Enter e selezione del libero conservano i comandi esistenti. L'evidenziazione drag è nello stato React della cella.
- **Strutture React:** sei pannelli usano `AnalysisFilterPanel`, quattro tabelle usano `AnalysisCountTable`; gruppi di pulsanti in quattro pagine condividono `ButtonList`. Il video usa anche `AnalysisFilterFields`, mantenendo ordine, ID ed etichette dei controlli.
- **Statistiche:** 65 definizioni di metriche/celle di confronto condividono i costruttori in `table-cells.js`. Conservati testo formattato, valore numerico, direzione del confronto e distinzione tra proprietà `raw` assente e `raw: null`.
- **Dipendenze:** stato, crop, puntatore e publisher foto sono in `players/photo-editor.js`, che pubblica direttamente il proprio store. `globals.js` non importa più applicazione o servizi delle feature. Dieci normalizzatori/costruttori puri sono in `analysis/values.js`; 16 moduli li importano direttamente, senza re-export da `analysis-filters.js`. Il componente ciclico principale scende da 84 a 83 moduli: l'accoppiamento tra controller e publisher resta da risolvere.

| Misura | Dopo il primo lotto | Dopo il secondo lotto | Riduzione del secondo lotto | Differenza residua da main |
| --- | ---: | ---: | ---: | ---: |
| Righe fisiche | 59.028 | 58.287 | 741 | +2.096 |
| Righe non vuote | 56.524 | 55.762 | 762 | +321 |
| Byte sorgente | 2.093.904 | 2.070.550 | 23.354 | −7.130 |

Dall'inizio del refactoring: −3.692 righe fisiche, −3.666 righe non vuote e −161.070 byte. I byte sorgente sono ora inferiori a main; entrambi i criteri sulle righe restano aperti. Il conteggio comprende tutti gli helper e i componenti nuovi. Non sono state rimosse righe vuote per raggiungere il risultato.

Verifiche: 367 test unitari/integrati; un caso nuovo esercita lo schema effettivo con pruning, pubblicazione e rilettura di set numerici e chiavi video. Due casi browser aggiunti verificano scambio di posizioni, ingresso dalla panchina, isolamento del draft, rifiuto del trasferimento tra squadre e touchend del default. Il caso drag parte da una partita attiva: la demo originale è conclusa e blocca il campo.

Verifica finale della stessa build: **367 test unitari/integrati e 33 test browser superati**, build Vite/export autonomo completati e `git diff --check` pulito. I test browser includono limiti superabili, PWA offline, export autonomo, foto e i due nuovi casi drag/touch.

Build JS applicativa del secondo lotto: 1.018,28 kB, gzip 286,08 kB; primo lotto 1.029,58 kB, gzip 287,89 kB. L'export autonomo continua a usare lo stesso entry React.

### Terzo lotto: interfaccia condivisa

La priorità è stata spostata sull'interfaccia su indicazione dell'utente. Il JSX presenta duplicazioni concrete; il conteggio per area non dimostra che costituisca la maggior parte della duplicazione dell'intero progetto.

- **Rotazioni:** `RotationControls` serve scout, preparazione del set ed editor della formazione default, con gli stessi ID, controlli, callback e componenti di comando specifici.
- **Filtri:** sette configurazioni di presentazione condividono campi, etichette e ordine tramite `analysis-filter-fields.js`. Le configurazioni sono state confrontate con le tuple precedenti prima della sostituzione. Le differenze tra video, battuta, alzata e analisi individuale restano esplicite.
- **Traiettorie:** `TrajectoryAnalysisPanel` sostituisce quattro strutture ripetute, per attacco/battuta e globale/individuale. Mantiene ordine di campo e filtri, riepilogo, ID e reset.
- **Tabelle:** anche i due confronti individuali usano `AnalysisCountTable`, ora condiviso da sei tabelle. La configurazione delle colonne della scheda giocatrice determina intestazioni, ordine dei fondamentali e classi di confronto.
- **Dialoghi:** formazione, inizio set e selezione del fondamentale condividono `ModalDialog`; il nuovo slot footer conserva la posizione dei comandi fuori dal corpo del dialogo. I due comandi di annullamento/chiusura del fondamentale mantengono il loro ordine.
- **Navigazione:** i nove pulsanti delle analisi condividono `ButtonList`, con ordine, classe attiva e attributi di destinazione preservati. I semplici gruppi di pulsanti dei dialoghi restano JSX diretto: convertirli in liste di configurazione aumentava il codice senza condividere una responsabilità utile.

| Misura | Dopo il secondo lotto | Dopo il terzo lotto | Riduzione del terzo lotto | Differenza residua da main |
| --- | ---: | ---: | ---: | ---: |
| Righe fisiche | 58.287 | 58.050 | 237 | +1.859 |
| Righe non vuote | 55.762 | 55.518 | 244 | +77 |
| Byte sorgente | 2.070.550 | 2.062.725 | 7.825 | −14.955 |

I componenti passano da 9.528 a 9.291 righe, includendo i tre nuovi moduli condivisi. Dall'inizio del refactoring: −3.929 righe fisiche, −3.910 righe non vuote e −168.895 byte. Le righe complessive restano superiori a main: il criterio quantitativo di chiusura non è soddisfatto. Nessuna cancellazione di righe vuote per alterare il confronto.

Verifiche finali sulla stessa build: **367 test unitari/integrati e 33 test browser superati**, build Vite con export autonomo e `git diff --check`. Build JS applicativa: 1.014,17 kB, gzip 286,10 kB; il gzip è superiore di 0,02 kB al secondo lotto, pur diminuendo il JavaScript non compresso. La prima esecuzione browser è stata invalidata dalla ricostruzione degli asset durante il test (404 del service worker); la suite completa è stata ripetuta senza modifiche alla build e ha superato tutti i 33 casi, incluso il portal del canvas.

### Quarto lotto: duplicazioni residue

- **Statistiche:** `SKILL_COLUMNS` determina ordine e intestazioni di squadra, scheda individuale e confronto. `statistic-model.js` costruisce gli stessi valori e testi per tabellino e snapshot delle giocatrici, mantenendo direzione del confronto e differenza tra percentuali grezze e formattate. I conteggi assenti sono normalizzati; i totali di freeball senza bucket conservano il fallback precedente.
- **Alzate/esiti:** `count-table-model.js` condivide raggruppamento per identità, conteggio delle valutazioni, celle e confronto tra righe e totali. Conservati chiavi numeriche, fallback dei nomi, ordinamento, classi e `raw: null` distinto da proprietà assente. Le regole di filtro degli eventi restano nei controller specifici.
- **Filtri:** opzioni set/codici/zone condivise tra cinque pannelli, tipi d'attacco tra due; l'elenco delle skill precedenti ha una factory unica che restituisce array nuovi, senza introdurre mutazioni condivise tra stato e fallback UI.
- **Interfaccia:** tema, iframe YouTube e relativo focus guard, tick dei grafici, legenda delle traiettorie, coppie di controlli punteggio e metadati dei quattro resize handle sono condivisi. Campi della tabella roster e selettore della metrica usano componenti comuni; le sezioni individuali attacco/battuta condividono la struttura. Nove file che avvolgevano soltanto un componente con `kind` fisso sono eliminati: il layout usa direttamente i componenti già condivisi, conservando i portal.
- **Roster/reset:** una sola riconciliazione dei roster e delle rinomine serve le due squadre; la squadra mantiene il divieto di rimozione durante la partita, l'avversaria conserva la propria regola. Le rinomine sono completate prima di costruire la nuova lista, come in precedenza. Default della formazione e rimozione delle sostituzioni dai campi condividono gli helper esistenti.
- **DataVolley:** dieci righe di export condividono il contesto letto al momento dell'emissione, dopo sostituzioni e rotazioni. Cinque mappe dei fondamentali derivano dalla stessa definizione; firma e codice esportato condividono la risoluzione del tipo, conservando i diversi fallback per skill sconosciute. Il prefill della traiettoria degli eventi condivide i campi dei due percorsi validi.
- **CSS:** 14 gruppi di regole adiacenti con dichiarazioni identiche sono consolidati. Stesso contesto root/media/supports, nessuna regola interposta spostata; selettori compatibili e specificità preservati. Gli output CSS minificati prima/dopo sono identici: il vantaggio riguarda la manutenzione dei sorgenti.

| Misura | Dopo il terzo lotto | Dopo il quarto lotto | Riduzione del quarto lotto | Differenza da main |
| --- | ---: | ---: | ---: | ---: |
| Righe fisiche | 58.050 | 57.175 | 875 | +984 |
| Righe non vuote | 55.518 | 54.621 | 897 | −820 |
| Byte sorgente | 2.062.725 | 2.037.036 | 25.689 | −40.644 |

Dall'inizio del refactoring: **−4.804 righe fisiche, −4.807 righe non vuote e −194.584 byte**. Il codice non vuoto e i byte sono ora inferiori a main. Le 984 righe fisiche in più si spiegano con 1.804 righe vuote in più e 820 righe non vuote in meno. La formattazione non è stata compressa per alterare questo confronto.

`npm run audit:duplicates` rende ripetibile la ricerca: identificatori normalizzati, nomi di proprietà preservati, stringhe mascherate nei template JSX e opzionalmente nei blocchi/finestre di istruzioni. Soglie esplicite di almeno 8 righe e 250 caratteri, finestre di 3–12 istruzioni; i candidati richiedono revisione semantica. La prima scansione trovava 24 gruppi candidati; dopo la revisione e le estrazioni, anche la scansione estesa non trova gruppi residui secondo questi criteri. Nessun gruppo CSS adiacente con dichiarazioni identiche resta nel report. Queste misure non dimostrano l'assenza di ogni possibile duplicazione semantica o di frammenti sotto soglia.

Verifiche concluse: **368 test unitari/integrati e 33 test browser superati**, build Vite/export autonomo e `git diff --check`. La pulizia conclusiva dei calcoli già sostituiti dalle celle condivise è stata verificata sulla build finale anche con i tre casi browser di filtri/preset, statistiche e analisi individuale. Il nuovo test dei modelli esegue il grafo nativo e verifica regole personalizzate per punti/efficienza, frazioni grezze e percentuali, bucket assenti e confronto con `raw: null`. Le fixture VM caricano le dipendenze estratte effettive; le asserzioni originali restano attive.

Gli accorpamenti CSS producono gli stessi asset minificati, verificati per hash: nessun asset è stato sostituito durante l'esecuzione browser. Le alzate non calcolano più totale e metriche inutilizzati prima di costruire le celle condivise; rimossa anche una condizione ridondante nel selettore di testo/valore del tabellino. JS applicativo: **1.003,70 kB, gzip 284,96 kB**, contro 1.014,17/286,10 kB del terzo lotto.

La deduplica non risolve ancora l'accoppiamento tra controller e publisher: i due modelli condivisi sono collegati ai servizi statistici e il componente ciclico passa da 83 a 85 moduli. Occorre separare i calcoli e la configurazione dai servizi di pubblicazione; non si considera chiusa l'ottimizzazione architetturale.

### Quinto lotto: separazione delle responsabilità

- Estratti calcoli, selettori, regole delle metriche, anagrafica, formazioni iniziali, filtri e modelli statistici dai servizi che aggiornano l’interfaccia. I modelli condivisi non importano più i controller per calcolare conteggi e metriche.
- `application.js` contiene avvio e API esterna; il registro dei comandi e la coordinazione delle viste hanno responsabilità separate. Le feature non importano il punto di composizione dell’applicazione.
- Lo stato locale è separato dai controller; i riferimenti DOM sono risolti dopo ogni montaggio senza memorizzare nodi rimossi o una precedente assenza del nodo.
- Serializzazione, repository e connessione IndexedDB sono separati da caricamento e navigazione. Le modifiche all’archivio emettono un evento di dominio, osservato dal coordinatore applicativo; il salvataggio non importa gli aggiornamenti UI dell’archivio.
- Il workspace usa disposizione nello store e host/portal posseduti da React. Il controller del puntatore modifica i dati della disposizione; l’effetto del componente colloca l’host stabile. Tastiera, focus, annullamento, ordine e persistenza hanno verifiche dedicate.
- La pubblicazione delle impostazioni conserva il modello precedente quando cambiano soltanto eventi o tempo video; la verifica include mutazioni annidate della configurazione e reset dello store.
- Lo smontaggio annulla il trascinamento attivo; il runtime può avviarsi nuovamente. Il completamento tardivo del bootstrap precedente non rende pronta una sessione smontata.
- Rimossi i rami alternativi del vecchio caricamento a script per assegnazione e rilascio del libero, prenotazione dei nomi e posizionamento automatico: queste operazioni usano la libreria di dominio già importata.
- Aggiunte verifiche dei confini tra dominio, feature e composizione applicativa; l’audit segnala anche gli import relativi mancanti, anziché ignorarli nel grafo.

Il componente ciclico principale scende da **85 a 73 moduli**. Stato, repository e calcoli estratti sono separati dai controller; restano cicli tra comandi e publisher delle analisi, del campo e del video. La riorganizzazione non equivale alla risoluzione completa di questi cicli.

Verifiche del lotto: **373 test unitari/integrati e 35 test browser superati**; build Vite sul percorso GitHub Pages, export analisi autonomo, controllo degli import relativi e scansione delle duplicazioni. Sulla build finale, successiva alla rimozione dei rami duplicati del campo, sono stati ripetuti con successo gli **8 casi browser** di rose, formazioni, trascinamento e layout; ripetuta anche la suite completa dei 373 test unitari/integrati. Nessun candidato residuo alla scansione secondo le soglie documentate; nessun import relativo mancante.

### Sesto lotto: modelli delle analisi indipendenti dai controller

- Il tabellino costruisce celle con descrittori `command`/`args` clonabili; il componente React invoca i comandi registrati. Nessuna callback del modello importa il controller che ricostruisce quel modello.
- `summary-model.js` restituisce la vista e il contesto statistico. La preparazione dei filtri, la pubblicazione e gli aggiornamenti degli altri pannelli appartengono a `aggregated-table.js`; la tabella non coordina altri renderer durante la costruzione delle righe.
- Serie, cache e geometria dei grafici sono separati da pubblicazione e cambio della metrica. I colori sono parametri del modello; la lettura del tema DOM resta nel relativo modulo e pulisce il nodo temporaneo anche quando fallisce.
- I conteggi per giocatrice e i modelli di andamento/play by play dipendono soltanto da dati e selettori; l’identità degli eventi è un’operazione di dominio condivisa. Selezione del punto e cambio set sono comandi separati dai publisher.
- Le due costruzioni identiche dei grafici della giocatrice e del confronto riusano `buildPlayerSkillChartModels`, conservando etichette, metrica, ambito e chiavi di cache.
- Nuove verifiche impongono dipendenze acicliche ai modelli estratti e vietano import di azioni UI. I test verificano anche che l’intestazione condivisa risolva la squadra al clic e che quella di squadra mantenga il proprio ambito.

Il componente ciclico principale scende da **73 a 67 moduli**. I modelli di tabellino, grafici, statistiche e timeline sono fuori dal componente; restano accoppiamenti tra controller e publisher di traiettorie, distribuzioni, scheda partita, campo e video.

Verifiche del sesto lotto: **376 test unitari/integrati e 35 test browser superati**. Dopo il consolidamento dei grafici individuali sono stati ripetuti con successo i **5 casi browser** di export autonomo, grafici, filtri/preset, statistiche e analisi giocatrice sulla build finale. Build Vite, controllo degli import e `git diff --check` superati. La scansione delle duplicazioni non trova candidati secondo le soglie documentate.

### Settimo lotto: distribuzioni, traiettorie e scheda partita

- Calcoli e filtri degli eventi delle distribuzioni sono separati dai controller, per squadra e giocatrice. Le celle della distribuzione sono costruite come dati; il publisher si occupa della relativa vista.
- La zona di un attacco senza posizione registrata usa un selettore del campo condiviso, senza importare gli aggiornamenti statistici e i controller del campo. Conservate distinzione tra le squadre, giocatrice sostituita dal libero, priorità della zona registrata e gestione della zona zero. Eliminato anche un fallback irraggiungibile nella clonazione del campo.
- Geometria delle traiettorie, selezione degli eventi, statistiche del servizio e dati individuali sono separati da canvas e coordinamento dei pannelli.
- La scheda partita usa un modello indipendente per eventi, rose, rotazioni, collegamenti attacco/difesa e geometria SVG. Filtri e note hanno comandi separati dal publisher.
- I publisher di distribuzioni, traiettorie e scheda partita non importano i controller che li invocano. Il coordinamento dei filtri appartiene ai controller; le primitive condivise dei filtri ricevono esplicitamente la callback della feature.
- Il canvas non richiama un controller per ridisegnarsi. Le immagini pendenti sono riutilizzate; uno stesso callback è registrato una sola volta e ciascun pannello in attesa riceve la notifica di caricamento.
- Le verifiche dei confini aciclici coprono anche i nuovi modelli, i tre publisher e le primitive dei filtri. Aggiunti casi per zone, confronti/DAMP, routing dei filtri e caricamenti concorrenti delle immagini.

Il componente ciclico principale scende da **67 a 61 moduli**. Nessun import relativo mancante; la scansione delle duplicazioni non trova candidati alle soglie documentate. Questi risultati non equivalgono alla rimozione di tutti i cicli applicativi.

Verifiche del settimo lotto: **380 test unitari/integrati e 35 test browser superati**, build Vite con export autonomo e percorso GitHub Pages, controllo dei confini aciclici, scansione delle duplicazioni e `git diff --check`. La suite browser è stata eseguita su asset stabili, senza ricostruzioni durante i test.

### Ottavo lotto: scheda giocatrice, preset, metriche e overlay

- La costruzione degli snapshot statistici e delle foto della giocatrice è separata dal publisher; i cambi delle preferenze sono comandi. Il controller prepara i filtri e coordina i pannelli dopo la pubblicazione.
- `PlayerAnalysisRegion` riusa lo stato della scheda per visibilità di selettore confronto, tabella, colonne, grafici e sezioni attacco/battuta/alzata. Rimossi i cambi di classe imperativi dai controller; il test DOM verifica aggiornamenti e identità dei pannelli montati.
- Snapshot, ripristino, conteggio e registro dei controlli video derivano dallo stesso schema dei filtri. Conservati ordine dei campi, identità delle giocatrici come stringhe, campi numerici e semantica del filtro del fondamentale precedente. I test coprono valori normalizzati, array indipendenti e chiavi sconosciute.
- I publisher di preset, multiscout e metriche sono separati dai relativi comandi. Il publisher multiscout riceve il callback di selezione dal controller; non importa quel controller. La sincronizzazione dei pulsanti dello scout dopo le metriche resta nel controller.
- Selezione e testo dell’overlay video sono un modello indipendente da playback/editor; azioni dei controlli video e pubblicazione della vista sono moduli distinti.
- I test dei confini verificano separatamente modelli senza dipendenze dai publisher e composizione aciclica dei publisher senza importare controller o comandi UI.

Il componente ciclico principale scende da **61 a 58 moduli**. Nessun import relativo mancante e nessun candidato alla scansione delle duplicazioni secondo le soglie documentate. Restano accoppiamenti tra i controller delle operazioni applicative: il lavoro strutturale complessivo resta aperto.

Verifiche dell’ottavo lotto: **383 test unitari/integrati e 35 test browser superati**, build Vite con export autonomo e percorso GitHub Pages, audit degli import e dei confini aciclici, scansione delle duplicazioni e `git diff --check`. Verificati anche visibilità React senza sostituzione dei pannelli, tipi degli snapshot video e selezione/testo degli overlay.

### Nono lotto: selezione, ordinamento ed editor delle tabelle video

- La selezione condivisa è separata da playback, editor e aggiornamenti delle viste. Conservate deduplicazione tra contesti, potatura delle chiavi, ancoraggio e priorità specifiche di overlay, inserimento, mobile e play by play. Overlay e inserimento riusano la stessa lettura.
- Accesso agli eventi, sincronizzazione dei collegamenti alle giocatrici, tempo base, ordinamento e tempi del play by play hanno moduli indipendenti dai controller. L’ordinamento conserva la sequenza originale e lo spareggio crescente per ID anche nell’ordine discendente.
- La tabella eventi usa un unico schema per intestazioni, valori, campi modificabili e azioni delle colonne. Le etichette di squadra e fondamentale sono condivise con l’ordinamento. La formattazione della fase appartiene al modello dei valori, senza dipendere dal controller dello scout live.
- `table-commands.js` coordina interazioni, pubblicazione e aggiornamenti; `table-model.js` produce dati senza callback UI e `edit-model.js` descrive controlli e modifiche senza importare i controller. Rimossa la precedente tabella monolitica, senza mantenerne esportazioni di compatibilità.
- Il riuso dei riferimenti alle righe usa un indice invece di cercare nuovamente ogni riga nell’elenco precedente. Conservata la prima corrispondenza in caso di chiavi duplicate.
- La zona mancante degli eventi video usa direttamente il selettore del campo, senza attraversare gli aggiornamenti statistici. Conservati momenti di salvataggio e aggiornamento.
- Le nuove verifiche coprono i confini aciclici, le priorità delle selezioni, ordinamento senza modifica della cronologia, allineamento intestazioni/celle e undo acquisito una sola volta prima delle modifiche.

Il componente ciclico principale scende da **58 a 57 moduli**. Nessun import relativo mancante; nessun candidato alla scansione delle duplicazioni alle soglie documentate. I controller di playback, editing e aggiornamento delle viste rimangono coordinati; i modelli estratti non dipendono da essi.

Verifiche del nono lotto: **387 test unitari/integrati e 35 test browser superati**, build Vite con percorso GitHub Pages ed export autonomo, audit degli import e dei confini aciclici, scansione delle duplicazioni e `git diff --check`. Verificati selezione/modifica singola e multipla, undo, correzione del punteggio, video locale/YouTube, navigazione mobile, sincronizzazione, filtri e limiti superabili. La suite browser è stata eseguita sulla stessa build stabile per tutta la durata.

### Decimo lotto: stato del campo, rotazioni e libero

- Formazione base, cache, fase, disposizione per ruolo e zona della giocatrice sono separate da salvataggi, playback e aggiornamenti delle viste. Le dipendenze del nuovo `court-state-model.js` sono acicliche e non includono controller UI.
- Cache e ripristino usano funzioni condivise con ambito esplicito. Aggiornati i chiamanti di caricamento, reset, modifica squadra e posizionamento; eliminate le vecchie varianti dedicate all’avversaria.
- Le due rotazioni riusano lo spostamento degli slot e il ripristino della titolare sostituita dal libero quando entra in prima linea. Conservati direzione predefinita, comportamento dei contatori, cache e isolamento delle squadre.
- Preparazione della disposizione automatica e validazione sono operazioni sullo stato; salvataggio, pubblicazione, avvisi e animazioni restano nei controller, nell’ordine precedente.
- Rimossi `renderLineupChips`, già vuota, e `syncCurrentSetUI`, che leggeva un nodo senza aggiornarlo, insieme ai relativi richiami. La panchina del libero non viene più ricostruita e pubblicata due volte per uno stesso aggiornamento.
- Otto nuovi test coprono rotazioni, cache indipendenti, rientro del libero, validazione, eccezione del giocatore al servizio, preferenze separate e riuso della disposizione per fase/rotazione. Le verifiche dei confini coprono anche il nuovo modello; le interazioni della panchina verificano una sola pubblicazione.

Il componente ciclico principale resta di **57 moduli**: sono state rimosse dipendenze dai controller per le operazioni sullo stato, ma i controller delle viste restano collegati tra loro. Nessun import relativo mancante e nessun candidato alla scansione delle duplicazioni alle soglie documentate.

Verifiche del decimo lotto: **395 test unitari/integrati e 35 test browser superati**, build Vite con percorso GitHub Pages ed export autonomo, confini aciclici dei modelli, import, scansione delle duplicazioni e `git diff --check`. La suite browser copre anche rotazione, libero, impostazioni indipendenti delle squadre, sostituzioni, annullamento e persistenza; eseguita su una build stabile per tutta la durata.

### Undicesimo lotto: dati delle schede del campo e coordinamento dei controlli

- Schede e panchina hanno un modello indipendente dai comandi UI. Nomi, numeri, capitani, ruoli, foto, indici del campo e rientri conservano l’ambito della squadra; i dati delle schede sono clonabili e non contengono callback.
- Lettura delle modalità punto/errore ed elenco delle riserve sono in `pick-model.js`. Previsione del fondamentale e selettori dei metadati dell’attacco sono in `flow-model.js`; non attraversano i controller di layout o rendering.
- Il publisher del campo e della panchina si limita agli store. `court-commands.js` coordina animazione, dati, azioni e controlli; la preparazione dei controlli dei fondamentali è in `skill-controls.js`, senza mantenere il vecchio modulo dal nome di modello.
- Conservata la sequenza cattura delle posizioni → preparazione dei dati → singola scheda e relativi controlli → panchina → pubblicazione. Una transizione sincrona del controllo precedente resta visibile durante la costruzione della scheda successiva. Il campo nascosto pubblica lo stato senza avviare la preparazione.
- I test verificano dati senza callback, giocatrici omonime nelle due squadre, numeri/capitani, libero e rientro, riserve della modalità errore, ordine delle transizioni e orientamento letto dopo la preparazione dei controlli. I confini aciclici includono i nuovi modelli e il publisher.
- Aggiunto un controllo conservativo delle chiamate alle funzioni esportate del progetto: devono avere un import o una dichiarazione locale. Copre gli import dimenticati durante gli spostamenti, che i contesti globali delle fixture possono nascondere; la suite browser resta la verifica del grafo reale.
- Aggiornati i test che isolavano codice mediante delimitatori di funzioni spostate: l’estrazione AST conserva le stesse verifiche di layout e ResizeObserver senza dipendere dall’ordine dei file.

Il componente ciclico principale resta di **57 moduli**. I modelli delle schede e delle selezioni e il publisher sono aciclici e non importano i controller delle operazioni dello scout. Nessun import relativo mancante e nessun candidato alla scansione delle duplicazioni alle soglie documentate.

Verifiche dell’undicesimo lotto: **399 test unitari/integrati e 35 test browser superati**, build Vite con percorso GitHub Pages ed export autonomo, controllo delle chiamate alle funzioni esportate, confini aciclici, audit degli import, scansione delle duplicazioni e `git diff --check`. Verificati anche punti/errori, fondamentali sulle due squadre, rientri del libero, animazioni e trascinamenti. La suite browser è stata eseguita sulla stessa build stabile per tutta la durata.

### Dodicesimo lotto: descrittori e comandi dei fondamentali

- Campo e dialogo dei fondamentali condividono gruppi, pulsanti, tipi di battuta e ordine dei codici, costruiti da un modello indipendente dai controller. Le viste dei controlli contengono descrittori `command`/`args` clonabili, senza callback o nodi DOM; il contesto immutabile della giocatrice è condiviso tra i pulsanti.
- `skill-actions.js` centralizza valutazioni, selezioni, annullamento, muro e attacco. React invoca il registro dei comandi tramite gli eventi pronti, conservando esecuzione immediata, target del gesto e gestione degli errori.
- Registrazione normale, dialogo ed errore di battuta limitato condividono la gestione del risultato, mantenendo diverse le pulizie dei metadati e la conclusione dell’azione: aggiornamento della selezione sul campo o chiusura del dialogo. Una registrazione fallita o rifiutata conserva la selezione in corso.
- Tastiera e pulsanti del servizio usano lo stesso comando. Scelta esplicita del tipo, attacco senza tipo e attacco accodato riusano l’avvio dell’attacco. Il Damp automatico resta distinto perché consuma il tipo prima dell’apertura e marca i metadati prima del callback di rendering; l’attacco accodato esplicito esegue questi aggiornamenti dopo l’attesa.
- La preparazione sincrona delle selezioni resta in `skill-controls.js`, nella sequenza già verificata per ciascuna scheda. Nessun salvataggio, renderer o registrazione eventi è importato dal nuovo modello dei controlli.
- Gli scenari esistenti verificano anche la clonabilità dell’intera vista. Sedici nuovi test coprono completamento asincrono, successo/rifiuto/eccezione, target DOM, metadati letti al clic, pulizia specifica del fondamentale, battuta limitata, avvio accodato, Damp, conferma del muro per squadra, dispatch immediato, chiusura del dialogo e aggiornamento dei suoi codici. Un nuovo caso browser esegue nel dialogo scelta del tipo e registrazione sia della battuta sia dell’attacco.

Il nuovo modello dei controlli è aciclico e privo di dipendenze dai controller UI. Rimane un componente ciclico di **58 moduli** tra i controller, che include il nuovo modulo delle azioni; la separazione dei dati non chiude ancora il lavoro sui relativi accoppiamenti. Nessun import relativo mancante e nessun candidato alla scansione delle duplicazioni alle soglie documentate.

Verifiche del dodicesimo lotto: **415 test unitari/integrati e 36 test browser superati**, build Vite con export autonomo e percorso GitHub Pages, controllo delle chiamate e degli import, confini aciclici dei modelli, scansione delle duplicazioni e `git diff --check`. La suite browser verifica anche i due utilizzatori del componente condiviso, campo e dialogo, compresi tipo di battuta, tipo d’attacco, registrazione e chiusura. La build è rimasta stabile durante l’intera esecuzione.

### Tredicesimo lotto: reset delle analisi e invalidazione delle cache

- Reset del match e invalidazione non appartengono più al controller dei filtri. Caricamento delle partite, gestione squadre ed editor eventi importano direttamente moduli aciclici senza renderer, DOM o persistenza; rimossi i vecchi export senza introdurre adattatori.
- Cache dei grafici, cache degli eventi e invalidazione completa hanno operazioni condivise con responsabilità distinte. Il ricalcolo delle statistiche riusa la stessa invalidazione degli eventi, mantenendo invariati i riferimenti della cache statistica e del relativo ambito. Ogni operazione avanza una sola volta le revisioni e il token che rende obsolete le elaborazioni dei grafici in corso.
- Il reset del match riusa `clearFilterSelections`, già usato dai reset individuali. Conservati identità dei Set, reset del fondamentale precedente, preset video e vista aggregata, ordine di ripristino della squadra predefinita e invalidazione. Nessuna modifica agli eventi o alle partite aggiuntive selezionate.
- Sei nuovi test sui moduli reali coprono invalidazione selettiva, token e pausa dei grafici, tutte le famiglie di filtri, riferimenti conservati e squadra predefinita con due squadre, una squadra o sola rosa ospite. I nuovi moduli sono inclusi nella verifica dei confini aciclici.

Il componente ciclico principale scende da **58 a 57 moduli**. Nessun import relativo mancante e nessun candidato alla scansione delle duplicazioni alle soglie documentate. Il coordinamento fra i controller dei filtri e delle viste resta aperto.

Verifiche del tredicesimo lotto: **421 test unitari/integrati e 36 test browser superati**, build Vite con percorso GitHub Pages ed export autonomo, import, confini aciclici, scansione delle duplicazioni e `git diff --check`. Dopo la sistemazione finale del reset sono passati nuovamente i 18 test mirati di reset e struttura. La suite browser ha usato la stessa build stabile e copre caricamento, annullamento/modifica eventi, filtri, preset, multiscout, statistiche e limiti superabili.

### Quattordicesimo lotto: preparazione sincrona e presentazione condivisa dello scout

- `skill-preparation.js` coordina selezioni e transizioni e restituisce una descrizione clonabile del controllo da mostrare. Non costruisce gruppi, classi CSS, pulsanti o descrittori dei gesti; questi appartengono al modello di presentazione.
- `buildPreparedScoutSkillView` costruisce i controlli dalla descrizione senza leggere lo stato del match, il DOM o avviare operazioni. Ricostruire la vista non registra nuovi listener, non consuma tipi accodati e non avanza il flusso. Il coordinatore del campo esegue preparazione e costruzione consecutivamente per ogni scheda, mantenendo le transizioni visibili alla scheda successiva. Rimosso il precedente modulo `skill-controls.js`, senza conservare un wrapper.
- Il dialogo dei fondamentali usa lo stesso costruttore del campo per tipi di battuta, tipi d’attacco e codici di valutazione. Eliminate le costruzioni duplicate dei pulsanti; mantenute classi dei gruppi, intestazioni, contesto del dialogo, callback tastiera e momento delle pubblicazioni. Il nome usato come dato visivo resta distinto dal nome passato alla registrazione quando manca il nome esplicito.
- Conservate le uscite anticipate, pulizia delle selezioni incompatibili, trasferimento dei metadati alla battuta pendente, conferma del muro e avvio Damp automatico. La presentazione non rinvia queste operazioni agli effetti React.
- Sei nuovi test verificano tutte le varianti di presentazione sul campo e nel dialogo con uno stato del match che rifiuta ogni lettura, input congelati, ripetibilità e clonabilità; verificano inoltre battuta pendente prima della pianificazione, listener registrato una sola volta, consumo del Damp prima dell’avvio e differenza tra nome visivo e nome di registrazione. Rimangono i 28 scenari di confronto del campo e le verifiche dell’ordine tra schede.

Il componente ciclico principale resta di **57 moduli**: la costruzione delle viste è indipendente dalle transizioni, mentre i controller della preparazione e delle azioni restano collegati. Nessun import relativo mancante e nessun candidato alla scansione delle duplicazioni alle soglie documentate.

Verifiche del quattordicesimo lotto: **427 test unitari/integrati e 36 test browser superati**, build Vite con percorso GitHub Pages ed export autonomo, verifica delle chiamate e degli import, confini aciclici, scansione delle duplicazioni e `git diff --check`. La suite browser ha usato la stessa build stabile per tutta la durata e verifica sia il campo sia il dialogo dei fondamentali, inclusi tipi di battuta e attacco, scorciatoie, registrazione e chiusura.

### Interventi strutturali ancora aperti

1. Ridurre gli accoppiamenti tra i controller della preparazione sincrona e delle azioni dello scout, mantenendo i confini verificati fra transizioni, descrizioni dei controlli e costruzione delle viste.
2. Ridurre il coordinamento incrociato ancora presente nei controller dei filtri e nelle operazioni di caricamento/reset; mantenere i confini aciclici già verificati.

Le misure di righe e byte restano dati di confronto. La chiusura di questo lavoro dipende da responsabilità, riuso, comportamento verificato e rimozione degli accoppiamenti, non dalla cancellazione di righe vuote.
