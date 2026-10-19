// Shared immutable snapshots and subscriptions for React's useSyncExternalStore.
export function createViewStore(initial) {
  let snapshot = Object.freeze(initial);
  const listeners = new Set();
  function replace(next) {
    if (Object.keys(next).length === Object.keys(snapshot).length &&
        Object.keys(next).every((key) => Object.is(next[key], snapshot[key]))) return;
    snapshot = Object.freeze(next);
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(patch) { replace({ ...snapshot, ...patch }); },
    replace,
  };
}

// Tables replace complete views; dialogs merge patches into their existing view.
export function createKeyedViewStore(initial = {}, fallback = {}, { merge = false } = {}) {
  const store = createViewStore(Object.fromEntries(
    Object.entries(initial).map(([key, view]) => [key, Object.freeze(view)]),
  ));
  const empty = Object.freeze(fallback);
  return {
    replace: store.replace,
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    getView: (key) => store.getSnapshot()[key] || empty,
    publish(key, view) {
      const previous = store.getSnapshot()[key];
      store.publish({ [key]: Object.freeze(merge ? { ...previous, ...view } : view) });
    },
  };
}
