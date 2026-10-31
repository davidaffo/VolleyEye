import { getScoutAttackTypeOptions, buildPreparedScoutSkillView, getScoutSkillCodes } from "./skill-control-model.js";
import { SKILLS, session as matchState } from "../../../js/globals.js";
import { skillModalStore } from "../../state/skill-modal-store.mjs";
import { getAttackMetaForPlayer, getPredictedSkillIdForScope, getPredictedSkillId, isSetterPlayerForScope } from "../live/flow-model.js";
import { getPlayersForScope, getPlayerNumbersForScope, getEnabledSkillsForScope, makePlayerKey, isPlayerKeyInScope } from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { updateSetTypeVisibility } from "./flow-view.js";
import { clearServeTypeInlineListener, setServeTypeFocusPlayer, bindServeTypeInlineListener } from "./serve-keyboard.js";
import { clearAttackSelection, shouldPromptAttackSetType } from "./selection-state.js";
import { renderPlayers, setNextSetType } from "../live/team-rendering.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { getCodeTone } from "../settings/rules.js";
import { setSkillModalCancelVisibility, closeSkillModal } from "./skill-modal-state.js";
import { startServeTypeSelection, startAttackSelection } from "./selection-flow.js";

export function skillModalPlayerLabel(playerIdx, playerName, scope) {
  const name = playerName || getPlayersForScope(scope)[playerIdx];
  return (
    (scope === "opponent"
      ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
      : formatNameWithNumber(name)) ||
    name ||
    "Giocatrice"
  );
}

export function publishSkillModalChoice(playerIdx, playerName, scope) {
  setSkillModalCancelVisibility(false);
  scoutUiState.activeSkillModalContext = {
    playerIdx,
    playerName: playerName || null,
    skillId: null,
    scope,
  };
  updateSetTypeVisibility(
    getPredictedSkillIdForScope(scope) || getPredictedSkillId(),
  );
  matchState.modalMode = "skill";
  const skills = getEnabledSkillsForScope(scope);
  skillModalStore.publish({
    title:
      skillModalPlayerLabel(playerIdx, playerName, scope) +
      " · scegli fondamentale",
    choices: Object.freeze(
      skills.map((skill) =>
        Object.freeze({
          id: skill.id,
          label: skill.label,
          onChoose: () =>
            renderSkillCodes(playerIdx, playerName, skill.id, scope),
        }),
      ),
    ),
    controls: null,
    onBack: null,
  });
}

export function publishSkillModalCodes(playerIdx, playerName, skillId, scope) {
  setSkillModalCancelVisibility(true);
  scoutUiState.activeSkillModalContext = {
    playerIdx,
    playerName: playerName || null,
    skillId,
    scope,
  };
  const predicted = getPredictedSkillIdForScope(scope) || getPredictedSkillId();
  updateSetTypeVisibility(skillId === "attack" ? "attack" : predicted);
  matchState.modalMode = "skill-codes";
  const skill = SKILLS.find((item) => item.id === skillId);
  const title =
    (skill ? skill.label + " · " : "") +
    skillModalPlayerLabel(playerIdx, playerName, scope);
  const key = makePlayerKey(scope, playerIdx);
  const onBack = () => {
    delete scoutUiState.serveMetaByPlayer[key];
    clearServeTypeInlineListener();
    clearAttackSelection(playerIdx, scope);
    renderSkillChoice(playerIdx, playerName, scope);
  };
  const base = {
    title,
    choices: null,
    onBack,
    controls: Object.freeze({ groups: Object.freeze([]) }),
  };
  skillModalStore.publish(base);
  if (
    skillId === "serve" &&
    matchState.state.useOpponentTeam &&
    matchState.state.predictiveSkillFlow &&
    matchState.state.pendingServe?.scope === scope
  ) {
    closeSkillModal();
    renderPlayers();
    return;
  }
  if (skillId !== "serve" && scoutUiState.serveTypeInlinePlayer === key)
    clearServeTypeInlineListener();
  if (skillId !== "attack" && scoutUiState.attackInlinePlayer === key)
    clearAttackSelection(playerIdx, scope);
  const player = {
    playerIdx,
    activeName: playerName,
    scope,
    skillId,
    inModal: true,
  };
  const publish = (prepared) => {
    const controls = buildPreparedScoutSkillView({
      player,
      hasSelection: false,
      ...prepared,
    });
    skillModalStore.publish({
      controls: Object.freeze({ groups: Object.freeze(controls.groups) }),
    });
  };
  if (skillId === "serve" && !scoutUiState.serveMetaByPlayer[key]) {
    if (
      scoutUiState.serveTypeInlinePlayer !== null &&
      scoutUiState.serveTypeInlinePlayer !== key
    )
      return;
    setServeTypeFocusPlayer(playerIdx, scope);
    const select = (type) => selectScoutServeType(player, type);
    bindServeTypeInlineListener(playerIdx, select, scope);
    publish({ kind: "serve-types" });
    return;
  }
  if (skillId === "attack" && !getAttackMetaForPlayer(scope, playerIdx)) {
    if (
      scoutUiState.attackInlinePlayer !== null &&
      scoutUiState.attackInlinePlayer !== key &&
      isPlayerKeyInScope(scoutUiState.attackInlinePlayer, scope)
    )
      return;
    if (shouldPromptAttackSetType(scope)) {
      const queued = normalizeSetTypeValue(scoutUiState.queuedSetTypeChoice);
      if (queued) {
        startScoutAttack(player, queued, true);
        return;
      }
      publish({
        kind: "attack-types",
        options: getScoutAttackTypeOptions(
          isSetterPlayerForScope(scope, playerIdx),
        ),
      });
    } else {
      if (scoutUiState.attackInlinePlayer === key) return;
      startScoutAttack(player, null, false);
    }
    return;
  }
  const ordered = getScoutSkillCodes(
    skillId,
    matchState.state.metricsConfig || {},
  );
  const nameValue = playerName || getPlayersForScope(scope)[playerIdx];
  publish({
    kind: "codes",
    picked: skillId,
    playerName: nameValue,
    codes: ordered.map((code) => ({ code, tone: getCodeTone(skillId, code) })),
  });
}


export function renderSkillChoice(playerIdx, playerName, scope = "our") {
  if (matchState.state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  if (!matchState.elSkillModalBody) return;

 publishSkillModalChoice(playerIdx, playerName, scope); return;
}

export function renderSkillCodes(playerIdx, playerName, skillId, scope = "our") {
  if (!matchState.elSkillModalBody) return;

 publishSkillModalCodes(playerIdx, playerName, skillId, scope); return;
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
