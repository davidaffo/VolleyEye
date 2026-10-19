import { createKeyedViewStore } from './view-store.mjs';

const empty = Object.freeze({
  groups: Object.freeze([]),
  options: Object.freeze([]),
  selected: Object.freeze([]),
  value: "any",
  type: "checkbox",
});
const store = createKeyedViewStore({}, empty);
export const filterStore = {
  ...store,
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
