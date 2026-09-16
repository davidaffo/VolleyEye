# Manuale · VolleyEye

## Cos'è e cosa fa

VolleyEye è un'applicazione gratuita e open source per la rilevazione statistica delle partite di pallavolo. L'obiettivo è offrire le stesse funzionalità dei software professionali del settore, cercando di avvicinarsi il più possibile ai loro standard e formati.

Supporta la rilevazione sia in diretta che da video, utilizzabile tramite interfaccia grafica o tramite i codici standard inseriti da tastiera. I dati raccolti possono essere analizzati attraverso un'interfaccia dedicata, con supporto anche per i formati standard di altri programmi. È inoltre disponibile la funzionalità di sincronizzazione e analisi video.

L'applicazione è una PWA (Progressive Web App): funziona direttamente nel browser ed è ottimizzata per desktop, smartphone e tablet. Nonostante si basi su tecnologie web, opera completamente offline e tutti i dati vengono salvati esclusivamente sul dispositivo dell'utente, senza alcun server esterno.

---

## Match e squadre

### Gestione match

La prima schermata che si presenta è l'interfaccia di impostazione partita. Da qui puoi creare una nuova partita oppure modificare quella corrente.

Cliccando su **Gestione Match** si apre l'interfaccia delle partite. Al centro sono elencate tutte le partite già scoutizzate: cliccando su una e premendo *Carica Match* la si carica. In alternativa si crea una nuova partita premendo *Nuovo Match*.

Da questa schermata puoi modificare tutte le informazioni di base: avversario, categoria, data, amichevole e così via. Il nome dell'avversario è modificabile solo in modalità singola squadra; in modalità doppia squadra non è modificabile.

Altre operazioni disponibili:

- **Elimina match** — elimina la partita selezionata
- **Esporta / importa match da file** — permette l'importazione e l'esportazione delle partite tramite file
- **Esporta l'intero database** — esporta tutti i dati dell'applicazione in un singolo file
- **Reset match** — riporta a zero tutte le statistiche del match corrente, cancellando qualunque dato preso

> Nel programma trovi una squadra di test che puoi utilizzare liberamente per fare pratica con il programma.

### Selezione delle squadre

Dalla schermata di impostazione puoi selezionare le squadre tramite menu a tendina. Ci sono due modalità:

- **Modalità doppia squadra** (default): si scoutizzano contemporaneamente entrambe le squadre
- **Modalità singola squadra**: si scoutizza solo la propria squadra, togliendo la spunta da squadra avversaria.

Con il tasto **Gestione squadre**, puoi visualizzare e modificare tutte le squadre create, oltre a poterne creare di nuove. Hai anche opzioni per l'importazione e l'esportazione tramite file.

### Modifica di una squadra
Premendo il tasto **Gestione squadra**, puoi aprire la finestra di modifica squadra.
Da questa finestra puoi modificare il nome della squadra e le informazioni secondarie. Per le giocatrici hai due opzioni: modificarle a mano una per una oppure aggiungerle da un elenco.
Per ogni giocatrice puoi anche caricare una **foto**: prima del salvataggio puoi ritagliarla e zoomarla, così il programma conserva solo una versione compressa e già adattata alla card. Se presente, viene usata come sfondo della card in campo senza cambiarne dimensioni o impaginazione. La stessa foto è modificabile anche dall'**Archivio giocatrici**.

Puoi anche importare la rosa dal **CAMP3**, cioè il modulo gara con le giocatrici convocate e i numeri di maglia. Premi **Importa CAMP3** e seleziona un PDF, un file di testo oppure una foto del modulo. Il PDF originale viene letto direttamente; nel caso di una foto il programma prova a riconoscere il testo, quindi il risultato dipende dalla qualità dell'immagine.

Dopo la lettura si apre una finestra di controllo sopra la gestione squadra. Prima di confermare puoi:

- Vedere quali giocatrici verrebbero aggiunte, aggiornate o lasciate invariate
- Correggere numero, cognome, nome, libero e capitana
- Scartare una giocatrice riconosciuta male con il tasto **x**
- Evitare che una giocatrice venga messa fuori rosa, sempre con il tasto **x**

Quando confermi, il programma aggiorna la tabella squadra: se una giocatrice esiste già aggiorna i dati letti, se non esiste la aggiunge, se è presente in squadra ma non nel CAMP3 la mette fuori rosa. Se stai creando una nuova squadra, le giocatrici predefinite vengono rimosse e sostituite da quelle riconosciute. Le modifiche diventano definitive solo quando premi **Salva** nella finestra di gestione squadra.

