import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSourceFixture } from './helpers/source-fixture.mjs';

test('il salvataggio riusa la partita nello snapshot e sincronizza una volta le squadre', () => {
  const payload = { name: 'Gara', state: { events: [{ eventId: 1 }] } };
  const calls = [];
  const context = vm.createContext({
    state: { selectedMatch: 'Gara', loadedMatchName: 'Gara' },
    publishRuntimeView() {},
    syncTeamsFromStorage: () => calls.push('teams'),
    syncMatchesFromStorage: () => calls.push('matches'),
    buildCompactLocalStateSnapshot: () => ({ savedMatches: { Gara: payload } }),
    writeStateToIndexedDb: snapshot => calls.push(['session', snapshot]),
    buildLocalUiSnapshot: () => ({}), localStorage: { setItem() {} }, STORAGE_KEY: 'test',
    persistCurrentMatch: options => calls.push(['match', options]),
    isLoadingMatch: false,
    logError: error => { throw error; },
  });
  vm.runInContext(readSourceFixture('src/features/storage/save-state.js', 'utf8'), context);
  context.saveState({ persistLocal: true });
  assert.equal(calls.filter(call => call === 'teams').length, 1);
  assert.equal(calls.filter(call => call === 'matches').length, 1);
  assert.equal(calls.find(call => call[0] === 'match')[1].snapshotPayload, payload);
  context.state.loadedMatchName = 'Altra';
  context.saveState();
  assert.equal(calls.filter(call => call[0] === 'match').at(-1)[1].snapshotPayload, null);
});

test('l’archivio usa la copia già pronta solo per la partita corretta', () => {
  let builds = 0;
  let reads = 0;
  let stored;
  const context = vm.createContext({
    state: { loadedMatchName: 'Gara', selectedMatch: 'Gara', savedMatches: { Gara: {} } },
    getCurrentMatchPayload: name => { builds++; return { name, state: { events: [2] } }; },
    cloneIsolationData: value => JSON.parse(JSON.stringify(value)),
    saveMatchToStorage: (name, data) => { stored = { name, data }; return true; },
    loadMatchFromStorage: () => { reads++; return null; },
    emitDomainEvent() {},
  });
  vm.runInContext(readSourceFixture('src/features/storage/match-persistence.js', 'utf8'), context);
  const payload = { name: 'Gara', state: { events: [1] } };
  assert.equal(context.persistCurrentMatch({ allowCreate: false, snapshotPayload: payload }), true);
  assert.equal(builds, 0);
  assert.equal(reads, 0);
  assert.equal(stored.data, payload);
  assert.notEqual(context.state.savedMatches.Gara, payload);
  assert.deepEqual(context.state.savedMatches.Gara, payload);
  context.persistCurrentMatch({ allowCreate: false, snapshotPayload: { name: 'Altra', state: {} } });
  assert.equal(builds, 1);
  assert.deepEqual(stored.data.state.events, [2]);
  context.state.savedMatches = {};
  assert.equal(context.persistCurrentMatch({ allowCreate: false }), false);
  assert.equal(reads, 1);
});

test('lo scout aggiorna la partita senza provocare la rilettura dell’intero archivio', () => {
  const events = [];
  const context = vm.createContext({
    state: { loadedMatchName: 'Gara', selectedMatch: 'Gara', savedMatches: { Gara: {} } },
    getCurrentMatchPayload: () => ({ name: 'Gara', state: { events: [] } }),
    cloneIsolationData: value => JSON.parse(JSON.stringify(value)),
    saveMatchToStorage: () => true,
    loadMatchFromStorage: () => null,
    emitDomainEvent: type => events.push(type),
  });
  vm.runInContext(readSourceFixture('src/features/storage/match-persistence.js', 'utf8'), context);
  context.persistCurrentMatch({ allowCreate: false, notifyArchive: false });
  assert.deepEqual(events, []);
  assert.equal(context.state.savedMatches.Gara.name, 'Gara');
  context.persistCurrentMatch({ allowCreate: false });
  assert.deepEqual(events, ['match-archive-changed']);
});

