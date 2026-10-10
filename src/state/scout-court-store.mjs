export function createScoutCourtStore() {
  const empty = Object.freeze({
    hidden: false,
    cards: Object.freeze([]),
    bench: Object.freeze([]),
  });
  let snapshot = Object.freeze({ our: empty, opponent: empty });
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(scope, view) {
      snapshot = Object.freeze({ ...snapshot, [scope]: Object.freeze(view) });
      listeners.forEach((listener) => listener());
    },
  };
}
export const scoutCourtStore = createScoutCourtStore();
