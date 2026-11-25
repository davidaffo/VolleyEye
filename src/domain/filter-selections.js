// Each filter view owns its Sets; selections never leak to another view.
export function createFilterSelections(fields, { previousSkill = false } = {}) {
  return { ...Object.fromEntries(fields.map(field => [field, new Set()])),
    ...(previousSkill ? { prevSkill: 'any' } : {}) };
}

export function createFilterSelection(included = [], excluded = []) {
  const selection = new Set(included);
  Object.defineProperty(selection, 'excluded', { value: new Set(excluded), configurable: true });
  return selection;
}

export function matchesFilterSelection(selection, value) {
  if (!selection) return true;
  if (selection.excluded?.has(value)) return false;
  return !selection.size || selection.has(value);
}

export function isFilterSelectionActive(selection) {
  return !!(selection?.size || selection?.excluded?.size);
}

export function matchesFilterAlternatives(selection, values) {
  if (!selection) return true;
  if (values.some(value => selection.excluded?.has(value))) return false;
  return !selection.size || values.some(value => selection.has(value));
}

// Keep selected values in their original type; only option values are normalized.
export function pruneFilterSelections(state, fields) {
  for (const [key, options, asNumber = false] of fields) {
    const valid = options instanceof Set ? options : new Set(options.map(option => asNumber ? Number(option.value) : option.value));
    const previous = state[key];
    state[key] = createFilterSelection([...(previous || [])].filter(value => !Number.isNaN(value) && valid.has(value)),
      [...(previous?.excluded || [])].filter(value => !Number.isNaN(value) && valid.has(value)));
  }
}

export function clearFilterSelections(state) {
  for (const value of Object.values(state)) if (value instanceof Set) { value.clear(); value.excluded?.clear(); }
  if (Object.hasOwn(state, 'prevSkill')) state.prevSkill = 'any';
}
