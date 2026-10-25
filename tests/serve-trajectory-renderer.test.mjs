import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const source = readScoutSource();
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readStyleSource();

test("i punti rete dell'attacco seguono l'orientamento del campo e mantengono la selezione riaprendo la traiettoria", async () => {
  const dom = new JSDOM(html);
  const open = functionSource("openAttackTrajectoryModal", "closeAttackTrajectoryModal");
  const c = vm.createContext({
    state: { attackTrajectorySimplified: true },
    window: { addEventListener() {}, removeEventListener() {} },
    isDesktopCourtModalLayout: () => false,
    updateCourtModalPlacement() {}, setAttackTrajectoryCourtSizing() {}, restoreModalToPopup() {},
    resetTrajectoryState() {}, setModalOpenState() {}, renderLogServeTrajectories() {},
    requestAnimationFrame() {},
    serveTypeKeyHandler: null, trajectoryEscapeHandler: null,
    TRAJECTORY_IMG_NEAR: "near.png", TRAJECTORY_IMG_FAR: "far.png",
    clamp01: x => Math.max(0, Math.min(1, x)),
    TRAJECTORY_NET_POINTS: [{ id: "5", x: 0.1 }, { id: "3", x: 0.5 }, { id: "6-F", x: 0.9 }]
  });
  for (const name of open.match(/\belAttackTrajectory\w+/g)) c[name] = null;
  c.elServeTypeButtons = null;
  c.elAttackTrajectoryModal = dom.window.document.getElementById('attack-trajectory-modal');
  c.elAttackTrajectoryCanvas = dom.window.document.getElementById('attack-trajectory-canvas');
  c.elAttackTrajectoryImage = dom.window.document.getElementById('attack-trajectory-image');
  c.elAttackTrajectoryNetpoints = dom.window.document.getElementById('attack-trajectory-netpoints');
  vm.runInContext(open + functionSource("getNearestTrajectoryNetPointId", "setTrajectoryNetPointId"), c);
  try {
    for (const scope of ["our", "opponent"]) {
      for (const far of [false, true, false]) {
        for (const forceFar of [false, far]) {
          c.state.courtViewMirrored = far;
          c.state.opponentCourtViewMirrored = far;
          const pending = c.openAttackTrajectoryModal({ scope, forceFar });
          assert.equal(c.elAttackTrajectoryNetpoints.classList.contains('attack-trajectory-netpoints--far'), far);
          assert.equal(c.getNearestTrajectoryNetPointId({ x: far ? 0.9 : 0.1 }), '5');
          assert.equal(c.getNearestTrajectoryNetPointId({ x: far ? 0.1 : 0.9 }), '6-F');
          c.trajectoryResolver(null);
          await pending;
        }
      }
    }
    assert.match(css, /\.attack-trajectory-netpoints--far button\[data-net-point\]\s*\{\s*left:\s*calc\(100% - var\(--net-x, 0\.5\) \* 100%\)/);
  } finally {
    dom.window.close();
  }
});

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
