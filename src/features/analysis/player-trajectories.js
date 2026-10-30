import { buildAttackTrajectoryFilterOptions } from "./filter-controls.js";
import { getFilteredPlayerAttackSummaryEventsForPlayer } from "./player-trajectory-model.js";
import { buildEventFilterOptions } from "./filter-controls.js";

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


import {
  readReactFilterSelect,
  publishReactPreviousSkill,
} from "./filter-view.js";
import { getPlayerAnalysisPlayerIdx } from "./player-model.js";

import { publishReactAttackSummary } from "./trajectory-view.js";
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
    readReactFilterSelect("player-traj-filter-prev") || "any";
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
  const {
    setsOpts,
    codesOpts,
    zonesOpts,
    attackTypeOpts,
    setTypeOpts,
    baseOpts,
    phaseOpts,
    recvEvalOpts,
    recvZoneOpts,
  } = buildAttackTrajectoryFilterOptions(events, allAttackEvents);

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
  toggleFilterVisibility("player-traj-filter-prev", true);
  toggleFilterVisibility(
    "player-traj-filter-reset",
    visibleFilters.some(Boolean),
  );
  publishReactPreviousSkill(
    "player-traj-filter-prev",
    analysisFiltersState.playerTrajectoryFilterState.prevSkill,
    handlePlayerTrajectoryFilterChange,
  );
}

export function renderPlayerTrajectoryAnalysis() {

  renderPlayerTrajectoryFilters();
  publishReactAttackSummary(
    "player-attack-summary",
    getFilteredPlayerAttackSummaryEventsForPlayer(getPlayerAnalysisPlayerIdx()),
  );
  publishReactPlayerAttackGrid(
    "player-trajectory-grid",
    getPlayerAnalysisPlayerIdx(),
  );
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
    "player-serve-traj-filter-reset",
    visibleFilters.some(Boolean),
  );
}

export function renderPlayerServeTrajectoryAnalysis() {

  renderPlayerServeTrajectoryFilters();
  publishReactPlayerServeGrid(
    "player-serve-trajectory-grid",
    getPlayerAnalysisPlayerIdx(),
  );
}
