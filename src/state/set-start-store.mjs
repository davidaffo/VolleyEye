import { createViewStore } from "./view-store.mjs";

export function createSetStartStore() {
  return createViewStore({
    open: false,
    title: "Formazione di partenza",
    rows: Object.freeze([]),
  });
}
export const setStartStore = createSetStartStore();
