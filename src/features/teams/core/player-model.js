import { renameTeamPlayerAcrossCurrentMatchById, getLiveRosterChange, applyLiveRosterNames } from "../player-reference-model.js";
import { cleanOpponentLiberos } from "../roster-data.js";
import { normalizePlayers } from "../../../domain/player-names.js";
import { session } from "../../state/teams-core-player-model.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { session as matchState } from "../../../../js/globals.js";
import { loadOpponentTeamFromStorage, extractRosterFromTeam } from "../storage/team-repository.js";
import { session as courtEngineState } from "../court/court-engine.js";
import { ensureCourtShape, updateAutoRoleBaseCourtCache, resetAutoRoleCache } from "../court-state-model.js";
import { getCurrentTeamPayload, getCurrentOpponentPayload } from "../current-payload.js";
import { updatePlayersList, updateOpponentRotationDisplay } from "../court/court-ui-bootstrap.js";
import { renderPlayers } from "../../live/team-rendering.js";
import { publishTeamEditorMode } from "../editor-view.js";
import { saveState } from "../../storage/save-state.js";

const playerModelState = session;

export function applyLiveTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentTeamPayload();
  const change = getLiveRosterChange(currentPayload, payload);
  if (!matchState.state.matchFinished && change.removed.length > 0) {
    alert("Durante la partita non puoi rimuovere giocatrici dal roster rapido.");
    return false;
  }
  const nextNames = applyLiveRosterNames(change, (...args) => renameTeamPlayerAcrossCurrentMatchById("our", ...args));
  updatePlayersList(nextNames, {
    askReset: false,
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    preserveCourt: true,
    preferredLibero: payload.preferredLibero || "",
    preserveFlowState: true
  });
  return true;
}

export function applyLiveOpponentTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentOpponentPayload();
  const change = getLiveRosterChange(currentPayload, payload);
  const nextNames = applyLiveRosterNames(change, (...args) => renameTeamPlayerAcrossCurrentMatchById("opponent", ...args));
  const applied = courtEngineState.updateOpponentPlayersList(nextNames, {
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    allowDuringMatch: true
  });
  if (applied === false) return false;
  matchState.state.opponentPreferredLibero = payload.preferredLibero || "";
  renderPlayers();
  return true;
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
