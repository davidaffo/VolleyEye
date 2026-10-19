import { METRIC_DEFAULTS, RESULT_CODES, POINT_RULE_DEFAULTS, SKILLS, session as matchState } from '../../../js/globals.js';
import { session as camp3ImportState } from './rule-state.js';
export function normalizeMetricConfig(skillId, cfg) {
  const def = METRIC_DEFAULTS[skillId] || METRIC_DEFAULTS.serve;
  const uniq = list =>
    Array.from(new Set((list || []).filter(code => camp3ImportState.allowedMetricCodes.has(code))));
  const positive = uniq((cfg && cfg.positive) || def.positive || ["#", "+"]);
  const negative = uniq((cfg && cfg.negative) || def.negative || ["-"]);
  const neutral = RESULT_CODES.filter(code => !positive.includes(code) && !negative.includes(code));
  const activeCodes = uniq((cfg && cfg.activeCodes) || def.activeCodes || RESULT_CODES).filter(
    code => skillId !== "block" || code !== "!"
  );
  const enabled = cfg && typeof cfg.enabled === "boolean" ? cfg.enabled : def.enabled !== false;
  return { positive, neutral, negative, activeCodes, enabled };
}

export function sameCodeList(a, b) {
  const left = Array.isArray(a) ? a.slice().sort() : [];
  const right = Array.isArray(b) ? b.slice().sort() : [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

export function normalizePointRule(skillId, cfg) {
  const def = POINT_RULE_DEFAULTS[skillId] || { for: [], against: [] };
  const uniq = list =>
    Array.from(new Set((list || []).filter(code => camp3ImportState.allowedPointCodes.has(code))));
  const made = uniq((cfg && cfg.for) || def.for || []);
  const conceded = uniq((cfg && cfg.against) || def.against || []);
  return { for: made, against: conceded };
}

export function normalizeScoreOverrides(raw) {
  const cleaned = {};
  if (!raw || typeof raw !== "object") return cleaned;
  Object.keys(raw).forEach(key => {
    const setNum = parseInt(key, 10);
    if (!setNum || setNum < 1 || setNum > 5) return;
    const entry = raw[key] || {};
    const forVal = Number(entry.for);
    const againstVal = Number(entry.against);
    cleaned[setNum] = {
      for: Number.isFinite(forVal) ? forVal : 0,
      against: Number.isFinite(againstVal) ? againstVal : 0
    };
  });
  return cleaned;
}

export function ensurePointRulesDefaults() {
  matchState.state.pointRules = matchState.state.pointRules || {};
  SKILLS.forEach(skill => {
    matchState.state.pointRules[skill.id] = normalizePointRule(skill.id, matchState.state.pointRules[skill.id]);
    if (skill.id === "serve") {
      const current = matchState.state.pointRules[skill.id];
      if (
        sameCodeList(current.for, ["#", "+", "!", "/"]) &&
        sameCodeList(current.against, ["="])
      ) {
        matchState.state.pointRules[skill.id] = normalizePointRule(skill.id, POINT_RULE_DEFAULTS.serve);
      }
    }
    if (skill.id === "pass" || skill.id === "freeball") {
      const current = matchState.state.pointRules[skill.id];
      if (
        Array.isArray(current.against) &&
        current.against.includes("/") &&
        sameCodeList(current.for, []) &&
        (sameCodeList(current.against, ["=", "/"]) || sameCodeList(current.against, ["/"]))
      ) {
        matchState.state.pointRules[skill.id] = normalizePointRule(skill.id, POINT_RULE_DEFAULTS.pass);
      }
    }
    if (skill.id === "defense") {
      matchState.state.pointRules[skill.id].against = matchState.state.pointRules[skill.id].against.filter(code => code !== "/");
    }
    if (
      skill.id === "second" &&
      Array.isArray(matchState.state.pointRules[skill.id].against) &&
      matchState.state.pointRules[skill.id].against.length === 1 &&
      matchState.state.pointRules[skill.id].against[0] === "="
    ) {
      matchState.state.pointRules[skill.id].against.push("/");
    }
  });
}

export function getCodeTone(skillId, code) {
  ensureMetricsConfigDefaults();
  const cfg = normalizeMetricConfig(skillId, matchState.state.metricsConfig[skillId]);
  if (cfg.positive.includes(code)) return "positive";
  if (cfg.negative.includes(code)) return "negative";
  return "neutral";
}

export function ensureMetricsConfigDefaults() {
  matchState.state.metricsConfig = matchState.state.metricsConfig || {};
  SKILLS.forEach(skill => {
    matchState.state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, matchState.state.metricsConfig[skill.id]);
    if (skill.id === "freeball") {
      const current = matchState.state.metricsConfig[skill.id];
      const legacyPositive = ["#", "+", "!"];
      const legacyNegative = ["/", "="];
      if (
        sameCodeList(current.positive, legacyPositive) &&
        sameCodeList(current.negative, legacyNegative)
      ) {
        matchState.state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, METRIC_DEFAULTS.pass);
      }
    }
  });
}

export function ensureOpponentSkillConfigDefaults() {
  matchState.state.opponentSkillConfig = matchState.state.opponentSkillConfig || {};
  SKILLS.forEach(skill => {
    if (typeof matchState.state.opponentSkillConfig[skill.id] !== "boolean") {
      matchState.state.opponentSkillConfig[skill.id] = true;
    }
  });
}
