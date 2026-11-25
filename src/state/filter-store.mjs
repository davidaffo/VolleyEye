import { createKeyedViewStore } from './view-store.mjs';

const empty = Object.freeze({
  groups: Object.freeze([]),
  options: Object.freeze([]),
  selected: Object.freeze([]),
  excluded: Object.freeze([]),
  value: "any",
  type: "checkbox",
});
const store = createKeyedViewStore({}, empty);
export const filterStore = {
  ...store,
  change(id, value, checked) {
    const view = filterStore.getView(id);
    const excluded = view.excluded || [];
    if (view.triState && view.type === 'checkbox') {
      const included = view.selected.includes(value), isExcluded = excluded.includes(value);
      filterStore.publish(id, { ...view,
        selected: Object.freeze(included || isExcluded ? view.selected.filter(entry => entry !== value) : [...view.selected, value]),
        excluded: Object.freeze(included ? [...excluded, value] : excluded.filter(entry => entry !== value)),
        value,
      });
      return;
    }
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
      excluded: Object.freeze([]),
    });
  },
};
