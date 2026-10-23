import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { IDBFactory } from 'fake-indexeddb';
import { repairBug1023, scoringContext, originalPath, repairedPath, officialScores } from '../scripts/repairs/bug-1023.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const court = prefix => Array.from({ length: 6 }, (_, i) => ({ main: prefix + i, replaced: '' }));

function setup(dual = true) {
  const c = vm.createContext({
    state: {
      events: [], stats: {}, opponentStats: {}, currentSet: 1, rotation: 2, opponentRotation: 3,
      matchFinished: false, isServing: true, autoRotate: true, useOpponentTeam: dual, predictiveSkillFlow: true,
      court: court('A'), opponentCourt: court('B'), setStarts: {}, setResults: {}, scoreOverrides: {},
      players: court('A').map(slot => slot.main), opponentPlayers: court('B').map(slot => slot.main),
      pointRules: { attack: { for: ['#'], against: ['=', '/'] }, serve: { for: ['#'], against: ['='] },
        pass: { for: [], against: ['='] }, block: { for: ['#'], against: ['/', '='] } },
      skillClock: { paused: false, pausedAccumMs: 0 }, videoClock: { paused: false, pausedAccumMs: 0 },
      savedTeams: { A: {} }, selectedTeam: 'A'
    },
    SKILLS: ['serve', 'pass', 'second', 'attack', 'block', 'defense', 'freeball'].map(id => ({ id })),
    selectedSkillPerPlayer: {}, lastReceiveContext: { our: null, opponent: null },
    nextSetModalOpen: false, nextSetDraft: null,
    document: { body: { dataset: {} }, querySelector: () => null }, window: {},
    alert: message => assert.fail(message), confirm: () => true,
    normalizeScoreOverrides: value => value, normalizePointRule: (id, value) => value || { for: [], against: [] },
    getOppositeScope: scope => scope === 'opponent' ? 'our' : 'opponent',
    getTeamScopeFromEvent: event => event.team === 'opponent' ? 'opponent' : 'our',
    cloneCourt: value => plain(value), cloneSetMap: value => plain(value || {}),
    getPlayersForScope: scope => scope === 'our' ? c.state.players : c.state.opponentPlayers,
    getTeamNameForScope: scope => scope,
    getPlayerIdForScope: (scope, index) => scope + index,
    getTeamOfficialMetaForScope: () => ({}), getPlayerNumbersForScope: () => ({}),
    sanitizeOfficialString: value => value || '', getPlayerOfficialCodeForScope: () => '',
    normalizeDataVolleyEventMeta: value => value || {}, getCurrentZoneForPlayer: () => 1,
    getEnabledSkills: () => c.SKILLS, isSkillEnabled: () => true, isSkillEnabledForScope: () => true,
    getEnabledSkillsForScope: () => c.SKILLS, getDefaultSkillDurationMs: () => 5000,
    getEventVideoSeconds: () => 0,
    getServerPlayerForScope: scope => ({ name: c.getPlayersForScope(scope)[0], idx: 0 }),
    getServeDisplayCourt: scope => c.state[scope === "our" ? "court" : "opponentCourt"],
    getServeBaseZoneForPlayer: () => 1, getAttackMetaForPlayer: () => ({}),
    resolvePlayerIdx: event => event.playerIdx ?? 0, updateSkillStatsForEvent() {},
    getCourtShape: value => value, ensureCourtShapeFor: value => value,
    isLiberoForScope: () => false
  });
  const lifecycle = read('js/scout/core/app-lifecycle.js');
  for (const source of [
    read('js/scout/live/game-flow.js'), read('js/scout/live/score-analysis.js'),
    read('js/scout/live/live-entry.js'), read('js/scout/live/live-score-and-set.js'),
    read('js/scout/live/next-set-lineups.js'), read('js/scout/live/event-recording.js'),
    lifecycle.slice(lifecycle.indexOf('function captureScoutActionSnapshot'), lifecycle.indexOf('function applyAggColumnsVisibility'))
  ]) vm.runInContext(source, c);
  const video = read('js/scout/video/video-events.js');
  vm.runInContext(video.slice(video.indexOf('function recordTimeoutEvent'), video.indexOf('function openOffsetModal')), c);
  for (const name of [
    'renderEventsLog', 'renderPlayers', 'renderOpponentPlayers', 'renderLiveScore', 'renderLineupChips',
    'renderLiberoChipsInline', 'updateRotationDisplay', 'updateSetScoreDisplays', 'syncCourtSideLayout',
    'updateMatchStatusUI', 'cancelPartialSkillFlowForScope', 'enforceAutoLiberoForState',
    'enforceAutoLiberoForScope', 'ensurePointRulesDefaults', 'syncCurrentSetUI', 'clearAttackSelection',
    'schedulePostEventUpdates', 'renderScoreAndRotations', 'renderAggregatedTable', 'renderVideoAnalysis'
  ]) c[name] = () => {};
  c.recalcAllStatsAndUpdateUI = () => {};
  c.saveState = () => { c.persisted = JSON.stringify(c.state); };
  c.ensureSetStartSnapshot = set => {
    c.state.setStarts[set] ||= {
      our: { court: plain(c.state.court), rotation: c.state.rotation },
      opponent: { court: plain(c.state.opponentCourt), rotation: c.state.opponentRotation },
      isServing: c.state.isServing, swapCourt: !!c.state.courtSideSwapped
    };
  };
  c.ensureSetStartSnapshot(1);
  c.setCurrentSet = value => { c.state.currentSet = value; };
  c.commitCourtChange = value => { c.state.court = value; };
  c.commitCourtChangeForScope = value => { c.state.opponentCourt = value; };
  c.setRotation = value => { c.state.rotation = value; };
  c.setOpponentRotation = value => { c.state.opponentRotation = value; };
  c.setIsServing = value => { c.state.isServing = value; };
  c.closeNextSetModal = () => { c.nextSetDraft = null; };
  c.computeSetWinner = set => {
    const score = c.computePointsSummary(set);
    return score.totalFor === score.totalAgainst ? null : score.totalFor > score.totalAgainst ? 'our' : 'opponent';
  };
  for (const scope of ['our', 'opponent']) {
    c[scope === 'our' ? 'rotateCourt' : 'rotateOpponentCourt'] = direction => {
      const courtKey = scope === 'our' ? 'court' : 'opponentCourt';
      const rotationKey = scope === 'our' ? 'rotation' : 'opponentRotation';
      const slots = c.state[courtKey];
      if (direction === 'ccw') { slots.push(slots.shift()); c.state[rotationKey] = (c.state[rotationKey] + 4) % 6 + 1; }
      else { slots.unshift(slots.pop()); c.state[rotationKey] = c.state[rotationKey] % 6 + 1; }
    };
  }
  return c;
}
function prepare(c, set, serving = false) {
  c.nextSetDraft = {
    setNum: set, our: { court: court('C' + set), rotation: 4 },
    opponent: { court: court('D' + set), rotation: 5 }, isServing: serving, swapCourt: set % 2 === 0
  };
  c.applyNextSetDraft();
}
const score = (c, set = c.state.currentSet) => {
  const value = c.computePointsSummary(set);
  return [value.totalFor, value.totalAgainst];
};

