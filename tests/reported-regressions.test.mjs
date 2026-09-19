import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const scout = readScoutSource();
const roster = readRosterSource();
const css = readStyleSource();
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const viewer = readFileSync(new URL("../docs/markdown-viewer.html", import.meta.url), "utf8");
const teamEditor = readFileSync(new URL("../js/roster/editor/team-editor.js", import.meta.url), "utf8");

function extract(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `sezione non trovata: ${start}`);
  return source.slice(from, to);
}

test("il flusso doppia squadra ignora gli override residui e segue l'ultimo evento", () => {
  const source = [
    extract(scout, "function computeTwoTeamFlowFromEvent", "function getLastFlowEvent"),
    extract(scout, "function getLastFlowEvent", "function getActiveServerName"),
    extract(scout, "function resolveFlowSkillForScope", "function getAutoFlowState"),
    extract(scout, "function getAutoFlowState", "function getMobileActiveScope")
  ].join("\n");
  const state = {
    useOpponentTeam: true,
    predictiveSkillFlow: true,
    isServing: true,
    events: [{ team: "our", skillId: "attack", code: "+" }],
    pendingServe: null,
    skillFlowOverride: "serve",
    opponentSkillFlowOverride: null,
    forceSkillActive: false,
    forceSkillScope: null,
    freeballPending: false,
    opponentSkillConfig: {}
  };
  const context = {
    state,
    SKILLS: ["serve", "pass", "second", "attack", "block", "defense"].map(id => ({ id })),
    getTeamScopeFromEvent: event => event.team === "opponent" ? "opponent" : "our",
    getOppositeScope: scope => scope === "opponent" ? "our" : "opponent",
    getPointDirection: () => null,
    isSkillEnabledForScope: () => true,
    getFreeballStartSkill: () => "second"
  };
  vm.runInNewContext(source, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.getAutoFlowState())), {
    teamScope: "opponent",
    skillId: "defense"
  });
});

test("la battuta in coda apre sempre la ricezione opposta", () => {
  const source = [
    extract(scout, "function computeTwoTeamFlowFromEvent", "function getLastFlowEvent"),
    extract(scout, "function getLastFlowEvent", "function getActiveServerName"),
    extract(scout, "function resolveFlowSkillForScope", "function getAutoFlowState"),
    extract(scout, "function getAutoFlowState", "function getMobileActiveScope")
  ].join("\n");
  const state = {
    useOpponentTeam: true,
    predictiveSkillFlow: true,
    isServing: true,
    events: [],
    pendingServe: { scope: "our", playerName: "Rossi" },
    skillFlowOverride: "serve",
    opponentSkillFlowOverride: "attack",
    forceSkillActive: false,
    forceSkillScope: null,
    freeballPending: false,
    opponentSkillConfig: {}
  };
  const context = {
    state,
    SKILLS: ["serve", "pass", "second", "attack", "block", "defense"].map(id => ({ id })),
    getTeamScopeFromEvent: event => event.team === "opponent" ? "opponent" : "our",
    getOppositeScope: scope => scope === "opponent" ? "our" : "opponent",
    getPointDirection: () => null,
    isSkillEnabledForScope: () => true,
    getFreeballStartSkill: () => "second"
  };
  vm.runInNewContext(source, context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.getAutoFlowState())), {
    teamScope: "opponent",
    skillId: "pass"
  });
  state.pendingServe = { scope: "opponent", playerName: "Bianchi" };
  assert.deepEqual(JSON.parse(JSON.stringify(context.getAutoFlowState())), {
    teamScope: "our",
    skillId: "pass"
  });
});

test("un errore in battuta avversario passa il servizio alla nostra squadra", () => {
  const source = extract(scout, "function computeTwoTeamFlowFromEvent", "function getLastFlowEvent");
  const context = {
    getTeamScopeFromEvent: event => event.team,
    getOppositeScope: scope => scope === "opponent" ? "our" : "opponent",
    getPointDirection: event => event.skillId === "serve" && event.code === "=" ? "against" : null
  };
  vm.runInNewContext(source, context);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.computeTwoTeamFlowFromEvent({ team: "opponent", skillId: "serve", code: "=" }))),
    { teamScope: "our", skillId: "serve" }
  );
});

test("la difesa slash viene rimossa anche dalle regole già salvate", () => {
  const source = [
    extract(roster, "function sameCodeList", "function normalizePointRule"),
    extract(roster, "function normalizePointRule", "function normalizeScoreOverrides"),
    extract(roster, "function ensurePointRulesDefaults", "function getCodeTone")
  ].join("\n");
  const state = { pointRules: { defense: { for: [], against: ["=", "/"] } } };
  const context = {
    state,
    SKILLS: [{ id: "defense" }],
    POINT_RULE_DEFAULTS: { defense: { for: [], against: ["="] } },
    allowedPointCodes: new Set(["#", "+", "!", "-", "/", "="])
  };
  vm.runInNewContext(source, context);
  context.ensurePointRulesDefaults();
  assert.deepEqual(Array.from(state.pointRules.defense.against), ["="]);
});

