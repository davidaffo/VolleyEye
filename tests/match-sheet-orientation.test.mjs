import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const rendering = readFileSync("js/scout/analysis/trajectory-rendering.js", "utf8");
const sheet = readFileSync("js/scout/analysis/match-sheet.js", "utf8");
const context = vm.createContext({
  clamp01Val: value => Math.max(0, Math.min(1, value)),
  getServeStartZone: event => event.serveStartZone
});
vm.runInContext(rendering.slice(rendering.indexOf("const MATCH_SHEET_ROLE_ORDER")) + "\n" + sheet, context);
function evaluate(expression) {
  return JSON.parse(JSON.stringify(vm.runInContext(expression, context)));
}

test("il foglio gara ruota entrambi gli assi dell'attacco senza modificare i dati", () => {
  const result = evaluate(`(() => {
    const event = {attackStartZone: 4, attackDirection: {start: {x: .2, y: .8}, end: {x: .7, y: .2}}};
    return {trajectory: getMatchSheetAttackTrajectory(event), event};
  })()`);
  assert.deepEqual(result.trajectory.start, {x: 80, y: 40});
  assert.deepEqual(result.trajectory.end, {x: 30, y: 160});
  assert.deepEqual(result.event.attackDirection.start, {x: .2, y: .8});
});

test("le traiettorie già orientate dal campo lontano non vengono ruotate due volte", () => {
  const result = evaluate('getMatchSheetAttackTrajectory({attackDirection: {start: {x: .8, y: .2}, end: {x: .3, y: .8}}})');
  assert.deepEqual(result.start, {x: 80, y: 40});
  assert.deepEqual(result.end, {x: 30, y: 160});
});

test("cambio palla e attacco condividono la destinazione, anche senza coordinate", () => {
  for (const data of [
    '{attackStartZone: 4, attackDirection: {start: {x: .2, y: .8}, end: {x: .7, y: .2}}}',
    '{attackStartZone: 4, attackEndZone: 1}'
  ]) {
    const result = evaluate(`({attack: getMatchSheetAttackTrajectory(${data}), sideout: getMatchSheetSideoutTrajectory(${data})})`);
    assert.deepEqual(result.sideout.end, result.attack.end);
    assert.equal(result.sideout.start.x, 82);
  }
  assert.deepEqual(evaluate('MATCH_SHEET_FAR_COURT_ZONES[4]'), {x: 82, y: 76});
  assert.deepEqual(evaluate('MATCH_SHEET_NEAR_COURT_ZONES[1]'), {x: 82, y: 176});
});

test("il servizio ruota le coordinate locali di entrambi i semicampi", () => {
  const result = evaluate('getMatchSheetServeTrajectory({serveStart: {x: .75, y: 1}, serveEnd: {x: .25, y: 0}})');
  assert.deepEqual(result.start, {x: 25, y: 4});
  assert.deepEqual(result.end, {x: 75, y: 196});
  const fallback = evaluate('getMatchSheetServeTrajectory({serveStartZone: 1, serveEnd: {x: .25, y: 0}})');
  assert.equal(fallback.start.x, 18);
});
