import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readRosterSource } from "./helpers/roster-source.mjs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("index.html");
const scout = readScoutSource();
const roster = readRosterSource();
function load(context, source, names) {
  for (const name of names) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, name);
    const tail = source.slice(start);
    const next = tail.slice(1).search(/^function /m);
    vm.runInContext(next < 0 ? tail : tail.slice(0, next + 1), context);
  }
}
function setup() {
  const dom = new JSDOM(html);
  const state = {
    useOpponentTeam: true, predictiveSkillFlow: true, isServing: true,
    players: ["Omonima", "Casa 2", "Casa 3", "Casa 4", "Casa 5", "Casa 6", "Riserva casa"],
    opponentPlayers: ["Omonima", "Ospite 2", "Ospite 3", "Ospite 4", "Ospite 5", "Ospite 6", "Riserva ospite"],
    playerNumbers: { Omonima: "7" }, opponentPlayerNumbers: { Omonima: "17" },
    captains: ["Omonima"], opponentCaptains: [], liberos: [], opponentLiberos: [], events: []
  };
  state.court = state.players.slice(0, 6).map(main => ({ main, replaced: "" }));
  state.opponentCourt = state.opponentPlayers.slice(0, 6).map(main => ({ main, replaced: "" }));
  const context = vm.createContext({
    state, document: dom.window.document, window: { matchMedia: () => ({ matches: false }) },
    POSITIONS_META: [],
    getPredictedSkillIdForScope: scope => scope === "our" ? "serve" : "pass",
    getPredictedSkillId: () => "serve", isServingForScope: scope => scope === "our" ? state.isServing : !state.isServing,
    getLastFlowEvent: () => null, isSkillEnabledForScope: () => true, getEnabledSkillsForScope: () => [],
    getMobileActiveScope: () => context.mobileScope || "our",
    ensureCourtShapeFor: court => court.map(slot => ({ ...slot })),
    getAutoRoleDisplayCourt: (skill, scope) => context.getTeamCourt(scope).map((slot, idx) => ({ slot, idx })),
    isAnySelectedSkillForScope: () => false, getPlayerPhotoForScope: () => "", isSetterPlayerForScope: () => false,
    formatStructuredPlayerName: name => name, getRoleLabelForRotation: () => "C",
    isErrorPickModeForScope: scope => context.errorScope === scope, isPointPickModeForScope: () => false,
    getBenchEntriesForScope: scope => [{ name: scope === "our" ? "Riserva casa" : "Riserva ospite", idx: 6 }],
    renderSkillRows: (card, idx, name, { scope }) => {
      const button = dom.window.document.createElement("button");
      button.dataset.teamScope = scope;
      card.appendChild(button);
    }
  });
  for (const name of [
    "syncAutoLiberoSelects", "ensureMetricsConfigDefaults", "updateSetTypeVisibility",
    "updateOpponentRotationDisplay", "recalcAllStatsAndUpdateUI", "renderLineupChips",
    "updateNetBlockPrompt", "renderLogServeTrajectories", "updateFloatingServeErrorButton",
    "maybeScrollToActiveCourtOnMobile", "handlePositionDragOver", "handlePositionDragLeave",
    "handlePositionDrop", "handleCourtDragStart", "handleCourtDragEnd", "stopErrorPickMode"
  ]) context[name] = () => {};
  load(context, scout, ["getPlayersForScope", "getPlayerNumbersForScope", "getLiberosForScope", "getCaptainsForScope"]);
  load(context, roster, ["getTeamCourt", "formatNameWithNumberFor"]);
  load(context, scout, ["renderTeamCourtCards", "getScoutCourtSkill", "renderPlayers", "renderOpponentPlayers", "renderScoutTeamCourt", "syncCourtSideLayout"]);
  return { context, dom };
}

test("lo scout live non contiene markup, renderer o richiami della vecchia panchina", () => {
  const dom = new JSDOM(html);
  assert.equal(dom.window.document.querySelectorAll('#bench-chips, #bench-chips-opp, .opponent-bench').length, 0);
  assert.doesNotMatch(scout + roster + read("js/globals.js"), /render(?:Opponent)?BenchChips|elBenchChips|ensureBenchDropZone|syncRosterFromSelectedTeamIfNeeded/);
  assert.ok(dom.window.document.getElementById("lineup-modal-bench"));
  dom.window.close();
});

