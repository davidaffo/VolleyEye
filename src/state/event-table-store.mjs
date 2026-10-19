import { createViewStore, createKeyedViewStore } from './view-store.mjs';
export const eventLogSummaryStore = createViewStore({ text: 'Nessun evento' });
const empty = Object.freeze({
  rows: Object.freeze([]),
  headers: Object.freeze([]),
  selected: Object.freeze([]),
  empty: "",
  contextKey: "",
});
const store = createKeyedViewStore({}, empty);
export const eventTableStore = {
  ...store,
  select(keys) {
    const signature = JSON.stringify(keys);
    let changed = false;
    const next = { ...store.getSnapshot() };
    for (const id in next)
      if (JSON.stringify(next[id].selected) !== signature) {
        next[id] = Object.freeze({
          ...next[id],
          selected: Object.freeze([...keys]),
        });
        changed = true;
      }
    if (changed) {
      store.replace(next);
    }
  },
};
