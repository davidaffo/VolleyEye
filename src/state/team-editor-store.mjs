export function createTeamEditorStore() {
  let snapshot = Object.freeze({
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
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateMetadata(field, value) {
      if (
        !Object.hasOwn(snapshot.meta, field) ||
        (field === "name" && !snapshot.isNew)
      )
        return;
      this.publish({
        meta: Object.freeze({ ...snapshot.meta, [field]: value }),
      });
    },
    publish(patch) {
      snapshot = Object.freeze({ ...snapshot, ...patch });
      listeners.forEach((listener) => listener());
    },
  };
}
export const teamEditorStore = createTeamEditorStore();
