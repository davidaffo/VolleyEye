import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { readSourceFixture } from './helpers/source-fixture.mjs';
import { session as match } from '../js/globals.js';
import { session as ui } from '../src/features/state/scout-ui.js';
import { session as filters } from '../src/features/state/analysis-analysis-filters.js';
import { filterStore } from '../src/state/filter-store.mjs';
import { multiscoutStore } from '../src/state/roster-import-store.mjs';
import { renderAnalysisTeamFilter, renderAnalysisMatchFilter, renderAnalysisSummarySetFilter } from '../src/features/analysis/shared-filter-view.js';
import { publishReactSplitFilter, publishReactPreviousSkill, renderAnalysisCourtSideRadios } from '../src/features/analysis/filter-view.js';
import { publishReactMultiscout } from '../src/features/analysis/multiscout-view.js';

function isolated(action) {
  const previous = match.state, oldFilters = filterStore.getSnapshot(), oldMulti = multiscoutStore.getSnapshot();
  const states = [[filters, ['analysisTeamFilterState', 'analysisSummaryFilterState', 'multiscoutTeamScope']]];
  const saved = states.map(([state, keys]) => [state, keys.map(key => [key, Object.getOwnPropertyDescriptor(state, key)])]);
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  try {
    Object.defineProperty(globalThis, "document", { configurable: true, get() { throw new Error("Filter publication must not read the DOM"); } });
    match.state = { useOpponentTeam: true, players: [], opponentPlayers: [], events: [], savedMatches: {},
      match: { teamName: 'Home', opponent: 'Away' }, selectedTeam: 'Home', selectedOpponentTeam: 'Away',
      uiAnalysisExtraMatchesByScope: { our: ['missing'], opponent: ['other'] } };
    filters.analysisTeamFilterState = { teams: new Set(['our', 'invalid']) };
    filters.analysisSummaryFilterState = { sets: new Set([7]) };
    filters.multiscoutTeamScope = 'our';
    action();
  } finally {
    match.state = previous;
    for (const [state, entries] of saved) for (const [key, descriptor] of entries) { delete state[key]; if (descriptor) Object.defineProperty(state, key, descriptor); }
    filterStore.replace(oldFilters);
    multiscoutStore.replace(oldMulti);
    delete globalThis.document;
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
  }
}

test('shared team and match publishers prune options and publish cloneable commands without controller callbacks', () => isolated(() => {
  renderAnalysisTeamFilter();
  const team = filterStore.getView('analysis-filter-teams'), matches = filterStore.getView('analysis-filter-matches');
  assert.deepEqual(team.selected, ['our']);
  assert.deepEqual(team.options.map(option => option.value), ['our', 'opponent']);
  assert.equal(team.onChange, null);
  assert.deepEqual(team.changeAction, { command: 'handleAnalysisTeamFilterChange' });
  assert.deepEqual(structuredClone(team), team);
  assert.deepEqual(matches.changeAction, { command: 'handleAnalysisMatchFilterChange' });
  assert.deepEqual(matches.selected, []);
  assert.deepEqual(match.state.uiAnalysisExtraMatchesByScope, { our: [], opponent: ['other'] });
}));

test('shared summary and match filters publish visibility, empty selections and counts without DOM containers', () => isolated(() => {
  filters.analysisTeamFilterState.teams = new Set(['our']);
  // An event cache avoids touching unrelated player-link state in this publisher case.
  const old = [ui.analysisEventsCache, ui.analysisEventsCacheKey, ui.analysisEventsCacheRevision];
  try {
    ui.analysisEventsCache = null;
    ui.analysisEventsCacheKey = '';
    ui.analysisEventsCacheRevision = 0;
    renderAnalysisSummarySetFilter();
    const sets = filterStore.getView('analysis-filter-sets');
    assert.deepEqual(sets.selected, []);
    assert.equal(sets.changeAction.command, 'handleAnalysisSummarySetFilterChange');
    assert.equal(sets.visible, false);
    renderAnalysisMatchFilter();
    assert.equal(multiscoutStore.getSnapshot().count, 0);
  } finally { [ui.analysisEventsCache, ui.analysisEventsCacheKey, ui.analysisEventsCacheRevision] = old; }
}));

