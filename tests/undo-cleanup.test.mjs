import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { featureSource } from './helpers/feature-source.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const match = () => ({ state: { events: [{ eventId: 1, code: '#', undoState: { before: { rotation: 2 } } }], setResults: { 1: 'for' }, notes: ['nota'] } });

function setup() {
  const stored = { archived: match() };
  const current = match().state.events;
  Object.defineProperty(current[0], '__undoSnapshot', { value: {}, configurable: true });
  const context = {
    state: { savedMatches: { memoryOnly: match() }, events: current, loadedMatchName: 'current' },
    cloneIsolationData: plain,
    loadMatchesMapFromStorage: () => plain(stored),
    saveMatchToStorage: async (name, payload, options) => {
      assert.equal(options.waitForCommit, true);
      stored[name] = plain(payload);
      return true;
    },
    saveState: () => { stored.current = { state: plain(context.state) }; },
    archiveStorage: { flush: async () => {} },
  };
  vm.createContext(context);
  vm.runInContext(featureSource('src/features/events/history-model.js', ['clearScoutUndoStates']), context);
  vm.runInContext(featureSource('src/features/storage/undo-cleanup.js'), context);
  return { context, stored };
}

test('pulizia rimuove le ricevute da archivio, memoria e partita aperta conservando il log', async () => {
  const { context, stored } = setup();
  assert.equal(await context.clearAllMatchesUndoStates(), 3);
  for (const name of ['archived', 'memoryOnly']) {
    const expected = match();
    delete expected.state.events[0].undoState;
    assert.deepEqual(stored[name], expected);
    assert.deepEqual(plain(context.state.savedMatches[name]), expected);
  }
  assert.equal(Object.hasOwn(context.state.events[0], '__undoSnapshot'), false);
  assert.deepEqual(stored.current.state.events, [{ eventId: 1, code: '#' }]);
  assert.equal(await context.clearAllMatchesUndoStates(), 0);
});

test('pulizia segnala un salvataggio fallito senza sostituire il match in memoria', async () => {
  const { context } = setup();
  context.saveMatchToStorage = async () => { throw new Error('salvataggio fallito'); };
  await assert.rejects(context.clearAllMatchesUndoStates(), /salvataggio fallito/);
  assert.ok(context.state.savedMatches.memoryOnly.state.events[0].undoState);
  assert.ok(context.state.events[0].undoState);
});

test('pulizia rimuove anche i vecchi snapshot dei cambi set conservando il cambio nel log', () => {
  const { context } = setup();
  const event = { eventId: 7, actionType: 'set-change', prevSet: 1, nextSet: 2, prevSetStarts: {}, nextSetResults: {},
    prevClock: { paused: false }, nextVideoClock: { paused: true } };
  assert.equal(context.clearScoutUndoStates([event]), 1);
  assert.deepEqual(event, { eventId: 7, actionType: 'set-change', prevSet: 1, nextSet: 2 });
});
