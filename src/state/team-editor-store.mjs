import { createViewStore } from './view-store.mjs';

export function createTeamEditorStore() {
  const base = createViewStore({
    open: false,
    isNew: false,
    title: "Gestione squadra",
    meta: Object.freeze({
      name: "",
      headCoach: "",
      assistantCoach: "",
      manager: "",
    }),
    players: Object.freeze([]),
    court: Object.freeze([]),
    bench: Object.freeze([]),
    liberos: Object.freeze([]),
    rotation: 1,
    preferredLibero: "",
    liveEdit: false,
  });
  return {
    ...base,
    updateMetadata(field, value) {
      if (
        !Object.hasOwn(base.getSnapshot().meta, field) ||
        (field === "name" && !base.getSnapshot().isNew)
      )
        return;
      this.publish({
        meta: Object.freeze({ ...base.getSnapshot().meta, [field]: value }),
      });
    },
  };
}
export const teamEditorStore = createTeamEditorStore();
