import { session as rosterLineupState } from '../state/roster-lineup.js';

export function getRoleLabelForRotation(index, rotation = 1) {
  const offset = (rotation || 1) - 1; // numero rotazioni effettuate
  const roles = rosterLineupState.BASE_ROLES;
  const idx0 = ((index - 1) % 6 + 6) % 6; // 0-based
  return roles[(idx0 - offset + 6) % 6] || roles[idx0] || "";
}
