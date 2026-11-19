import assert from "node:assert/strict";
import test from "node:test";
import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import { createElement, Profiler, act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";

const bundle = buildSync({
  stdin: {
    contents: `
    export {EventTable} from './src/components/EventTable.jsx';
    export {VideoMatchNotes} from './src/components/MatchNotes.jsx';
    export {matchNotesStore} from './src/state/match-notes-store.mjs';
    export {eventTableStore} from './src/state/event-table-store.mjs';
  `,
    resolveDir: new URL("../", import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  jsx: "automatic",
});
const module = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
const { EventTable, VideoMatchNotes, matchNotesStore, eventTableStore } =
  module.exports;
const note = {
  id: "note-1",
  anchorKey: "4",
  afterEventLabel: "4",
  text: "Rivedere il muro",
  set: 2,
  homeScore: 12,
  visitorScore: 9,
  resolved: false,
};
const table = {
  headers: [{ label: "ID" }, { label: "Elimina" }],
  rows: [4, 5].map((id) => ({
    key: id,
    cells: [{ field: "eventId", text: String(id) }],
  })),
  selected: [],
  interaction: {},
  contextKey: "",
  showCheckbox: false,
};

test("il log mostra la nota tra evento 4 e 5 senza aggiungerla alle righe evento selezionabili", () => {
  matchNotesStore.publish({ notes: [note], unresolved: 1 });
  eventTableStore.publish("events-log", table);
  const dom = new JSDOM(
    renderToStaticMarkup(createElement(EventTable, { id: "events-log" })),
  );
  const rows = [...dom.window.document.querySelectorAll("tbody tr")];
  assert.equal(rows.length, 3);
  assert.equal(rows[0].dataset.eventKey, "4");
  assert.ok(rows[1].classList.contains("match-note-row"));
  assert.match(rows[1].textContent, /Set 2 · 12–9/);
  assert.match(rows[1].textContent, /Rivedere il muro/);
  assert.equal(rows[1].hasAttribute("data-event-key"), false);
  assert.equal(rows[1].querySelectorAll("input,article").length, 0);
  assert.equal(rows[1].querySelectorAll("button").length, 1);
  assert.ok(rows[1].querySelector("svg"));
  assert.equal(rows[2].dataset.eventKey, "5");
  dom.window.close();
});

test("l'analisi video mostra solo un pulsante con contatore senza pannelli espansi", () => {
  matchNotesStore.publish({ notes: [note], unresolved: 1 });
  let markup = renderToStaticMarkup(createElement(VideoMatchNotes));
  assert.match(markup, /Annotazioni: 1 da risolvere su 1/);
  assert.doesNotMatch(
    markup,
    /Rivedere il muro|Vai al video|<article|<details|<section/,
  );
  matchNotesStore.publish({
    notes: [{ ...note, resolved: true }],
    unresolved: 0,
  });
  markup = renderToStaticMarkup(createElement(VideoMatchNotes));
  assert.match(markup, /Annotazioni: 0 da risolvere su 1/);
});

test("una nota precedente al primo evento è visibile anche con registro vuoto", () => {
  matchNotesStore.publish({
    notes: [{ ...note, anchorKey: null, afterEventLabel: "" }],
  });
  eventTableStore.publish("events-log", {
    ...table,
    rows: [],
    empty: "Nessun evento",
  });
  const markup = renderToStaticMarkup(
    createElement(EventTable, { id: "events-log" }),
  );
  assert.match(markup, /match-note-marker/);
  assert.match(markup, /Rivedere il muro/);
});

test("il registro live non ridisegna la tabella video e aggiorna le celle modificate", async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById('root'));
  const renders = { log: 0, video: 0 };
  try {
    eventTableStore.publish('events-log', table);
    eventTableStore.publish('video-skills-container', table);
    await act(() => root.render(createElement('div', null,
      createElement(Profiler, { id: 'log', onRender: () => renders.log++ }, createElement(EventTable, { id: 'events-log' })),
      createElement(Profiler, { id: 'video', onRender: () => renders.video++ }, createElement(EventTable, { id: 'video-skills-container' })),
    )));
    const videoRenders = renders.video;
    const updated = { ...table, rows: table.rows.map((row, index) => index ? row : { ...row, cells: [{ field: 'eventId', text: 'modificato' }] }) };
    await act(() => {
      eventTableStore.publish('events-log', updated);
      matchNotesStore.publish({ notes: [], unresolved: 0 });
    });
    assert.equal(renders.video, videoRenders);
    assert.match(document.querySelector('#events-log').textContent, /modificato/);
    await act(() => eventTableStore.publish('video-skills-container', updated));
    assert.ok(renders.video > videoRenders);
    assert.match(document.querySelector('#video-skills-container').textContent, /modificato/);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
  }
});
