import { readAppHtml } from './helpers/app-html.mjs';
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

import { sourceFunctions } from "./helpers/source-functions.mjs";
const source = readScoutSource();
const model = readFileSync(new URL("../src/features/analysis/trajectory-view.js", import.meta.url), "utf8");
const html = readAppHtml();
const css = readStyleSource();

function functionSource(name) { const value = sourceFunctions(source, [name]); assert.ok(value); return value; }

test("Scout Live e Analisi costruiscono le traiettorie battuta con lo stesso renderer", () => {
  const component = readFileSync(new URL("../src/components/TrajectoryGrid.jsx", import.meta.url), "utf8");
  assert.match(component, /function TrajectoryCard/);
  assert.match(model, /publishReactLogServeTrajectories/);
  assert.match(model, /publishReactGlobalServeGrid/);
  assert.match(model, /buildReactServeTrajectoryCard/);
  assert.equal((model.match(/drawServeTrajectoryCanvas\(/g) || []).length, 2);
});

test("il renderer condiviso usa lo stesso callback per tutte le immagini del campo", () => {
  const canvasRenderer = functionSource("drawServeTrajectoryCanvas", "renderServeTrajectoryCard");
  assert.match(canvasRenderer, /const redraw =\s*onImagesLoad \|\|/);
  assert.match(canvasRenderer, /getServeTrajectoryImages\(redraw\)/);
  assert.match(canvasRenderer, /getAttackEmptyImage\(!farFlag, redraw\)/);
  assert.doesNotMatch(canvasRenderer, /getAttackEmptyImage\([^\n]*renderLogServeTrajectories/);
});

test("Scout Live non mantiene markup o canvas duplicati", () => {
  assert.doesNotMatch(html, /log-serve-(canvas|name|stats)-(our|opp)/);
  assert.doesNotMatch(html, /log-serve-card__grid/);
  assert.match(css, /\.serve-trajectory-card__visual/);
  assert.match(css, /\.serve-trajectory-card\.log-serve-card \{[\s\S]*?min-height:\s*90px/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
});

test("il campo centrale viene sovrapposto davvero al tratto di battuta", () => {
  const canvasRenderer = functionSource("drawServeTrajectoryCanvas", "renderServeTrajectoryCard");
  assert.match(canvasRenderer, /const gapOverlapPx = Math\.round\(width \/ 9\)/);
  assert.match(canvasRenderer, /const gapStart = startHeight - overlap/);
  assert.match(canvasRenderer, /0,\s*gapStart,\s*width,\s*gapHeight/);
  assert.doesNotMatch(canvasRenderer, /const gapOverlapPx = 30/);
  assert.doesNotMatch(canvasRenderer, /const srcCut/);
});
