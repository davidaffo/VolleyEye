
import { toggleFilterVisibility, renderDynamicFilter, getCheckedValues } from "./filter-view.js";
import { getAnalysisExtraMatchState, saveAnalysisExtraMatchState, getAnalysisMatchOptions, getTeamFilterOptions, ensureAnalysisTeamFilterDefault, getAnalysisTeamScope, filterEventsByAnalysisTeam } from "./filter-model.js";
import { session } from "../state/analysis-analysis-filters.js";
import { normalizeSetNumber, buildUniqueOptions } from "./values.js";

import { getFilterFields, syncFilterSelections, clearFilterSelections } from './filter-controls.js';


import { publishReactMultiscoutCount, publishReactMultiscout } from "./multiscout-view.js";
import { publishReactVideoPresets } from "./video-preset-view.js";
import { readReactFilterSelect } from "./filter-view.js";

import { saveState } from "../storage/save-state.js";


import { session as scoutUiState } from "../state/scout-ui.js";


import { invalidateAnalysisCaches, invalidateSkillChartCaches } from "./cache-model.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "./trajectory-rendering.js";

import { renderSecondTable } from "./second-distribution.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { renderVideoAnalysis, focusFirstFilteredVideoEventMobile } from "../video/playback.js";



import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderTrajectoryFilters, renderServeTrajectoryFilters } from "./trajectory-filters.js";



const analysisFiltersState = session;

















































export function handleAnalysisMatchFilterChange() {
  if (!scoutUiState.elAnalysisFilterMatches) return;
  updateAnalysisExtraMatchesFromContainer(scoutUiState.elAnalysisFilterMatches);
}

export function handleAnalysisTeamFilterChange(e) {
  if (!scoutUiState.elAnalysisFilterTeams) return;
  if (e && e.target instanceof HTMLInputElement && e.target.checked) {
    scoutUiState.elAnalysisFilterTeams.querySelectorAll("input[type=checkbox]").forEach(inp => {
      if (inp !== e.target) inp.checked = false;
    });
  }
  const values = getCheckedValues(scoutUiState.elAnalysisFilterTeams);
  analysisFiltersState.analysisTeamFilterState.teams = new Set(values);
  renderAnalysisMatchFilter();
  renderMultiscoutModal();
  invalidateAnalysisCaches();
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
}

export function handleAnalysisSummarySetFilterChange() {
  if (!scoutUiState.elAnalysisFilterSets) return;
  analysisFiltersState.analysisSummaryFilterState.sets = new Set(getCheckedValues(scoutUiState.elAnalysisFilterSets, { asNumber: true }));
  invalidateSkillChartCaches();
  renderAggregatedTable();
  renderPlayerAnalysis();
}

export function handleVideoTeamFilterChange(e) {
  if (!scoutUiState.elVideoFilterTeams) return;
  const values = getCheckedValues(scoutUiState.elVideoFilterTeams);
  analysisFiltersState.videoFilterState.teams = new Set(values);
  renderVideoAnalysis();
}

export function renderAnalysisTeamFilter() {
  if (!scoutUiState.elAnalysisFilterTeams) return;
  ensureAnalysisTeamFilterDefault();
  const options = getTeamFilterOptions();
  analysisFiltersState.analysisTeamFilterState.teams = new Set(
    [...analysisFiltersState.analysisTeamFilterState.teams].filter(val => options.some(opt => opt.value === val))
  );
  const visible = renderDynamicFilter(scoutUiState.elAnalysisFilterTeams, options, analysisFiltersState.analysisTeamFilterState.teams, {
    onChange: handleAnalysisTeamFilterChange
  });
  toggleFilterVisibility(scoutUiState.elAnalysisFilterTeams, visible);
  renderAnalysisMatchFilter();
}

export function renderAnalysisMatchFilter() {
  if (!scoutUiState.elAnalysisFilterMatches) {
    updateMultiscoutButton();
    return;
  }
  const scope = getAnalysisTeamScope();
  const options = getAnalysisMatchOptions(scope);
  const extraState = getAnalysisExtraMatchState();
  const selected = extraState[scope] || new Set();
  const filtered = new Set([...selected].filter(key => options.some(opt => opt.value === key)));
  extraState[scope] = filtered;
  saveAnalysisExtraMatchState(extraState);
  const visible = renderDynamicFilter(scoutUiState.elAnalysisFilterMatches, options, filtered, {
    onChange: handleAnalysisMatchFilterChange
  });
  toggleFilterVisibility(scoutUiState.elAnalysisFilterMatches, visible);
  updateMultiscoutButton();
}

