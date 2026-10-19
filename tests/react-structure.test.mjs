import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomainState } from '../src/app/domain-state.mjs';
import { session as match } from '../js/globals.js';
import { settingsStore } from '../src/state/roster-import-store.mjs';
import { publishReactSettings } from '../src/features/settings/view.js';
import { emitDomainEvent, subscribeDomainEvents } from '../src/domain/events.js';

test('DOM references follow mounts while domain values keep their identity and explicit overrides', () => {
  let element = null, creations = 0;
  const state = createDomainState({ draft: () => { creations++; return {}; } }, { input: () => element });
  assert.equal(state.input, null);
  element = { id: 'mounted' };
  assert.equal(state.input, element);
  const draft = state.draft;
  element = { id: 'remounted' };
  assert.equal(state.input, element);
  assert.equal(state.draft, draft);
  assert.equal(creations, 1);
  state.input = 'explicit override';
  element = null;
  assert.equal(state.input, 'explicit override');
});

test('settings publish only when their dependencies change, including nested configuration', () => {
  const previous = match.state, previousView = settingsStore.getSnapshot();
  match.state = { rotation: 1, opponentRotation: 1, metricsConfig: {}, opponentSkillConfig: {} };
  let notifications = 0;
  const unsubscribe = settingsStore.subscribe(() => notifications++);
  try {
    publishReactSettings();
    const initial = notifications, values = settingsStore.getSnapshot().values;
    match.state.events = [{ code: '#' }];
    match.state.videoTime = 17;
    publishReactSettings();
    assert.equal(notifications, initial);
    assert.equal(settingsStore.getSnapshot().values, values);
    match.state.metricsConfig.attack = { enabled: false };
    publishReactSettings();
    assert.equal(notifications, initial + 1);
    assert.equal(settingsStore.getSnapshot().values.skillVisibility.attack, false);
    settingsStore.publish({ values: {} });
    publishReactSettings();
    assert.equal(settingsStore.getSnapshot().values.skillVisibility.attack, false);
  } finally {
    unsubscribe();
    match.state = previous;
    settingsStore.replace(previousView);
  }
});

test('domain subscriptions deliver changes synchronously and stop after disposal', () => {
  const changes = [];
  const unsubscribe = subscribeDomainEvents(type => changes.push(type));
  emitDomainEvent('match-archive-changed');
  assert.deepEqual(changes, ['match-archive-changed']);
  unsubscribe();
  unsubscribe();
  emitDomainEvent('match-archive-changed');
  assert.equal(changes.length, 1);
});

test('domain and feature modules respect the application composition boundary', async () => {
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const { parsers } = await import('prettier/plugins/babel');
  const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
  for (const file of files('src').filter(file => /\.(js|jsx|mjs)$/.test(file))) {
    const ast = parsers.babel.parse(readFileSync(file, 'utf8')).program;
    for (const node of ast.body) {
      if (!node.source?.value.startsWith('.')) continue;
      const target = resolve(dirname(file), node.source.value);
      assert.ok(existsSync(target), `${file}: missing ${node.source.value}`);
      if (file.startsWith('src/domain/')) assert.ok(!target.includes('/src/features/') && !target.includes('/src/app/'), `${file}: domain depends on application services`);
      if (file.startsWith('src/features/')) assert.ok(!/\/app\/(application\.js|actions\.mjs)$/.test(target), `${file}: feature imports the composition root`);
    }
  }
});

test('analysis models have acyclic dependencies and do not import UI commands or publishers', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const { parsers } = await import('prettier/plugins/babel');
  const roots = ['summary-model', 'chart-model', 'skill-chart-model', 'score-model', 'timeline-model', 'trajectory-model', 'player-trajectory-model', 'setting-model', 'player-setting-model', 'match-sheet-model', 'setting-view', 'trajectory-view', 'match-sheet-view', 'filter-view'];
  const visited = new Set(), active = new Set();
  function visit(file) {
    assert.ok(!active.has(file), `Cyclic analysis dependency: ${file}`);
    if (visited.has(file)) return;
    active.add(file);
    const ast = parsers.babel.parse(readFileSync(file, 'utf8')).program;
    for (const node of ast.body.filter(node => node.type === 'ImportDeclaration')) {
      for (const specifier of node.specifiers) assert.ok(!/^(render|publish|openReact|changeReact|setActive)/.test(specifier.imported?.name || ''), `${file}: imports UI action ${specifier.imported?.name}`);
      if (node.source.value.startsWith('.')) visit(resolve(dirname(file), node.source.value));
    }
    active.delete(file);
    visited.add(file);
  }
  for (const name of roots) visit(resolve(`src/features/analysis/${name}.js`));
});

