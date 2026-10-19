
import { session as matchState } from '../../../js/globals.js';
import { lineup } from '../../domain/lineup.js';
import { cloneCourt } from './court-model.js';
import { getPlayersForScope } from './selectors.js';
import { getSelectedOpponentTeamDefaultSettings, getSelectedTeamDefaultSettings, loadTeamFromStorage, extractRosterFromTeam, loadOpponentTeamFromStorage } from './storage/team-repository.js';
import { computePointsSummary } from '../analysis/scores.js';
export function buildCourtFromNames(names = []) {
  return Array.from({ length: 6 }, (_, idx) => ({ main: names[idx] || "", replaced: "" }));
}

export function getDefaultSetStartForScope(scope = "our") {
  const defaultGetter =
    scope === "opponent" ? getSelectedOpponentTeamDefaultSettings : getSelectedTeamDefaultSettings;
  const defaults = typeof defaultGetter === "function" ? defaultGetter() : null;
  const players = getPlayersForScope(scope);
  const lineup = defaults && defaults.defaultLineup ? defaults.defaultLineup : players;
  const rotation = defaults && defaults.defaultRotation ? defaults.defaultRotation : 1;
  return {
    court: buildCourtFromNames(lineup),
    rotation: rotation
  };
}

export function getRawDefaultStartForScope(scope = "our") {
  ;
  const teamName = scope === "opponent" ? matchState.state.selectedOpponentTeam || "" : matchState.state.selectedTeam || "";
  if (!teamName) return null;
  const team = scope === "opponent" ? loadOpponentTeamFromStorage(teamName) : loadTeamFromStorage(teamName);
  if (!team) return null;
  const roster = extractRosterFromTeam(team);
  const lineup = Array.isArray(roster.defaultLineup) ? roster.defaultLineup : [];
  const hasLineup = lineup.some(name => (name || "").trim());
  if (!hasLineup) return null;
  const rotation = roster.defaultRotation || 1;
  return { court: buildCourtFromNames(lineup), rotation };
}

export function getMatchInitialSetStart(scope = "our") {
  const firstSet = matchState.state.setStarts && matchState.state.setStarts[1];
  const entry = firstSet && (scope === "opponent" ? firstSet.opponent : firstSet.our);
  if (!entry || !Array.isArray(entry.court)) return null;
  return {
    court: cloneCourt(entry.court),
    rotation: typeof entry.rotation === "number" ? entry.rotation : 1
  };
}

export function computeSetWinner(setNum) {
  if (!setNum) return null;
  const summary = computePointsSummary(setNum, { teamScope: "our" });
  if (!summary) return null;
  if (summary.totalFor === summary.totalAgainst) return null;
  return summary.totalFor > summary.totalAgainst ? "our" : "opponent";
}

export function getDerivedServeForSetStart(setNum) {
  const targetSet = Math.min(5, Math.max(1, parseInt(setNum, 10) || 1));
  const setStarts = matchState.state.setStarts || {};
  const existing = setStarts[targetSet];
  if (existing && typeof existing.isServing === "boolean") {
    return !!existing.isServing;
  }
  for (let prevSet = targetSet - 1; prevSet >= 1; prevSet -= 1) {
    const prevEntry = setStarts[prevSet];
    if (prevEntry && typeof prevEntry.isServing === "boolean") {
      const distance = targetSet - prevSet;
      return distance % 2 === 0 ? !!prevEntry.isServing : !prevEntry.isServing;
    }
  }
  return targetSet <= 1 ? !!matchState.state.isServing : !matchState.state.isServing;
}
