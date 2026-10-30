import { filterStore } from "../../state/filter-store.mjs";
import { getTeamNameForScope } from "../teams/selectors.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
// Commands keep publishers independent of the controllers that handle the gesture.
function filterInteraction(id, handler) {
  if (handler && typeof handler === "object") {
    return { changeAction: handler, onChange: null };
  }
  return {
    changeAction: null,
    onChange: (value, checked, event) => {
      filterStore.change(id, value, checked);
      if (typeof handler === "function") handler(event);
    },
  };
}

export function publishReactFilter(
  id,
  options,
  selectedSet,
  config = {},
) {
  const type = config.type || "checkbox",
    selected = Object.freeze([...selectedSet].map(String));
  filterStore.publish(id, {
    type,
    visible: filterStore.getView(id).visible,
    name: config.name,
    groups: Object.freeze([]),
    options: Object.freeze(
      options.map((option) => Object.freeze({ ...option })),
    ),
    selected,
    value: selected[0] || null,
    ...filterInteraction(id, config.changeAction || config.onChange),
  });
}

export function publishReactSplitFilter(
  id,
  groups,
  selectedSet,
  onChange,
) {
  filterStore.publish(id, {
    type: "checkbox",
    visible: filterStore.getView(id).visible,
    options: Object.freeze([]),
    groups: Object.freeze(
      groups.map((group) =>
        Object.freeze({
          id: `${id}-${group.scope}`,
          label: getTeamNameForScope(group.scope),
          options: Object.freeze(
            group.options.map((option) => Object.freeze({ ...option })),
          ),
        }),
      ),
    ),
    selected: Object.freeze([...selectedSet].map(String)),
    ...filterInteraction(id, onChange),
  });
}

export function readReactFilterValues(id, asNumber = false) {
  const view = filterStore.getView(id),
    options = view.groups.length
      ? view.groups.flatMap((group) => group.options)
      : view.options;
  return options
    .filter((option) => view.selected.includes(String(option.value)))
    .map((option) => (asNumber ? Number(option.value) : String(option.value)));
}

export function readReactFilterSelect(id) {
  return filterStore.getView(id).value;
}

export function publishReactPreviousSkill(id, value, onChange) {
  filterStore.publish(id, {
    type: "select",
    visible: filterStore.getView(id).visible,
    groups: Object.freeze([]),
    selected: Object.freeze([]),
    value: value || "any",
    options: Object.freeze(
      liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.map((option) =>
        Object.freeze({ ...option }),
      ),
    ),
    ...filterInteraction(id, onChange),
  });
}

export function toggleFilterVisibility(id, visible) {
  if (!id) return;
  filterStore.publish(id, { ...filterStore.getView(id), visible });
}

export function renderDynamicFilter(
  id,
  options,
  selectedSet,
  config = {},
) {
  const shouldShow = Array.isArray(options) && options.length > 0;
  if (!shouldShow) selectedSet.clear();
  publishReactFilter(id, shouldShow ? options : [], selectedSet, config);
  toggleFilterVisibility(id, shouldShow);
  return shouldShow;
}

export function getCheckedValues(id, { asNumber = false } = {}) {
  if (!id) return [];

  return readReactFilterValues(id, asNumber);
}

export function getCheckedRadioValue(id) {
  if (!id) return null;

  return readReactFilterSelect(id);
}

export function renderAnalysisCourtSideRadios(
  id,
  selectedValue,
  onChange,
  groupName,
) {
  if (!id) return;
  const name = groupName || id;
  const options = [
    { value: "near", label: "Vicino" },
    { value: "far", label: "Lontano" },
  ];

  publishReactFilter(id, options, new Set([selectedValue]), {
    type: "radio",
    name,
    onChange,
  });
  return;
}
