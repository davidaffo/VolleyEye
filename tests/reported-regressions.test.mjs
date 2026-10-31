import { sourceFunctions } from "./helpers/source-functions.mjs";
import { readAppHtml } from './helpers/app-html.mjs';
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import test from "node:test";
import vm from "node:vm";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const scout = readScoutSource() + readFileSync(new URL("../src/features/analysis/summary-model.js", import.meta.url), "utf8");
const roster = readRosterSource();
const css = readStyleSource();
const index = readAppHtml();
const viewer = readFileSync(new URL("../docs/markdown-viewer.html", import.meta.url), "utf8");
const teamEditor = readFileSync(new URL("../src/features/teams/editor/team-editor.js", import.meta.url), "utf8");

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

test("annulla usa una ricevuta persistente senza ricalcolare il servizio", () => {
  const lifecycle = readFileSync(new URL("../src/features/events/history-model.js", import.meta.url), "utf8") + readFileSync(new URL("../src/features/events/history-commands.js", import.meta.url), "utf8");
  const snapshotCode = extract(lifecycle, "function captureScoutActionSnapshot", "function undoLastEvent");
  assert.match(snapshotCode, /Object\.defineProperty\(event, "__undoSnapshot"/);
  assert.match(snapshotCode, /enumerable:\s*false/);
  assert.match(snapshotCode, /event\.undoState = snapshot/);
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
  const stateStore = readFileSync(new URL("../src/features/teams/core/state-store.js", import.meta.url), "utf8");
  const save = readFileSync(new URL("../src/features/storage/save-state.js", import.meta.url), "utf8");
  assert.match(save, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(buildLocalUiSnapshot\(snapshot\)\)\)/);
  assert.doesNotMatch(save, /persistLocal \|\| typeof indexedDB/);
});

