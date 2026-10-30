import test from 'node:test';
import assert from 'node:assert/strict';
import { session as match } from '../js/globals.js';
import { session as roster } from '../src/features/state/roster-lineup.js';
import { session as storage } from '../src/features/state/storage-persistent-storage.js';
import { replaceTeamPlayerNameReferences, replacePlayerNameInLineup, renameTeamPlayerAcrossCurrentMatchById,
  getLiveRosterChange, applyLiveRosterNames, getRemovedLiveTeamPlayers } from '../src/features/teams/player-reference-model.js';

const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const fields = {
  our: { players: 'players', court: 'court', liberos: 'liberos', captains: 'captains', numbers: 'playerNumbers', map: 'liberoAutoMap', base: 'autoRoleBaseCourt' },
  opponent: { players: 'opponentPlayers', court: 'opponentCourt', liberos: 'opponentLiberos', captains: 'opponentCaptains', numbers: 'opponentPlayerNumbers', map: 'opponentLiberoAutoMap', base: 'opponentAutoRoleBaseCourt' },
};
function isolated(action) {
  const previous = match.state, ownBase = roster.autoRoleBaseCourt, oppBase = roster.opponentAutoRoleBaseCourt, archive = storage.archiveStorage;
  try {
    storage.archiveStorage = { getItem: () => JSON.stringify({ version: 3, playersDetailed: [
      { id, name: 'Ada', lastName: 'Ada', number: '0', out: false },
      { id: otherId, name: 'Bea', lastName: 'Bea', out: false },
    ] }) };
    match.state = { match: { teamName: 'Home', opponent: 'Away' }, selectedTeam: 'Home', selectedOpponentTeam: 'Away', events: [],
      players: ['Ada', 'Bea'], opponentPlayers: ['Ada', 'Bea'], playerNumbers: { Ada: 0 }, opponentPlayerNumbers: { Ada: 0 },
      court: Array.from({ length: 6 }, () => ({ main: 'Ada', replaced: 'Ada' })), opponentCourt: Array.from({ length: 6 }, () => ({ main: 'Ada', replaced: 'Ada' })),
      liberos: ['Ada'], opponentLiberos: ['Ada'], captains: ['Ada'], opponentCaptains: ['Ada'],
      liberoAutoMap: { Ada: 'Bea', Bea: 'Ada' }, opponentLiberoAutoMap: { Ada: 'Bea', Bea: 'Ada' },
      autoRoleBaseCourt: [{ main: 'Ada', replaced: 'Bea' }], opponentAutoRoleBaseCourt: [{ main: 'Ada', replaced: 'Bea' }],
      setStarts: { 1: { our: { court: [{ main: 'Ada', replaced: 'Ada' }] }, opponent: { court: [{ main: 'Ada', replaced: 'Ada' }] } }, 2: null },
    };
    roster.autoRoleBaseCourt = [{ main: 'Ada', replaced: 'Bea' }];
    roster.opponentAutoRoleBaseCourt = [{ main: 'Ada', replaced: 'Bea' }];
    action();
  } finally {
    match.state = previous;
    roster.autoRoleBaseCourt = ownBase;
    roster.opponentAutoRoleBaseCourt = oppBase;
    storage.archiveStorage = archive;
  }
}

