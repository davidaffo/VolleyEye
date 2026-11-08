import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { featureSource } from './helpers/feature-source.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
function setup() {
  const c = vm.createContext({ cloneIsolationData: clone });
  for (const [path, names] of [
    ['src/features/io/backup-photos.js'],
    ['src/features/events/history-model.js', ['clearScoutUndoStates']],
    ['src/features/storage/match-codec.js', ['encodeMatchStoragePayload', 'decodeMatchStoragePayload']],
    ['src/features/io/database-backup.js'],
  ]) vm.runInContext(featureSource(path, names), c);
  return c;
}

function fixture(finished = false) {
  const trajectory = { start: { x: 0, y: 1 }, end: { x: 0.5, y: 0.2 } };
  const match = { state: {
    players: ['Anna'], matchFinished: finished, stats: { attack: 1 }, notes: [{ text: 'Nota' }],
    events: [
      { eventId: 1, value: null, empty: '', disabled: false, zero: 0, attackDirection: trajectory, attackTrajectory: trajectory,
        dv: { rawCode: '' }, undoState: { before: { rotation: 1 } }, prevSetStarts: { 1: { rotation: 1 } } },
      { eventId: 2, dv: { rawCode: '' }, attackDirection: trajectory, attackTrajectory: { different: true } },
      {},
    ],
  } };
  return { version: 1, state: { ...clone(match.state), loadedMatchName: 'match', selectedMatch: 'match',
    savedMatches: { match }, savedTeams: { team: { playersDetailed: [{ photo: 'ritratto' }] } }, playersDb: { a: { photo: 'ritratto' } } } };
}

test('backup compatto ripristina eventi, campi vuoti, traiettorie e foto senza perdita', () => {
  const c = setup(), original = fixture(), expected = clone(original);
  const packed = clone(c.packDatabaseBackup(original));
  assert.deepEqual(original, expected);
  assert.equal(Object.hasOwn(packed.state, 'events'), false);
  assert.equal(packed.currentMatchRef.name, 'match');
  assert.equal(packed.state.savedMatches.match.storageFormat, 'volleyeye-match-columns-v1');
  assert.deepEqual(packed.state.savedMatches.match.backupTrajectoryAliases, [0]);
  const restored = clone(c.unpackDatabaseBackup(packed));
  assert.deepEqual(restored, { ...expected, version: 3 });
  restored.state.events[0].dv.rawCode = 'edit';
  assert.equal(restored.state.events[1].dv.rawCode, '');
  assert.equal(restored.state.savedMatches.match.state.events[0].dv.rawCode, '');
});

test('backup conserva le differenze della partita aperta rispetto a quella archiviata', () => {
  const c = setup(), original = fixture();
  original.state.events.push({ eventId: 3 });
  original.state.stats = { attack: 2 };
  const packed = clone(c.packDatabaseBackup(original));
  assert.ok(packed.activeMatchEvents);
  assert.deepEqual(clone(c.unpackDatabaseBackup(packed)), { ...original, version: 3 });
});

test('backup conserva anche una partita aperta senza nome o archivio', () => {
  const c = setup(), original = fixture();
  original.state.loadedMatchName = '';
  original.state.selectedMatch = '';
  original.state.savedMatches = {};
  assert.deepEqual(clone(c.unpackDatabaseBackup(c.packDatabaseBackup(original))), { ...original, version: 3 });
});

test('backup ripulisce solo le ricevute delle partite terminate senza cambiare i dati vivi', () => {
  const c = setup(), original = fixture(true), expected = clone(original);
  for (const state of [expected.state, expected.state.savedMatches.match.state]) {
    delete state.events[0].undoState;
    delete state.events[0].prevSetStarts;
  }
  const restored = clone(c.unpackDatabaseBackup(c.packDatabaseBackup(original)));
  assert.deepEqual(restored, { ...expected, version: 3 });
  assert.ok(original.state.events[0].undoState);
});

test('backup vecchi con o senza tabella foto rimangono importabili', () => {
  const c = setup(), original = fixture();
  assert.deepEqual(clone(c.unpackDatabaseBackup(original)), original);
  assert.deepEqual(clone(c.unpackDatabaseBackup(c.packDatabaseBackupPhotos(original))), { ...original, version: 2 });
});

test('backup con riferimenti o colonne corrotti viene rifiutato', () => {
  const c = setup(), packed = clone(c.packDatabaseBackup(fixture()));
  const missing = clone(packed); missing.currentMatchRef.name = 'assente';
  assert.throws(() => c.unpackDatabaseBackup(missing), /Partita aperta mancante/);
  const bad = clone(packed); bad.state.savedMatches.match.columns[0][2][0] = 999;
  assert.throws(() => c.unpackDatabaseBackup(bad), /Colonna eventi/);
  const truncated = clone(packed); truncated.state.savedMatches.match.columns[0][2].pop();
  assert.throws(() => c.unpackDatabaseBackup(truncated), /Colonna eventi/);
  const alias = clone(packed); alias.state.savedMatches.match.backupTrajectoryAliases = [999];
  assert.throws(() => c.unpackDatabaseBackup(alias), /Traiettoria mancante/);
});

test('import database espande il backup prima di validare e salvare le partite', async () => {
  const c = setup(), original = fixture(), writes = [];
  let active;
  Object.assign(c, {
    state: {},
    applyImportedMatch: value => { active = clone(value); },
    saveTeamToStorage: () => true,
    savePlayersDbToStorage: () => true,
    saveMatchToStorage: (name, value) => { writes.push([name, clone(value)]); return true; },
    syncTeamsFromStorage() {}, syncMatchesFromStorage() {}, syncOpponentTeamsFromStorage() {},
    renderMatchesSelect() {}, publishTeamsManagerView() {}, saveState() {}, alert() {},
    archiveStorage: { flush: async () => {} },
  });
  vm.runInContext(featureSource('src/features/io/match-io.js', ['applyImportedDatabase']), c);
  assert.equal(await c.applyImportedDatabase(c.packDatabaseBackup(original)), true);
  assert.deepEqual(active, original.state);
  assert.deepEqual(writes, [['match', original.state.savedMatches.match]]);
  writes.length = 0;
  active = null;
  const broken = clone(c.packDatabaseBackup(original));
  broken.currentMatchRef.name = 'missing';
  await assert.rejects(c.applyImportedDatabase(broken), /Partita aperta mancante/);
  assert.equal(active, null);
  assert.equal(writes.length, 0);
});
