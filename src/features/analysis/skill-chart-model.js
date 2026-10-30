import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
import { computeMetrics, getSkillChartCodeTone } from "./metrics.js";
import { normalizeSetNumber } from "./values.js";
import { SKILLS, session as matchState } from "../../../js/globals.js";
import { emptyCounts, formatPercent } from "../../domain/counts.js";
import {
  getTeamScopeFromEvent,
  getPlayersForScope,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { resolvePlayerIdx } from "../events/player-links.js";
import { formatNameWithNumberFor } from "../teams/roster-data.js";
import {
  getAnalysisTeamScope,
  getAnalysisExtraMatchState,
  getCurrentMatchKey,
  getCurrentMatchLabel,
  getAnalysisEvents,
  matchesSummarySetFilter,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
export function getSkillChartMetricMeta(metricId) {
  return (
    skillAnalysisState.SKILL_CHART_METRICS.find((m) => m.id === metricId) ||
    skillAnalysisState.SKILL_CHART_METRICS[0]
  );
}

export function getSkillChartEventPlayerLabel(ev) {
  if (!ev) return "";
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope) || [];
  const numbers = getPlayerNumbersForScope(scope);
  const idx = resolvePlayerIdx(ev);
  const name =
    ev.playerName || (typeof idx === "number" ? players[idx] : "") || "";
  if (!name) return "";
  return formatNameWithNumberFor(name, numbers) || name;
}

export function ensureSkillChartsUiState() {
  if (
    !matchState.state.uiSkillCharts ||
    typeof matchState.state.uiSkillCharts !== "object"
  ) {
    matchState.state.uiSkillCharts = {
      globalMetric: "eff",
      playerMetric: "eff",
      modalMetric: "eff",
    };
  }
  const ui = matchState.state.uiSkillCharts;
  if (
    !skillAnalysisState.SKILL_CHART_METRICS.some(
      (m) => m.id === ui.globalMetric,
    )
  )
    ui.globalMetric = "eff";
  if (
    !skillAnalysisState.SKILL_CHART_METRICS.some(
      (m) => m.id === ui.playerMetric,
    )
  )
    ui.playerMetric = "eff";
  if (
    !skillAnalysisState.SKILL_CHART_METRICS.some((m) => m.id === ui.modalMetric)
  )
    ui.modalMetric = "eff";
  return ui;
}

export function getSkillChartBaseEvents(scope = getAnalysisTeamScope()) {
  const extraState = getAnalysisExtraMatchState();
  const multiMatchActive = !!(
    extraState &&
    extraState[scope] &&
    extraState[scope].size > 0
  );
  const currentMatchKey = getCurrentMatchKey() || "__current__";
  const currentMatchLabel = getCurrentMatchLabel() || "Match corrente";
  const currentMatchDate =
    (matchState.state.match && matchState.state.match.date) || "";
  const source = getAnalysisEvents();
  return (source || [])
    .filter((ev) => {
      if (!ev) return false;
      if (!matchesSummarySetFilter(ev)) return false;
      if (matchState.state.useOpponentTeam) {
        return getTeamScopeFromEvent(ev) === scope;
      }
      return ev.team !== "opponent";
    })
    .map((ev) => {
      if (!multiMatchActive) return ev;
      const cloned = Object.assign({}, ev);
      if (!cloned.analysisMatchKey) cloned.analysisMatchKey = currentMatchKey;
      if (!cloned.analysisMatchLabel)
        cloned.analysisMatchLabel = currentMatchLabel;
      if (!cloned.analysisMatchDate)
        cloned.analysisMatchDate = currentMatchDate;
      return cloned;
    });
}

export function buildSkillMetricSeries(events, skillId, metricId) {
  const hasMultiMatchData = (events || []).some(
    (ev) => ev && (ev.analysisMatchKey || ev.analysisMatchLabel),
  );
  if (hasMultiMatchData) {
    const grouped = [];
    const byKey = new Map();
    (events || []).forEach((ev) => {
      if (!ev) return;
      const key = String(
        ev.analysisMatchKey || ev.analysisMatchLabel || "__current__",
      );
      if (!byKey.has(key)) {
        const bucket = {
          key,
          label: ev.analysisMatchLabel || key,
          date: (ev.analysisMatchDate || "").trim(),
          events: [],
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
      return String(a.label || a.key || "").localeCompare(
        String(b.label || b.key || ""),
        "it",
        { sensitivity: "base" },
      );
    });
    const series = [];
    grouped.forEach((bucket, idx) => {
      const counts = emptyCounts();
      let codeSum = 0;
      let codeCount = 0;
      bucket.events.forEach((ev) => {
        if (!ev || ev.skillId !== skillId) return;
        if (!ev.code || !scoutUiState.NORMAL_EVAL_CODES.has(ev.code)) return;
        counts[ev.code] = (counts[ev.code] || 0) + 1;
        codeSum += Number(
          skillAnalysisState.SKILL_CHART_CODE_VALUES[ev.code] || 0,
        );
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
        if ((metrics.positiveCount || 0) > (metrics.negativeCount || 0))
          tone = "positive";
        else if ((metrics.negativeCount || 0) > (metrics.positiveCount || 0))
          tone = "negative";
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
        labelValue,
      });
    });
    return series;
  }
  const series = [];
  const counts = emptyCounts();
  (events || []).forEach((ev, idx) => {
    if (!ev || ev.skillId !== skillId) return;
    if (!ev.code || !scoutUiState.NORMAL_EVAL_CODES.has(ev.code)) return;
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
      y = Number(skillAnalysisState.SKILL_CHART_CODE_VALUES[ev.code] || 0);
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
      playerLabel: getSkillChartEventPlayerLabel(ev),
    });
  });
  return series;
}

export function getSkillChartLayout(series, metricMeta) {
  const width = 420;
  const height = 320;
  const pad = { top: 18, right: 22, bottom: 30, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  let minY = Math.min(...series.map((p) => p.y));
  let maxY = Math.max(...series.map((p) => p.y));
  if (metricMeta.kind === "percent") {
    if (metricMeta.id === "eff") {
      const absMax = Math.max(
        5,
        Math.ceil(Math.max(Math.abs(minY || 0), Math.abs(maxY || 0)) / 5) * 5,
      );
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
  const xToPx = (x) => {
    const t = (x - 1) / Math.max(1, series.length - 1);
    return pad.left + pointInsetX + t * Math.max(0, plotW - pointInsetX * 2);
  };
  const yToPx = (y) => {
    const t = (y - minY) / (maxY - minY);
    return (
      pad.top + pointInsetY + (1 - t) * Math.max(0, plotH - pointInsetY * 2)
    );
  };
  return { width, height, pad, plotW, plotH, minY, maxY, xToPx, yToPx };
}

export function withAlpha(color, alpha = 1) {
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

export function collectSkillChartEventsBySkill(
  events,
  { playerIdx = null } = {},
) {
  const bySkill = {};
  SKILLS.forEach((skill) => {
    bySkill[skill.id] = [];
  });
  (events || []).forEach((ev) => {
    if (!ev || !ev.skillId || !bySkill[ev.skillId]) return;
    if (!scoutUiState.NORMAL_EVAL_CODES.has(ev.code)) return;
    if (
      playerIdx !== null &&
      playerIdx !== undefined &&
      Number(ev.playerIdx) !== Number(playerIdx)
    )
      return;
    bySkill[ev.skillId].push(ev);
  });
  return bySkill;
}

export function deferSkillChartRenderWhilePaused() {
  if (!skillAnalysisState.skillChartRenderPaused) return false;
  skillAnalysisState.skillChartRenderRefreshPending = true;
  return true;
}

export function getSkillChartFiltersCacheToken(scope = getAnalysisTeamScope()) {
  const sets = Array.from(
    (analysisFiltersState.analysisSummaryFilterState &&
      analysisFiltersState.analysisSummaryFilterState.sets) ||
      [],
  )
    .map((v) => String(v))
    .sort()
    .join(",");
  const extraState = getAnalysisExtraMatchState();
  const extraMatches = Array.from((extraState && extraState[scope]) || [])
    .sort()
    .join(",");
  const currentMatch = getCurrentMatchKey() || "";
  return `rev:${skillAnalysisState.skillChartCacheRevision}|scope:${scope}|sets:${sets}|extra:${extraMatches}|cur:${currentMatch}`;
}

export function getSkillMetricSeriesCached(
  events,
  skillId,
  metricId,
  seriesCacheKey = "",
) {
  if (!seriesCacheKey) return buildSkillMetricSeries(events, skillId, metricId);
  const key = `${seriesCacheKey}|skill:${skillId}|metric:${metricId}`;
  const cached = skillAnalysisState.skillChartSeriesCache.get(key);
  if (cached) return cached.map((p) => Object.assign({}, p));
  const series = buildSkillMetricSeries(events, skillId, metricId);
  skillAnalysisState.skillChartSeriesCache.set(
    key,
    series.map((p) => Object.assign({}, p)),
  );
  return series;
}

export function buildAnalysisSkillChartEvents({
  scope,
  skillId,
  playerIdx = null,
} = {}) {
  return getSkillChartBaseEvents(scope).filter((ev) => {
    if (!ev || ev.skillId !== skillId) return false;
    if (!scoutUiState.NORMAL_EVAL_CODES.has(ev.code)) return false;
    if (playerIdx === null || playerIdx === undefined) return true;
    return Number(ev.playerIdx) === Number(playerIdx);
  });
}
