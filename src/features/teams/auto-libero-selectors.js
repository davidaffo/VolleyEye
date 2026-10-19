import { session as matchState } from '../../../js/globals.js';
import { normalizeAutoLiberoRolePreference } from './preferences.js';
export function getTeamAutoLiberoRole(scope = "our") {
  const role = scope === "opponent" ? matchState.state.opponentAutoLiberoRole : matchState.state.autoLiberoRole;
  return normalizeAutoLiberoRolePreference(role, matchState.state.autoLiberoRoleDefaultVersion);
}
