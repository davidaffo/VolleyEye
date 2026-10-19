import { RESULT_CODES, session as matchState } from '../../../js/globals.js';
import { ensureMetricsConfigDefaults } from '../settings/rules.js';
import { normalizeCounts } from '../../domain/counts.js';
export function computeMetrics(counts, skillId) {
  ensureMetricsConfigDefaults();
  const safeCounts = normalizeCounts(counts);
  const cfg = matchState.state.metricsConfig && matchState.state.metricsConfig[skillId];
  const total = RESULT_CODES.reduce((sum, code) => sum + (safeCounts[code] || 0), 0);
  if (!total) {
    return { total: 0, pos: null, eff: null, prf: null, positiveCount: 0, negativeCount: 0 };
  }
  const positiveCodes = Array.from(new Set([...(cfg && cfg.positive ? cfg.positive : []), "#", "+"]));
  const negativeCodes = (cfg && cfg.negative) || ["-"];
  const positiveCount = positiveCodes.reduce((sum, code) => sum + (safeCounts[code] || 0), 0);
  const negativeCount = negativeCodes.reduce(
    (sum, code) => sum + (safeCounts[code] || 0),
    0
  );
  const pos = (positiveCount / total) * 100;
  const cfgPositivesOnly = (cfg && cfg.positive) || [];
  const effPosCount = cfgPositivesOnly.reduce((sum, code) => sum + (safeCounts[code] || 0), 0);
  const eff = ((effPosCount - negativeCount) / total) * 100;
  const prf = ((safeCounts["#"] || 0) / total) * 100;
  return { total, pos, eff, prf, positiveCount, negativeCount };
}

export function getSkillChartCodeTone(code, skillId = null) {
  ensureMetricsConfigDefaults();
  const cfg = skillId && matchState.state.metricsConfig ? matchState.state.metricsConfig[skillId] : null;
  const positiveCodes = Array.from(new Set([...(cfg && cfg.positive ? cfg.positive : []), "#", "+"]));
  const negativeCodes = (cfg && cfg.negative) || ["-"];
  if (positiveCodes.includes(code)) return "positive";
  if (negativeCodes.includes(code)) return "negative";
  return "neutral";
}
