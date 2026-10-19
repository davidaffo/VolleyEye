import { session as matchState } from '../../../js/globals.js';
import { ensurePointRulesDefaults, normalizePointRule } from '../settings/rules.js';
export function countPointsForSkill(counts, skillId) {
  ensurePointRulesDefaults();
  const cfg = normalizePointRule(skillId, matchState.state.pointRules && matchState.state.pointRules[skillId]);
  const pointCodes = (cfg && cfg.for) || [];
  return pointCodes.reduce((sum, code) => sum + (counts[code] || 0), 0);
}
