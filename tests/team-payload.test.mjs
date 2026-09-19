import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { readRosterSource } from "./helpers/roster-source.mjs";

const source = readRosterSource();
const helpers = source.slice(
  source.indexOf("function normalizePlayers"),
  source.indexOf("function replacePlayerNameEverywhere")
);
const normalizer = source.slice(
  source.indexOf("function normalizeTeamPayload"),
  source.indexOf("function loadTeamNormalized")
);
let generatedId = 0;
const context = {
  DEFAULT_STAFF: { headCoach: "", assistantCoach: "", manager: "" },
  teamManagerState: null,
  state: { selectedTeam: "", selectedOpponentTeam: "", match: {}, playersDb: {} },
  generatePlayerId: () => {
    generatedId += 1;
    return `00000000-0000-4000-8000-${String(generatedId).padStart(12, "0")}`;
  },
  isValidPlayerId: id =>
    typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
};
vm.runInNewContext(`${helpers}\n${normalizer}`, context);
const delimitedParser = source.slice(
  source.indexOf("function parseDelimitedTeamText"),
  source.indexOf("function readCamp3FileAsArrayBuffer")
);
vm.runInNewContext(delimitedParser, context);
const plain = value => JSON.parse(JSON.stringify(value));

test("il formato v3 ricostruisce numeri e nomi canonici dai dettagli", () => {
  const duplicateId = "11111111-1111-4111-8111-111111111111";
  const team = context.normalizeTeamPayload({
    version: 3,
    name: "Test",
    playersDetailed: [
      { id: duplicateId, firstName: "Anna", lastName: "Rossi", number: "4", role: "" },
      { id: duplicateId, firstName: "ANNA", lastName: "rossi", number: "99", role: "" },
      { id: duplicateId, firstName: "Sara", lastName: "Verdi", number: "8", role: "L", isCaptain: true },
      null
    ],
    numbers: { "verdi sara": "9", Estranea: "50" },
    liberos: ["VERDI SARA"],
    captains: ["verdi sara"],
    defaultLineup: ["ROSSI ANNA", "verdi sara", "Estranea"],
    preferredLibero: "verdi sara"
  });
  assert.deepEqual(plain(team.playersDetailed.map(player => player.name)), ["Rossi Anna", "Verdi Sara"]);
  assert.equal(new Set(team.playersDetailed.map(player => player.id)).size, 2);
  assert.deepEqual(plain(team.numbers), { "Rossi Anna": "4", "Verdi Sara": "8" });
  assert.deepEqual(plain(team.liberos), ["Verdi Sara"]);
  assert.deepEqual(plain(team.captains), ["Verdi Sara"]);
  assert.deepEqual(plain(team.defaultLineup), ["Rossi Anna", "Verdi Sara"]);
  assert.equal(team.preferredLibero, "Verdi Sara");
});

test("i roster legacy senza campi nome e cognome separati non vengono più inferiti", () => {
  const team = context.normalizeTeamPayload({
    name: "Legacy",
    players: ["Rossi Anna", " rossi   anna ", "Verdi Sara"],
    numbers: { "ROSSI ANNA": 2, Estranea: 99 },
    liberos: ["VERDI SARA", "Estranea"],
    captains: ["rossi anna"],
    defaultLineup: ["verdi sara", "ROSSI ANNA"],
    preferredLibero: "VERDI SARA"
  });
  assert.equal(team, null);
});

test("un cognome composto resta intero e il nome viene abbreviato dalla struttura", () => {
  context.state.playersDb = {
    player_1: {
      name: "De Angelis Anna Maria",
      lastName: "De Angelis",
      firstName: "Anna Maria"
    }
  };
  assert.equal(context.formatStructuredPlayerName("De Angelis Anna Maria"), "De Angelis A.");
  assert.equal(context.formatStructuredPlayerName("Testo non strutturato"), "Testo non strutturato");
});

test("l'elenco separato conserva cognome composto e nome nei rispettivi campi", () => {
  const parsed = context.parseDelimitedTeamText("12;De Angelis;Anna Maria;L");
  assert.deepEqual(plain(parsed.playersDetailed), [{
    name: "De Angelis Anna Maria",
    lastName: "De Angelis",
    firstName: "Anna Maria"
  }]);
  assert.deepEqual(plain(parsed.liberos), ["De Angelis Anna Maria"]);
});

test("non esiste più alcuna inferenza posizionale del nome completo", () => {
  assert.doesNotMatch(source, /splitNameParts/);
});
