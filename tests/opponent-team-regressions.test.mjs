import assert from "node:assert/strict";
import { readRosterSource } from "./helpers/roster-source.mjs";
import { readScoutSource } from "./helpers/scout-source.mjs";
import test from "node:test";
import vm from "node:vm";

const roster = readRosterSource();
const scout = readScoutSource();
const plain = value => JSON.parse(JSON.stringify(value));
function load(context, source, names) {
  context.getPlayerNumbersForScope ??= scope => scope === "opponent" ? context.state.opponentPlayerNumbers || {} : context.state.playerNumbers || {};
  const code = names.map(name => {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1);
    const rest = source.slice(start);
    const next = rest.slice(1).search(/^function /m);
    return next < 0 ? rest : rest.slice(0, next + 1);
  }).join("\n");
  vm.runInNewContext(code, context);
  return context;
}
function storage() {
  const result = {};
  Object.defineProperties(result, {
    getItem: { value: key => result[key] ?? null },
    setItem: { value: (key, value) => { result[key] = String(value); } },
    removeItem: { value: key => { delete result[key]; } }
  });
  return result;
}
function migrationContext() {
  const localStorage = storage();
  const context = {
    localStorage, archiveStorage: { getItem: localStorage.getItem, setItem: localStorage.setItem, removeItem: localStorage.removeItem, keys: () => Object.keys(localStorage) }, STORAGE_KEY: "state", TEAM_PREFIX: "teams/", OPPONENT_TEAM_PREFIX: "opponents/",
    state: { savedTeams: { Originale: { name: "Originale" }, "Originale B": { name: "Originale B" } } },
    getTeamStorageKey: name => "teams/" + name,
    listTeamsFromStorage: () => Object.keys(localStorage).filter(key => key.startsWith("teams/")),
    normalizeTeamPayload: value => value,
    saveTeamToStorage: (name, data) => { localStorage.setItem("teams/" + name, JSON.stringify(data)); return true; },
    logError: () => {}
  };
  return load(context, roster, ["migrateTeamsToPersistent", "migrateOpponentTeamsIntoTeams"]);
}
test("un archivio esistente non viene ripopolato con copie da snapshot obsoleti", () => {
  const c = migrationContext();
  c.localStorage.setItem("teams/Originale", JSON.stringify({ name: "Originale", players: ["Nuova"] }));
  c.migrateTeamsToPersistent();
  assert.equal(c.localStorage.getItem("teams/Originale B"), null);
  assert.deepEqual(JSON.parse(c.localStorage.getItem("teams/Originale")).players, ["Nuova"]);
});
test("la migrazione avviene una volta e non resuscita squadre eliminate nemmeno ad archivio vuoto", () => {
  const c = migrationContext();
  c.localStorage.setItem("opponents/Ospiti", JSON.stringify({ name: "Ospiti" }));
  c.migrateTeamsToPersistent();
  assert.ok(c.localStorage.getItem("teams/Ospiti"));
  for (const key of Object.keys(c.localStorage).filter(key => key.startsWith("teams/"))) c.localStorage.removeItem(key);
  c.migrateOpponentTeamsIntoTeams();
  assert.deepEqual(c.listTeamsFromStorage(), []);
});
test("una scrittura fallita non marca la migrazione come completata", () => {
  const c = migrationContext();
  const write = c.saveTeamToStorage;
  c.saveTeamToStorage = (name, data) => name === "Originale" ? write(name, data) : false;
  c.migrateTeamsToPersistent();
  assert.notEqual(c.localStorage.getItem("state:archive-migration-v1"), "done");
  c.state.savedTeams = {};
  c.saveTeamToStorage = write;
  c.migrateTeamsToPersistent();
  assert.ok(c.localStorage.getItem("teams/Originale B"));
  assert.equal(c.localStorage.getItem("state:archive-migration-v1"), "done");
});

