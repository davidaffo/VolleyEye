import { session as scoutUiState } from "../state/scout-ui.js";
import { session as matchState } from "../../../js/globals.js";
import { getPlayersForScope } from "../teams/selectors.js";
import { ensureCourtShapeFor } from "../teams/court-model.js";
import { getSortedPlayerEntriesForScope } from "../teams/lineup-selectors.js";
export function isErrorPickModeForScope(scope) {
  return !!(
    scoutUiState.errorPickModeState &&
    scoutUiState.errorPickModeState.scope === scope
  );
}

export function isPointPickModeForScope(scope) {
  return !!(
    scoutUiState.pointPickModeState &&
    scoutUiState.pointPickModeState.scope === scope
  );
}

export function getBenchEntriesForScope(scope) {
  const players = getPlayersForScope(scope) || [];
  if (!players.length) return [];
  const courtSource =
    scope === "opponent"
      ? matchState.state.opponentCourt || []
      : matchState.state.court || [];
  const court = ensureCourtShapeFor(courtSource);
  const inCourt = new Set();
  court.forEach((slot) => {
    const name = slot && slot.main ? slot.main : "";
    if (name) inCourt.add(name);
  });
  const entries = getSortedPlayerEntriesForScope(scope);
  return entries.filter(
    (entry) => entry && entry.name && !inCourt.has(entry.name),
  );
}

export function clearErrorPickMode() {
  if (!scoutUiState.errorPickModeState) return false;
  scoutUiState.errorPickModeState = null;
  return true;
}
