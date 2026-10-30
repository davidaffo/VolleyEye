import test from 'node:test';
import assert from 'node:assert/strict';
import { session as match } from '../js/globals.js';
import { session as filters } from '../src/features/state/analysis-analysis-filters.js';
import { session as ui } from '../src/features/state/scout-ui.js';
import { session as charts } from '../src/features/state/analysis-skill-analysis.js';
import { invalidateAnalysisCaches, invalidateAnalysisEventCaches, invalidateSkillChartCaches } from '../src/features/analysis/cache-model.js';
import { resetAnalysisForMatch } from '../src/features/analysis/reset-model.js';

const groups = ['analysisTeamFilterState', 'analysisSummaryFilterState', 'trajectoryFilterState',
  'serveTrajectoryFilterState', 'playerTrajectoryFilterState', 'playerServeTrajectoryFilterState',
  'secondFilterState', 'playerSecondFilterState', 'videoFilterState'];

function isolated(action) {
  const entries = [
    [match, ['state']], [filters, [...groups, 'activeVideoFilterPresetId']],
    [ui, ['analysisStatsCache', 'analysisStatsScope', 'analysisEventsCache', 'analysisEventsCacheKey', 'analysisEventsCacheRevision', 'aggTableView']],
    [charts, ['skillChartSeriesCache', 'skillChartCacheRevision', 'skillChartRenderToken', 'skillChartRenderPaused', 'skillChartRenderRefreshPending']],
  ];
  const saved = entries.map(([state, keys]) => [state, keys.map(key => [key, state[key]])]);
  try {
    match.state = { useOpponentTeam: true, players: ['Ada'], opponentPlayers: ['Bea'], events: [{ id: 1 }], uiAnalysisExtraMatchesByScope: { our: ['saved'], opponent: [] } };
    ui.analysisStatsCache = { retained: true };
    ui.analysisStatsScope = 'opponent';
    ui.analysisEventsCache = [{ id: 'stale' }];
    ui.analysisEventsCacheKey = 'old';
    ui.analysisEventsCacheRevision = 7;
    charts.skillChartSeriesCache = new Map([['old', []]]);
    charts.skillChartCacheRevision = 11;
    charts.skillChartRenderToken = 17;
    charts.skillChartRenderPaused = true;
    charts.skillChartRenderRefreshPending = true;
    action();
  } finally {
    for (const [state, values] of saved) for (const [key, value] of values) state[key] = value;
  }
}

function assertChartsInvalidated() {
  assert.equal(charts.skillChartSeriesCache.size, 0);
  assert.equal(charts.skillChartCacheRevision, 12);
  assert.equal(charts.skillChartRenderToken, 18);
  assert.equal(charts.skillChartRenderPaused, true);
  assert.equal(charts.skillChartRenderRefreshPending, true);
}

function assertEventsInvalidated() {
  assert.equal(ui.analysisEventsCache, null);
  assert.equal(ui.analysisEventsCacheKey, '');
  assert.equal(ui.analysisEventsCacheRevision, 8);
  assertChartsInvalidated();
}

test('chart invalidation cancels stale render tokens without changing event caches or pause state', () => isolated(() => {
  const series = charts.skillChartSeriesCache, events = ui.analysisEventsCache;
  invalidateSkillChartCaches();
  assertChartsInvalidated();
  assert.equal(charts.skillChartSeriesCache, series);
  assert.equal(ui.analysisEventsCache, events);
  assert.equal(ui.analysisEventsCacheRevision, 7);
}));

test('event invalidation preserves statistics and scope for the statistics recalculation path', () => isolated(() => {
  const stats = ui.analysisStatsCache;
  invalidateAnalysisEventCaches();
  assertEventsInvalidated();
  assert.equal(ui.analysisStatsCache, stats);
  assert.equal(ui.analysisStatsScope, 'opponent');
}));

test('analysis invalidation also drops statistics and scope with a single revision advance', () => isolated(() => {
  invalidateAnalysisCaches();
  assertEventsInvalidated();
  assert.equal(ui.analysisStatsCache, null);
  assert.equal(ui.analysisStatsScope, null);
}));

for (const scenario of [
  { name: 'two teams', useOpponentTeam: true, players: ['Ada'], opponentPlayers: ['Bea'], expected: [] },
  { name: 'one team', useOpponentTeam: false, players: ['Ada'], opponentPlayers: [], expected: ['our'] },
  { name: 'visiting roster only', useOpponentTeam: true, players: [], opponentPlayers: ['Bea'], expected: ['opponent'] },
]) test(`match reset clears every filter in place and restores team defaults: ${scenario.name}`, () => isolated(() => {
  Object.assign(match.state, scenario);
  const events = match.state.events, extraMatches = match.state.uiAnalysisExtraMatchesByScope;
  const references = [];
  for (const key of groups) {
    filters[key] = Object.fromEntries(Object.keys(filters[key]).map(field => [field, field === 'prevSkill' ? 'receive-positive' : new Set(['old'])]));
    references.push([key, filters[key], Object.values(filters[key]).filter(value => value instanceof Set)]);
  }
  filters.activeVideoFilterPresetId = 'preset';
  ui.aggTableView = { mode: 'detail', skillId: 'attack', playerIdx: 1 };
  resetAnalysisForMatch();
  for (const [key, state, sets] of references) {
    assert.equal(filters[key], state);
    for (const value of sets) assert.equal(Object.values(state).includes(value), true);
    for (const [field, value] of Object.entries(state)) {
      if (field === 'prevSkill') assert.equal(value, 'any');
      else assert.deepEqual([...value], key === 'analysisTeamFilterState' ? scenario.expected : []);
    }
  }
  assert.equal(filters.activeVideoFilterPresetId, null);
  assert.deepEqual(ui.aggTableView, { mode: 'summary', skillId: null, playerIdx: null });
  assert.equal(match.state.events, events);
  assert.equal(match.state.uiAnalysisExtraMatchesByScope, extraMatches);
  assertEventsInvalidated();
}));
