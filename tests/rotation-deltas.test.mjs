import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readSourceFixture } from "./helpers/source-fixture.mjs";

function extract(path, name, next) {
  const source = readSourceFixture(new URL(path, import.meta.url), "utf8");
  return source.slice(source.indexOf(`function ${name}(`), source.indexOf(`function ${next}(`));
}

function model() {
  const context = vm.createContext({
    state: { useOpponentTeam: true, pointRules: {
      attack: { for: ["#"], against: ["=", "/"] },
    } },
    getTeamScopeFromEvent: (event) => event.team || "our",
    ensurePointRulesDefaults() {},
    normalizePointRule: (_skill, rule) => rule || { for: [], against: [] },
  });
  vm.runInContext(
    extract("../src/features/analysis/scores.js", "getPointDirection", "isOpponentErrorPoint") +
    extract("../src/features/analysis/filter-model.js", "getPointDirectionFor", "computeAttackSplitSummary"),
    context,
  );
  return (events, scope) => Array.from(context.computeRotationDeltasForEvents(events, scope));
}

test("rotation deltas include opponent winners and errors in the analyzed team's rotation", () => {
  const deltas = model();
  const events = [
    { team: "our", skillId: "attack", code: "#", rotation: 2, opponentSetterPosition: 5 },
    { team: "opponent", skillId: "attack", code: "#", rotation: 5, opponentSetterPosition: 2 },
    { team: "opponent", skillId: "attack", code: "=", rotation: 5, opponentSetterPosition: 2, value: 2 },
    { team: "our", skillId: "attack", code: "=", rotation: 3, opponentSetterPosition: 6 },
  ];
  assert.deepEqual(deltas(events, "our"), [0, 2, -1, 0, 0, 0]);
  assert.deepEqual(deltas(events, "opponent"), [0, 0, 0, 0, -2, 1]);
});

test("missing or invalid rotations never contribute and never fall back to rotation one", () => {
  const deltas = model();
  for (const rotation of [undefined, null, "", " ", 0, 7, -1, 1.5, "invalid", true, false, NaN, Infinity]) {
    const events = [
      { team: "our", skillId: "attack", code: "#", rotation },
      { team: "opponent", skillId: "attack", code: "=", rotation: 4, opponentSetterPosition: rotation },
    ];
    assert.deepEqual(deltas(events, "our"), [0, 0, 0, 0, 0, 0]);
  }
  assert.deepEqual(deltas([
    { team: "our", skillId: "attack", code: "#", rotation: "6" },
    { team: "opponent", skillId: "attack", code: "=", opponentSetterPosition: "1" },
  ], "our"), [1, 0, 0, 0, 0, 1]);
});

test("rotation deltas preserve authoritative points and skip derived duplicate points", () => {
  const deltas = model();
  assert.deepEqual(deltas([
    { team: "opponent", skillId: "attack", code: "#", rotation: 5, opponentSetterPosition: 2, dvwScoreAuthoritative: true, pointDirection: "against" },
    { team: "opponent", skillId: "attack", code: "#", rotation: 5, opponentSetterPosition: 2, derivedFromBlock: true },
  ], "our"), [0, -1, 0, 0, 0, 0]);
});
