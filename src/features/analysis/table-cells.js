// Analysis tables share the same presentation contract for all fundamentals.
export function skillCells(skill, values) {
  const className = `skill-col skill-${skill}`;
  return values.map(text => ({ text, className }));
}

export function statisticEntry(label, value, better = 'higher', text = String(value)) {
  return { label, text, value, better };
}

export function comparisonCell(text, compare, better = 'higher', raw) {
  const cell = { text, compare, better };
  if (arguments.length === 4) cell.raw = raw;
  return cell;
}
