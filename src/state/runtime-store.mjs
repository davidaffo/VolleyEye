// Immutable view snapshots keep React synchronized without copying the event archive.
const listeners = new Set();
let snapshot = Object.freeze({ ready: false });

export const runtimeStore = {
  getSnapshot: () => snapshot,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  publish(next) {
    if (
      Object.keys(next).length === Object.keys(snapshot).length &&
      Object.keys(next).every((key) => Object.is(next[key], snapshot[key]))
    )
      return;
    snapshot = Object.freeze({ ...next });
    listeners.forEach((listener) => listener());
  },
};
