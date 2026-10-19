import { createPreviousSkillOptions } from '../domain/previous-skill-options.js';
import { analysisFilterFields } from './ui/analysis-filter-fields.js';
import { FilterField } from "./ui/FilterField.jsx";

import { useViewStore } from "../hooks/useViewStore.js";

import { filterStore } from "../state/filter-store.mjs";
export function AnalysisFilter({ id, className }) {
  useViewStore(filterStore);
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
    <div id={id} className={className}>
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
  useViewStore(filterStore);
  const view = filterStore.getView(id);
  return (
    <select
      id={id}
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
        : createPreviousSkillOptions()
      ).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function AnalysisFilterFields({ fields, group, prefix, extra }) {
  fields ||= analysisFilterFields(group, prefix, extra);
  return fields.map(([id, label, type]) => (
    <FilterField key={id} label={label}>
      {type === "previous" ? (
        <PreviousSkillSelect id={id} />
      ) : (
        <AnalysisFilter id={id} className="analysis-filter__options" />
      )}
    </FilterField>
  ));
}
