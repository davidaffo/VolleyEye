import { session as matchState } from '../../../js/globals.js';
import { session as scoutUiState } from '../state/scout-ui.js';
import { session as rosterLineupState } from '../state/roster-lineup.js';
import { isServingForScope } from './selectors.js';
import { ensureCourtShapeFor } from './court-model.js';
import { removeLiberosAndRestoreForScope } from './libero-model.js';

export function hasPendingServeSelectionForScope(scope = "our") {
  return Object.keys(scoutUiState.selectedSkillPerPlayer || {}).some(key => {
    if (!key.startsWith(scope + ":")) return false;
    return scoutUiState.selectedSkillPerPlayer[key] === "serve";
  });
}

export function getServeDisplayCourt(scope = "our") {
  let baseCourt = scope === "opponent" ? matchState.state.opponentCourt : matchState.state.court;
  if (matchState.state.autoRolePositioning && !hasPendingServeSelectionForScope(scope)) {
    if (scope === "opponent") {
      if (matchState.state.opponentAutoRoleBaseCourt && matchState.state.opponentAutoRoleBaseCourt.length === 6) {
        baseCourt = matchState.state.opponentAutoRoleBaseCourt;
      }
    } else if (rosterLineupState.autoRoleBaseCourt) {
      baseCourt = rosterLineupState.autoRoleBaseCourt;
    }
  }
  if (!Array.isArray(baseCourt) || baseCourt.length === 0) return [];
  const shaped = (ensureCourtShapeFor(baseCourt));
  if (isServingForScope(scope)) {
    return removeLiberosAndRestoreForScope(shaped, scope);
  }
  return shaped;
}
