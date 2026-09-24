import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync("js/scout/io/match-io.js", "utf8");
const importer = source.slice(source.indexOf("function importMatchStateAsNew"));

function harness(stored = true) {
  const writes = [];
  const state = {
    loadedMatchName: "precedente", selectedMatch: "precedente",
    match: { opponent: "precedente" }, events: [{ eventId: 1 }],
    savedMatches: {}, uiMatchSessionActive: false
  };
  const context = {
    state, elSavedMatchesSelect: { value: "precedente" },
    buildUniqueImportedMatchName: () => "importato",
    saveMatchToStorage: (name, payload) => { writes.push({ name, payload }); return stored; },
    saveState: options => assert.equal(options.skipMatchPersist, true)
  };
  vm.runInNewContext(importer, context);
  return { context, state, writes };
}

test("importare archivia e seleziona senza sostituire la partita caricata", () => {
  const { context, state, writes } = harness();
  const events = state.events;
  const incoming = { players: ["A"], events: [{ eventId: 2 }], match: { opponent: "nuovo" } };
  const result = context.importMatchStateAsNew(incoming, { silent: true });
  assert.equal(result.ok, true);
  assert.equal(writes[0].payload.state.match.opponent, "nuovo");
  assert.notEqual(writes[0].payload.state, incoming);
  assert.equal(state.loadedMatchName, "precedente");
  assert.equal(state.match.opponent, "precedente");
  assert.equal(state.events, events);
  assert.equal(state.uiMatchSessionActive, false);
  assert.equal(context.elSavedMatchesSelect.value, "importato");
  assert.ok(state.savedMatches.importato);
});

test("un salvataggio import fallito non seleziona né carica la partita", () => {
  const { context, state } = harness(false);
  assert.throws(() => context.importMatchStateAsNew({ players: [], events: [] }, { silent: true }), /salvare/);
  assert.equal(state.selectedMatch, "precedente");
  assert.equal(state.loadedMatchName, "precedente");
  assert.equal(Object.keys(state.savedMatches).length, 0);
});
