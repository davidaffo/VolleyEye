import { createViewStore } from "./view-store.mjs";
export const matchNotesStore = createViewStore({
  notes: [],
  unresolved: 0,
  matchKey: "",
});
