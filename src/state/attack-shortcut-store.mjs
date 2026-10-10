export function createAttackShortcutStore() {
  let snapshot = Object.freeze({
    base: false,
    setter: false,
    type: false,
    block: false,
    setters: Object.freeze([]),
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
export const attackShortcutStore = createAttackShortcutStore();
