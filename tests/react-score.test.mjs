import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import vm from "node:vm";
import test from "node:test";
import { JSDOM } from "jsdom";

const setSource = readFileSync(new URL("../src/features/analysis/set-results.js", import.meta.url), "utf8") + readFileSync(
  new URL("../src/features/live/next-set-lineups.js", import.meta.url),
  "utf8",
);
const scoreSource = readFileSync(
  new URL("../src/features/live/live-score-and-set.js", import.meta.url),
  "utf8",
);

test("set score publishes the same React view for live and offline analysis", () => {
  const live = { dataset: { reactManaged: "true" }, textContent: "React live" };
  const analysis = {
    dataset: { reactManaged: "true" },
    textContent: "React analysis",
  };
  let published = 0;
  const context = vm.createContext({
    state: { setResults: { 1: "our", 2: "opponent", 3: "our" } },
    elLiveSetScore: live,
    elAggSetScore: analysis,
    publishRuntimeView() {
      published++;
    },
  });
  vm.runInContext(setSource, context);
  context.updateSetScoreDisplays();
  assert.equal(published, 1);
  assert.equal(live.textContent, "React live");
  assert.equal(analysis.textContent, "React analysis");
  context.updateSetScoreDisplays();
  assert.equal(published, 2);
  assert.equal(live.textContent, "React live");
  assert.equal(analysis.textContent, "React analysis");
});

test("pausing and preparing a set publish button availability without mutating React buttons", () => {
  const dom = new JSDOM(`<body><div data-tab="scout">
    <button id="managed" data-react-managed="true">React</button>
    <button id="legacy">Legacy</button><button id="btn-end-match">Pause</button>
    <div id="next-set-inline"><button id="draft">Draft</button></div>
  </div></body>`);
  const calls = [];
  const context = vm.createContext({
    document: dom.window.document,
    publishScoutControlState: (value) => calls.push(value),
  });
  vm.runInContext(readFileSync(new URL("../src/domain/previous-skill-options.js", import.meta.url), "utf8"), context);
  vm.runInContext(scoreSource, context);
  context.setScoutControlsDisabled(true);
  assert.deepEqual(calls, [true]);
  assert.equal(dom.window.document.getElementById("managed").disabled, false);
  assert.equal(dom.window.document.getElementById("legacy").disabled, false);
  assert.equal(
    dom.window.document.getElementById("btn-end-match").disabled,
    false,
  );
  assert.equal(dom.window.document.getElementById("draft").disabled, false);
  context.setScoutControlsDisabled(false);
  assert.deepEqual(calls, [true, false]);
  assert.equal(dom.window.document.getElementById("legacy").disabled, false);
  dom.window.close();
});