for (const dual of [false, true]) for (const reload of [false, true]) {
  test(`set 1–5: annulla fino a 0–0 e attraverso i confini (${dual ? 'doppia' : 'singola'}, ${reload ? 'JSON' : 'memoria'})`, () => {
    const c = setup(dual);
    for (let set = 1; set <= 5; set++) {
      if (set > 1) prepare(c, set, set % 2 === 1);
      for (let point = 0; point < 3; point++) c.addManualPoint('for', 1, 'for');
    }
    if (reload) c.state = JSON.parse(c.persisted);
    for (let set = 5; set >= 1; set--) {
      for (let point = 2; point >= 0; point--) {
        c.undoLastEvent();
        assert.equal(c.state.currentSet, set);
        assert.deepEqual(score(c), [point, 0]);
      }
      assert.equal(c.state.isServing, set === 1 || set % 2 === 1);
      assert.equal(c.getLastFlowEvent(c.state.events), null);
      if (dual) assert.equal(c.getAutoFlowState().skillId, 'serve');
      if (set > 1) {
        c.undoLastEvent();
        assert.equal(c.state.currentSet, set - 1);
        assert.deepEqual(score(c), [3, 0]);
      }
    }
    assert.equal(c.state.events.length, 0);
  });
}

test('annullare il passaggio ripristina campo, liberi, risultati e rotazioni prima della preparazione', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  c.state.court[5] = { main: 'Libero', replaced: 'A5' };
  c.state.liberoAutoMap = { A5: 'Libero' };
  c.state.opponentLiberoAutoMap = { B5: 'Libero avversario' };
  c.state.preferredLibero = 'Libero';
  const before = plain(c.state);
  c.enforceAutoLiberoForState = () => { c.state.liberoAutoMap = {}; c.state.preferredLibero = 'Altro libero'; };
  prepare(c, 2);
  c.state = JSON.parse(c.persisted);
  c.undoLastEvent();
  for (const key of ['court', 'opponentCourt', 'rotation', 'opponentRotation', 'isServing', 'setResults', 'setStarts', 'liberoAutoMap', 'opponentLiberoAutoMap', 'preferredLibero']) {
    assert.deepEqual(plain(c.state[key]), before[key], key);
  }
});

