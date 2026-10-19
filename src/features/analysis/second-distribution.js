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
import {
  getSecondFilterElements,
  renderAnalysisTeamFilter,
} from "./analysis-filters.js";
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
import { renderDistributionGrid } from "./player-second-distribution.js";

import { session as rosterLineupState } from "../state/roster-lineup.js";
import { publishReactSecondTable } from "./setting-view.js";
import { session as matchState } from "../../../js/globals.js";

export function syncSecondFilterState() {
  const els = getSecondFilterElements();
  if (!els) return;
  syncFilterSelections(
    analysisFiltersState.secondFilterState,
    getFilterFields("secondFilterState", els),
  );
  analysisFiltersState.secondFilterState.prevSkill =
    readReactFilterSelect(els.prev) || "any";
}

export function handleSecondFilterChange() {
  syncSecondFilterState();
  renderSecondTable();
}

export function resetSecondFilters() {
  clearFilterSelections(analysisFiltersState.secondFilterState);
  const els = getSecondFilterElements();
  if (els && els.prev) els.prev.value = "any";
  renderSecondFilters();
  renderSecondTable();
}

export function renderSecondFilters() {
  const els = getSecondFilterElements();
  if (!els) return;
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
    getFilterFields("secondFilterState", els),
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
  toggleFilterVisibility(els.prev, attackEvents.length > 0);
  toggleFilterVisibility(els.reset, visibleFilters.some(Boolean));
  publishReactPreviousSkill(
    els.prev,
    analysisFiltersState.secondFilterState.prevSkill,
    handleSecondFilterChange,
  );
}

export function renderSecondTable() {
  if (!rosterLineupState.elAggSecondBody) return;

  renderSecondFilters();
  publishReactSecondTable();
  renderSecondDistribution();
}

export function renderSecondDistribution() {
  if (!matchState.elSecondDistribution) return;
  renderDistributionGrid(
    matchState.elSecondDistribution,
    getFilteredAttacksForSecondDistribution(),
  );
}
