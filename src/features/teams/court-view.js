import { session as matchState } from "../../../js/globals.js";

export function updateRotationDisplay() {
  const rotationLabel = rot => "P" + String(parseInt(rot, 10) || 1);
  if (matchState.elRotationIndicator) {
    matchState.elRotationIndicator.textContent = rotationLabel(matchState.state.rotation || 1);
  }

}

export function updateOpponentRotationDisplay() {
  if (typeof matchState.elRotationSelectOpp !== "undefined" && matchState.elRotationSelectOpp) {
    matchState.elRotationSelectOpp.value = String(matchState.state.opponentRotation || 1);
  }
}
