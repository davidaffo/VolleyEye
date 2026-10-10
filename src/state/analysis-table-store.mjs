let snapshot = Object.freeze({});
const listeners = new Set();
const empty = Object.freeze({
  rows: Object.freeze([]),
  cards: Object.freeze([]),
  legend: Object.freeze([]),
  footerRows: Object.freeze([]),
  emptyText: "",
});
export const analysisTableStore = {
  getSnapshot: () => snapshot,
  getView: (id) => snapshot[id] || empty,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  publish(id, view) {
    snapshot = Object.freeze({
      ...snapshot,
      [id]: Object.freeze({ ...empty, ...view }),
    });
    listeners.forEach((listener) => listener());
  },
};