test('rifiutare il ritorno al set precedente lascia intatti storico e punteggio', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  prepare(c, 3);
  c.confirm = () => false;
  const before = JSON.stringify(c.state);
  c.undoLastEvent();
  assert.equal(JSON.stringify(c.state), before);
});

test('annullare una battuta/ricezione reale è atomico anche dopo salvataggio', async () => {
  const c = setup();
  c.state.isServing = false;
  c.state.setStarts[1].isServing = false;
  const before = plain(c.state.court);
  c.state.pendingServe = { scope: 'opponent', playerIdx: 0, playerName: 'B0' };
  await c.handleEventClick('0', 'pass', '=', 'A0', null);
  assert.equal(c.state.events.length, 2);
  assert.deepEqual(score(c), [0, 1]);
  c.state = plain(c.state);
  c.undoLastEvent();
  assert.equal(c.state.events.length, 0);
  assert.deepEqual(score(c), [0, 0]);
  assert.deepEqual(plain(c.state.court), before);
});

test('timeout non cancella il servizio né il flusso precedente', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  const before = plain(c.state);
  c.recordOpponentTimeoutEvent();
  c.state = JSON.parse(c.persisted);
  c.undoLastEvent();
  assert.deepEqual(score(c), [1, 0]);
  assert.equal(c.state.isServing, before.isServing);
  assert.deepEqual(plain(c.state.events), before.events);
});

test('sostituzione ripristina solo il campo interessato, anche dopo JSON', () => {
  for (const scope of ['our', 'opponent']) {
    const c = setup();
    const before = plain(c.state);
    const actionSnapshot = c.captureScoutActionSnapshot();
    c.state[scope === 'our' ? 'court' : 'opponentCourt'][0].main = 'Riserva';
    c.recordSubstitutionEvent({ playerIn: 'Riserva', playerOut: scope === 'our' ? 'A0' : 'B0', teamScope: scope, actionSnapshot });
    c.state = JSON.parse(c.persisted);
    c.undoLastEvent();
    assert.deepEqual(plain(c.state.court), before.court);
    assert.deepEqual(plain(c.state.opponentCourt), before.opponentCourt);
  }
});

test('annulla il muro ripristina la valutazione inferita dell’attacco e rimuove i collegamenti', async () => {
  const c = setup();
  c.state.events.push({ eventId: 1, set: 1, skillId: 'attack', team: 'opponent', code: '/', pendingBlockEval: true, relatedEvents: [] });
  await c.handleEventClick('0', 'block', '#', 'A0', null);
  assert.equal(c.state.events[0].derivedFromBlock, true);
  c.state = plain(c.state);
  c.undoLastEvent();
  assert.equal(c.state.events.length, 1);
  assert.equal(c.state.events[0].code, '/');
  assert.equal(c.state.events[0].pendingBlockEval, true);
  assert.equal(c.state.events[0].derivedFromBlock, undefined);
  assert.deepEqual(plain(c.state.events[0].relatedEvents), []);
});

test('correzioni di punteggio, eventi precedenti, impostazioni e video sopravvivono all’annullamento', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  c.addManualPoint('for', 1, 'for');
  c.state.events[0].code = 'corretto';
  c.state.theme = 'light';
  c.state.savedTeams = { Aggiornata: {} };
  c.state.video = { offsetSeconds: 42 };
  c.handleManualScore('against', 1);
  c.undoLastEvent();
  assert.equal(c.state.events[0].code, 'corretto');
  assert.equal(c.state.theme, 'light');
  assert.deepEqual(plain(c.state.savedTeams), { Aggiornata: {} });
  assert.equal(c.state.video.offsetSeconds, 42);
  assert.deepEqual(score(c), [1, 1]);
});

