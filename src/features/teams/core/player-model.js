import { renameTeamPlayerAcrossCurrentMatchById, getLiveRosterChange, applyLiveRosterNames, remapLiveRosterReferences } from "../player-reference-model.js";
import { session } from "../../state/teams-core-player-model.js";
import { session as matchState } from "../../../../js/globals.js";
import { session as courtEngineState } from "../court/court-engine.js";
import { getCurrentTeamPayload, getCurrentOpponentPayload } from "../current-payload.js";
import { updatePlayersList } from "../court/court-ui-bootstrap.js";
import { renderPlayers } from "../../live/team-rendering.js";
import { recalcAllStatsAndUpdateUI } from "../../analysis/stats-update.js";

const playerModelState = session;

export function applyLiveTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentTeamPayload();
  const change = getLiveRosterChange(currentPayload, payload);
  const nextNames = applyLiveRosterNames(change, (...args) => renameTeamPlayerAcrossCurrentMatchById("our", ...args), { removeMissing: true });
  if (change.removed.length) remapLiveRosterReferences("our", [...matchState.state.players], nextNames, change.removed);
  updatePlayersList(nextNames, {
    askReset: false,
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    preserveCourt: true,
    preferredLibero: payload.preferredLibero || "",
    preserveFlowState: true
  });
  if (change.removed.length) recalcAllStatsAndUpdateUI();
  return true;
}

export function applyLiveOpponentTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentOpponentPayload();
  const change = getLiveRosterChange(currentPayload, payload);
  const nextNames = applyLiveRosterNames(change, (...args) => renameTeamPlayerAcrossCurrentMatchById("opponent", ...args), { removeMissing: true });
  if (change.removed.length) remapLiveRosterReferences("opponent", [...matchState.state.opponentPlayers], nextNames, change.removed);
  const applied = courtEngineState.updateOpponentPlayersList(nextNames, {
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    allowDuringMatch: true
  });
  if (applied === false) return false;
  matchState.state.opponentPreferredLibero = payload.preferredLibero || "";
  if (change.removed.length) recalcAllStatsAndUpdateUI();
  renderPlayers();
  return true;
}
