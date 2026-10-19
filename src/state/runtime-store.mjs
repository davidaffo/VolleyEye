import { createViewStore } from './view-store.mjs';

const store = createViewStore({ ready: false });
// Runtime snapshots replace all fields; feature stores publish partial updates.
export const runtimeStore = { ...store, publish: store.replace };
