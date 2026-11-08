import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { featureSource } from './helpers/feature-source.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
function setup() {
  const context = vm.createContext({ cloneIsolationData: clone });
  vm.runInContext(featureSource('src/features/io/backup-photos.js'), context);
  vm.runInContext(featureSource('src/features/events/history-model.js', ['clearScoutUndoStates']), context);
  vm.runInContext(featureSource('src/features/storage/match-codec.js', ['encodeMatchStoragePayload', 'decodeMatchStoragePayload']), context);
  vm.runInContext(featureSource('src/features/io/database-backup.js'), context);
  return context;
}

test('backup salva ogni foto una volta e ripristina tutte le copie senza alterare gli originali', () => {
  const c = setup();
  const photo = 'data:image/jpeg;base64,ritratto';
  const original = { version: 1, state: {
    playersDb: { a: { id: 'a', photo }, b: { id: 'b', photo: '' } },
    savedTeams: { team: { playersDetailed: [{ id: 'a', photo }, { id: 'c', photo: 'foto diversa' }] } },
    savedMatches: { old: { state: { player: { photo } } } },
  } };
  const packed = c.packDatabaseBackupPhotos(original);
  assert.deepEqual(clone(packed.photoAssets), [photo, 'foto diversa']);
  assert.equal(JSON.stringify(packed).split(photo).length - 1, 1);
  assert.equal(original.state.playersDb.a.photo, photo);
  assert.equal(packed.state.playersDb.b.photo, '');
  assert.deepEqual(clone(c.unpackDatabaseBackupPhotos(clone(packed))), { ...original, version: 2 });
  assert.ok(packed.state.playersDb.a.photo.backupPhotoIndex === 0);
});

test('backup precedenti vengono ripristinati senza modifiche', () => {
  const c = setup();
  const old = { version: 1, state: { savedOpponentTeams: { team: { photo: 'foto precedente' } } } };
  assert.deepEqual(clone(c.unpackDatabaseBackupPhotos(old)), old);
});

test('riferimenti foto corrotti vengono rifiutati prima del ripristino', () => {
  const c = setup();
  for (const index of [-1, 1, '0', 0.5]) {
    assert.throws(() => c.unpackDatabaseBackupPhotos({ photoAssets: ['foto'], state: { photo: { backupPhotoIndex: index } } }), /Foto mancante/);
  }
  assert.throws(() => c.unpackDatabaseBackupPhotos({ photoAssets: [null], state: {} }), /Archivio foto/);
});

test('esportazione database include un solo archivio squadre e comprime le foto', () => {
  const c = setup();
  Object.assign(c, {
    state: { playersDb: { a: { photo: 'foto' } }, savedMatches: {} },
    buildMatchExportPayload: () => ({ state: {}, exportedAt: 'oggi' }),
    loadTeamsMapFromStorage: () => ({ team: { playersDetailed: [{ photo: 'foto' }] } }),
  });
  vm.runInContext(featureSource('src/features/io/exports.js', ['buildDatabaseBackupPayload']), c);
  const payload = c.buildDatabaseBackupPayload();
  assert.equal(Object.hasOwn(payload.state, 'savedOpponentTeams'), false);
  assert.deepEqual(clone(payload.photoAssets), ['foto']);
  const restored = c.unpackDatabaseBackup(payload);
  assert.equal(restored.state.savedTeams.team.playersDetailed[0].photo, 'foto');
  assert.equal(restored.state.playersDb.a.photo, 'foto');
});
