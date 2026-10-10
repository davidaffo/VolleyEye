const empty = Object.freeze({
  rows: Object.freeze([]),
  headers: Object.freeze([]),
  selected: Object.freeze([]),
  empty: "",
  contextKey: "",
});
let snapshot = Object.freeze({});
const listeners = new Set();
export const eventTableStore = {
  getSnapshot: () => snapshot,
  getView: (id) => snapshot[id] || empty,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  publish(id, view) {
    snapshot = Object.freeze({ ...snapshot, [id]: Object.freeze(view) });
    listeners.forEach((listener) => listener());
  },
  select(keys) {
    const signature = JSON.stringify(keys);
    let changed = false;
    const next = { ...snapshot };
    for (const id in next)
      if (JSON.stringify(next[id].selected) !== signature) {
        next[id] = Object.freeze({
          ...next[id],
          selected: Object.freeze([...keys]),
        });
        changed = true;
      }
    if (changed) {
      snapshot = Object.freeze(next);
      listeners.forEach((listener) => listener());
    }
  },
};