test("i due campi usano lo stesso renderer e mantengono numeri e capitani separati", () => {
  const { context: c, dom } = setup();
  c.renderPlayers();
  const document = dom.window.document;
  for (const scope of ["our", "opponent"]) {
    assert.equal(document.querySelectorAll(`.court-card[data-team-scope="${scope}"]`).length, 6);
  }
  assert.equal(document.querySelector('.court-card[data-team-scope="our"][data-player-name="Omonima"] .court-name').textContent, "7 - Omonima (K)");
  assert.equal(document.querySelector('.court-card[data-team-scope="opponent"][data-player-name="Omonima"] .court-name').textContent, "17 - Omonima");
  assert.equal(document.querySelectorAll('.opponent-bench, .bench-chips, .error-pick-bench-host').length, 0);
  c.renderPlayers();
  c.renderOpponentPlayers();
  assert.equal(document.querySelectorAll('.court-card').length, 12);
  assert.equal(document.querySelectorAll('.opponent-bench, .bench-chips').length, 0);
  dom.window.close();
});

test("il renderer condiviso gestisce singola squadra, mobile e inversione dei campi", () => {
  const { context: c, dom } = setup();
  const document = dom.window.document;
  c.state.forceMobileLayout = true;
  c.mobileScope = "opponent";
  c.renderPlayers();
  assert.equal(document.querySelectorAll('#players-container .court-card').length, 0);
  assert.equal(document.querySelectorAll('#opponent-players-container .court-card').length, 6);
  c.mobileScope = "our";
  c.state.courtSideSwapped = true;
  c.renderPlayers();
  assert.equal(document.querySelectorAll('#players-container .court-card').length, 6);
  assert.equal(document.querySelectorAll('#opponent-players-container .court-card').length, 0);
  assert.ok(document.getElementById('players-container').classList.contains('court-layout--mirror'));
  c.state.forceMobileLayout = false;
  c.state.useOpponentTeam = false;
  c.renderPlayers();
  assert.ok(document.getElementById('opponent-players-container').classList.contains('hidden'));
  assert.equal(document.querySelectorAll('.court-card').length, 6);
  dom.window.close();
});

test("la scelta errore mostra la panchina solo durante la selezione e la rimuove alla chiusura", () => {
  const { context: c, dom } = setup();
  for (const scope of ["our", "opponent"]) {
    c.errorScope = scope;
    c.renderPlayers();
    assert.equal(dom.window.document.querySelectorAll('.error-pick-bench-host').length, 1);
    assert.equal(dom.window.document.querySelector('.error-pick-bench-host').dataset.teamScope, scope);
    c.errorScope = null;
    c.renderPlayers();
    assert.equal(dom.window.document.querySelectorAll('.error-pick-bench-host').length, 0);
  }
  dom.window.close();
});

test("liberi e rientri usano le stesse interazioni per entrambe le squadre", () => {
  const { context: c, dom } = setup();
  c.elLiberoTagsInline = dom.window.document.getElementById('libero-tags-inline');
  c.elLiberoTagsInlineOpp = dom.window.document.getElementById('libero-tags-inline-opp');
  c.getUsedNamesForScope = scope => new Set(c.getTeamCourt(scope).map(slot => slot.main));
  c.getReplacedByLiberosForScope = scope => c.getTeamCourt(scope).filter(slot => slot.replaced).map(slot => slot.replaced);
  c.getLockedMapForScope = scope => Object.fromEntries(c.getTeamCourt(scope).flatMap((slot, idx) => slot.replaced ? [[slot.replaced, idx]] : []));
  c.orderLiberosByPreference = names => names;
  for (const name of ['handleBenchDragStart', 'handleBenchDragEnd', 'handleBenchPointerDown', 'handleBenchTouchStart', 'handleBenchTouchMove', 'handleBenchTouchEnd', 'handleBenchTouchCancel']) c[name] = () => {};
  c.handleBenchClickForScope = (name, scope) => { c.clicked = [name, scope]; };
  c.restorePlayerFromLiberoForScope = (idx, scope) => { c.restored = [idx, scope]; };
  load(c, roster, ['getTeamNumbers', 'getTeamPlayers', 'getTeamLiberos', 'renderTeamLiberoChipsInline', 'renderLiberoChipsInline', 'renderOpponentLiberoChipsInline']);
  for (const scope of ['our', 'opponent']) {
    const prefix = scope === 'our' ? '' : 'opponent';
    c.state[prefix ? 'opponentPlayers' : 'players'].push('Libero');
    c.state[prefix ? 'opponentLiberos' : 'liberos'] = ['Libero'];
    c.renderLiberoChipsInline();
    const chip = dom.window.document.querySelector(`.libero-tags [data-team-scope="${scope}"][data-player-name="Libero"]`);
    chip.click();
    assert.deepEqual(c.clicked, ['Libero', scope]);
    assert.ok(chip.draggable);
    const replacedName = c.getTeamCourt(scope)[4].main;
    c.getTeamCourt(scope)[4] = { main: 'Libero', replaced: replacedName };
    c.renderLiberoChipsInline();
    const used = dom.window.document.querySelector(`.libero-tags [data-team-scope="${scope}"][data-player-name="Libero"]`);
    assert.equal(used.getAttribute('aria-disabled'), 'true');
    const replaced = dom.window.document.querySelector(`.libero-tags [data-team-scope="${scope}"][data-player-name="${replacedName}"]`);
    replaced.click();
    assert.deepEqual(c.restored, [4, scope]);
  }
  dom.window.close();
});