test("annulla usa uno snapshot atomico non serializzato e non lo ricalcola", () => {
  const lifecycle = readFileSync(new URL("../js/scout/core/app-lifecycle.js", import.meta.url), "utf8");
  const snapshotCode = extract(lifecycle, "function captureScoutActionSnapshot", "function undoLastEvent");
  assert.match(snapshotCode, /Object\.defineProperty\(event, "__undoSnapshot"/);
  assert.match(snapshotCode, /enumerable:\s*false/);
  const restore = lifecycle.slice(
    lifecycle.indexOf("function restoreScoutActionSnapshot"),
    lifecycle.indexOf("function undoLastEvent")
  );
  assert.doesNotMatch(restore, /recomputeServeFlagsFromHistory/);
  assert.match(lifecycle.slice(lifecycle.indexOf("function undoLastEvent")), /restoreScoutActionSnapshot/);
});

test("punto ed errore manuali azzerano il flusso parziale di entrambe le squadre", () => {
  const manual = extract(scout, "function addManualPoint", "function handleManualScore");
  assert.match(manual, /cancelPartialSkillFlowForScope\("our"\)/);
  assert.match(manual, /cancelPartialSkillFlowForScope\("opponent"\)/);
  assert.match(manual, /state\.forceSkillActive = false/);
  assert.match(manual, /state\.pendingServe = null/);
  assert.match(manual, /state\.flowTeamScope = scoringScope/);
});

test("ogni nuovo set riparte dalla formazione effettiva inserita nel set 1", () => {
  const draft = extract(scout, "function buildNextSetDraft", "function openNextSetLineupModal");
  assert.match(draft, /getMatchInitialSetStart\("our"\)/);
  assert.match(draft, /getMatchInitialSetStart\("opponent"\)/);
  assert.match(draft, /initialOur && initialOur\.court/);
  assert.match(draft, /initialOpp && initialOpp\.rotation/);
  assert.match(draft, /getDefaultSetStartForScope\("our"\)/);
  assert.match(draft, /getDefaultSetStartForScope\("opponent"\)/);
  assert.doesNotMatch(draft, /nextSet\s*===\s*1/);
});

test("manuale e navigazione non distruggono la schermata corrente", () => {
  const manualLinks = index.match(/<a[^>]+markdown-viewer\.html[^>]*>/g) || [];
  assert.ok(manualLinks.length >= 1);
  manualLinks.forEach(link => assert.match(link, /target="_blank"/));
  assert.match(viewer, /position:\s*sticky/);
  assert.doesNotMatch(viewer, /Apri Markdown/);
});

test("lo snapshot locale conserva le impostazioni e viene scritto sincronicamente", () => {
  const compact = extract(roster, "function buildCompactLocalStateSnapshot", "async function loadStateFromIndexedDb");
  [
    "attackTrajectoryEnabled",
    "serveTrajectoryEnabled",
    "opponentAttackTrajectoryEnabled",
    "opponentServeTrajectoryEnabled",
    "videoScoutMode",
    "setTypePromptEnabled",
    "autoLiberoRole",
    "opponentAutoLiberoRole",
    "pendingServe",
    "uiVideoLayout",
    "uiPlayerAnalysis",
    "uiActiveTab",
    "uiAggTab"
  ].forEach(field => assert.match(compact, new RegExp(`${field}:`)));
  const stateStore = readFileSync(new URL("../js/roster/core/state-store.js", import.meta.url), "utf8");
  const save = stateStore.slice(stateStore.indexOf("function saveState"));
  assert.match(save, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(snapshot\)\)/);
  assert.doesNotMatch(save, /persistLocal \|\| typeof indexedDB/);
});

