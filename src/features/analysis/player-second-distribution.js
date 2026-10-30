import { buildUniqueOptions, normalizeSetNumber } from "./values.js";
import {
  getFilterFields,
  syncFilterSelections,
  clearFilterSelections,
  buildAdvancedFilterOptions,
  renderFilterControls,
} from "./filter-controls.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import {
  getAnalysisEvents,
  matchesTeamFilter,
  getSetterFromEvent,
} from "./filter-model.js";
import { toggleFilterVisibility } from "./filter-view.js";

import { getPlayerAnalysisPlayerIdx } from "./player-model.js";

import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { readReactFilterSelect, publishReactPreviousSkill } from "./filter-view.js";
import { publishReactPlayerSecondTable } from "./setting-view.js";

export function syncPlayerSecondFilterState() {
  syncFilterSelections(
    analysisFiltersState.playerSecondFilterState,
    getFilterFields("playerSecondFilterState"),
  );
  analysisFiltersState.playerSecondFilterState.prevSkill =
    readReactFilterSelect("player-second-filter-prev") ||
    "any";
}

export function handlePlayerSecondFilterChange() {
  syncPlayerSecondFilterState();
  renderPlayerSecondTable();
}

export function resetPlayerSecondFilters() {
  clearFilterSelections(analysisFiltersState.playerSecondFilterState);
  renderPlayerSecondFilters();
  renderPlayerSecondTable();
}

export function renderPlayerSecondFilters() {

  const playerIdx = getPlayerAnalysisPlayerIdx();
  const attackEvents = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    return getSetterFromEvent(ev) === playerIdx;
  });
  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } =
    buildAdvancedFilterOptions(attackEvents);
  const setOpts = buildUniqueOptions(
    attackEvents.map((ev) => normalizeSetNumber(ev.set)),
    {
      asNumber: true,
      labelFn: (val) => "Set " + val,
    },
  );

  if (
    !liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.some(
      (opt) =>
        opt.value === analysisFiltersState.playerSecondFilterState.prevSkill,
    )
  ) {
    analysisFiltersState.playerSecondFilterState.prevSkill = "any";
  }

  const visibleFilters = renderFilterControls(
    analysisFiltersState.playerSecondFilterState,
    getFilterFields("playerSecondFilterState"),
    {
      setTypes: setTypeOpts,
      bases: baseOpts,
      phases: phaseOpts,
      receiveEvaluations: recvEvalOpts,
      receiveZones: recvZoneOpts,
      sets: setOpts,
    },
    handlePlayerSecondFilterChange,
  );
  toggleFilterVisibility(
    "player-second-filter-prev",
    attackEvents.length > 0,
  );
  toggleFilterVisibility(
    "player-second-filter-reset",
    visibleFilters.some(Boolean),
  );
  publishReactPreviousSkill(
    "player-second-filter-prev",
    analysisFiltersState.playerSecondFilterState.prevSkill,
    handlePlayerSecondFilterChange,
  );
}

export function renderPlayerSecondTable() {

  renderPlayerSecondFilters();
  publishReactPlayerSecondTable(
    "player-second-body",
    "player-second-distribution",
    getPlayerAnalysisPlayerIdx(),
    "player-second-attack-body",
  );
}
