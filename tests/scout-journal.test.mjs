import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, MATCH_PREFIX } from '../js/globals.js';
import { IDBFactory } from 'fake-indexeddb';
import { session as persistent } from '../src/features/state/storage-persistent-storage.js';
import { appendScoutJournal, recoverScoutJournal, recoveredJournalCheckpoint, cleanupCheckpointedJournal, SCOUT_JOURNAL_PREFIX } from '../src/features/storage/scout-journal.js';

test('il registro salva solo le modifiche e recupera eventi collegati e stato di gioco', () => {
  const name = 'Gara';
  const first = { eventId: 1, code: '/', relatedEvents: [] };
  const match = { name, state: { events: [structuredClone(first)], rotation: 1 } };
  const session = { __scoutJournalEpoch: 'base', lastSavedAt: 1, loadedMatchName: name, selectedMatch: name,
    events: [structuredClone(first)], savedMatches: { [name]: structuredClone(match) }, rotation: 1 };
  const cache = new Map([[STORAGE_KEY, JSON.stringify(session)], [MATCH_PREFIX + name, JSON.stringify(match)]]);
  const storage = { db: {}, temporary: false, staged: new Map(), cache, journal: null,
    commit(writes) { for (const [key, value] of writes) cache.set(key, value); return Promise.resolve(); } };
  const state = { events: [first], savedMatches: { [name]: structuredClone(match) } };
  first.code = '+';
  first.relatedEvents.push(2);
  state.events.push({ eventId: 2, code: '#', relatedEvents: [1] });
  assert.equal(appendScoutJournal(storage, state, name, { rotation: 2, lastSavedAt: 2 }, { beforeCount: 1, changed: [first] }), true);
  state.events.push({ eventId: 3, code: '-' });
  assert.equal(appendScoutJournal(storage, state, name, { rotation: 3, lastSavedAt: 3 }, { beforeCount: 2 }), true);
  assert.equal([...cache.keys()].filter(key => key.startsWith(SCOUT_JOURNAL_PREFIX)).length, 2);
  assert.equal(JSON.parse(cache.get(STORAGE_KEY)).events.length, 1);
  const recovered = recoverScoutJournal(cache);
  const restored = JSON.parse(recovered.get(STORAGE_KEY));
  const restoredMatch = JSON.parse(recovered.get(MATCH_PREFIX + name));
  assert.deepEqual(restored.events, state.events);
  assert.deepEqual(restoredMatch.state.events, state.events);
  assert.deepEqual(restored.savedMatches[name].state.events, state.events);
  assert.equal(restored.rotation, 3);
  assert.equal(restoredMatch.state.rotation, 3);
  assert.equal(state.savedMatches[name].state.rotation, 3);
  const checkpointWrites = recoveredJournalCheckpoint(recovered);
  assert.equal([...checkpointWrites.values()].filter(value => value === null).length, 2);
  assert.deepEqual(JSON.parse(checkpointWrites.get(STORAGE_KEY)).events, state.events);
  assert.equal(appendScoutJournal(storage, state, name, {}, { beforeCount: 99 }), false);

  const checkpoint = structuredClone(restored);
  checkpoint.__scoutJournalEpoch = 'new-base';
  checkpoint.__scoutJournalSeq = 0;
  cache.set(STORAGE_KEY, JSON.stringify(checkpoint));
  cache.set(MATCH_PREFIX + name, JSON.stringify(restoredMatch));
  assert.deepEqual(JSON.parse(recoverScoutJournal(cache).get(STORAGE_KEY)).events, state.events);
});

test('un registro incompleto non viene applicato parzialmente', () => {
  const session = { __scoutJournalEpoch: 'base', loadedMatchName: 'Gara', events: [], savedMatches: {} };
  const match = { name: 'Gara', state: { events: [] } };
  const record = { epoch: 'base', name: 'Gara', seq: 2, beforeCount: 0, patch: {}, changed: [], added: [] };
  const entries = new Map([[STORAGE_KEY, JSON.stringify(session)], [MATCH_PREFIX + 'Gara', JSON.stringify(match)],
    [SCOUT_JOURNAL_PREFIX + 'base/2', JSON.stringify(record)]]);
  assert.throws(() => recoverScoutJournal(entries), /Manca una parte/);
});

test('i record vecchi vengono rimossi solo dopo la conferma del salvataggio completo', async () => {
  const old = { epoch: 'vecchia', name: 'Gara', seq: 1 };
  const recent = { epoch: 'nuova', name: 'Gara', seq: 1 };
  const cache = new Map([[SCOUT_JOURNAL_PREFIX + 'old', JSON.stringify(old)], [SCOUT_JOURNAL_PREFIX + 'new', JSON.stringify(recent)]]);
  let resolveFlush;
  const storage = { cache, flush: () => new Promise(resolve => { resolveFlush = resolve; }),
    commit(writes) { for (const [key] of writes) cache.delete(key); return Promise.resolve(); } };
  cleanupCheckpointedJournal(storage, old);
  assert.equal(cache.size, 2);
  resolveFlush();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cache.has(SCOUT_JOURNAL_PREFIX + 'old'), false);
  assert.equal(cache.has(SCOUT_JOURNAL_PREFIX + 'new'), true);
});

test('due scritture concorrenti con lo stesso numero non sovrascrivono un record', async () => {
  const factory = new IDBFactory();
  const db = await new Promise((resolve, reject) => {
    const request = factory.open('test', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('archive');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const storage = persistent.archiveStorage;
  const previous = { db: storage.db, cache: storage.cache, confirmed: storage.confirmed,
    revisions: storage.revisions, failedKeys: storage.failedKeys, staged: storage.staged, journal: storage.journal };
  Object.assign(storage, { db, cache: new Map(), confirmed: new Map(), revisions: new Map(),
    failedKeys: new Set(), staged: new Map(), journal: null });
  const originalError = console.error;
  console.error = () => {};
  try {
    const key = SCOUT_JOURNAL_PREFIX + 'base/1';
    await storage.commit(new Map([[key, 'primo']]), { deferPacking: true, insertOnly: true });
    await assert.rejects(storage.commit(new Map([[key, 'secondo']]), { deferPacking: true, insertOnly: true }));
    assert.equal(storage.cache.get(key), 'primo');
    const value = await new Promise((resolve, reject) => {
      const request = db.transaction('archive', 'readonly').objectStore('archive').get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    assert.equal(value, 'primo');
  } finally {
    console.error = originalError;
    db.close();
    Object.assign(storage, previous);
  }
});
