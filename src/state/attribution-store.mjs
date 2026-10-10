export function createAttributionStore() {
  const empty = Object.freeze({
    open: false,
    players: Object.freeze([]),
    types: Object.freeze([]),
    selectedType: "Generic",
  });
  let snapshot = Object.freeze({ point: empty, error: empty });
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(kind, patch) {
      if (kind !== "point" && kind !== "error")
        throw new Error("Unknown attribution dialog: " + kind);
      snapshot = Object.freeze({
        ...snapshot,
        [kind]: Object.freeze({ ...snapshot[kind], ...patch }),
      });
      listeners.forEach((listener) => listener());
    },
  };
}
export const attributionStore = createAttributionStore();
