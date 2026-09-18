import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const demo = JSON.parse(readFileSync(new URL("../match_demo.json", import.meta.url), "utf8"));
const state = demo.state;
const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const playerName = player => [player.lastName, player.firstName].filter(Boolean).join(" ").trim();
const activeTeamNames = team =>
  new Set((team.playersDetailed || []).filter(player => !player.out).map(playerName).filter(Boolean));

test("la demo installa almeno due squadre distinte e attiva la modalità doppia", () => {
  const teams = state.savedTeams || {};
  assert.ok(Object.keys(teams).length >= 2);
  assert.equal(state.useOpponentTeam, true);
  assert.notEqual(state.selectedTeam, state.selectedOpponentTeam);
  assert.ok(teams[state.selectedTeam]);
  assert.ok(teams[state.selectedOpponentTeam]);
  assert.equal(state.match.teamName, state.selectedTeam);
  assert.equal(state.match.opponent, state.selectedOpponentTeam);
});

test("roster e formazioni demo restano confinati nel proprio lato", () => {
  const ourRoster = new Set(state.players);
  const opponentRoster = new Set(state.opponentPlayers);
  assert.ok(ourRoster.size > 6);
  assert.ok(opponentRoster.size > 6);
  assert.deepEqual([...ourRoster].filter(name => opponentRoster.has(name)), []);

  const assertCourt = (court, roster, label) => {
    assert.equal(court.length, 6, `${label}: il campo deve avere sei posizioni`);
    const names = court.map(slot => slot.main);
    assert.equal(new Set(names).size, 6, `${label}: nessun doppione in campo`);
    for (const slot of court) {
      assert.ok(roster.has(slot.main), `${label}: ${slot.main} non appartiene al roster`);
      if (slot.replaced) assert.ok(roster.has(slot.replaced), `${label}: sostituito estraneo al roster`);
    }
  };

  assertCourt(state.court, ourRoster, "Aurora");
  assertCourt(state.opponentCourt, opponentRoster, "Riviera");
  for (const [setNumber, start] of Object.entries(state.setStarts || {})) {
    assertCourt(start.our.court, ourRoster, `set ${setNumber} Aurora`);
    assertCourt(start.opponent.court, opponentRoster, `set ${setNumber} Riviera`);
  }
});

test("le squadre archiviate hanno una formazione predefinita valida", () => {
  for (const teamName of [state.selectedTeam, state.selectedOpponentTeam]) {
    const team = state.savedTeams[teamName];
    const roster = activeTeamNames(team);
    assert.equal(team.defaultLineup.length, 6, `${teamName}: formazione incompleta`);
    assert.equal(new Set(team.defaultLineup).size, 6, `${teamName}: formazione duplicata`);
    team.defaultLineup.forEach(name => assert.ok(roster.has(name), `${teamName}: ${name} non è in rosa`));
  }
});

test("il caricamento iniziale salva le squadre demo prima di applicare il match", () => {
  const loader = source.slice(
    source.indexOf("async function loadDefaultDemoMatch"),
    source.indexOf("function showDefaultDemoWelcomePopup")
  );
  assert.match(loader, /for \(const teamName of DEFAULT_DEMO_TEAM_NAMES\)/);
  assert.doesNotMatch(loader, /Object\.entries\(demoTeams\)/);
  assert.match(loader, /saveTeamToStorage\(teamName, teamPayload\)/);
  assert.ok(loader.indexOf("saveTeamToStorage") < loader.indexOf("applyImportedMatch"));
});

test("al primo caricamento viene chiesto se conservare o eliminare le demo", () => {
  const chooser = source.slice(
    source.indexOf("function askDefaultDemoChoice"),
    source.indexOf("function applyImportedDatabase")
  );
  assert.match(chooser, /Usa le demo/);
  assert.match(chooser, /Non usare ed elimina/);
  assert.match(chooser, /removeDefaultDemoData\(\{ askConfirmation: false, showResult: false \}\)/);
  assert.match(source, /getDefaultDemoPreference\(\) !== "removed"/);
  assert.match(source, /await showDefaultDemoWelcomePopup\(\)/);
});

