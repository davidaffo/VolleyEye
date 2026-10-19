import { createViewStore } from "./view-store.mjs";

export function createSkillModalStore() {
  return createViewStore({
    open: false,
    cancelVisible: false,
    courtModal: false,
    title: "",
    choices: null,
    controls: null,
    onBack: null,
  });
}
export const skillModalStore = createSkillModalStore();
