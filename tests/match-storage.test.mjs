import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function harness() {
  const ctx = { MATCH_PREFIX: 'match-', logError() {}, archiveStorage: {}, state: {} };
  vm.runInNewContext(readFileSync('js/roster/storage/match-repository.js', 'utf8'), ctx);
  return ctx;
}
test('archivio compatto conserva valori, campi assenti e oggetti indipendenti', () => {
  const ctx = harness();
  const payload = { state: { events: [{ a: null, b: false, c: 0, d: '', nested: { x: 1 } }, { nested: { x: 1 } }, {}] } };
  const decoded = ctx.decodeMatchStoragePayload(ctx.encodeMatchStoragePayload(payload));
  assert.deepEqual(JSON.parse(JSON.stringify(decoded)), payload);
  decoded.state.events[0].nested.x = 2;
  assert.equal(decoded.state.events[1].nested.x, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.decodeMatchStoragePayload(JSON.stringify(payload)))), payload);
});
test('spazio esaurito produce un errore esplicito per import senza modificare i salvataggi', () => {
  const ctx = harness();
  ctx.archiveStorage.setItem = () => { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; };
  assert.equal(ctx.saveMatchToStorage('test', { state: { events: [] } }), false);
  assert.throws(() => ctx.saveMatchToStorage('test', { state: { events: [] } }, { throwOnError: true }), /Spazio di archiviazione.*esaurito/);
});
