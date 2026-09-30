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

test("il cambio palla termina nel campo avversario, anche senza coordinate", () => {
  for (const data of [
    '{attackStartZone: 4, attackDirection: {start: {x: .2, y: .8}, end: {x: .7, y: .2}}}',
    '{attackStartZone: 4, attackEndZone: 1}'
  ]) {
    const result = evaluate(`({attack: getMatchSheetAttackTrajectory(${data}), sideout: getMatchSheetSideoutTrajectory(${data})})`);
    assert.ok(result.sideout.start.y < 100);
    assert.ok(result.sideout.end.y > 100);
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


test("anche una destinazione bassa nell’immagine resta nel campo avversario", () => {
  for (const y of [.1, .4, .7, .95]) {
    const result = evaluate(`getMatchSheetSideoutTrajectory({attackStartZone: 4, attackDirection: {end: {x: .2, y: ${y}}}})`);
    assert.equal(result.start.y, 90);
    assert.equal(result.end.x, 80);
    assert.equal(result.end.y, 100 + (1 - y) * 100);
    assert.ok(result.end.y > 100);
  }
});

test("i filtri cambio palla combinano set e giocatrice della squadra selezionata", () => {
  context.state = {uiMatchSheetFilters: {sideoutSets: ["2"], sideoutPlayers: {our: ["1"]}}};
  context.getAnalysisEvents = () => [
    {set: 1, playerIdx: 1}, {set: 2, playerIdx: 0}, {set: 2, playerIdx: 1}
  ];
  context.getTeamScopeFromEvent = () => "our";
  context.matchesSummarySetFilter = () => true;
  assert.deepEqual(evaluate('getMatchSheetSideoutEvents("our")'), [{set: 2, playerIdx: 1}]);
  context.state.uiMatchSheetFilters = {};
  assert.equal(evaluate('getMatchSheetSideoutEvents("our")').length, 3);
});

test("i ruoli seguono le zone degli attacchi e non le posizioni assolute di rotazione", () => {
  context.state = {uiMatchSheetFilters: {}};
  context.getPlayersForScope = () => ["Anna", "Bea", "Carla"];
  context.getPlayerNumbersForScope = () => ({Anna: 9, Bea: 7, Carla: 12});
  context.getSetStartEntryForScope = () => ({court: [{main: "Anna"}, {main: "Bea"}], rotation: 1});
  context.getCourtShape = court => court;
  context.getRoleLabelForRotation = pos => pos === 1 ? "O" : "C1";
  context.getAnalysisEvents = () => [
    {set: 1, playerIdx: 0, skillId: "attack", attackBp: false, rotation: 3, attackStartZone: 2, attackEndZone: 1},
    {set: 1, playerIdx: 1, skillId: "attack", attackBp: false, rotation: 3, attackStartZone: 3, attackEndZone: 1},
    {set: 1, playerIdx: 2, skillId: "attack", attackBp: false, rotation: 3, attackStartZone: 2, attackEndZone: 1}
  ];
  const labels = evaluate('getMatchSheetLineupPlayersForEvents("our", 3)');
  assert.deepEqual(labels.map(item => [item.pos, item.role]), [[2, "O"], [2, ""], [3, "C1"]]);
  assert.notEqual(labels[0].point.x, labels[1].point.x);
  assert.match(labels[1].description, /Zona 2 · #12 Carla · 1 attacchi/);
  assert.deepEqual(labels.map(item => item.label), ["9", "12", "7"]);
});


test("i numeri aggregati vengono dalla partita più recente, non dall’ordine di selezione", () => {
  context.state = {
    match: {date: "2026-09-20"}, playerNumbers: {Anna: 9},
    savedMatches: {
      newest: {state: {match: {date: "2026-09-29"}, playerNumbers: {Anna: 14}}},
      oldest: {state: {match: {date: "2026-09-10"}, playerNumbers: {Anna: 3}}}
    }
  };
  context.getAnalysisExtraMatchState = () => ({our: new Set(["newest", "oldest"])});
  assert.equal(evaluate('getMatchSheetLatestPlayerNumbers("our").get("anna")'), "14");
  context.state.match.date = "2026-09-30";
  assert.equal(evaluate('getMatchSheetLatestPlayerNumbers("our").get("anna")'), "9");
});
