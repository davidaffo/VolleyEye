import { createViewStore } from "./view-store.mjs";

export function createLineupStore() {
  return createViewStore({
    open: false,
    scope: "our",
    context: "match",
    numberMode: false,
    selectedName: "",
    court: Object.freeze([]),
    bench: Object.freeze([]),
    liberos: Object.freeze([]),
    preferredLibero: "",
  });
}
export const lineupStore = createLineupStore();
