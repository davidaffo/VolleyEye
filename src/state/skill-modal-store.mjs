export function createSkillModalStore() {
  let snapshot = Object.freeze({
    open: false,
    cancelVisible: false,
    courtModal: false,
    title: "",
    choices: null,
    controls: null,
    onBack: null,
  });
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(patch) {
      snapshot = Object.freeze({ ...snapshot, ...patch });
      listeners.forEach((listener) => listener());
    },
  };
}
export const skillModalStore = createSkillModalStore();
