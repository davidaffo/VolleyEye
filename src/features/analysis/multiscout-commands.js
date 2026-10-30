import { invalidateAnalysisCaches } from "./cache-model.js";
import { getReactMultiscoutScope } from "./multiscout-view.js";

import { publishReactMultiscout, publishReactMultiscoutCount } from "./multiscout-view.js";

import {
  getAnalysisExtraMatchState,
  saveAnalysisExtraMatchState,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";

import { setModalOpenState } from "../layout/modals.js";

import { multiscoutStore } from "../../state/roster-import-store.mjs";

import { saveState } from "../storage/save-state.js";

import { renderAnalysisViews } from "./aggregated-table.js";

export function openReactMultiscout() {
  publishReactMultiscout();
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
  publishReactMultiscout();
}

export function resetReactMultiscout() {
  const extra = getAnalysisExtraMatchState();
  extra[getReactMultiscoutScope()] = new Set();
  saveAnalysisExtraMatchState(extra);
  saveState();
  invalidateAnalysisCaches();
  publishReactMultiscoutCount();
  publishReactMultiscout();
  renderAnalysisViews();
}
