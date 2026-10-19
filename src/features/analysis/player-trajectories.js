import { getFilteredPlayerAttackSummaryEventsForPlayer } from "./player-trajectory-model.js";
import { buildAttackTypeFilterOptions } from "./trajectory-model.js";
import { buildEventFilterOptions } from "./filter-controls.js";
import { getAttackStartZone } from "./values.js";

import {
  getFilterFields,
  syncFilterSelections,
  clearFilterSelections,
  buildAdvancedFilterOptions,
  renderFilterControls,
} from "./filter-controls.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { getAnalysisEvents, matchesTeamFilter } from "./filter-model.js";
import { toggleFilterVisibility } from "./filter-view.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { session as matchState } from "../../../js/globals.js";
import {
  readReactFilterSelect,
  publishReactPreviousSkill,
} from "./filter-view.js";
import { getPlayerAnalysisPlayerIdx } from "./player-model.js";

import { renderAttackMetricsSummary } from "./trajectory-rendering.js";
import { getServeStartZone } from "./trajectory-model.js";

import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import {
  publishReactPlayerAttackGrid,
  publishReactPlayerServeGrid,
} from "./trajectory-view.js";

export function syncPlayerTrajectoryFilterState() {
  syncFilterSelections(
    analysisFiltersState.playerTrajectoryFilterState,
    getFilterFields("playerTrajectoryFilterState"),
  );
  analysisFiltersState.playerTrajectoryFilterState.prevSkill =
    readReactFilterSelect(rosterLineupState.elPlayerTrajFilterPrev) || "any";
}

export function handlePlayerTrajectoryFilterChange() {
  syncPlayerTrajectoryFilterState();
  renderPlayerTrajectoryAnalysis();
}

export function resetPlayerTrajectoryFilters() {
  clearFilterSelections(analysisFiltersState.playerTrajectoryFilterState);
  renderPlayerTrajectoryFilters();
  renderPlayerTrajectoryAnalysis();
}

export function renderPlayerTrajectoryFilters() {
  if (!rosterLineupState.elPlayerTrajectoryGrid) return;
  const playerIdx = getPlayerAnalysisPlayerIdx();
  const allAttackEvents = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    return ev.playerIdx === playerIdx;
  });
  const events = allAttackEvents.filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    const dir = ev.attackDirection || ev.attackTrajectory;
    if (!dir || !dir.start || !dir.end) return false;
    return true;
  });
  const { setsOpts, codesOpts, zonesOpts } = buildEventFilterOptions(
    events,
    getAttackStartZone,
  );

  const attackTypeOpts = buildAttackTypeFilterOptions(allAttackEvents);
  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } =
    buildAdvancedFilterOptions(events);

  if (
    !liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.some(
      (opt) =>
        opt.value ===
        analysisFiltersState.playerTrajectoryFilterState.prevSkill,
    )
  ) {
    analysisFiltersState.playerTrajectoryFilterState.prevSkill = "any";
  }

  const visibleFilters = renderFilterControls(
    analysisFiltersState.playerTrajectoryFilterState,
    getFilterFields("playerTrajectoryFilterState"),
    {
      sets: setsOpts,
      setTypes: setTypeOpts,
      bases: baseOpts,
      phases: phaseOpts,
      receiveEvaluations: recvEvalOpts,
      receiveZones: recvZoneOpts,
      codes: codesOpts,
      attackTypes: attackTypeOpts,
      zones: zonesOpts,
    },
    handlePlayerTrajectoryFilterChange,
  );
  toggleFilterVisibility(rosterLineupState.elPlayerTrajFilterPrev, true);
  toggleFilterVisibility(
    rosterLineupState.elPlayerTrajFilterReset,
    visibleFilters.some(Boolean),
  );
  publishReactPreviousSkill(
    rosterLineupState.elPlayerTrajFilterPrev,
    analysisFiltersState.playerTrajectoryFilterState.prevSkill,
    handlePlayerTrajectoryFilterChange,
  );
}

export function renderPlayerTrajectoryAnalysis() {
  if (!rosterLineupState.elPlayerTrajectoryGrid) return;
  renderPlayerTrajectoryFilters();
  renderAttackMetricsSummary(
    matchState.elPlayerAttackSummary,
    getFilteredPlayerAttackSummaryEventsForPlayer(getPlayerAnalysisPlayerIdx()),
  );
  renderAttackTrajectoryGridForPlayer(
    rosterLineupState.elPlayerTrajectoryGrid,
    getPlayerAnalysisPlayerIdx(),
  );
}

export function renderAttackTrajectoryGridForPlayer(targetGrid, playerIdx) {
  if (!targetGrid) return;

  return publishReactPlayerAttackGrid(targetGrid, playerIdx);
}

export function syncPlayerServeTrajectoryFilterState() {
  syncFilterSelections(
    analysisFiltersState.playerServeTrajectoryFilterState,
    getFilterFields("playerServeTrajectoryFilterState"),
  );
}

export function handlePlayerServeTrajectoryFilterChange() {
  syncPlayerServeTrajectoryFilterState();
  renderPlayerServeTrajectoryAnalysis();
}

export function resetPlayerServeTrajectoryFilters() {
  clearFilterSelections(analysisFiltersState.playerServeTrajectoryFilterState);
  renderPlayerServeTrajectoryFilters();
  renderPlayerServeTrajectoryAnalysis();
}

export function renderPlayerServeTrajectoryFilters() {
  if (!rosterLineupState.elPlayerServeTrajectoryGrid) return;
  const playerIdx = getPlayerAnalysisPlayerIdx();
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "serve") return false;
    if (!ev.serveStart || !ev.serveEnd) return false;
    if (playerIdx === null) return false;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    return ev.playerIdx === playerIdx;
  });
  const { setsOpts, codesOpts, zonesOpts } = buildEventFilterOptions(
    events,
    getServeStartZone,
  );

  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } =
    buildAdvancedFilterOptions(events);

  const visibleFilters = renderFilterControls(
    analysisFiltersState.playerServeTrajectoryFilterState,
    getFilterFields("playerServeTrajectoryFilterState"),
    {
      sets: setsOpts,
      setTypes: setTypeOpts,
      bases: baseOpts,
      phases: phaseOpts,
      receiveEvaluations: recvEvalOpts,
      receiveZones: recvZoneOpts,
      codes: codesOpts,
      zones: zonesOpts,
    },
    handlePlayerServeTrajectoryFilterChange,
  );
  toggleFilterVisibility(
    rosterLineupState.elPlayerServeTrajFilterReset,
    visibleFilters.some(Boolean),
  );
}

export function renderPlayerServeTrajectoryAnalysis() {
  if (!rosterLineupState.elPlayerServeTrajectoryGrid) return;
  renderPlayerServeTrajectoryFilters();
  renderServeTrajectoryGridForPlayer(
    rosterLineupState.elPlayerServeTrajectoryGrid,
    getPlayerAnalysisPlayerIdx(),
  );
}

export function renderServeTrajectoryGridForPlayer(targetGrid, playerIdx) {
  if (!targetGrid) return;

  return publishReactPlayerServeGrid(targetGrid, playerIdx);
}
