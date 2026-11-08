import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import { IDBFactory } from 'fake-indexeddb';
import { featureSource } from './helpers/feature-source.mjs';

const storageSource = readFileSync('src/features/storage/persistent-storage.js', 'utf8');
const dbSource = readFileSync('src/features/state/storage-state-db.js', 'utf8') + readFileSync('src/features/storage/state-db.js', 'utf8');
const uiSource = readFileSync('src/features/storage/ui-preferences.js', 'utf8');
function harness({ indexedDB = new IDBFactory(), saved = new Map() } = {}) {
  const ctx = vm.createContext({
    cloneIsolationData: value => JSON.parse(JSON.stringify(value)),
    ARCHIVE_OPTIMIZED_KEY: '__archiveOptimizedV1', ARCHIVE_PHOTO_PREFIX: '__archivePhoto/',
    indexedDB, console: { error() {} },
    STORAGE_KEY: 'state', PERSISTENT_DB_NAME: 'Data', MATCH_PREFIX: 'Data/Matches/', TEAM_PREFIX: 'Data/Teams/', OPPONENT_TEAM_PREFIX: 'Data/Opponents/', PLAYER_PREFIX: 'Data/Players',
    localStorage: {
      get length() { return saved.size; },
      key: index => [...saved.keys()][index] ?? null,
      getItem: key => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, String(value)),
      removeItem: key => saved.delete(key)
    }
  });
  for (const [path, names] of [
    ['src/features/io/backup-photos.js'],
    ['src/features/events/history-model.js', ['clearScoutUndoStates']],
    ['src/features/storage/match-codec.js', ['encodeMatchStoragePayload', 'decodeMatchStoragePayload']],
    ['src/features/io/database-backup.js'],
    ['src/features/storage/archive-codec.js'],
  ]) vm.runInContext(featureSource(path, names), ctx);
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

async function rawEntries(db) {
  return new Promise((resolve, reject) => {
    const rows = new Map();
    const tx = db.transaction('archive', 'readonly');
    const request = tx.objectStore('archive').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { rows.set(cursor.key, cursor.value); cursor.continue(); }
    };
    tx.oncomplete = () => resolve(rows);
    tx.onabort = () => reject(tx.error);
  });
}

test('ottimizza tutto l’archivio, condivide le foto e mantiene compatti i salvataggi dopo riapertura', async () => {
  const { ctx, indexedDB, saved } = harness();
  await ctx.initializePersistentStorage();
  const photo = 'data:image/jpeg;base64,' + 'x'.repeat(5000);
  const trajectory = { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } };
  const events = Array.from({ length: 40 }, (_, eventId) => ({ eventId, code: '#', empty: null,
    dv: { rawCode: '' }, attackDirection: trajectory, attackTrajectory: trajectory,
    undoState: { before: { rotation: 1 } }, prevSetStarts: { 1: { rotation: 1 } } }));
  const match = { version: 1, state: { players: ['Anna'], events, matchFinished: false } };
  const team = { playersDetailed: [{ photo }] };
  ctx.state = { ...JSON.parse(JSON.stringify(match.state)), loadedMatchName: 'live', selectedMatch: 'live',
    savedMatches: { live: structuredClone(match), archived: structuredClone(match) },
    savedTeams: { casa: team }, savedOpponentTeams: { casa: team }, playersDb: { anna: { photo } } };
  await ctx.archive.commit(new Map([
    ['state', JSON.stringify(ctx.state)], ['Data/Matches/live', JSON.stringify(match)], ['Data/Matches/archived', JSON.stringify(match)],
    ['Data/Teams/casa', JSON.stringify(team)], ['Data/Players', JSON.stringify(ctx.state.playersDb)],
  ]));
  const before = await rawEntries(ctx.archive.db);
  ctx.logError = () => {};
  ctx.saveState = () => ctx.archive.setItem('state', JSON.stringify(ctx.state));
  vm.runInContext(featureSource('src/features/storage/match-repository.js', [
    'getMatchStorageKey', 'listMatchesFromStorage', 'loadMatchFromStorage', 'saveMatchToStorage', 'loadMatchesMapFromStorage',
  ]), ctx);
  vm.runInContext(featureSource('src/features/storage/undo-cleanup.js'), ctx);
  assert.equal(await ctx.optimizeArchiveSpace(), 2);
  const raw = await rawEntries(ctx.archive.db);
  assert.equal([...raw.keys()].filter(key => key.startsWith('__archivePhoto/')).length, 1);
  assert.equal(JSON.parse(raw.get('Data/Matches/live')).storageFormat, 'volleyeye-archive-v1');
  assert.ok([...raw.values()].join('').length < [...before.values()].join('').length / 2);
  const expected = JSON.parse(JSON.stringify(ctx.state));
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.deepEqual(JSON.parse(reopened.ctx.archive.getItem('state')), expected);
  const restored = JSON.parse(reopened.ctx.archive.getItem('Data/Matches/live'));
  assert.equal(restored.version, 1);
  assert.equal(restored.state.events[0].undoState, undefined);
  assert.equal(restored.state.events[0].prevSetStarts, undefined);
  assert.deepEqual(restored.state.events[0].attackTrajectory, trajectory);
  // I nuovi eventi di una partita in corso conservano l'annullamento.
  const next = { ...structuredClone(match), photo };
  await reopened.ctx.archive.setItem('Data/Matches/new', JSON.stringify(next));
  const later = await rawEntries(reopened.ctx.archive.db);
  assert.equal([...later.keys()].filter(key => key.startsWith('__archivePhoto/')).length, 1);
  assert.equal(JSON.parse(later.get('Data/Matches/new')).storageFormat, 'volleyeye-archive-v1');
  const reopenedAgain = harness({ indexedDB, saved });
  await reopenedAgain.ctx.initializePersistentStorage();
  assert.deepEqual(JSON.parse(reopenedAgain.ctx.archive.getItem('Data/Matches/new')), next);
  // Un secondo passaggio è sicuro e non moltiplica le foto.
  await reopenedAgain.ctx.archive.commit(new Map(reopenedAgain.ctx.archive.cache));
  assert.equal([...(await rawEntries(reopenedAgain.ctx.archive.db)).keys()].filter(key => key.startsWith('__archivePhoto/')).length, 1);
});

