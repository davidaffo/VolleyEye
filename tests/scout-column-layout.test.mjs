import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";

const scoutSource = readScoutSource();
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readStyleSource();
const rosterSource = readRosterSource();

function loadColumnLayout(gridWidth = 1200) {
  const start = scoutSource.indexOf("function ensureScoutColumnState");
  const end = scoutSource.indexOf("function getAttackMetaForPlayer", start);
  assert.ok(start >= 0 && end > start, "funzioni layout colonne non trovate");
  const properties = new Map();
  const makeHandle = () => ({
    offsetWidth: 10,
    dataset: {},
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener() {}
  });
  const context = {
    SCOUT_COLUMN_DEFAULTS: { left: 280, right: 380 },
    SCOUT_COLUMN_LIMITS: { left: 160, center: 300, right: 240 },
    activeScoutColumnResizeSession: null,
    scoutGridResizeObserver: null,
    state: { uiScoutColumns: { right: 380 } },
    elScoutGrid: {
      clientWidth: gridWidth,
      style: { setProperty(name, value) { properties.set(name, value); } }
    },
    elScoutResizeLeft: makeHandle(),
    elScoutResizeRight: makeHandle(),
    window: {
      getComputedStyle: () => ({ columnGap: "5px" }),
      matchMedia: () => ({ matches: false }),
      addEventListener() {},
      removeEventListener() {}
    },
    document: { body: { classList: { add() {}, remove() {} } } },
    saveState() {},
    ResizeObserver: undefined,
    Math
  };
  vm.createContext(context);
  vm.runInContext(scoutSource.slice(start, end), context);
  return { context, properties };
}

test("lo scout live espone due separatori accessibili tra le tre colonne", () => {
  assert.match(html, /id="scout-resize-left"[\s\S]*role="separator"/);
  assert.match(html, /id="scout-resize-right"[\s\S]*role="separator"/);
  assert.match(css, /grid-template-columns:[\s\S]*--scout-left-width, 280px[\s\S]*--scout-right-width, 380px/);
});

test("il ridimensionamento conserva sempre lo spazio minimo della colonna centrale", () => {
  const { context, properties } = loadColumnLayout(1200);
  context.setScoutColumnWidth("left", 1000, false);
  assert.equal(context.state.uiScoutColumns.left, 480);
  assert.equal(properties.get("--scout-left-width"), "480px");
  assert.equal(properties.get("--scout-right-width"), "380px");
});

test("la colonna sinistra parte da 280px e conserva una misura salvata dall'utente", () => {
  const { context } = loadColumnLayout(960);
  assert.equal(context.ensureScoutColumnState().left, 280);
  context.state.uiScoutColumns.left = 340;
  assert.equal(context.ensureScoutColumnState().left, 340);
});

test("i controlli interni si adattano alla colonna e non vengono più tagliati", () => {
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /\.sl-action-row[\s\S]*flex-wrap:\s*wrap/);
  assert.match(css, /@container \(max-width: 620px\)/);
  assert.match(css, /\.scout-live \.court-layout[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
});

test("le larghezze delle colonne sono incluse nello snapshot locale", () => {
  assert.match(rosterSource, /uiScoutColumns:\s*\{[\s\S]*left:\s*Number\(snapshot\.uiScoutColumns[\s\S]*right:\s*Number\(snapshot\.uiScoutColumns/);
});
