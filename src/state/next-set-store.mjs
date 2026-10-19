import { createViewStore } from "./view-store.mjs";

export function createNextSetStore() {
  return createViewStore({
    open: false,
    setNum: 1,
    double: false,
    swapCourt: false,
    isServing: false,
    teams: Object.freeze({}),
  });
}
export const nextSetStore = createNextSetStore();
