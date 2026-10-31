import { ensureCourtShape, updateAutoRoleBaseCourtCache, resetAutoRoleCache } from "./court-state-model.js";
import { session as matchState } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { cleanOpponentLiberos } from "./roster-data.js";
import { normalizePlayers } from "../../domain/player-names.js";
import { loadOpponentTeamFromStorage, extractRosterFromTeam } from "./storage/team-repository.js";
import { updateOpponentRotationDisplay } from "./court-view.js";
import { saveState } from "../storage/save-state.js";

export function applyDefaultLineup(names = [], rotation = 1) {
  ensureCourtShape();
  const valid = new Set(matchState.state.players || []);
  const lineup = Array.isArray(names) ? names.filter(name => name && valid.has(name)) : [];
  matchState.state.court = Array.from({ length: 6 }, (_, idx) => ({ main: lineup[idx] || "" }));
  const rot = Number.isFinite(rotation) ? rotation : parseInt(rotation, 10) || 1;
  matchState.state.rotation = Math.min(6, Math.max(1, rot));
  rosterLineupState.autoRoleBaseCourt = null;
  matchState.state.autoRoleBaseCourt = null;
  resetAutoRoleCache();
}

export function applyOpponentDefaultLineup(names = [], rotation = 1) {
  rosterLineupState.opponentAutoRoleBaseCourt = null;
  matchState.state.opponentAutoRoleBaseCourt = null;
  matchState.state.opponentLiberoAutoMap = {};
  const valid = new Set(matchState.state.opponentPlayers || []);
  const lineup = Array.isArray(names) ? names.filter(name => name && valid.has(name)) : [];
  matchState.state.opponentCourt = Array.from({ length: 6 }, (_, idx) => ({ main: lineup[idx] || "" }));
  const rot = Number.isFinite(rotation) ? rotation : parseInt(rotation, 10) || 1;
  matchState.state.opponentRotation = Math.min(6, Math.max(1, rot));
  updateOpponentRotationDisplay();
  if (matchState.state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(matchState.state.opponentCourt, "opponent");
  }
}

export function ensureOpponentLiberosFromTeam() {
  if (Array.isArray(matchState.state.opponentLiberos)) return;
  const selected = matchState.state.selectedOpponentTeam || "";
  if (!selected) return;
  const team = loadOpponentTeamFromStorage(selected);
  if (!team) return;
  const roster = extractRosterFromTeam(team);
  if (!roster || !roster.liberos || roster.liberos.length === 0) return;
  const validPlayers = new Set(matchState.state.opponentPlayers || roster.players || []);
  matchState.state.opponentLiberos = normalizePlayers(roster.liberos).filter(name => validPlayers.has(name));
  cleanOpponentLiberos();
  saveState();
}
