import { toggleFilterVisibility, renderDynamicFilter, getCheckedValues } from "./filter-view.js";
import { getAnalysisExtraMatchState, saveAnalysisExtraMatchState, getAnalysisMatchOptions, getTeamFilterOptions, ensureAnalysisTeamFilterDefault, getAnalysisTeamScope, filterEventsByAnalysisTeam } from "./filter-model.js";
import { session } from "../state/analysis-analysis-filters.js";
import { normalizeSetNumber, buildUniqueOptions } from "./values.js";

import { getFilterFields, syncFilterSelections, clearFilterSelections } from './filter-controls.js';

import { session as matchState } from "../../../js/globals.js";
import { publishReactMultiscoutCount, publishReactMultiscout, publishReactVideoPresets } from "./filters.js";
import { readReactFilterSelect } from "./filter-view.js";

import { saveState } from "../storage/save-state.js";


import { session as scoutUiState } from "../state/scout-ui.js";


import { invalidateSkillChartCaches } from "./skill-chart-model.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "./trajectory-rendering.js";

import { renderSecondTable } from "./second-distribution.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { renderVideoAnalysis, focusFirstFilteredVideoEventMobile } from "../video/playback.js";



import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderTrajectoryFilters, renderServeTrajectoryFilters } from "./trajectory-filters.js";



const analysisFiltersState = session;

















































export function resetAnalysisForMatch() {
  // Filters contain roster indices and set numbers belonging to the old match.
  [analysisFiltersState.analysisTeamFilterState, analysisFiltersState.analysisSummaryFilterState, analysisFiltersState.trajectoryFilterState,
    analysisFiltersState.serveTrajectoryFilterState, analysisFiltersState.playerTrajectoryFilterState, analysisFiltersState.playerServeTrajectoryFilterState,
    analysisFiltersState.secondFilterState, analysisFiltersState.playerSecondFilterState, analysisFiltersState.videoFilterState].forEach(filters => {
    Object.values(filters).forEach(value => { if (value instanceof Set) value.clear(); });
    if ("prevSkill" in filters) filters.prevSkill = "any";
  });
  analysisFiltersState.activeVideoFilterPresetId = null;
  scoutUiState.aggTableView = { mode: "summary", skillId: null, playerIdx: null };
  ensureAnalysisTeamFilterDefault();
  invalidateAnalysisCaches();
}

export function invalidateAnalysisCaches() {
  scoutUiState.analysisStatsCache = null;
  scoutUiState.analysisStatsScope = null;
  scoutUiState.analysisEventsCache = null;
  scoutUiState.analysisEventsCacheKey = "";
  scoutUiState.analysisEventsCacheRevision += 1;
  invalidateSkillChartCaches();
}

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

publishReactMultiscout();return;
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

export function ensureVideoFilterPresetsState() {
  if (!Array.isArray(matchState.state.videoFilterPresets)) {
    matchState.state.videoFilterPresets = [];
  }
  return matchState.state.videoFilterPresets;
}

export function getActiveVideoFilterPresetName() {
  if (!analysisFiltersState.activeVideoFilterPresetId) return "";
  const activePreset = ensureVideoFilterPresetsState().find(entry => entry.id === analysisFiltersState.activeVideoFilterPresetId);
  return activePreset ? String(activePreset.name || "").trim() : "";
}

export function listFromSet(setObj, { asNumber = false } = {}) {
  const arr = Array.from(setObj || []);
  return asNumber ? arr.map(v => Number(v)).filter(Number.isFinite) : arr.map(v => String(v));
}

