import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync("js/scout/io/match-io.js", "utf8");
const importer = source.slice(source.indexOf("async function importMatchStateAsNew"));

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

test("importare archivia e seleziona senza sostituire la partita caricata", async () => {
  const { context, state, writes } = harness();
  const events = state.events;
  const incoming = { players: ["A"], events: [{ eventId: 2 }], match: { opponent: "nuovo" } };
  const result = await context.importMatchStateAsNew(incoming, { silent: true });
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

test("un salvataggio import fallito non seleziona né carica la partita", async () => {
  const { context, state } = harness(false);
  await assert.rejects(() => context.importMatchStateAsNew({ players: [], events: [] }, { silent: true }), /salvare/);
  assert.equal(state.selectedMatch, "precedente");
  assert.equal(state.loadedMatchName, "precedente");
  assert.equal(Object.keys(state.savedMatches).length, 0);
});

test("l'import attende il commit IndexedDB prima di aggiornare la selezione", async () => {
  const { context, state } = harness();
  let commit;
  context.saveMatchToStorage = () => new Promise(resolve => { commit = resolve; });
  const pending = context.importMatchStateAsNew({ players: [], events: [] }, { silent: true });
  assert.equal(state.selectedMatch, 'precedente');
  assert.equal(Object.keys(state.savedMatches).length, 0);
  commit(true);
  assert.equal((await pending).ok, true);
  assert.equal(state.selectedMatch, 'importato');
});

test("un abort IndexedDB non segnala un import riuscito", async () => {
  const { context, state } = harness();
  context.saveMatchToStorage = async () => { throw new Error('transazione annullata'); };
  await assert.rejects(context.importMatchStateAsNew({ players: [], events: [] }, { silent: true }), /annullata/);
  assert.equal(state.selectedMatch, 'precedente');
  assert.equal(Object.keys(state.savedMatches).length, 0);
});
