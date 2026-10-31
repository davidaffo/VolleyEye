import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { session as match } from "../js/globals.js";
import { session as scout } from "../src/features/state/scout-ui.js";
import {
  prepareScoutCourtData,
  buildScoutCourtCard,
  buildScoutCourtBench,
  buildLiberoBenchModel,
  COURT_CARD_ORDER,
} from "../src/features/scout/court-model.js";
import {
  isErrorPickModeForScope,
  isPointPickModeForScope,
} from "../src/features/scout/pick-model.js";
import { readSourceFixture } from "./helpers/source-fixture.mjs";
import { sourceFunctions } from "./helpers/source-functions.mjs";
const court = (names) => names.map((main) => ({ main, replaced: "" }));
function setup(run) {
  const old = match.state,
    keys = [
      "selectedSkillPerPlayer",
      "errorPickModeState",
      "pointPickModeState",
      "rosterIdMapsCache",
    ];
  const previous = Object.fromEntries(keys.map((key) => [key, scout[key]]));
  const ours = ["Omonima", "Casa2", "Casa3", "Casa4", "Casa5", "Casa6"],
    theirs = ["Omonima", "Ospite2", "Ospite3", "Ospite4", "Ospite5", "Ospite6"];
  match.state = {
    players: [...ours, "Libero"],
    opponentPlayers: [...theirs, "Libero ospite"],
    court: court(ours),
    opponentCourt: court(theirs),
    liberos: ["Libero"],
    opponentLiberos: ["Libero ospite"],
    playerNumbers: { Omonima: "7", Libero: "12" },
    opponentPlayerNumbers: { Omonima: "17" },
    captains: ["Omonima"],
    opponentCaptains: [],
    rotation: 1,
    opponentRotation: 1,
    useOpponentTeam: true,
    predictiveSkillFlow: false,
    metricsConfig: {},
    events: [],
  };
  Object.assign(scout, {
    selectedSkillPerPlayer: {},
    errorPickModeState: null,
    pointPickModeState: null,
  });
  try {
    run(match.state);
  } finally {
    match.state = old;
    Object.assign(scout, previous);
  }
}
test("court card data stays cloneable and resolves homonymous players, numbers and roles in its own team", () =>
  setup((state) => {
    const other = structuredClone(state.opponentCourt);
    state.court[2] = { main: "Non nel roster", replaced: "Altra" };
    state.court[4] = { main: "Libero", replaced: "Casa5" };
    const our = prepareScoutCourtData("our"),
      opponent = prepareScoutCourtData("opponent");
    const ownCard = buildScoutCourtCard(our, 0),
      awayCard = buildScoutCourtCard(opponent, 0);
    assert.equal(ownCard.playerIndex, 0);
    assert.equal(awayCard.playerIndex, 0);
    assert.equal(ownCard.setter, true);
    assert.equal(awayCard.setter, true);
    assert.match(ownCard.label, /7.*Omonima/);
    assert.match(awayCard.label, /17.*Omonima/);
    assert.match(ownCard.label, /\(K\)/);
    assert.doesNotMatch(awayCard.label, /\(K\)/);
    assert.equal(buildScoutCourtCard(our, 2).label, "—");
    const libero = buildScoutCourtCard(our, 4);
    assert.equal(libero.libero, true);
    assert.equal(libero.restoreLabel, "Rientra Casa5");
    for (const data of [our, opponent]) {
      const cards = COURT_CARD_ORDER.map((index) =>
        buildScoutCourtCard(data, index),
      );
      assert.deepEqual(structuredClone(cards), cards);
      assert.deepEqual(
        cards.map((card) => card.index),
        [3, 2, 1, 4, 5, 0],
      );
    }
    assert.deepEqual(state.opponentCourt, other);
    assert.deepEqual(state.court[2], { main: "", replaced: "" });
    const bench = buildLiberoBenchModel();
    assert.deepEqual(structuredClone(bench), bench);
    const replaced = bench.our.find((player) => player.name === "Casa5");
    assert.equal(replaced.restorePosition, 4);
    assert.equal(replaced.replaced, true);
    assert.equal(replaced.used, false);
    assert.equal(
      bench.our.find((player) => player.name === "Libero").used,
      true,
    );
  }));
test("point and error choices use the active scope and retain the replaced player among error bench choices", () =>
  setup((state) => {
    state.court[4] = { main: "Libero", replaced: "Casa5" };
    scout.errorPickModeState = { scope: "our" };
    scout.pointPickModeState = { scope: "opponent" };
    assert.equal(isErrorPickModeForScope("our"), true);
    assert.equal(isErrorPickModeForScope("opponent"), false);
    assert.equal(isPointPickModeForScope("opponent"), true);
    const our = prepareScoutCourtData("our"),
      away = prepareScoutCourtData("opponent");
    assert.equal(our.errorPick, true);
    assert.equal(away.pointPick, true);
    const bench = buildScoutCourtBench(our);
    assert.ok(
      bench.some((player) => player.name === "Casa5" && player.idx === 4),
    );
    assert.ok(
      bench.every(
        (player) => !state.court.some((slot) => slot.main === player.name),
      ),
    );
    assert.deepEqual(buildScoutCourtBench(away), []);
  }));
test("court coordination preserves animation capture, per-card control transitions, bench preparation and publication order", () => {
  const calls = [],
    transitions = { value: 0 };
  let view;
  const source = readSourceFixture(
    new URL("../src/features/scout/court-commands.js", import.meta.url),
    "utf8",
  );
  const context = vm.createContext({
    COURT_CARD_ORDER,
    captureRects: () => {
      calls.push("capture");
      return "rects";
    },
    prepareScoutCourtData: () => {
      calls.push("prepare");
      return { predicted: "attack", errorPick: false, pointPick: false };
    },
    buildScoutCourtCard: (_data, index) => {
      calls.push(["card", index, transitions.value]);
      return { index, posIndex: index, name: "Player", playerIndex: index };
    },
    buildPreparedScoutSkillView: value => value,
    prepareScoutSkillControls: (index) => {
      calls.push(["skills", index]);
      transitions.value++;
      return {};
    },
    buildScoutCourtBench: () => {
      calls.push(["bench", transitions.value]);
      return [];
    },
    getScoutCourtFarSide: () => transitions.value === 6,
    stopErrorPickMode: () => {},
    stopPointPickMode: () => {},
    publishScoutCourtView: (_scope, next) => {
      calls.push("publish");
      view = next;
    },
  });
  vm.runInContext(sourceFunctions(readSourceFixture(new URL("../src/features/scout/skill-control-model.js", import.meta.url), "utf8"), ["createScoutAction"]) + sourceFunctions(source, ["renderScoutCourt"]), context);
  context.renderScoutCourt("our", { animate: true });
  assert.deepEqual(calls, [
    "capture",
    "prepare",
    ...COURT_CARD_ORDER.flatMap((index, step) => [
      ["card", index, step],
      ["skills", index],
    ]),
    ["bench", 6],
    "publish",
  ]);
  assert.equal(view.previousRects, "rects");
  assert.equal(view.far, true);
  calls.length = 0;
  context.renderScoutCourt("opponent", { hidden: true, animate: true });
  assert.deepEqual(calls, ["publish"]);
  assert.equal(view.hidden, true);
  assert.equal(view.cards.length, 0);
});
