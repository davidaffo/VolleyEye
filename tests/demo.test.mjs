import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const demo = JSON.parse(readFileSync(new URL("../match_demo.json", import.meta.url), "utf8"));
const state = demo.state;

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
  const source = readFileSync(new URL("../js/scout-ui.js", import.meta.url), "utf8");
  const loader = source.slice(
    source.indexOf("async function loadDefaultDemoMatch"),
    source.indexOf("function showDefaultDemoWelcomePopup")
  );
  assert.match(loader, /Object\.entries\(demoTeams\)/);
  assert.match(loader, /saveTeamToStorage\(teamName, teamPayload\)/);
  assert.ok(loader.indexOf("saveTeamToStorage") < loader.indexOf("applyImportedMatch"));
});