Sul lato destro c'è la **formazione di default**: la rotazione con cui la squadra viene schierata all'inizio di ogni partita. Puoi trascinare le giocatrici nelle posizioni che vuoi. Il menu a tendina serve per scegliere chi è il palleggiatore: il programma assegna automaticamente i ruoli a tutte le altre giocatrici in base alla sua posizione, seguendo l'ordine classico (palleggio → 1° schiacciatore → 2° centrale → opposto → 2° schiacciatore → 1° centrale). Per ruotare la squadra usa i tasti appositi, che spostano effettivamente il palleggiatore. Una volta finite le modifiche, premi **Salva**.

### Impostazioni scout

Dalla schermata di impostazione puoi configurare le regole e le modalità di scouting separatamente per le due squadre:

- Attivare o disattivare i fondamentali da rilevare
- Scegliere i codici da utilizzare per ogni fondamentale
- Decidere cosa consideri positivo, neutro o negativo per il calcolo delle efficienze
- Decidere cosa dà punto alla tua squadra, cosa dà punto all'avversaria e cosa non dà punto
- Ripristinare in qualsiasi momento tutte le valutazioni di default

Non ci sono limiti alla personalizzazione delle impostazioni, tuttavia alcune modifiche potrebbero interferire con i comportamenti automatici del programma.

---

## Scout live

### Preparazione del set

Quando tutto è pronto puoi spostarti alla schermata Scout Live. La prima cosa che si presenta è la preparazione del set: le due formazioni sono già preimpostate con le rotazioni di default che hai configurato nella gestione squadra.

Da qui puoi modificarle come vuoi, seguendo le stesse regole già viste: ruotare la squadra con i tasti appositi senza modificare i ruoli, oppure sovrascrivere i ruoli cambiando la posizione del palleggiatore. C'è anche un tasto per ripristinare la formazione di default.

Puoi scegliere chi parte nel campo vicino e chi ha la prima battuta, poi premi **Avvia Set**.

### La schermata di rilevazione

La schermata è divisa in tre blocchi:

- **Sinistra**: impostazioni delle due squadre, set corrente, punteggi, tasto per passare al set successivo e tasto pausa/termina.
- **Centro**: il campo di gioco dove si può fare la rilevazione tramite interfaccia grafica.
- **Destra**: le traiettorie di battuta della giocatrice in servizio, il log degli eventi e il tasto per annullare l'ultimo evento. È anche presente la schermata di inserimento dei codici da tastiera, se si preferisce lavorare con quelli. Entrambe le funzionalità sono sempre disponibili e intercambiabili senza alcuna impostazione aggiuntiva.

Il punteggio si aggiorna automaticamente in base ai fondamentali inseriti. I tasti manuali di punteggio servono solo per correggere eventuali discrepanze se sei rimasto indietro.

Il campo è diviso in: campo lontano in alto (squadra avversaria, riquadro rosso), rete con comandi per entrambe le squadre, e campo vicino in basso (la tua squadra, riquadro blu). Sopra e sotto ogni squadra c'è la **barra di controllo**, da cui puoi:

- Controllare manualmente la rotazione e la posizione del palleggiatore
- Dare punto, errore o freeball per casi speciali non coperti da una valutazione
- Gestire i liberi — trascinandoli in campo oppure con la sostituzione automatica sul ruolo del centrale
- Cambiare il libero in campo
- Forzare un determinato fondamentale in modalità flusso automatico
- Chiamare i timeout

### Opzioni generali

Nella schermata di rilevazione ci sono alcune impostazioni globali:

- **Rotazione automatica**: i giocatori ruotano automaticamente sul cambio palla
- **Scambio posizioni per ruolo**: il programma posiziona i giocatori in base al ruolo, non solo alla posizione fisica — ad esempio i martelli in posto 4, l'opposto in posto 2
- **Flusso di gioco automatico**: il programma predice automaticamente il prossimo fondamentale seguendo il flusso del rally (modalità consigliata)
- **Scout da video**: apre il video da cui prendere lo scout
- **Cambia campo**: inverte la posizione delle due squadre

Alcune impostazioni si possono configurare separatamente per le due squadre:

- **P1 americana**: l'opposto attacca in posto 2 anziché in posto 4 sulla P1
- Rilevazione della **traiettoria degli attacchi**
- Rilevazione del **tipo di alzata**
- Rilevazione delle **traiettorie di battuta**
- Visualizzazione delle **traiettorie del battitore** corrente nella colonna destra

### Inserimento in modalità flusso automatico

Nella modalità automatica, il programma predice automaticamente quale sia il prossimo fondamentale da valutare in base all'esito del precedente. Ad esempio dopo una ricezione che non sia slash o generi errore, viene chiamata l'alzata se inclusa nelle valutazioni o l'attacco.

Il flusso si adatta all'esito di ogni azione.

