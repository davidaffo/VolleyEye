// Each filter view owns its Sets; selections never leak to another view.
export function createFilterSelections(fields, { previousSkill = false } = {}) {
  return { ...Object.fromEntries(fields.map(field => [field, new Set()])),
    ...(previousSkill ? { prevSkill: 'any' } : {}) };
}

// Keep selected values in their original type; only option values are normalized.
export function pruneFilterSelections(state, fields) {
  for (const [key, options, asNumber = false] of fields) {
    const valid = options instanceof Set ? options : new Set(options.map(option => asNumber ? Number(option.value) : option.value));
    state[key] = new Set([...state[key]].filter(value => !Number.isNaN(value) && valid.has(value)));
  }
}

export function clearFilterSelections(state) {
  for (const value of Object.values(state)) if (value instanceof Set) value.clear();
  if (Object.hasOwn(state, 'prevSkill')) state.prevSkill = 'any';
}

