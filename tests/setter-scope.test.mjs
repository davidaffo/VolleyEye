import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";

const source = readScoutSource();
const start = source.indexOf("function getSetterFromCourtForScope");
const end = source.indexOf("function getSetterFromCourt()", start);
assert.ok(start >= 0 && end > start, "risoluzione dell'alzatrice non trovata");
const setterSource = source.slice(start, end);

const state = {
  rotation: 1,
  opponentRotation: 3,
  court: [
    { main: "Alzatrice blu" },
    { main: "Blu 2" },
    { main: "Blu 3" },
    { main: "Blu 4" },
    { main: "Blu 5" },
    { main: "Blu 6" }
  ],
  opponentCourt: [
    { main: "Rossa 1" },
    { main: "Rossa 2" },
    { main: "Alzatrice rossa" },
    { main: "Rossa 4" },
    { main: "Rossa 5" },
    { main: "Rossa 6" }
  ]
};
const ourPlayers = state.court.map(slot => slot.main);
const opponentPlayers = ["Rossa 1", "Rossa 2", "Rossa 4", "Rossa 5", "Alzatrice rossa", "Rossa 6"];
const roles = ["P", "S1", "C2", "O", "S2", "C1"];
const context = {
  state,
  getCourtShape: court => court,
  getPlayersForScope: scope => scope === "opponent" ? opponentPlayers : ourPlayers,
  getRoleLabelForRotation: (index, rotation) => roles[(index - rotation + 6) % 6]
};
vm.runInNewContext(setterSource, context);

test("ogni squadra risolve l'alzatrice usando la propria rotazione", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getSetterFromCourtForScope("our"))),
    { idx: 0, name: "Alzatrice blu" }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getSetterFromCourtForScope("opponent"))),
    { idx: 4, name: "Alzatrice rossa" }
  );
});

test("la risoluzione scoped non ricade sulla rotazione della squadra blu", () => {
  assert.match(setterSource, /scope === "opponent" \? state\.opponentRotation/);
  assert.match(setterSource, /getRoleLabelForRotation\(i \+ 1, rotation\)/);
  assert.doesNotMatch(setterSource, /getRoleLabel\(i \+ 1\)/);
});
