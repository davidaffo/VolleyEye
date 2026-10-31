import { SKILLS, METRIC_DEFAULTS, RESULT_CODES, POINT_RULE_DEFAULTS, session as matchState } from "../../../../js/globals.js";
import { ensureMetricsConfigDefaults, ensurePointRulesDefaults, normalizeMetricConfig, normalizePointRule } from "../../settings/rules.js";
import { saveState } from "../../storage/save-state.js";
import { recalcAllStatsAndUpdateUI } from "../../analysis/stats-update.js";
import { renderPlayers } from "../../live/team-rendering.js";
import { renderMetricsConfig } from "../../settings/metrics-view.js";

export function toggleMetricAssignment(skillId, category, code) {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  const cfg = normalizeMetricConfig(skillId, matchState.state.metricsConfig[skillId]);
  const posSet = new Set(cfg.positive);
  const negSet = new Set(cfg.negative);
  if (category === "positive") {
    if (posSet.has(code)) {
      posSet.delete(code);
    } else {
      posSet.add(code);
      negSet.delete(code);
    }
  } else if (category === "negative") {
    if (negSet.has(code)) {
      negSet.delete(code);
    } else {
      negSet.add(code);
      posSet.delete(code);
    }
  } else {
    posSet.delete(code);
    negSet.delete(code);
  }
  matchState.state.metricsConfig[skillId] = normalizeMetricConfig(skillId, {
    positive: Array.from(posSet),
    negative: Array.from(negSet),
    activeCodes: cfg.activeCodes,
    enabled: cfg.enabled
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}

export function togglePointRule(skillId, category, code) {
  ensurePointRulesDefaults();
  const cfg = normalizePointRule(skillId, matchState.state.pointRules[skillId]);
  const forSet = new Set(cfg.for);
  const againstSet = new Set(cfg.against);
  if (category === "for") {
    if (forSet.has(code)) {
      forSet.delete(code);
    } else {
      forSet.add(code);
      againstSet.delete(code);
    }
  } else if (category === "against") {
    if (againstSet.has(code)) {
      againstSet.delete(code);
    } else {
      againstSet.add(code);
      forSet.delete(code);
    }
  } else {
    forSet.delete(code);
    againstSet.delete(code);
  }
  matchState.state.pointRules[skillId] = normalizePointRule(skillId, {
    for: Array.from(forSet),
    against: Array.from(againstSet)
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}

export function toggleActiveCode(skillId, code) {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  const cfg = normalizeMetricConfig(skillId, matchState.state.metricsConfig[skillId]);
  const activeSet = new Set(cfg.activeCodes);
  if (activeSet.has(code)) {
    activeSet.delete(code);
  } else {
    activeSet.add(code);
  }
  matchState.state.metricsConfig[skillId] = normalizeMetricConfig(skillId, {
    positive: cfg.positive,
    negative: cfg.negative,
    activeCodes: Array.from(activeSet),
    enabled: cfg.enabled
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}

export function toggleSkillEnabled(skillId) {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  const cfg = normalizeMetricConfig(skillId, matchState.state.metricsConfig[skillId]);
  matchState.state.metricsConfig[skillId] = normalizeMetricConfig(skillId, {
    positive: cfg.positive,
    negative: cfg.negative,
    activeCodes: cfg.activeCodes,
    enabled: !cfg.enabled
  });
  saveState();
  renderMetricsConfig();
  renderPlayers();
}

export function resetMetricsToDefault() {
  const ok = confirm(
    "Ripristinare solo i criteri (positivo/negativo) ai valori di default? Le valutazioni restano invariate."
  );
  if (!ok) return;
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  SKILLS.forEach(skill => {
    const current = normalizeMetricConfig(skill.id, matchState.state.metricsConfig[skill.id]);
    const defaults = normalizeMetricConfig(skill.id, METRIC_DEFAULTS[skill.id]);
    matchState.state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, {
      positive: defaults.positive,
      negative: defaults.negative,
      activeCodes: current.activeCodes,
      enabled: current.enabled
    });
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}

export function resetAllActiveCodes() {
  const ok = confirm("Riattivare tutte le valutazioni (codici abilitati) per ogni fondamentale?");
  if (!ok) return;
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  SKILLS.forEach(skill => {
    const current = normalizeMetricConfig(skill.id, matchState.state.metricsConfig[skill.id]);
    matchState.state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, {
      positive: current.positive,
      negative: current.negative,
      activeCodes: [...RESULT_CODES],
      enabled: current.enabled
    });
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}

export function resetPointRulesToDefault() {
  const ok = confirm("Ripristinare le regole punti ai valori di default?");
  if (!ok) return;
  ensurePointRulesDefaults();
  SKILLS.forEach(skill => {
    matchState.state.pointRules[skill.id] = normalizePointRule(skill.id, POINT_RULE_DEFAULTS[skill.id]);
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}
