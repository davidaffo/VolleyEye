import test from 'node:test';
import assert from 'node:assert/strict';
import { createFilterSelection, createFilterSelections, matchesFilterSelection, matchesFilterAlternatives, pruneFilterSelections, clearFilterSelections } from '../src/domain/filter-selections.js';
import { matchesAdvancedFilters, matchesVideoFilters } from '../src/features/analysis/filter-model.js';
import { snapshotVideoFilters, applyVideoFilterSnapshot, countActiveVideoFilters } from '../src/features/analysis/video-filter-model.js';
import { session as filters } from '../src/features/state/analysis-analysis-filters.js';
import { session as match } from '../js/globals.js';
import { getFilteredAttackSummaryEvents } from '../src/features/analysis/trajectory-model.js';
import { invalidateAnalysisCaches } from '../src/features/analysis/cache-model.js';

test('inclusions and exclusions compose and exclusions do not reject missing values', () => {
  const selection = createFilterSelection(['A', 'B'], ['B', 'C']);
  assert.equal(matchesFilterSelection(selection, 'A'), true);
  assert.equal(matchesFilterSelection(selection, 'B'), false);
  assert.equal(matchesFilterSelection(selection, 'C'), false);
  assert.equal(matchesFilterSelection(selection, null), false);
  const onlyExcluded = createFilterSelection([], ['C']);
  assert.equal(matchesFilterSelection(onlyExcluded, 'A'), true);
  assert.equal(matchesFilterSelection(onlyExcluded, 'C'), false);
  assert.equal(matchesFilterSelection(onlyExcluded, null), true);
  assert.equal(matchesFilterAlternatives(createFilterSelection([], ['our:0']), ['our:0', 0, '0']), false);
  assert.equal(matchesFilterAlternatives(createFilterSelection([], ['our:0']), ['opponent:0', 0, '0']), true);
});

test('video and analysis apply exclusion with inclusions across distinct fields', () => {
  const oldState = match.state;
  try {
    match.state = { ...oldState, players: ['Ada', 'Bea'], opponentPlayers: ['Ada'], selectedTeam: '', selectedOpponentTeam: '', events: [] };
    const state = { teams: createFilterSelection([], ['opponent']), players: createFilterSelection([], ['our:1']),
      codes: createFilterSelection(['#', '='], ['=']), setTypes: createFilterSelection([], ['quick']) };
    const ev = { team: 'our', skillId: 'attack', playerIdx: 0, code: '#', setType: 'alta' };
    assert.equal(matchesVideoFilters(ev, state), true);
    assert.equal(matchesVideoFilters({ ...ev, code: '=' }, state), false);
    assert.equal(matchesVideoFilters({ ...ev, setType: 'quick' }, state), false);
    assert.equal(matchesVideoFilters({ ...ev, playerIdx: 1 }, state), false);
    assert.equal(matchesVideoFilters({ ...ev, team: 'opponent' }, state), false);
    assert.equal(matchesAdvancedFilters(ev, { setTypes: state.setTypes }), true);
    assert.equal(matchesAdvancedFilters({ ...ev, setType: 'quick' }, { setTypes: state.setTypes }), false);
    assert.equal(matchesAdvancedFilters({ ...ev, setType: null }, { setTypes: state.setTypes }), true);
  } finally { match.state = oldState; }
});

