import { createKeyedViewStore } from './view-store.mjs';

export function createVideoEditStore() {
  const store = createKeyedViewStore({
    offset: { open: false, rows: [] },
    duration: { open: false, rows: [] },
    unify: { open: false, rows: [] },
  }, {}, { merge: true });
  return {
    ...store,
    change(kind, id, patch) {
      store.publish(kind, {
        rows: Object.freeze(store.getView(kind).rows.map((row) =>
          row.id === id ? Object.freeze({ ...row, ...patch }) : row)),
      });
    },
  };
}
export const videoEditStore = createVideoEditStore();
