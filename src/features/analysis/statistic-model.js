import { SKILL_COLUMNS } from '../../domain/analysis-columns.js';
import { computeMetrics } from "./metrics.js";
import { countPointsForSkill } from "./points.js";
import { normalizeCounts, formatPercent, formatPercentValue } from "../../domain/counts.js";
import { statisticEntry } from './table-cells.js';

export function normalizeSkillCounts(stats) {
  return Object.fromEntries(SKILL_COLUMNS.map(({ id }) => [id, normalizeCounts(stats?.[id])]));
}

export function buildSkillEntries(skill, counts, passAces = 0) {
  counts = normalizeCounts(counts);
  const metrics = computeMetrics(counts, skill);
  const total = metrics.total;
  const points = ['serve', 'attack', 'block'].includes(skill)
    ? countPointsForSkill(counts, skill) || 0 : 0;
  const values = {
    Tot: total,
    Err: ['serve', 'attack'].includes(skill) ? counts['='] || 0 : metrics.negativeCount || 0,
    Ace: passAces || 0,
    Mur: counts['/'] || 0,
    Punti: points,
    '% Punti': total > 0 ? points / total : null,
    Eff: metrics.eff, Pos: metrics.pos, Prf: metrics.prf,
  };
  return SKILL_COLUMNS.find(({ id }) => id === skill).columns.map(label => {
    const value = values[label];
    const better = label === 'Tot' ? 'neutral' : ['Err', 'Ace', 'Mur'].includes(label) ? 'lower' : 'higher';
    const text = ['Eff', 'Pos', 'Prf'].includes(label) ? value === null ? '-' : formatPercent(value)
      : label === '% Punti' ? formatPercentValue(points, total) : String(value);
    return statisticEntry(label, value, better, text);
  });
}
