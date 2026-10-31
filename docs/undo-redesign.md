# Annullamento e recupero del caso 23 ottobre 2026

## Diagnosi

Il file contiene 837 eventi. Il set 3 è confluito nel set 2 (eventi 328–507), il set 5 nel set 4 (744–837). Le compensazioni -18/-25 e -28/-26 corrispondono esattamente ai punteggi finali dei set precedenti. Il passaggio al set 3 rimasto nello storico si trova dopo tutti gli scambi del terzo set, immediatamente prima del passaggio al quarto.

Nel codice precedente:
- ogni azione clonava tutto lo stato e tutto lo storico; gli snapshot precedenti formavano una catena privata, persa con JSON/IndexedDB;
- dopo la riapertura entrava in funzione un annullamento differente, parziale;
- il passaggio set catturava lo stato dopo aver già applicato campo, rotazioni e servizio nuovi;
- il ripristino sostituiva anche impostazioni, archivio e video;
- servizio e previsione potevano leggere il set precedente;
- l'annullamento del passaggio set avveniva senza un avviso specifico.

## Piano di intervento

1. Conservare intatti i due originali. Produrre una copia riparata con procedura ripetibile e verificata sui cinque parziali del PDF: Cattolica–Rainbow 25–19, 18–25, 23–25, 28–26, 10–15.
2. Sostituire la catena di copie integrali con ricevute versionate per azione: soli campi di gioco, confine dello storico e identificativo dell'evento precedente. Nessuna copia di archivio, statistiche derivate o storico dentro una ricevuta. Persistenza insieme agli eventi, identica dopo riapertura/esportazione.
3. Catturare la ricevuta prima di applicare la preparazione del set. Ripristinare entrambi i campi, rotazioni, servizio, liberi, risultati, inizi set e stato di pausa. Confermare esplicitamente l'attraversamento di un confine set.
4. Annullare atomicamente le azioni con eventi derivati; ripulire i riferimenti agli eventi rimossi. Conservare le modifiche agli eventi precedenti e le impostazioni utente. Per i vecchi file mantenere un percorso di compatibilità limitato ai dati effettivamente disponibili.
5. Isolare previsione e ricostruzione del servizio al set corrente; ricostruire anche il contesto di ricezione e sincronizzare selettori, campo avversario e variabili di posizionamento automatico.
6. Verificare azioni ordinarie, punti manuali, timeout, sostituzioni, battuta/ricezione derivata, inferenza muro, contesa, set 1–5, ritorni tra set, punteggi corretti, pausa/ripresa, persistenza, modifica/eliminazione dello storico e dati legacy; eseguire tutta la suite.

## Criteri di accettazione

- Tornare all'inizio di un set mostra 0–0 e il suo servizio iniziale.
- Un ulteriore annullamento richiede conferma per tornare al set precedente.
- Confermando si ripristina lo stato precedente alla preparazione, anche dopo JSON round trip.
- Un annullamento non ripristina eventi modificati/eliminati in precedenza, né impostazioni o metadati video vecchi.
- La copia riparata conserva identificativi, valutazioni, collegamenti, tempi video e traiettorie di tutti gli scambi originali.

## Intervento realizzato

La ricevuta `event.undoState` versione 1 contiene `before`, le chiavi originariamente assenti, il numero di eventi prima dell'azione, l'identificativo dell'ultimo evento precedente e gli identificativi degli eventi creati dall'operazione. Il ripristino mantiene gli oggetti degli eventi rimasti, così le correzioni al log non vengono sostituite con copie vecchie. Le inferenze del muro registrano soltanto le tre proprietà dell'attacco modificate dall'azione. I riferimenti agli eventi eliminati vengono rimossi da entrambi i tipi di collegamento.

La stessa ricevuta viene usata in memoria e dopo serializzazione. Le statistiche di entrambe le squadre vengono ricostruite dallo storico; non vengono incluse nelle ricevute. Il costo di ogni ricevuta non dipende dalla dimensione dello storico o degli archivi. I cambi multipli confermati con un unico salvataggio della formazione vengono annullati insieme.

La compatibilità con i file precedenti ricostruisce servizio e campi dalle formazioni iniziali, dalle rotazioni e dai cambi registrati. Non può ricostruire con certezza modifiche manuali della formazione che le vecchie versioni non avevano registrato. Le nuove azioni conservano lo stato necessario.

## Recupero della partita

Procedura ripetibile: `node scripts/repairs/bug-1023.mjs`. Scrive un nuovo file con suffisso `_riparato.json` accanto agli originali, che restano intatti.