test('multiscout commands keep the published team scope even when the active team changes', () => isolated(() => {
  filters.multiscoutTeamScope = 'opponent';
  publishReactMultiscout();
  const view = filterStore.getView('multiscout-list');
  filters.multiscoutTeamScope = 'our';
  assert.deepEqual(view.changeAction, { command: 'changeMultiscoutMatches', args: ['opponent'] });
  assert.equal(view.onChange, null);
  assert.deepEqual(structuredClone(view), view);
}));

const source = readSourceFixture(new URL('../src/features/analysis/analysis-filters.js', import.meta.url), 'utf8');
test('filter command dispatch updates numeric selection before invalidation and panel refresh', () => {
  const calls = [];
  const context = vm.createContext({
    elAnalysisFilterSets: {}, analysisSummaryFilterState: { sets: new Set() },
    getCheckedValues: (_container, config) => { assert.equal(config.asNumber, true); return [2, 3]; },
    invalidateSkillChartCaches: () => calls.push(['invalidate', [...context.analysisSummaryFilterState.sets]]),
    renderAggregatedTable: () => calls.push(['aggregate']), renderPlayerAnalysis: () => calls.push(['player']),
  });
  vm.runInContext(source.slice(source.indexOf("function handleAnalysisMatchFilterChange")), context);
  context.runAnalysisFilterAction({ command: 'handleAnalysisSummarySetFilterChange' }, { type: 'change' });
  assert.deepEqual(calls, [['invalidate', [2, 3]], ['aggregate'], ['player']]);
  assert.throws(() => context.runAnalysisFilterAction({ command: 'toString' }), /Unknown analysis filter action/);
});