test('presets restore exclusions, remain compatible with older presets and reset cleanly', () => {
  const old = filters.videoFilterState;
  try {
    filters.videoFilterState = { codes: createFilterSelection(['#'], ['=']), sets: createFilterSelection([], [2]) };
    const snapshot = snapshotVideoFilters();
    assert.deepEqual(snapshot.excluded, { codes: ['='], sets: [2] });
    assert.equal(countActiveVideoFilters(snapshot), 2);
    applyVideoFilterSnapshot(JSON.parse(JSON.stringify(snapshot)));
    assert.deepEqual([...filters.videoFilterState.codes.excluded], ['=']);
    assert.deepEqual([...filters.videoFilterState.sets.excluded], [2]);
    pruneFilterSelections(filters.videoFilterState, [['codes', [{ value: '#' }], false]]);
    assert.equal(filters.videoFilterState.codes.excluded.size, 0);
    clearFilterSelections(filters.videoFilterState);
    assert.equal(filters.videoFilterState.sets.excluded.size, 0);
    applyVideoFilterSnapshot({ codes: ['#'] });
    assert.deepEqual([...filters.videoFilterState.codes], ['#']);
    assert.equal(filters.videoFilterState.codes.excluded.size, 0);
  } finally { filters.videoFilterState = old; }
});

test('attack analysis applies exclusions to player and evaluation even without trajectories', () => {
  const oldState = match.state, oldTeam = filters.analysisTeamFilterState, oldTrajectory = filters.trajectoryFilterState;
  try {
    const events = [
      { skillId: 'attack', team: 'our', playerIdx: 0, playerName: 'Ada', code: '#' },
      { skillId: 'attack', team: 'our', playerIdx: 1, playerName: 'Bea', code: '#' },
      { skillId: 'attack', team: 'our', playerIdx: 0, playerName: 'Ada', code: '=' },
    ];
    match.state = { ...oldState, players: ['Ada', 'Bea'], opponentPlayers: [], selectedTeam: '', events, savedMatches: {},
      uiAnalysisExtraMatchesByScope: { our: [], opponent: [] }, useOpponentTeam: false };
    filters.analysisTeamFilterState = { teams: new Set(['our']) };
    filters.trajectoryFilterState = createFilterSelections(['setters', 'players', 'sets', 'codes', 'attackTypes', 'zones', 'setTypes', 'bases', 'phases', 'receiveEvaluations', 'receiveZones', 'attackErrors'], { previousSkill: true });
    filters.trajectoryFilterState.players = createFilterSelection([], [1]);
    filters.trajectoryFilterState.codes = createFilterSelection([], ['=']);
    invalidateAnalysisCaches();
    assert.deepEqual(getFilteredAttackSummaryEvents(), [events[0]]);
  } finally {
    match.state = oldState; filters.analysisTeamFilterState = oldTeam; filters.trajectoryFilterState = oldTrajectory;
    invalidateAnalysisCaches();
  }
});

test('match sheet selection cycles include, exclude and neutral', async () => {
  const { changeReactMatchSheetFilter } = await import('../src/features/analysis/match-sheet-commands.js');
  const { matchSheetStore } = await import('../src/state/roster-import-store.mjs');
  const oldState = match.state, oldStore = matchSheetStore.getSnapshot();
  const oldDoc = globalThis.document, oldWindow = globalThis.window;
  try {
    match.state = { ...oldState, uiMatchSheetFilters: {}, events: [], players: [], opponentPlayers: [], savedMatches: {}, setStarts: {} };
    matchSheetStore.publish({ sets: [1, 2], roster: [] });
    // Rendering is optional when the match-sheet page is not mounted.
    globalThis.document = { getElementById: () => null, body: { dataset: {} }, documentElement: { style: {} } };
    globalThis.window = { __EXPORT_ANALYSIS_HTML__: true };
    changeReactMatchSheetFilter('sets', '1', true);
    assert.deepEqual(match.state.uiMatchSheetFilters.sideoutSets, ['1']);
    changeReactMatchSheetFilter('sets', '1', false);
    assert.deepEqual(match.state.uiMatchSheetFilters.sideoutSets, []);
    assert.deepEqual(match.state.uiMatchSheetFilters.sideoutExcludedSets, ['1']);
    changeReactMatchSheetFilter('sets', '1', true);
    assert.deepEqual(match.state.uiMatchSheetFilters.sideoutExcludedSets, []);
  } finally {
    match.state = oldState; matchSheetStore.replace(oldStore);
    if (oldDoc === undefined) delete globalThis.document; else globalThis.document = oldDoc;
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
  }
});
