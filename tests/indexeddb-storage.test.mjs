import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { IDBFactory } from 'fake-indexeddb';

const storageSource = readFileSync('js/shared/persistent-storage.js', 'utf8');
const config = readFileSync('js/roster/settings/scouting-config.js', 'utf8');
const dbSource = config.slice(config.indexOf('const STATE_DB_NAME'), config.indexOf('function makeUniqueMatchName'));
const stateSource = readFileSync('js/roster/core/state-store.js', 'utf8');
const uiSource = stateSource.slice(stateSource.indexOf('function buildLocalUiSnapshot'), stateSource.indexOf('function buildCompactLocalStateSnapshot'));
function harness({ indexedDB = new IDBFactory(), saved = new Map() } = {}) {
  const ctx = vm.createContext({
    indexedDB, console: { error() {} },
    STORAGE_KEY: 'state', PERSISTENT_DB_NAME: 'Data', MATCH_PREFIX: 'Data/Matches/', TEAM_PREFIX: 'Data/Teams/', PLAYER_PREFIX: 'Data/Players',
    localStorage: {
      get length() { return saved.size; },
      key: index => [...saved.keys()][index] ?? null,
      getItem: key => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, String(value)),
      removeItem: key => saved.delete(key)
    }
  });
  vm.runInContext(`${storageSource}\n${dbSource}\n${uiSource}\nglobalThis.archive = archiveStorage;`, ctx);
  return { ctx, saved, indexedDB };
}
async function seedOldState(indexedDB, snapshot) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('volleyScoutStateDb', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(snapshot, 'state');
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

test('migra archivio, squadre, giocatrici e snapshot; localStorage conserva solo UI e preferenze', async () => {
  const match = { state: { events: [{ set: 1, code: '#' }] } };
  const { ctx, saved, indexedDB } = harness({ saved: new Map([
    ['Data/Matches/partita', JSON.stringify(match)],
    ['Data/Teams/casa', '{"name":"Casa"}'],
    ['Data/Players', '{"id":{"name":"Anna","photo":"foto"}}'],
    ['state', JSON.stringify({ lastSavedAt: 3, events: [{ eventId: 4 }], uiActiveTab: 'scout', savedMatches: { vecchia: match } })],
    ['theme', 'dark'], ['unrelated', 'keep']
  ]) });
  await seedOldState(indexedDB, { lastSavedAt: 2, events: [{ eventId: 1 }] });
  await ctx.initializePersistentStorage();
  assert.deepEqual(JSON.parse(ctx.archive.getItem('Data/Matches/partita')), match);
  assert.ok(ctx.archive.getItem('Data/Matches/vecchia'));
  assert.ok(ctx.archive.getItem('Data/Teams/casa'));
  assert.ok(ctx.archive.getItem('Data/Players'));
  assert.deepEqual(JSON.parse(ctx.archive.getItem('state')).events, [{ eventId: 4 }]);
  assert.deepEqual(JSON.parse(saved.get('state')), { __uiOnly: true, lastSavedAt: 3, uiActiveTab: 'scout' });
  assert.equal([...saved.keys()].some(key => key.startsWith('Data/')), false);
  assert.equal(saved.get('unrelated'), 'keep');
  assert.equal(saved.get('theme'), 'dark');
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.deepEqual(JSON.parse(reopened.ctx.archive.getItem('Data/Matches/partita')), match);
});

test('la migrazione sceglie lo snapshot IndexedDB più recente e conserva gli archivi locali', async () => {
  const { ctx, saved, indexedDB } = harness({ saved: new Map([['state', JSON.stringify({ lastSavedAt: 1, events: ['old'] })]]) });
  await seedOldState(indexedDB, { lastSavedAt: 2, events: ['new'], playersDb: { id: { name: 'Anna' } } });
  await ctx.initializePersistentStorage();
  assert.deepEqual(JSON.parse(ctx.archive.getItem('state')).events, ['new']);
  assert.ok(ctx.archive.getItem('Data/Players'));
  assert.equal(JSON.parse(saved.get('state')).events, undefined);
});

test('migrazione interrotta prima del commit non cancella alcuna copia locale', async () => {
  const { ctx, saved } = harness({ saved: new Map([['Data/Matches/game', '{"state":{"events":[1]}}']]) });
  const before = [...saved];
  const originalCommit = ctx.archive.commit;
  ctx.archive.commit = async () => { throw new Error('disco pieno'); };
  await assert.rejects(ctx.initializePersistentStorage(), /disco pieno/);
  assert.deepEqual([...saved], before);
  ctx.archive.commit = originalCommit;
  await ctx.initializePersistentStorage();
  assert.equal(saved.has('Data/Matches/game'), false);
  assert.ok(ctx.archive.getItem('Data/Matches/game'));
});

test('cleanup interrotto riparte senza resuscitare partite cancellate', async () => {
  const { ctx, saved, indexedDB } = harness({ saved: new Map([['Data/Matches/game', '{"state":{"events":[1]}}']]) });
  const remove = ctx.localStorage.removeItem;
  ctx.localStorage.removeItem = () => { throw new Error('cleanup interrotto'); };
  await assert.rejects(ctx.initializePersistentStorage(), /cleanup interrotto/);
  assert.ok(saved.has('Data/Matches/game'));
  await ctx.archive.removeItem('Data/Matches/game');
  ctx.localStorage.removeItem = remove;
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.equal(reopened.ctx.archive.getItem('Data/Matches/game'), null);
  assert.equal(saved.has('Data/Matches/game'), false);
});

test('transazione annullata ripristina la cache e non scrive metà archivio; un retry può riuscire', async () => {
  const { ctx, indexedDB, saved } = harness();
  await ctx.initializePersistentStorage();
  await ctx.archive.setItem('Data/Matches/game', 'original');
  const db = ctx.archive.db;
  const transaction = db.transaction.bind(db);
  let aborted = false;
  db.transaction = (...args) => {
    const tx = transaction(...args);
    if (args[1] === 'readwrite' && !aborted) { aborted = true; queueMicrotask(() => tx.abort()); }
    return tx;
  };
  await assert.rejects(ctx.archive.commit(new Map([['Data/Matches/game', 'changed'], ['Data/Teams/new', 'new']])));
  assert.equal(ctx.archive.getItem('Data/Matches/game'), 'original');
  assert.equal(ctx.archive.getItem('Data/Teams/new'), null);
  await assert.rejects(ctx.archive.flush());
  db.transaction = transaction;
  await ctx.archive.commit(new Map([['Data/Matches/game', 'retry'], ['Data/Teams/new', 'new']]));
  await ctx.archive.flush();
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.equal(reopened.ctx.archive.getItem('Data/Matches/game'), 'retry');
  assert.equal(reopened.ctx.archive.getItem('Data/Teams/new'), 'new');
});

test('salvataggi consecutivi conservano l’ultima versione dopo riapertura', async () => {
  const { ctx, indexedDB, saved } = harness();
  await ctx.initializePersistentStorage();
  const writes = Array.from({ length: 20 }, (_, i) => ctx.archive.setItem('state', JSON.stringify({ events: [i] })));
  await Promise.all(writes);
  await ctx.archive.flush();
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.deepEqual(JSON.parse(reopened.ctx.archive.getItem('state')).events, [19]);
  assert.equal(saved.has('state'), false);
});

test('IndexedDB indisponibile blocca la migrazione senza fallback pesante su localStorage', async () => {
  const { ctx, saved } = harness({ indexedDB: null, saved: new Map([['Data/Matches/game', '{}']]) });
  delete ctx.indexedDB;
  await assert.rejects(ctx.initializePersistentStorage(), /IndexedDB non disponibile/);
  assert.equal(saved.get('Data/Matches/game'), '{}');
});
