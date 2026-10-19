import { createViewStore } from './view-store.mjs';

export function createPlayersDbStore() {
  const base = createViewStore({
    open: false,
    entries: Object.freeze([]),
    options: Object.freeze([]),
    countLabel: "",
    primaryId: "",
    secondaryId: "",
  });
  const store = {
    ...base,
    select(field, id) {
      if (
        !["primaryId", "secondaryId"].includes(field) ||
        (id && !base.getSnapshot().options.some((option) => option.id === id))
      )
        return;
      store.publish({ [field]: id });
    },
  };
  return store;
}
export const playersDbStore = createPlayersDbStore();
