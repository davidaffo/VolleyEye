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

## Motore e servizi

`AppLayout` viene montato prima di avviare il motore. `config/runtime-files.mjs` e `build/runtime-plugin.mjs` compilano le sorgenti esistenti in un modulo ES isolato, senza eval o document.write. Gli adattatori espongono comandi e pubblicano modelli di vista negli store React. Le azioni che richiedono un gesto del browser, come apertura file e copia, vengono eseguite sincronicamente.

Il motore JavaScript è ancora riutilizzato tramite `src/compat/`: non è stato riscritto in hook né suddiviso interamente in servizi ES indipendenti. I renderer classici restano necessari per l'HTML di analisi esportabile senza React. Canvas, ridimensionamento, SDK YouTube e layout della finestra usano effetti imperativi; React gestisce i relativi controlli e le viste.

Listener globali e timer sono circoscritti al runtime. Il teardown rimuove gli effetti, salva il tempo video, disconnette l'observer, ferma i player e libera il blob locale. Il bootstrap resta unico per documento; le modifiche al motore durante lo sviluppo richiedono un ricaricamento completo. StrictMode non è abilitato perché il motore conserva riferimenti agli elementi montati all'avvio.

## GitHub Pages

`npm run build` genera `dist/` con asset e service worker basati sui chunk effettivi. Il percorso di produzione rimane `/VolleyEye/`, mantenendo origine e storage del sito.

Il workflow `.github/workflows/pages.yml` esegue installazione, test della logica, build e prove browser. Le pull request verso `main` vengono verificate; i push su `main` pubblicano `dist/` con GitHub Pages. Per attivarlo, la Source di Pages deve essere **GitHub Actions**. La configurazione remota verificata durante questa conversione usa ancora `main` dalla radice: non va confusa con un deploy React già eseguito.

## Verifiche

Le prove DOM usano il markup dei componenti React. I confronti differenziali verificano campo, grafici, editor, tabelle e anteprima DataVolley rispetto ai calcoli precedenti. Le prove Playwright esercitano la build sotto `/VolleyEye/`, compresi persistenza, riapertura offline, import/export, contatori oltre i limiti e identità del canvas nei portal.

Il video locale usa una fixture WebM di 10 secondi. La prova YouTube usa un SDK simulato e non verifica il servizio esterno reale.
