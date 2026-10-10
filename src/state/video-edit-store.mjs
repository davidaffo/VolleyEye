export function createVideoEditStore() {
  let snapshot = Object.freeze({
    offset: Object.freeze({ open: false, rows: [] }),
    duration: Object.freeze({ open: false, rows: [] }),
    unify: Object.freeze({ open: false, rows: [] }),
  });
  const listeners = new Set();
  const store = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(kind, patch) {
      snapshot = Object.freeze({
        ...snapshot,
        [kind]: Object.freeze({ ...snapshot[kind], ...patch }),
      });
      listeners.forEach((listener) => listener());
    },
    change(kind, id, patch) {
      store.publish(kind, {
        rows: Object.freeze(
          snapshot[kind].rows.map((row) =>
            row.id === id ? Object.freeze({ ...row, ...patch }) : row,
          ),
        ),
      });
    },
  };
  return store;
}
export const videoEditStore = createVideoEditStore();
