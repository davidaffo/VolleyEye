import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { readRosterSource } from './helpers/roster-source.mjs';
const roster = readRosterSource();
const management = readFileSync(new URL('../js/scout/live/team-management.js', import.meta.url), 'utf8');
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const player = (n, firstName, number = '') => ({ id: id(n), firstName, lastName: 'Rossi', number });
function setup() {
  const teams = { A: { version: 3, name: 'A', playersDetailed: [player(1, 'Anna', '4')] }, B: { version: 3, name: 'B', playersDetailed: [player(2, 'Anna', '9'), player(3, 'Sara', '6')] } };
  const match = { name: 'B contro C', state: { selectedTeam: 'B', match: { teamName: 'B', opponent: 'C' }, players: ['Rossi Anna'], playersDetailed: [player(2, 'Anna', '9')], events: [{ playerId: id(2), playerName: 'Rossi Anna', playerIdx: 0, code: '#', note: 'B' }] } };
  const storage = new Map([['teams/A', JSON.stringify(teams.A)], ['teams/B', JSON.stringify(teams.B)], ['matches/game', JSON.stringify(match)]]);
  const context = {
    DEFAULT_STAFF: {}, teamManagerState: null, logError: () => {},
    state: { playersDb: {}, selectedTeam: 'B', selectedOpponentTeam: 'B', match: { teamName: 'B', opponent: 'B' }, events: match.state.events },
    generatePlayerId: () => id(99), isValidPlayerId: value => typeof value === 'string' && value.length === 36,
    loadTeamsMapFromStorage: () => Object.fromEntries([...storage].filter(([key]) => key.startsWith('teams/')).map(([key, value]) => [key.slice(6), JSON.parse(value)])),
    loadMatchesMapFromStorage: () => ({ game: JSON.parse(storage.get('matches/game')) }),
    loadPlayersDbFromStorage: () => ({}),
    getTeamStorageKey: name => 'teams/' + name, getMatchStorageKey: name => 'matches/' + name,
    PLAYER_PREFIX: 'players', STORAGE_KEY: 'state',
    buildCompactLocalStateSnapshot: value => value, writeStateToIndexedDb: () => {},
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  };
  context.buildLocalUiSnapshot = () => ({ __uiOnly: true });
  context.localStorage = { setItem() {} };
  context.archiveStorage = { commit: async writes => {
    for (const [key, value] of writes) if (key === context.failKey) throw new Error('quota');
    writes.forEach((value, key) => value === null ? storage.delete(key) : storage.set(key, value));
  } };
  vm.createContext(context);
  vm.runInContext(roster.slice(roster.indexOf('function normalizePlayers'), roster.indexOf('function replacePlayerNameEverywhere')), context);
  vm.runInContext(roster.slice(roster.indexOf('function normalizeTeamPayload'), roster.indexOf('function saveTeamToStorage')), context);
  vm.runInContext(roster.slice(roster.indexOf('function buildPlayersDbEntry'), roster.indexOf('function isTemplatePlayerName')), context);
  vm.runInContext(management.slice(management.indexOf('function buildPlayersMergePlan'), management.indexOf('function updatePlayerPhotoInDbAndTeams')), context);
  vm.runInContext(management.slice(management.indexOf('function buildTeamMerge'), management.indexOf('function renderTeamMergeControls')), context);
  return { context, storage };
}
test('merge combines roster, remaps identities and both team scopes without changing historical scoring', async () => {
  const { context: c, storage } = setup();
  await c.commitTeamMerge('A', 'B', { [id(2)]: id(1) });
  assert.equal(storage.has('teams/B'), false);
  const team = JSON.parse(storage.get('teams/A'));
  assert.deepEqual(team.playersDetailed.map(p => p.id), [id(1), id(3)]);
  assert.equal(team.playersDetailed[0].number, '4');
  const match = JSON.parse(storage.get('matches/game'));
  assert.equal(match.state.match.teamName, 'A');
  assert.equal(match.state.events[0].playerId, id(1));
  assert.equal(match.state.events[0].note, 'B');
  assert.equal(match.state.events[0].code, '#');
  assert.equal(match.state.playersDetailed[0].number, '9');
  assert.equal(c.state.selectedOpponentTeam, 'A');
  assert.equal(c.state.events[0].playerId, id(1));
  assert.equal(c.state.playersDb[id(2)], undefined);
});
test('failed write restores archives and leaves live state untouched', async () => {
  const { context: c, storage } = setup();
  const before = [...storage];
  const stateBefore = JSON.stringify(c.state);
  c.failKey = 'players';
  await assert.rejects(() => c.commitTeamMerge('A', 'B', { [id(2)]: id(1) }), /annullata/);
  assert.deepEqual([...storage], before);
  assert.equal(JSON.stringify(c.state), stateBefore);
});
test('invalid and ambiguous choices fail before writing', async () => {
  const { context: c, storage } = setup();
  const before = [...storage];
  assert.throws(() => c.commitTeamMerge('A', 'A', {}), /diverse/);
  assert.throws(() => c.commitTeamMerge('A', 'B', {}), /stesso nome/);
  assert.throws(() => c.commitTeamMerge('A', 'B', { [id(2)]: id(88) }), /non valido/);
  assert.throws(() => c.commitTeamMerge('A', 'B', { [id(2)]: id(1), [id(3)]: id(1) }), /una sola/);
  assert.deepEqual([...storage], before);
});
test('manual identity pairing preserves historical roster snapshots and updates other teams', async () => {
  const { context: c, storage } = setup();
  const b = JSON.parse(storage.get('teams/B'));
  b.playersDetailed[0].firstName = 'Annamaria';
  storage.set('teams/B', JSON.stringify(b));
  storage.set('teams/C', JSON.stringify({ ...b, name: 'C' }));
  const match = JSON.parse(storage.get('matches/game'));
  match.state.savedTeams = { B: b };
  storage.set('matches/game', JSON.stringify(match));
  await c.commitTeamMerge('A', 'B', { [id(2)]: id(1) });
  const saved = JSON.parse(storage.get('matches/game'));
  assert.equal(saved.state.savedTeams.B, undefined);
  assert.equal(saved.state.savedTeams.A.playersDetailed[0].firstName, 'Annamaria');
  assert.equal(saved.state.savedTeams.A.playersDetailed[0].number, '9');
  assert.equal(saved.state.savedTeams.A.playersDetailed[0].id, id(1));
  assert.equal(JSON.parse(storage.get('teams/C')).playersDetailed[0].id, id(1));
});
test('merge persists unsaved current match events and uses rewritten snapshot', async () => {
  const { context: c, storage } = setup();
  c.state.selectedMatch = 'game';
  c.state.loadedMatchName = 'game';
  c.getCurrentMatchPayload = () => ({ state: { selectedTeam: 'B', events: [{ playerId: id(2), code: '+' }, { playerId: id(3), code: '#' }] } });
  c.buildCompactLocalStateSnapshot = next => ({ ...next, savedMatches: { game: c.getCurrentMatchPayload() } });
  await c.commitTeamMerge('A', 'B', { [id(2)]: id(1) });
  const saved = JSON.parse(storage.get('matches/game'));
  const snapshot = JSON.parse(storage.get('state'));
  assert.equal(saved.state.events.length, 2);
  assert.equal(saved.state.events[0].playerId, id(1));
  assert.equal(snapshot.savedMatches.game.state.selectedTeam, 'A');
  assert.equal(snapshot.savedMatches.game.state.events[0].playerId, id(1));
});
test('existing player merge uses the same identity and archive updates as team merge', async () => {
  const { context: c, storage } = setup();
  c.state.playersDb = {
    [id(1)]: { id: id(1), firstName: 'Anna', lastName: 'Rossi', name: 'Rossi Anna', photo: '' },
    [id(2)]: { id: id(2), firstName: 'Annamaria', lastName: 'Rossi', name: 'Rossi Annamaria', photo: 'portrait' }
  };
  assert.equal(await c.mergePlayersDbEntries(id(1), id(2)), true);
  assert.equal(c.state.playersDb[id(1)].photo, 'portrait');
  assert.equal(c.state.playersDb[id(1)].firstName, 'Anna');
  assert.equal(c.state.playersDb[id(2)], undefined);
  assert.equal(JSON.parse(storage.get('teams/B')).playersDetailed[0].id, id(1));
  assert.equal(JSON.parse(storage.get('matches/game')).state.events[0].playerId, id(1));
  assert.equal(c.state.events[0].playerId, id(1));
  assert.equal(c.state.selectedTeam, 'B');
  assert.equal(storage.has('teams/B'), true);
});
test('existing player merge also rolls back failed archive writes', async () => {
  const { context: c, storage } = setup();
  c.state.playersDb = { [id(1)]: player(1, 'Anna'), [id(2)]: player(2, 'Anna') };
  const before = [...storage];
  const stateBefore = JSON.stringify(c.state);
  c.failKey = 'players';
  assert.equal(await c.mergePlayersDbEntries(id(1), id(2)), false);
  assert.deepEqual([...storage], before);
  assert.equal(JSON.stringify(c.state), stateBefore);
});
test('both merge entry points delegate player identity work to the shared implementation', async () => {
  for (const teamMerge of [false, true]) {
    const { context: c } = setup();
    c.state.playersDb = { [id(1)]: player(1, 'Anna'), [id(2)]: player(2, 'Anna') };
    const shared = c.buildPlayersMergePlan;
    let calls = 0;
    c.buildPlayersMergePlan = (...args) => { calls++; return shared(...args); };
    if (teamMerge) await c.commitTeamMerge('A', 'B', { [id(2)]: id(1) });
    else assert.equal(await c.mergePlayersDbEntries(id(1), id(2)), true);
    assert.equal(calls, 1);
  }
});
