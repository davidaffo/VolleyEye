import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("tutti gli asset delle traiettorie usati a runtime esistono e sono disponibili offline", () => {
  const scout = readScoutSource();
  const worker = read("service-worker.js");
  const assets = new Set(
    [...scout.matchAll(/["'`](images\/trajectory\/[^"'`]+\.png)["'`]/g)].map(match => match[1])
  );
  for (const asset of assets) {
    if (asset.includes("${")) continue;
    assert.equal(existsSync(new URL(`../${asset}`, import.meta.url)), true, `${asset} non esiste`);
    assert.match(worker, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${asset} non è in cache`);
  }
});

test("il service worker non memorizza risposte HTTP fallite", () => {
  const worker = read("service-worker.js");
  assert.equal((worker.match(/cache\.put\(request, copy\)/g) || []).length, 3);
  assert.equal((worker.match(/response\s*&&\s*response\.ok/g) || []).length, 3);
});

test("il payload squadra compatto ricostruisce i numeri dai dettagli", () => {
  const roster = readRosterSource();
  const normalizeBlock = roster.slice(
    roster.indexOf("function normalizeTeamPayload"),
    roster.indexOf("function loadTeamNormalized")
  );
  assert.match(normalizeBlock, /numbers\[player\.name\]\s*=\s*String\(player\.number\)/);
  const ourPayload = roster.slice(
    roster.indexOf("function getCurrentTeamPayload"),
    roster.indexOf("function getCurrentOpponentPayload")
  );
  assert.doesNotMatch(ourPayload, /state\.match\.opponent/);
  assert.match(ourPayload, /activePlayers\s*\.map/);
  assert.match(ourPayload, /out:\s*true/);
  const opponentPayload = roster.slice(
    roster.indexOf("function getCurrentOpponentPayload"),
    roster.indexOf("function saveCurrentTeam")
  );
  assert.match(opponentPayload, /existing\?\.staff/);
  assert.match(opponentPayload, /defaultLineup/);
  assert.match(opponentPayload, /defaultRotation/);
  assert.match(opponentPayload, /out:\s*true/);
});

test("rinominare una giocatrice non modifica eventi dell'altra squadra", () => {
  const roster = readRosterSource();
  const ourRename = roster.slice(
    roster.indexOf("function replacePlayerNameEverywhere"),
    roster.indexOf("function replacePlayerNameInLineup")
  );
  assert.match(ourRename, /if \(scope !== "our"\) return/);
  assert.match(ourRename, /ev\.playerIn === oldName/);
  assert.match(ourRename, /setStart\.our\.court/);
  const opponentRename = roster.slice(
    roster.indexOf("function replaceOpponentPlayerNameEverywhere"),
    roster.indexOf("function renameOpponentPlayerAcrossCurrentMatchById")
  );
  assert.match(opponentRename, /scope !== "opponent"/);
  assert.match(opponentRename, /event\.playerOut === oldName/);
  assert.match(opponentRename, /setStart\.opponent\.court/);
});

test("reset e cambio match eliminano ogni riferimento al vecchio video", () => {
  const roster = readRosterSource();
  const scout = readScoutSource();
  const resetRoster = roster.slice(roster.indexOf("function resetMatchState"), roster.indexOf("function renameSelectedTeam"));
  const resetScout = scout.slice(scout.indexOf("function resetMatch()"), scout.indexOf("function deleteIndexedDbByName"));
  for (const block of [resetRoster, resetScout]) {
    assert.match(block, /state\.video\s*=\s*\{/);
    assert.doesNotMatch(block, /state\.video\s*=\s*state\.video\s*\|\|/);
    assert.match(block, /fileName:\s*""/);
    assert.match(block, /lastPlaybackSeconds:\s*0/);
  }
});

test("l'annullamento del cambio set ripristina anche orologi e stato controlli", () => {
  const scout = readScoutSource();
  const undo = scout.slice(scout.indexOf("function undoLastEvent"), scout.indexOf("function deleteEventByKey"));
  const structural = undo.slice(undo.indexOf('if (ev.actionType === "set-change"'), undo.indexOf("if (ev && ev.autoRotationDirection)"));
  assert.match(structural, /restoreSkillClock/);
  assert.match(structural, /restoreVideoClock/);
  assert.match(structural, /updateMatchStatusUI/);
  assert.match(structural, /updateSetScoreDisplays/);
});

test("timeout, cambi e annullamento rispettano lo scope della squadra", () => {
  const scout = readScoutSource();
  assert.match(
    scout,
    /recordSetAction\("timeout",\s*\{[^}]*code:\s*"TOA"[^}]*teamScope:\s*"opponent"/
  );
  assert.match(scout, /getSubstitutionCountForSet\(setNum,\s*"our"\)/);
  assert.match(scout, /getSubstitutionCountForSet\(setNum,\s*"opponent"\)/);
  const saveLineup = scout.slice(scout.indexOf("function saveLineupModal"), scout.indexOf("function closeCurrentEdit"));
  assert.doesNotMatch(saveLineup, /countSubstitutions\s*&&\s*lineupModalScope\s*!==\s*"opponent"/);
  assert.match(saveLineup, /teamScope:\s*scope/);
  const undo = scout.slice(scout.indexOf("function undoSubstitutionEvent"), scout.indexOf("function applyAggColumnsVisibility"));
  assert.match(undo, /state\.opponentCourt/);
  assert.match(undo, /commitCourtChangeForScope\(nextCourt,\s*"opponent"\)/);
});

test("l'import database segnala i salvataggi parziali senza doppio messaggio di successo", () => {
  const scout = readScoutSource();
  const applyImport = scout.slice(
    scout.indexOf("async function applyImportedDatabase"),
    scout.indexOf("function buildUniqueImportedMatchName")
  );
  assert.match(applyImport, /Array\.isArray\(imported\.players\)/);
  assert.match(applyImport, /Array\.isArray\(imported\.events\)/);
  assert.match(applyImport, /failedWrites/);
  assert.match(applyImport, /if \(!saveTeamToStorage/);
  assert.match(applyImport, /if \(!saveMatchToStorage/);
  assert.match(applyImport, /if \(!savePlayersDbToStorage/);
  const urlImport = scout.slice(
    scout.indexOf("async function importDatabaseFromUrl"),
    scout.indexOf("function buildAggregatedDataForPdf")
  );
  assert.doesNotMatch(urlImport, /alert\("Database importato da URL\."\)/);
});

test("l'import DataVolley usa formazione e rotazioni finali senza archiviare squadre", () => {
  const scout = readScoutSource();
  const parser = scout.slice(
    scout.indexOf("function parseDataVolleyDvwToMatchState"),
    scout.indexOf("function handleImportMatchFile")
  );
  assert.match(parser, /lastAwayCourt\s*=\s*applyDvSubstitution/);
  assert.match(parser, /court:\s*cloneDvCourt\(lastHomeCourt\)/);
  assert.match(parser, /opponentCourt:\s*cloneDvCourt\(lastAwayCourt\)/);
  assert.match(parser, /rotation:\s*Math\.min\(6,\s*Math\.max\(1,\s*lastHomeRotation/);
});
