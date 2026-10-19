import {
  getAnalysisEvents,
  matchesTeamFilter,
  getSetterFromEvent,
  matchesAdvancedFilters,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { normalizeSetNumber } from "./values.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { getPlayerAnalysisPlayerIdx } from "./player-model.js";
export function getFilteredPlayerSecondEventsForPlayer(playerIdx) {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    return getSetterFromEvent(ev) === playerIdx;
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
      !matchesAdvancedFilters(ev, analysisFiltersState.playerSecondFilterState)
    )
      return false;
    if (
      analysisFiltersState.playerSecondFilterState.sets.size &&
      !analysisFiltersState.playerSecondFilterState.sets.has(setNum)
    )
      return false;
    return true;
  });
}

export function attachDampCountsByRotation(filteredEvents, allEvents) {
  const dampByRotation = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, all: 0 };
  (allEvents || []).forEach((ev) => {
    const setType = normalizeSetTypeValue(
      ev.setType ||
        (ev.combination && ev.combination.set_type) ||
        (ev.combination && ev.combination.setType),
    );
    if (!setType || setType.toLowerCase() !== "damp") return;
    const rotation =
      ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    dampByRotation[rotation] += 1;
    dampByRotation.all += 1;
  });
  filteredEvents.dampCount = dampByRotation.all;
  filteredEvents.dampByRotation = dampByRotation;
  return filteredEvents;
}

export function getFilteredPlayerAttacksForSecondDistribution(
  playerIdx = getPlayerAnalysisPlayerIdx(),
) {
  const all = getFilteredPlayerSecondEventsForPlayer(playerIdx);
  const filtered = all.filter((ev) => {
    const setType = normalizeSetTypeValue(
      ev.setType ||
        (ev.combination && ev.combination.set_type) ||
        (ev.combination && ev.combination.setType),
    );
    return !(setType && setType.toLowerCase() === "damp");
  });
  return attachDampCountsByRotation(filtered, all);
}
