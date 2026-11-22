import test from "node:test";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from "./helpers/source-fixture.mjs";
import vm from "node:vm";
import { sourceFunctions } from "./helpers/source-functions.mjs";
import { normalizeTeamPayload } from "../src/features/teams/storage/team-repository.js";

const source = readFileSync(new URL("../src/features/live/team-management.js", import.meta.url), "utf8");

function importTeam(team, existing = []) {
  const result = { saved: null, messages: [] };
  const context = {
    FileReader: class { readAsText(file) { this.onload({ target: { result: JSON.stringify(file) } }); } },
    normalizeTeamPayload,
    listTeamsFromStorage: () => existing,
    saveTeamToStorage: (name, data) => { result.saved = { name, data }; return true; },
    syncTeamsFromStorage() {}, publishTeamsManagerView() {}, renderTeamsManagerList() {},
    scoutUiState: {}, alert: message => result.messages.push(message),
    logError: error => { throw error; },
  };
  vm.runInNewContext(sourceFunctions(source, ["importTeamToStorageOnly"]), context);
  context.importTeamToStorageOnly(team);
  return result;
}

test("importa una squadra con tutte le giocatrici fuori rosa senza cambiarne lo stato", () => {
  const team = { version: 3, name: "Nuova", playersDetailed: [{ firstName: "Anna", lastName: "Rossi", out: true }] };
  const result = importTeam(team);
  assert.equal(result.saved.name, "Nuova");
  assert.equal(result.saved.data.playersDetailed[0].out, true);
});

test("l'importazione non sovrascrive una squadra esistente e rifiuta un roster vuoto", () => {
  const team = { version: 3, name: "Nuova", playersDetailed: [{ firstName: "Anna", lastName: "Rossi" }] };
  const duplicate = importTeam(team, ["Nuova"]);
  assert.equal(duplicate.saved, null);
  assert.match(duplicate.messages[0], /Esiste già/);
  const empty = importTeam({ ...team, playersDetailed: [] });
  assert.equal(empty.saved, null);
  assert.match(empty.messages[0], /giocatrici valide/);
});