const bundle = await build({ stdin: {
  contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom';
    import {AnalysisFilter, PreviousSkillSelect} from './src/components/AnalysisFilter.jsx'; import {FilterField, FilterVisibility} from './src/components/ui/FilterField.jsx'; import {filterStore} from './src/state/filter-store.mjs';
    const root=createRoot(document.getElementById('root')); globalThis.filterStore=filterStore;
    globalThis.renderFilter=()=>flushSync(()=>root.render(React.createElement(AnalysisFilter,{id:'test'})));
    globalThis.renderField=()=>flushSync(()=>root.render(React.createElement(FilterField,{filterId:'test',label:'Squadra'},React.createElement(AnalysisFilter,{id:'test'}))));
    globalThis.renderVisibility=()=>flushSync(()=>root.render(React.createElement(FilterVisibility,{filterId:'test'},'Reset filtri')));
    globalThis.renderPrevious=()=>flushSync(()=>root.render(React.createElement(PreviousSkillSelect,{id:'test'})));
    globalThis.unmountFilter=()=>flushSync(()=>root.unmount());`, resolveDir: process.cwd(),
}, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'filter-command-probe', setup(build) {
    build.onResolve({ filter: /app\/actions\.mjs$/ }, () => ({ path: 'actions', namespace: 'probe' }));
    build.onLoad({ filter: /.*/, namespace: 'probe' }, () => ({ contents: 'export const events={runAnalysisFilterAction:(...args)=>globalThis.dispatchFilter(...args)};' }));
  } }],
});
test('React changes the selection synchronously before dispatch and preserves the native event', () => {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only' });
  const window = dom.window, calls = [];
  try {
    window.eval(bundle.outputFiles[0].text);
    const action = { command: 'handleAnalysisTeamFilterChange' };
    window.filterStore.publish('test', { type: 'checkbox', groups: [], options: [{ value: 'our', label: 'Home' }],
      selected: [], changeAction: action, onChange: null });
    window.dispatchFilter = (command, event) => calls.push({ command, event, selected: [...window.filterStore.getView('test').selected] });
    window.renderFilter();
    const input = window.document.querySelector('input');
    input.click();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, action);
    assert.deepEqual(calls[0].selected, ['our']);
    assert.equal(calls[0].event.target, input);
    assert.equal(calls[0].event.target.checked, true);
  } finally { window.unmountFilter?.(); window.close(); }
});


test('split, previous-skill and court-side publishers share cloneable commands without callbacks', () => isolated(() => {
  const command = Object.freeze({ command: 'handleVideoFilterChange' });
  publishReactSplitFilter('split-probe', [{ scope: 'our', options: [{ value: 'our:0', label: 'Ada' }] }], new Set(['our:0']), command);
  publishReactPreviousSkill('previous-probe', 'receive-positive', command);
  const side = Object.freeze({ command: 'changeTrajectoryCourtSide', args: Object.freeze(['serve']) });
  renderAnalysisCourtSideRadios('side-probe', 'far', side, 'serve-side');
  for (const id of ['split-probe', 'previous-probe', 'side-probe']) {
    const view = filterStore.getView(id);
    assert.equal(view.onChange, null);
    assert.deepEqual(structuredClone(view), view);
  }
  assert.equal(filterStore.getView('split-probe').changeAction, command);
  assert.equal(filterStore.getView('previous-probe').value, 'receive-positive');
  assert.equal(filterStore.getView('side-probe').changeAction, side);
  assert.deepEqual(filterStore.getView('side-probe').selected, ['far']);
}));

function commandContext(dependencies) {
  const context = vm.createContext(dependencies);
  vm.runInContext(source.slice(source.indexOf('function handleAnalysisMatchFilterChange')), context);
  return context;
}

test('video filter commands clear the active preset before synchronization and focus after rendering', () => {
  const calls = [], elements = { prev: {} }, state = { sets: new Set(), prevSkill: 'any' };
  const context = commandContext({ activeVideoFilterPresetId: 'old', videoFilterState: state,
    getFilterControlIds: group => { assert.equal(context.activeVideoFilterPresetId, null); calls.push('elements'); return elements; },
    getFilterFields: group => { assert.equal(group, 'videoFilterState'); return []; },
    syncFilterSelections: (filters) => { assert.equal(filters, state); calls.push('sync'); },
    readReactFilterSelect: element => { assert.equal(element, elements.prev); return 'receive-positive'; },
    renderVideoAnalysis: () => { assert.equal(state.prevSkill, 'receive-positive'); calls.push('render'); },
    focusFirstFilteredVideoEventMobile: () => calls.push('focus'),
  });
  context.runAnalysisFilterAction({ command: 'handleVideoFilterChange' });
  assert.deepEqual(calls, ['elements', 'sync', 'render', 'focus']);
});

for (const kind of ['attack', 'serve']) test(`court-side command reads the active scope at the gesture and saves before rendering: ${kind}`, () => {
  const calls = [], attack = 'traj-court-side', serve = 'serve-traj-court-side', preferences = { our: 'near', opponent: 'near' };
  const context = commandContext({
    elTrajCourtSide: attack, elServeTrajCourtSide: serve,
    getAnalysisTeamScope: () => 'opponent',
    ensureCourtSideState: key => { assert.equal(key, kind === 'serve' ? 'uiServeTrajectoryCourtSideByScope' : 'uiTrajectoryCourtSideByScope'); return preferences; },
    getCheckedRadioValue: element => { assert.equal(element, kind === 'serve' ? serve : attack); return 'far'; },
    getAnalysisCourtSide: value => value,
    saveState: () => { assert.deepEqual(preferences, { our: 'near', opponent: 'far' }); calls.push('save'); },
    renderTrajectoryAnalysis: () => calls.push('attack'), renderServeTrajectoryAnalysis: () => calls.push('serve'),
  });
  context.runAnalysisFilterAction({ command: 'changeTrajectoryCourtSide', args: [kind] });
  assert.deepEqual(calls, ['save', kind]);
});

test('video filter reset clears selections before rendering and focuses the refreshed list', () => {
  const calls = [], state = { sets: new Set([2]), prevSkill: 'receive-positive' };
  const context = commandContext({ activeVideoFilterPresetId: 'old', videoFilterState: state,
    clearFilterSelections: filters => { assert.equal(context.activeVideoFilterPresetId, null); filters.sets.clear(); filters.prevSkill = 'any'; calls.push('clear'); },
    renderVideoAnalysis: () => { assert.equal(state.sets.size, 0); assert.equal(state.prevSkill, 'any'); calls.push('render'); },
    focusFirstFilteredVideoEventMobile: () => calls.push('focus'),
  });
  context.resetVideoFilters();
  assert.deepEqual(calls, ['clear', 'render', 'focus']);
});

test('React previous-skill select updates its value before dispatching the native gesture', () => {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only' });
  const window = dom.window, calls = [];
  try {
    window.eval(bundle.outputFiles[0].text);
    const action = { command: 'handleVideoFilterChange' };
    window.filterStore.publish('test', { type: 'select', groups: [], options: [{ value: 'any', label: 'Tutti' }, { value: 'receive-positive', label: 'Ricezione' }],
      selected: [], value: 'any', changeAction: action, onChange: null });
    window.dispatchFilter = (command, event) => calls.push({ command, event, value: window.filterStore.getView('test').value });
    window.renderPrevious();
    const select = window.document.querySelector('select');
    select.value = 'receive-positive';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, action);
    assert.equal(calls[0].value, 'receive-positive');
    assert.equal(calls[0].event.target, select);
  } finally { window.unmountFilter?.(); window.close(); }
});

test('shared attack options keep trajectory-based filters separate from the full attack-type list', async () => {
  const { buildAttackTrajectoryFilterOptions } = await import('../src/features/analysis/filter-controls.js');
  const trajectory = { skillId: 'attack', set: 1, zone: 4, code: '#', attackType: 'diagonal', setType: 'High', base: 'p', attackBp: true };
  const untracked = { skillId: 'attack', set: 2, zone: 2, code: '=', attackType: 'line', setType: 'Fast' };
  const result = buildAttackTrajectoryFilterOptions([trajectory], [trajectory, untracked]);
  assert.deepEqual(result.setsOpts.map(option => option.value), [1]);
  assert.deepEqual(result.codesOpts.map(option => option.value), ['#']);
  assert.deepEqual(result.zonesOpts.map(option => option.value), [4]);
  assert.equal(result.setTypeOpts.some(option => option.value === 'Fast'), false);
  assert.equal(result.attackTypeOpts.length, 2);
  assert.equal(result.phaseOpts[0].value, 'bp');
});


test('React owns filter and reset visibility while retaining choices and selections across updates', () => {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only' });
  const window = dom.window;
  try {
    window.eval(bundle.outputFiles[0].text);
    const view = { type: 'checkbox', groups: [], options: [{ value: 'our', label: 'Home' }], selected: ['our'], visible: false };
    window.filterStore.publish('test', view);
    window.renderField();
    const field = window.document.querySelector('.analysis-filter');
    assert.equal(field.style.display, 'none');
    assert.equal(field.querySelector('input').checked, true);
    window.filterStore.publish('test', { ...view, visible: true });
    window.renderField();
    assert.equal(field.style.display, '');
    assert.equal(field.querySelector('input').checked, true);
    window.filterStore.publish('test', { ...view, visible: false });
    window.renderVisibility();
    assert.equal(window.document.getElementById('root').firstElementChild.style.display, 'none');
    assert.equal(window.document.getElementById('root').textContent, 'Reset filtri');
  } finally { window.unmountFilter?.(); window.close(); }
});