function element() {
  return {
    children: [], dataset: {}, events: {}, classList: { add() {}, remove() {} },
    set innerHTML(value) { this.children = []; },
    appendChild(child) { this.children.push(child); },
    addEventListener(name, fn) { this.events[name] = fn; },
    setAttribute() {}
  };
}
function benchContext() {
  const container = element();
  const context = {
    state: { useOpponentTeam: true, players: ["Casa"], opponentPlayers: ["Titolare", "Riserva", "Libero", "Sostituita"],
      opponentCourt: [{ main: "Titolare" }, { main: "Libero", replaced: "Sostituita" }],
      opponentLiberos: ["Libero"], opponentPlayerNumbers: { Riserva: "12" }, opponentCaptains: ["Riserva"] },
    document: { getElementById: () => container, createElement: element },
    getCourtShape: court => court,
    formatNameWithNumberFor: (name, numbers) => `${numbers[name]} - ${name}`,
    openMobileLineupModal: scope => { context.opened = scope; }, container
  };
  load(context, scout, ["getBenchForLineupWithRoster"]);
  return load(context, roster, ["renderOpponentBenchChips"]);
}
test("le riserve avversarie sono visibili e aprono la formazione della squadra corretta", () => {
  const c = benchContext();
  c.renderOpponentBenchChips();
  assert.equal(c.container.children.length, 1);
  assert.equal(c.container.children[0].textContent, "12 - Riserva");
  c.container.children[0].events.click();
  assert.equal(c.opened, "opponent");
  c.state.opponentCourt.push({ main: "Riserva" });
  c.renderOpponentBenchChips();
  assert.equal(c.container.children[0].textContent, "Nessuna riserva disponibile.");
  c.state.useOpponentTeam = false;
  c.renderOpponentBenchChips();
  assert.equal(c.container.children.length, 0);
});
test("la formazione avversaria usa i propri numeri e capitano anche con nomi omonimi", () => {
  const c = load({
    state: { opponentPlayerNumbers: { Omonima: "12" }, opponentCaptains: ["Omonima"] },
    lineupModalScope: "opponent",
    formatNameWithNumber: () => "numero della squadra sbagliata",
    formatNameWithNumberFor: (name, numbers, options) => `${numbers[name]} ${options.captainSet.has(name.toLowerCase())}`
  }, scout, ["getLineupModalNumbers", "formatLineupModalName"]);
  assert.equal(c.formatLineupModalName("Omonima"), "12 true");
});
test("il clic sul libero avversario usa il cambio e non rimuove il ruolo", () => {
  const container = element();
  const c = {
    state: { opponentPlayers: ["Libero"], opponentLiberos: ["Libero"], opponentPlayerNumbers: {} },
    elLiberoTagsInlineOpp: container, document: { createElement: element },
    sortNamesByNumber: names => names, orderLiberosByPreference: names => names,
    getUsedNamesForScope: () => new Set(), formatNameWithNumberFor: name => name,
    handleBenchClickForScope: (name, scope) => { c.clicked = [name, scope]; }
  };
  for (const name of ["handleBenchDragStart", "handleBenchDragEnd", "handleBenchTouchMove", "handleBenchTouchEnd", "handleBenchTouchCancel"]) c[name] = () => {};
  load(c, roster, ["renderOpponentLiberoChipsInline"]);
  c.renderOpponentLiberoChipsInline();
  container.children[0].events.click();
  assert.deepEqual(c.clicked, ["Libero", "opponent"]);
  assert.deepEqual(c.state.opponentLiberos, ["Libero"]);
});
test("un roster senza liberi non ricarica quelli dell'archivio durante il render", () => {
  const c = load({ state: { opponentLiberos: [], selectedOpponentTeam: "Ospiti" },
    loadOpponentTeamFromStorage: () => assert.fail("Il render non deve ripristinare i liberi")
  }, roster, ["ensureOpponentLiberosFromTeam"]);
  c.ensureOpponentLiberosFromTeam();
});
test("il trascinamento touch non accetta posizioni sul campo dell'altra squadra", () => {
  const card = element();
  card.dataset = { posIndex: "2", teamScope: "our" };
  const c = load({ touchBenchScope: "opponent", touchBenchName: "Libero", touchBenchOverPos: 3,
    document: { elementFromPoint: () => ({ closest: () => card }), querySelector: () => null },
    canPlaceInSlotForScope: () => true
  }, roster, ["updateBenchTouchOver"]);
  c.updateBenchTouchOver(0, 0);
  assert.equal(c.touchBenchOverPos, -1);
  card.dataset.teamScope = "opponent";
  c.updateBenchTouchOver(0, 0);
  assert.equal(c.touchBenchOverPos, 2);
});
test("selezionare l'avversaria conserva tutte le riserve e salva la formazione finale", () => {
  const players = Array.from({ length: 10 }, (_, i) => `Ospite ${i}`);
  const c = {
    state: { selectedTeam: "Casa", selectedOpponentTeam: "Vecchia", useOpponentTeam: true, match: {}, autoRolePositioning: false },
    elOpponentTeamsSelect: { value: "Ospiti" }, hasMatchDataForReset: () => false,
    loadOpponentTeamFromStorage: () => ({}),
    extractRosterFromTeam: () => ({ players, liberos: [players[9]], numbers: {}, captains: [], defaultLineup: players.slice(0, 6), defaultRotation: 4 }),
    updateOpponentPlayersList: names => { c.state.opponentPlayers = names; return true; },
    saveState: () => { c.saved = plain(c.state); }
  };
  for (const name of ["updateOpponentTeamButtonsState", "applyMatchInfoToUI", "renderOpponentLiberoChipsInline", "renderOpponentPlayers", "renderOpponentTeamsSelect", "updateOpponentRotationDisplay"]) c[name] = () => {};
  load(c, roster, ["handleOpponentTeamSelectChange", "applyOpponentDefaultLineup"]);
  c.handleOpponentTeamSelectChange();
  assert.deepEqual(c.saved.opponentPlayers, players);
  assert.deepEqual(c.saved.opponentCourt.map(slot => slot.main), players.slice(0, 6));
  assert.equal(c.saved.opponentRotation, 4);
  assert.equal(c.saved.opponentPreferredLibero, players[9]);
  assert.equal(c.saved.match.opponent, "Ospiti");
  assert.equal(c.saved.opponentAutoRoleBaseCourt, null);
});
test("una selezione avversaria non valida conserva la selezione precedente", () => {
  const c = load({ state: { selectedTeam: "Casa", selectedOpponentTeam: "Ospiti" },
    elOpponentTeamsSelect: { value: "Casa" }, alert() {}, renderOpponentTeamsSelect() {}
  }, roster, ["handleOpponentTeamSelectChange"]);
  c.handleOpponentTeamSelectChange();
  assert.equal(c.state.selectedOpponentTeam, "Ospiti");
});

