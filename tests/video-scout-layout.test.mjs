import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";

const source = readScoutSource();
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readStyleSource();
const rosterSource = readRosterSource();

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
  assert.deepEqual(layout, { ...custom, "center-court": ["court"] });
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
  const widgets = [...layout["center-top"], ...layout["center-court"], ...layout["center-bottom"], ...layout.right];
  assert.deepEqual(widgets.sort(), ["court", "dvw", "events", "serve-trajectories", "video"].sort());
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

test("il campo scout non ha la maniglia, gli altri pannelli restano spostabili", () => {
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  const w = dom.window;
  const saved = [];
  w.state = { useOpponentTeam: true, uiScoutWidgetLayout: { customized: true, "center-court": ["court"], courtHeight: 300 } };
  w.saveState = () => saved.push(JSON.parse(JSON.stringify(w.state.uiScoutWidgetLayout)));
  const start = source.indexOf("const SCOUT_WIDGET_IDS");
  const end = source.indexOf("function getDefaultScoutWidgetLayout", start);
  w.eval(source.slice(start, end) + readFileSync(new URL("../js/scout/live/workspace-layout.js", import.meta.url), "utf8"));
  try {
    w.bindScoutWidgetLayout();
    const widget = w.document.querySelector('[data-scout-widget="court"]');
    const court = w.document.getElementById("court-area");
    const home = court.querySelector('[data-team-panel="home"]');
    const handle = widget.querySelector(":scope > .scout-widget-handle");
    assert.equal(widget.parentElement.dataset.scoutWidgetZone, "center-court");
    assert.equal(handle, null);
    const events = w.document.querySelector('[data-scout-widget="events"]');
    events.querySelector(":scope > .scout-widget-handle").dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true })
    );
    assert.equal(events.parentElement.dataset.scoutWidgetZone, "center-top");
    assert.ok(saved.at(-1)["center-top"].includes("events"));
    assert.equal(court.querySelector('[data-team-panel="home"]'), home);
    assert.equal(court.parentElement, widget);
    assert.equal(w.document.getElementById("scout-court-resize"), null);
    assert.equal(saved.at(-1).courtHeight, undefined);
    w.applyScoutWidgetLayout();
    assert.equal(widget.parentElement.dataset.scoutWidgetZone, "center-court");
    assert.equal(court.style.transform, "");
    assert.equal(court.style.height, "");
    w.document.getElementById("btn-reset-scout-widgets").click();
    assert.equal(widget.parentElement.dataset.scoutWidgetZone, "center-court");
    assert.equal(saved.at(-1).courtHeight, undefined);
  } finally {
    w.close();
  }
});
