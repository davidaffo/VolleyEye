import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";

const isolationSource = readFileSync(new URL("../js/shared/state-isolation.js", import.meta.url), "utf8");
const context = { structuredClone };
context.self = context;
vm.runInNewContext(
  readFileSync(new URL("../js/shared/namespace.js", import.meta.url), "utf8"),
  context
);
vm.runInNewContext(isolationSource, context);
const isolation = context.VolleyEye.stateIsolation;
const plain = value => JSON.parse(JSON.stringify(value));

test("cloneData separa completamente snapshot e stato vivo", () => {
  const live = {
    players: ["Rossi Anna"],
    court: [{ main: "Rossi Anna" }],
    events: [{ playerName: "Rossi Anna", meta: { code: "#" } }]
  };
  const snapshot = isolation.cloneData(live);
  snapshot.players.push("Verdi Sara");
  snapshot.court[0].main = "Verdi Sara";
  snapshot.events[0].meta.code = "=";
  assert.deepEqual(live, {
    players: ["Rossi Anna"],
    court: [{ main: "Rossi Anna" }],
    events: [{ playerName: "Rossi Anna", meta: { code: "#" } }]
  });
});

test("sanitizeRosterScope elimina ogni riferimento esterno al roster", () => {
  const state = {
    players: ["Rossi Anna", "Verdi Sara"],
    playerNumbers: { "Rossi Anna": "2", Estranea: "99" },
    liberos: ["Verdi Sara", "Estranea"],
    captains: ["Rossi Anna", "Verdi Sara", "Estranea"],
    preferredLibero: "Estranea",
    court: [{ main: "Estranea", replaced: "Rossi Anna" }],
    autoRoleBaseCourt: [{ main: "Estranea" }],
    liberoAutoMap: { "Rossi Anna": "Verdi Sara", Estranea: "Verdi Sara" }
  };
  isolation.sanitizeRosterScope(state, "our");
  assert.deepEqual(plain(state.playerNumbers), { "Rossi Anna": "2" });
  assert.deepEqual(plain(state.liberos), ["Verdi Sara"]);
  assert.deepEqual(plain(state.captains), ["Rossi Anna"]);
  assert.equal(state.preferredLibero, "Verdi Sara");
  assert.equal(state.court.length, 6);
  assert.deepEqual(plain(state.court[0]), { main: "", replaced: "" });
  assert.deepEqual(plain(state.autoRoleBaseCourt[0]), { main: "", replaced: "" });
  assert.deepEqual(plain(state.liberoAutoMap), { "Rossi Anna": "Verdi Sara" });
});

test("sanificare l'avversaria non modifica la squadra principale", () => {
  const state = {
    players: ["Casa Uno"],
    playerNumbers: { "Casa Uno": "1" },
    liberos: [],
    captains: [],
    court: [{ main: "Casa Uno" }],
    autoRoleBaseCourt: [],
    liberoAutoMap: {},
    opponentPlayers: ["Ospite Uno"],
    opponentPlayerNumbers: { "Ospite Uno": "7", Intrusa: "8" },
    opponentLiberos: ["Intrusa"],
    opponentCaptains: ["Intrusa"],
    opponentCourt: [{ main: "Intrusa" }],
    opponentAutoRoleBaseCourt: [],
    opponentLiberoAutoMap: {}
  };
  const ourBefore = isolation.cloneData({
    players: state.players,
    numbers: state.playerNumbers,
    court: state.court
  });
  isolation.sanitizeRosterScope(state, "opponent");
  assert.deepEqual(
    { players: state.players, numbers: state.playerNumbers, court: state.court },
    ourBefore
  );
  assert.deepEqual(plain(state.opponentLiberos), []);
  assert.equal(state.opponentCourt[0].main, "");
});

test("sanitizeRosterScope normalizza nomi vuoti e duplicati", () => {
  const state = {
    players: ["  Rossi   Anna ", "", null, "Rossi Anna", "ROSSI ANNA", "Verdi Sara"],
    playerNumbers: {},
    liberos: [],
    captains: [],
    court: [],
    autoRoleBaseCourt: [],
    liberoAutoMap: {}
  };
  isolation.sanitizeRosterScope(state, "our");
  assert.deepEqual(plain(state.players), ["Rossi Anna", "Verdi Sara"]);
});

test("sanitizeRosterScope impedisce duplicati e coppie autoreferenziali in campo", () => {
  const state = {
    players: ["A", "B", "L"],
    playerNumbers: {},
    liberos: ["L"],
    captains: [],
    court: [
      { main: "L", replaced: "L" },
      { main: "A", replaced: "B" },
      { main: "A", replaced: "" }
    ],
    autoRoleBaseCourt: [],
    liberoAutoMap: {}
  };
  isolation.sanitizeRosterScope(state, "our");
  assert.deepEqual(plain(state.court.slice(0, 3)), [
    { main: "L", replaced: "" },
    { main: "A", replaced: "" },
    { main: "", replaced: "" }
  ]);
});

