import { buildAttackTypeFilterOptions } from "./trajectory-model.js";
import { buildEventFilterOptions } from './filter-controls.js';
import { getAttackStartZone } from './values.js';

import { buildSetterFilterOptions, buildPlayerFilterOptions, getFilterFields, buildAdvancedFilterOptions, renderFilterControls } from './filter-controls.js';
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderAnalysisTeamFilter, handleTrajectoryFilterChange, handleServeTrajectoryFilterChange } from "./analysis-filters.js";
import { toggleFilterVisibility, renderAnalysisCourtSideRadios, getCheckedRadioValue } from "./filter-view.js";
import { getAnalysisTeamScope, filterEventsByAnalysisTeam, getAnalysisCourtSide, ensureCourtSideState } from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";

import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "./trajectory-rendering.js";
import { getServeStartZone } from "./trajectory-model.js";

import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";

import { publishReactPreviousSkill } from "./filter-view.js";
import { saveState } from "../storage/save-state.js";

export function renderTrajectoryFilters() {
  if (!rosterLineupState.elTrajectoryGrid) return;
  renderAnalysisTeamFilter();
  const analysisScope = getAnalysisTeamScope();
  const events = filterEventsByAnalysisTeam();
  const attackEvents = events.filter(ev => ev && ev.skillId === "attack");
  const trajEvents = attackEvents.filter(ev => {
    const dir = ev.attackDirection || ev.attackTrajectory;
    return dir && dir.start && dir.end;
  });
  const setterOpts = buildSetterFilterOptions(trajEvents, analysisScope);
  const playersOpts = buildPlayerFilterOptions(trajEvents, analysisScope);
  const { setsOpts, codesOpts, zonesOpts } = buildEventFilterOptions(trajEvents, getAttackStartZone);
  
  const attackTypeOpts = buildAttackTypeFilterOptions(attackEvents);  
  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } = buildAdvancedFilterOptions(trajEvents);

  if (!liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.some(opt => opt.value === analysisFiltersState.trajectoryFilterState.prevSkill)) {
    analysisFiltersState.trajectoryFilterState.prevSkill = "any";
  }

  const visibleFilters = renderFilterControls(analysisFiltersState.trajectoryFilterState, getFilterFields('trajectoryFilterState'), {
    setters: setterOpts,
    players: playersOpts,
    sets: setsOpts,
    setTypes: setTypeOpts,
    bases: baseOpts,
    phases: phaseOpts,
    receiveEvaluations: recvEvalOpts,
    receiveZones: recvZoneOpts,
    codes: codesOpts,
    attackTypes: attackTypeOpts,
    zones: zonesOpts,
  }, handleTrajectoryFilterChange);
  toggleFilterVisibility(rosterLineupState.elTrajFilterPrev, true);
  toggleFilterVisibility(rosterLineupState.elTrajFilterReset, visibleFilters.some(Boolean));
  publishReactPreviousSkill(rosterLineupState.elTrajFilterPrev,analysisFiltersState.trajectoryFilterState.prevSkill,handleTrajectoryFilterChange);
  if (rosterLineupState.elTrajCourtSide) {
    const side = getAnalysisCourtSide(ensureCourtSideState("uiTrajectoryCourtSideByScope")[analysisScope]);
    renderAnalysisCourtSideRadios(rosterLineupState.elTrajCourtSide, side, () => {
      const scope = getAnalysisTeamScope();
      const nextState = ensureCourtSideState("uiTrajectoryCourtSideByScope");
      nextState[scope] = getAnalysisCourtSide(getCheckedRadioValue(rosterLineupState.elTrajCourtSide));
      saveState();
      renderTrajectoryAnalysis();
    }, "analysis-court-side");
  }

}

export function renderServeTrajectoryFilters() {
  if (!rosterLineupState.elServeTrajectoryGrid) return;
  renderAnalysisTeamFilter();
  const analysisScope = getAnalysisTeamScope();
  const events = filterEventsByAnalysisTeam();
  const serveEvents = events.filter(ev => ev && ev.skillId === "serve" && ev.serveStart && ev.serveEnd);
  const playersOpts = buildPlayerFilterOptions(serveEvents, analysisScope);
  const { setsOpts, codesOpts, zonesOpts } = buildEventFilterOptions(serveEvents, getServeStartZone);
  
  
  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } = buildAdvancedFilterOptions(serveEvents);

  const visibleFilters = renderFilterControls(analysisFiltersState.serveTrajectoryFilterState, getFilterFields('serveTrajectoryFilterState'), {
    players: playersOpts,
    sets: setsOpts,
    setTypes: setTypeOpts,
    bases: baseOpts,
    phases: phaseOpts,
    receiveEvaluations: recvEvalOpts,
    receiveZones: recvZoneOpts,
    codes: codesOpts,
    zones: zonesOpts,
  }, handleServeTrajectoryFilterChange);
  toggleFilterVisibility(rosterLineupState.elServeTrajFilterReset, visibleFilters.some(Boolean));
  if (rosterLineupState.elServeTrajCourtSide) {
    const side = getAnalysisCourtSide(ensureCourtSideState("uiServeTrajectoryCourtSideByScope")[analysisScope]);
    renderAnalysisCourtSideRadios(rosterLineupState.elServeTrajCourtSide, side, () => {
      const scope = getAnalysisTeamScope();
      const nextState = ensureCourtSideState("uiServeTrajectoryCourtSideByScope");
      nextState[scope] = getAnalysisCourtSide(getCheckedRadioValue(rosterLineupState.elServeTrajCourtSide));
      saveState();
      renderServeTrajectoryAnalysis();
    }, "analysis-serve-court-side");
  }

}
