export function createSetStartStore() {
  let snapshot = Object.freeze({
    open: false,
    title: "Formazione di partenza",
    rows: Object.freeze([]),
  });
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(patch) {
      snapshot = Object.freeze({ ...snapshot, ...patch });
      listeners.forEach((listener) => listener());
    },
  };
}
export const setStartStore = createSetStartStore();
