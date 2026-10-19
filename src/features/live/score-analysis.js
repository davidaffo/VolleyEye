import { session as scoutUiState } from "../state/scout-ui.js";

import { isAggSubtabVisible } from "../analysis/skill-analysis.js";
import { publishReactSetTrend } from "../analysis/set-trend-view.js";
import { publishReactPlayByPlay } from "../analysis/play-by-play-view.js";

export function renderSetTrendAnalysis() {
  if (!scoutUiState.elSetTrendGrid) return;
  if (!isAggSubtabVisible("set-trend")) return;

  return publishReactSetTrend();
}

export function renderPlayByPlayAnalysis() {
  if (!scoutUiState.elAnalysisPlayByPlay) return;
  if (!isAggSubtabVisible("play-by-play")) return;

  return publishReactPlayByPlay();
}
