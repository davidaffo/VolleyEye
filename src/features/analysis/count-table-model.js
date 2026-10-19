import { emptyCounts, totalFromCounts, formatPercent } from "../../domain/counts.js";
import { computeMetrics } from "./metrics.js";
import { normalizeEvalCode } from './values.js';
import { skillCells, comparisonCell } from './table-cells.js';

const codes = ['#', '+', '!', '-', '=', '/'];
const percentages = ['pos', 'prf', 'eff'];

export function countRowCells(label, counts, skill) {
  const metrics = computeMetrics(counts, skill);
  return [{ text: label }, ...skillCells(skill, [totalFromCounts(counts),
    ...codes.map(code => counts[code] || 0), ...percentages.map(key => formatPercent(metrics[key]))])];
}

export function metricDeltaClass(value, other, better = 'higher') {
  if (value == null || other == null || value === other) return '';
  return (better === 'lower' ? value < other : value > other) ? 'is-better' : 'is-worse';
}

export function comparisonCountCells(label, counts, otherCounts, skill) {
  const metrics = computeMetrics(counts, skill);
  const other = computeMetrics(otherCounts, skill);
  return [{ text: label, compare: null },
    comparisonCell(totalFromCounts(counts), totalFromCounts(otherCounts)),
    ...codes.map((code, index) => comparisonCell(counts[code] || 0, otherCounts[code] || 0,
      index < 3 ? 'higher' : 'lower')),
    ...percentages.map(key => comparisonCell(formatPercent(metrics[key]), other[key], 'higher', metrics[key]))
  ].map((cell, index) => {
    const tone = metricDeltaClass(Object.hasOwn(cell, 'raw') ? cell.raw : cell.text, cell.compare, cell.better);
    return { ...cell, className: (tone ? 'player-analysis-compare-value ' + tone + ' ' : '') +
      (index > 0 ? 'skill-col skill-' + skill : '') };
  });
}

export function groupEventCounts(events, identify) {
  const groups = new Map();
  events.forEach(event => {
    const code = normalizeEvalCode(event.code || event.evaluation);
    if (!code) return;
    const { key, name } = identify(event);
    if (!groups.has(key)) groups.set(key, { name, counts: emptyCounts() });
    const counts = groups.get(key).counts;
    counts[code] = (counts[code] || 0) + 1;
  });
  return groups;
}

export function countEvaluatedEvents(events) {
  const counts = emptyCounts();
  events.forEach(event => {
    const code = normalizeEvalCode(event.code || event.evaluation);
    if (code) counts[code] = (counts[code] || 0) + 1;
  });
  return counts;
}