test('aggregated headers describe cloneable commands instead of closing over controllers', async () => {
  const { buildReactAggregatedHeaders } = await import('../src/features/analysis/summary-model.js');
  const headers = buildReactAggregatedHeaders([1, 2], true);
  assert.deepEqual(structuredClone(headers), headers);
  const cells = headers.flat();
  const start = cells.find(cell => cell.setNum === 2);
  assert.equal(start.command, 'openAggregatedSetStart');
  assert.deepEqual(start.args, [2]);
  const attack = cells.find(cell => cell.skillId === 'attack');
  assert.equal(attack.command, 'openReactAggregatedSkill');
  assert.deepEqual(attack.args, ['attack']);
});

test('set-start commands use the current filter for shared headers and retain explicit team scopes', async () => {
  const { buildReactAggregatedHeaders } = await import('../src/features/analysis/summary-model.js');
  const { readSourceFixture } = await import('./helpers/source-fixture.mjs');
  const { sourceFunctions } = await import('./helpers/source-functions.mjs');
  const vm = await import('node:vm');
  const calls = [];
  const filters = { teams: new Set(['our']) };
  const header = buildReactAggregatedHeaders([2], false).flat().find(cell => cell.setNum === 2);
  const context = vm.createContext({ analysisTeamFilterState: filters, openSetStartEditor: (...args) => calls.push(args) });
  vm.runInContext(sourceFunctions(readSourceFixture('src/features/analysis/summary-commands.js', 'utf8'), ['openAggregatedSetStart']), context);
  filters.teams = new Set(['opponent']);
  context.openAggregatedSetStart(...header.args);
  context.openAggregatedSetStart(2, 'our');
  assert.deepEqual(calls, [[2, 'opponent'], [2, 'our']]);
});

test('distribution fallback respects each court, replacements and recorded zones, preserving comparison and DAMP data', async () => {
  const { computeAttackDistribution, buildDistributionCards } = await import('../src/features/analysis/setting-model.js');
  const previous = match.state;
  match.state = {
    players: ['Ada', 'Bea'], opponentPlayers: ['X', 'Y'],
    court: [{ main: 'Ada', replaced: 'Bea' }],
    opponentCourt: [{}, {}, {}, {}, { main: 'Y', replaced: '' }],
    metricsConfig: {}, pointRules: {}, events: [],
  };
  try {
    const events = [
      { team: 'our', playerIdx: 1, rotation: 2, skillId: 'attack', code: '#' },
      { team: 'opponent', playerIdx: 1, rotation: 2, skillId: 'attack', code: '+' },
      { team: 'our', playerIdx: 1, rotation: 2, skillId: 'attack', code: '=', zone: 4 },
      { team: 'our', playerIdx: 1, rotation: 2, skillId: 'attack', code: '#', zone: 0 },
      { team: 'our', playerIdx: 99, rotation: 2, skillId: 'attack', code: '#' },
    ];
    events.dampByRotation = { 2: 3, all: 3 };
    const distribution = computeAttackDistribution(events);
    assert.equal(distribution[2].total, 3);
    assert.equal(distribution[2].zones[1]['#'], 1);
    assert.equal(distribution[2].zones[5]['+'], 1);
    assert.equal(distribution[2].zones[4]['='], 1);
    const cards = buildDistributionCards(events, [events[0], events[0]]);
    const card = cards.find(card => card.key === 2);
    assert.equal(card.damp, 3);
    assert.equal(card.zones.find(zone => zone.zone === 1).percent, 33);
    assert.match(card.zones.find(zone => zone.zone === 1).mainClass, /is-worse/);
    assert.equal(cards.find(card => card.key === 'all').damp, 3);
  } finally { match.state = previous; }
});

test('shared filters preserve string selections and route changes through their supplied controller', async () => {
  const { filterStore } = await import('../src/state/filter-store.mjs');
  const { publishReactFilter, publishReactSplitFilter, readReactFilterValues } = await import('../src/features/analysis/filter-view.js');
  const id = 'structure-filter';
  const previous = filterStore.getSnapshot();
  const calls = [];
  try {
    publishReactFilter({ id }, [{ value: 1, label: 'Uno' }, { value: 2, label: 'Due' }], new Set([1]), { onChange: event => calls.push(['single', event]) });
    assert.deepEqual(readReactFilterValues({ id }, true), [1]);
    const event = { type: 'change' };
    filterStore.getView(id).onChange('2', true, event);
    assert.deepEqual(readReactFilterValues({ id }, true), [1, 2]);
    publishReactSplitFilter({ id }, [{ scope: 'our', options: [{ value: 'our:1', label: 'Casa' }] }, { scope: 'opponent', options: [{ value: 'opponent:1', label: 'Ospiti' }] }], new Set(['our:1']), e => calls.push(['split', e]));
    filterStore.getView(id).onChange('opponent:1', true, event);
    assert.deepEqual(readReactFilterValues({ id }), ['our:1', 'opponent:1']);
    assert.deepEqual(calls, [['single', event], ['split', event]]);
  } finally { filterStore.replace(previous); }
});
