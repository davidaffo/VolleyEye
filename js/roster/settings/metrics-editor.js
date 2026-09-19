function toggleMetricAssignment(skillId, category, code) {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  const cfg = normalizeMetricConfig(skillId, state.metricsConfig[skillId]);
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
  state.metricsConfig[skillId] = normalizeMetricConfig(skillId, {
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
function togglePointRule(skillId, category, code) {
  ensurePointRulesDefaults();
  const cfg = normalizePointRule(skillId, state.pointRules[skillId]);
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
  state.pointRules[skillId] = normalizePointRule(skillId, {
    for: Array.from(forSet),
    against: Array.from(againstSet)
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}
function toggleActiveCode(skillId, code) {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  const cfg = normalizeMetricConfig(skillId, state.metricsConfig[skillId]);
  const activeSet = new Set(cfg.activeCodes);
  if (activeSet.has(code)) {
    activeSet.delete(code);
  } else {
    activeSet.add(code);
  }
  state.metricsConfig[skillId] = normalizeMetricConfig(skillId, {
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
function toggleSkillEnabled(skillId) {
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  const cfg = normalizeMetricConfig(skillId, state.metricsConfig[skillId]);
  state.metricsConfig[skillId] = normalizeMetricConfig(skillId, {
    positive: cfg.positive,
    negative: cfg.negative,
    activeCodes: cfg.activeCodes,
    enabled: !cfg.enabled
  });
  saveState();
  renderMetricsConfig();
  renderPlayers();
}
function resetMetricsToDefault() {
  const ok = confirm(
    "Ripristinare solo i criteri (positivo/negativo) ai valori di default? Le valutazioni restano invariate."
  );
  if (!ok) return;
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  SKILLS.forEach(skill => {
    const current = normalizeMetricConfig(skill.id, state.metricsConfig[skill.id]);
    const defaults = normalizeMetricConfig(skill.id, METRIC_DEFAULTS[skill.id]);
    state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, {
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
function resetAllActiveCodes() {
  const ok = confirm("Riattivare tutte le valutazioni (codici abilitati) per ogni fondamentale?");
  if (!ok) return;
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  SKILLS.forEach(skill => {
    const current = normalizeMetricConfig(skill.id, state.metricsConfig[skill.id]);
    state.metricsConfig[skill.id] = normalizeMetricConfig(skill.id, {
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
function resetPointRulesToDefault() {
  const ok = confirm("Ripristinare le regole punti ai valori di default?");
  if (!ok) return;
  ensurePointRulesDefaults();
  SKILLS.forEach(skill => {
    state.pointRules[skill.id] = normalizePointRule(skill.id, POINT_RULE_DEFAULTS[skill.id]);
  });
  saveState();
  renderMetricsConfig();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
}
function renderMetricsConfig() {
  if (!elMetricsConfig) return;
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  elMetricsConfig.innerHTML = "";
  SKILLS.forEach(skill => {
    const block = document.createElement("div");
    const enabled = state.metricsConfig[skill.id].enabled;
    block.className = "metric-block skill-" + skill.id + (enabled ? "" : " disabled");
    const title = document.createElement("div");
    title.className = "metric-title";
    title.textContent = skill.label;
    block.appendChild(title);
    const helper = document.createElement("div");
    helper.className = "metric-helper";
    helper.textContent = "";
    block.appendChild(helper);
  const colsWrap = document.createElement("div");
  colsWrap.className = "metric-cols";
  const colLeft = document.createElement("div");
  colLeft.className = "metric-col";
  const colRight = document.createElement("div");
  colRight.className = "metric-col";
  const colPoints = document.createElement("div");
  colPoints.className = "metric-col metrics-points";
  const buildMetricToggle = (tone, active, code, onClick) => {
    const btn = document.createElement("button");
    btn.type = "button";
    let cls = "metric-toggle";
    if (tone) cls += " code-" + tone;
    if (active) cls += " active";
    btn.className = cls;
    btn.textContent = code;
    if (typeof onClick === "function") {
      btn.addEventListener("click", onClick);
    }
    return btn;
  };
  const makeRow = rowMeta => {
    const row = document.createElement("div");
    row.className = "metric-row";
    const label = document.createElement("span");
    label.className = "metric-label";
      label.textContent = rowMeta.label;
      row.appendChild(label);
      if (rowMeta.type === "toggle") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "metric-toggle toggle-skill " +
          (enabled ? "toggle-on" : "toggle-off");
        btn.textContent = enabled ? "ON" : "OFF";
        btn.addEventListener("click", () => toggleSkillEnabled(skill.id));
        row.appendChild(btn);
      } else {
        SETTINGS_RESULT_CODES.forEach(code => {
          const active =
            rowMeta.key === "activeCodes"
              ? state.metricsConfig[skill.id].activeCodes.includes(code)
              : state.metricsConfig[skill.id][rowMeta.key].includes(code);
          const tone = getCodeTone(skill.id, code);
          const handler =
            rowMeta.key === "activeCodes"
              ? () => toggleActiveCode(skill.id, code)
              : () => toggleMetricAssignment(skill.id, rowMeta.key, code);
          const toggle = buildMetricToggle(tone, active, code, handler);
          if (skill.id === "block" && code === "!" && rowMeta.key === "activeCodes") {
            toggle.disabled = true;
            toggle.title = "Non contemplato per il muro";
          }
          row.appendChild(toggle);
        });
      }
      return row;
    };
    [ { key: "enabled", label: "Scout attivo?", type: "toggle" },
      { key: "activeCodes", label: "Codici abilitati", type: "active" } ].forEach(meta => {
      colLeft.appendChild(makeRow(meta));
    });
    [ { key: "positive", label: "Positivo" },
      { key: "neutral", label: "Neutro" },
      { key: "negative", label: "Negativo" } ].forEach(meta => {
      colRight.appendChild(makeRow(meta));
    });
    const pointCfg = normalizePointRule(skill.id, state.pointRules[skill.id]);
    const pointRow = meta => {
      const row = document.createElement("div");
      row.className = "metric-row";
      const label = document.createElement("span");
      label.className = "metric-label";
      label.textContent = meta.label;
      row.appendChild(label);
      SETTINGS_RESULT_CODES.forEach(code => {
        const active =
          meta.key === "for"
            ? pointCfg.for.includes(code)
            : meta.key === "against"
              ? pointCfg.against.includes(code)
              : !pointCfg.for.includes(code) && !pointCfg.against.includes(code);
        const tone = meta.key === "for" ? "positive" : meta.key === "against" ? "negative" : "neutral";
        const handler = () => togglePointRule(skill.id, meta.key, code);
        row.appendChild(buildMetricToggle(tone, active, code, handler));
      });
      return row;
    };
    [ { key: "for", label: "Punto" },
      { key: "against", label: "Punto subito" },
      { key: "neutral", label: "Neutro (no punto)" } ].forEach(meta => {
      colPoints.appendChild(pointRow(meta));
    });
    colsWrap.appendChild(colLeft);
    colsWrap.appendChild(colRight);
    colsWrap.appendChild(colPoints);
    block.appendChild(colsWrap);
    elMetricsConfig.appendChild(block);
  });
  try {
    syncSkillFlowButtons();
  } catch (e) {
    if (typeof console !== "undefined" && console.error) {
      console.error("Skill flow buttons sync failed", e);
    }
  }
}