test('eliminare un evento precedente non lo fa ricomparire al prossimo annulla', () => {
  const c = setup();
  for (let i = 0; i < 3; i++) c.addManualPoint('for', 1, 'for');
  c.state.events.splice(0, 1);
  c.undoLastEvent();
  assert.deepEqual(Array.from(c.state.events, event => event.eventId), [2]);
});

test('il servizio ricalcolato parte dal set corrente, anche in uno storico legacy', () => {
  const c = setup();
  c.state.events = [{ eventId: 1, set: 1, team: 'our', skillId: 'attack', code: '#' }];
  c.state.currentSet = 2;
  c.state.setStarts[2] = { isServing: false };
  c.recomputeServeFlagsFromHistory();
  assert.equal(c.state.isServing, false);
  assert.equal(c.getAutoFlowState().teamScope, 'opponent');
  assert.equal(c.getAutoFlowState().skillId, 'serve');
});

test('ricezione legacy e battuta derivata si annullano insieme', () => {
  const c = setup();
  c.state.events = [
    { eventId: 1, set: '1', skillId: 'serve', team: 'opponent', derivedFromPassServe: true },
    { eventId: 2, set: '1', skillId: 'pass', code: '=', team: 'our', relatedEvents: [1] }
  ];
  c.undoLastEvent();
  assert.equal(c.state.events.length, 0);
  assert.deepEqual(score(c), [0, 0]);
});

test('le ricevute non crescono con storico o archivio e non ripristinano chiavi estranee importate', () => {
  const c = setup();
  const small = JSON.stringify(c.captureScoutActionSnapshot()).length;
  c.state.events = Array.from({ length: 1000 }, (_, i) => ({ eventId: i + 1, skillId: 'manual', set: 1 }));
  c.state.savedTeams.Archivio = 'x'.repeat(100000);
  const receipt = c.captureScoutActionSnapshot();
  assert.ok(JSON.stringify(receipt).length < small + 30);
  receipt.before.theme = 'obsolete';
  c.state.theme = 'light';
  c.state.events.push(c.attachScoutActionSnapshot({ eventId: 1001, skillId: 'manual', set: 1 }, receipt));
  c.undoLastEvent();
  assert.equal(c.state.theme, 'light');
});

test('recupero Luigi: cinque parziali ufficiali, tutti gli scambi e metadati conservati', { skip: !existsSync(originalPath) || !existsSync(repairedPath) }, () => {
  const original = JSON.parse(readFileSync(originalPath, 'utf8'));
  const repaired = repairBug1023(original);
  assert.deepEqual(repaired, JSON.parse(readFileSync(repairedPath, 'utf8')));
  const scoring = scoringContext(repaired.state);
  for (let set = 1; set <= 5; set++) {
    const summary = scoring.computePointsSummary(set);
    assert.deepEqual([summary.totalFor, summary.totalAgainst], officialScores[set - 1]);
  }
  const byId = new Map(repaired.state.events.map(event => [event.eventId, event]));
  for (const event of original.state.events.filter(event => !event.actionType || event.actionType !== 'set-change')) {
    const clean = value => {
      const result = structuredClone(value);
      for (const key of ['set', 'homeScore', 'visitorScore']) delete result[key];
      return result;
    };
    assert.deepEqual(clean(byId.get(event.eventId)), clean(event), `evento ${event.eventId}`);
  }
  assert.equal(repaired.state.currentSet, 5);
  assert.equal(Object.values(repaired.state.setResults).filter(value => value === 'opponent').length, 3);
});

