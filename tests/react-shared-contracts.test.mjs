import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommands, createReadyEvents } from '../src/app/commands.mjs';
import { createViewStore, createKeyedViewStore } from '../src/state/view-store.mjs';
import { createFilterSelections, pruneFilterSelections, clearFilterSelections } from '../src/domain/filter-selections.js';

test('commands preserve the synchronous user gesture and publish after async completion', async () => {
  const observed = [];
  let finish;
  const commands = createCommands({ pick(value) {
    observed.push(['pick', value]);
    return new Promise(resolve => { finish = resolve; });
  } }, () => observed.push(['publish']));
  const pending = commands.pick('file');
  assert.deepEqual(observed, [['pick', 'file']]);
  finish('selected');
  assert.equal(await pending, 'selected');
  assert.deepEqual(observed, [['pick', 'file'], ['publish']]);
});

test('commands publish once and preserve both synchronous and async errors', async () => {
  const failure = new Error('storage failed');
  let notifications = 0;
  const commands = createCommands({
    sync() { throw failure; },
    async async() { throw failure; },
  }, () => notifications++);
  await assert.rejects(commands.sync(), error => error === failure);
  await assert.rejects(commands.async(), error => error === failure);
  assert.equal(notifications, 2);
});

test('ready events keep synchronous results and do not run before bootstrap', () => {
  let ready = false, calls = 0;
  const events = createReadyEvents({ pointer: value => { calls++; return value; } }, () => ready);
  assert.equal(events.pointer(7), undefined);
  ready = true;
  assert.equal(events.pointer(7), 7);
  assert.equal(calls, 1);
});

test('view patches retain fields, replacements remove them and unchanged snapshots stay stable', () => {
  const store = createViewStore({ open: false, title: 'Draft' });
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  const original = store.getSnapshot();
  store.publish({ open: false });
  assert.equal(store.getSnapshot(), original);
  store.publish({ open: true });
  assert.equal(store.getSnapshot().title, 'Draft');
  store.replace({ open: false });
  assert.equal(Object.hasOwn(store.getSnapshot(), 'title'), false);
  assert.equal(original.open, false);
  assert.equal(calls, 2);
  unsubscribe();
  store.publish({ open: true });
  assert.equal(calls, 2);
});

test('keyed tables replace rows while dialog patches preserve siblings and previous snapshots', () => {
  const table = createKeyedViewStore({}, { rows: [] });
  table.publish('log', { rows: [1], selected: [1] });
  table.publish('log', { rows: [2] });
  assert.equal(Object.hasOwn(table.getView('log'), 'selected'), false);
  assert.ok(Object.isFrozen(table.getView('missing')));
  const dialogs = createKeyedViewStore({ point: { open: false, type: 'Generic' }, error: { open: false } }, {}, { merge: true });
  const before = dialogs.getSnapshot();
  dialogs.publish('point', { open: true });
  assert.equal(dialogs.getView('point').type, 'Generic');
  assert.equal(dialogs.getView('error'), before.error);
  assert.equal(before.point.open, false);
  assert.ok(Object.isFrozen(dialogs.getView('point')));
});

test('filter pruning preserves numeric and scoped selections without coercing the selection type', () => {
  const state = createFilterSelections(['sets', 'players'], { previousSkill: true });
  state.sets = new Set([1, '1', 2, NaN]);
  state.players = new Set(['our:0', 'opponent:0']);
  pruneFilterSelections(state, [
    ['sets', [{ value: '1' }, { value: 'invalid' }], true],
    ['players', [{ value: 'opponent:0' }]],
  ]);
  assert.deepEqual([...state.sets], [1]);
  assert.deepEqual([...state.players], ['opponent:0']);
  const previousSets = state.sets;
  state.prevSkill = 'dig-only';
  clearFilterSelections(state);
  assert.equal(state.sets, previousSets);
  assert.equal(state.sets.size, 0);
  assert.equal(state.prevSkill, 'any');
  assert.equal(Object.hasOwn(createFilterSelections(['sets']), 'prevSkill'), false);
});
