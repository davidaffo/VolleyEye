import { createKeyedViewStore } from './view-store.mjs';

export function createScoutCourtStore() {
  const empty = { hidden: false, cards: Object.freeze([]), bench: Object.freeze([]) };
  return createKeyedViewStore({ our: empty, opponent: empty });
}
export const scoutCourtStore = createScoutCourtStore();
