import { getFilteredAttacksForSecondDistribution } from "./setting-model.js";
import { buildEventFilterOptions } from "./filter-controls.js";
import { getAttackStartZone } from "./values.js";

import {
  buildSetterFilterOptions,
  buildPlayerFilterOptions,
  getFilterFields,
  syncFilterSelections,
  clearFilterSelections,
  buildAdvancedFilterOptions,
  renderFilterControls,
} from "./filter-controls.js";
import { getFilterControlIds } from "../../domain/analysis-filter-schema.js";
import { renderAnalysisTeamFilter } from "./shared-filter-view.js";
import { toggleFilterVisibility } from "./filter-view.js";
import {
  filterEventsByAnalysisTeam,
  getAnalysisTeamScope,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import {
  readReactFilterSelect,
  publishReactPreviousSkill,
} from "./filter-view.js";

import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { publishReactDistributionGrid } from "./setting-view.js";


import { publishReactSecondTable } from "./setting-view.js";


export function syncSecondFilterState() {
  const controlIds = getFilterControlIds("secondFilterState");
  syncFilterSelections(
    analysisFiltersState.secondFilterState,
    getFilterFields("secondFilterState"),
  );
  analysisFiltersState.secondFilterState.prevSkill =
    readReactFilterSelect(controlIds.prev) || "any";
}

export function handleSecondFilterChange() {
  syncSecondFilterState();
  renderSecondTable();
}

export function resetSecondFilters() {
  clearFilterSelections(analysisFiltersState.secondFilterState);
  renderSecondFilters();
  renderSecondTable();
}

export function renderSecondFilters() {
  const controlIds = getFilterControlIds("secondFilterState");
  renderAnalysisTeamFilter();
  const events = filterEventsByAnalysisTeam();
  const attackEvents = events.filter((ev) => ev && ev.skillId === "attack");
  const analysisScope = getAnalysisTeamScope();
  const setterOpts = buildSetterFilterOptions(attackEvents, analysisScope);
  const playersOpts = buildPlayerFilterOptions(attackEvents, analysisScope);
  const {
    setsOpts: setOpts,
    codesOpts,
    zonesOpts,
  } = buildEventFilterOptions(attackEvents, getAttackStartZone);

  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } =
    buildAdvancedFilterOptions(attackEvents);

  if (
    !liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.some(
      (opt) => opt.value === analysisFiltersState.secondFilterState.prevSkill,
    )
  ) {
    analysisFiltersState.secondFilterState.prevSkill = "any";
  }

  const visibleFilters = renderFilterControls(
    analysisFiltersState.secondFilterState,
    getFilterFields("secondFilterState"),
    {
      setters: setterOpts,
      players: playersOpts,
      sets: setOpts,
      setTypes: setTypeOpts,
      bases: baseOpts,
      phases: phaseOpts,
      receiveEvaluations: recvEvalOpts,
      receiveZones: recvZoneOpts,
      codes: codesOpts,
      zones: zonesOpts,
    },
    handleSecondFilterChange,
  );
  toggleFilterVisibility(controlIds.prev, attackEvents.length > 0);
  toggleFilterVisibility(controlIds.reset, visibleFilters.some(Boolean));
  publishReactPreviousSkill(
    controlIds.prev,
    analysisFiltersState.secondFilterState.prevSkill,
    handleSecondFilterChange,
  );
}

export function renderSecondTable() {

renderSecondFilters();
  publishReactSecondTable();
  renderSecondDistribution();
}

export function renderSecondDistribution() {

  publishReactDistributionGrid(
    "second-distribution",
    getFilteredAttacksForSecondDistribution(),
  );
}
