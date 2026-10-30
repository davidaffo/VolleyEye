import { invalidateAnalysisCaches } from "./cache-model.js";
import { getReactMultiscoutScope } from "./multiscout-view.js";

import {
  updateMultiscoutButton,
  renderMultiscoutModal,
} from "./analysis-filters.js";

import {
  getAnalysisExtraMatchState,
  saveAnalysisExtraMatchState,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";

import { setModalOpenState } from "../layout/modals.js";

import { multiscoutStore } from "../../state/roster-import-store.mjs";

import { saveState } from "../storage/save-state.js";

import { renderAggregatedTable } from "./aggregated-table.js";
import {
  renderTrajectoryAnalysis,
  renderServeTrajectoryAnalysis,
} from "./trajectory-rendering.js";
import { renderSecondTable } from "./second-distribution.js";
import { renderPlayerAnalysis } from "./skill-tables.js";

export function openReactMultiscout() {
  renderMultiscoutModal();
  multiscoutStore.publish({ open: true });
  setModalOpenState(true, true);
}

export function closeReactMultiscout() {
  multiscoutStore.publish({ open: false });
  setModalOpenState(false, true);
}

export function changeReactMultiscoutScope(value) {
  analysisFiltersState.multiscoutTeamScope =
    value === "opponent" ? "opponent" : "our";
  renderMultiscoutModal();
}

export function resetReactMultiscout() {
  const extra = getAnalysisExtraMatchState();
  extra[getReactMultiscoutScope()] = new Set();
  saveAnalysisExtraMatchState(extra);
  saveState();
  invalidateAnalysisCaches();
  updateMultiscoutButton();
  renderMultiscoutModal();
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
}
