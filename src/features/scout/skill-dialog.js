import { getScoutAttackTypeOptions } from "./skill-control-model.js";
import {
  buildPreparedScoutSkillView,
  getScoutSkillCodes,
} from "./skill-control-model.js";
import { selectScoutServeType, startScoutAttack } from "./selection-commands.js";
import { SKILLS } from "../../../js/globals.js";
import { skillModalStore } from "../../state/skill-modal-store.mjs";
import { isDesktopCourtModalLayout } from "../layout/modals.js";
import { getAttackMetaForPlayer } from "../live/flow-model.js";
import {
  getPlayersForScope,
  getPlayerNumbersForScope,
  getEnabledSkillsForScope,
  makePlayerKey,
  isPlayerKeyInScope,
} from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import {
  setSkillModalCancelVisibility,
  renderSkillCodes,
  renderSkillChoice,
  closeSkillModal,
} from "../live/live-entry.js";
import { updateSetTypeVisibility } from "../live/game-flow.js";
import {
  getPredictedSkillIdForScope,
  getPredictedSkillId,
  isSetterPlayerForScope,
} from "../live/flow-model.js";
import { session as matchState } from "../../../js/globals.js";
import { clearServeTypeInlineListener, setServeTypeFocusPlayer, bindServeTypeInlineListener } from "./serve-keyboard.js";
import { clearAttackSelection, shouldPromptAttackSetType } from "./selection-state.js";
import { renderPlayers } from "../live/team-rendering.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";

import { getCodeTone } from "../settings/rules.js";

export function publishSkillModalCancel(cancelVisible) {
  skillModalStore.publish({ cancelVisible });
}

export function setSkillModalOpen(open) {
  skillModalStore.publish({ open, courtModal: isDesktopCourtModalLayout() });
}

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
