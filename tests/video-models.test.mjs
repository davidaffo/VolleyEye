import assert from 'node:assert/strict';
import test from 'node:test';
import { session as match } from '../js/globals.js';
import { session as selection } from '../src/features/state/scout-ui.js';
import { getSelectedRows, pruneEventSelection, getSelectedVideoRowForInsert, getVideoMobileCurrentRow, getPlayByPlayStartIndex } from '../src/features/events/selection-model.js';
import { getVideoOverlayEvent } from '../src/features/video/overlay-model.js';
import { sortVideoEvents, ensureVideoAnalysisSortState } from '../src/features/video/sort-model.js';
import { buildEventTableModel } from '../src/features/events/table-model.js';
import { getPlayByPlayStartTime, getPlayByPlayDurationSeconds } from '../src/features/video/playback-model.js';

test('video selection retains table order, playback insertion order, anchors and cross-context deduplication', () => {
  const previous = {contexts: selection.eventTableContexts, ids: selection.selectedEventIds, anchor: selection.lastSelectedEventId};
  const rows = ['a', 'b', 'c'].map(key => ({key, ev: {eventId: key}}));
  selection.eventTableContexts = {video: {rows}, log: {rows: [{key: 'b', ev: {}}, {key: 'd', ev: {}}]}};
  selection.selectedEventIds = new Set(['c', 'b', 'd', 'gone']);
  selection.lastSelectedEventId = null;
  try {
    assert.equal(getSelectedVideoRowForInsert(), rows[1]);
    assert.equal(getVideoOverlayEvent(), rows[1].ev);
    assert.equal(getVideoMobileCurrentRow().index, 1);
    assert.equal(getPlayByPlayStartIndex(rows), 2);
    assert.deepEqual(getSelectedRows().map(row => row.key), ['b', 'c', 'd']);
    selection.lastSelectedEventId = 'c';
    assert.equal(getSelectedVideoRowForInsert(), rows[2]);
    assert.equal(getVideoMobileCurrentRow().index, 2);
    selection.lastSelectedEventId = 'gone';
    assert.equal(getSelectedVideoRowForInsert(), null);
    assert.equal(getVideoMobileCurrentRow().index, 1);
    assert.equal(getPlayByPlayStartIndex(rows), 0);
    pruneEventSelection();
    assert.equal(selection.lastSelectedEventId, null);
    assert.deepEqual([...selection.selectedEventIds], ['c', 'b', 'd']);
    selection.selectedEventIds.clear();
    assert.equal(getVideoOverlayEvent(), null);
    assert.equal(getVideoMobileCurrentRow().index, 0);
    assert.equal(getPlayByPlayStartIndex([]), -1);
  } finally {
    selection.eventTableContexts = previous.contexts;
    selection.selectedEventIds = previous.ids;
    selection.lastSelectedEventId = previous.anchor;
  }
});

test('video sorting keeps source chronology and ascending event IDs for equal descending values', () => {
  const previous = match.state;
  match.state = {players: [], opponentPlayers: [], uiVideoAnalysisSort: {key: 'code', dir: 'desc'}};
  const events = [{eventId: 4, code: '+'}, {eventId: 2, code: '+'}, {eventId: 3, code: '='}];
  try {
    const copy = structuredClone(events);
    const sorted = sortVideoEvents(events);
    assert.deepEqual(events, copy);
    assert.ok(sorted.indexOf(events[1]) < sorted.indexOf(events[0]));
    match.state.uiVideoAnalysisSort = {key: 'eventId', dir: 'asc'};
    assert.deepEqual(sortVideoEvents(events).map(ev => ev.eventId), [2, 3, 4]);
    match.state.uiVideoAnalysisSort = {key: 42, dir: 'invalid'};
    assert.deepEqual(ensureVideoAnalysisSortState(), {key: '', dir: ''});
    assert.equal(sortVideoEvents(events), events);
  } finally { match.state = previous; }
});

test('event table schema keeps headers and editor fields aligned across display modes without UI callbacks', () => {
  const previous = match.state;
  match.state = {players: [], opponentPlayers: [], selectedTeam: 'Casa', selectedOpponentTeam: 'Ospiti'};
  const ev = {eventId: 7, team: 'opponent', skillId: 'attack', videoTime: 61, attackBp: false, attackDirection: {start: {x: .2, y: .3}, end: {x: .8, y: .9}}};
  try {
    for (const options of [{showVideoTime: true}, {showIndex: false, showCheckbox: false}, {enableSelection: false, showVideoTime: true}]) {
      const model = buildEventTableModel([ev], options), row = model.rows[0];
      assert.equal(model.headers.length, row.cells.length + 1 + Number(model.showCheckbox));
      assert.equal(new Set(row.cells.map(cell => cell.field)).size, row.cells.length);
      assert.equal(row.cells.find(cell => cell.field === 'team').text, 'Ospiti');
      assert.equal(row.cells.find(cell => cell.field === 'attackBp').text, 'SO');
      assert.equal(row.cells.find(cell => cell.field === 'attackDirection').text, '0.20,0.30→0.80,0.90');
      assert.deepEqual(structuredClone(model), model);
      assert.equal(row.ev, ev);
    }
    assert.equal(ev.videoTime, 61);
    assert.equal(getPlayByPlayStartTime({ev}, null), 61);
    assert.equal(getPlayByPlayStartTime({ev, videoTime: 12}, null), 12);
    assert.equal(getPlayByPlayDurationSeconds({durationMs: 0}), .1);
    assert.equal(getPlayByPlayDurationSeconds({}), 5);
  } finally { match.state = previous; }
});
