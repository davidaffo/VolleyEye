import test from 'node:test';
import assert from 'node:assert/strict';
import { getRoleAtCourt, getHistoricalEventRole, inferPlayerRole } from '../src/features/events/player-role.js';
import { encodeMatchStoragePayload, decodeMatchStoragePayload } from '../src/features/storage/match-codec.js';

const court = ['Anna', 'Bea', 'Cora', 'Dina', 'Eva', 'Fede'];
const ev = (playerName, role, extra = {}) => ({ skillId: 'attack', playerName, playerRole: role, ...extra });

test('roles use actual positions, rotation and libero, without assigning a role to a player off court', () => {
  assert.equal(getRoleAtCourt('Anna', court, 1), 'P');
  assert.equal(getRoleAtCourt('Bea', court, 1), 'S1');
  assert.equal(getRoleAtCourt('Bea', court, 2), 'P');
  assert.equal(getRoleAtCourt('Bea', court, 2, ['Bea']), 'L');
  assert.equal(getRoleAtCourt('Panchina', court.map(main => ({ main, replaced: 'Panchina' })), 1), null);
  assert.equal(getRoleAtCourt('Anna', court, null), null);
});

test('old actions use historical court snapshots and do not guess from tactical attack zone', () => {
  assert.equal(getHistoricalEventRole({ playerName: 'Bea', team: 'our', rotation: 1, courtPlayers: { our: court } }), 'S1');
  assert.equal(getHistoricalEventRole({ playerName: 'Bea', team: 'our', rotation: 1, zone: 2 }), null);
  assert.equal(getHistoricalEventRole({ playerName: 'Bea', rotation: 1, courtPlayers: { our: court.slice(0, 5) } }), null);
  assert.equal(getHistoricalEventRole({ playerName: 'Bea', playerRole: 'O', rotation: 1, courtPlayers: { our: court } }), 'O');
});

test('prevalent role groups paired positions, excludes manual events and reports ties without guessing', () => {
  const events = [ev('Bea', 'S1'), ev('Bea', 'S2'), ev('Bea', 'O'), { skillId: 'manual', playerRole: 'O' }];
  assert.deepEqual(inferPlayerRole(events), { role: 'S', counts: { S: 2, O: 1 } });
  assert.equal(inferPlayerRole([ev('Bea', 'S1'), ev('Bea', 'O')]).role, null);
  assert.deepEqual(inferPlayerRole([ev('Bea', null)]), { role: null, counts: {} });
});

test('role snapshots survive match storage and are independent of subsequent lineup changes', () => {
  const original = { state: { events: [ev('Bea', getRoleAtCourt('Bea', court, 1))] } };
  const restored = decodeMatchStoragePayload(encodeMatchStoragePayload(original));
  assert.equal(restored.state.events[0].playerRole, 'S1');
  assert.equal(getRoleAtCourt('Bea', court, 2), 'P');
  assert.equal(getHistoricalEventRole(restored.state.events[0]), 'S1');
});
