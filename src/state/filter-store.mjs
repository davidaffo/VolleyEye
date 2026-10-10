const empty = Object.freeze({
  groups: Object.freeze([]),
  options: Object.freeze([]),
  selected: Object.freeze([]),
  value: "any",
  type: "checkbox",
});
let snapshot = Object.freeze({});
const listeners = new Set();
export const filterStore = {
  getSnapshot: () => snapshot,
  getView: (id) => snapshot[id] || empty,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  publish(id, view) {
    snapshot = Object.freeze({ ...snapshot, [id]: Object.freeze(view) });
    listeners.forEach((listener) => listener());
  },
  change(id, value, checked) {
    const view = filterStore.getView(id);
    filterStore.publish(id, {
      ...view,
      selected: Object.freeze(
        view.type === "radio"
          ? [value]
          : checked
            ? [...view.selected.filter((entry) => entry !== value), value]
            : view.selected.filter((entry) => entry !== value),
      ),
      value,
    });
  },
};
