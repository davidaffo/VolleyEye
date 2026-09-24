import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const lifecycle = readFileSync(new URL("../js/scout/core/app-lifecycle.js", import.meta.url), "utf8");
const bindings = readFileSync(new URL("../js/scout/core/bindings-roster.js", import.meta.url), "utf8");
const stateStore = readFileSync(new URL("../js/roster/core/state-store.js", import.meta.url), "utf8");
const archive = readFileSync(new URL("../js/roster/storage/archive-actions.js", import.meta.url), "utf8");
const matchIo = readFileSync(new URL("../js/scout/io/match-io.js", import.meta.url), "utf8");

test("la lobby separa la scelta partita dagli strumenti del match", () => {
  assert.match(html, /data-tab-target="match">Partite<\/button>/);
  assert.match(html, /id="btn-load-match">Entra nella partita<\/button>/);
  assert.match(html, /class="tab-btn match-session-only" data-tab-target="scout"/);
  assert.match(html, /class="tab-btn match-session-only" data-tab-target="aggregated"/);
  assert.match(html, /class="tab-btn match-session-only" data-tab-target="video"/);
});

test("entrare e uscire dalla partita è un passaggio esplicito e persistito", () => {
  assert.match(lifecycle, /function enterSelectedMatch\(\)/);
  assert.match(lifecycle, /state\.uiMatchSessionActive = true/);
  assert.match(lifecycle, /function exitCurrentMatch\(\)/);
  assert.match(lifecycle, /state\.uiMatchSessionActive = false/);
  assert.match(bindings, /querySelectorAll\("\[data-exit-match\]"\)/);
  assert.match(stateStore, /uiMatchSessionActive: snapshot\.uiMatchSessionActive === true/);
});

test("selezionare una riga in lobby non carica la partita", () => {
  const listHandler = bindings.slice(
    bindings.indexOf('if (elSavedMatchesList)'),
    bindings.indexOf('document.querySelectorAll("[data-edit-match]")')
  );
  assert.doesNotMatch(listHandler, /loadSelectedMatch\(\)/);
  assert.doesNotMatch(listHandler, /enterSelectedMatch\(\)/);
});

test("le impostazioni restano raggiungibili sia dentro sia fuori dalla partita", () => {
  assert.match(html, /class="tab-btn global-settings-btn" data-tab-target="info">Impostazioni<\/button>/);
  assert.match(lifecycle, /const isGlobalTarget = target === "info"/);
  assert.match(lifecycle, /!\["match", "info"\]\.includes\(target\)/);
});

test("le squadre vengono scelte soltanto nel flusso di creazione", () => {
  const lobby = html.slice(html.indexOf('data-tab="match"'), html.indexOf('data-tab="info"'));
  assert.doesNotMatch(lobby, /id="saved-teams"|id="saved-opponent-teams"|id="use-opponent-team-toggle"/);
  assert.match(lobby, /<h4>Archivio squadre<\/h4>/);
  assert.match(lobby, /id="btn-open-teams-manager"/);
  assert.match(html, /id="new-match-team"/);
  assert.match(html, /name="new-match-mode" value="single"/);
  assert.match(html, /name="new-match-mode" value="double"/);
  assert.match(archive, /function createNewMatchFromSetup\(setup = \{\}\)/);
  assert.match(archive, /handleTeamSelectChange\(teamName\)/);
  assert.match(archive, /handleOpponentTeamSelectChange\(opponentTeam\)/);
});

test("le impostazioni di scouting avversario sono globali", () => {
  const settings = html.slice(html.indexOf('data-tab="info"'), html.indexOf('data-tab="scout"'));
  assert.doesNotMatch(settings, /id="btn-open-teams-manager"/);
  assert.match(settings, /id="opponent-skill-serve"/);
  assert.match(settings, /id="opponent-skill-block"/);
  assert.match(matchIo, /preservedOpponentSkillConfig/);
  assert.match(matchIo, /merged\.opponentSkillConfig = cloneIsolationData\(preservedOpponentSkillConfig\)/);
});

test("la selezione del tema è disponibile in lobby e nelle impostazioni", () => {
  const lobby = html.slice(html.indexOf('data-tab="match"'), html.indexOf('data-tab="info"'));
  const settings = html.slice(html.indexOf('data-tab="info"'), html.indexOf('data-tab="scout"'));
  assert.match(lobby, /id="theme-auto-lobby"/);
  assert.match(lobby, /id="theme-dark-lobby"/);
  assert.match(lobby, /id="theme-light-lobby"/);
  assert.match(settings, /id="theme-auto"/);
  assert.match(settings, /id="theme-dark"/);
  assert.match(settings, /id="theme-light"/);
});

test("le azioni sono raggruppate per match e database", () => {
  const lobby = html.slice(html.indexOf('data-tab="match"'), html.indexOf('data-tab="info"'));
  const savedMatchesPanel = lobby.slice(
    lobby.indexOf("<h4>Match salvati</h4>"),
    lobby.indexOf("<h4>Archivio squadre</h4>")
  );
  const databasePanel = lobby.slice(lobby.indexOf("<h4>Azioni database</h4>"));
  ["btn-reset-match", "btn-export-match", "btn-export-dvw", "btn-import-match"].forEach(id => {
    assert.match(savedMatchesPanel, new RegExp(`id="${id}"`));
    assert.doesNotMatch(databasePanel, new RegExp(`id="${id}"`));
  });
  assert.doesNotMatch(savedMatchesPanel, /import-match-url|btn-import-match-url/);
  assert.match(databasePanel, /id="import-db-url"/);
  assert.match(databasePanel, /id="btn-export-db"/);
  assert.match(databasePanel, /id="btn-import-db"/);
});