test("il video locale conserva soltanto il riferimento al file, mai il blob", () => {
  const sources = readFileSync(new URL("../js/scout/video/video-sources.js", import.meta.url), "utf8");
  const persist = extract(sources, "async function persistLocalVideoReference", "async function getFileFromStoredVideoHandle");
  const restore = extract(sources, "async function restoreCachedLocalVideo", "function restoreYoutubeFromState");
  assert.match(persist, /saveVideoFileHandleToDb\(handle\)/);
  assert.match(restore, /getFileFromStoredVideoHandle/);
  assert.match(sources, /showOpenFilePicker/);
  assert.doesNotMatch(sources, /saveVideoBlobToDb|loadVideoBlobFromDb|put\(file,/);
});

test("la correzione punteggio video segue l'ordine reale degli eventi e viene salvata", () => {
  const events = readFileSync(new URL("../js/scout/video/video-events.js", import.meta.url), "utf8");
  const correction = extract(events, "function correctVideoScoresFromSelection", "if (typeof window !== \"undefined\")");
  assert.match(correction, /const eventOrder = new Map/);
  assert.match(correction, /rows\.sort\(/);
  assert.match(correction, /ev\.homeScore = homeScore/);
  assert.match(correction, /ev\.visitorScore = awayScore/);
  assert.match(correction, /saveState\(\{ persistLocal: true \}\)/);
});

test("una partita in pausa o conclusa non blocca più la modifica squadra", () => {
  const editor = readFileSync(new URL("../js/roster/editor/team-editor.js", import.meta.url), "utf8");
  const players = readFileSync(new URL("../js/roster/core/player-model.js", import.meta.url), "utf8");
  assert.match(editor, /hasMatchDataForReset\(\) && !state\.matchFinished/);
  assert.match(editor, /removed\.length > 0 && !state\.matchFinished/);
  assert.match(players, /!state\.matchFinished[\s\S]*?removed\.length > 0/);
});

test("tutti i dati esposti nella tabella eventi sono modificabili", () => {
  const editor = readFileSync(new URL("../js/scout/video/event-editor.js", import.meta.url), "utf8");
  [
    "ID evento",
    "Punteggio nostro",
    "Punteggio avversario",
    "Squadra",
    "Eventi collegati",
    "Tipo errore",
    "Attacco da freeball"
  ].forEach(label => assert.match(editor, new RegExp(`makeEditableCell\\(td, "${label}"`)));
  assert.match(editor, /"opp-point"/);
  assert.match(editor, /"opp-error"/);
  assert.match(editor, /function syncManualEventPointDirection/);
  assert.match(editor, /case "opp-point":[\s\S]*?scope === "opponent" \? "for" : "against"/);
});

test("il tabellino nasconde le freeball disattivate", () => {
  assert.match(scout, /agg-table--hide-freeball/);
  assert.match(css, /\.agg-table\.agg-table--hide-freeball \.skill-col\.skill-freeball\s*\{[\s\S]*?display:\s*none/);
});

test("la distribuzione separa le damp per rotazione e mostra la legenda grafica", () => {
  const distribution = extract(scout, "function getFilteredPlayerAttacksForSecondDistribution", "function renderPlayerSecondTable");
  assert.match(distribution, /setType\.toLowerCase\(\) === "damp"/);
  assert.match(scout, /const dampByRotation = \{ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, all: 0 \}/);
  assert.match(scout, /dampByRotation\[rotation\] \+= 1/);
  assert.match(scout, /dampByRotation\.all \+= 1/);
  assert.match(distribution, /attachDampCountsByRotation\(filtered, all\)/);
  assert.ok((scout.match(/return attachDampCountsByRotation\(filtered, all\);/g) || []).length >= 2);
  assert.match(distribution, /distribution-legend__volume/);
  assert.match(distribution, /distribution-legend__eff/);
  assert.match(distribution, /distribution-card__title-row/);
  assert.match(distribution, /distribution-card__damp/);
  assert.match(distribution, /events\.dampByRotation\[rot\]/);
  assert.doesNotMatch(distribution, /distribution-legend__damp/);
  assert.match(css, /\.distribution-legend__volume\s*\{[\s\S]*?border-color:\s*#2563eb/);
  assert.match(css, /\.distribution-legend__eff\s*\{[\s\S]*?background:\s*rgba\(34, 197, 94/);
  assert.match(css, /\.distribution-card__damp\s*\{[\s\S]*?font-size:\s*0\.7rem/);
});

test("il conteggio damp mantiene rotazioni e totale separati dalle percentuali", () => {
  const helper = extract(
    scout,
    "function attachDampCountsByRotation",
    "function getFilteredPlayerAttacksForSecondDistribution"
  );
  const context = {
    normalizeSetTypeValue: value => String(value || "").trim()
  };
  vm.runInNewContext(`${helper}; this.attach = attachDampCountsByRotation;`, context);
  const ordinaryEvents = [{ skillId: "attack", rotation: 2, setType: "Alta" }];
  const result = context.attach(ordinaryEvents, [
    ...ordinaryEvents,
    { skillId: "attack", rotation: 2, setType: "Damp" },
    { skillId: "attack", rotation: 2, combination: { set_type: "damp" } },
    { skillId: "attack", rotation: 5, setType: "DAMP" }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result.dampByRotation[2], 2);
  assert.equal(result.dampByRotation[5], 1);
  assert.equal(result.dampByRotation.all, 3);
});

test("campi squadra, foto e ruoli hanno gli stili richiesti", () => {
  assert.match(css, /\.team-manager-table th:nth-child\(2\)[\s\S]*?min-width:\s*190px/);
  assert.match(css, /\.court-card\.setter-card/);
  assert.match(css, /\.court-setter-pill/);
  assert.match(css, /\.base-modal-btn\.player-role-setter/);
  assert.match(css, /\.base-modal-btn\.player-role-libero/);
  assert.match(css, /background-size:\s*contain/);
  assert.match(css, /\.court-card \.event-btn,[\s\S]*?background:\s*rgba\(15, 23, 42, 0\.32\)/);
  assert.match(css, /\.court-card \.skill-picker-btn\.skill-attack\s*\{[\s\S]*?38%, transparent/);
  assert.match(css, /\.player-analysis-identity__avatar\s*\{[\s\S]*?border-radius:\s*50%/);
});

test("il renderer del campo risolve il roster nello scope prima di calcolare l'alzatrice", () => {
  const rendering = readFileSync(new URL("../js/scout/live/court-rendering.js", import.meta.url), "utf8");
  const cards = rendering.slice(rendering.indexOf("function renderTeamCourtCards"));
  const rosterDeclaration = cards.indexOf("const players = getPlayersForScope(scope)");
  const setterLookup = cards.indexOf("players.indexOf(activeName)");
  assert.ok(rosterDeclaration >= 0);
  assert.ok(setterLookup > rosterDeclaration);
});

test("salvare una squadra aggiorna subito anche il selettore avversario", () => {
  const saveManager = teamEditor.slice(teamEditor.indexOf("function saveTeamManagerPayload"));
  assert.ok(saveManager.length > 0);
  const ourTeamBranch = saveManager.slice(saveManager.indexOf("saveTeamToStorage(nextName"));
  assert.match(ourTeamBranch, /renderTeamsSelect\(\);\s*renderOpponentTeamsSelect\(\);/);
});

test("il libero automatico usa il centrale come default senza rendere impossibile Nessuno", () => {
  const stateStore = readFileSync(new URL("../js/roster/core/state-store.js", import.meta.url), "utf8");
  const normalizer = extract(
    stateStore,
    "function normalizeAutoLiberoRolePreference",
    "function sanitizeRosterIsolation"
  );
  const context = {
    AUTO_LIBERO_ROLE_DEFAULT_VERSION: 1,
    AUTO_LIBERO_ROLE_OPTIONS: ["", "P", "S", "C", "O"]
  };
  vm.runInNewContext(`${normalizer}; this.normalize = normalizeAutoLiberoRolePreference;`, context);
  assert.equal(context.normalize(undefined, 0), "C");
  assert.equal(context.normalize("", 0), "C");
  assert.equal(context.normalize("", 1), "");
  assert.equal(context.normalize("P", 1), "P");
  assert.equal((index.match(/<option value="C" selected>C<\/option>/g) || []).length, 3);
});

test("le formazioni usano i numeri del proprio roster e sezioni blu e rossa", () => {
  const lineupSelection = readFileSync(new URL("../js/scout/live/skill-selection.js", import.meta.url), "utf8");
  const nextSetLineups = readFileSync(new URL("../js/scout/live/next-set-lineups.js", import.meta.url), "utf8");
  const formatter = extract(
    lineupSelection,
    "function formatLineupModalName",
    "function getSortedPlayerEntries"
  );
  assert.match(formatter, /getPlayerNumbersForScope\(scope\)/);
  assert.match(formatter, /scope === "opponent" \? state\.opponentCaptains/);
  assert.ok((nextSetLineups.match(/\{ compactCourt: true, scope \}/g) || []).length >= 2);
  assert.match(css, /#next-set-block-our\s*\{[\s\S]*?background:\s*rgba\(30, 64, 175/);
  assert.match(css, /#next-set-block-opp\s*\{[\s\S]*?background:\s*rgba\(153, 27, 27/);
  assert.match(css, /\.next-set-lineups\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2/);
});

test("l'avatar precede il nome e viene riutilizzato nel confronto giocatrici", () => {
  const analysis = readFileSync(new URL("../js/scout/analysis/skill-tables.js", import.meta.url), "utf8");
  const identity = extract(analysis, "function createPlayerAnalysisIdentity", "function renderPlayerAnalysisHero");
  assert.ok(identity.indexOf("identity.appendChild(avatar)") < identity.indexOf("identity.appendChild(text)"));
  assert.match(analysis, /photo:\s*getPlayerPhotoForScope\(analysisScope, name\)/);
  assert.match(analysis, /renderCompareCard[\s\S]*?createPlayerAnalysisIdentity\(snapshot\.name, snapshot\.photo/);
  assert.match(css, /\.player-analysis-identity\s*\{[\s\S]*?display:\s*flex/);
  assert.match(css, /\.player-analysis-identity\.is-compact \.player-analysis-identity__avatar/);
});