test('sequenza di Luigi: annulla gli scambi iniziali, correggi formazione e continua nel terzo set', async () => {
  const c = setup();
  c.state.events = [{ eventId: 1, set: 2, skillId: 'manual', team: 'our', code: 'for', pointDirection: 'for', value: 18 },
    { eventId: 2, set: 2, skillId: 'manual', team: 'our', code: 'against', pointDirection: 'against', value: 25 }];
  c.state.currentSet = 2;
  prepare(c, 3, false);
  c.state.players = c.state.court.map(slot => slot.main);
  c.state.opponentPlayers = c.state.opponentCourt.map(slot => slot.main);
  c.state.pendingServe = { scope: 'opponent', playerName: c.state.opponentPlayers[0], playerIdx: 0 };
  await c.handleEventClick('0', 'pass', '=', c.state.players[0], null);
  c.addManualPoint('for', 1, 'for');
  c.state = plain(c.state);
  c.undoLastEvent();
  c.undoLastEvent();
  assert.equal(c.state.currentSet, 3);
  assert.deepEqual(score(c), [0, 0]);
  c.confirm = () => false;
  c.undoLastEvent();
  c.state.court[0].main = 'Formazione corretta';
  c.addManualPoint('for', 1, 'for');
  assert.equal(c.state.events.at(-1).set, 3);
  assert.deepEqual(score(c), [1, 0]);
  assert.deepEqual(score(c, 2), [18, 25]);
  c.undoLastEvent();
  assert.equal(c.state.court[0].main, 'Formazione corretta');
});

test('legacy: tornando al set precedente ricostruisce campi, rotazioni e risultati dai dati disponibili', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  const previous = plain(c.state);
  prepare(c, 2);
  delete c.state.events.at(-1).undoState;
  delete c.state.events.at(-1).__undoSnapshot;
  c.undoLastEvent();
  assert.equal(c.state.currentSet, 1);
  assert.deepEqual(plain(c.state.court), previous.court);
  assert.deepEqual(plain(c.state.opponentCourt), previous.opponentCourt);
  assert.equal(c.state.rotation, previous.rotation);
  assert.deepEqual(plain(c.state.setResults), {});
  assert.deepEqual(score(c), [1, 0]);
});

test('servizio legacy: ace ed errori di battuta restano corretti con rotazione automatica disattivata', () => {
  for (const autoRotate of [false, true]) for (const team of ['our', 'opponent']) {
    const c = setup();
    c.state.autoRotate = autoRotate;
    c.state.events = [{ set: 1, team, skillId: 'serve', code: '=' }];
    c.recomputeServeFlagsFromHistory();
    assert.equal(c.state.isServing, team === 'opponent');
    if (!autoRotate) {
      assert.equal(c.state.autoRotatePending, false);
      assert.equal(c.state.opponentAutoRotatePending, false);
    }
  }
});

test('annulla dopo contesa non attraversa il confine di set', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  prepare(c, 2, true);
  c.state.events.push({ eventId: 3, skillId: 'serve', team: 'our', code: '+', set: 2 });
  c.state.events.push(c.attachScoutActionSnapshot({ eventId: 4, skillId: 'attack', team: 'our', code: '#', set: 2 },
    // Ripristina fino al confine: l'intera azione appartiene al nuovo set.
    { ...c.captureScoutActionSnapshot(), eventCount: 2, previousEventId: 2 }));
  c.undoContestedRally();
  assert.equal(c.state.currentSet, 2);
  assert.equal(c.state.events.at(-1).actionType, 'set-change');
  assert.deepEqual(score(c), [0, 0]);
  assert.deepEqual(score(c, 1), [1, 0]);
});

test('il contesto di ricezione e le variabili dei due campi vengono sincronizzati dopo annulla', async () => {
  const c = setup();
  c.state.autoRoleBaseCourt = plain(c.state.court);
  c.state.opponentAutoRoleBaseCourt = plain(c.state.opponentCourt);
  c.autoRoleBaseCourt = court('obsolete');
  c.opponentAutoRoleBaseCourt = court('obsolete');
  c.state.events = [{ eventId: 1, skillId: 'pass', code: '+', zone: 5, team: 'our', set: 1 }];
  c.state.forceSkillActive = true;
  c.state.forceSkillScope = 'our';
  c.state.skillFlowOverride = 'attack';
  await c.handleEventClick('0', 'attack', '#', 'A0', null, { attackMeta: {} });
  c.undoLastEvent();
  assert.equal(c.lastReceiveContext.our.zone, 5);
  assert.equal(c.lastReceiveContext.our.evaluation, '+');
  assert.deepEqual(plain(c.autoRoleBaseCourt), plain(c.state.autoRoleBaseCourt));
  assert.deepEqual(plain(c.opponentAutoRoleBaseCourt), plain(c.state.opponentAutoRoleBaseCourt));
});