test("la gestione dati espone il comando dedicato per cancellare le demo", () => {
  assert.match(html, /id="btn-delete-demo-data"[^>]*>Cancella dati demo</);
  assert.match(source, /elBtnDeleteDemoData\.addEventListener\("click"/);
  const remover = source.slice(
    source.indexOf("function removeDefaultDemoData"),
    source.indexOf("async function loadDefaultDemoMatch")
  );
  assert.match(remover, /deleteMatchFromStorage\(DEFAULT_DEMO_MATCH_NAME\)/);
  assert.match(remover, /DEFAULT_DEMO_TEAM_NAMES\.forEach/);
  assert.match(remover, /deleteTeamFromStorage\(name\)/);
  assert.match(remover, /setDefaultDemoPreference\("removed"\)/);
  assert.match(remover, /updateDefaultDemoDeleteButtonVisibility\(\)/);
});

test("il pacchetto demo contiene soltanto le due squadre utilizzate", () => {
  assert.deepEqual(Object.keys(state.savedTeams || {}).sort(), [state.selectedOpponentTeam, state.selectedTeam].sort());
  assert.deepEqual(Object.keys(state.savedOpponentTeams || {}).sort(), [state.selectedOpponentTeam, state.selectedTeam].sort());
});

test("la pulizia del match demo non lascia riferimenti a squadre eliminate", () => {
  const start = source.indexOf("function clearActiveDefaultDemoMatch");
  const end = source.indexOf("function removeDefaultDemoPlayersFromDatabase", start);
  const context = {
    state: {
      selectedMatch: "Match demo - Aurora Volley - Riviera Volley",
      loadedMatchName: "Match demo - Aurora Volley - Riviera Volley",
      selectedTeam: "Aurora Volley Demo",
      selectedOpponentTeam: "Riviera Volley Demo",
      useOpponentTeam: true,
      players: ["Demo Uno"],
      opponentPlayers: ["Demo Due"],
      match: { teamName: "Aurora Volley Demo", opponent: "Riviera Volley Demo" }
    },
    DEFAULT_DEMO_MATCH_NAME: "Match demo - Aurora Volley - Riviera Volley",
    Array,
    String,
    updateOpponentAutoRoleBaseCourtCache: () => {},
    resetMatchState: () => {
      context.state.match = {
        teamName: context.state.selectedTeam || context.state.match.teamName || "",
        opponent: ""
      };
    }
  };
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(context.clearActiveDefaultDemoMatch(), true);
  assert.equal(context.state.selectedTeam, "");
  assert.equal(context.state.selectedOpponentTeam, "");
  assert.equal(context.state.match.teamName, "");
  assert.equal(context.state.useOpponentTeam, false);
  assert.equal(context.state.players.length, 0);
  assert.equal(context.state.opponentPlayers.length, 0);
});

test("il tasto di cancellazione sparisce quando i dati demo non esistono", () => {
  assert.match(html, /id="btn-delete-demo-data"[^>]*class="[^"]*hidden/);
  const visibility = source.slice(
    source.indexOf("function hasDefaultDemoData"),
    source.indexOf("function removeDefaultDemoPlayersFromDatabase")
  );
  assert.match(visibility, /getDefaultDemoPreference\(\) !== "removed"/);
  assert.match(visibility, /hasDefaultDemoData\(\)/);
  assert.match(visibility, /classList\.toggle\("hidden", !visible\)/);
  assert.match(source, /updateDefaultDemoDeleteButtonVisibility\(\);/);
});

test("cancellare le demo conserva le giocatrici referenziate da altre squadre", () => {
  const start = source.indexOf("function removeDefaultDemoPlayersFromDatabase");
  const end = source.indexOf("function removeDefaultDemoData", start);
  assert.ok(start >= 0 && end > start);
  const playersDb = {
    shared: { id: "shared", name: "Condivisa" },
    demoOnly: { id: "demoOnly", name: "Solo demo" },
    userOnly: { id: "userOnly", name: "Solo utente" }
  };
  let savedDb = null;
  const context = {
    state: {},
    Set,
    Object,
    Array,
    loadPlayersDbFromStorage: () => ({ ...playersDb }),
    savePlayersDbToStorage: db => { savedDb = { ...db }; },
    loadTeamsMapFromStorage: () => ({
      Utente: { playersDetailed: [{ id: "shared" }, { id: "userOnly" }] }
    }),
    cloneIsolationData: value => JSON.parse(JSON.stringify(value))
  };
  vm.runInNewContext(source.slice(start, end), context);
  context.removeDefaultDemoPlayersFromDatabase([
    { playersDetailed: [{ id: "shared" }, { id: "demoOnly" }] }
  ]);
  assert.deepEqual(Object.keys(savedDb).sort(), ["shared", "userOnly"]);
});