Soltanto alcuni eventi richiedono intervento manuale, ad esempio se dopo un appoggio per qualche motivo si genera una freeball. In quel caso esiste il tasto freeball, per far passare il flusso freeball ad una delle due squadre. La stessa cosa vale anche per gli errori che non sono contemplati dalle valutazioni dei fondamentali.

### Significato delle valutazioni

VolleyEye usa i sei codici di valutazione `#`, `+`, `!`, `-`, `/` e `=`. Il significato di ogni categoria è diverso a seconda del fondamentale considerato. Le impostazioni scout permettono di scegliere quali codici mostrare e quali considerare positivi, negativi o capaci di assegnare un punto; le descrizioni seguenti sono quelle del manuale di riferimento.

| Fondamentale | `#` | `+` | `!` | `-` | `/` | `=` |
| --- | --- | --- | --- | --- | --- | --- |
| **Battuta** | Battuta che porta un punto diretto. | Battuta che limita anche una sola delle tre soluzioni d'attacco. Battuta che costringe gli avversari ad attaccare su palla alta oppure che costringe il palleggiatore avversario a palleggiare ad una mano o che permette il primo tempo solo per un'azione notevole del palleggiatore (es. palleggio in ginocchio o fuori dai tre metri). | Battuta con ricezione `!` quindi è una battuta positiva. | Battuta che viene ricevuta con precisione dagli avversari (es. se la ricezione arriva in posto quattro ed il palleggiatore è costretto a trasformare la veloce in veloce dietro viene inserita qui). | Battuta con ricezione che viene direttamente nel campo di chi ha servito anche dopo tre tocchi senza attacco. | Battuta che termina fuori o nella rete. |
| **Ricezione / Freeball** | Ricezione che permette tutte le soluzioni di veloce e relative sovrapposizioni. | Ricezione che pur non essendo perfetta consente al palleggiatore di giocare tutte e quattro le soluzioni. Ricezione in posto 4 che obbliga al cambio di veloce o ricezione in posto 2 che ancora permette la veloce. | Ricezione negativa tra i due metri e mezzo ed i tre metri circa da rete o molto spostata verso due e quattro mai vicina a rete, in cui è ancora possibile servire un primo tempo forzato oppure una palla spinta. | Ricezione che costringe il palleggiatore ad alzare palla alta, oppure lo costringe ad una alzata ad una mano facile da servire al centrale ma non servibile in banda. Ricezione fuori dai tre metri. | Ricezione che va direttamente nell'altro campo. Ricezione che non permette di attaccare e genera una freeball. | Ricezione che causa un punto diretto per gli avversari. |
| **Alzata** | Alzata che consente l'attacco. | Non contemplato. Conduce ad un attacco. | Non contemplato. Conduce ad un attacco. | Alzata imprecisa. | Alzata nel campo avversario. | Alzata che causa un punto diretto per gli avversari. |
| **Attacco** | Attacco concluso a punto. | Attacco che va nel campo avversario e che consente alla squadra che ha attaccato di rigiocare la palla per un altro attacco (difesa avversaria nel proprio campo) o che viene rimandato nel proprio campo in modo facile da rigiocare. | Attacco giocato sul muro per permettere di rigiocare con un'altra azione di attacco. | Attacco difeso e rigiocato dagli avversari. Attacco murato con copertura che torna nel campo dell'avversario. | Attacco che gli avversari murano. | Attacco che termina fuori, in rete o in cui lo schiacciatore fa invasione. |
| **Muro** | Muro con palla che finisce a terra nel campo avversario o comunque non permette il controllo della palla agli avversari. | Muro che toccando la palla consente una rigiocata della squadra in difesa (anche se la copertura avversaria rimanda il pallone) o comunque rende giocabile la palla anche se poi non viene effettivamente difesa. | Non contemplato. Conduce ad una difesa della squadra a muro. | Muro che viene nel proprio campo ma che non favorisce la difesa (tiene comunque la palla in gioco ma concedendo il primo attacco agli avversari). Muro che rimanda la palla nell'altro campo con copertura avversaria che consente agli altri di attaccare di nuovo. | Invasione a muro. | Muro che tocca la palla rendendola imprendibile. |
| **Difesa** | Difesa su palla difficile che consente alla squadra di contrattaccare. | Difesa su palla facile che consente alla squadra di contrattaccare. | Copertura a buon fine. | Difesa con palla che ritorna nel campo degli avversari dopo più tocchi senza che la squadra in difesa possa contrattaccare in qualche modo (anche le coperture che tornano nell'altro campo vanno inserite qui). | Difesa con palla che ritorna nel campo degli avversari. | Difesa non tenuta. |

I significati non formano una scala generica valida per tutte le skill: ogni simbolo deve essere letto nella riga del fondamentale corrispondente.

### Inferenze automatiche in modalità doppia squadra

Quando sono attive la doppia squadra e il flusso automatico, VolleyEye evita di chiedere due volte la valutazione della stessa azione vista dai due lati della rete. Registra entrambi gli eventi collegati, ma ricava automaticamente uno dei due voti:

- **Battuta dalla ricezione avversaria**: dopo aver scelto battitore, tipo ed eventuale traiettoria, si valuta la ricezione avversaria. Il voto della battuta viene inferito così: ricezione `#` o `+` → battuta `-`; ricezione `!` → battuta `!`; ricezione `-` → battuta `+`; ricezione `/` → battuta `/`; ricezione `=` → battuta `#`.
- **Attacco dal muro avversario**: durante la valutazione dell'attacco, `/` è inizialmente un segnale provvisorio che apre direttamente il muro avversario. Il voto dell'attacco viene poi inferito così: muro `#` → attacco `/`; muro `+` → attacco `-`; muro `-` → attacco `+`; muro `=` → attacco `#`. Il muro `!` non è contemplato e non viene mostrato. Con muro `/` l'invasione è già l'evento terminale che assegna il punto agli avversari, quindi il voto provvisorio dell'attacco viene rimosso per non conteggiare due volte lo stesso punto.

Gli eventi inferiti sono collegati nel log e nelle analisi, ma un eventuale punto viene conteggiato una sola volta. Se il fondamentale da aprire automaticamente è disabilitato nelle impostazioni della relativa squadra, il flusso passa al successivo fondamentale disponibile.

### Inserimento in modalità manuale

Se disattivi il flusso automatico, per ogni giocatrice scegli tu il fondamentale da valutare. Il programma ti chiederà comunque tipo di alzata, traiettoria e valutazione prima di chiudere l'evento. Questa modalità è più lenta ed è generalmente sconsigliata.

### Inserimento da codice DataVolley

Nella colonna del log è disponibile anche l'inserimento tramite **codice DataVolley**. Puoi scrivere uno o più codici nella barra dedicata e premere **Applica** o invio per trasformarli in eventi dello scout.

Questa modalità è pensata per chi conosce già la sintassi dei codici scouting e vuole lavorare più velocemente da tastiera. Il programma mostra l'ultimo codice riconosciuto e permette di aprire il manuale dei codici direttamente dal tasto di aiuto accanto al campo di inserimento.

L'inserimento da codice e quello tramite interfaccia grafica possono essere alternati durante la stessa partita. Se un codice non è supportato o non è interpretabile nel contesto corrente, il programma lo segnala senza applicarlo.

### Traiettoria degli attacchi

Il programma supporta due modalità:

- **Direzione semplificata** (default): il punto di partenza viene inferito automaticamente in base alla posizione del giocatore in campo; devi cliccare solo il punto di arrivo. Puoi anche modificare con dei tasti appositi il punto rete di partenza.
- **Modalità manuale**: clicca e tieni premuto sul punto di partenza, poi trascina fino al punto di arrivo. Non è necessario cliccare precisamente sulla rete, in quanto il programma fa comunque partire la traiettoria dalla rete.

Puoi anche scegliere di non inserire la traiettoria premendo ESC o cliccando sulla X: il programma registra comunque la valutazione. Questo è utile quando l'attaccante attacca in rete o viene murato.

### Gestione del muro

In modalità automatica e con doppia squadra il muro si valuta quando deve essere verificato l'esito del tocco. Per segnalarlo, premi il tasto **/** (slash) durante la valutazione dell'attacco: si apre direttamente la valutazione del muro avversario, da cui il programma inferisce automaticamente la valutazione dell'attacco (ad esempio muro `+` → attacco `-`). Il voto `!` non è disponibile per il muro perché non è contemplato; muro `/` indica invece un'invasione e muro `=` un mani-fuori.
In questo caso quindi, il tasto **/** non corrisponde alla valutazione dell'attacco murato, ma attiva la valutazione del muro.
In modalità squadra singola invece, non essendoci una squadra avversaria da cui inferire la valutazione del muro, nel momento in cui il flusso sarebbe nella squadra avversaria, oltre alla valutazione del fondamentale di difesa, c'è un tasto a rete per valutare l'eventuale muro.

Puoi aggiungere dati aggiuntivi all'ultimo attacco tramite i tasti centrali:

- **Base del centrale**
- **Tipo di attacco** (regolare, pallonetto, piazzata, ecc.)
- **Numero di giocatori a muro**

Tutti questi tasti hanno scorciatoie da tastiera indicati tra parentesi.

### Rotazione, formazione e sostituzioni

Il programma tiene separate in memoria:
- La rotazione base, ovvero la posizione in campo delle giocatrici
- La disposizione grafica in campo, ovvero la posizione in campo delle giocatrici dopo le varie transizioni dell'azione. Ad esempio se la squadra è in ricezione, le giocatrici vengono posizionate nelle varie posizioni di ricezione, idem per le fasi di attacco e difesa. Questi automatismi sono configurabili tramite le varie opzioni.

Per effettuare una **sostituzione**, premi il tasto Formazione/Sostituzione della squadra corrispondente, trascina la giocatrice in panchina al posto di quella in campo, poi scegli:

- **Tasto rosso** (*Effettua Sostituzione*): conteggia i cambi nel totale delle sostituzioni, quindi effettua la sostituzione vera e propria
- **Tasto blu** (*Sovrascrivi Formazione*): sovrascrive la formazione corrente senza conteggiare i cambi, serve se ad esempio è stata inserita la formazione sbagliata a inizio set o se va corretta durante la partita

È disponibile anche la **modalità numerica** per inserire il numero di maglia direttamente da tastiera, utile per inserire velocemente la formazione a inizio set.

### Correzioni e annullamenti

Tutti gli eventi inseriti sono visualizzati nel log della colonna di destra.

- **Annulla**: annulla l'ultimo evento inserito; funziona su più eventi in catena, puoi annullarne quanti ne vuoi. Attenzione: per eliminare invece parzialmente un inserimento di un fondamentale (ad esempio hai inserito una traiettoria di attacco ma non volevi valutare l'attacco, puoi premere sul tasto x in corrispondenza del giocatore da valutare).
- **Modifica**: fai doppio clic su un campo nel log per correggere una valutazione, aggiungere una traiettoria mancante o modificare qualsiasi altro dato
- **Elimina**: puoi eliminare direttamente un fondamentale dal log premendo il tasto x nell'ultima colonna.

### Fine set

Quando il set è terminato, premi **Set Successivo**: si apre di nuovo la schermata di preparazione, dove puoi modificare le formazioni, cambiare campo e scegliere chi batte. Cambio campo e battuta iniziale vengono inferiti automaticamente ma sono sempre modificabili.
Quando termina l'ultimo set, premi sul tasto **Pausa/Termina** per terminare la partita e mettere in pausa lo scout. Questo tasto mette anche in pausa il timer della partita. Per riaprire la partita basta cliccare sul medesimo tasto.

### Modalità singola squadra

Quando la squadra avversaria è disattivata il comportamento è quasi identico, con alcune differenze:

- La ricezione avversaria non viene valutata, quindi il voto di battuta non viene inferito, ma viene inserito direttamente sulla giocatrice come valutazione di battuta
- Lo slash sull'attacco vale come attacco murato con punto avversario, non apre la valutazione del muro
- Il tasto Muro permette di valutare l'eventuale muro della propria squadra quando si difende
- Il flusso rimane sempre sulla propria squadra

### Modalità mobile

Il programma può essere utilizzato anche da un dispositivo mobile molto piccolo, come ad esempio uno smartphone. Nel caso il programma rilevi uno schermo piccolo, si attiva la modalità mobile. In questa modalità:

- Le colonne laterali sono nascoste di default e richiamabili tramite tasti dedicati
- Viene visualizzato un solo campo alla volta, quello della squadra attiva nel flusso corrente
- Le valutazioni non appaiono direttamente sulle giocatrici: cliccando sul tasto del fondamentale si apre un pop-up con i voti da inserire
- La navigazione tra schermate avviene con uno swipe verso destra o sinistra nella parte alta dello schermo

---

## Analisi

La sezione **Analisi** offre diverse viste e filtri per poter analizzare tutti i dati raccolti durante la partita. Si può utilizzare sia durante la partita per recuperare dati utili, sia dopo la partita, le funzionalità sono identiche.

### Filtri generali

Nella parte alta della sezione puoi filtrare l'analisi per:

- **Squadra**
- **Set**
- **Match**

In modalità doppia squadra puoi scegliere se analizzare la tua squadra, l'avversaria oppure entrambe. Se non selezioni nessuna squadra in particolare, in alcune schermate il programma mostra il riepilogo affiancato delle due squadre.

Tutte le sottosezioni dell'analisi usano gli stessi filtri di base: cambiando set o squadra, si aggiornano automaticamente tabelle, grafici, traiettorie e riepiloghi.

Puoi inoltre aggregare i dati della partita corrente ai dati di partite precedenti tramite il pulsante apposito. In questo modo, verranno sommati tutti i dati della partita corrente e di quelle selezionate.

### Tabellino riepilogativo

La prima vista è il **tabellino riepilogativo**, che mostra per ogni giocatrice:

- formazione di partenza e ingressi
- punti fatti e punti subiti
- errori personali
- dati principali di battuta, ricezione, freeball, attacco, muro e difesa
- metriche come **Pos**, **Prf** ed **Eff**
- riepilogo totale squadra
- riepilogo per singolo set

Inoltre:

- Cliccando sul nome di una giocatrice, apri la sua interfaccia di analisi individuale (accessibile anche dall'apposito tasto di analisi)
- Cliccando sopra il nome di un fondamentale, apri una tabella in dettaglio di quel determinato fondamentale

Sotto il riepilogo principale è presente anche una tabella aggiuntiva con alcuni indicatori di squadra.

Qui trovi, tra le altre cose:

- dati di **cambio palla**
- attacchi dopo **ricezione positiva**
- attacchi dopo **ricezione non positiva**
- dati di **break point**
- rendimento del **contrattacco**
- differenza di rendimento per **rotazione**

### Grafici skill

I grafici permettono di vedere l'andamento di ogni fondamentale durante la partita, in modo da contestualizzare nel tempo gli eventi inseriti. Se vengono aggregati i dati di più partite, i grafici mostrano invece il totale della metrica per ogni partita, in modo da darmi l'idea dell'andamento del fondamentale sulla totalità delle partite.

Per ogni skill puoi visualizzare diverse metriche:

- **Eff % cumulativa**
- **Pos % cumulativa**
- **Prf % cumulativa**
- **Esito singolo (codice)**

Sono utili per individuare, ad esempio:

- cali o miglioramenti
- serie positive o negative
- differenze tra l'inizio e la fine del match
- impatto di un set specifico sul rendimento complessivo

Nel grafico i punti sono colorati in base al tono dell'evento:

- positivo
- neutro
- negativo

Passando con il mouse su un punto puoi leggere il dettaglio dell'evento corrispondente. I grafici possono anche essere copiati come immagine, per essere esportati.

### Grafici nella scheda atleta

Anche la **scheda giocatrice** include i grafici skill. In questo caso i grafici non sono più aggregati sulla squadra, ma costruiti solo sugli eventi di quella atleta.

Questo permette di vedere l'andamento individuale di ciascun fondamentale nel corso della partita, con la stessa logica usata per i grafici globali.

### Andamento dei set

La sottosezione **Andamento set** mostra l'evoluzione del punteggio all'interno di ciascun set.

Per ogni set viene disegnato un grafico del **delta punti**, cioè la differenza tra i punti della tua squadra e quelli dell'avversaria nel corso del set. 

Cliccando sui punti del grafico puoi leggere un dettaglio del rally o della sequenza di eventi che ha portato a quel cambio di punteggio.

### Play by play

La sottosezione **Play by play** ricostruisce la sequenza dei rally e dei cambi di punteggio del set selezionato. Serve per leggere l'andamento della partita azione per azione, senza dover scorrere tutto il log eventi.

### Filtri condivisi

Tutte le successive viste della sezione **Analisi** usano un sistema di filtri specifici, che si aggiungono a quelli principali di prima.

Questi mi permettono, oltre ad altre cose, di filtrare ad esempio i dati per giocatrice, per alzatrice, per palla precedente, per valutazione ecc...


### Analisi delle alzate

È disponibile una sezione dedicata alle **alzate**, pensata per studiare la distribuzione.

La vista mostra graficamente la distribuzione totale e nelle varie rotazioni. Vengono mostrate con sfondo verde le zone con efficienza più alta d'attacco e con contorno blu le zone con la maggiore distribuzione. Se corrispondono, su numeri sensati, significa che la distribuzione è stata efficiente.

La sezione mostra anche le valutazioni d'alzata, disponibili nel tabellino, e un riepilogo con i dati di attacco di ogni giocatore relativi a quell'alzata (utile soprattutto con i filtri per vedere gli esiti di attacco con un determinato tipo di alzata o con un determinato alzatore).

### Analisi delle traiettorie di attacco

Se durante lo scout hai registrato le traiettorie di attacco, il programma le organizza in una vista dedicata.

Le traiettorie vengono raggruppate per zona di partenza.

Le linee sono colorate in base all'esito dell'azione. Oltre alla mappa delle traiettorie, viene mostrato anche un riepilogo statistico degli attacchi filtrati, compreso il dettaglio per tipo di attacco.

### Analisi delle traiettorie di battuta

È presente anche una vista dedicata alle **traiettorie di battuta**. In questo caso il programma raggruppa le battute per giocatrice e disegna le traiettorie registrate.

Ogni card mostra le traiettorie della singola atleta, così puoi vedere con facilità abitudini, direzioni preferite e distribuzione del servizio.

### Foglio gara

La sottosezione **Foglio gara** prepara una vista compatta pensata per la stampa e la consultazione rapida a bordo campo. Il foglio è organizzato in formato orizzontale e riassume graficamente le informazioni principali della squadra analizzata.

Il foglio contiene:

- dati individuali delle giocatrici, con campetti per servizio e attacco
- una sezione **Difesa**, organizzata per provenienza dell'attacco
- una sezione **Cambio palla**, divisa per rotazione
- note modificabili sotto i singoli campetti, che vengono mantenute anche in stampa

Le traiettorie derivano dagli eventi realmente registrati durante lo scout. Nel cambio palla le traiettorie partono dalla zona reale dell'attacco: dalla rete per gli attacchi di prima linea e dalla linea dei tre metri per quelli di seconda linea.

Gli attacchi errore sono esclusi di default dalle traiettorie del foglio gara, ma possono essere reinclusi tramite il filtro dedicato.

### Scheda atleta e confronto

La sezione **Giocatrice** permette di selezionare un'atleta e vedere una scheda completa con tutti i dati delle altre sezioni di analisi (tabellino, traiettorie ecc...)

Puoi anche attivare il **confronto tra giocatrici**. In questo caso il programma affianca due atlete della stessa squadra e confronta automaticamente i loro valori, evidenziando dove una rende meglio o peggio dell'altra.

### Esportazione dell'analisi

È possibile esportare l'intera analisi in formato html. In questo modo chiunque, da qualunque dispositivo, ha accesso a tutte le funzionalità di analisi in modo interattivo senza dover per forza utilizzare il programma.

È disponibile anche il comando **Stampa / PDF**, che prepara l'analisi per la stampa o per il salvataggio come PDF tramite le funzioni del browser.

### Nota importante sulle metriche

Tutti i risultati mostrati nella sezione analisi dipendono da due elementi:

- i dati realmente inseriti nello scout
- le regole di valutazione configurate nelle impostazioni

In particolare, metriche come **Pos**, **Prf**, **Eff** e l'assegnazione dei punti sono sempre calcolate in base ai criteri che hai definito per i singoli fondamentali. Se modifichi quei criteri, cambierà anche la lettura statistica dell'analisi.


---

## Video

La sezione **Video** serve a sincronizzare gli eventi dello scout al filmato della partita, in modo da poter rivedere rapidamente le azioni, filtrare solo quelle che interessano ed eventualmente creare tagli video e usare il video come strumento di analisi tecnica.

Quando la sincronizzazione è corretta, ogni evento del log può portarti direttamente al punto giusto del filmato.

### Tipi di video supportati

L'app supporta due modalità principali:

- **video locale**
- **video YouTube**

Con il **video locale** puoi caricare un file direttamente dal tuo dispositivo.

Con **YouTube** puoi collegare il match a un link di YouTube.

#### Video durante lo scout

Quando lavori in **scout da video**, gli eventi vengono registrati mentre osservi il filmato. In questo caso l'app può salvare anche il tempo video associato all'evento nel momento in cui lo inserisci.

Questo rende la sincronizzazione molto più immediata, perché il log nasce già con riferimenti temporali video.

#### Analisi video dopo lo scout

Puoi anche caricare o collegare un video **dopo** aver già completato lo scout. In questo caso il log esiste già, ma va allineato al filmato tramite una procedura di sincronizzazione iniziale.

È la situazione più comune quando:

- hai scoutato live e vuoi aggiungere il video dopo
- hai importato un match già registrato
- vuoi rivedere o correggere l'associazione tra eventi e filmato

### Come funziona la sincronizzazione

La sincronizzazione si basa su un concetto semplice: devi dire all'app in quale punto del video si trova un evento noto del log.

Da quel momento l'app calcola un **offset temporale** e lo usa per collegare tutti gli altri eventi al filmato.

Di solito questo viene fatto sulla prima battuta della partita.

Una volta fatto ciò, bisogna aggiustare i vari eventi, basandosi sul fatto che l'inserimento di ogni evento ha un ritardo dato dall'essere umano che lo inserisce, che può variare in base al fondamentale e alle capacità dello scoutman.

### Procedura di sincronizzazione consigliata

La procedura più semplice è questa.

#### 1. Carica o apri il video

Per prima cosa:

- carica un file locale
- oppure collega un video YouTube

Se usi YouTube, apri il video e fallo partire almeno una volta prima di sincronizzare.

#### 2. Verifica di avere già un log eventi

La sincronizzazione richiede che nel match ci siano già eventi registrati. Senza almeno una skill nel log non è possibile creare un allineamento utile.

#### 3. Scegli un evento di riferimento

Decidi da quale evento cominciare la sincronizzazione. Se presente, è sempre la prima battuta della partita.

#### 4. Porta il video nel punto esatto dell'evento

Muovi il player fino al momento preciso in cui avviene quell'azione.

#### 5. Lancia la sincronizzazione

A questo punto usa il comando di sincronizzazione della prima skill. L'app salva l'offset tra il tempo del video e il tempo interno del log.

Adesso gli eventi sono sincronizzati, ma ancora non combaciano perfettamente al video.

#### 6. Correzione manuale

Questa è la parte più lunga del lavoro. In quanto ovviamente la sincronizzazione non è ancora perfetta, a causa dei ritardi di valutazione ed inserimento da parte dello scout man.

Questo ritardo di inserimento, viene detto offset. L'applicazione fornisce uno strumento per applicare un offset ad ogni fondamentale. Una volta applicato, posso procedere a sistemare tutti gli eventi a mano.

Solitamente, è bene procedere per ogni fondamentale, quindi ad esempio, vogliamo correggere tutte le battute. La procedura diventa la seguente:

1. Filtro gli eventi per battuta
2. Seleziono tutti gli eventi
3. Premo il tasto offset, e per l'evento battuta, inserisco un offset negativo (perché l'inserimento è sicuramente stato fatto dopo l'evento) di quanto più o meno mi aspetto che il ritardo di inserimento sia.
4. Cotrollo un evento per vedere quanto è lontano dalla sincronizzazione perfetta, posso applicare nuovamente l'offset desiderato (attenzione, l'offset non si resetta, ma viene accumulato)
5. Una volta che l'offset applicato mi soddisfa, procedo con le correzioni manuali
6. Mi piazzo sulla prima battuta, e cambio il timestamp con i tasti Q e W finché non corrisponde esattamente al momento desiderato
7. Ripeto l'operazione per tutte le battute rimaste
8. Posso correggere qualunque campo dell'evento con il doppio click o con il tasto scorciatoia apposito

Queste azioni vengono ripetute per tutti gli altri tipi di eventi.

Alcuni eventi sono collegati, ad esempio battuta e ricezione, attacco muro e difesa ecc...

In questo caso basta sincronizzare solo, ad esempio, tutte le battute, e poi premere il taasto apposito per sincronizzare automaticamente tutte le ricezioni allo stesso tempo.

### Strumenti avanzati della sezione video

La sezione video include alcuni strumenti aggiuntivi per correggere e rifinire il lavoro di sincronizzazione:

- **Correggi punteggio**: modifica il punteggio associato agli eventi quando trova incongruenze tra gli eventi o se è stato aggiunto manualmente un evento mancante
- **Aggiungi evento**: inserisce un evento mancante direttamente dalla sezione video
- **Offset skill**: applica uno spostamento temporale agli eventi filtrati, anche per fondamentale. Particolarmente utile in fase di sincronizzazione per applicare il ritardo di un determinato fondamentale in base al ritardo di inserimento dello scout man
- **Unifica tempi**: copia il tempo video tra eventi collegati, ad esempio battuta e ricezione oppure attacco, muro e difesa
- **Durata skill**: imposta il tempo di visualizzazione usato nel play by play video
- **Frame - / Frame +**: permette di spostarsi nel video frame by frame, usando anche le scorciatoie **Shift + freccia sinistra/destra**

Puoi inoltre salvare **preset di filtri video**. In questo modo puoi richiamare rapidamente combinazioni ricorrenti, ad esempio gli attacchi di una giocatrice, le ricezioni negative, le azioni in una rotazione specifica o un certo tipo di servizio.

### Cosa succede dopo la sincronizzazione

Una volta sincronizzato il match:

- posso cliccare su un evento e il video si sposta a quell'evento
- posso usare il tasto play by play per vedere uno dopo l'altro gli eventi filtrati (il tempo di visualizzazione può essere modificato dall'apposito campo)
- posso creare dei tagli video. Questo non viene fatto direttamente dal programma a causa dei limiti delle PWA, ma viene copiato un codice da usare con ffmpeg sul video originale per creare il taglio.

---

## Backup, import ed export

- **Esporta match** → per salvare una singola partita su file
- **Esporta database completo** → giocatrici, squadre e tutti i match in un unico backup
- **Importa match** → per aggiungere una partita senza toccare il resto
- **Importa database** → solo per sostituire o ripristinare l'intero archivio
- **Esporta DataVolley** → per esportare i dati in formato compatibile con altri programmi

Puoi importare anche da **URL**, sia per un singolo match sia per un database completo. Questa funzione serve quando il file è già pubblicato o condiviso tramite un link di download diretto.

Il link deve essere raggiungibile dal browser e deve puntare a un file compatibile con l'importazione selezionata. Se il provider blocca il download diretto o non permette l'accesso via browser, l'importazione da URL può fallire: in quel caso usa l'importazione da file locale.