test('lo snapshot mantiene indipendenti eventi correnti, sessione e archivio', async () => {
  const { readFileSync } = await import('node:fs');
  const { session } = await import('../js/globals.js');
  const { buildCompactLocalStateSnapshot } = await import('../src/features/storage/state-snapshot.js');
  const previous = session.state;
  try {
    session.state = JSON.parse(readFileSync('match_demo.json', 'utf8')).state;
    session.state.selectedMatch = 'Gara';
    const snapshot = buildCompactLocalStateSnapshot(session.state);
    const event = session.state.events[0];
    const sessionEvent = snapshot.events[0];
    const archiveEvent = snapshot.savedMatches.Gara.state.events[0];
    assert.deepEqual(sessionEvent, archiveEvent);
    assert.notEqual(event, sessionEvent);
    assert.notEqual(event, archiveEvent);
    assert.notEqual(sessionEvent, archiveEvent);
    sessionEvent.code = 'changed';
    assert.notEqual(archiveEvent.code, 'changed');
    assert.notEqual(event.code, 'changed');
  } finally { session.state = previous; }
});

test('lo scout salva sessione e partita senza rileggere gli archivi quando la partita è già caricata', () => {
  const calls = [];
  const payload = { name: 'Gara', state: { events: [{ eventId: 1 }] } };
  const context = vm.createContext({
    state: { selectedMatch: 'Gara', loadedMatchName: 'Gara', savedMatches: { Gara: payload } },
    publishRuntimeView() {}, syncTeamsFromStorage: () => calls.push('teams'), syncMatchesFromStorage: () => calls.push('matches'),
    buildCompactLocalStateSnapshot: () => ({ savedMatches: { Gara: payload } }),
    writeStateToIndexedDb: (_snapshot, options) => calls.push(['session', options.deferPacking, options.serializedMatch]),
    buildLocalUiSnapshot: () => ({}), localStorage: { setItem() {} }, STORAGE_KEY: 'test',
    persistCurrentMatch: options => calls.push(['match', options.deferPacking, options.serializedPayload, options.notifyArchive]), isLoadingMatch: false,
    logError: error => { throw error; },
  });
  vm.runInContext(readSourceFixture('src/features/storage/save-state.js', 'utf8'), context);
  context.saveState({ persistLocal: true, skipArchiveSyncForScout: true });
  assert.deepEqual(calls, [['session', true, JSON.stringify(payload)], ['match', true, JSON.stringify(payload), false]]);
  calls.length = 0;
  context.state.loadedMatchName = 'Altra';
  context.saveState({ persistLocal: true, skipArchiveSyncForScout: true });
  assert.deepEqual(calls, ['teams', 'matches', ['session', false, null], ['match', false, null, true]]);
});

test('se il registro incrementale non parte, la partita viene salvata integralmente', () => {
  const calls = [];
  const payload = { name: 'Gara', state: { events: [{ eventId: 1 }] } };
  const context = vm.createContext({
    state: { selectedMatch: 'Gara', loadedMatchName: 'Gara', savedMatches: { Gara: payload }, events: payload.state.events },
    persistentStorageState: { archiveStorage: { journal: null } },
    archiveStorage: { journal: null },
    publishRuntimeView() {}, syncTeamsFromStorage() {}, syncMatchesFromStorage() {}, syncEventPlayerLinks() {},
    appendScoutJournal: () => { throw new Error('transazione non disponibile'); },
    buildCompactLocalStateSnapshot: () => ({ savedMatches: { Gara: payload } }),
    writeStateToIndexedDb: () => calls.push('sessione'),
    buildLocalUiSnapshot: () => ({}), localStorage: { setItem() {} }, STORAGE_KEY: 'test',
    persistCurrentMatch: () => calls.push('partita'), isLoadingMatch: false,
    logError: () => calls.push('errore'),
  });
  vm.runInContext(readSourceFixture('src/features/storage/save-state.js', 'utf8'), context);
  context.saveState({ skipArchiveSyncForScout: true, journal: { beforeCount: 0, changed: [] } });
  assert.deepEqual(calls, ['errore', 'sessione', 'partita']);
});


test('la sessione riusa la partita serializzata senza modificare i dati', async () => {
  const { serializeStateSnapshot } = await import('../src/features/storage/state-db.js');
  const matchName = 'Gara "\n#1';
  const payload = { name: matchName, state: { events: [{ eventId: 1, code: '+', note: 'prova' }] } };
  const snapshot = { lastSavedAt: 12, events: [{ eventId: 1 }], savedMatches: { [matchName]: payload }, theme: 'light' };
  const expected = JSON.parse(JSON.stringify(snapshot));
  assert.deepEqual(JSON.parse(serializeStateSnapshot(snapshot, { matchName, serializedMatch: JSON.stringify(payload) })), expected);
  assert.deepEqual(JSON.parse(serializeStateSnapshot(snapshot, { matchName: 'altro', serializedMatch: '{}' })), expected);
});