test("le etichette del prossimo set usano lo scope esplicito e non l'ultima finestra aperta", () => {
  const c = load({ state: { playerNumbers: { Casa: "casa" }, opponentPlayerNumbers: { Ospite: "8" }, opponentCaptains: [] },
    lineupModalScope: "our", formatNameWithNumber: () => "casa",
    formatNameWithNumberFor: (name, numbers) => numbers[name]
  }, scout, ["formatLineupModalName"]);
  assert.equal(c.formatLineupModalName("Ospite", { scope: "opponent" }), "8");
  c.lineupModalScope = "opponent";
  assert.equal(c.formatLineupModalName("Casa", { scope: "our" }), "casa");
});
test("il touch del prossimo set rifiuta il campo dell'altra squadra", () => {
  const card = element();
  card.dataset = { posIndex: "4", teamScope: "our" };
  card.closest = () => true;
  const c = load({ lineupTouchScope: "opponent", lineupTouchContext: "next-set", lineupTouchOverIdx: 2,
    document: { elementFromPoint: () => ({ closest: () => card }), querySelector: () => null }
  }, scout, ["updateLineupTouchOver"]);
  c.updateLineupTouchOver(0, 0);
  assert.equal(c.lineupTouchOverIdx, null);
  card.dataset.teamScope = "opponent";
  c.updateLineupTouchOver(0, 0);
  assert.equal(c.lineupTouchOverIdx, 4);
});

function managerContext(storageOnly = false) {
  const payload = { name: "Archivio", players: ["Ospite", "Riserva"], liberos: [], numbers: {}, captains: [],
    defaultLineup: ["Ospite"], defaultRotation: 3 };
  const c = {
    state: { selectedTeam: "Casa", selectedOpponentTeam: "In partita", useOpponentTeam: true,
      match: { opponent: "In partita" }, opponentPlayers: ["In campo"], autoRolePositioning: false },
    teamManagerLiveEditMode: false, teamManagerStorageOnly: storageOnly, teamManagerScope: "opponent",
    teamManagerState: { name: payload.name }, window: {}, collectTeamManagerPayload: () => payload,
    hasMatchDataForReset: () => false, compactTeamPayload: value => value,
    saveOpponentTeamToStorage: () => true, extractRosterFromTeam: value => value,
    updateOpponentPlayersList: names => { c.state.opponentPlayers = names; return true; },
    saveState: () => { c.saved = plain(c.state); }
  };
  for (const name of ["syncOpponentTeamsFromStorage", "renderTeamsSelect", "renderOpponentTeamsSelect", "applyMatchInfoToUI",
    "renderOpponentLiberoChipsInline", "renderOpponentPlayers", "updateOpponentRotationDisplay"]) c[name] = () => {};
  return load(c, roster, ["saveTeamManagerPayload", "applyOpponentDefaultLineup"]);
}
test("salvare l'avversaria applica e persiste anche titolari e rotazione predefiniti", () => {
  const c = managerContext();
  c.saveTeamManagerPayload({ closeModal: false, showAlert: false });
  assert.deepEqual(c.saved.opponentPlayers, ["Ospite", "Riserva"]);
  assert.equal(c.saved.opponentCourt[0].main, "Ospite");
  assert.equal(c.saved.opponentRotation, 3);
});
test("la modifica dell'archivio avversario non cambia l'identità o il roster del match", () => {
  const c = managerContext(true);
  const before = plain(c.state);
  c.saveTeamManagerPayload({ closeModal: false, showAlert: false });
  assert.deepEqual(c.saved, before);
});
