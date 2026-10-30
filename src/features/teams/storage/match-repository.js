import { syncMatchesFromStorage, getSelectedArchivedMatch } from "../../storage/match-repository.js";
import { session as matchState } from "../../../../js/globals.js";
import { buildMatchDisplayName } from "../match-details.js";
import { publishTeamsManagerView } from "../manager-view.js";
import { publishRuntimeView } from "../../core/runtime-view.js";
import { updateMatchButtonsState, applyMatchRequirementLock } from "../settings/scouting-config.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";

export function buildArchivedTeamOptions(names, unavailableName = "") {
  return names.map(name => ({
    value: name,
    label: name === unavailableName ? `${name} (squadra principale)` : name,
    disabled: name === unavailableName
  }));
}

export function hasMatchDataForReset() {
  return Array.isArray(matchState.state.events) && matchState.state.events.length > 0;
}

export function selectArchivedMatch(name) {
  if (name && !Object.hasOwn(matchState.state.savedMatches || {}, name)) return;
  matchState.state.selectedMatch = name || "";

  renderMatchesList(Object.keys(matchState.state.savedMatches || {}), matchState.state.selectedMatch);
  updateMatchButtonsState();
}

export function renderMatchesSelect() {
  if (!rosterLineupState.elSavedMatchesSelect) return;
  syncMatchesFromStorage();
  const names = Object.keys(matchState.state.savedMatches || {});
  const prev = getSelectedArchivedMatch() || matchState.state.selectedMatch || "";

    matchState.state.selectedMatch = names.includes(prev) ? prev : "";
    renderMatchesList(names, matchState.state.selectedMatch);
    applyMatchRequirementLock();
    renderMatchSummary();
    updateMatchButtonsState();
    return;

}

export function renderMatchesList(names, selected) {
  if (!rosterLineupState.elSavedMatchesList) return;

    publishRuntimeView();
    return;

}

export function renderMatchSummary() {
  if (!rosterLineupState.elMatchSummary) return;
  const label = buildMatchDisplayName(matchState.state.match);
  rosterLineupState.elMatchSummary.textContent = label || "—";
}