test("il video locale conserva soltanto il riferimento al file, mai il blob", () => {
  const sources = readFileSync(new URL("../src/features/video/video-sources.js", import.meta.url), "utf8");
  const storage = readFileSync(new URL("../src/features/video/local-file-storage.js", import.meta.url), "utf8");
  const persist = sourceFunctions(storage, ["persistLocalVideoReference"]);
  const restore = extract(sources, "async function restoreCachedLocalVideo", "function restoreYoutubeFromState");
  assert.match(persist, /saveVideoFileHandleToDb\(handle\)/);
  assert.match(restore, /getFileFromStoredVideoHandle/);
  assert.match(sources, /showOpenFilePicker/);
  assert.doesNotMatch(sources + storage, /saveVideoBlobToDb|loadVideoBlobFromDb|put\(file,/);
});

test("la correzione punteggio video segue l'ordine reale degli eventi e viene salvata", () => {
  const events = readFileSync(new URL("../src/features/video/video-events.js", import.meta.url), "utf8");
  const correction = sourceFunctions(events, ["correctVideoScoresFromSelection"]);
  assert.match(correction, /const eventOrder = new Map/);
  assert.match(correction, /rows\.sort\(/);
  assert.match(correction, /ev\.homeScore = homeScore/);
  assert.match(correction, /ev\.visitorScore = awayScore/);
  assert.match(correction, /saveState\(\{ persistLocal: true \}\)/);
});

test("il taglio video riusa i pacchetti originali e il preset suggerisce il nome", () => {
  const command = readFileSync(new URL("../src/features/video/clip-commands.js", import.meta.url), "utf8");
  const exporter = readFileSync(new URL("../src/features/video/clip-export.js", import.meta.url), "utf8");
  assert.match(command, /getActiveVideoFilterPresetName\(\)/);
  assert.match(command, /sanitizeVideoOutputBase/);
  assert.match(exporter, /EncodedVideoPacketSource/);
  assert.doesNotMatch(exporter, /drawtext|VideoEncoder|AudioEncoder/);
  assert.match(index, /id="btn-download-video-clip"/);
  assert.match(index, /id="btn-save-video-frame"/);
  assert.doesNotMatch(index, /id="ffmpeg-encoder-modal"/);
});

test("una partita in pausa o conclusa non blocca più la modifica squadra", () => {
  const editor = readFileSync(new URL("../src/features/teams/editor/team-editor.js", import.meta.url), "utf8");
  const players = readFileSync(new URL("../src/features/teams/core/player-model.js", import.meta.url), "utf8");
  assert.match(editor, /hasMatchDataForReset\(\) && !state\.matchFinished/);
  assert.match(editor, /removed\.length > 0 && !state\.matchFinished/);
  assert.match(players, /!state\.matchFinished[\s\S]*?removed\.length > 0/);
});

test("tutti i dati esposti nella tabella eventi sono modificabili", () => {
  const editor = readFileSync(new URL("../src/features/events/point-direction.js", import.meta.url), "utf8") + readFileSync(new URL("../src/features/video/event-editor.js", import.meta.url), "utf8");
  const view = readFileSync(new URL("../src/features/events/table-model.js", import.meta.url), "utf8");
  [
    "eventId",
    "homeScore",
    "visitorScore",
    "team",
    "relatedEvents",
    "errorType",
    "fromFreeball"
  ].forEach(label => assert.ok(view.includes(label)));
  assert.match(editor, /"opp-point"/);
  assert.match(editor, /"opp-error"/);
  assert.match(editor, /function syncManualEventPointDirection/);
  assert.match(editor, /case "opp-point":[\s\S]*?scope === "opponent" \? "for" : "against"/);
});

test("il tabellino nasconde le freeball disattivate", () => {
  assert.match(scout, /agg-table--hide-freeball/);
  assert.match(css, /\.agg-table\.agg-table--hide-freeball \.skill-col\.skill-freeball\s*\{[\s\S]*?display:\s*none/);
});

test("le traiettorie d'attacco possono filtrare solo le ricezioni positive", () => {
  const source = extract(scout, "function matchesPreviousSkill", "function matchesAdvancedFilters");
  const context = {
    findPreviousEvent: event => event.previous || null
  };
  vm.runInNewContext(source, context);

  assert.equal(
    context.matchesPreviousSkill({ previous: { skillId: "pass", code: "+" } }, "receive-positive"),
    true
  );
  assert.equal(
    context.matchesPreviousSkill({ previous: { skillId: "pass", code: "#" } }, "receive-positive"),
    true
  );
  assert.equal(
    context.matchesPreviousSkill({ fromFreeball: true }, "receive-positive"),
    false
  );
  assert.ok((index.match(/value="receive-positive">Solo ricezione positiva/g) || []).length >= 2);
  assert.match(scout, /value:\s*"receive-positive", label:\s*"Solo ricezione positiva"/);
});

test("la distribuzione separa le damp per rotazione e mostra la legenda grafica", () => {
  const distribution = extract(scout, "function getFilteredPlayerAttacksForSecondDistribution", "function renderPlayerSecondTable");
  assert.match(distribution, /setType\.toLowerCase\(\) === "damp"/);
  assert.match(scout.replace(/\s+/g, " "), /const dampByRotation = \{ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, all: 0,? \}/);
  assert.match(scout, /dampByRotation\[rotation\] \+= 1/);
  assert.match(scout, /dampByRotation\.all \+= 1/);
  assert.match(distribution, /attachDampCountsByRotation\(filtered, all\)/);
  assert.ok((scout.match(/return attachDampCountsByRotation\(filtered, all\);/g) || []).length >= 2);
  assert.match(readFileSync(new URL("../src/components/AnalysisTable.jsx", import.meta.url), "utf8"), /distribution-legend__volume/);
  assert.match(readFileSync(new URL("../src/components/AnalysisTable.jsx", import.meta.url), "utf8"), /distribution-legend__eff/);
  assert.match(readFileSync(new URL("../src/components/AnalysisTable.jsx", import.meta.url), "utf8"), /distribution-card__title-row/);
  assert.match(readFileSync(new URL("../src/components/AnalysisTable.jsx", import.meta.url), "utf8"), /distribution-card__damp/);
  assert.match(readFileSync(new URL("../src/features/analysis/setting-model.js", import.meta.url), "utf8"), /events\?\.dampByRotation/);
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
  assert.match(css, /\.team-manager-table th:nth-child\(2\)[\s\S]*?min-width:\s*140px/);
  assert.match(css, /\.court-card\.setter-card/);
  assert.match(css, /\.court-setter-pill/);
  assert.match(css, /\.base-modal-btn\.player-role-setter/);
  assert.match(css, /\.base-modal-btn\.player-role-libero/);
  assert.match(css, /background-size:\s*contain/);
  assert.match(css, /\.court-card \.event-btn[\s\S]*?background:\s*rgba\(15, 23, 42, 0\.32\)/);
  assert.match(css, /\.court-card \.skill-picker-btn\.skill-attack\s*\{[\s\S]*?38%, transparent/);
  assert.match(css, /\.player-analysis-identity__avatar\s*\{[\s\S]*?border-radius:\s*50%/);
});

test("il renderer del campo risolve il roster nello scope prima di calcolare l'alzatrice", () => {
  const rendering = readFileSync(new URL("../src/features/scout/court-model.js", import.meta.url), "utf8");
  const cards = rendering;
  const rosterDeclaration = cards.indexOf("const players = getPlayersForScope(scope)");
  const setterLookup = cards.indexOf("players.indexOf(name)");
  assert.ok(rosterDeclaration >= 0);
  assert.ok(setterLookup > rosterDeclaration);
});

test("salvare una squadra aggiorna subito anche il selettore avversario", () => {
  const saveManager = teamEditor.slice(teamEditor.indexOf("function saveTeamManagerPayload"));
  assert.ok(saveManager.length > 0);
  const ourTeamBranch = saveManager.slice(saveManager.indexOf("saveTeamToStorage(nextName"));
  assert.match(ourTeamBranch, /publishTeamsManagerView\(\)/);
  assert.doesNotMatch(ourTeamBranch, /publishTeamsManagerView\(\);\s*publishTeamsManagerView\(\)/);
});

test("il libero automatico usa il centrale come default senza rendere impossibile Nessuno", () => {
  const stateStore = readFileSync(new URL("../src/features/teams/core/state-store.js", import.meta.url), "utf8");
  const normalizer = readFileSync(new URL("../src/features/teams/preferences.js", import.meta.url), "utf8");
  const context = {
    AUTO_LIBERO_ROLE_DEFAULT_VERSION: 1,
    AUTO_LIBERO_ROLE_OPTIONS: ["", "P", "S", "C", "O"]
  };
  vm.runInNewContext(`${normalizer}; this.normalize = normalizeAutoLiberoRolePreference;`, context);
  assert.equal(context.normalize(undefined, 0), "C");
  assert.equal(context.normalize("", 0), "C");
  assert.equal(context.normalize("", 1), "");
  assert.equal(context.normalize("P", 1), "P");
  assert.equal((index.match(/<option value="C" selected(?:="")?>C<\/option>/g) || []).length, 3);
});

test("le formazioni usano i numeri del proprio roster e sezioni blu e rossa", () => {
  const lineupSelection = readFileSync(new URL("../src/features/teams/lineup-selectors.js", import.meta.url), "utf8");
  const nextSetLineups = readFileSync(new URL("../src/features/live/next-set-view.js", import.meta.url), "utf8");
  const formatter = extract(
    lineupSelection,
    "function formatLineupModalName",
    "function getSortedPlayerEntries"
  );
  assert.match(formatter, /getPlayerNumbersForScope\(scope\)/);
  assert.match(formatter, /scope === "opponent" \? state\.opponentCaptains/);
  assert.match(nextSetLineups, /\{ compactCourt: true, scope \}/);
  assert.match(css, /#next-set-block-our\s*\{[\s\S]*?background:\s*rgba\(30, 64, 175/);
  assert.match(css, /#next-set-block-opp\s*\{[\s\S]*?background:\s*rgba\(153, 27, 27/);
  assert.match(css, /\.next-set-lineups\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2/);
});

test("l'avatar precede il nome e viene riutilizzato nel confronto giocatrici", () => {
  const analysis = readFileSync(new URL("../src/components/PlayerAnalysis.jsx", import.meta.url), "utf8");
  assert.ok(analysis.indexOf('className="player-analysis-identity__avatar"') < analysis.indexOf('className="player-analysis-identity__text"'));
  assert.match(readFileSync(new URL("../src/features/analysis/player-snapshot-model.js", import.meta.url), "utf8"), /photo:\s*getPlayerPhotoForScope\(analysisScope, name\)/);
  assert.match(analysis, /<Identity snapshot=\{snapshot\} compact/);
  assert.match(css, /\.player-analysis-identity\s*\{[\s\S]*?display:\s*flex/);
  assert.match(css, /\.player-analysis-identity\.is-compact \.player-analysis-identity__avatar/);
});
