import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayersForScope } from "../teams/selectors.js";
import { setSelectedErrorType } from "../analysis/skill-tables.js";
import { addPlayerError, handleTeamError, handleTeamPoint, addPlayerPoint } from "../live/live-score-and-set.js";
import { closeErrorModal, closePointModal } from "../live/live-entry.js";
import { publishAttributionView } from "./attribution-view.js";
import { attributionStore } from "../../state/attribution-store.mjs";

export function selectAttributionErrorType(type) {
  if (!scoutUiState.ERROR_TYPES.some((item) => item.id === type)) return;
  setSelectedErrorType(type);
  const prefill = scoutUiState.errorModalPrefillPlayer;
  if (prefill?.fromPicker && typeof prefill.playerIdx === "number") {
    const name =
      prefill.playerName ||
      getPlayersForScope(prefill.scope || "our")[prefill.playerIdx] ||
      "Giocatrice";
    addPlayerError(prefill.playerIdx, name, type, prefill.scope || "our");
    scoutUiState.errorModalPrefillPlayer = null;
    closeErrorModal();
  } else if (prefill?.teamFromPicker) {
    handleTeamError(type, prefill.scope || "our");
    scoutUiState.errorModalPrefillPlayer = null;
    closeErrorModal();
  } else publishAttributionView("error");
}

export function applyAttribution(kind, index = null) {
  const view = attributionStore.getSnapshot()[kind];
  if (!view?.open) return;
  if (index === null) {
    if (kind === "point") handleTeamPoint();
    else handleTeamError(scoutUiState.selectedErrorType, view.scope);
  } else {
    const player = view.players.find((entry) => entry.idx === index);
    if (!player) return;
    if (kind === "point") addPlayerPoint(player.idx, player.name);
    else addPlayerError(player.idx, player.name, scoutUiState.selectedErrorType, view.scope);
  }
  if (kind === "point") closePointModal();
  else {
    scoutUiState.errorModalPrefillPlayer = null;
    closeErrorModal();
  }
}
