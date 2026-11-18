import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

test("la nuova dimensione dell'analisi video conserva quella dello scout", () => {
  const source = readFileSync(new URL("../src/features/scout-ui.js", import.meta.url), "utf8");
  const start = source.indexOf("export function ensureVideoLayoutState()");
  const end = source.indexOf("export function clampVideoLayoutSize", start);
  const context = { matchState: { state: { uiVideoLayout: { analysisHeight: 320, scoutHeight: 300 } } },
    scoutUiState: { VIDEO_LAYOUT_DEFAULTS: { analysisHeight: null, scoutHeight: 320 } } };
  vm.runInNewContext(source.slice(start, end).replace("export function", "function"), context);
  const migrated = context.ensureVideoLayoutState();
  assert.equal(migrated.analysisHeight, null);
  assert.equal(migrated.scoutHeight, 300);
  migrated.analysisHeight = 450;
  assert.equal(context.ensureVideoLayoutState().analysisHeight, 450);
});
