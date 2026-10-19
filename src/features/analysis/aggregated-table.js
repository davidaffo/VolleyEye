import { getSkillChartToneColors } from "./chart-theme.js";
import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
import { session as scoutUiState } from "../state/scout-ui.js";

import { session as rosterLineupState } from "../state/roster-lineup.js";
import { aggregatedTableStore } from "../../state/roster-import-store.mjs";
import { buildReactAggregatedTable } from "./summary-model.js";
import {
  renderAnalysisTeamFilter,
  renderAnalysisSummarySetFilter,
} from "./analysis-filters.js";
import {
  isAggSubtabVisible,
  renderAnalysisSkillChartsPanel,
} from "./skill-analysis.js";
import {
  renderSetTrendAnalysis,
  renderPlayByPlayAnalysis,
} from "../live/score-analysis.js";
import { renderMatchSheetAnalysis } from "./match-sheet.js";
import { renderScoreAndRotations } from "../live/live-score-and-set.js";
import { renderSecondTable } from "./second-distribution.js";
import {
  renderTrajectoryAnalysis,
  renderServeTrajectoryAnalysis,
} from "./trajectory-rendering.js";

export function renderAggregatedTable() {
  if (!rosterLineupState.elAggTableBody) return;
  renderAnalysisTeamFilter();
  renderAnalysisSummarySetFilter();
  if (isAggSubtabVisible("set-trend")) renderSetTrendAnalysis();
  if (isAggSubtabVisible("play-by-play")) renderPlayByPlayAnalysis();
  if (isAggSubtabVisible("match-sheet")) renderMatchSheetAnalysis();
  if (isAggSubtabVisible("skill-charts")) renderAnalysisSkillChartsPanel();
  let chartTones;
  if (
    scoutUiState.aggTableView.mode === "skill" &&
    !skillAnalysisState.skillChartRenderPaused
  ) {
    skillAnalysisState.skillChartToneColorCache = null;
    chartTones = getSkillChartToneColors();
  }
  const { view, summary, scope, events } = buildReactAggregatedTable({
    chartTones,
  });
  aggregatedTableStore.publish(view);
  renderScoreAndRotations(summary, scope, { events });
  renderSecondTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}
