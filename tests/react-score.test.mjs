import { sourceFunctions } from "./helpers/source-functions.mjs";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import vm from "node:vm";
import test from "node:test";
import { JSDOM } from "jsdom";

const scoreSource = readFileSync(
  new URL("../src/features/core/runtime-view.js", import.meta.url),
  "utf8",
);

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
  vm.runInContext(sourceFunctions(scoreSource, ["setScoutControlsDisabled"]), context);
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

test("the shared runtime publisher updates set scores directly without reading the DOM", async () => {
  const { session } = await import('../js/globals.js');
  const { publishRuntimeView } = await import('../src/features/core/runtime-view.js');
  const { runtimeStore } = await import('../src/state/runtime-store.mjs');
  const previous = session.state;
  const snapshot = runtimeStore.getSnapshot();
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, get() { throw new Error('Unexpected DOM access'); } });
    session.state = { match: {}, savedMatches: {}, events: [], currentSet: 1, setResults: { 1: 'our', 2: 'opponent', 3: 'our' } };
    publishRuntimeView();
    assert.equal(runtimeStore.getSnapshot().setWinLabel, '2 - 1');
    session.state.setResults[4] = 'opponent';
    publishRuntimeView();
    assert.equal(runtimeStore.getSnapshot().setWinLabel, '2 - 2');
    assert.equal(runtimeStore.getSnapshot().currentSet, 1);
  } finally {
    session.state = previous;
    runtimeStore.publish(snapshot);
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});
