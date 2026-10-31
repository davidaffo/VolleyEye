import { featureSource } from "./helpers/feature-source.mjs";
import { readRuntimeSource } from "./helpers/react-runtime.mjs";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import test from "node:test";
import { JSDOM } from "jsdom";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const css = readStyleSource();
const scout = readScoutSource();

test("Cambia campo resta spuntato dal secondo al quinto set e indica un cambio relativo", () => {
  const dom = new JSDOM('<body data-active-tab="scout"><div id="popup"></div><input id="swap" type="checkbox"></body>');
  const openSource = scout.slice(scout.indexOf("function openNextSetModal("), scout.indexOf("function closeNextSetModal("));
  const draftSource = scout.slice(scout.indexOf("function buildNextSetDraft("), scout.indexOf("function openNextSetLineupModal("));
  const c = {
    document: dom.window.document,
    state: { courtSideSwapped: false, setStarts: {} },
    getDefaultSetStartForScope: () => null,
    getMatchInitialSetStart: () => null,
    cloneCourt: value => value, removeLiberosAndRestoreForScope: value => value,
    getDerivedServeForSetStart: () => false,
    setScoutControlsDisabled() {}, renderNextSetLineups() {}, syncNextSetPreferredLiberoSelects() {}
  };

  c.elNextSetInline = dom.window.document.getElementById('popup');
  c.elNextSetSwapCourt = dom.window.document.getElementById('swap');
  vm.createContext(c);
  vm.runInContext(draftSource + featureSource("src/features/live/next-set-model.js", ["updateNextSetOption"]), c);
  try {
    for (let set = 2; set <= 5; set++) {
      const previousSide = c.state.courtSideSwapped;
      c.nextSetDraft = c.buildNextSetDraft(set);
      assert.equal(c.nextSetDraft.swapCourt !== previousSide, true, `set ${set}`);
      assert.equal(c.nextSetDraft.swapCourt, !previousSide);
      c.elNextSetSwapCourt.checked = false;
      c.updateNextSetOption("swapCourt", c.elNextSetSwapCourt.checked, true);
      assert.equal(c.nextSetDraft.swapCourt, previousSide, 'senza spunta mantiene il campo');
      c.elNextSetSwapCourt.checked = true;
      c.updateNextSetOption("swapCourt", c.elNextSetSwapCourt.checked, true);
      assert.equal(c.nextSetDraft.swapCourt, !previousSide);
      c.state.setStarts[set] = { swapCourt: c.nextSetDraft.swapCourt };
      c.state.courtSideSwapped = c.nextSetDraft.swapCourt;
    }
  } finally {
    dom.window.close();
  }
});

test("la preparazione del set è un popup fuori dai contenitori dello scout", () => {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: "outside-only" });
  dom.window.matchMedia = () => ({ matches: false });
  vm.runInContext(readRuntimeSource("react-views"), dom.getInternalVMContext());
  dom.window.__flushReactViews();
  const popup = dom.window.document.getElementById("next-set-inline");
  assert.equal(popup.parentElement, dom.window.document.body);
  assert.equal(popup.getAttribute("role"), "dialog");
  assert.equal(popup.getAttribute("aria-modal"), "true");
  assert.ok(popup.querySelector("#next-set-start"));
  assert.ok(popup.querySelector("#next-set-court-our"));
  assert.ok(popup.querySelector("#next-set-court-opp"));
  const overlay = css.slice(
    css.indexOf(".next-set-inline {"),
    css.indexOf(".next-set-inline.hidden")
  );
  const card = css.slice(
    css.indexOf(".next-set-inline__card {"),
    css.indexOf(".next-set-inline__head")
  );
  assert.match(overlay, /position:\s*fixed/);
  assert.match(overlay, /align-items:\s*center/);
  assert.match(overlay, /z-index:\s*1900/);
  assert.match(overlay, /overflow-y:\s*auto/);
  assert.match(card, /max-height:\s*100%/);
  assert.match(card, /overflow-y:\s*auto/);
  dom.window.close();
});

test("in doppia squadra le formazioni si affiancano quando c'è spazio", () => {
  assert.match(
    css,
    /\.next-set-lineups\.next-set-lineups--double\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit/
  );
  const openModal = scout.slice(
    scout.indexOf("function openNextSetModal"),
    scout.indexOf("function closeNextSetModal")
  );
  const component = readFileSync(new URL("../src/components/NextSetPreparation.jsx", import.meta.url), "utf8");
  assert.match(component, /next-set-lineups--double/);
  assert.match(openModal, /renderNextSetLineups\(\)/);
  assert.match(component, /visible=\{view.double\}/);
});