test("i confini applicativi non reintroducono sincronizzazioni implicite", () => {
  const scout = readScoutSource();
  const roster = readRosterSource();
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  const renderPlayersBody = scout.slice(
    scout.indexOf("function renderPlayers()"),
    scout.indexOf("function renderPlayersManagerList()")
  );
  const matchPayloadBody = scout.slice(
    scout.indexOf("function buildMatchExportPayload()"),
    scout.indexOf("function buildDatabaseBackupPayload()")
  );
  const teamSelectRenderBody = roster.slice(
    roster.indexOf("function renderTeamsSelect()"),
    roster.indexOf("function renderOpponentTeamsSelect()")
  );
  const opponentSelectRenderBody = roster.slice(
    roster.indexOf("function renderOpponentTeamsSelect()"),
    roster.indexOf("function hasMatchDataForReset()")
  );
  assert.doesNotMatch(renderPlayersBody, /syncRosterFromSelectedTeamIfNeeded\s*\(/);
  assert.doesNotMatch(matchPayloadBody, /savedTeams\s*:/);
  assert.doesNotMatch(teamSelectRenderBody, /state\.selectedTeam\s*=/);
  assert.doesNotMatch(teamSelectRenderBody, /state\.match\.teamName\s*=/);
  assert.doesNotMatch(opponentSelectRenderBody, /state\.selectedOpponentTeam\s*=/);
  assert.match(teamSelectRenderBody, /renderArchivedTeamsSelect\s*\(/);
  assert.match(opponentSelectRenderBody, /renderArchivedTeamsSelect\s*\(/);
  assert.doesNotMatch(opponentSelectRenderBody, /\.filter\s*\(.*state\.selectedTeam/);
  assert.match(roster, /teamManagerStorageOnly\s*=\s*true/);
  assert.match(roster, /players:\s*\[\],\s*\n\s*defaultLineup:\s*\[\]/);
  assert.match(roster, /applyLiveOpponentTeamManagerPayload/);
  assert.match(roster, /applyLiveTeamManagerPayload\(payload, liveCurrentPayload\)/);
  assert.match(roster, /applyLiveOpponentTeamManagerPayload\(payload, liveCurrentPayload\)/);
  assert.ok(index.indexOf("js/shared/namespace.js") < index.indexOf("js/shared/state-isolation.js"));
  assert.ok(index.indexOf("js/shared/state-isolation.js") < index.indexOf("js/roster-lineup.js"));
  assert.match(serviceWorker, /js\/shared\/state-isolation\.js/);
  assert.doesNotMatch(
    scout.slice(scout.indexOf("function handleImportMatchFile"), scout.indexOf("function readMatchLinkParam")),
    /saveTeamToStorage\s*\(/
  );
  assert.match(scout, /merged\.setResults\s*=\s*nextState\.setResults[\s\S]*?\?\s*nextState\.setResults\s*:\s*\{\}/);
  assert.match(scout, /merged\.opponentCourt\s*=\s*Array\.isArray\(nextState\.opponentCourt\)/);
  assert.doesNotMatch(scout, /merged\.selectedTeam\s*=\s*nextState\.selectedTeam\s*\|\|\s*state\.selectedTeam/);
});

test("l'elenco avversarie conserva tutte le squadre e disabilita solo quella principale", () => {
  const roster = readRosterSource();
  const start = roster.indexOf("function buildArchivedTeamOptions(");
  const end = roster.indexOf("function renderArchivedTeamsSelect(", start);
  const selectContext = {};
  vm.runInNewContext(`${roster.slice(start, end)}; this.buildOptions = buildArchivedTeamOptions;`, selectContext);
  const options = plain(selectContext.buildOptions(["Volley Blu", "Volley Rossa", "Volley Verde"], "Volley Blu"));
  assert.deepEqual(options.map(option => option.value), ["Volley Blu", "Volley Rossa", "Volley Verde"]);
  assert.deepEqual(options.map(option => option.disabled), [true, false, false]);
  assert.equal(options[0].label, "Volley Blu (squadra principale)");
});

test("i selettori non costruiscono squadre fantasma assenti dall'archivio", () => {
  const roster = readRosterSource();
  const renderer = roster.slice(
    roster.indexOf("function renderArchivedTeamsSelect"),
    roster.indexOf("function renderTeamsSelect")
  );
  assert.doesNotMatch(renderer, /non in archivio/);
  assert.doesNotMatch(renderer, /createElement\("option"\)[\s\S]*missing/);
  assert.match(renderer, /teamOptions\.some\(option => option\.value === requestedName && !option\.disabled\)/);
});