test('ottimizzazione interrotta non lascia riferimenti a foto mancanti o un archivio a metà', async () => {
  const { ctx, indexedDB, saved } = harness();
  await ctx.initializePersistentStorage();
  await ctx.archive.setItem('Data/Teams/casa', JSON.stringify({ photo: 'ritratto' }));
  const before = await rawEntries(ctx.archive.db);
  const db = ctx.archive.db, transaction = db.transaction.bind(db);
  db.transaction = (...args) => {
    const tx = transaction(...args);
    if (args[1] === 'readwrite') queueMicrotask(() => tx.abort());
    return tx;
  };
  const writes = new Map(ctx.archive.cache); writes.set('__archiveOptimizedV1', '1');
  await assert.rejects(ctx.archive.commit(writes));
  db.transaction = transaction;
  assert.deepEqual(await rawEntries(db), before);
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.equal(reopened.ctx.archive.getItem('__archiveOptimizedV1'), null);
  assert.deepEqual(JSON.parse(reopened.ctx.archive.getItem('Data/Teams/casa')), { photo: 'ritratto' });
});

test('salvataggi concorrenti mantengono la foto condivisa anche se il primo viene annullato', async () => {
  const { ctx, indexedDB, saved } = harness();
  await ctx.initializePersistentStorage();
  await ctx.archive.setItem('__archiveOptimizedV1', '1');
  const db = ctx.archive.db, transaction = db.transaction.bind(db);
  let first = true;
  db.transaction = (...args) => {
    const tx = transaction(...args);
    if (first && args[1] === 'readwrite') { first = false; queueMicrotask(() => tx.abort()); }
    return tx;
  };
  const results = await Promise.allSettled([
    ctx.archive.setItem('Data/Teams/first', JSON.stringify({ photo: 'ritratto' })),
    ctx.archive.setItem('Data/Teams/second', JSON.stringify({ photo: 'ritratto' })),
  ]);
  assert.deepEqual(results.map(result => result.status), ['rejected', 'fulfilled']);
  db.transaction = transaction;
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.equal(reopened.ctx.archive.getItem('Data/Teams/first'), null);
  assert.deepEqual(JSON.parse(reopened.ctx.archive.getItem('Data/Teams/second')), { photo: 'ritratto' });
});

test('foto differenti rimangono distinte anche in caso di collisione dell’identificativo', async () => {
  const { ctx, indexedDB, saved } = harness();
  await ctx.initializePersistentStorage();
  ctx.archivePhotoKey = () => '__archivePhoto/collision';
  await ctx.archive.setItem('__archiveOptimizedV1', '1');
  await ctx.archive.commit(new Map([
    ['Data/Teams/first', JSON.stringify({ photo: 'ritratto A' })],
    ['Data/Teams/second', JSON.stringify({ photo: 'ritratto B' })],
    ['Data/Opponents/old', JSON.stringify({ photo: 'ritratto A' })],
  ]));
  const reopened = harness({ indexedDB, saved });
  await reopened.ctx.initializePersistentStorage();
  assert.equal(JSON.parse(reopened.ctx.archive.getItem('Data/Teams/first')).photo, 'ritratto A');
  assert.equal(JSON.parse(reopened.ctx.archive.getItem('Data/Teams/second')).photo, 'ritratto B');
  assert.equal(JSON.parse(reopened.ctx.archive.getItem('Data/Opponents/old')).photo, 'ritratto A');
  assert.equal([...(await rawEntries(reopened.ctx.archive.db)).keys()].filter(key => key.startsWith('__archivePhoto/')).length, 2);
});
