import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";

const scout = readScoutSource();
const globals = readFileSync(new URL("../js/globals.js", import.meta.url), "utf8");

test("il resize della finestra usa un solo coordinatore", () => {
  const combined = `${globals}\n${scout}`;
  assert.equal(
    (combined.match(/window\.addEventListener\(["']resize["']/g) || []).length,
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
  assert.match(flush, /if \(compactModeChanged && typeof renderPlayers === "function"\)/);
  assert.doesNotMatch(flush, /renderPlayers\(\);[\s\S]*renderPlayers\(\);/);
});

test("ResizeObserver condivide la stessa coda e non forza layout paralleli", () => {
  const bind = scout.slice(
    scout.indexOf("function bindScoutColumnResize()"),
    scout.indexOf("function getAttackMetaForPlayer")
  );
  assert.match(bind, /new ResizeObserver\(\(\) => scheduleViewportLayoutUpdate\(\)\)/);
  assert.doesNotMatch(bind, /addEventListener\(["']resize["']/);
});
