import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const source = readScoutSource();
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readStyleSource();

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `funzione ${name} non trovata`);
  return source.slice(start, end);
}

test("Scout Live e Analisi costruiscono le traiettorie battuta con lo stesso renderer", () => {
  const liveRenderer = functionSource("renderLogServeTrajectories", "initLogServeTrajectoryControls");
  const analysisRenderer = functionSource("renderServeTrajectoryAnalysis", "getMatchSheetPageEl");
  const playerRenderer = functionSource("renderServeTrajectoryGridForPlayer", "syncPlayerSecondFilterState");

  assert.match(liveRenderer, /renderServeTrajectoryCard\(elLogServeCardOur/);
  assert.match(liveRenderer, /renderServeTrajectoryCard\(elLogServeCardOpp/);
  assert.match(analysisRenderer, /renderServeTrajectoryCard\(card/);
  assert.match(playerRenderer, /renderServeTrajectoryCard\(card/);
  assert.equal((source.match(/drawServeTrajectoryCanvas\(/g) || []).length, 2);
});

test("il renderer condiviso usa lo stesso callback per tutte le immagini del campo", () => {
  const canvasRenderer = functionSource("drawServeTrajectoryCanvas", "renderServeTrajectoryCard");
  assert.match(canvasRenderer, /const redraw = onImagesLoad \|\|/);
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
  assert.match(canvasRenderer, /0, gapStart, width, gapHeight/);
  assert.doesNotMatch(canvasRenderer, /const gapOverlapPx = 30/);
  assert.doesNotMatch(canvasRenderer, /const srcCut/);
});
