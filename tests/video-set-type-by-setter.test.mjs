import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSourceFixture } from './helpers/source-fixture.mjs';
import { buildSetterAssignmentModel } from '../src/features/video/set-type-by-setter.js';
import { createVideoEditStore } from '../src/state/video-edit-store.mjs';
import { sourceFunctions } from './helpers/source-functions.mjs';
import { pushVideoUndoSnapshot, commitVideoUndoSnapshot, restoreVideoUndo } from '../src/features/video/undo-model.js';
import { session as workspace } from '../src/features/state/live-workspace-layout.js';
import { session as match } from '../js/globals.js';

const players = { our: ['Anna', 'Bea'], opponent: ['Anna', 'Lia'] };
const events = [
  { eventId: 1, skillId: 'second', playerIdx: 0, team: 'our' },
  { eventId: 2, skillId: 'attack', setterIdx: 0, team: 'our', setType: 'alta' },
  { eventId: 3, skillId: 'attack', relatedEvents: [1], team: 'our' },
  { eventId: 4, skillId: 'attack', setterIdx: 0, team: 'opponent', setType: 'super' },
  { eventId: 5, skillId: 'second', playerIdx: 1, team: 'our' },
  { eventId: 6, skillId: 'attack', setterName: 'Lia', team: 'opponent' },
  { eventId: 7, skillId: 'attack', relatedEvents: [1], team: 'opponent' },
];

test('popup identifies setters by team and linked sets, and counts only filtered attacks', () => {
  const model = buildSetterAssignmentModel(events, [events[1], events[3], events[5], events[6]], players);
  assert.deepEqual(model.rows, [
    { id: 'our:0', scope: 'our', index: 0, count: 1 },
    { id: 'our:1', scope: 'our', index: 1, count: 0 },
    { id: 'opponent:0', scope: 'opponent', index: 0, count: 1 },
    { id: 'opponent:1', scope: 'opponent', index: 1, count: 1 },
  ]);
  assert.equal(model.attackGroups.has(events[2]), false);
  assert.equal(model.attackGroups.has(events[6]), false);
  assert.equal(model.unknownCount, 1);
});

test('apply changes only filtered attacks for selected setters in one undoable operation', () => {
  const data = structuredClone(events);
  const store = createVideoEditStore();
  store.publish('setterSetType', { open: true, options: [{ value: 'quick' }, { value: 'alta' }], rows: [
    { id: 'our:0', value: 'quick' }, { id: 'our:1', value: '' }, { id: 'opponent:0', value: 'alta' },
  ] });
  const model = buildSetterAssignmentModel(data, [data[1], data[3], data[5]], players);
  let calls = 0, closed = false;
  const oldState = match.state, oldStack = workspace.videoUndoStack;
  match.state = { ...oldState, events: data };
  workspace.videoUndoStack = [];
  const context = vm.createContext({ videoEditStore: store, getModel: () => model,
    applyAttackFieldToEvents(targets, updater) { calls++; const snapshot = pushVideoUndoSnapshot(true, targets); targets.forEach(updater); commitVideoUndoSnapshot(snapshot); },
    closeSetTypeBySetter() { closed = true; },
  });
  const source = readSourceFixture(new URL('../src/features/video/set-type-by-setter.js', import.meta.url), 'utf8');
  vm.runInContext(sourceFunctions(source, ['applySetTypeBySetter']), context);
  context.applySetTypeBySetter();
  assert.equal(calls, 1);
  assert.equal(closed, true);
  assert.equal(data[1].setType, 'quick');
  assert.equal(data[3].setType, 'alta');
  assert.equal(data[2].setType, undefined);
  assert.equal(data[5].setType, undefined);
  try {
    assert.equal(workspace.videoUndoStack.length, 1);
    restoreVideoUndo(workspace.videoUndoStack[0]);
    assert.equal(data[1].setType, 'alta');
    assert.equal(data[3].setType, 'super');
  } finally { match.state = oldState; workspace.videoUndoStack = oldStack; }
});
