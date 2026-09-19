import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = {};
context.self = context;
context.window = context;
vm.runInNewContext(
  readFileSync(new URL("../js/shared/namespace.js", import.meta.url), "utf8"),
  context
);
vm.runInNewContext(
  readFileSync(new URL("../js/match-settings.js", import.meta.url), "utf8"),
  context
);

const field = value => ({ value, disabled: false });

function setup(overrides = {}) {
  const state = {
    match: {},
    selectedTeam: "Casa",
    selectedOpponentTeam: "Ospiti",
    useOpponentTeam: false,
    currentSet: 1,
    players: ["A"],
    opponentPlayers: ["B"],
    ...overrides
  };
  const calls = { saved: 0, set: [] };
  const elements = {
    elOpponent: field("Manuale"),
    elCategory: field("U18"),
    elDate: field(""),
    elMatchType: field("campionato"),
    elLeg: field("andata"),
    elCurrentSet: field("3"),
    elPlayersInput: field(""),
    elOpponentPlayersInput: field("")
  };
  const api = context.VolleyEye.matchSettings.createMatchSettings({
    state,
    getTodayIso: () => "2026-09-09",
    ensureMatchDefaults: () => {
      state.match ||= {};
      state.match.date ||= "2026-09-09";
      state.match.matchType ||= "amichevole";
    },
    setCurrentSet: (value, options) => calls.set.push([value, options]),
    syncCurrentSetUI: value => calls.syncedSet = value,
    saveState: () => calls.saved += 1,
    ...elements
  });
  return { state, calls, elements, api };
}

test("salva avversario manuale senza toccare la squadra selezionata", () => {
  const { state, calls, api } = setup();
  api.saveMatchInfoFromUI();
  assert.equal(state.match.teamName, "Casa");
  assert.equal(state.match.opponent, "Manuale");
  assert.equal(state.match.opponentManual, "Manuale");
  assert.equal(state.match.date, "2026-09-09");
  assert.deepEqual(JSON.parse(JSON.stringify(calls.set)), [["3", { save: false }]]);
  assert.equal(calls.saved, 1);
});

test("in modalità doppia squadra usa l'avversaria selezionata", () => {
  const { state, elements, api } = setup({ useOpponentTeam: true });
  elements.elOpponent.value = "Testo estraneo";
  api.saveMatchInfoFromUI();
  assert.equal(state.match.opponent, "Ospiti");
  assert.equal(state.match.opponentManual, undefined);
});

test("la UI blocca il campo avversario solo quando è collegato a una squadra", () => {
  const { state, elements, api } = setup({
    useOpponentTeam: true,
    match: { opponent: "Ospiti", category: "U16", date: "2026-01-02", matchType: "torneo", leg: "ritorno" }
  });
  api.applyMatchInfoToUI();
  assert.equal(elements.elOpponent.value, "Ospiti");
  assert.equal(elements.elOpponent.disabled, true);
  assert.equal(elements.elCategory.value, "U16");
  state.useOpponentTeam = false;
  api.applyMatchInfoToUI();
  assert.equal(elements.elOpponent.disabled, false);
});

test("le textarea sono sempre ricostruite dallo stato del rispettivo roster", () => {
  const { elements, api } = setup({ players: ["A", "C"], opponentPlayers: ["B", "D"] });
  api.applyPlayersFromStateToTextarea();
  api.applyOpponentPlayersFromStateToTextarea();
  assert.equal(elements.elPlayersInput.value, "A\nC");
  assert.equal(elements.elOpponentPlayersInput.value, "B\nD");
});
