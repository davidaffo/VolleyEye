import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { makePlayerKey } from "../teams/selectors.js";
import { getAttackMetaForPlayer } from "../live/flow-model.js";
import { setSelectedSkillForScope } from "../live/game-flow.js";
import {
  resetSkillSelectionForPlayer,
  clearServeTypeInlineListener,
  clearAttackSelection,
  startServeTypeSelection,
  startAttackSelection,
  setServeTypeFocusPlayer,
} from "../live/skill-selection.js";
import { renderPlayers } from "../live/team-rendering.js";
import { handleEventClick } from "../live/event-recording.js";
import { forceNextSkill } from "../live/trajectories.js";
import { saveState } from "../storage/save-state.js";
import {
  scheduleRenderPlayers,
  openSkillCodesModal,
  openSkillModal,
  renderSkillCodes,
  closeSkillModal,
} from "../live/live-entry.js";
import { setNextSetType } from "../live/scout-shortcuts.js";

export function cancelScoutSkillSelection({ playerIdx, scope }) {
  resetSkillSelectionForPlayer(playerIdx, scope);
  renderPlayers();
}
export function leaveScoutSkillEvaluation({ playerIdx, scope }) {
  setSelectedSkillForScope(scope, playerIdx, null);
  renderPlayers();
}
export function chooseScoutSkill({ playerIdx, scope }, skillId) {
  setSelectedSkillForScope(scope, playerIdx, skillId);
  scheduleRenderPlayers();
}
export function openScoutSkillPicker(
  { playerIdx, activeName, scope, inModal },
  skillId,
) {
  if (skillId) openSkillCodesModal(playerIdx, activeName, skillId, scope);
  else openSkillModal(playerIdx, activeName, scope);
}
export function confirmScoutBlock({ playerIdx, scope }, confirmed) {
  const key = makePlayerKey(scope, playerIdx);
  if (confirmed) {
    scoutUiState.blockInlinePlayer = key;
    scoutUiState.blockConfirmByPlayer[key] = true;
  } else {
    delete scoutUiState.blockConfirmByPlayer[key];
    if (scoutUiState.blockInlinePlayer === key)
      scoutUiState.blockInlinePlayer = null;
    setSelectedSkillForScope(scope, playerIdx, null);
    if (scope === "our") forceNextSkill("defense");
    else if (scope === "opponent") {
      matchState.state.opponentSkillFlowOverride = "defense";
      saveState();
    }
  }
  scheduleRenderPlayers();
}
function refreshScoutSkill(player) {
  if (player.inModal)
    renderSkillCodes(
      player.playerIdx,
      player.activeName,
      player.skillId,
      player.scope,
    );
  else renderPlayers();
}
export async function selectScoutServeType(player, type) {
  const { playerIdx, scope } = player;
  await startServeTypeSelection(
    playerIdx,
    type,
    player.inModal ? () => refreshScoutSkill(player) : renderPlayers,
    scope,
  );
}
export async function startScoutAttack(player, choice, queued = false) {
  const { playerIdx, scope, inModal } = player;
  const markQueued = () => {
    const key = makePlayerKey(scope, playerIdx);
    if (scoutUiState.attackMetaByPlayer[key])
      scoutUiState.attackMetaByPlayer[key].fromNextSetType = true;
    scoutUiState.queuedSetTypeChoice = null;
    setNextSetType("");
  };
  const done = inModal
    ? () => {
        if (queued) markQueued();
        refreshScoutSkill(player);
      }
    : renderPlayers;
  await startAttackSelection(playerIdx, choice, done, scope);
  if (queued && !inModal) markQueued();
}
export function startQueuedSetterAttack({ playerIdx, scope }, choice) {
  const key = makePlayerKey(scope, playerIdx);
  scoutUiState.queuedSetTypeChoice = null;
  setNextSetType("");
  startAttackSelection(
    playerIdx,
    choice,
    () => {
      if (scoutUiState.attackMetaByPlayer[key])
        scoutUiState.attackMetaByPlayer[key].fromNextSetType = true;
      renderPlayers();
    },
    scope,
  );
}
export async function recordScoutSkill(
  { playerIdx, activeName, scope, inModal },
  skillId,
  code,
  serveErrorOnly,
  event,
) {
  const key = makePlayerKey(scope, playerIdx);
  const modalAttackMeta = inModal
    ? getAttackMetaForPlayer(scope, playerIdx)
    : null;
  const queued =
    inModal && skillId === "attack" && modalAttackMeta?.fromNextSetType;
  const options = serveErrorOnly
    ? { scope }
    : {
        serveMeta: scoutUiState.serveMetaByPlayer[key] || null,
        attackMeta: inModal
          ? modalAttackMeta || null
          : getAttackMetaForPlayer(scope, playerIdx) || null,
        scope,
      };
  const success = await handleEventClick(
    playerIdx,
    skillId,
    code,
    activeName,
    event.currentTarget,
    options,
  );
  if (!success) return;
  if (serveErrorOnly) clearServeTypeInlineListener();
  else {
    delete scoutUiState.serveMetaByPlayer[key];
    if (skillId === "serve") clearServeTypeInlineListener();
    if (skillId === "attack") {
      if (queued) setNextSetType("");
      clearAttackSelection(playerIdx, scope);
    }
    if (skillId === "block" && !inModal) {
      delete scoutUiState.blockConfirmByPlayer[key];
      if (scoutUiState.blockInlinePlayer === key)
        scoutUiState.blockInlinePlayer = null;
    }
  }
  if (inModal) closeSkillModal();
  else leaveScoutSkillEvaluation({ playerIdx, scope });
}
const scoutSkillCommands = Object.freeze({
  cancelScoutSkillSelection,
  leaveScoutSkillEvaluation,
  chooseScoutSkill,
  openScoutSkillPicker,
  confirmScoutBlock,
  selectScoutServeType,
  startScoutAttack,
  recordScoutSkill,
  setServeTypeFocusPlayer: ({ playerIdx, scope }) =>
    setServeTypeFocusPlayer(playerIdx, scope),
});
export function runScoutSkillAction(action, event) {
  if (!action) return;
  const command = Object.hasOwn(scoutSkillCommands, action.command)
    ? scoutSkillCommands[action.command]
    : null;
  if (typeof command !== "function")
    throw new Error(`Azione scout sconosciuta: ${action.command}`);
  return command(...action.args, event);
}