test('fine partita e ripresa mantengono ricevute valide senza aggiungere eventi fittizi', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  const count = c.state.events.length;
  c.endMatch();
  assert.equal(c.state.matchFinished, true);
  assert.equal(c.state.events.length, count);
  c.endMatch();
  assert.equal(c.state.matchFinished, false);
  c.state = JSON.parse(c.persisted);
  c.undoLastEvent();
  assert.deepEqual(score(c), [0, 0]);
  assert.equal(c.state.matchFinished, false);
  assert.deepEqual(plain(c.state.setResults), {});
});

test('statistiche di entrambe le squadre sono ricostruite dallo storico dopo annulla', async () => {
  const c = setup();
  vm.runInContext(read('js/scout/analysis/stats-update.js'), c);
  c.analysisEventsCacheRevision = 0;
  c.activeAggTab = 'summary';
  c.invalidateSkillChartCaches = () => {};
  c.updateSkillStatsUI = () => {};
  c.initStats = () => { c.state.stats = {}; };
  c.state.isServing = false;
  c.state.pendingServe = { scope: 'opponent', playerIdx: 0, playerName: 'B0' };
  await c.handleEventClick('0', 'pass', '=', 'A0', null);
  c.recalcAllStatsAndUpdateUI();
  assert.equal(c.state.opponentStats[0].serve['#'], 1);
  assert.equal(c.state.stats[0].pass['='], 1);
  c.undoLastEvent();
  assert.deepEqual(plain(c.state.stats), {});
  assert.deepEqual(plain(c.state.opponentStats), {});
});

test('una cache di posizionamento vuota usa il campo ripristinato', () => {
  const c = setup();
  c.state.autoRoleBaseCourt = [];
  c.state.opponentAutoRoleBaseCourt = [];
  c.autoRoleBaseCourt = [];
  c.opponentAutoRoleBaseCourt = [];
  c.addManualPoint('for', 1, 'for');
  c.undoLastEvent();
  assert.deepEqual(plain(c.autoRoleBaseCourt), plain(c.state.court));
  assert.deepEqual(plain(c.opponentAutoRoleBaseCourt), plain(c.state.opponentCourt));
});

test('tie break: annullare mantiene il lato campo in uso prima dell’ultima azione', () => {
  const c = setup();
  prepare(c, 5);
  c.state.courtSideSwapped = true;
  c.addManualPoint('for', 1, 'for');
  c.state.courtSideSwapped = false;
  c.addManualPoint('against', 1, 'against');
  c.state = JSON.parse(c.persisted);
  c.undoLastEvent();
  assert.equal(c.state.courtSideSwapped, false);
  c.undoLastEvent();
  assert.equal(c.state.courtSideSwapped, true);
  assert.equal(c.state.currentSet, 5);
  assert.deepEqual(score(c), [0, 0]);
});

test('due cambi confermati insieme dalla formazione sono una sola operazione annullabile', () => {
  for (const scope of ['our', 'opponent']) {
    const c = setup();
    vm.runInContext(read('js/scout/live/lineup-editor.js'), c);
    const key = scope === 'our' ? 'court' : 'opponentCourt';
    const before = plain(c.state[key]);
    c.getLineupBaseCourtFromState = () => c.state[key];
    c.lineupModalCourt = plain(c.state[key]);
    c.lineupModalCourt[0].main = 'Riserva 1';
    c.lineupModalCourt[3].main = 'Riserva 2';
    c.lineupModalContext = 'match';
    c.lineupModalScope = scope;
    c.lineupModalDefaultRotation = null;
    c.closeLineupModal = () => {};
    c.saveLineupModal({ countSubstitutions: true });
    assert.equal(c.state.events.length, 2);
    assert.equal(c.state[key][0].main, 'Riserva 1');
    c.state = JSON.parse(c.persisted);
    c.undoLastEvent();
    assert.equal(c.state.events.length, 0);
    assert.deepEqual(plain(c.state[key]), before);
  }
});

test('audit: annulla conserva un evento aggiunto in analisi tra l’azione precedente e quella da annullare', () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  c.addManualPoint('for', 1, 'for');
  const source = read('js/scout/video/video-events.js');
  vm.runInContext(source.slice(source.indexOf('function addEmptyVideoEventAfterSelection'), source.indexOf('function getFileBasename')), c);
  c.getSelectedVideoRowForInsert = () => ({ ev: c.state.events[0] });
  c.getVideoSkillEvents = () => c.state.events;
  c.getVideoBaseTimeMs = () => 0;
  c.renderTrajectoryAnalysis = () => {};
  c.renderServeTrajectoryAnalysis = () => {};
  c.addEmptyVideoEventAfterSelection();
  const insertedId = c.state.events[1].eventId;
  c.state = plain(c.state);
  c.undoLastEvent();
  assert.deepEqual(Array.from(c.state.events, event => event.eventId), [1, insertedId]);
});

