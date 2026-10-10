export function createNextSetStore() {
  let snapshot = Object.freeze({
    open: false,
    setNum: 1,
    double: false,
    swapCourt: false,
    isServing: false,
    teams: Object.freeze({}),
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
export const nextSetStore = createNextSetStore();
