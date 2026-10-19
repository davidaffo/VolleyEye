import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
function harness() {
  const timeouts = new Map(),
    intervals = new Map(),
    listeners = new Map(),
    counts = { pause: 0, destroy: 0, disconnect: 0, snapshots: 0, revoked: [] };
  let serial = 0;
  const target = {
    addEventListener: (type, fn) => listeners.set(fn, type),
    removeEventListener: (type, fn) => listeners.delete(fn),
  };
  const media = { pause: () => counts.pause++ },
    player = { destroy: () => counts.destroy++ };
  const context = vm.createContext({
    setTimeout: (fn) => {
      const id = ++serial;
      timeouts.set(id, fn);
      return id;
    },
    clearTimeout: (id) => timeouts.delete(id),
    setInterval: (fn) => {
      const id = ++serial;
      intervals.set(id, fn);
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
    ready: true, startup: Promise.resolve(),
    stopViewPublications: () => {},
    finishScoutWidgetDrag: () => {},
    updateVideoPlaybackSnapshot: () => counts.snapshots++,
    scoutGridResizeObserver: { disconnect: () => counts.disconnect++ },
    elAnalysisVideo: media,
    elAnalysisVideoScout: media,
    ytPlayer: player,
    ytPlayerScout: player,
    videoObjectUrl: "blob:local",
    URL: { revokeObjectURL: (url) => counts.revoked.push(url) },
    target,
  });
  vm.runInContext(
    readFileSync("src/app/browser-effects.js", "utf8") + readFileSync("src/app/dispose.js", "utf8"),
    context,
  );
  return { context, timeouts, intervals, listeners, counts };
}
test("smontare il runtime rimuove effetti globali, conserva il tempo video e libera i player", () => {
  const { context, timeouts, intervals, listeners, counts } = harness();
  vm.runInContext(
    'listenRuntime(target, "resize", () => {}); setTimeout(() => {}, 100); setInterval(() => {}, 100); stop(); stop();',
    context,
  );
  assert.equal(listeners.size, 0);
  assert.equal(timeouts.size, 0);
  assert.equal(intervals.size, 0);
  assert.deepEqual(counts, {
    pause: 2,
    destroy: 2,
    disconnect: 1,
    snapshots: 1,
    revoked: ["blob:local"],
  });
});
test("un callback già accodato non modifica più il runtime smontato", () => {
  const { context, timeouts, intervals, listeners } = harness();
  vm.runInContext(
    "let mutations = 0; setTimeout(() => mutations++, 100);",
    context,
  );
  const callback = [...timeouts.values()][0];
  context.stop();
  callback();
  assert.equal(vm.runInContext("mutations", context), 0);
  vm.runInContext(
    'setTimeout(() => mutations++, 100); setInterval(() => {}, 100); listenRuntime(target, "resize", () => {});',
    context,
  );
  assert.equal(timeouts.size + intervals.size + listeners.size, 0);
});

test("le sessioni di trascinamento rilasciano i listener senza accumularli", () => {
  const { context, listeners } = harness();
  vm.runInContext(
    'const handler = () => {}; listenRuntime(target, "pointermove", handler); listenRuntime(target, "pointermove", handler); unlistenRuntime(target, "pointermove", handler);',
    context,
  );
  assert.equal(listeners.size, 0);
  assert.equal(vm.runInContext("runtimeEffectListeners.length", context), 0);
});

test('riavviare dopo lo smontaggio ripristina gli effetti e ignora un bootstrap precedente ancora pendente', async () => {
  const { context } = harness();
  const source = readFileSync('src/app/application.js', 'utf8');
  const { sourceFunctions } = await import('./helpers/source-functions.mjs');
  const pending = [];
  context.init = () => new Promise(resolve => pending.push(resolve));
  context.observeDomainChanges = () => {};
  let publications = 0;
  context.publishApplicationViews = () => publications++;
  context.startup = undefined;
  vm.runInContext(sourceFunctions(source, ['start']), context);
  const first = context.start();
  assert.equal(context.start(), first);
  context.stop();
  assert.equal(context.ready, false);
  const second = context.start();
  assert.notEqual(second, first);
  assert.equal(vm.runInContext('runtimeDisposed', context), false);
  pending[0]();
  await first;
  assert.equal(context.ready, false);
  assert.equal(publications, 0);
  pending[1]();
  await second;
  assert.equal(context.ready, true);
  assert.equal(publications, 1);
});
