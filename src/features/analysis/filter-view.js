import { filterStore } from "../../state/filter-store.mjs";
import { getTeamNameForScope } from "../teams/selectors.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
export function publishReactFilter(
  container,
  options,
  selectedSet,
  config = {},
) {
  const id = container.id,
    type = config.type || "checkbox",
    selected = Object.freeze([...selectedSet].map(String));
  filterStore.publish(id, {
    type,
    name: config.name,
    groups: Object.freeze([]),
    options: Object.freeze(
      options.map((option) => Object.freeze({ ...option })),
    ),
    selected,
    value: selected[0] || null,
    onChange: (value, checked, event) => {
      filterStore.change(id, value, checked);
      const callback = config.onChange;
      if (typeof callback === "function") callback(event);
    },
  });
}

export function publishReactSplitFilter(
  container,
  groups,
  selectedSet,
  onChange,
) {
  const id = container.id;
  filterStore.publish(id, {
    type: "checkbox",
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
    onChange: (value, checked, event) => {
      filterStore.change(id, value, checked);
      onChange(event);
    },
  });
}

export function readReactFilterValues(container, asNumber = false) {
  const view = filterStore.getView(container.id),
    options = view.groups.length
      ? view.groups.flatMap((group) => group.options)
      : view.options;
  return options
    .filter((option) => view.selected.includes(String(option.value)))
    .map((option) => (asNumber ? Number(option.value) : String(option.value)));
}

export function readReactFilterSelect(container) {
  return filterStore.getView(container.id).value;
}

export function publishReactPreviousSkill(container, value, onChange) {
  const id = container.id;
  filterStore.publish(id, {
    type: "select",
    groups: Object.freeze([]),
    selected: Object.freeze([]),
    value: value || "any",
    options: Object.freeze(
      liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.map((option) =>
        Object.freeze({ ...option }),
      ),
    ),
    onChange: (value, checked, event) => {
      filterStore.change(id, value, checked);
      onChange(event);
    },
  });
}

export function buildFilterOptions(
  container,
  options,
  selectedSet,
  { asNumber = false, onChange } = {},
) {
  if (!container) return;

  publishReactFilter(container, options, selectedSet, { asNumber, onChange });
  return;
}

export function toggleFilterVisibility(container, shouldShow) {
  if (!container) return;
  const wrapper = container.closest(".analysis-filter");
  if (!wrapper) return;
  wrapper.style.display = shouldShow ? "" : "none";
}

export function renderDynamicFilter(
  container,
  options,
  selectedSet,
  config = {},
) {
  const shouldShow = Array.isArray(options) && options.length > 0;
  if (!shouldShow) {
    if (selectedSet && typeof selectedSet.clear === "function")
      selectedSet.clear();
    publishReactFilter(container, [], selectedSet, config);
  }
  toggleFilterVisibility(container, shouldShow);
  if (shouldShow) {
    buildFilterOptions(container, options, selectedSet, config);
  }
  return shouldShow;
}

export function getCheckedValues(container, { asNumber = false } = {}) {
  if (!container) return [];

  return readReactFilterValues(container, asNumber);
}

export function getCheckedRadioValue(container) {
  if (!container) return null;

  return readReactFilterSelect(container);
}

export function renderAnalysisCourtSideRadios(
  container,
  selectedValue,
  onChange,
  groupName,
) {
  if (!container) return;
  const name = groupName || container.id || "analysis-court-side";
  const options = [
    { value: "near", label: "Vicino" },
    { value: "far", label: "Lontano" },
  ];

  publishReactFilter(container, options, new Set([selectedValue]), {
    type: "radio",
    name,
    onChange,
  });
  return;
}
