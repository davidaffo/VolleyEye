import test from 'node:test';
import assert from 'node:assert/strict';
import { session as match } from '../js/globals.js';
import { session as workspace } from '../src/features/state/live-workspace-layout.js';
import { pushVideoUndoSnapshot, commitVideoUndoSnapshot, restoreVideoUndo } from '../src/features/video/undo-model.js';

test('video undo conserva solo i campi cambiati e ripristina modifiche multiple', () => {
  const previousEvents = match.state.events, previousStack = workspace.videoUndoStack;
  try {
    const a = { eventId: 1, videoTime: 2, metadata: { large: 'data' } };
    const b = { eventId: 2, homeScore: 4 };
    match.state.events = [a, b];
    workspace.videoUndoStack = [];
    const capture = pushVideoUndoSnapshot(true, [a, b, a]);
    a.videoTime = 8;
    b.homeScore = 7;
    b.durationMs = 3;
    commitVideoUndoSnapshot(capture);
    assert.equal(workspace.videoUndoStack.length, 1);
    const entry = workspace.videoUndoStack.pop();
    assert.deepEqual(entry.patches.map(({ values, missing }) => ({ values, missing })), [
      { values: { videoTime: 2 }, missing: [] },
      { values: { homeScore: 4 }, missing: ['durationMs'] },
    ]);
    a.unrelated = 'conservato';
    restoreVideoUndo(entry);
    assert.equal(a.videoTime, 2);
    assert.equal(a.unrelated, 'conservato');
    assert.equal(b.homeScore, 4);
    assert.equal(Object.hasOwn(b, 'durationMs'), false);
  } finally {
    match.state.events = previousEvents;
    workspace.videoUndoStack = previousStack;
  }
});

test('video undo accorpa aggiornamenti dello stesso controllo e limita la cronologia a 30', () => {
  const previousEvents = match.state.events, previousStack = workspace.videoUndoStack;
  try {
    const event = { videoTime: 0 };
    match.state.events = [event];
    workspace.videoUndoStack = [];
    const capture = pushVideoUndoSnapshot(true, [event]);
    event.videoTime = 1;
    commitVideoUndoSnapshot(capture);
    event.videoTime = 2;
    commitVideoUndoSnapshot(capture);
    assert.equal(workspace.videoUndoStack.length, 1);
    restoreVideoUndo(workspace.videoUndoStack.pop());
    assert.equal(event.videoTime, 0);
    for (let i = 0; i < 31; i++) {
      const next = pushVideoUndoSnapshot(true, [event]);
      event.videoTime++;
      commitVideoUndoSnapshot(next);
    }
    assert.equal(workspace.videoUndoStack.length, 30);
    assert.equal(workspace.videoUndoStack[0].patches[0].values.videoTime, 1);
  } finally {
    match.state.events = previousEvents;
    workspace.videoUndoStack = previousStack;
  }
});
