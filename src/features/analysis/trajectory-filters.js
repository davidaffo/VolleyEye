import { buildAttackTrajectoryFilterOptions } from "./filter-controls.js";
import { renderAnalysisTeamFilter } from "./shared-filter-view.js";
import { buildEventFilterOptions } from "./filter-controls.js";

import {
  buildSetterFilterOptions,
  buildPlayerFilterOptions,
  getFilterFields,
  buildAdvancedFilterOptions,
  renderFilterControls,
} from "./filter-controls.js";

import { toggleFilterVisibility, renderAnalysisCourtSideRadios } from "./filter-view.js";
import {
  getAnalysisTeamScope,
  filterEventsByAnalysisTeam,
  getAnalysisCourtSide,
  ensureCourtSideState,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";

import { getServeStartZone } from "./trajectory-model.js";

import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";

import { publishReactPreviousSkill } from "./filter-view.js";

const trajectoryFilterAction = Object.freeze({
  command: "handleTrajectoryFilterChange",
});
const serveTrajectoryFilterAction = Object.freeze({
  command: "handleServeTrajectoryFilterChange",
});

export function renderTrajectoryFilters() {

  renderAnalysisTeamFilter();
  const analysisScope = getAnalysisTeamScope();
  const events = filterEventsByAnalysisTeam();
  const attackEvents = events.filter((ev) => ev && ev.skillId === "attack");
  const trajEvents = attackEvents.filter((ev) => {
    const dir = ev.attackDirection || ev.attackTrajectory;
    return dir && dir.start && dir.end;
  });
  const setterOpts = buildSetterFilterOptions(trajEvents, analysisScope);
  const playersOpts = buildPlayerFilterOptions(trajEvents, analysisScope);
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
  } = buildAttackTrajectoryFilterOptions(trajEvents, attackEvents);

  if (
    !liveScoreAndSetState.PREVIOUS_SKILL_OPTIONS.some(
      (opt) =>
        opt.value === analysisFiltersState.trajectoryFilterState.prevSkill,
    )
  ) {
    analysisFiltersState.trajectoryFilterState.prevSkill = "any";
  }

  const visibleFilters = renderFilterControls(
    analysisFiltersState.trajectoryFilterState,
    getFilterFields("trajectoryFilterState"),
    {
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
    },
    trajectoryFilterAction,
  );
  toggleFilterVisibility("traj-filter-prev", true);
  toggleFilterVisibility(
    "traj-filter-reset",
    visibleFilters.some(Boolean),
  );
  publishReactPreviousSkill(
    "traj-filter-prev",
    analysisFiltersState.trajectoryFilterState.prevSkill,
    trajectoryFilterAction,
  );

    const side = getAnalysisCourtSide(
      ensureCourtSideState("uiTrajectoryCourtSideByScope")[analysisScope],
    );
    renderAnalysisCourtSideRadios(
      "traj-court-side",
      side,
      Object.freeze({
        command: "changeTrajectoryCourtSide",
        args: Object.freeze(["attack"]),
      }),
      "analysis-court-side",
    );

}

export function renderServeTrajectoryFilters() {

  renderAnalysisTeamFilter();
  const analysisScope = getAnalysisTeamScope();
  const events = filterEventsByAnalysisTeam();
  const serveEvents = events.filter(
    (ev) => ev && ev.skillId === "serve" && ev.serveStart && ev.serveEnd,
  );
  const playersOpts = buildPlayerFilterOptions(serveEvents, analysisScope);
  const { setsOpts, codesOpts, zonesOpts } = buildEventFilterOptions(
    serveEvents,
    getServeStartZone,
  );

  const { setTypeOpts, baseOpts, phaseOpts, recvEvalOpts, recvZoneOpts } =
    buildAdvancedFilterOptions(serveEvents);

  const visibleFilters = renderFilterControls(
    analysisFiltersState.serveTrajectoryFilterState,
    getFilterFields("serveTrajectoryFilterState"),
    {
      players: playersOpts,
      sets: setsOpts,
      setTypes: setTypeOpts,
      bases: baseOpts,
      phases: phaseOpts,
      receiveEvaluations: recvEvalOpts,
      receiveZones: recvZoneOpts,
      codes: codesOpts,
      zones: zonesOpts,
    },
    serveTrajectoryFilterAction,
  );
  toggleFilterVisibility(
    "serve-traj-filter-reset",
    visibleFilters.some(Boolean),
  );

    const side = getAnalysisCourtSide(
      ensureCourtSideState("uiServeTrajectoryCourtSideByScope")[analysisScope],
    );
    renderAnalysisCourtSideRadios(
      "serve-traj-court-side",
      side,
      Object.freeze({
        command: "changeTrajectoryCourtSide",
        args: Object.freeze(["serve"]),
      }),
      "analysis-serve-court-side",
    );

}