test('audit: rinominare una giocatrice non ripristina il vecchio nome dopo annulla', () => {
  for (const scope of ['our', 'opponent']) {
    const c = setup();
    vm.runInContext(read('js/roster/core/player-model.js'), c);
    c.ensureCourtShape = () => {};
    c.state.court[1].main = 'Omonima';
    c.state.opponentCourt[1].main = 'Omonima';
    c.addManualPoint('for', 1, 'for');
    if (scope === 'our') c.replacePlayerNameEverywhere('Omonima', 'Nome corretto', 1);
    else c.replaceOpponentPlayerNameEverywhere('Omonima', 'Nome corretto', 1);
    c.state = plain(c.state);
    c.undoLastEvent();
    assert.equal(c.state[scope === 'our' ? 'court' : 'opponentCourt'][1].main, 'Nome corretto');
    assert.equal(c.state[scope === 'our' ? 'opponentCourt' : 'court'][1].main, 'Omonima');
  }
});

test('audit: IndexedDB conserva le operazioni atomiche dopo chiusura e riapertura del database', async () => {
  const c = setup();
  c.addManualPoint('for', 1, 'for');
  prepare(c, 2, false);
  c.state.pendingServe = { scope: 'opponent', playerIdx: 0, playerName: 'B0' };
  await c.handleEventClick('0', 'pass', '=', 'A0', null);
  const indexedDB = new IDBFactory();
  const open = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('audit-undo', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const db = await open();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('state', 'readwrite');
    transaction.objectStore('state').put(c.state, 'match');
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
  const reopened = await open();
  c.state = await new Promise((resolve, reject) => {
    const request = reopened.transaction('state').objectStore('state').get('match');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  reopened.close();
  c.undoLastEvent();
  assert.equal(c.state.currentSet, 2);
  assert.deepEqual(score(c), [0, 0]);
  c.undoLastEvent();
  assert.equal(c.state.currentSet, 1);
  assert.deepEqual(score(c), [1, 0]);
});

test('audit: sequenze generate di punti, timeout, set, salvataggi e annullamenti rispettano il modello', () => {
  const view = c => {
    // Il modello legge lo stato direttamente, senza usare le ricevute di produzione.
    const keys = [
      'currentSet', 'rotation', 'opponentRotation', 'isServing', 'matchFinished',
      'court', 'opponentCourt', 'courtSideSwapped', 'autoRotatePending', 'opponentAutoRotatePending',
      'autoRoleBaseCourt', 'opponentAutoRoleBaseCourt', 'liberoAutoMap', 'opponentLiberoAutoMap',
      'preferredLibero', 'opponentPreferredLibero', 'pendingServe', 'freeballPending',
      'freeballPendingScope', 'flowTeamScope', 'setResults', 'setStarts',
      'matchEndSetSnapshot', 'matchEndSetRecorded', 'events'
    ];
    return plain(Object.fromEntries(keys.filter(key => Object.hasOwn(c.state, key)).map(key => [key, c.state[key]])));
  };
  for (let seed = 1; seed <= 24; seed++) {
    const c = setup(seed % 2 === 0);
    let randomState = seed;
    const random = max => {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return Math.floor(randomState / 4294967296 * max);
    };
    const previous = [];
    for (let step = 0; step < 120; step++) {
      const action = random(8);
      if (action === 0) { c.state = plain(c.state); continue; }
      if (action <= 2 && previous.length) {
        const expected = previous.pop();
        c.undoLastEvent();
        assert.deepEqual(view(c), expected, `seed ${seed}, passo ${step}`);
      } else {
        previous.push(view(c));
        if (action === 3 && c.state.currentSet < 5) prepare(c, c.state.currentSet + 1, random(2) === 1);
        else if (action === 4) c.recordTimeoutEvent();
        else if (action === 5) c.recordOpponentTimeoutEvent();
        else c.addManualPoint(random(2) ? 'for' : 'against', 1, 'for');
      }
    }
  }
});
