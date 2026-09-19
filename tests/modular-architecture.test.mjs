import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { ROSTER_SOURCE_FILES } from "./helpers/roster-source.mjs";
import { SCOUT_SOURCE_FILES } from "./helpers/scout-source.mjs";
import { STYLE_SOURCE_FILES } from "./helpers/style-source.mjs";

const rootUrl = new URL("../", import.meta.url);
const index = readFileSync(new URL("index.html", rootUrl), "utf8");
const worker = readFileSync(new URL("service-worker.js", rootUrl), "utf8");
const read = path => readFileSync(new URL(path, rootUrl), "utf8");

test("tutti i moduli applicativi sono caricati e disponibili offline nello stesso ordine", () => {
  const runtimeFiles = [
    ...ROSTER_SOURCE_FILES.map(path => `js/${path}`),
    ...SCOUT_SOURCE_FILES.map(path => `js/${path}`)
  ];
  let previousIndex = -1;
  runtimeFiles.forEach(path => {
    assert.equal(existsSync(new URL(path, rootUrl)), true, `${path} non esiste`);
    const currentIndex = index.indexOf(`"${path}"`);
    assert.ok(currentIndex > previousIndex, `${path} non rispetta l'ordine di caricamento`);
    assert.match(worker, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    previousIndex = currentIndex;
  });
});

test("i fogli UI modulari mantengono ordine e disponibilità offline", () => {
  let previousIndex = -1;
  STYLE_SOURCE_FILES.forEach(path => {
    assert.equal(existsSync(new URL(path, rootUrl)), true, `${path} non esiste`);
    const currentIndex = index.indexOf(`"${path}"`);
    assert.ok(currentIndex > previousIndex, `${path} non rispetta la cascata dichiarata`);
    assert.match(worker, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    previousIndex = currentIndex;
  });
});

test("nessun modulo ricrea i monoliti rimossi", () => {
  [...ROSTER_SOURCE_FILES, ...SCOUT_SOURCE_FILES].forEach(path => {
    const lines = read(`js/${path}`).split("\n").length;
    assert.ok(lines <= 1500, `${path} ha ${lines} righe`);
  });
  STYLE_SOURCE_FILES.forEach(path => {
    const lines = read(path).split("\n").length;
    assert.ok(lines <= 1800, `${path} ha ${lines} righe`);
  });
});

test("il flusso di gioco ha un modulo identificabile e isolato dall'entrypoint", () => {
  const entrypoint = read("js/scout-ui.js");
  const flow = read("js/scout/live/game-flow.js");
  assert.match(flow, /function computeTwoTeamFlowFromEvent/);
  assert.match(flow, /function getAutoFlowState/);
  assert.match(flow, /function getPredictedSkillIdForScope/);
  assert.doesNotMatch(entrypoint, /function getAutoFlowState/);
});

test("il bootstrap orchestra moduli di binding senza ricreare una init monolitica", () => {
  const bootstrap = read("js/scout/core/bootstrap.js");
  assert.ok(bootstrap.split("\n").length < 80);
  assert.match(bootstrap, /initializeApplicationState\(\)/);
  assert.match(bootstrap, /bindRosterAndArchiveControls\(\)/);
  assert.match(bootstrap, /bindScoutSettingsControls\(\)/);
  assert.match(bootstrap, /bindVideoControls\(\)/);
  assert.match(bootstrap, /finalizeApplicationBootstrap\(context\)/);
});

test("le API condivise usano un solo namespace senza alias globali legacy", () => {
  const shared = [
    "js/shared/lineup-core.js",
    "js/shared/auto-role.js",
    "js/shared/state-isolation.js",
    "js/shared/team-ui.js",
    "js/shared/roster-manager.js",
    "js/match-settings.js",
    "js/opponent-settings.js"
  ].map(read).join("\n");
  assert.match(shared, /VolleyEye\.lineup/);
  assert.match(shared, /VolleyEye\.stateIsolation/);
  assert.match(shared, /VolleyEye\.roster/);
  assert.doesNotMatch(shared, /windowObj\.(?:LineupCore|AutoRole|TeamUI|RosterManager|OpponentSettings)\s*=/);
  assert.doesNotMatch(shared, /windowObj\.createMatchSettings\s*=/);
  const runtime = read("js/roster-lineup.js") + readScoutSourceForGlobalGuard();
  assert.doesNotMatch(
    runtime,
    /window\.(?:buildAutoRolePermutation|applyPhasePermutation|setGlobalModalState|hasUsableMatch|createNewMatchFromPrompt|_closeSkillModal)\s*=/
  );
});

function readScoutSourceForGlobalGuard() {
  return SCOUT_SOURCE_FILES.map(path => read(`js/${path}`)).join("\n");
}
