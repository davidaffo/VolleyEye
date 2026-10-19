import { createKeyedViewStore } from './view-store.mjs';

export function createAttributionStore() {
  const empty = {
    open: false, players: Object.freeze([]), types: Object.freeze([]), selectedType: 'Generic',
  };
  const store = createKeyedViewStore({ point: empty, error: empty }, {}, { merge: true });
  return {
    ...store,
    publish(kind, patch) {
      if (kind !== 'point' && kind !== 'error') throw new Error('Unknown attribution dialog: ' + kind);
      store.publish(kind, patch);
    },
  };
}
export const attributionStore = createAttributionStore();
