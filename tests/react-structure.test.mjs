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

test('analysis models and publishers have acyclic dependencies without UI controllers', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve, dirname } = await import('node:path');
  const { parsers } = await import('prettier/plugins/babel');
  const roots = ['../video/reset-model', '../scout/selection-state', '../scout/serve-keyboard', '../players/database-model', 'stats-model', '../../domain/analysis-filter-schema', '../teams/player-reference-model', 'cache-model', 'reset-model', '../scout/skill-control-model', '../scout/court-model', '../scout/pick-model', '../teams/court-state-model', '../events/edit-model', '../events/table-model', '../events/display-model', '../events/selection-model', '../video/event-model', '../video/sort-model', '../video/playback-model', 'player-snapshot-model', 'video-filter-model', '../video/overlay-model', 'summary-model', 'chart-model', 'skill-chart-model', 'score-model', 'timeline-model', 'trajectory-model', 'player-trajectory-model', 'setting-model', 'player-setting-model', 'match-sheet-model', 'setting-view', 'trajectory-view', 'match-sheet-view', 'filter-view'];
  const visited = new Set(), active = new Set();
  function visit(file, allowPublish = false) {
    const key = `${allowPublish}:${file}`;
    assert.ok(!active.has(file), `Cyclic analysis dependency: ${file}`);
    if (visited.has(key)) return;
    active.add(file);
    const ast = parsers.babel.parse(readFileSync(file, 'utf8')).program;
    for (const node of ast.body.filter(node => node.type === 'ImportDeclaration')) {
      for (const specifier of node.specifiers) {
        const name = specifier.imported?.name || '';
        const filterPublishers = {
          './filter-view.js': ['renderDynamicFilter', 'renderAnalysisCourtSideRadios'],
          './shared-filter-view.js': ['renderAnalysisTeamFilter'],
          './filter-controls.js': ['renderFilterControls'],
        };
        const filterPublisher = allowPublish && filterPublishers[node.source.value]?.includes(name);
        assert.ok(filterPublisher || !(allowPublish ? /^(render|openReact|changeReact|setActive)/ : /^(render|publish|openReact|changeReact|setActive)/).test(name), `${file}: imports UI action ${name}`);
      }
      if (node.source.value.startsWith('.')) visit(resolve(dirname(file), node.source.value), allowPublish);
    }
    active.delete(file);
    visited.add(key);
  }
  for (const name of roots) visit(resolve(`src/features/analysis/${name}.js`));
  for (const name of ['../players/database-view', 'trajectory-filters', 'video-filters', 'shared-filter-view', '../scout/court-view', 'player-view', 'video-preset-view', 'multiscout-view', '../settings/metrics-view', '../video/view']) visit(resolve(`src/features/analysis/${name}.js`), true);
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
    publishReactFilter(id, [{ value: 1, label: 'Uno' }, { value: 2, label: 'Due' }], new Set([1]), { onChange: event => calls.push(['single', event]) });
    assert.deepEqual(readReactFilterValues(id, true), [1]);
    const event = { type: 'change' };
    filterStore.getView(id).onChange('2', true, event);
    assert.deepEqual(readReactFilterValues(id, true), [1, 2]);
    publishReactSplitFilter(id, [{ scope: 'our', options: [{ value: 'our:1', label: 'Casa' }] }, { scope: 'opponent', options: [{ value: 'opponent:1', label: 'Ospiti' }] }], new Set(['our:1']), e => calls.push(['split', e]));
    filterStore.getView(id).onChange('opponent:1', true, event);
    assert.deepEqual(readReactFilterValues(id), ['our:1', 'opponent:1']);
    assert.deepEqual(calls, [['single', event], ['split', event]]);
  } finally { filterStore.replace(previous); }
});

test('video filter snapshots preserve field types, detached values and previous-skill counting', async () => {
  const { session } = await import('../src/features/state/analysis-analysis-filters.js');
  const { applyVideoFilterSnapshot, snapshotVideoFilters, countActiveVideoFilters } = await import('../src/features/analysis/video-filter-model.js');
  const previous = session.videoFilterState;
  session.videoFilterState = {};
  try {
    applyVideoFilterSnapshot({ teams: [1, 'opponent'], players: ['our:1', 2], sets: ['2', 'bad', null], rotations: ['6'], zones: ['4'], receiveZones: ['5'], attackTypes: ['tip'], prevSkill: 'serve', ignored: ['x'] });
    const snapshot = snapshotVideoFilters();
    assert.deepEqual(snapshot.teams, ['1', 'opponent']);
    assert.deepEqual(snapshot.players, ['our:1', '2']);
    assert.deepEqual(snapshot.sets, [2, 0]);
    assert.deepEqual(snapshot.rotations, [6]);
    assert.deepEqual(snapshot.receiveZones, [5]);
    assert.equal(countActiveVideoFilters(snapshot), 8);
    assert.equal(Object.hasOwn(snapshot, 'ignored'), false);
    snapshot.players.push('detached');
    assert.equal(session.videoFilterState.players.has('detached'), false);
    applyVideoFilterSnapshot(null);
    assert.equal(snapshotVideoFilters().prevSkill, 'any');
    assert.equal(countActiveVideoFilters(snapshotVideoFilters()), 0);
    assert.equal(countActiveVideoFilters({ sets: [null], prevSkill: 'any', ignored: [1] }), 1);
  } finally { session.videoFilterState = previous; }
});

