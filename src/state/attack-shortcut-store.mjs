import { createViewStore } from "./view-store.mjs";

export function createAttackShortcutStore() {
  return createViewStore({
    base: false,
    setter: false,
    type: false,
    block: false,
    setters: Object.freeze([]),
  });
}
export const attackShortcutStore = createAttackShortcutStore();
