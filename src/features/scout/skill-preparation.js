import { getScoutAttackTypeOptions, getScoutSkillCodes } from "./skill-control-model.js";
import { startServeTypeSelection } from "./selection-flow.js";
import { makePlayerKey, getEnabledSkillsForScope, isSkillEnabledForScope, isPlayerKeyInScope } from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getAttackMetaForPlayer, getActiveAttackKeyForScope, getSelectedSkillForScope, getNetBlockPromptScope, isForcedBlockScope, getServerPlayerForScope, isPostServeLockForScope, getActiveServerName, getAutoFlowState, shouldSkipBlockConfirm, resolveFlowSkillForScope, isBlockEligibleForScope, isSetterPlayerForScope, setSelectedSkillForScope } from "../live/flow-model.js";
import { clearServeTypeInlineListener, bindServeTypeInlineListener } from "./serve-keyboard.js";
import { getServeBaseZoneForPlayer, clearAttackSelection, shouldPromptAttackSetType } from "./selection-state.js";
import { session as matchState } from "../../../js/globals.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { getCodeTone } from "../settings/rules.js";

export function prepareScoutSkillControls(
  playerIdx,
  activeName,
  { nextSkillId = null, scope = "our" } = {},
  effects,
) {
  const playerKey = makePlayerKey(scope, playerIdx);
  const selectedSkill = getSelectedSkillForScope(scope, playerIdx);
  const attackLocked = scoutUiState.attackInlinePlayer === playerKey;
  const rawNext = attackLocked ? "attack" : nextSkillId || null;
  const blockContext =
    selectedSkill === "block" ||
    rawNext === "block" ||
    scoutUiState.blockInlinePlayer === playerKey;
  if (
    !blockContext &&
    scoutUiState.blockConfirmByPlayer[playerKey] !== undefined
  ) {
    delete scoutUiState.blockConfirmByPlayer[playerKey];
    if (scoutUiState.blockInlinePlayer === playerKey)
      scoutUiState.blockInlinePlayer = null;
  }
  const hasSelection =
    !!selectedSkill ||
    !!scoutUiState.serveMetaByPlayer[playerKey] ||
    !!getAttackMetaForPlayer(scope, playerIdx) ||
    attackLocked ||
    scoutUiState.serveTypeInlinePlayer === playerKey ||
    !!scoutUiState.blockConfirmByPlayer[playerKey];
  const player = { playerIdx, activeName, scope };
  const finish = (kind, details = {}) =>
    Object.freeze({ player, hasSelection, kind, ...details });
  const empty = () => finish("empty");
  const note = (text) => finish("note", { text });
  const compact =
    !!matchState.state.forceMobileLayout ||
    window.matchMedia("(max-width: 900px)").matches;
  const blockPrompt =
    rawNext === "block" &&
    getNetBlockPromptScope() === scope &&
    !isForcedBlockScope(scope);
  const enabled = getEnabledSkillsForScope(scope);
  if (!enabled.length)
    return note(
      "Abilita almeno un fondamentale nelle impostazioni per scoutizzare.",
    );
  const activeAttack = getActiveAttackKeyForScope(scope);
  if (activeAttack && activeAttack !== playerKey)
    return note("Attacco in corso: completa la valutazione.");
  const serveError = () => finish("serve-error");
  if (
    matchState.state.useOpponentTeam &&
    matchState.state.predictiveSkillFlow &&
    !(
      matchState.state.forceSkillActive &&
      matchState.state.forceSkillScope === scope
    )
  ) {
    if (matchState.state.pendingServe?.scope === scope) {
      if (compact) return note("In attesa dell'altra squadra.");
      const server = getServerPlayerForScope(scope);
      const name =
        matchState.state.pendingServe.playerName || server?.name || null;
      const index =
        typeof matchState.state.pendingServe.playerIdx === "number"
          ? matchState.state.pendingServe.playerIdx
          : null;
      if (
        ((index !== null && index === playerIdx) ||
          (name &&
            activeName &&
            name.trim().toLowerCase() === activeName.trim().toLowerCase())) &&
        isSkillEnabledForScope("serve", scope)
      )
        return serveError();
      return note("In attesa dell'altra squadra.");
    }
    if (isPostServeLockForScope(scope)) {
      if (
        getActiveServerName(scope) === activeName &&
        activeName &&
        isSkillEnabledForScope("serve", scope)
      )
        return serveError();
      return note("In attesa dell'altra squadra.");
    }
    const flow = getAutoFlowState();
    const server = getServerPlayerForScope(scope);
    if (
      flow?.teamScope &&
      flow.teamScope !== scope &&
      flow.skillId === "pass" &&
      isSkillEnabledForScope("serve", scope) &&
      server?.name === activeName
    )
      return serveError();
    if (flow?.teamScope && flow.teamScope !== scope)
      return note("In attesa dell'altra squadra.");
  }
  const blockOther = () =>
    scoutUiState.blockInlinePlayer !== null &&
    scoutUiState.blockInlinePlayer !== playerKey &&
    isPlayerKeyInScope(scoutUiState.blockInlinePlayer, scope);
  const confirmBlock = (mobile) => {
    if (shouldSkipBlockConfirm(scope)) {
      scoutUiState.blockConfirmByPlayer[playerKey] = true;
      return null;
    }
    return finish("block-confirm", { mobile });
  };
  if (compact) {
    let picked = rawNext;
    if (blockPrompt)
      picked = resolveFlowSkillForScope(scope, "defense") || "defense";
    if (picked === "serve" && getServeBaseZoneForPlayer(playerIdx, scope) !== 1)
      return empty();
    if (
      rawNext === "block" &&
      (!isBlockEligibleForScope(scope) || blockOther())
    )
      return empty();
    if (
      rawNext === "block" &&
      !blockPrompt &&
      scoutUiState.blockConfirmByPlayer[playerKey] !== true
    ) {
      const confirmation = confirmBlock(true);
      if (confirmation) return confirmation;
    }
    return finish("picker", { picked });
  }
  let picked =
    (attackLocked ? "attack" : nextSkillId) ??
    getSelectedSkillForScope(scope, playerIdx);
  if (blockPrompt && picked === "block")
    picked = resolveFlowSkillForScope(scope, "defense") || "defense";
  if (picked && !enabled.some((skill) => skill.id === picked)) {
    if (!nextSkillId) setSelectedSkillForScope(scope, playerIdx, null);
    picked = null;
  }
  if (
    picked === "serve" &&
    matchState.state.useOpponentTeam &&
    matchState.state.predictiveSkillFlow &&
    scoutUiState.serveMetaByPlayer[playerKey]
  ) {
    matchState.state.pendingServe = {
      scope,
      playerIdx,
      playerName: activeName,
      meta: scoutUiState.serveMetaByPlayer[playerKey],
    };
    delete scoutUiState.serveMetaByPlayer[playerKey];
    setSelectedSkillForScope(scope, playerIdx, null);
    effects.onScheduleRender();
    return empty();
  }
  if (picked !== "serve" && scoutUiState.serveTypeInlinePlayer === playerKey)
    clearServeTypeInlineListener();
  if (picked !== "attack" && scoutUiState.attackInlinePlayer === playerKey)
    clearAttackSelection(playerIdx, scope);
  if (!picked)
    return finish("skills", {
      skills: enabled.filter((skill) => skill.id !== "block" || !blockOther()),
    });
  if (picked === "serve" && !scoutUiState.serveMetaByPlayer[playerKey]) {
    if (getServeBaseZoneForPlayer(playerIdx, scope) !== 1)
      return note("La battuta è disponibile solo per la zona 1.");
    if (
      scoutUiState.serveTypeInlinePlayer !== null &&
      scoutUiState.serveTypeInlinePlayer !== playerKey
    )
      return empty();
    const select = (type) => startServeTypeSelection(playerIdx, type, effects.onRender, scope);
    bindServeTypeInlineListener(playerIdx, select, scope);
    return finish("serve-types");
  }
  if (picked === "attack" && !getAttackMetaForPlayer(scope, playerIdx)) {
    if (
      scoutUiState.attackInlinePlayer !== null &&
      scoutUiState.attackInlinePlayer !== playerKey &&
      isPlayerKeyInScope(scoutUiState.attackInlinePlayer, scope)
    )
      return empty();
    if (shouldPromptAttackSetType(scope)) {
      const queued = normalizeSetTypeValue(scoutUiState.queuedSetTypeChoice);
      if (
        queued &&
        queued.toLowerCase() === "damp" &&
        isSetterPlayerForScope(scope, playerIdx)
      ) {
        if (scoutUiState.attackInlinePlayer === playerKey) return empty();
        const choice = scoutUiState.queuedSetTypeChoice;
        effects.onQueuedAttack(player, choice);
        return empty();
      }
      if (queued)
        return finish("attack-types", {
          options: [
            { value: queued, label: "Attacco", queued: true, main: true },
          ],
        });
      return finish("attack-types", {
        options: getScoutAttackTypeOptions(
          isSetterPlayerForScope(scope, playerIdx),
        ),
      });
    }
    return finish("attack-types", {
      options: [{ value: null, label: "Attacco", main: true }],
    });
  }
  if (rawNext === "block" && blockOther()) return empty();
  if (
    rawNext === "block" &&
    !blockPrompt &&
    scoutUiState.blockConfirmByPlayer[playerKey] !== true
  ) {
    const confirmation = confirmBlock(false);
    if (confirmation) return confirmation;
  }
  if (
    picked === "attack" &&
    ((scoutUiState.attackInlinePlayer !== null &&
      scoutUiState.attackInlinePlayer !== playerKey &&
      isPlayerKeyInScope(scoutUiState.attackInlinePlayer, scope)) ||
      !getAttackMetaForPlayer(scope, playerIdx))
  )
    return note("Attacco in corso: completa la valutazione.");
  return finish("codes", {
    picked,
    codes: getScoutSkillCodes(picked).map((code) => ({
      code,
      tone: getCodeTone(picked, code),
    })),
    showBack: !(matchState.state.predictiveSkillFlow && nextSkillId),
    next: !!nextSkillId,
  });
}
