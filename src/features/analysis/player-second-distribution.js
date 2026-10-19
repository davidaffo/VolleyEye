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
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { getPlayerAnalysisPlayerIdx } from "./player-model.js";

import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { publishReactPreviousSkill } from "./filter-view.js";
import {
  publishReactDistributionGrid,
  publishReactAttackOutcomes,
  publishReactPlayerSecondTable,
} from "./setting-view.js";

export function syncPlayerSecondFilterState() {
  syncFilterSelections(
    analysisFiltersState.playerSecondFilterState,
    getFilterFields("playerSecondFilterState"),
  );
  analysisFiltersState.playerSecondFilterState.prevSkill =
    (rosterLineupState.elPlayerSecondFilterPrev &&
      rosterLineupState.elPlayerSecondFilterPrev.value) ||
    "any";
}

export function handlePlayerSecondFilterChange() {
  syncPlayerSecondFilterState();
  renderPlayerSecondTable();
}

export function resetPlayerSecondFilters() {
  clearFilterSelections(analysisFiltersState.playerSecondFilterState);
  if (rosterLineupState.elPlayerSecondFilterPrev)
    rosterLineupState.elPlayerSecondFilterPrev.value = "any";
  renderPlayerSecondFilters();
  renderPlayerSecondTable();
}

export function renderPlayerSecondFilters() {
  if (!rosterLineupState.elPlayerSecondFilterSetTypes) return;
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
    rosterLineupState.elPlayerSecondFilterPrev,
    attackEvents.length > 0,
  );
  toggleFilterVisibility(
    rosterLineupState.elPlayerSecondFilterReset,
    visibleFilters.some(Boolean),
  );
  publishReactPreviousSkill(
    rosterLineupState.elPlayerSecondFilterPrev,
    analysisFiltersState.playerSecondFilterState.prevSkill,
    handlePlayerSecondFilterChange,
  );
}

export function renderDistributionGrid(targetEl, events, compareEvents = null) {
  if (!targetEl) return;

  return publishReactDistributionGrid(targetEl, events, compareEvents);
}

export function renderPlayerSecondTable() {
  if (!rosterLineupState.elPlayerSecondBody) return;
  renderPlayerSecondFilters();
  renderSecondTableForPlayer(
    rosterLineupState.elPlayerSecondBody,
    rosterLineupState.elPlayerSecondDistribution,
    getPlayerAnalysisPlayerIdx(),
    document.getElementById("player-second-attack-body"),
  );
}

export function renderAttackOutcomesSummaryTable(
  targetBody,
  rows,
  {
    emptyText = "Nessun attacco trovato.",
    totalLabel = "Totale attacchi",
  } = {},
) {
  if (!targetBody) return;

  return publishReactAttackOutcomes(targetBody, rows, {
    emptyText,
    totalLabel,
  });
}

export function renderSecondTableForPlayer(
  targetBody,
  targetDistribution,
  playerIdx,
  targetAttackBody = null,
  comparePlayerIdx = null,
) {
  if (!targetBody) return;

  return publishReactPlayerSecondTable(
    targetBody,
    targetDistribution,
    playerIdx,
    targetAttackBody,
    comparePlayerIdx,
  );
}
