import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const rosterSource = readFileSync(new URL("../js/roster-lineup.js", import.meta.url), "utf8");

function loadLayoutState(state) {
  const start = source.indexOf("const SCOUT_WIDGET_IDS");
  const end = source.indexOf("function getScoutWidgetZone", start);
  assert.ok(start >= 0 && end > start, "gestione widget scout non trovata");
  const context = { state, Set };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return JSON.parse(vm.runInContext("JSON.stringify(normalizeScoutWidgetLayout())", context));
}

test("il layout predefinito doppia squadra mette video ed eventi sopra le traiettorie", () => {
  const layout = loadLayoutState({ useOpponentTeam: true, uiScoutWidgetLayout: null });
  assert.deepEqual(layout.right, ["video", "dvw", "events", "serve-trajectories"]);
  assert.ok(layout.right.indexOf("events") < layout.right.indexOf("serve-trajectories"));
});

test("il layout predefinito singola squadra lascia il video sopra il campo", () => {
  const layout = loadLayoutState({ useOpponentTeam: false, uiScoutWidgetLayout: null });
  assert.deepEqual(layout["center-top"], ["video"]);
  assert.ok(layout.right.indexOf("events") < layout.right.indexOf("serve-trajectories"));
});

test("un ordinamento personalizzato non viene sovrascritto dal cambio modalità", () => {
  const custom = {
    customized: true,
    "center-top": ["events"],
    "center-bottom": ["serve-trajectories"],
    right: ["video", "dvw"]
  };
  const layout = loadLayoutState({ useOpponentTeam: true, uiScoutWidgetLayout: custom });
  assert.deepEqual(layout, custom);
});

test("una disposizione incompleta o duplicata viene riparata senza perdere widget", () => {
  const layout = loadLayoutState({
    useOpponentTeam: true,
    uiScoutWidgetLayout: {
      customized: true,
      "center-top": ["events", "events", "inesistente"],
      "center-bottom": [],
      right: ["video"]
    }
  });
  const widgets = [...layout["center-top"], ...layout["center-bottom"], ...layout.right];
  assert.deepEqual(widgets.sort(), ["dvw", "events", "serve-trajectories", "video"].sort());
});

test("i widget possono essere rilasciati sopra, sotto o a destra del campo", () => {
  assert.match(html, /data-scout-widget-zone="center-top"/);
  assert.match(html, /data-scout-widget-zone="center-bottom"/);
  assert.match(html, /data-scout-widget-zone="right"/);
  ["video", "dvw", "events", "serve-trajectories"].forEach(widgetId => {
    assert.match(html, new RegExp(`data-scout-widget="${widgetId}"`));
  });
  assert.match(css, /body\.scout-widget-dragging \.scout-widget-zone/);
  assert.match(source, /window\.addEventListener\("pointermove", handleScoutWidgetPointerMove/);
  assert.match(source, /target\.closest\("\.scout-col-right"\)[\s\S]*getScoutWidgetZone\("right"\)/);
  assert.match(source, /handle\.draggable = false/);
  assert.doesNotMatch(source, /handleScoutWidgetNativeDrag/);
  assert.doesNotMatch(source, /sendScoutWidgetToRight/);
  assert.match(source, /if \(!cancelled && moved && pendingZone\)/);
  assert.match(css, /\.scout-widget-handle \{[\s\S]*position:\s*absolute/);
  assert.match(css, /\.scout-widget \{[\s\S]*border:\s*1px solid #334155/);
  assert.match(css, /body\[data-theme="light"\] \.scout-widget/);
});

test("l'ultimo codice appartiene soltanto al pannello di inserimento DataVolley", () => {
  const dvwStart = html.indexOf('data-scout-widget="dvw"');
  const summary = html.indexOf('id="dvw-scout-last-code"');
  const nextWidget = html.indexOf('data-scout-widget="serve-trajectories"');
  assert.ok(dvwStart >= 0 && summary > dvwStart && nextWidget > summary);
  assert.doesNotMatch(html, /data-scout-widget="last-event"/);
  assert.doesNotMatch(html, /id="undo-last-summary"/);
});

test("la disposizione personalizzata è inclusa nello snapshot locale", () => {
  assert.match(rosterSource, /uiScoutWidgetLayout:\s*snapshot\.uiScoutWidgetLayout/);
});
