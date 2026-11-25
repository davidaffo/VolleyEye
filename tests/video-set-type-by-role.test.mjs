import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSourceFixture } from './helpers/source-fixture.mjs';
import { sourceFunctions } from './helpers/source-functions.mjs';
import { buildRoleAssignmentModel, inferRoleFromSetStarts } from '../src/features/video/set-type-by-role.js';
import { createVideoEditStore } from '../src/state/video-edit-store.mjs';
import { pushVideoUndoSnapshot, commitVideoUndoSnapshot, restoreVideoUndo } from '../src/features/video/undo-model.js';
import { session as workspace } from '../src/features/state/live-workspace-layout.js';
import { session as match } from '../js/globals.js';

const players = { our: ['Sara', 'Anna', 'Bea', 'Dina'], opponent: ['Sara', 'Anna'] };
const liberos = { our: [], opponent: [] };
const events = [
  { eventId: 1, skillId: 'second', team: 'our', playerIdx: 0, playerRole: 'P' },
  { eventId: 2, skillId: 'attack', team: 'our', playerIdx: 1, playerRole: 'S1', setterIdx: 0, relatedEvents: [1], setType: 'alta' },
  { eventId: 3, skillId: 'attack', team: 'our', playerIdx: 1, playerRole: 'S2', setterIdx: 0, relatedEvents: [1] },
  { eventId: 4, skillId: 'attack', team: 'our', playerIdx: 2, playerRole: 'C1', setterIdx: 0, relatedEvents: [1] },
  { eventId: 5, skillId: 'second', team: 'our', playerIdx: 3, playerRole: 'S1' },
  { eventId: 6, skillId: 'attack', team: 'our', playerIdx: 1, playerRole: 'S1', setterIdx: 3, relatedEvents: [5] },
  { eventId: 7, skillId: 'attack', team: 'our', playerIdx: 1, playerRole: 'S1' },
  { eventId: 8, skillId: 'second', team: 'opponent', playerIdx: 0, playerRole: 'S1' },
  { eventId: 9, skillId: 'attack', team: 'opponent', playerIdx: 1, playerRole: 'S1', setterIdx: 0, relatedEvents: [8] },
  { eventId: 10, skillId: 'attack', team: 'our', playerIdx: 2, setterIdx: 0, relatedEvents: [1] },
];

test('starting lineups recover roles using each set and team setter position', () => {
  const starts = {
    1: { our: { court: ['Sara', 'Anna', 'Bea', 'Dina', 'E', 'F'], rotation: 1 },
      opponent: { court: ['Anna', 'Sara', 'G', 'H', 'I', 'J'], rotation: 2 } },
    2: { our: { court: ['Anna', 'Sara', 'Bea', 'Dina', 'E', 'F'], rotation: 2 } },
  };
  assert.equal(inferRoleFromSetStarts('Sara', 'our', 1, starts), 'P');
  assert.equal(inferRoleFromSetStarts('Anna', 'our', 1, starts), 'S');
  assert.equal(inferRoleFromSetStarts('Sara', 'opponent', 1, starts), 'P');
  assert.equal(inferRoleFromSetStarts('Anna', 'our', 2, starts), 'C');
  assert.equal(inferRoleFromSetStarts('Anna', 'our', 3, starts), null);
  assert.equal(inferRoleFromSetStarts('Sara', 'our', 3, starts), 'P');
  assert.equal(inferRoleFromSetStarts('Libero', 'our', 1, starts, ['Libero']), 'L');
  assert.equal(inferRoleFromSetStarts('Sconosciuta', 'our', 1, starts), null);
});

test('missing action roles use starting lineup without treating a non-setter as setter', () => {
  const starts = { 1: { our: { court: ['Sara', 'Anna', 'Bea', 'Dina', 'E', 'F'], rotation: 1 } } };
  const eligible = { skillId: 'attack', team: 'our', set: 1, playerIdx: 1, setterIdx: 0 };
  const nonSetter = { skillId: 'attack', team: 'our', set: 1, playerIdx: 2, setterIdx: 1 };
  const unknownSetter = { skillId: 'attack', team: 'our', set: 1, playerIdx: 2 };
  const model = buildRoleAssignmentModel([eligible, nonSetter, unknownSetter], [eligible, nonSetter, unknownSetter], players, liberos, starts);
  assert.equal(model.attackGroups.get(eligible), 'S');
  assert.equal(model.attackGroups.has(nonSetter), false);
  assert.equal(model.attackGroups.has(unknownSetter), false);
  assert.equal(model.unknownCount, 1);
});