export function snapshotVideoFilters() {
  return {
    teams: listFromSet(analysisFiltersState.videoFilterState.teams),
    players: listFromSet(analysisFiltersState.videoFilterState.players),
    setters: listFromSet(analysisFiltersState.videoFilterState.setters),
    skills: listFromSet(analysisFiltersState.videoFilterState.skills),
    codes: listFromSet(analysisFiltersState.videoFilterState.codes),
    prevSkill: analysisFiltersState.videoFilterState.prevSkill || "any",
    sets: listFromSet(analysisFiltersState.videoFilterState.sets, { asNumber: true }),
    rotations: listFromSet(analysisFiltersState.videoFilterState.rotations, { asNumber: true }),
    zones: listFromSet(analysisFiltersState.videoFilterState.zones, { asNumber: true }),
    bases: listFromSet(analysisFiltersState.videoFilterState.bases),
    setTypes: listFromSet(analysisFiltersState.videoFilterState.setTypes),
    phases: listFromSet(analysisFiltersState.videoFilterState.phases),
    receiveEvaluations: listFromSet(analysisFiltersState.videoFilterState.receiveEvaluations),
    receiveZones: listFromSet(analysisFiltersState.videoFilterState.receiveZones, { asNumber: true }),
    serveTypes: listFromSet(analysisFiltersState.videoFilterState.serveTypes),
    attackTypes: listFromSet(analysisFiltersState.videoFilterState.attackTypes)
  };
}

export function countActiveVideoFilters(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  let count = 0;
  [
    "teams",
    "players",
    "setters",
    "skills",
    "codes",
    "sets",
    "rotations",
    "zones",
    "bases",
    "setTypes",
    "phases",
    "receiveEvaluations",
    "receiveZones",
    "serveTypes",
    "attackTypes"
  ].forEach(key => {
    const val = snapshot[key];
    if (Array.isArray(val) && val.length > 0) count += 1;
  });
  if (snapshot.prevSkill && snapshot.prevSkill !== "any") count += 1;
  return count;
}

export function applyVideoFilterSnapshot(snapshot) {
  const src = snapshot && typeof snapshot === "object" ? snapshot : {};
  const toNumSet = list => new Set((Array.isArray(list) ? list : []).map(v => Number(v)).filter(Number.isFinite));
  const toStrSet = list => new Set((Array.isArray(list) ? list : []).map(v => String(v)));
  analysisFiltersState.videoFilterState.teams = toStrSet(src.teams);
  analysisFiltersState.videoFilterState.players = toStrSet(src.players);
  analysisFiltersState.videoFilterState.setters = toStrSet(src.setters);
  analysisFiltersState.videoFilterState.skills = toStrSet(src.skills);
  analysisFiltersState.videoFilterState.codes = toStrSet(src.codes);
  analysisFiltersState.videoFilterState.prevSkill = src.prevSkill || "any";
  analysisFiltersState.videoFilterState.sets = toNumSet(src.sets);
  analysisFiltersState.videoFilterState.rotations = toNumSet(src.rotations);
  analysisFiltersState.videoFilterState.zones = toNumSet(src.zones);
  analysisFiltersState.videoFilterState.bases = toStrSet(src.bases);
  analysisFiltersState.videoFilterState.setTypes = toStrSet(src.setTypes);
  analysisFiltersState.videoFilterState.phases = toStrSet(src.phases);
  analysisFiltersState.videoFilterState.receiveEvaluations = toStrSet(src.receiveEvaluations);
  analysisFiltersState.videoFilterState.receiveZones = toNumSet(src.receiveZones);
  analysisFiltersState.videoFilterState.serveTypes = toStrSet(src.serveTypes);
  analysisFiltersState.videoFilterState.attackTypes = toStrSet(src.attackTypes);
}

export function renderVideoFilterPresets() {

publishReactVideoPresets();return;
}

export function saveCurrentVideoFilterPreset(nameOverride) {
  const presets = ensureVideoFilterPresetsState();
  const rawName = typeof nameOverride === "string" ? nameOverride.trim() : scoutUiState.elVideoFilterPresetName ? String(scoutUiState.elVideoFilterPresetName.value || "").trim() : "";
  const name = rawName || ("Preset " + (presets.length + 1));
  const entry = {
    id: "vf_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
    name,
    filters: snapshotVideoFilters()
  };
  presets.push(entry);

  saveState({ persistLocal: true });
  renderVideoFilterPresets();
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
