import { AUTO_LIBERO_ROLE_DEFAULT_VERSION } from '../../../js/globals.js';
import { session as rosterLineupState } from '../state/roster-lineup.js';
export function normalizeAutoLiberoRolePreference(value, defaultVersion = 0) {
  const isLegacyDefault = Number(defaultVersion || 0) < AUTO_LIBERO_ROLE_DEFAULT_VERSION;
  if (typeof value !== "string" || (isLegacyDefault && value === "")) {
    return "C";
  }
  return rosterLineupState.AUTO_LIBERO_ROLE_OPTIONS.includes(value) ? value : "C";
}