test('roles group filtered attacks only when the setter is a palleggiatrice', () => {
  const model = buildRoleAssignmentModel(events, [events[1], events[3], events[5], events[6], events[8], events[9]], players, liberos);
  assert.deepEqual(model.rows.map(row => [row.id, row.count]), [['C', 2], ['S', 1]]);
  assert.equal(model.unknownCount, 1);
  assert.equal(model.attackGroups.has(events[2]), false);
  assert.equal(model.attackGroups.has(events[5]), false);
  assert.equal(model.attackGroups.has(events[8]), false);
});

test('setter role from the actual court takes precedence over an inferred role', () => {
  const attack = { skillId: 'attack', team: 'our', playerIdx: 1, playerRole: 'O', setterIdx: 0,
    rotation: 1, courtPlayers: { our: ['Dina', 'Sara', 'Anna', 'Bea', 'E', 'F'] } };
  const model = buildRoleAssignmentModel([...events, attack], [attack], players, liberos);
  assert.equal(model.rows.length, 0);
  assert.equal(model.unknownCount, 0);
});

test('setter falls back to prevalent role only when the action has no role evidence', () => {
  const eligible = { skillId: 'attack', team: 'our', playerIdx: 1, playerRole: 'S1', setterIdx: 0 };
  const tie = { skillId: 'attack', team: 'our', playerIdx: 1, playerRole: 'S1', setterIdx: 2 };
  const evidence = [
    { skillId: 'second', team: 'our', playerIdx: 0, playerRole: 'P' },
    { skillId: 'second', team: 'our', playerIdx: 2, playerRole: 'P' },
    { skillId: 'attack', team: 'our', playerIdx: 2, playerRole: 'C' },
  ];
  const model = buildRoleAssignmentModel([...evidence, eligible, tie], [eligible, tie], players, liberos);
  assert.equal(model.attackGroups.get(eligible), 'S');
  assert.equal(model.attackGroups.has(tie), false);
  assert.equal(model.unknownCount, 1);
});

test('applying selected roles changes one undoable batch and keeps other attacks unchanged', () => {
  const data = structuredClone(events);
  const store = createVideoEditStore();
  store.publish('roleSetType', { open: true, options: [{ value: 'quick' }], rows: [{ id: 'S', value: 'quick' }, { id: 'C', value: '' }] });
  const model = buildRoleAssignmentModel(data, [data[1], data[3], data[5]], players, liberos);
  const oldState = match.state, oldStack = workspace.videoUndoStack;
  try {
    match.state = { ...oldState, events: data };
    workspace.videoUndoStack = [];
    let calls = 0, closed = false;
    const context = vm.createContext({ videoEditStore: store, getModel: () => model,
      applyAttackFieldToEvents(targets, updater) { calls++; const snapshot = pushVideoUndoSnapshot(true, targets); targets.forEach(updater); commitVideoUndoSnapshot(snapshot); },
      closeSetTypeByRole() { closed = true; },
    });
    const source = readSourceFixture(new URL('../src/features/video/set-type-by-role.js', import.meta.url), 'utf8');
    vm.runInContext(sourceFunctions(source, ['applySetTypeByRole']), context);
    context.applySetTypeByRole();
    assert.equal(calls, 1);
    assert.equal(closed, true);
    assert.equal(data[1].setType, 'quick');
    assert.equal(data[3].setType, undefined);
    assert.equal(data[5].setType, undefined);
    assert.equal(workspace.videoUndoStack.length, 1);
    restoreVideoUndo(workspace.videoUndoStack[0]);
    assert.equal(data[1].setType, 'alta');
  } finally { match.state = oldState; workspace.videoUndoStack = oldStack; }
});
