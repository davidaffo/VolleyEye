import { session as scoutUiState } from "../state/scout-ui.js";
import { session as matchState } from "../../../js/globals.js";
import { makePlayerKey, getPlayersForScope } from "../teams/selectors.js";
import { getServeDisplayCourt } from "../teams/serve-court.js";
import { setSelectedSkillForScope } from "../live/flow-model.js";
import { clearServeTypeInlineListener } from "./serve-keyboard.js";
import { closeSkillModal } from "./skill-modal-state.js";
import { clearErrorPickMode, isErrorPickModeForScope } from "./pick-model.js";

export function clearAttackSelection(playerIdx = null, scope = "our") {
  if (playerIdx === null || playerIdx === undefined) {
    scoutUiState.attackInlinePlayer = null;
    Object.keys(scoutUiState.attackMetaByPlayer).forEach(key => {
      delete scoutUiState.attackMetaByPlayer[key];
    });
    return;
  }
  const key = makePlayerKey(scope, playerIdx);
  delete scoutUiState.attackMetaByPlayer[key];
  if (scoutUiState.attackInlinePlayer === key) {
    scoutUiState.attackInlinePlayer = null;
  }
}
export function resetSkillSelectionForPlayer(playerIdx, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  delete scoutUiState.serveMetaByPlayer[key];
  delete scoutUiState.blockConfirmByPlayer[key];
  if (scoutUiState.serveTypeInlinePlayer === key || scoutUiState.serveTypeFocusPlayer === key) {
    clearServeTypeInlineListener();
  }
  clearAttackSelection(playerIdx, scope);
  setSelectedSkillForScope(scope, playerIdx, null);
}
export function shouldPromptAttackSetType(scope = "our") {
  const enabled =
    scope === "opponent" ? matchState.state.opponentSetTypePromptEnabled : matchState.state.setTypePromptEnabled;
  return !!enabled;
}
export function applyAttackTrajectoryToEvent(event, payload) {
  if (!payload || !event) return;
  event.attackStart = payload.start || event.attackStart || null;
  event.attackEnd = payload.end || event.attackEnd || null;
  event.attackStartZone = payload.startZone || event.attackStartZone || null;
  event.attackEndZone = payload.endZone || event.attackEndZone || null;
  event.attackDirection = payload;
  event.attackTrajectory = payload;
  if (!event.originZone) {
    event.originZone = event.attackStartZone || event.originZone || null;
  }
  if (event.attackStartZone) {
    event.zone = event.attackStartZone;
    event.playerPosition = event.attackStartZone;
  }
}
export function getServeBaseZoneForPlayer(playerIdx, scope = "our") {
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players || !players[playerIdx]) return null;
  const name = players[playerIdx];
  const baseCourt = getServeDisplayCourt(scope);
  if (!baseCourt || !baseCourt.length) return null;
  const slotIdx = baseCourt.findIndex(slot => slot && slot.main === name);
  return slotIdx === -1 ? null : slotIdx + 1;
}

export function cancelPartialSkillFlowForScope(scope = "our") {
  const targetScope = scope || "our";
  const prefix = targetScope + ":";
  const playerIdxs = new Set();
  const collectFromKey = key => {
    if (!key || !key.startsWith(prefix)) return;
    const idx = parseInt(key.slice(prefix.length), 10);
    if (!Number.isNaN(idx)) playerIdxs.add(idx);
  };
  [scoutUiState.selectedSkillPerPlayer, scoutUiState.serveMetaByPlayer, scoutUiState.attackMetaByPlayer, scoutUiState.blockConfirmByPlayer, scoutUiState.serveTypeSelectHandlers]
    .forEach(mapObj => {
      Object.keys(mapObj || {}).forEach(collectFromKey);
    });
  [scoutUiState.attackInlinePlayer, scoutUiState.serveTypeInlinePlayer, scoutUiState.serveTypeFocusPlayer, scoutUiState.blockInlinePlayer].forEach(collectFromKey);
  if (
    scoutUiState.activeSkillModalContext &&
    scoutUiState.activeSkillModalContext.scope === targetScope &&
    typeof scoutUiState.activeSkillModalContext.playerIdx === "number"
  ) {
    playerIdxs.add(scoutUiState.activeSkillModalContext.playerIdx);
  }
  playerIdxs.forEach(playerIdx => resetSkillSelectionForPlayer(playerIdx, targetScope));
  if (scoutUiState.activeSkillModalContext && scoutUiState.activeSkillModalContext.scope === targetScope) {
    closeSkillModal();
  }
  if (isErrorPickModeForScope(targetScope)) {
    clearErrorPickMode();
  }
}
