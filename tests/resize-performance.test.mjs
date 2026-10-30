import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";

import { sourceFunctions } from "./helpers/source-functions.mjs";

const scout = readScoutSource();
const globals = readFileSync(new URL("../js/globals.js", import.meta.url), "utf8");

test("il resize della finestra usa un solo coordinatore", () => {
  const combined = `${globals}\n${scout}`;
  assert.equal(
    (combined.match(/listenRuntime\(window, ["']resize["']/g) || []).length,
    1
  );
  assert.match(scout, /function scheduleViewportLayoutUpdate\(\)/);
  assert.match(scout, /requestAnimationFrame\(\(\) => flushViewportLayoutUpdate\(\)\)/);
  assert.match(scout, /flushViewportLayoutUpdate\(\{ settled: true \}\)/);
});

test("il campo viene ricostruito soltanto al cambio desktop mobile", () => {
  const flush = scout.slice(
    scout.indexOf("function flushViewportLayoutUpdate"),
    scout.indexOf("function scheduleViewportLayoutUpdate")
  );
  assert.match(flush, /if \(compactModeChanged\)/);
  assert.doesNotMatch(flush, /renderPlayers\(\);[\s\S]*renderPlayers\(\);/);
});

test("ResizeObserver condivide la stessa coda e non forza layout paralleli", () => {
  const bind = sourceFunctions(scout, ['bindScoutColumnResize']);
  assert.match(bind, /new ResizeObserver\(\(\) => scheduleViewportLayoutUpdate\(\)\)/);
  assert.doesNotMatch(bind, /addEventListener\(["']resize["']/);
});
