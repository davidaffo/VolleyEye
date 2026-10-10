import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeStore } from '../src/state/runtime-store.mjs';

test('React receives immutable stable snapshots and unsubscribe releases listeners', () => {
  let notifications = 0;
  const unsubscribe = runtimeStore.subscribe(() => notifications++);
  runtimeStore.publish({ ready: true, substitutionsOur: 8 });
  const initial = runtimeStore.getSnapshot();
  assert.ok(Object.isFrozen(initial));
  runtimeStore.publish({ ready: true, substitutionsOur: 8 });
  assert.equal(runtimeStore.getSnapshot(), initial);
  assert.equal(notifications, 1);
  runtimeStore.publish({ ready: true, substitutionsOur: 7 });
  assert.equal(initial.substitutionsOur, 8);
  assert.equal(notifications, 2);
  unsubscribe();
  runtimeStore.publish({ ready: true, substitutionsOur: 6 });
  assert.equal(notifications, 2);
});
