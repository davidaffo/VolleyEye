import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { STORAGE_KEY, MATCH_PREFIX } from '../js/globals.js';
import { session as persistent } from '../src/features/state/storage-persistent-storage.js';
import { getStateDb } from '../src/features/storage/state-db.js';
import { session as stateDb } from '../src/features/state/storage-state-db.js';
import { queueScoutSave } from '../src/features/storage/scout-save-queue.js';

test('la coda conserva il più recente, evita scritture vecchie e attende IndexedDB', async () => {
  const previousWorker = globalThis.Worker;
  const previousIndexedDB = globalThis.indexedDB;
  const storage = persistent.archiveStorage;
  const previousDbPromise = stateDb.stateDbPromise;
  const previousStorage = { db: storage.db, cache: storage.cache, confirmed: storage.confirmed, revisions: storage.revisions, staged: storage.staged };
  stateDb.stateDbPromise = null;
  storage.cache = new Map();
  storage.confirmed = new Map();
  storage.revisions = new Map();
  storage.staged = new Map();
  class FakeWorker {
    constructor() { FakeWorker.instance = this; this.messages = []; }
    postMessage(message) { this.messages.push(structuredClone(message)); }
    complete() {
      const message = this.messages.shift();
      this.onmessage({ data: { id: message.id, snapshot: JSON.stringify(message.snapshot), match: JSON.stringify(message.snapshot.savedMatches[message.matchName]) } });
    }
    terminate() {}
  }
  globalThis.Worker = FakeWorker;
  globalThis.indexedDB = new IDBFactory();
  storage.db = await getStateDb();
  const name = 'Gara';
  const snap = number => ({ events: [number], savedMatches: { [name]: { name, state: { events: [number] } } } });
  try {
    assert.equal(queueScoutSave(snap(1), name), true);
    queueScoutSave(snap(2), name);
    queueScoutSave(snap(3), name);
    assert.equal(FakeWorker.instance.messages.length, 1);
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).events, [3]);
    FakeWorker.instance.complete();
    assert.equal(FakeWorker.instance.messages.length, 1);
    assert.deepEqual(FakeWorker.instance.messages[0].snapshot.events, [3]);
    FakeWorker.instance.complete();
    await storage.flush();
    assert.deepEqual(JSON.parse(storage.getItem(MATCH_PREFIX + name)).state.events, [3]);
    const entries = await new Promise((resolve, reject) => {
      const tx = storage.db.transaction('archive', 'readonly');
      const state = tx.objectStore('archive').get(STORAGE_KEY);
      const match = tx.objectStore('archive').get(MATCH_PREFIX + name);
      tx.oncomplete = () => resolve([JSON.parse(state.result), JSON.parse(match.result)]);
      tx.onabort = () => reject(tx.error);
    });
    assert.deepEqual(entries[0].events, [3]);
    assert.deepEqual(entries[1].state.events, [3]);

    queueScoutSave(snap(4), name);
    await storage.commit(new Map([[STORAGE_KEY, JSON.stringify(snap(5))], [MATCH_PREFIX + name, JSON.stringify(snap(5).savedMatches[name])]]), { deferPacking: true });
    FakeWorker.instance.complete();
    await storage.flush();
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).events, [5]);
    assert.deepEqual(JSON.parse(storage.getItem(MATCH_PREFIX + name)).state.events, [5]);
    queueScoutSave(snap(6), name);
    queueScoutSave(snap(7), name);
    FakeWorker.instance.onerror({ preventDefault() {} });
    await storage.flush();
    assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).events, [7]);
    assert.deepEqual(JSON.parse(storage.getItem(MATCH_PREFIX + name)).state.events, [7]);
  } finally {
    storage.db.close();
    Object.assign(storage, previousStorage);
    stateDb.stateDbPromise = previousDbPromise;
    globalThis.Worker = previousWorker;
    globalThis.indexedDB = previousIndexedDB;
  }
});
