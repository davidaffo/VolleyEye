import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  const bindings = readFileSync(new URL("../js/scout/core/bindings-score.js", import.meta.url), "utf8");
  const swapBinding = bindings.slice(bindings.indexOf("  if (elNextSetSwapCourt)"), bindings.indexOf("  if (elNextSetSideOur)"));
  const c = {
    document: dom.window.document,
    state: { courtSideSwapped: false, setStarts: {} },
    getDefaultSetStartForScope: () => null,
    getMatchInitialSetStart: () => null,
    cloneCourt: value => value,
    getDerivedServeForSetStart: () => false,
    setScoutControlsDisabled() {}, renderNextSetLineups() {}, syncNextSetPreferredLiberoSelects() {}
  };
  for (const name of openSource.match(/\belNextSet\w+/g)) c[name] = null;
  c.elNextSetInline = dom.window.document.getElementById('popup');
  c.elNextSetSwapCourt = dom.window.document.getElementById('swap');
  vm.createContext(c);
  vm.runInContext(draftSource + openSource + swapBinding, c);
  try {
    for (let set = 2; set <= 5; set++) {
      const previousSide = c.state.courtSideSwapped;
      c.openNextSetModal(set);
      assert.equal(c.elNextSetSwapCourt.checked, true, `set ${set}`);
      assert.equal(c.nextSetDraft.swapCourt, !previousSide);
      c.elNextSetSwapCourt.checked = false;
      c.elNextSetSwapCourt.dispatchEvent(new dom.window.Event('change'));
      assert.equal(c.nextSetDraft.swapCourt, previousSide, 'senza spunta mantiene il campo');
      c.elNextSetSwapCourt.checked = true;
      c.elNextSetSwapCourt.dispatchEvent(new dom.window.Event('change'));
      assert.equal(c.nextSetDraft.swapCourt, !previousSide);
      c.state.setStarts[set] = { swapCourt: c.nextSetDraft.swapCourt };
      c.state.courtSideSwapped = c.nextSetDraft.swapCourt;
    }
  } finally {
    dom.window.close();
  }
});

test("la preparazione del set è un popup fuori dai contenitori dello scout", () => {
  const dom = new JSDOM(readFileSync(new URL("../index.html", import.meta.url), "utf8"));
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
  assert.match(openModal, /next-set-lineups--double/);
  assert.match(openModal, /!!state\.useOpponentTeam/);
  assert.match(openModal, /elNextSetBlockOpp\.classList\.toggle\("hidden", !state\.useOpponentTeam\)/);
});
