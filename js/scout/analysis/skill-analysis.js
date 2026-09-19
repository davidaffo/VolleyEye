function computeMetrics(counts, skillId) {
  ensureMetricsConfigDefaults();
  const safeCounts = normalizeCounts(counts);
  const cfg = state.metricsConfig && state.metricsConfig[skillId];
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
const SKILL_CHART_METRICS = [
  { id: "eff", label: "Eff % cumulativa", kind: "percent" },
  { id: "pos", label: "Pos % cumulativa", kind: "percent" },
  { id: "prf", label: "Prf % cumulativa", kind: "percent" },
  { id: "code", label: "Esito singolo (codice)", kind: "code" }
];
const SKILL_CHART_CODE_VALUES = { "#": 2, "+": 1, "!": 0, "-": -1, "=": -2, "/": -2 };
function getSkillChartCodeTone(code, skillId = null) {
  ensureMetricsConfigDefaults();
  const cfg = skillId && state.metricsConfig ? state.metricsConfig[skillId] : null;
  const positiveCodes = Array.from(new Set([...(cfg && cfg.positive ? cfg.positive : []), "#", "+"]));
  const negativeCodes = (cfg && cfg.negative) || ["-"];
  if (positiveCodes.includes(code)) return "positive";
  if (negativeCodes.includes(code)) return "negative";
  return "neutral";
}
function isAggSubtabVisible(tabId) {
  const currentTopTab =
    typeof activeTab !== "undefined"
      ? activeTab
      : (document && document.body && document.body.dataset && document.body.dataset.activeTab) || "";
  return currentTopTab === "aggregated" && activeAggTab === tabId;
}
function getSkillChartMetricMeta(metricId) {
  return SKILL_CHART_METRICS.find(m => m.id === metricId) || SKILL_CHART_METRICS[0];
}
function getSkillChartEventPlayerLabel(ev) {
  if (!ev) return "";
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope) || [];
  const numbers = getPlayerNumbersForScope(scope);
  const idx = resolvePlayerIdx(ev);
  const name = ev.playerName || (typeof idx === "number" ? players[idx] : "") || "";
  if (!name) return "";
  return formatNameWithNumberFor(name, numbers) || name;
}
function ensureSkillChartsUiState() {
  if (!state.uiSkillCharts || typeof state.uiSkillCharts !== "object") {
    state.uiSkillCharts = {
      globalMetric: "eff",
      playerMetric: "eff",
      modalMetric: "eff"
    };
  }
  const ui = state.uiSkillCharts;
  if (!SKILL_CHART_METRICS.some(m => m.id === ui.globalMetric)) ui.globalMetric = "eff";
  if (!SKILL_CHART_METRICS.some(m => m.id === ui.playerMetric)) ui.playerMetric = "eff";
  if (!SKILL_CHART_METRICS.some(m => m.id === ui.modalMetric)) ui.modalMetric = "eff";
  return ui;
}
function fillSkillChartMetricSelect(selectEl, value, onChange) {
  if (!selectEl) return;
  if (!selectEl.dataset.skillChartMetricInit) {
    selectEl.innerHTML = "";
    SKILL_CHART_METRICS.forEach(optMeta => {
      const opt = document.createElement("option");
      opt.value = optMeta.id;
      opt.textContent = optMeta.label;
      selectEl.appendChild(opt);
    });
    if (typeof onChange === "function") {
      selectEl.addEventListener("change", onChange);
    }
    const swallowMetricSelectEvent = e => {
      if (!e) return;
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    };
    selectEl.addEventListener("mousedown", swallowMetricSelectEvent, true);
    selectEl.addEventListener("pointerdown", swallowMetricSelectEvent, true);
    selectEl.addEventListener("click", swallowMetricSelectEvent, true);
    selectEl.addEventListener("mousedown", pauseSkillChartRender, true);
    selectEl.addEventListener("pointerdown", pauseSkillChartRender, true);
    selectEl.addEventListener("focus", pauseSkillChartRender, true);
    selectEl.addEventListener("blur", () => resumeSkillChartRender({ flush: false }));
    selectEl.addEventListener("change", () => resumeSkillChartRender({ flush: true }));
    selectEl.dataset.skillChartMetricInit = "1";
  }
  selectEl.value = SKILL_CHART_METRICS.some(m => m.id === value) ? value : "eff";
  selectEl.classList.add("skill-chart-metric-select-hidden");
  let buttonsWrap = selectEl.parentElement && selectEl.parentElement.querySelector(".skill-chart-metric-buttons");
  if (!buttonsWrap && selectEl.parentElement) {
    buttonsWrap = document.createElement("div");
    buttonsWrap.className = "skill-chart-metric-buttons";
    selectEl.parentElement.appendChild(buttonsWrap);
  }
  if (buttonsWrap) {
    buttonsWrap.innerHTML = "";
    SKILL_CHART_METRICS.forEach(meta => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-chart-metric-btn" + (selectEl.value === meta.id ? " active" : "");
      btn.textContent = meta.label;
      btn.dataset.metricId = meta.id;
      btn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        if (selectEl.value === meta.id) return;
        selectEl.value = meta.id;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      });
      buttonsWrap.appendChild(btn);
    });
  }
}
function getSkillChartBaseEvents(scope = getAnalysisTeamScope()) {
  const extraState = getAnalysisExtraMatchState();
  const multiMatchActive = !!(extraState && extraState[scope] && extraState[scope].size > 0);
  const currentMatchKey = getCurrentMatchKey() || "__current__";
  const currentMatchLabel = getCurrentMatchLabel() || "Match corrente";
  const currentMatchDate = (state.match && state.match.date) || "";
  const source = getAnalysisEvents();
  return (source || []).filter(ev => {
    if (!ev) return false;
    if (!matchesSummarySetFilter(ev)) return false;
    if (state.useOpponentTeam) {
      return getTeamScopeFromEvent(ev) === scope;
    }
    return ev.team !== "opponent";
  }).map(ev => {
    if (!multiMatchActive) return ev;
    const cloned = Object.assign({}, ev);
    if (!cloned.analysisMatchKey) cloned.analysisMatchKey = currentMatchKey;
    if (!cloned.analysisMatchLabel) cloned.analysisMatchLabel = currentMatchLabel;
    if (!cloned.analysisMatchDate) cloned.analysisMatchDate = currentMatchDate;
    return cloned;
  });
}
function buildSkillMetricSeries(events, skillId, metricId) {
  const hasMultiMatchData = (events || []).some(ev => ev && (ev.analysisMatchKey || ev.analysisMatchLabel));
  if (hasMultiMatchData) {
    const grouped = [];
    const byKey = new Map();
    (events || []).forEach(ev => {
      if (!ev) return;
      const key = String(ev.analysisMatchKey || ev.analysisMatchLabel || "__current__");
      if (!byKey.has(key)) {
        const bucket = {
          key,
          label: ev.analysisMatchLabel || key,
          date: (ev.analysisMatchDate || "").trim(),
          events: []
        };
        byKey.set(key, bucket);
        grouped.push(bucket);
      }
      byKey.get(key).events.push(ev);
    });
    grouped.sort((a, b) => {
      const ad = (a.date || "").trim();
      const bd = (b.date || "").trim();
      if (ad && bd && ad !== bd) return ad.localeCompare(bd);
      if (ad && !bd) return -1;
      if (!ad && bd) return 1;
      return String(a.label || a.key || "").localeCompare(String(b.label || b.key || ""), "it", { sensitivity: "base" });
    });
    const series = [];
    grouped.forEach((bucket, idx) => {
      const counts = emptyCounts();
      let codeSum = 0;
      let codeCount = 0;
      bucket.events.forEach(ev => {
        if (!ev || ev.skillId !== skillId) return;
        if (!ev.code || !NORMAL_EVAL_CODES.has(ev.code)) return;
        counts[ev.code] = (counts[ev.code] || 0) + 1;
        codeSum += Number(SKILL_CHART_CODE_VALUES[ev.code] || 0);
        codeCount += 1;
      });
      const metrics = computeMetrics(counts, skillId);
      if (!metrics.total && metricId !== "code") return;
      let y = null;
      let labelValue = "-";
      let tone = "neutral";
      let codeLabel = "•";
      if (metricId === "eff") {
        y = metrics.eff;
        labelValue = metrics.eff == null ? "-" : formatPercent(metrics.eff);
      } else if (metricId === "pos") {
        y = metrics.pos;
        labelValue = metrics.pos == null ? "-" : formatPercent(metrics.pos);
      } else if (metricId === "prf") {
        y = metrics.prf;
        labelValue = metrics.prf == null ? "-" : formatPercent(metrics.prf);
      } else if (metricId === "total") {
        y = metrics.total;
        labelValue = String(metrics.total || 0);
      } else if (metricId === "positive") {
        y = metrics.positiveCount || 0;
        labelValue = String(metrics.positiveCount || 0);
      } else if (metricId === "negative") {
        y = metrics.negativeCount || 0;
        labelValue = String(metrics.negativeCount || 0);
      } else if (metricId === "code") {
        if (!codeCount) return;
        y = codeSum / codeCount;
        labelValue = String(Math.round(y * 10) / 10);
        codeLabel = "avg";
        tone = y > 0 ? "positive" : y < 0 ? "negative" : "neutral";
      }
      if (y == null || Number.isNaN(y)) return;
      if (metricId !== "code") {
        if ((metrics.positiveCount || 0) > (metrics.negativeCount || 0)) tone = "positive";
        else if ((metrics.negativeCount || 0) > (metrics.positiveCount || 0)) tone = "negative";
      }
      series.push({
        x: series.length + 1,
        y,
        code: codeLabel,
        tone,
        set: null,
        rotation: null,
        matchLabel: bucket.label,
        matchKey: bucket.key,
        matchDate: bucket.date || "",
        matchEventsCount: metrics.total || 0,
        groupType: "match",
        labelValue
      });
    });
    return series;
  }
  const series = [];
  const counts = emptyCounts();
  (events || []).forEach((ev, idx) => {
    if (!ev || ev.skillId !== skillId) return;
    if (!ev.code || !NORMAL_EVAL_CODES.has(ev.code)) return;
    counts[ev.code] = (counts[ev.code] || 0) + 1;
    const metrics = computeMetrics(counts, skillId);
    let y = null;
    let labelValue = "-";
    if (metricId === "eff") {
      y = metrics.eff;
      labelValue = metrics.eff == null ? "-" : formatPercent(metrics.eff);
    } else if (metricId === "pos") {
      y = metrics.pos;
      labelValue = metrics.pos == null ? "-" : formatPercent(metrics.pos);
    } else if (metricId === "prf") {
      y = metrics.prf;
      labelValue = metrics.prf == null ? "-" : formatPercent(metrics.prf);
    } else if (metricId === "total") {
      y = metrics.total;
      labelValue = String(metrics.total || 0);
    } else if (metricId === "positive") {
      y = metrics.positiveCount || 0;
      labelValue = String(metrics.positiveCount || 0);
    } else if (metricId === "negative") {
      y = metrics.negativeCount || 0;
      labelValue = String(metrics.negativeCount || 0);
    } else if (metricId === "code") {
      y = Number(SKILL_CHART_CODE_VALUES[ev.code] || 0);
      labelValue = ev.code;
    }
    if (y == null || Number.isNaN(y)) return;
    series.push({
      x: series.length + 1,
      y,
      code: ev.code,
      tone: getSkillChartCodeTone(ev.code, skillId),
      set: normalizeSetNumber(ev.set),
      rotation: ev.rotation || null,
      eventIndex: idx,
      labelValue,
      playerLabel: getSkillChartEventPlayerLabel(ev)
    });
  });
  return series;
}
function getSkillChartLayout(series, metricMeta) {
  const width = 420;
  const height = 320;
  const pad = { top: 18, right: 22, bottom: 30, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  let minY = Math.min(...series.map(p => p.y));
  let maxY = Math.max(...series.map(p => p.y));
  if (metricMeta.kind === "percent") {
    if (metricMeta.id === "eff") {
      const absMax = Math.max(5, Math.ceil(Math.max(Math.abs(minY || 0), Math.abs(maxY || 0)) / 5) * 5);
      minY = -absMax;
      maxY = absMax;
    } else {
      minY = 0;
      maxY = 100;
    }
  } else if (metricMeta.kind === "code") {
    minY = -2;
    maxY = 2;
  } else {
    minY = Math.min(0, minY);
    maxY = Math.max(1, maxY);
  }
  if (maxY === minY) {
    maxY += 1;
    minY -= metricMeta.kind === "percent" ? 0 : 1;
  }
  // Keep dots/segments inside the clipped SVG area (avoid edge truncation).
  const pointInsetX = 22;
  const pointInsetY = 30;
  const xToPx = x => {
    const t = ((x - 1) / Math.max(1, series.length - 1));
    return pad.left + pointInsetX + t * Math.max(0, plotW - pointInsetX * 2);
  };
  const yToPx = y => {
    const t = (y - minY) / (maxY - minY);
    return pad.top + pointInsetY + (1 - t) * Math.max(0, plotH - pointInsetY * 2);
  };
  return { width, height, pad, plotW, plotH, minY, maxY, xToPx, yToPx };
}
function buildSkillChartSvg(series, metricMeta) {
  if (!series || series.length === 0) {
    return "";
  }
  const { width, height, pad, plotH, minY, maxY, xToPx, yToPx } = getSkillChartLayout(series, metricMeta);
  const linePoints = series.map(p => `${xToPx(p.x).toFixed(1)},${yToPx(p.y).toFixed(1)}`).join(" ");
  const groupByMatch = series.some(p => p && p.groupType === "match");
  const setSegments = [];
  if (!groupByMatch) {
    let segStart = 0;
    for (let i = 1; i <= series.length; i += 1) {
      const prev = series[i - 1];
      const curr = series[i];
      if (!prev) continue;
      if (!curr || curr.set !== prev.set) {
        setSegments.push({
          set: prev.set || "-",
          startIdx: segStart,
          endIdx: i - 1
        });
        segStart = i;
      }
    }
  }
  const zeroLineY = minY <= 0 && maxY >= 0 ? yToPx(0) : null;
  const tickValues = metricMeta.kind === "percent"
    ? metricMeta.id === "eff"
      ? [minY, minY / 2, 0, maxY / 2, maxY]
      : [0, 25, 50, 75, 100]
    : metricMeta.kind === "code"
      ? [-2, -1, 0, 1, 2]
      : [minY, (minY + maxY) / 2, maxY];
  const yTicks = tickValues
    .filter(v => Number.isFinite(v))
    .map(v => {
      const yPx = yToPx(v);
      const label = metricMeta.kind === "percent" ? `${Math.round(v)}%` : `${Math.round(v * 10) / 10}`;
      return `<g class="skill-chart__tick"><line x1="${pad.left}" y1="${yPx.toFixed(1)}" x2="${width - pad.right}" y2="${yPx.toFixed(1)}"></line><text x="${(pad.left - 8)}" y="${(yPx + 4).toFixed(1)}" text-anchor="end">${label}</text></g>`;
    })
    .join("");
  const setBands = setSegments.map((seg, idx) => {
    const startX = xToPx(seg.startIdx + 1);
    const endX = xToPx(seg.endIdx + 1);
    const left = idx === 0 ? pad.left : startX;
    const widthBand = Math.max(2, endX - left + (seg.endIdx === seg.startIdx ? 2 : 0));
    const labelX = left + widthBand / 2;
    const sep = idx > 0
      ? `<line class="skill-chart__set-sep" x1="${left.toFixed(1)}" y1="${pad.top}" x2="${left.toFixed(1)}" y2="${(height - pad.bottom).toFixed(1)}"></line>`
      : "";
    return `
      <g class="skill-chart__set-band-group">
        <rect class="skill-chart__set-band ${idx % 2 === 0 ? "is-even" : "is-odd"}" x="${left.toFixed(1)}" y="${pad.top}" width="${widthBand.toFixed(1)}" height="${plotH.toFixed(1)}"></rect>
        ${sep}
        <text class="skill-chart__set-label" x="${labelX.toFixed(1)}" y="${(pad.top + 12).toFixed(1)}" text-anchor="middle">Set ${seg.set}</text>
      </g>
    `;
  }).join("");
  const lineSegments = series.slice(1).map((p, idx) => {
    const prev = series[idx];
    const toneClass = `is-${p.tone || getSkillChartCodeTone(p.code, p.skillId || null)}`;
    return `<line class="skill-chart__segment ${toneClass}" x1="${xToPx(prev.x).toFixed(1)}" y1="${yToPx(prev.y).toFixed(1)}" x2="${xToPx(p.x).toFixed(1)}" y2="${yToPx(p.y).toFixed(1)}"></line>`;
  }).join("");
  const dots = series.map(p => {
    const cx = xToPx(p.x);
    const cy = yToPx(p.y);
    const tip =
      p.groupType === "match"
        ? `Partita ${p.x} · ${p.matchLabel || "-"} · ${p.labelValue}${p.matchEventsCount ? ` · ${p.matchEventsCount} eventi` : ""}`
        : `#${p.x} · ${p.labelValue} · cod ${p.code} · set ${p.set || "-"}${p.rotation ? ` · P${p.rotation}` : ""}`;
    const toneClass = `is-${p.tone || getSkillChartCodeTone(p.code, p.skillId || null)}`;
    return `<circle data-point-index="${p.x - 1}" class="${toneClass}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3"><title>${tip}</title></circle>`;
  }).join("");
  const xLabelLeft = series.length > 0 ? (groupByMatch ? "Partita 1" : 1) : 0;
  const xLabelRight = series.length ? (groupByMatch ? `Partita ${series.length}` : series.length) : 0;
  return `
    <svg viewBox="0 0 ${width} ${height}" class="skill-chart-svg" preserveAspectRatio="xMidYMid meet" aria-label="Grafico metrica skill">
      <rect x="0" y="0" width="${width}" height="${height}" rx="10" ry="10" class="skill-chart__bg"></rect>
      ${setBands}
      ${yTicks}
      ${zeroLineY != null ? `<line class="skill-chart__zero" x1="${pad.left}" y1="${zeroLineY.toFixed(1)}" x2="${width - pad.right}" y2="${zeroLineY.toFixed(1)}"></line>` : ""}
      <line class="skill-chart__axis" x1="${pad.left}" y1="${(height - pad.bottom).toFixed(1)}" x2="${width - pad.right}" y2="${(height - pad.bottom).toFixed(1)}"></line>
      <polyline class="skill-chart__line skill-chart__line--base" points="${linePoints}"></polyline>
      <g class="skill-chart__segments">${lineSegments}</g>
      <g class="skill-chart__dots">${dots}</g>
      <text class="skill-chart__xlabel" x="${pad.left}" y="${height - 6}" text-anchor="start">${xLabelLeft}</text>
      <text class="skill-chart__xlabel" x="${width - pad.right}" y="${height - 6}" text-anchor="end">${xLabelRight}</text>
    </svg>
  `;
}
function attachSkillChartHover(svgWrap, series, metricMeta) {
  if (!svgWrap || !series || !series.length) return;
  const svg = svgWrap.querySelector(".skill-chart-svg");
  if (!svg) return;
  svgWrap.classList.add("skill-chart-card__plot--interactive");
  let hoverLine = svgWrap.querySelector(".skill-chart-hover-line");
  if (!hoverLine) {
    hoverLine = document.createElement("div");
    hoverLine.className = "skill-chart-hover-line hidden";
    svgWrap.appendChild(hoverLine);
  }
  let tooltip = svgWrap.querySelector(".skill-chart-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "skill-chart-tooltip hidden";
    svgWrap.appendChild(tooltip);
  }
  const circles = Array.from(svg.querySelectorAll(".skill-chart__dots circle"));
  const clearHover = () => {
    hoverLine.classList.add("hidden");
    tooltip.classList.add("hidden");
    circles.forEach(c => c.classList.remove("is-hover"));
  };
  const moveHover = clientX => {
    const wrapRect = svgWrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) return;
    const xCss = Math.max(0, Math.min(wrapRect.width, clientX - wrapRect.left));
    const layout = getSkillChartLayout(series, metricMeta);
    const scaleX = wrapRect.width / layout.width;
    const scaleY = wrapRect.height / layout.height;
    const xView = xCss / scaleX;
    let best = null;
    let bestDist = Infinity;
    series.forEach((p, idx) => {
      const px = layout.xToPx(p.x);
      const dist = Math.abs(px - xView);
      if (dist < bestDist) {
        bestDist = dist;
        best = { point: p, idx, xPx: px, yPx: layout.yToPx(p.y) };
      }
    });
    if (!best) return;
    circles.forEach(c => c.classList.remove("is-hover"));
    const activeCircle = svg.querySelector(`circle[data-point-index="${best.idx}"]`);
    if (activeCircle) activeCircle.classList.add("is-hover");
    const lineLeft = best.xPx * scaleX;
    hoverLine.style.left = `${lineLeft}px`;
    hoverLine.style.top = `${layout.pad.top * scaleY}px`;
    hoverLine.style.height = `${layout.plotH * scaleY}px`;
    hoverLine.classList.remove("hidden");
    const tone = best.point.tone || getSkillChartCodeTone(best.point.code);
    tooltip.className = `skill-chart-tooltip is-${tone}`;
    if (best.point.groupType === "match") {
      tooltip.innerHTML =
        `<div class="skill-chart-tooltip__row"><strong>${best.point.labelValue}</strong> <span class="skill-chart-tooltip__code">${best.point.code}</span></div>` +
        `<div class="skill-chart-tooltip__row small">Partita ${best.point.x} · ${best.point.matchLabel || "-"}` +
        `${best.point.matchEventsCount ? ` · ${best.point.matchEventsCount} eventi` : ""}</div>`;
    } else {
      tooltip.innerHTML =
        `<div class="skill-chart-tooltip__row"><strong>${best.point.labelValue}</strong> <span class="skill-chart-tooltip__code">${best.point.code}</span></div>` +
        (best.point.playerLabel
          ? `<div class="skill-chart-tooltip__row small">${best.point.playerLabel}</div>`
          : "") +
        `<div class="skill-chart-tooltip__row small">Set ${best.point.set || "-"} · Evento ${best.point.x}${best.point.rotation ? ` · P${best.point.rotation}` : ""}</div>`;
    }
    tooltip.classList.remove("hidden");
    const tooltipRect = tooltip.getBoundingClientRect();
    let tipLeft = lineLeft + 10;
    if (tipLeft + tooltipRect.width > wrapRect.width - 4) {
      tipLeft = lineLeft - tooltipRect.width - 10;
    }
    tipLeft = Math.max(4, tipLeft);
    let tipTop = best.yPx * scaleY - tooltipRect.height - 8;
    if (tipTop < 4) {
      tipTop = best.yPx * scaleY + 10;
    }
    tipTop = Math.min(Math.max(4, tipTop), Math.max(4, wrapRect.height - tooltipRect.height - 4));
    tooltip.style.left = `${tipLeft}px`;
    tooltip.style.top = `${tipTop}px`;
  };
  svgWrap.onpointerleave = clearHover;
  svgWrap.onpointermove = ev => moveHover(ev.clientX);
}
let skillChartToneColorCache = null;
let skillChartRenderToken = 0;
let skillChartCacheRevision = 0;
const skillChartSeriesCache = new Map();
let skillChartRenderPaused = false;
let skillChartRenderRefreshPending = false;
function withAlpha(color, alpha = 1) {
  if (!color) return "";
  const c = String(color).trim();
  if (c.startsWith("rgba(")) {
    const m = c.match(/^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/i);
    if (!m) return c;
    return `rgba(${m[1].trim()}, ${m[2].trim()}, ${m[3].trim()}, ${alpha})`;
  }
  if (c.startsWith("rgb(")) {
    const m = c.match(/^rgb\(([^,]+),([^,]+),([^)]+)\)$/i);
    if (!m) return c;
    return `rgba(${m[1].trim()}, ${m[2].trim()}, ${m[3].trim()}, ${alpha})`;
  }
  return c;
}
function getSkillChartToneColors() {
  if (skillChartToneColorCache) return skillChartToneColorCache;
  const fallback = { positive: "#22c55e", neutral: "#eab308", negative: "#ef4444" };
  try {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;";
    const mk = cls => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `metric-toggle ${cls} active`;
      el.textContent = "•";
      host.appendChild(el);
      return el;
    };
    const posEl = mk("code-positive");
    const neuEl = mk("code-neutral");
    const negEl = mk("code-negative");
    document.body.appendChild(host);
    const pos = getComputedStyle(posEl).borderColor || fallback.positive;
    const neu = getComputedStyle(neuEl).borderColor || fallback.neutral;
    const neg = getComputedStyle(negEl).borderColor || fallback.negative;
    host.remove();
    skillChartToneColorCache = { positive: pos, neutral: neu, negative: neg };
    return skillChartToneColorCache;
  } catch (_err) {
    skillChartToneColorCache = fallback;
    return skillChartToneColorCache;
  }
}
function applySkillChartToneColors(targetEl) {
  if (!targetEl) return;
  const tones = getSkillChartToneColors();
  targetEl.style.setProperty("--chart-tone-positive", tones.positive);
  targetEl.style.setProperty("--chart-tone-neutral", tones.neutral);
  targetEl.style.setProperty("--chart-tone-negative", tones.negative);
  targetEl.style.setProperty("--chart-tone-positive-soft", withAlpha(tones.positive, 0.2));
  targetEl.style.setProperty("--chart-tone-neutral-soft", withAlpha(tones.neutral, 0.2));
  targetEl.style.setProperty("--chart-tone-negative-soft", withAlpha(tones.negative, 0.2));
}
function collectSkillChartEventsBySkill(events, { playerIdx = null } = {}) {
  const bySkill = {};
  SKILLS.forEach(skill => {
    bySkill[skill.id] = [];
  });
  (events || []).forEach(ev => {
    if (!ev || !ev.skillId || !bySkill[ev.skillId]) return;
    if (!NORMAL_EVAL_CODES.has(ev.code)) return;
    if (playerIdx !== null && playerIdx !== undefined && Number(ev.playerIdx) !== Number(playerIdx)) return;
    bySkill[ev.skillId].push(ev);
  });
  return bySkill;
}
function invalidateSkillChartCaches() {
  skillChartCacheRevision += 1;
  skillChartSeriesCache.clear();
  skillChartRenderToken += 1;
}
function cancelPendingSkillChartRender() {
  skillChartRenderToken += 1;
}
function pauseSkillChartRender() {
  skillChartRenderPaused = true;
  cancelPendingSkillChartRender();
}
function resumeSkillChartRender(options = {}) {
  const flush = options && options.flush === true;
  const hadPendingRefresh = skillChartRenderRefreshPending;
  skillChartRenderPaused = false;
  if (!flush) return;
  skillChartRenderRefreshPending = false;
  if (!hadPendingRefresh) return;
  try {
    if (typeof renderAnalysisSkillChartsPanel === "function") renderAnalysisSkillChartsPanel();
    if (typeof renderPlayerAnalysisSkillCharts === "function") renderPlayerAnalysisSkillCharts();
    if (
      typeof elAggSkillModal !== "undefined" &&
      elAggSkillModal &&
      !elAggSkillModal.classList.contains("hidden") &&
      typeof aggTableView !== "undefined" &&
      aggTableView &&
      aggTableView.mode === "skill" &&
      typeof renderAggSkillModal === "function"
    ) {
      renderAggSkillModal(aggTableView.skillId, "team");
    }
  } catch (_err) {
    // no-op: best effort refresh after menu close
  }
}
function deferSkillChartRenderWhilePaused() {
  if (!skillChartRenderPaused) return false;
  skillChartRenderRefreshPending = true;
  return true;
}
function getSkillChartFiltersCacheToken(scope = getAnalysisTeamScope()) {
  const sets = Array.from((analysisSummaryFilterState && analysisSummaryFilterState.sets) || [])
    .map(v => String(v))
    .sort()
    .join(",");
  const extraState = getAnalysisExtraMatchState();
  const extraMatches = Array.from((extraState && extraState[scope]) || []).sort().join(",");
  const currentMatch = getCurrentMatchKey() || "";
  return `rev:${skillChartCacheRevision}|scope:${scope}|sets:${sets}|extra:${extraMatches}|cur:${currentMatch}`;
}
function getSkillMetricSeriesCached(events, skillId, metricId, seriesCacheKey = "") {
  if (!seriesCacheKey) return buildSkillMetricSeries(events, skillId, metricId);
  const key = `${seriesCacheKey}|skill:${skillId}|metric:${metricId}`;
  const cached = skillChartSeriesCache.get(key);
  if (cached) return cached.map(p => Object.assign({}, p));
  const series = buildSkillMetricSeries(events, skillId, metricId);
  skillChartSeriesCache.set(key, series.map(p => Object.assign({}, p)));
  return series;
}
function renderSkillChartCardsChunked(container, renderItems, options = {}) {
  if (!container) return;
  const token = ++skillChartRenderToken;
  const batchSize = Math.max(1, options.batchSize || 1);
  let index = 0;
  const step = () => {
    if (token !== skillChartRenderToken) return;
    if (skillChartRenderPaused) {
      skillChartRenderRefreshPending = true;
      return;
    }
    const frag = document.createDocumentFragment();
    const end = Math.min(renderItems.length, index + batchSize);
    for (; index < end; index += 1) {
      if (skillChartRenderPaused) {
        skillChartRenderRefreshPending = true;
        break;
      }
      const item = renderItems[index];
      if (typeof item === "function") {
        item(frag);
      }
    }
    if (frag.childNodes.length > 0) {
      container.appendChild(frag);
    }
    if (index < renderItems.length) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}
function inlineComputedDomStyles(sourceNode, targetNode) {
  if (!(sourceNode instanceof Element) || !(targetNode instanceof Element)) return;
  const cs = window.getComputedStyle(sourceNode);
  for (let i = 0; i < cs.length; i += 1) {
    const prop = cs[i];
    const value = cs.getPropertyValue(prop);
    if (value) targetNode.style.setProperty(prop, value);
  }
  const sourceChildren = Array.from(sourceNode.children || []);
  const targetChildren = Array.from(targetNode.children || []);
  for (let i = 0; i < Math.min(sourceChildren.length, targetChildren.length); i += 1) {
    inlineComputedDomStyles(sourceChildren[i], targetChildren[i]);
  }
}
async function copySkillChartImageToClipboard(cardEl, label = "Grafico") {
  if (!cardEl) {
    alert("Card grafico non trovata.");
    return;
  }
  if (!navigator.clipboard || !window.ClipboardItem || !navigator.clipboard.write) {
    alert("Copia immagine negli appunti non supportata su questo dispositivo.");
    return;
  }
  const writeBlobToClipboard = async pngBlob => {
    if (!pngBlob) throw new Error("blob");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
  };
  const renderSvgToPngBlob = async ({ svgMarkup, width, height, bgFill = null } = {}) => {
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });
      const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (bgFill) {
        ctx.fillStyle = bgFill;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) throw new Error("blob");
      return pngBlob;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };
  try {
    const cardRect = cardEl.getBoundingClientRect();
    const width = Math.max(1, Math.round(cardRect.width || cardEl.clientWidth || 420));
    const height = Math.max(1, Math.round(cardRect.height || cardEl.clientHeight || 420));
    const clonedCard = cardEl.cloneNode(true);
    clonedCard.querySelectorAll(".skill-chart-hover-line, .skill-chart-tooltip, .skill-chart-copy-btn").forEach(el => el.remove());
    clonedCard.style.margin = "0";
    clonedCard.style.width = `${width}px`;
    clonedCard.style.height = `${height}px`;
    clonedCard.style.boxSizing = "border-box";
    inlineComputedDomStyles(cardEl, clonedCard);
    const xhtmlWrap = document.createElement("div");
    xhtmlWrap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    xhtmlWrap.style.width = `${width}px`;
    xhtmlWrap.style.height = `${height}px`;
    xhtmlWrap.style.margin = "0";
    xhtmlWrap.style.padding = "0";
    xhtmlWrap.appendChild(clonedCard);
    const serializer = new XMLSerializer();
    const foreignObjectMarkup = serializer.serializeToString(xhtmlWrap);
    const svgMarkup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject x="0" y="0" width="${width}" height="${height}">${foreignObjectMarkup}</foreignObject>
      </svg>
    `;
    const cardCs = window.getComputedStyle(cardEl);
    const cardBg = cardCs.backgroundColor && cardCs.backgroundColor !== "rgba(0, 0, 0, 0)" ? cardCs.backgroundColor : "#0c121e";
    const pngBlob = await renderSvgToPngBlob({ svgMarkup, width, height, bgFill: cardBg });
    await writeBlobToClipboard(pngBlob);
    alert(`${label} copiato negli appunti.`);
  } catch (_err) {
    try {
      const svgWrap = cardEl.querySelector(".skill-chart-card__plot");
      const svg = svgWrap && svgWrap.querySelector ? svgWrap.querySelector(".skill-chart-svg") : null;
      if (!svg || !svgWrap) throw new Error("plot-missing");
      const clonedSvg = svg.cloneNode(true);
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      inlineComputedDomStyles(svg, clonedSvg);
      const serializer = new XMLSerializer();
      const plotSvgMarkup = serializer.serializeToString(clonedSvg);
      const width = Math.max(1, Math.round(svgWrap.clientWidth || 420));
      const height = Math.max(1, Math.round(svgWrap.clientHeight || 320));
      const plotBlob = await renderSvgToPngBlob({ svgMarkup: plotSvgMarkup, width, height, bgFill: "#0c121e" });
      await writeBlobToClipboard(plotBlob);
      alert(`${label} copiato negli appunti (solo grafico: il browser ha bloccato titolo/legenda).`);
    } catch (_err2) {
      alert("Impossibile copiare immagine (browser/clipboard limita questa funzione).");
    }
  }
}
function renderSkillMetricChartCard(container, options = {}) {
  if (!container) return;
  const {
    title = "",
    subtitle = "",
    events = [],
    skillId = "",
    metricId = "eff",
    seriesCacheKey = ""
  } = options;
  const metricMeta = getSkillChartMetricMeta(metricId);
  const series = getSkillMetricSeriesCached(events, skillId, metricId, seriesCacheKey);
  const card = document.createElement("div");
  card.className = "skill-chart-card";
  applySkillChartToneColors(card);
  const head = document.createElement("div");
  head.className = "skill-chart-card__head";
  const titleRow = document.createElement("div");
  titleRow.className = "skill-chart-card__title-row";
  const titleEl = document.createElement("div");
  titleEl.className = "skill-chart-card__title";
  titleEl.textContent = title;
  titleRow.appendChild(titleEl);
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "skill-chart-copy-btn";
  copyBtn.setAttribute("aria-label", `Copia immagine grafico ${title}`);
  copyBtn.title = "Copia immagine grafico";
  copyBtn.textContent = "⧉";
  titleRow.appendChild(copyBtn);
  head.appendChild(titleRow);
  if (subtitle) {
    const sub = document.createElement("div");
    sub.className = "skill-chart-card__subtitle";
    sub.textContent = subtitle;
    head.appendChild(sub);
  }
  card.appendChild(head);
  const body = document.createElement("div");
  body.className = "skill-chart-card__body";
  if (!series.length) {
    const empty = document.createElement("div");
    empty.className = "players-empty skill-chart-empty";
    empty.textContent = "Nessun evento per i filtri selezionati.";
    body.appendChild(empty);
  } else {
    const svgWrap = document.createElement("div");
    svgWrap.className = "skill-chart-card__plot";
    svgWrap.innerHTML = buildSkillChartSvg(series, metricMeta);
    attachSkillChartHover(svgWrap, series, metricMeta);
    copyBtn.addEventListener("click", () => copySkillChartImageToClipboard(card, `Grafico ${title}`));
    body.appendChild(svgWrap);
    const footer = document.createElement("div");
    footer.className = "skill-chart-card__meta";
    const last = series[series.length - 1];
    const unitLabel = last && last.groupType === "match" ? "Partite" : "Eventi";
    footer.innerHTML = `${unitLabel}: <strong>${series.length}</strong> · Ultimo valore: <strong>${last ? last.labelValue : "-"}</strong> · <span class="skill-chart-legend"><span class="pos">●</span> positivo <span class="neu">●</span> neutro <span class="neg">●</span> negativo</span>`;
    body.appendChild(footer);
  }
  if (!series.length) {
    copyBtn.disabled = true;
  }
  card.appendChild(body);
  container.appendChild(card);
}
function buildAnalysisSkillChartEvents({ scope, skillId, playerIdx = null } = {}) {
  return getSkillChartBaseEvents(scope).filter(ev => {
    if (!ev || ev.skillId !== skillId) return false;
    if (!NORMAL_EVAL_CODES.has(ev.code)) return false;
    if (playerIdx === null || playerIdx === undefined) return true;
    return Number(ev.playerIdx) === Number(playerIdx);
  });
}
function renderAnalysisSkillChartsPanel() {
  if (!elAnalysisSkillChartGrid) return;
  if (!isAggSubtabVisible("skill-charts")) return;
  if (deferSkillChartRenderWhilePaused()) return;
  skillChartToneColorCache = null;
  const ui = ensureSkillChartsUiState();
  fillSkillChartMetricSelect(elAnalysisSkillChartMetric, ui.globalMetric, () => {
    const stateUi = ensureSkillChartsUiState();
    stateUi.globalMetric = elAnalysisSkillChartMetric.value || "eff";
    renderAnalysisSkillChartsPanel();
  });
  const metricId = (elAnalysisSkillChartMetric && elAnalysisSkillChartMetric.value) || ui.globalMetric || "eff";
  const scope = getAnalysisTeamScope();
  const scopeEvents = getSkillChartBaseEvents(scope);
  const eventsBySkill = collectSkillChartEventsBySkill(scopeEvents);
  const baseCacheKey = `analysis-global|${getSkillChartFiltersCacheToken(scope)}|metric:${metricId}`;
  elAnalysisSkillChartGrid.innerHTML = "";
  const items = SKILLS.map(skill => frag => {
    const skillEvents = eventsBySkill[skill.id] || [];
    renderSkillMetricChartCard(frag, {
      title: getSkillLabel(skill.id),
      subtitle: `${skillEvents.length} eventi`,
      events: skillEvents,
      skillId: skill.id,
      metricId,
      seriesCacheKey: `${baseCacheKey}|${skill.id}`
    });
  });
  renderSkillChartCardsChunked(elAnalysisSkillChartGrid, items, { batchSize: 1 });
}
function renderPlayerAnalysisSkillCharts() {
  if (!elPlayerAnalysisSkillChartGrid) return;
  if (!isAggSubtabVisible("player")) return;
  if (deferSkillChartRenderWhilePaused()) return;
  skillChartToneColorCache = null;
  const ui = ensureSkillChartsUiState();
  fillSkillChartMetricSelect(elPlayerAnalysisChartMetric, ui.playerMetric, () => {
    const stateUi = ensureSkillChartsUiState();
    stateUi.playerMetric = elPlayerAnalysisChartMetric.value || "eff";
    renderPlayerAnalysisSkillCharts();
  });
  renderSkillChartsForPlayer(elPlayerAnalysisSkillChartGrid, getPlayerAnalysisPlayerIdx());
}
function renderSkillChartsForPlayer(targetGrid, playerIdx) {
  if (!targetGrid) return;
  const scope = getAnalysisTeamScope();
  targetGrid.innerHTML = "";
  if (playerIdx === null) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Seleziona una giocatrice per vedere i grafici skill.";
    targetGrid.appendChild(empty);
    return;
  }
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const playerName = players && players[playerIdx] ? players[playerIdx] : "";
  if (!playerName) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Giocatrice non disponibile.";
    targetGrid.appendChild(empty);
    return;
  }
  const ui = ensureSkillChartsUiState();
  const metricId = (elPlayerAnalysisChartMetric && elPlayerAnalysisChartMetric.value) || ui.playerMetric || "eff";
  const baseCacheKey = `analysis-player|${getSkillChartFiltersCacheToken(scope)}|player:${playerIdx}|metric:${metricId}`;
  const playerLabelWithNumber =
    (scope === "opponent" ? formatNameWithNumberFor(playerName, numbers) : formatNameWithNumber(playerName));
  const items = SKILLS.map(skill => frag => {
    const events = buildAnalysisSkillChartEvents({ scope, skillId: skill.id, playerIdx });
    renderSkillMetricChartCard(frag, {
      title: getSkillLabel(skill.id),
      subtitle: `${playerLabelWithNumber} · ${events.length} eventi`,
      events,
      skillId: skill.id,
      metricId,
      seriesCacheKey: `${baseCacheKey}|${skill.id}`
    });
  });
  if (targetGrid === elPlayerAnalysisSkillChartGrid) {
    renderSkillChartCardsChunked(targetGrid, items, { batchSize: 1 });
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(item => {
    if (typeof item === "function") item(frag);
  });
  targetGrid.appendChild(frag);
}
function appendAggSkillModalChart(skillId, playerIdx) {
  if (!elAggSkillModalBody) return;
  if (!elAggSkillModal || elAggSkillModal.classList.contains("hidden")) return;
  if (deferSkillChartRenderWhilePaused()) return;
  skillChartToneColorCache = null;
  const ui = ensureSkillChartsUiState();
  const scope = getAnalysisTeamScope();
  const modalChartWrap = document.createElement("div");
  modalChartWrap.className = "agg-skill-modal-chart";
  const controls = document.createElement("div");
  controls.className = "analysis-filters skill-chart-inline-filters";
  const filter = document.createElement("div");
  filter.className = "analysis-filter";
  const label = document.createElement("div");
  label.className = "analysis-filter__label";
  label.textContent = "Metrica grafico";
  const row = document.createElement("div");
  row.className = "analysis-filter__row";
  const select = document.createElement("select");
  SKILL_CHART_METRICS.forEach(meta => {
    const opt = document.createElement("option");
    opt.value = meta.id;
    opt.textContent = meta.label;
    select.appendChild(opt);
  });
  select.value = ui.modalMetric || "eff";
  const swallowMetricSelectEvent = e => {
    if (!e) return;
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  };
  select.addEventListener("mousedown", swallowMetricSelectEvent, true);
  select.addEventListener("pointerdown", swallowMetricSelectEvent, true);
  select.addEventListener("click", swallowMetricSelectEvent, true);
  select.addEventListener("mousedown", pauseSkillChartRender, true);
  select.addEventListener("pointerdown", pauseSkillChartRender, true);
  select.addEventListener("focus", pauseSkillChartRender, true);
  select.addEventListener("blur", () => resumeSkillChartRender({ flush: false }));
  select.addEventListener("change", () => {
    resumeSkillChartRender({ flush: true });
    const stateUi = ensureSkillChartsUiState();
    stateUi.modalMetric = select.value || "eff";
    renderAggSkillModal(skillId, playerIdx);
  });
  row.appendChild(select);
  filter.appendChild(label);
  filter.appendChild(row);
  controls.appendChild(filter);
  modalChartWrap.appendChild(controls);
  const chartHost = document.createElement("div");
  chartHost.className = "analysis-skill-chart-grid analysis-skill-chart-grid--single";
  const events = buildAnalysisSkillChartEvents({
    scope,
    skillId,
    playerIdx: playerIdx === "team" ? null : playerIdx
  });
  renderSkillMetricChartCard(chartHost, {
    title: getSkillLabel(skillId),
    subtitle: `${events.length} eventi`,
    events,
    skillId,
    metricId: select.value || "eff",
    seriesCacheKey: `analysis-modal|${getSkillChartFiltersCacheToken(scope)}|skill:${skillId}|player:${playerIdx}|metric:${select.value || "eff"}`
  });
  modalChartWrap.appendChild(chartHost);
  elAggSkillModalBody.appendChild(modalChartWrap);
}
function renderAggSkillDetailChartPanel(skillId) {
  if (!elAggSummaryExtraBody) return;
  if (!isAggSubtabVisible("summary")) {
    elAggSummaryExtraBody.innerHTML = "";
    return;
  }
  if (deferSkillChartRenderWhilePaused()) return;
  skillChartToneColorCache = null;
  elAggSummaryExtraBody.innerHTML = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 32;
  const wrap = document.createElement("div");
  wrap.className = "analysis-skill-charts-panel";
  const note = document.createElement("p");
  note.className = "section-note";
  note.textContent = "Andamento della skill per tutte le metriche (punti in ordine cronologico, filtri analisi attivi).";
  wrap.appendChild(note);
  const chartGrid = document.createElement("div");
  chartGrid.className = "analysis-skill-chart-grid";
  const scope = getAnalysisTeamScope();
  const events = buildAnalysisSkillChartEvents({ scope, skillId, playerIdx: null });
  const items = SKILL_CHART_METRICS.map(meta => frag => {
    renderSkillMetricChartCard(frag, {
      title: `${getSkillLabel(skillId)} · ${meta.label}`,
      subtitle: `${events.length} eventi`,
      events,
      skillId,
      metricId: meta.id,
      seriesCacheKey: `analysis-summary-skill|${getSkillChartFiltersCacheToken(scope)}|skill:${skillId}|metric:${meta.id}`
    });
  });
  renderSkillChartCardsChunked(chartGrid, items, { batchSize: 1 });
  wrap.appendChild(chartGrid);
  td.appendChild(wrap);
  tr.appendChild(td);
  elAggSummaryExtraBody.appendChild(tr);
}
