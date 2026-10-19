import { buildPlayerSkillChartModels } from "./chart-model.js";
import { getSkillChartToneColors } from "./chart-theme.js";

import { buildReactSkillChartModel } from "./chart-model.js";
import { session } from "../state/analysis-charts-view.js";
import { SKILLS, RESULT_CODES } from "../../../js/globals.js";

import {
  ensureSkillChartsUiState,
  collectSkillChartEventsBySkill,
  getSkillChartBaseEvents,
  getSkillChartFiltersCacheToken,
  buildAnalysisSkillChartEvents,
  deferSkillChartRenderWhilePaused,
} from "./skill-chart-model.js";
import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
import { computeMetrics } from "./metrics.js";
import { getAnalysisTeamScope } from "./filter-model.js";
import { analysisChartStore } from "../../state/analysis-chart-store.mjs";
import { session as matchState } from "../../../js/globals.js";

import {
  getSkillLabel,
  getAggSkillCounts,
  getAggSkillPlayerLabel,
} from "./player-model.js";
import {
  getPlayersForScope,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import { ensureAnalysisStatsCache } from "./score-model.js";
import { formatPercent, formatPercentValue } from "../../domain/counts.js";

const chartsViewState = session;

export function publishReactGlobalSkillCharts() {
  skillAnalysisState.skillChartToneColorCache = null;
  const ui = ensureSkillChartsUiState(),
    metricId = ui.globalMetric || "eff",
    scope = getAnalysisTeamScope(),
    eventsBySkill = collectSkillChartEventsBySkill(
      getSkillChartBaseEvents(scope),
    ),
    baseCacheKey = `analysis-global|${getSkillChartFiltersCacheToken(scope)}|metric:${metricId}`;
  analysisChartStore.publish("global", {
    metric: metricId,
    empty: "",
    charts: Object.freeze(
      SKILLS.map((skill) => {
        const events = eventsBySkill[skill.id] || [];
        return buildReactSkillChartModel({
          tones: getSkillChartToneColors(),
          title: getSkillLabel(skill.id),
          subtitle: `${events.length} eventi`,
          events,
          skillId: skill.id,
          metricId,
          seriesCacheKey: `${baseCacheKey}|${skill.id}`,
        });
      }),
    ),
  });
}

export function publishReactPlayerSkillCharts(playerIdx) {
  skillAnalysisState.skillChartToneColorCache = null;
  const scope = getAnalysisTeamScope(),
    players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    playerName = players?.[playerIdx] || "",
    metricId = ensureSkillChartsUiState().playerMetric || "eff";
  if (playerIdx === null || !playerName) {
    analysisChartStore.publish("player", {
      metric: metricId,
      charts: [],
      empty:
        playerIdx === null
          ? "Seleziona una giocatrice per vedere i grafici skill."
          : "Giocatrice non disponibile.",
    });
    return;
  }
  const label =
    scope === "opponent"
      ? formatNameWithNumberFor(playerName, numbers)
      : formatNameWithNumber(playerName);
  analysisChartStore.publish("player", {
    metric: metricId,
    empty: "",
    charts: Object.freeze(
      buildPlayerSkillChartModels({
        scope,
        playerIdx,
        label,
        metricId,
        tones: getSkillChartToneColors(),
      }),
    ),
  });
}

export function publishReactAggSkillModal(skillId, playerIdx) {
  ensureAnalysisStatsCache();
  chartsViewState.reactAggSkillContext = { skillId, playerIdx };
  const counts = getAggSkillCounts(skillId, playerIdx),
    metrics = computeMetrics(counts, skillId),
    items = [
      { label: "Totale", value: metrics.total },
      { label: "Positivi", value: metrics.positiveCount },
      { label: "Negativi", value: metrics.negativeCount },
    ];
  for (const [label, field] of [
    ["Prf", "prf"],
    ["Pos", "pos"],
    ["Eff", "eff"],
  ])
    if (metrics[field] !== null)
      items.push({ label, value: formatPercent(metrics[field]) });
  const codes = (
    matchState.state.metricsConfig[skillId]?.activeCodes || RESULT_CODES
  ).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  const ordered = codes
    .filter((code) => code !== "/" && code !== "=")
    .concat("/", "=");
  const metricId = ensureSkillChartsUiState().modalMetric || "eff",
    scope = getAnalysisTeamScope(),
    events = buildAnalysisSkillChartEvents({
      scope,
      skillId,
      playerIdx: playerIdx === "team" ? null : playerIdx,
    });
  skillAnalysisState.skillChartToneColorCache = null;
  analysisChartStore.publish("modal", {
    title: getSkillLabel(skillId) + " · " + getAggSkillPlayerLabel(playerIdx),
    items: Object.freeze(items.map(Object.freeze)),
    codes: Object.freeze(
      ordered.map((code) =>
        Object.freeze({
          code,
          count: counts[code] || 0,
          percent: formatPercentValue(counts[code] || 0, metrics.total),
        }),
      ),
    ),
    metric: metricId,
    chart: deferSkillChartRenderWhilePaused()
      ? null
      : buildReactSkillChartModel({
          tones: getSkillChartToneColors(),
          title: getSkillLabel(skillId),
          subtitle: `${events.length} eventi`,
          events,
          skillId,
          metricId,
          seriesCacheKey: `analysis-modal|${getSkillChartFiltersCacheToken(scope)}|skill:${skillId}|player:${playerIdx}|metric:${metricId}`,
        }),
  });
}

export function setReactAggSkillOpen(open) {
  analysisChartStore.publish("modal", { open });
}
