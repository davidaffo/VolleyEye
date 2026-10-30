import { session as scoutUiState } from "../state/scout-ui.js";
import { makePlayerKey } from "../teams/selectors.js";
import { startServeTypeSelection, startAttackSelection } from "../live/skill-selection.js";
import { renderPlayers } from "../live/team-rendering.js";
import { renderSkillCodes } from "../live/live-entry.js";
import { setNextSetType } from "../live/scout-shortcuts.js";

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
