import { SKILLS, RESULT_CODES } from "../../../js/globals.js";
import { skillModalStore } from "../../state/skill-modal-store.mjs";
import { isDesktopCourtModalLayout } from "../layout/modals.js";
import { getAttackMetaForPlayer } from "../scout-ui.js";
import { getPlayersForScope, getPlayerNumbersForScope, getEnabledSkillsForScope, makePlayerKey, isPlayerKeyInScope } from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { formatNameWithNumberFor, formatNameWithNumber } from "../teams/roster-data.js";
import { setSkillModalCancelVisibility, renderSkillCodes, renderSkillChoice, closeSkillModal } from "../live/live-entry.js";
import { updateSetTypeVisibility } from "../live/game-flow.js";
import { getPredictedSkillIdForScope, getPredictedSkillId, isSetterPlayerForScope } from "../live/flow-model.js";
import { session as matchState } from "../../../js/globals.js";
import { clearServeTypeInlineListener, clearAttackSelection, setServeTypeFocusPlayer, startServeTypeSelection, bindServeTypeInlineListener, shouldPromptAttackSetType, startAttackSelection } from "../live/skill-selection.js";
import { renderPlayers } from "../live/team-rendering.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { setNextSetType, formatSetTypeLabelWithShortcut } from "../live/scout-shortcuts.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { handleEventClick } from "../live/event-recording.js";
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
  const button = (text, onClick, extra = {}) =>
    Object.freeze({ text, className: "event-btn", onClick, ...extra });
  const publish = (buttons, onPointerDown = null) =>
    skillModalStore.publish({
      controls: Object.freeze({
        groups: Object.freeze([
          Object.freeze({
            className: "modal-skill-codes",
            buttons: Object.freeze(buttons),
            onPointerDown,
          }),
        ]),
      }),
    });
  if (skillId === "serve" && !scoutUiState.serveMetaByPlayer[key]) {
    if (scoutUiState.serveTypeInlinePlayer !== null && scoutUiState.serveTypeInlinePlayer !== key) return;
    setServeTypeFocusPlayer(playerIdx, scope);
    const select = async (type) => {
      await startServeTypeSelection(
        playerIdx,
        type,
        () => renderSkillCodes(playerIdx, playerName, skillId, scope),
        scope,
      );
    };
    bindServeTypeInlineListener(playerIdx, select, scope);
    publish(
      [
        { id: "F", label: "Float (F)" },
        { id: "JF", label: "Jump float (JF)" },
        { id: "S", label: "Spin (S)" },
      ].map((type) => button(type.label, () => select(type.id))),
      () => setServeTypeFocusPlayer(playerIdx, scope),
    );
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
        startAttackSelection(
          playerIdx,
          queued,
          () => {
            if (scoutUiState.attackMetaByPlayer[key])
              scoutUiState.attackMetaByPlayer[key].fromNextSetType = true;
            scoutUiState.queuedSetTypeChoice = null;
            setNextSetType("");
            renderSkillCodes(playerIdx, playerName, skillId, scope);
          },
          scope,
        );
        return;
      }
      const options = isSetterPlayerForScope(scope, playerIdx)
        ? [{ value: "Damp", label: "Damp" }]
        : liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS;
      publish(
        options.map((option) =>
          button(
            formatSetTypeLabelWithShortcut(option.value, option.label),
            async () => {
              await startAttackSelection(
                playerIdx,
                option.value,
                () => renderSkillCodes(playerIdx, playerName, skillId, scope),
                scope,
              );
            },
          ),
        ),
      );
    } else {
      if (scoutUiState.attackInlinePlayer === key) return;
      startAttackSelection(
        playerIdx,
        null,
        () => renderSkillCodes(playerIdx, playerName, skillId, scope),
        scope,
      );
    }
    return;
  }
  const codes = (
    matchState.state.metricsConfig?.[skillId]?.activeCodes || RESULT_CODES
  ).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  const ordered = codes
    .filter((code) => code !== "/" && code !== "=")
    .concat("/", "=");
  const nameValue = playerName || getPlayersForScope(scope)[playerIdx];
  publish(
    ordered.map((code) =>
      button(
        code,
        async (event) => {
          const attackMeta = getAttackMetaForPlayer(scope, playerIdx);
          const queued = skillId === "attack" && attackMeta?.fromNextSetType;
          const success = await handleEventClick(
            playerIdx,
            skillId,
            code,
            playerName,
            event.currentTarget,
            {
              serveMeta: scoutUiState.serveMetaByPlayer[key] || null,
              attackMeta: attackMeta || null,
              scope,
            },
          );
          if (!success) return;
          delete scoutUiState.serveMetaByPlayer[key];
          if (skillId === "serve") clearServeTypeInlineListener();
          if (skillId === "attack") {
            if (queued) setNextSetType("");
            clearAttackSelection(playerIdx, scope);
          }
          closeSkillModal();
        },
        {
          className:
            "event-btn code-" +
            ((getCodeTone(skillId, code))),
          data: { playerIdx, playerName: nameValue, skillId, code },
        },
      ),
    ),
  );
}
