import { renderAnalysisMatchFilter } from "./shared-filter-view.js";
import { getFilterControlIds } from "../../domain/analysis-filter-schema.js";

import { getCheckedValues } from "./filter-view.js";
import { getAnalysisExtraMatchState, saveAnalysisExtraMatchState, getAnalysisTeamScope, ensureCourtSideState, getAnalysisCourtSide } from "./filter-model.js";
import { session } from "../state/analysis-analysis-filters.js";

import { getFilterFields, syncFilterSelections, clearFilterSelections } from "./filter-controls.js";

import { publishReactMultiscoutCount, publishReactMultiscout } from "./multiscout-view.js";
import { getCheckedRadioValue, readReactFilterSelect } from "./filter-view.js";

import { saveState } from "../storage/save-state.js";



import { invalidateAnalysisCaches, invalidateSkillChartCaches } from "./cache-model.js";
import { renderAnalysisViews, renderAggregatedTable } from "./aggregated-table.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "./trajectory-rendering.js";

import { renderPlayerAnalysis } from "./skill-tables.js";
import { renderVideoAnalysis, focusFirstFilteredVideoEventMobile } from "../video/playback.js";


import { renderTrajectoryFilters, renderServeTrajectoryFilters } from "./trajectory-filters.js";

const analysisFiltersState = session;

export function handleAnalysisMatchFilterChange() {

  updateAnalysisExtraMatchesFromFilter("analysis-filter-matches");
}

export function handleAnalysisTeamFilterChange(e) {

  const values = getCheckedValues("analysis-filter-teams");
  analysisFiltersState.analysisTeamFilterState.teams = new Set(values);
  renderAnalysisMatchFilter();
  publishReactMultiscout();
  invalidateAnalysisCaches();
  renderAnalysisViews();
}

export function handleAnalysisSummarySetFilterChange() {

  analysisFiltersState.analysisSummaryFilterState.sets = new Set(getCheckedValues("analysis-filter-sets", { asNumber: true }));
  invalidateSkillChartCaches();
  renderAggregatedTable();
  renderPlayerAnalysis();
}

export function handleVideoTeamFilterChange(e) {

  const values = getCheckedValues("video-filter-teams");
  analysisFiltersState.videoFilterState.teams = new Set(values);
  renderVideoAnalysis();
}

export function updateAnalysisExtraMatchesFromFilter(filterId, scopeOverride) {
  if (!filterId) return;
  const scope = scopeOverride || getAnalysisTeamScope();
  const extraState = getAnalysisExtraMatchState();
  extraState[scope] = new Set(getCheckedValues(filterId));
  saveAnalysisExtraMatchState(extraState);
  saveState();
  invalidateAnalysisCaches();
  publishReactMultiscoutCount();
  renderAnalysisViews();
}

export function syncTrajectoryFilterState() {
  syncFilterSelections(analysisFiltersState.trajectoryFilterState, getFilterFields('trajectoryFilterState'));
  analysisFiltersState.trajectoryFilterState.prevSkill = (readReactFilterSelect("traj-filter-prev")) || "any";
}

export function syncServeTrajectoryFilterState() {
  syncFilterSelections(analysisFiltersState.serveTrajectoryFilterState, getFilterFields('serveTrajectoryFilterState'));
}

export function syncVideoFilterState() {
  const controlIds = getFilterControlIds("videoFilterState");
  syncFilterSelections(analysisFiltersState.videoFilterState, getFilterFields('videoFilterState'));
  analysisFiltersState.videoFilterState.prevSkill = (readReactFilterSelect(controlIds.prev)) || "any";

}

export function handleTrajectoryFilterChange() {
  syncTrajectoryFilterState();
  renderTrajectoryAnalysis();
}

export function handleServeTrajectoryFilterChange() {
  syncServeTrajectoryFilterState();
  renderServeTrajectoryAnalysis();
}

export function handleVideoFilterChange() {
  analysisFiltersState.activeVideoFilterPresetId = null;
  syncVideoFilterState();
  renderVideoAnalysis();
  focusFirstFilteredVideoEventMobile();
}

export function resetTrajectoryFilters() {
  clearFilterSelections(analysisFiltersState.trajectoryFilterState);
  renderTrajectoryFilters();
  renderTrajectoryAnalysis();
}

export function resetServeTrajectoryFilters() {
  clearFilterSelections(analysisFiltersState.serveTrajectoryFilterState);
  renderServeTrajectoryFilters();
  renderServeTrajectoryAnalysis();
}

export function resetVideoFilters() {
  analysisFiltersState.activeVideoFilterPresetId = null;
  clearFilterSelections(analysisFiltersState.videoFilterState);
  renderVideoAnalysis();
  focusFirstFilteredVideoEventMobile();
}

export function changeTrajectoryCourtSide(kind) {
  const serve = kind === "serve";
  const scope = getAnalysisTeamScope();
  const nextState = ensureCourtSideState(serve ? "uiServeTrajectoryCourtSideByScope" : "uiTrajectoryCourtSideByScope");
  const container = serve ? "serve-traj-court-side" : "traj-court-side";
  nextState[scope] = getAnalysisCourtSide(getCheckedRadioValue(container));
  saveState();
  if (serve) renderServeTrajectoryAnalysis();
  else renderTrajectoryAnalysis();
}

export function runAnalysisFilterAction({ command, args = [] }, event) {
  if (!Object.hasOwn(analysisFilterCommands, command)) throw new Error("Unknown analysis filter action: " + command);
  return analysisFilterCommands[command](...args, event);
}

const analysisFilterCommands = Object.freeze({
  handleTrajectoryFilterChange,
  handleServeTrajectoryFilterChange,
  handleVideoFilterChange,
  handleVideoTeamFilterChange,
  changeTrajectoryCourtSide,
  handleAnalysisTeamFilterChange,
  handleAnalysisMatchFilterChange,
  handleAnalysisSummarySetFilterChange,
  changeMultiscoutMatches: (scope) => updateAnalysisExtraMatchesFromFilter("multiscout-list", scope),
});
