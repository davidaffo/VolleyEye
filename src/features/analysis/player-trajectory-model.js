import {
  getAnalysisEvents,
  matchesTeamFilter,
  matchesAdvancedFilters,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { normalizeSetNumber, buildAttackTypeLabel } from "./values.js";
import { getServeStartZone } from "./trajectory-model.js";
export function getFilteredPlayerTrajectoryEventsForPlayer(playerIdx) {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    const dir = ev.attackDirection || ev.attackTrajectory;
    if (!dir || !dir.start || !dir.end) return false;
    if (playerIdx === null) return false;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    return ev.playerIdx === playerIdx;
  });
  return events.filter((ev) => {
    const traj = ev.attackDirection || ev.attackTrajectory;
    const startZone =
      ev.attackStartZone ||
      (traj && traj.startZone) ||
      ev.zone ||
      ev.playerPosition ||
      null;
    const setNum = normalizeSetNumber(ev.set);
    if (
      !matchesAdvancedFilters(
        ev,
        analysisFiltersState.playerTrajectoryFilterState,
      )
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.sets.size &&
      !analysisFiltersState.playerTrajectoryFilterState.sets.has(setNum)
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.codes.size &&
      !analysisFiltersState.playerTrajectoryFilterState.codes.has(ev.code)
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.attackTypes.size &&
      !analysisFiltersState.playerTrajectoryFilterState.attackTypes.has(
        buildAttackTypeLabel(ev.attackType),
      )
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.zones.size &&
      !analysisFiltersState.playerTrajectoryFilterState.zones.has(startZone)
    )
      return false;
    return true;
  });
}

export function getFilteredPlayerAttackSummaryEventsForPlayer(playerIdx) {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    return ev.playerIdx === playerIdx;
  });
  return events.filter((ev) => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const startZone =
      ev.attackStartZone ||
      traj.startZone ||
      ev.zone ||
      ev.playerPosition ||
      null;
    const setNum = normalizeSetNumber(ev.set);
    if (
      !matchesAdvancedFilters(
        ev,
        analysisFiltersState.playerTrajectoryFilterState,
      )
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.sets.size &&
      !analysisFiltersState.playerTrajectoryFilterState.sets.has(setNum)
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.codes.size &&
      !analysisFiltersState.playerTrajectoryFilterState.codes.has(ev.code)
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.attackTypes.size &&
      !analysisFiltersState.playerTrajectoryFilterState.attackTypes.has(
        buildAttackTypeLabel(ev.attackType),
      )
    )
      return false;
    if (
      analysisFiltersState.playerTrajectoryFilterState.zones.size &&
      !analysisFiltersState.playerTrajectoryFilterState.zones.has(startZone)
    )
      return false;
    return true;
  });
}

export function getFilteredPlayerServeTrajectoryEventsForPlayer(playerIdx) {
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
  return events.filter((ev) => {
    const startZone = getServeStartZone(ev);
    const setNum = normalizeSetNumber(ev.set);
    if (
      !matchesAdvancedFilters(
        ev,
        analysisFiltersState.playerServeTrajectoryFilterState,
      )
    )
      return false;
    if (
      analysisFiltersState.playerServeTrajectoryFilterState.sets.size &&
      !analysisFiltersState.playerServeTrajectoryFilterState.sets.has(setNum)
    )
      return false;
    if (
      analysisFiltersState.playerServeTrajectoryFilterState.codes.size &&
      !analysisFiltersState.playerServeTrajectoryFilterState.codes.has(ev.code)
    )
      return false;
    if (
      analysisFiltersState.playerServeTrajectoryFilterState.zones.size &&
      !analysisFiltersState.playerServeTrajectoryFilterState.zones.has(
        startZone,
      )
    )
      return false;
    return true;
  });
}
