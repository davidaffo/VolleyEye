import assert from "node:assert/strict";
import test from "node:test";
import { session as match } from "../js/globals.js";
import { session as runtime } from "../src/features/state/roster-lineup.js";
import {
  rotateCourtState,
  cacheAutoRoleBaseCourt,
  restoreAutoRoleBaseCourt,
  prepareAutoRolePositioning,
  getCourtPlacementError,
  applyAutoLiberoSubstitutionToCourtForScope,
  getAutoRoleDisplayCourt,
  getCurrentZoneForPlayer,
} from "../src/features/teams/court-state-model.js";
const court = (...names) =>
  Array.from({ length: 6 }, (_, i) => ({ main: names[i] || "", replaced: "" }));
const runtimeKeys = [
  "autoRoleBaseCourt",
  "opponentAutoRoleBaseCourt",
  "autoRoleRenderedCourt",
  "autoRolePhaseApplied",
  "autoRoleRotationApplied",
];
function setup(run) {
  const state = match.state,
    previous = Object.fromEntries(
      runtimeKeys.map((key) => [key, runtime[key]]),
    );
  match.state = {
    players: ["A", "B", "C", "D", "E", "F", "L", "L2"],
    opponentPlayers: ["X", "Y", "Z", "U", "V", "W", "OL"],
    court: court("A", "B", "C", "D", "E", "F"),
    opponentCourt: court("X", "Y", "Z", "U", "V", "W"),
    rotation: 6,
    opponentRotation: 6,
    liberos: ["L", "L2"],
    opponentLiberos: ["OL"],
    isServing: true,
    events: [],
  };
  Object.assign(runtime, {
    autoRoleBaseCourt: null,
    opponentAutoRoleBaseCourt: null,
    autoRoleRenderedCourt: null,
    autoRolePhaseApplied: "",
    autoRoleRotationApplied: null,
  });
  try {
    run(match.state);
  } finally {
    match.state = state;
    Object.assign(runtime, previous);
  }
}
for (const scope of ["our", "opponent"]) {
  test(`rotation restores a libero entering the front row and isolates the other team (${scope})`, () =>
    setup((state) => {
      const key = scope === "opponent" ? "opponentCourt" : "court",
        rotation = scope === "opponent" ? "opponentRotation" : "rotation";
      const other = scope === "opponent" ? "court" : "opponentCourt",
        original = structuredClone(state[other]);
      const names = state[key].map((slot) => slot.main),
        libero = scope === "opponent" ? "OL" : "L";
      state[key][0] = { main: libero, replaced: names[0] };
      const source = state[key],
        snapshot = structuredClone(source);
      assert.equal(rotateCourtState("cw", scope), false);
      assert.equal(state[rotation], 1);
      assert.deepEqual(
        state[key].map((slot) => slot.main),
        [names[5], ...names.slice(0, 5)],
      );
      assert.ok(state[key].every((slot) => !slot.replaced));
      assert.deepEqual(state[other], original);
      assert.deepEqual(source, snapshot);
      rotateCourtState("ccw", scope);
      assert.equal(state[rotation], 6);
      assert.deepEqual(
        state[key].map((slot) => slot.main),
        names,
      );
    }));
  test(`cached lineups restore independently without sharing mutable court slots (${scope})`, () =>
    setup((state) => {
      const key = scope === "opponent" ? "opponentCourt" : "court",
        cacheKey =
          scope === "opponent"
            ? "opponentAutoRoleBaseCourt"
            : "autoRoleBaseCourt";
      const snapshot = structuredClone(state[key]);
      cacheAutoRoleBaseCourt(scope);
      assert.equal(runtime[cacheKey], state[cacheKey]);
      state[key][0].main = "changed";
      runtime[cacheKey] = null;
      runtime.autoRolePhaseApplied = "attack";
      runtime.autoRoleRotationApplied = 6;
      runtime.autoRoleRenderedCourt = ["view"];
      assert.equal(restoreAutoRoleBaseCourt(scope), true);
      assert.deepEqual(state[key], snapshot);
      assert.notEqual(state[key][0], state[cacheKey][0]);
      assert.equal(
        runtime.autoRolePhaseApplied,
        scope === "our" ? "" : "attack",
      );
      assert.deepEqual(
        runtime.autoRoleRenderedCourt,
        scope === "our" ? null : ["view"],
      );
    }));
}
test("omitted rotation direction preserves the distinct public control defaults", () =>
  setup((state) => {
    rotateCourtState();
    rotateCourtState(undefined, "opponent");
    assert.equal(state.rotation, 5);
    assert.equal(state.opponentRotation, 1);
    assert.equal(state.court[0].main, "B");
    assert.equal(state.opponentCourt[0].main, "W");
  }));
test("court placement validates libero reentry, front row and a second libero without side effects", () =>
  setup((state) => {
    state.court[4] = { main: "L", replaced: "E" };
    const original = structuredClone(state);
    assert.equal(getCourtPlacementError("E", 4), "");
    assert.match(getCourtPlacementError("E", 5), /slot del libero/);
    assert.match(getCourtPlacementError("L2", 2), /prima linea/);
    assert.match(getCourtPlacementError("L2", 5), /solo un libero/);
    assert.equal(getCourtPlacementError("OL", 0, "opponent"), "");
    assert.deepEqual(state, original);
  }));
test("automatic libero selection respects the server exception and separate team preferences", () =>
  setup((state) => {
    state.autoLiberoBackline = true;
    state.opponentAutoLiberoBackline = true;
    state.autoLiberoRole = "P";
    state.opponentAutoLiberoRole = "P";
    state.rotation = 1;
    state.opponentRotation = 1;
    const own = structuredClone(state.court),
      opponent = structuredClone(state.opponentCourt);
    assert.deepEqual(
      applyAutoLiberoSubstitutionToCourtForScope(state.court),
      own,
    );
    const adjusted = applyAutoLiberoSubstitutionToCourtForScope(
      state.opponentCourt,
      "opponent",
    );
    assert.deepEqual(adjusted[0], { main: "OL", replaced: "X" });
    assert.deepEqual(state.opponentCourt, opponent);
    assert.deepEqual(state.court, own);
    assert.equal(state.opponentPreferredLibero, "OL");
    assert.equal(state.preferredLibero, "L");
  }));
test("automatic positioning updates the display overlay once per phase and rotation, retaining the base lineup", () =>
  setup((state) => {
    assert.equal(prepareAutoRolePositioning(), false);
    state.autoRolePositioning = true;
    const original = structuredClone(state.court);
    assert.equal(prepareAutoRolePositioning(), true);
    const displayed = runtime.autoRoleRenderedCourt;
    assert.deepEqual(state.court, original);
    assert.equal(prepareAutoRolePositioning(), false);
    assert.equal(runtime.autoRoleRenderedCourt, displayed);
    state.rotation = 1;
    assert.equal(prepareAutoRolePositioning(), true);
    const mapped = getAutoRoleDisplayCourt("attack");
    assert.equal(
      getCurrentZoneForPlayer(0, "attack"),
      mapped.findIndex((item) => item.slot.main === "A") + 1,
    );
    assert.equal(getCurrentZoneForPlayer(0), 1);
    assert.equal(getCurrentZoneForPlayer(99, "attack"), null);
  }));
