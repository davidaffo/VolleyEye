export function createLineupStore() {
  let snapshot = Object.freeze({
    open: false,
    scope: "our",
    context: "match",
    numberMode: false,
    selectedName: "",
    court: Object.freeze([]),
    bench: Object.freeze([]),
    liberos: Object.freeze([]),
    preferredLibero: "",
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
export const lineupStore = createLineupStore();