export function updateMultiscoutButton() {

publishReactMultiscoutCount();return;
}

export function updateAnalysisExtraMatchesFromContainer(container, scopeOverride) {
  if (!container) return;
  const scope = scopeOverride || getAnalysisTeamScope();
  const extraState = getAnalysisExtraMatchState();
  extraState[scope] = new Set(getCheckedValues(container));
  saveAnalysisExtraMatchState(extraState);
  saveState();
  invalidateAnalysisCaches();
  updateMultiscoutButton();
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
}

export function renderMultiscoutModal() {

publishReactMultiscout(updateAnalysisExtraMatchesFromContainer);return;
}

export function renderAnalysisSummarySetFilter() {
  if (!scoutUiState.elAnalysisFilterSets) return;
  const events = filterEventsByAnalysisTeam();
  const setOpts = buildUniqueOptions(events.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  analysisFiltersState.analysisSummaryFilterState.sets = new Set(
    [...analysisFiltersState.analysisSummaryFilterState.sets].filter(val => setOpts.some(opt => Number(opt.value) === val))
  );
  const visible = renderDynamicFilter(scoutUiState.elAnalysisFilterSets, setOpts, analysisFiltersState.analysisSummaryFilterState.sets, {
    onChange: handleAnalysisSummarySetFilterChange
  });
  toggleFilterVisibility(scoutUiState.elAnalysisFilterSets, visible);
}































export function syncTrajectoryFilterState() {
  syncFilterSelections(analysisFiltersState.trajectoryFilterState, getFilterFields('trajectoryFilterState'));
  analysisFiltersState.trajectoryFilterState.prevSkill = (readReactFilterSelect(rosterLineupState.elTrajFilterPrev)) || "any";
}

export function syncServeTrajectoryFilterState() {
  syncFilterSelections(analysisFiltersState.serveTrajectoryFilterState, getFilterFields('serveTrajectoryFilterState'));
}

export function syncVideoFilterState() {
  const els = getVideoFilterElements();
  if (!els) return;
  syncFilterSelections(analysisFiltersState.videoFilterState, getFilterFields('videoFilterState', els));
  analysisFiltersState.videoFilterState.prevSkill = (readReactFilterSelect(els.prev)) || "any";

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

export function getVideoFilterElements() {
  const wrap = document.getElementById("video-filters");
  const players = document.getElementById("video-filter-players");
  if (!players) return null;
  return {
    wrap,
    teams: document.getElementById("video-filter-teams"),
    players,
    setters: document.getElementById("video-filter-setters"),
    skills: document.getElementById("video-filter-skills"),
    codes: document.getElementById("video-filter-codes"),
    prev: document.getElementById("video-filter-prev"),
    sets: document.getElementById("video-filter-sets"),
    rotations: document.getElementById("video-filter-rotations"),
    zones: document.getElementById("video-filter-zones"),
    bases: document.getElementById("video-filter-bases"),
    setTypes: document.getElementById("video-filter-set-types"),
    phases: document.getElementById("video-filter-phases"),
    receiveEvals: document.getElementById("video-filter-receive-evals"),
    receiveZones: document.getElementById("video-filter-receive-zones"),
    serveTypes: document.getElementById("video-filter-serve-types"),
    attackTypes: document.getElementById("video-filter-attack-types"),
    reset: document.getElementById("video-filter-reset")
  };
}













export function renderVideoFilterPresets() {

publishReactVideoPresets();return;
}



export function getSecondFilterElements() {
  const setters = document.getElementById("second-filter-setters");
  if (!setters) return null;
  return {
    setters,
    players: document.getElementById("second-filter-players"),
    codes: document.getElementById("second-filter-codes"),
    zones: document.getElementById("second-filter-zones"),
    setTypes: document.getElementById("second-filter-set-types"),
    bases: document.getElementById("second-filter-bases"),
    phases: document.getElementById("second-filter-phases"),
    receiveEvals: document.getElementById("second-filter-receive-evals"),
    receiveZones: document.getElementById("second-filter-receive-zones"),
    sets: document.getElementById("second-filter-sets"),
    prev: document.getElementById("second-filter-prev"),
    reset: document.getElementById("second-filter-reset")
  };
}
