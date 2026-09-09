# Isolamento dello stato

VolleyEye tratta come domini separati:

- il match attualmente aperto;
- ogni snapshot nella raccolta dei match salvati;
- l'archivio delle squadre;
- la bozza aperta nell'editor squadra;
- l'archivio anagrafico delle giocatrici.

## Regole

1. Un valore che passa da un dominio a un altro viene sempre copiato in profondità.
2. Un file di match contiene solo lo snapshot del match. Squadre e altri match sono inclusi esclusivamente nel backup completo.
3. Le funzioni di rendering non modificano selezioni, roster o metadati del match.
4. Creazione, modifica, duplicazione, importazione ed eliminazione dall'archivio squadre non cambiano il match aperto.
5. Durante uno scout iniziato, un roster non può essere sostituito, svuotato o importato sopra quello corrente.
6. La modifica rapida in partita può aggiungere giocatrici e correggere nome, numero, capitana o libero. Non può rimuovere giocatrici.
7. Ogni roster viene sanificato al confine: numeri, liberi, capitana, campo e sostituzioni devono riferirsi esclusivamente alle giocatrici del proprio lato.
8. Eventi, timeout, sostituzioni e annullamenti portano sempre lo scope della squadra e aggiornano solo campo e contatori di quel lato.
9. Un cambio di match o un reset azzera anche tutti i riferimenti al video precedente.
10. Un errore di persistenza non viene presentato come salvataggio riuscito; gli import parziali elencano gli elementi non scritti.

## Operazioni intenzionalmente globali

La rinomina di una squadra aggiorna il suo nome nei match salvati che la referenziano. L'unione di due identità nell'archivio giocatrici aggiorna gli ID degli eventi storici. Queste operazioni richiedono un'azione esplicita dell'utente e non cambiano roster o formazioni.

## Verifica

Eseguire `npm test`. La suite controlla copie profonde, invarianti dei due roster, rinomine, cambi e annullamenti per lato, importazioni, punteggi corrotti, asset offline e assenza delle principali sincronizzazioni implicite.
