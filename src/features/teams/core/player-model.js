import { renameTeamPlayerAcrossCurrentMatchById, getLiveRosterChange, applyLiveRosterNames } from "../player-reference-model.js";
import { session } from "../../state/teams-core-player-model.js";
import { session as matchState } from "../../../../js/globals.js";
import { session as courtEngineState } from "../court/court-engine.js";
import { getCurrentTeamPayload, getCurrentOpponentPayload } from "../current-payload.js";
import { updatePlayersList } from "../court/court-ui-bootstrap.js";
import { renderPlayers } from "../../live/team-rendering.js";

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
