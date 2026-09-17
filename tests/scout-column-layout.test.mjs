import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const scoutSource = fs.readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
const rosterSource = fs.readFileSync(new URL("../js/roster-lineup.js", import.meta.url), "utf8");

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
    SCOUT_COLUMN_DEFAULTS: { left: 320, right: 300 },
    SCOUT_COLUMN_LIMITS: { left: 160, center: 300, right: 160 },
    activeScoutColumnResizeSession: null,
    scoutGridResizeObserver: null,
    state: { uiScoutColumns: { left: 320, right: 300 } },
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
  assert.match(css, /grid-template-columns:[\s\S]*--scout-left-width[\s\S]*--scout-right-width/);
});

test("il ridimensionamento conserva sempre lo spazio minimo della colonna centrale", () => {
  const { context, properties } = loadColumnLayout(1200);
  context.setScoutColumnWidth("left", 1000, false);
  assert.equal(context.state.uiScoutColumns.left, 560);
  assert.equal(properties.get("--scout-left-width"), "560px");
  assert.equal(properties.get("--scout-right-width"), "300px");
});

test("su finestre strette le colonne vengono ridotte proporzionalmente senza overflow", () => {
  const { context } = loadColumnLayout(720);
  const widths = context.resolveScoutColumnWidths();
  assert.equal(widths.left + widths.right, 380);
  assert.ok(widths.left >= 160);
  assert.ok(widths.right >= 160);
});

test("i controlli interni si adattano alla colonna e non vengono più tagliati", () => {
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /\.sl-action-row[\s\S]*flex-wrap:\s*wrap/);
  assert.match(css, /@container \(max-width: 620px\)/);
  assert.match(css, /\.scout-live \.court-layout[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
});

test("le larghezze delle colonne sono incluse nello snapshot locale", () => {
  assert.match(rosterSource, /uiScoutColumns:\s*snapshot\.uiScoutColumns/);
});