test("il trascinamento legge il campo della squadra corretta e rifiuta l’altra squadra", () => {
  const { context: c, dom } = setup();
  c.activeDropChip = null;
  c.draggedPlayerName = '';
  c.draggedScope = 'our';
  c.resetDragState = () => { c.reset = true; };
  c.isLiberoForScope = () => true;
  c.canPlaceInSlotForScope = () => assert.fail('Un trascinamento tra squadre deve essere rifiutato prima di modificare il campo');
  load(c, roster, ['handleCourtDragStart', 'handlePositionDrop']);
  const transfer = { setData(type, name) { this.name = name; }, getData() { return this.name; } };
  c.handleCourtDragStart({ dataTransfer: transfer }, 1, 'opponent');
  assert.equal(transfer.name, 'Ospite 2');
  assert.equal(c.draggedScope, 'opponent');
  const ourCard = dom.window.document.createElement('div');
  ourCard.dataset.posIndex = '4';
  ourCard.dataset.teamScope = 'our';
  c.handlePositionDrop({ preventDefault() {}, dataTransfer: transfer }, ourCard);
  assert.equal(c.reset, true);
  assert.equal(c.state.court[4].main, 'Casa 5');
  assert.equal(c.state.opponentCourt[1].main, 'Ospite 2');
  dom.window.close();
});

test("cambi, ingresso libero e rientro usano la stessa logica e modificano soltanto la squadra scelta", () => {
  const { context: c, dom } = setup();
  c.window.VolleyEye = {};
  vm.runInContext(read('js/shared/lineup-core.js'), c);
  c.lineupCore = c.window.VolleyEye.lineup;
  c.cloneCourtLineup = court => c.lineupCore.cloneCourtLineup(court);
  c.FRONT_ROW_INDEXES = new Set([1, 2, 3]);
  c.alert = message => { c.lastAlert = message; };
  c.roleToAutoCategory = role => role;
  c.commitCourtChangeForScope = (court, scope) => { c.state[scope === 'our' ? 'court' : 'opponentCourt'] = court; };
  c.registerLiberoPairForScope = (replaced, libero, scope) => { c.pair = [replaced, libero, scope]; };
  const substitutions = [];
  c.recordSubstitutionEvent = event => substitutions.push(event);
  load(c, roster, [
    'getTeamPlayers', 'getTeamLiberos', 'setTeamPreferredLibero', 'getTeamPreferredLibero',
    'setTeamAutoLiberoRole', 'setTeamAutoLiberoBackline', 'isLiberoForScope',
    'getUsedNamesForScope', 'getLockedMapForScope', 'canPlaceInSlotForScope',
    'setCourtPlayer', 'setCourtPlayerForScope'
  ]);
  for (const scope of ['our', 'opponent']) {
    const otherCourt = JSON.stringify(c.getTeamCourt(scope === 'our' ? 'opponent' : 'our'));
    const reserve = scope === 'our' ? 'Riserva casa' : 'Riserva ospite';
    const replaced = c.getTeamCourt(scope)[4].main;
    if (scope === 'our') c.setCourtPlayer(4, 'main', reserve);
    else c.setCourtPlayerForScope(4, 'main', reserve, scope);
    assert.equal(c.getTeamCourt(scope)[4].main, reserve);
    assert.equal(substitutions.at(-1).teamScope, scope);
    assert.equal(substitutions.at(-1).playerOut, replaced);
    const count = substitutions.length;
    c.state[scope === 'our' ? 'players' : 'opponentPlayers'].push('Libero');
    c.state[scope === 'our' ? 'liberos' : 'opponentLiberos'] = ['Libero'];
    c.setCourtPlayerForScope(4, 'main', 'Libero', scope);
    assert.equal(c.getTeamCourt(scope)[4].main, 'Libero');
    assert.equal(c.getTeamCourt(scope)[4].replaced, reserve);
    assert.equal(c.getTeamPreferredLibero(scope), 'Libero');
    assert.deepEqual(c.pair, [reserve, 'Libero', scope]);
    assert.equal(substitutions.length, count);
    c.setCourtPlayerForScope(4, 'main', reserve, scope);
    assert.equal(c.getTeamCourt(scope)[4].main, reserve);
    assert.equal(c.getTeamCourt(scope)[4].replaced, '');
    assert.equal(substitutions.length, count);
    c.setCourtPlayerForScope(1, 'main', 'Libero', scope);
    assert.ok(c.lastAlert.includes('prima linea'));
    assert.equal(JSON.stringify(c.getTeamCourt(scope === 'our' ? 'opponent' : 'our')), otherCourt);
  }
  dom.window.close();
});