test('video overlays resolve selected events without depending on playback controllers', async () => {
  const { session } = await import('../src/features/state/scout-ui.js');
  const { getVideoOverlayEvent, buildVideoOverlayLinesForEvent } = await import('../src/features/video/overlay-model.js');
  const previous = [session.eventTableContexts, session.selectedEventIds, session.lastSelectedEventId, match.state];
  const first = { set: 2, homeScore: 0, visitorScore: 3, team: 'opponent', playerName: 'Ada', skillId: 'serve', code: '#', rotation: 4 };
  const second = { ...first, set: 3 };
  session.eventTableContexts = { video: { rows: [{ key: 'first', ev: first }, { key: 'second', ev: second }] } };
  session.selectedEventIds = new Set(['first', 'second']);
  session.lastSelectedEventId = 'second';
  match.state = { opponentPlayerNumbers: { Ada: 8 } };
  try {
    assert.equal(getVideoOverlayEvent(), second);
    assert.match(buildVideoOverlayLinesForEvent(first)[0], /^Set 2 · 0 - 3 · 8 - Ada · .* # · P4$/);
    session.lastSelectedEventId = 'missing';
    assert.equal(getVideoOverlayEvent(), first);
    session.selectedEventIds.clear();
    assert.equal(getVideoOverlayEvent(), null);
    assert.deepEqual(buildVideoOverlayLinesForEvent(null), []);
  } finally { [session.eventTableContexts, session.selectedEventIds, session.lastSelectedEventId, match.state] = previous; }
});

test('calls to exported project functions have an explicit import or local binding', async () => {
  const {readFileSync, readdirSync} = await import('node:fs');
  const {parsers} = await import('prettier/plugins/babel');
  const files = directory => readdirSync(directory, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
  const modules = files('src').filter(path => /\.(js|jsx|mjs)$/.test(path)).map(path => ({path, ast:parsers.babel.parse(readFileSync(path,'utf8')).program}));
  const exported = new Set(modules.flatMap(({ast}) => ast.body.filter(node => node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration').map(node => node.declaration.id.name)));
  function visit(node, fn) {
    if (!node || typeof node !== 'object') return;
    if (node.type) fn(node);
    for (const [key,value] of Object.entries(node)) {
      if (['loc','tokens','comments','extra'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => visit(child,fn));
      else if (value && typeof value === 'object') visit(value,fn);
    }
  }
  function bind(pattern, names) {
    if (!pattern) return;
    if (pattern.type === 'Identifier') names.add(pattern.name);
    else if (pattern.type === 'RestElement') bind(pattern.argument,names);
    else if (pattern.type === 'AssignmentPattern') bind(pattern.left,names);
    else if (pattern.type === 'ObjectPattern') pattern.properties.forEach(property => bind(property.value || property.argument,names));
    else if (pattern.type === 'ArrayPattern') pattern.elements.forEach(element => bind(element,names));
  }
  const missing = [];
  for (const {path,ast} of modules) {
    // Conservative scan: local declarations anywhere in the module may account for a call.
    // This catches omitted imports after moves, without treating browser APIs as project functions.
    const bindings = new Set();
    visit(ast,node => {
      if (node.type === 'ImportDeclaration') node.specifiers.forEach(specifier => bindings.add(specifier.local.name));
      if (node.type === 'VariableDeclarator') bind(node.id,bindings);
      if (/Function|Method/.test(node.type)) {
        if (node.id) bind(node.id,bindings);
        node.params?.forEach(parameter => bind(parameter,bindings));
      }
    });
    visit(ast,node => {
      if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && exported.has(node.callee.name) && !bindings.has(node.callee.name)) missing.push(`${path}:${node.loc.start.line} ${node.callee.name}`);
    });
  }
  assert.deepEqual(missing,[], 'Project functions must not rely on globals supplied by test fixtures');
});
