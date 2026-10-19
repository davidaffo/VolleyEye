import { ensurePlayByPlayUiState } from "./timeline-model.js";
import { saveState } from "../storage/save-state.js";
import { renderPlayByPlayAnalysis } from "../live/score-analysis.js";

import { session as scoutUiState } from "../state/scout-ui.js";
import { renderSetTrendAnalysis } from "../live/score-analysis.js";
export function selectReactSetTrendPoint(key) {
  scoutUiState.setTrendSelectionKey = key;
  renderSetTrendAnalysis();
}

export function changeReactPlayByPlaySet(value) {
  ensurePlayByPlayUiState().set = value || "";
  saveState({ persistLocal: true });
  renderPlayByPlayAnalysis();
}