- Identificativi 328–507: riassegnati al set 3; il passaggio 508 viene spostato prima del 328.
- Identificativi 744–837: riassegnati al set 5; aggiunto il passaggio mancante con identificativo 838, senza rinumerare gli eventi originali.
- Rimossi gli aggiustamenti che sottraevano i punti dei set precedenti; ricostruiti i punteggi progressivi e i vincitori dei cinque set. Totale Cattolica–Rainbow: 104–110, risultato 2–3.
- Ricostruita la formazione iniziale del set 3 dalle posizioni I–VI del PDF e dalle rotazioni dei primi eventi. La formazione salvata era stata sovrascritta dal passaggio tardivo.
- Conservato il lato campo effettivamente usato negli scambi, anche nel tie break, per non alterare l'orientamento delle traiettorie.
- Conservati tutti gli 834 eventi non strutturali, compresi timeout e cambi, con identificativi, valutazioni, collegamenti e metadati originali. Le sole proprietà aggiornate in questi eventi sono set e punteggi progressivi.

La cartella `resources/` è esclusa da Git nel progetto: originali e copia riparata restano artefatti locali. Il test sul file reale viene eseguito quando entrambi i JSON sono presenti; gli altri test usano dati sintetici e funzionano anche in un checkout senza le risorse private.

## Verifiche automatiche

`tests/undo-set-transactions.test.mjs` verifica il comportamento delle funzioni di produzione per:

| Situazione | Verifica |
| --- | --- |
| Set 1–5, squadra singola e doppia | Ritorno a 0–0, attraversamento confermato e punteggio precedente |
| Salvataggio e riapertura JSON | Stesso risultato degli annullamenti in memoria |
| Sequenza di Luigi | Due scambi annullati, correzione formazione e ripresa nel set 3 |
| Preparazione set | Ripristino di entrambi i campi, rotazioni, liberi, servizio e mappe set |
| Battuta/ricezione reale | Rimozione atomica dei due eventi e dei punti derivati |
| Inferenza muro | Ripristino della valutazione precedente dell'attacco e dei collegamenti |
| Timeout e cambi | Squadra corretta, servizio conservato e cambi multipli atomici |
| Contesa | Arresto al confine del set corrente |
| Correzioni e cancellazioni | Nessun evento ricompare; impostazioni, video e correzioni punteggio conservati |
| Dati legacy | Ricostruzione del set e servizio corretto anche dopo errore in battuta |
| Pausa e ripresa | Nessun evento fittizio; annullamento ancora valido dopo ripresa |
| Posizionamento automatico e ricezione | Cache, variabili globali e contesto coerenti con lo storico |
| Tie break | Ripristino del lato campo dell'azione annullata |
| Statistiche | Ricalcolo per entrambe le squadre |
| Dimensione ricevute | Nessuna copia dello storico o dell'archivio |
| File di Luigi | Cinque parziali identici al PDF e verifica di ogni evento originale |


## Secondo controllo della copertura

I 290 test iniziali non coprivano tutte le interazioni con gli strumenti di analisi e il roster. Il controllo successivo ha riprodotto due difetti con test prima falliti e poi superati:

1. Inserire una riga di analisi tra l'evento precedente e quello da annullare poteva eliminarla insieme all'operazione. Ora ogni ricevuta identifica gli eventi che appartengono alla sua operazione; il ripristino elimina soltanto quelli, conservando gli inserimenti successivi nello storico.
2. Rinominare una giocatrice poteva ripristinare il vecchio nome al successivo annullamento. La rinomina aggiorna ora anche campi, mappe libero, servizio pendente e formazioni iniziali nelle ricevute, separatamente per squadra.

Aggiunti un test di chiusura/riapertura del database con `fake-indexeddb` e un controllo generativo deterministico: 24 sequenze di 120 operazioni, con punti, timeout, passaggi set, serializzazioni e annullamenti. Il modello di confronto legge direttamente lo stato di gioco, senza usare il contenuto delle ricevute.

Questi test aumentano la copertura ma non dimostrano la correttezza per ogni sequenza possibile. I test dell'annullamento eseguono le funzioni di produzione con alcune dipendenze UI sostituite; la suite comprende anche test DOM, ma manca una prova completa dell'intero flusso tramite clic in un browser reale su desktop e mobile. Anche IndexedDB è simulato nei test. I limiti dei dati legacy descritti sopra restano validi.
