import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { session as match, SKILLS } from '../js/globals.js';
import { session as ui } from '../src/features/state/scout-ui.js';
import { session as charts } from '../src/features/state/analysis-skill-analysis.js';
import { recalculateMatchStats } from '../src/features/analysis/stats-model.js';
import { sourceFunctions } from './helpers/source-functions.mjs';
import { readSourceFixture } from './helpers/source-fixture.mjs';

function isolatedStats(action) {
  const previous = match.state;
  const saved = [[ui, ['analysisEventsCache', 'analysisEventsCacheKey', 'analysisEventsCacheRevision']],
    [charts, ['skillChartSeriesCache', 'skillChartCacheRevision', 'skillChartRenderToken']]]
    .map(([state, keys]) => [state, keys.map(key => [key, Object.getOwnPropertyDescriptor(state, key)])]);
  try {
    match.state = { players: ['Ada', 'Bea'], stats: { stale: true }, events: [] };
    ui.analysisEventsCacheRevision = 4;
    charts.skillChartSeriesCache = new Map([['old', []]]);
    charts.skillChartCacheRevision = 8;
    charts.skillChartRenderToken = 12;
    action();
  } finally {
    match.state = previous;
    for (const [state, entries] of saved) for (const [key, descriptor] of entries) {
      delete state[key];
      if (descriptor) Object.defineProperty(state, key, descriptor);
    }
  }
}

test('statistics recalculation counts only eligible own events and preserves chronology and custom codes', () => isolatedStats(() => {
  const events = [, { playerIdx: 0, skillId: 'attack', code: '#' },
    { playerIdx: '1', skillId: 'serve', code: '+' },
    { team: 'opponent', playerIdx: 0, skillId: 'attack', code: '#' },
    { playerIdx: 0, skillId: 'manual', code: 'for' },
    { playerIdx: 0, skillId: 'attack', code: '#', actionType: 'timeout' },
    { playerIdx: 0, skillId: 'attack', code: '#', actionType: 'substitution' },
    ...[null, undefined, -1, 99].map(playerIdx => ({ playerIdx, skillId: 'attack', code: '#' })),
    { playerIdx: 0, skillId: 'custom', code: 'X' }];
  match.state.events = events;
  const before = structuredClone(events);
  recalculateMatchStats();
  assert.equal(match.state.stats[0].attack['#'], 1);
  assert.equal(match.state.stats[1].serve['+'], 1);
  assert.equal(match.state.stats[0].custom.X, 1);
  assert.equal(match.state.stats[0].manual, undefined);
  assert.equal(match.state.stats[99], undefined);
  assert.equal(match.state.stats.stale, undefined);
  assert.equal(match.state.events, events);
  assert.deepEqual(events, before);
  assert.equal(ui.analysisEventsCacheRevision, 5);
  assert.equal(charts.skillChartCacheRevision, 9);
  assert.equal(charts.skillChartRenderToken, 13);
  assert.equal(charts.skillChartSeriesCache.size, 0);
}));

test('statistics initialization allocates independent counts for every player and skill on every recalculation', () => isolatedStats(() => {
  recalculateMatchStats();
  for (const skill of SKILLS) assert.equal(match.state.stats[1][skill.id]['#'], 0);
  const old = match.state.stats;
  match.state.stats[0].attack['#'] = 9;
  assert.equal(match.state.stats[1].attack['#'], 0);
  assert.equal(match.state.stats[0].serve['#'], 0);
  recalculateMatchStats();
  assert.notEqual(match.state.stats, old);
  assert.equal(match.state.stats[0].attack['#'], 0);
}));

const tableSource = readSourceFixture(new URL('../src/features/analysis/aggregated-table.js', import.meta.url), 'utf8');
function analysisContext(present = true) {
  const calls = [];
  const context = vm.createContext({
    elAggTableBody: present ? {} : null, aggTableView: { mode: 'summary' },
    renderAnalysisTeamFilter: () => calls.push('team-filter'), renderAnalysisSummarySetFilter: () => calls.push('set-filter'),
    isAggSubtabVisible: () => false,
    buildReactAggregatedTable: () => ({ view: {}, summary: {}, scope: 'our', events: [] }),
    aggregatedTableStore: { publish: () => calls.push('table') }, renderScoreAndRotations: () => calls.push('score'),
    renderSecondTable: () => calls.push('second'), renderTrajectoryAnalysis: () => calls.push('attack'),
    renderServeTrajectoryAnalysis: () => calls.push('serve'), renderPlayerAnalysis: () => calls.push('player'),
  });
  vm.runInContext(sourceFunctions(tableSource, ['renderAggregatedTable', 'renderAnalysisViews']), context);
  return { context, calls };
}

test('a direct aggregated refresh retains its existing related-panel updates and order', () => {
  const { context, calls } = analysisContext();
  context.renderAggregatedTable();
  assert.deepEqual(calls, ['team-filter', 'set-filter', 'table', 'score', 'second', 'attack', 'serve']);
});

test('a complete analysis refresh publishes each related panel once after table and score', () => {
  const { context, calls } = analysisContext();
  context.renderAnalysisViews();
  assert.deepEqual(calls, ['team-filter', 'set-filter', 'table', 'score', 'attack', 'serve', 'second', 'player']);
});

test('analysis publication is independent of a mounted table container', () => {
  const { context, calls } = analysisContext(false);
  context.renderAnalysisViews();
  assert.deepEqual(calls, ['team-filter', 'set-filter', 'table', 'score', 'attack', 'serve', 'second', 'player']);
});

