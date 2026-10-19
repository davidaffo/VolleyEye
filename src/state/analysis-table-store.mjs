import { createKeyedViewStore } from './view-store.mjs';

const empty = Object.freeze({
  rows: Object.freeze([]),
  cards: Object.freeze([]),
  legend: Object.freeze([]),
  footerRows: Object.freeze([]),
  emptyText: '',
});
const store = createKeyedViewStore({}, empty);
export const analysisTableStore = {
  ...store,
  publish(id, view) { store.publish(id, { ...empty, ...view }); },
};
