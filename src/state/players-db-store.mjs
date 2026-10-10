export function createPlayersDbStore() {
  let snapshot = Object.freeze({
    open: false,
    entries: Object.freeze([]),
    options: Object.freeze([]),
    countLabel: "",
    primaryId: "",
    secondaryId: "",
  });
  const listeners = new Set();
  const store = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(patch) {
      snapshot = Object.freeze({ ...snapshot, ...patch });
      listeners.forEach((listener) => listener());
    },
    select(field, id) {
      if (
        !["primaryId", "secondaryId"].includes(field) ||
        (id && !snapshot.options.some((option) => option.id === id))
      )
        return;
      store.publish({ [field]: id });
    },
  };
  return store;
}
export const playersDbStore = createPlayersDbStore();