const editorSource = readSourceFixture(new URL('../src/features/video/event-editor.js', import.meta.url), 'utf8');
function editorContext() {
  const calls = [];
  const context = vm.createContext({
    state: { events: [] }, bulkEditActive: false,
    saveState: options => calls.push(['save', options ? options.persistLocal : 'default']),
    shouldTrackVideoUndo: () => true,
    syncEventPlayerLinks: () => calls.push(['links']), invalidateAnalysisCaches: () => calls.push(['invalidate']),
    recalculateMatchStats: () => calls.push(['stats']), renderLiveScore: () => calls.push(['live']),
    renderEventsLog: options => calls.push(['log', !!options?.suppressScroll]),
    renderAnalysisViews: () => calls.push(['analysis']), renderVideoAnalysis: () => calls.push(['video']),
  });
  vm.runInContext(sourceFunctions(editorSource, ['refreshAfterVideoEdit', 'forceSyncDataFromLog']), context);
  return { context, calls };
}

test('video edits preserve bulk deferral and save first, then recalculate and refresh views once', () => {
  const { context, calls } = editorContext();
  context.bulkEditActive = true;
  context.refreshAfterVideoEdit(true);
  assert.deepEqual(calls, []);
  context.bulkEditActive = false;
  context.refreshAfterVideoEdit(false);
  assert.deepEqual(calls, [['save', true], ['video']]);
  calls.length = 0;
  context.refreshAfterVideoEdit(true);
  assert.deepEqual(calls, [['save', true], ['links'], ['invalidate'], ['stats'], ['live'], ['log', false], ['analysis'], ['video']]);
});

test('log synchronization suppresses scrolling and saves after the final view updates', () => {
  const { context, calls } = editorContext();
  context.forceSyncDataFromLog();
  assert.deepEqual(calls, [['links'], ['invalidate'], ['stats'], ['live'], ['log', true], ['analysis'], ['video'], ['save', 'default']]);
});

const navigationSource = readSourceFixture(new URL('../src/features/core/app-lifecycle.js', import.meta.url), 'utf8');
function navigationContext() {
  const calls = [], frames = [], timers = [];
  const context = vm.createContext({
    state: { uiMatchSessionActive: true }, activeTab: 'scout', activeAggTab: 'trajectory', isLoadingMatch: false,
    document: { body: { dataset: {} }, documentElement: { dataset: {} } }, window: {},
    hasUsableMatch: () => true, saveState: () => calls.push('save'),
    syncMatchSessionUI: () => calls.push('session'), publishRuntimeView: () => calls.push('runtime'),
    requestAnimationFrame: callback => frames.push(callback), setTimeout: (callback, delay) => { assert.equal(delay, 0); timers.push(callback); },
    renderTrajectoryAnalysis: () => calls.push('attack'), renderServeTrajectoryAnalysis: () => calls.push('serve'),
    renderPlayerAnalysis: () => calls.push('player'), renderSetTrendAnalysis: () => calls.push('trend'),
    renderPlayByPlayAnalysis: () => calls.push('play'), renderAnalysisSkillChartsPanel: () => calls.push('charts'),
    renderMatchSheetAnalysis: () => calls.push('sheet'),
  });
  vm.runInContext(sourceFunctions(navigationSource, ['getAggTabRenderer', 'scheduleAggRefresh', 'setActiveAggTab', 'setActiveTab']), context);
  return { context, calls, frames, timers };
}

test('analysis subtab navigation shares scheduling and retains both trajectory refreshes after state and persistence', () => {
  const { context, calls, frames, timers } = navigationContext();
  context.setActiveAggTab('trajectory');
  assert.equal(context.state.uiAggTab, 'trajectory');
  assert.equal(context.document.body.dataset.aggTab, 'trajectory');
  assert.deepEqual(calls, ['save']);
  assert.equal(frames.length, 1);
  assert.equal(timers[0], frames[0]);
  context.activeAggTab = 'player';
  frames[0](); timers[0]();
  assert.deepEqual(calls, ['save', 'attack', 'serve', 'attack', 'serve']);
});

test('entering analysis resolves the current subtab separately for each deferred callback', () => {
  const { context, calls, frames, timers } = navigationContext();
  context.setActiveTab('aggregated');
  assert.equal(context.state.uiActiveTab, 'aggregated');
  assert.deepEqual(calls, ['save', 'session', 'runtime']);
  frames[0]();
  context.activeAggTab = 'player'; timers[0]();
  context.activeAggTab = 'summary'; timers[0]();
  assert.deepEqual(calls, ['save', 'session', 'runtime', 'attack', 'player']);
});

test('analysis navigation covers each panel and skips unknown panels and saves during loading', () => {
  for (const [tab, expected] of [['serve', 'serve'], ['player', 'player'], ['set-trend', 'trend'], ['play-by-play', 'play'], ['skill-charts', 'charts'], ['match-sheet', 'sheet']]) {
    const { context, calls, frames } = navigationContext();
    context.isLoadingMatch = true;
    context.setActiveAggTab(tab);
    frames[0]();
    assert.deepEqual(calls, [expected]);
  }
  for (const tab of ['summary', 'toString', '__proto__', 'unknown']) {
    const { context, frames, timers } = navigationContext();
    context.setActiveAggTab(tab);
    assert.equal(frames.length, 0);
    assert.equal(timers.length, 0);
  }
});
