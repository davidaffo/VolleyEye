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
    SCOUT_COLUMN_FIXED_LEFT: 280,
    SCOUT_COLUMN_DEFAULTS: { right: 380 },
    SCOUT_COLUMN_LIMITS: { center: 300, right: 240 },
    activeScoutColumnResizeSession: null,
    scoutGridResizeObserver: null,
    state: { uiScoutColumns: { left: 640, right: 300 } },
    elScoutGrid: {
      clientWidth: gridWidth,
      style: { setProperty(name, value) { properties.set(name, value); } }
    },
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

test("lo scout live lascia fissa la colonna sinistra ed espone solo il separatore destro", () => {
  assert.doesNotMatch(html, /id="scout-resize-left"/);
  assert.match(html, /id="scout-resize-right"[\s\S]*role="separator"/);
  assert.match(css, /grid-template-columns:\s*280px[\s\S]*--scout-right-width, 380px/);
});

test("il ridimensionamento conserva sempre lo spazio minimo della colonna centrale", () => {
  const { context, properties } = loadColumnLayout(1200);
  context.setScoutColumnWidth("right", 1000, false);
  assert.equal(context.state.uiScoutColumns.right, 595);
  assert.equal(properties.get("--scout-right-width"), "595px");
});

test("la colonna sinistra ignora le vecchie larghezze e la destra si adatta allo spazio", () => {
  const { context } = loadColumnLayout(960);
  const widths = context.resolveScoutColumnWidths();
  assert.equal(widths.left, 280);
  assert.equal(widths.right, 355);
  assert.equal(context.state.uiScoutColumns.right, 380);
  assert.deepEqual(Object.keys(context.state.uiScoutColumns), ["right"]);
});

test("i controlli interni si adattano alla colonna e non vengono più tagliati", () => {
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /\.sl-action-row[\s\S]*flex-wrap:\s*wrap/);
  assert.match(css, /@container \(max-width: 620px\)/);
  assert.match(css, /\.scout-live \.court-layout[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
});

test("le larghezze delle colonne sono incluse nello snapshot locale", () => {
  assert.match(rosterSource, /uiScoutColumns:\s*\{ right:\s*Number\(snapshot\.uiScoutColumns/);
});