for (const scope of ['our', 'opponent']) {
  test(`rename references isolates namesakes, indices, substitutions and set starts: ${scope}`, () => isolated(() => {
    const own = fields[scope], otherScope = scope === 'our' ? 'opponent' : 'our', other = fields[otherScope];
    const before = Object.fromEntries(Object.values(other).map(key => [key, structuredClone(match.state[key])]));
    match.state.events = [
      { team: scope, playerName: 'Ada', playerIdx: 0, playerIn: 'Ada', playerOut: 'Ada', marker: 9 },
      { team: scope, playerName: 'Old indexed name', playerIdx: 0 },
      { team: scope, playerName: 'Stale ID name', playerIdx: 7, playerId: id },
      { team: otherScope, playerName: 'Ada', playerIdx: 0, playerId: id, playerIn: 'Ada', playerOut: 'Ada' },
    ];
    const otherEvent = structuredClone(match.state.events[3]);
    replaceTeamPlayerNameReferences(scope, 'Ada', 'New name', 0, id);
    assert.deepEqual(match.state[own.court][0], { main: 'New name', replaced: 'New name' });
    assert.deepEqual(match.state[own.liberos], ['New name']);
    assert.deepEqual(match.state[own.captains], ['New name']);
    assert.deepEqual(match.state[own.map], { 'New name': 'Bea', Bea: 'New name' });
    assert.equal(match.state.events[0].playerIn, 'New name');
    assert.equal(match.state.events[0].playerOut, 'New name');
    assert.equal(match.state.events[0].marker, 9);
    assert.equal(match.state.events[1].playerName, 'New name');
    assert.equal(match.state.events[2].playerName, scope === 'opponent' ? 'New name' : 'Stale ID name');
    assert.deepEqual(match.state.events[3], otherEvent);
    assert.deepEqual(match.state.setStarts[1][scope].court, [{ main: 'New name', replaced: 'New name' }]);
    assert.deepEqual(match.state.setStarts[1][otherScope].court, [{ main: 'Ada', replaced: 'Ada' }]);
    for (const [key, value] of Object.entries(before)) assert.deepEqual(match.state[key], value);
  }));

  test(`ID rename preserves zero number and updates only the matching base courts: ${scope}`, () => isolated(() => {
    const own = fields[scope], otherScope = scope === 'our' ? 'opponent' : 'our', other = fields[otherScope];
    const otherBase = match.state[other.base], otherRuntimeBase = roster[other.base];
    match.state.pendingServe = { scope, playerId: id, playerName: 'Ada' };
    assert.equal(renameTeamPlayerAcrossCurrentMatchById(scope, id, '  Renamed  ', 'Wrong hint'), true);
    assert.equal(match.state[own.players][0], 'Renamed');
    assert.equal(match.state[own.numbers].Renamed, 0);
    assert.equal(Object.hasOwn(match.state[own.numbers], 'Ada'), false);
    assert.deepEqual(match.state[own.base], [{ main: 'Renamed', replaced: 'Bea' }]);
    assert.deepEqual(roster[own.base], [{ main: 'Renamed', replaced: 'Bea' }]);
    assert.equal(match.state[other.base], otherBase);
    assert.equal(roster[other.base], otherRuntimeBase);
    assert.equal(match.state.pendingServe.playerName, scope === 'our' ? 'Renamed' : 'Ada');
    const after = structuredClone(match.state);
    assert.equal(renameTeamPlayerAcrossCurrentMatchById(scope, id, '  '), false);
    assert.equal(renameTeamPlayerAcrossCurrentMatchById(scope, id, 'Renamed', 'Renamed'), false);
    assert.equal(renameTeamPlayerAcrossCurrentMatchById(scope, 'unknown', 'Missing', 'Absent'), false);
    assert.deepEqual(match.state, after);
  }));
}

test('absent libero maps retain the existing own/opponent semantics and legacy events belong to our team', () => isolated(() => {
  delete match.state.liberoAutoMap;
  delete match.state.opponentLiberoAutoMap;
  match.state.events = [, { playerName: 'Ada', playerIdx: 0 }];
  replaceTeamPlayerNameReferences('opponent', 'Ada', 'Opponent', 0);
  assert.deepEqual(match.state.opponentLiberoAutoMap, {});
  assert.equal(match.state.events[1].playerName, 'Ada');
  replaceTeamPlayerNameReferences('our', 'Ada', 'Home', 0);
  assert.equal(Object.hasOwn(match.state, 'liberoAutoMap'), false);
  assert.equal(match.state.events[1].playerName, 'Home');
  assert.equal(Object.hasOwn(match.state.events, 0), false);
}));

test('roster reconciliation follows stable IDs without reordering current indices and appends additions', () => {
  const current = { playersDetailed: [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Bea' }, { id: 'out', name: 'Out', out: true }] };
  const next = { playersDetailed: [{ id: 'b', name: 'New Bea' }, { id: 'a', name: 'New Ada' }, { id: 'c', name: 'Cara' }] };
  const change = getLiveRosterChange(current, next), calls = [];
  assert.deepEqual(change.removed, []);
  assert.deepEqual(applyLiveRosterNames(change, (...args) => calls.push(args)), ['New Ada', 'New Bea', 'Cara']);
  assert.deepEqual(calls, [['a', 'New Ada', 'Ada'], ['b', 'New Bea', 'Bea']]);
  assert.deepEqual(getRemovedLiveTeamPlayers({ playersDetailed: [{ id: 'b', name: 'Bea' }] }, 'opponent', current), [{ id: 'a', name: 'Ada' }]);
});

test('roster reconciliation retains index fallback when IDs do not overlap', () => {
  const current = { playersDetailed: [{ name: 'Ada' }, { name: 'Bea' }] };
  const next = { playersDetailed: [{ id: 'new', name: 'New Ada' }] };
  const change = getLiveRosterChange(current, next), calls = [];
  assert.deepEqual(change.removed, [{ name: 'Bea' }]);
  assert.deepEqual(applyLiveRosterNames(change, (...args) => calls.push(args)), ['New Ada', 'Bea']);
  assert.deepEqual(calls, [[undefined, 'New Ada', 'Ada']]);
});

test('lineup reference replacement preserves absent lineups and normalizes missing slots', () => {
  assert.equal(replacePlayerNameInLineup(null, 'Ada', 'New'), null);
  const lineup = [{ main: 'Ada', replaced: 'Ada', ignored: true }, null];
  assert.deepEqual(replacePlayerNameInLineup(lineup, 'Ada', 'New'), [{ main: 'New', replaced: 'New' }, { main: '', replaced: '' }]);
  assert.equal(lineup[0].main, 'Ada');
});
