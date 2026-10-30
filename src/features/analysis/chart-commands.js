import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
import { session as chartsViewState } from "../state/analysis-charts-view.js";
import { ensureSkillChartsUiState } from "./skill-chart-model.js";
import { renderAnalysisSkillChartsPanel, renderPlayerAnalysisSkillCharts } from "./skill-analysis.js";
import { publishReactAggSkillModal } from "./charts-view.js";

export function changeReactChartMetric(kind, value) {
  if (
    !skillAnalysisState.SKILL_CHART_METRICS.some(
      (metric) => metric.id === value,
    )
  )
    return;
  const ui = ensureSkillChartsUiState();
  if (kind === "global") {
    ui.globalMetric = value;
    renderAnalysisSkillChartsPanel();
  } else if (kind === "player") {
    ui.playerMetric = value;
    renderPlayerAnalysisSkillCharts();
  } else if (kind === "modal" && chartsViewState.reactAggSkillContext) {
    ui.modalMetric = value;
    publishReactAggSkillModal(
      chartsViewState.reactAggSkillContext.skillId,
      chartsViewState.reactAggSkillContext.playerIdx,
    );
  }
}
