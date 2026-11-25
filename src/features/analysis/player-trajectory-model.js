import { matchesFilterSelection } from '../../domain/filter-selections.js';
import {
  getAnalysisEvents,
  matchesTeamFilter,
  matchesAdvancedFilters,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { normalizeSetNumber, buildAttackTypeLabel } from "./values.js";
import { getServeStartZone } from "./trajectory-model.js";
import { getTeamScopeFromEvent } from '../teams/selectors.js';
export function getFilteredPlayerTrajectoryEventsForPlayer(playerIdx, scope = null) {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    const dir = ev.attackDirection || ev.attackTrajectory;
    if (!dir || !dir.start || !dir.end) return false;
    if (playerIdx === null) return false;
    if (
      (scope ? getTeamScopeFromEvent(ev) !== scope : !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams))
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
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.sets, setNum)
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.codes, ev.code)
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.attackTypes, buildAttackTypeLabel(ev.attackType))
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.zones, startZone)
    )
      return false;
    return true;
  });
}

export function getFilteredPlayerAttackSummaryEventsForPlayer(playerIdx, scope = null) {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (
      (scope ? getTeamScopeFromEvent(ev) !== scope : !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams))
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
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.sets, setNum)
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.codes, ev.code)
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.attackTypes, buildAttackTypeLabel(ev.attackType))
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerTrajectoryFilterState.zones, startZone)
    )
      return false;
    return true;
  });
}

export function getFilteredPlayerServeTrajectoryEventsForPlayer(playerIdx, scope = null) {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "serve") return false;
    if (!ev.serveStart || !ev.serveEnd) return false;
    if (playerIdx === null) return false;
    if (
      (scope ? getTeamScopeFromEvent(ev) !== scope : !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams))
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
      !matchesFilterSelection(analysisFiltersState.playerServeTrajectoryFilterState.sets, setNum)
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerServeTrajectoryFilterState.codes, ev.code)
    )
      return false;
    if (
      !matchesFilterSelection(analysisFiltersState.playerServeTrajectoryFilterState.zones, startZone)
    )
      return false;
    return true;
  });
}
