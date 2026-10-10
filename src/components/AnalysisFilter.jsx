import { useSyncExternalStore } from "react";
import { filterStore } from "../state/filter-store.mjs";
export function AnalysisFilter({ id, className }) {
  useSyncExternalStore(
    filterStore.subscribe,
    filterStore.getSnapshot,
    filterStore.getSnapshot,
  );
  const view = filterStore.getView(id);
  const options = (items, groupId) =>
    items.map((option, index) => (
      <label key={index}>
        <input
          type={view.type}
          name={view.name}
          value={option.value}
          id={
            view.type === "checkbox" ? groupId + "-" + option.value : undefined
          }
          checked={view.selected.includes(String(option.value))}
          onChange={(event) =>
            view.onChange?.(
              String(option.value),
              event.target.checked,
              event.nativeEvent,
            )
          }
        />
        <span>{option.label}</span>
      </label>
    ));
  return (
    <div id={id} className={className} data-react-managed="true">
      {view.groups.length
        ? view.groups.map((group) => (
            <div className="filter-scope-group" key={group.id}>
              <div className="filter-scope-title">{group.label}</div>
              <div id={group.id} className="analysis-filter__options">
                {options(group.options, group.id)}
              </div>
            </div>
          ))
        : options(view.options, id)}
    </div>
  );
}
export function PreviousSkillSelect({ id }) {
  useSyncExternalStore(
    filterStore.subscribe,
    filterStore.getSnapshot,
    filterStore.getSnapshot,
  );
  const view = filterStore.getView(id);
  return (
    <select
      id={id}
      data-react-managed="true"
      value={view.value}
      onChange={(event) =>
        view.onChange?.(
          event.target.value,
          event.target.checked,
          event.nativeEvent,
        )
      }
    >
      {(view.options.length
        ? view.options
        : [
            { value: "any", label: "Tutte" },
            {
              value: "freeball-positive",
              label: "Freeball o ricezione positiva",
            },
            { value: "receive-positive", label: "Solo ricezione positiva" },
            { value: "defense-negative", label: "Difesa + ricezione negativa" },
            { value: "freeball-only", label: "Solo freeball" },
            { value: "dig-only", label: "Solo difesa" },
          ]
      ).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
