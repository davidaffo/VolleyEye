import { SKILL_COLORS, SKILLS, RESULT_CODES } from "../../../js/globals.js";
import { makePlayerKey, getEnabledSkillsForScope, isSkillEnabledForScope, isPlayerKeyInScope } from "../teams/selectors.js";
import { getAttackMetaForPlayer, getActiveAttackKeyForScope } from "../scout-ui.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getSelectedSkillForScope, getNetBlockPromptScope, isForcedBlockScope, getServerPlayerForScope, isPostServeLockForScope, getActiveServerName, getAutoFlowState, shouldSkipBlockConfirm, resolveFlowSkillForScope, isBlockEligibleForScope, isSetterPlayerForScope } from "./flow-model.js";
import { setSelectedSkillForScope } from "./game-flow.js";
import { resetSkillSelectionForPlayer, clearServeTypeInlineListener, getServeBaseZoneForPlayer, clearAttackSelection, startServeTypeSelection, bindServeTypeInlineListener, setServeTypeFocusPlayer, shouldPromptAttackSetType, startAttackSelection } from "./skill-selection.js";
import { renderPlayers } from "./team-rendering.js";
import { session as matchState } from "../../../js/globals.js";
import { handleEventClick } from "./event-recording.js";
import { forceNextSkill } from "./trajectories.js";
import { saveState } from "../storage/save-state.js";
import { scheduleRenderPlayers, openSkillCodesModal, openSkillModal } from "./live-entry.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { setNextSetType, formatSetTypeLabelWithShortcut } from "./scout-shortcuts.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { getCodeTone } from "../settings/rules.js";

export function buildScoutSkillView(
  playerIdx,
  activeName,
  { nextSkillId = null, scope = "our" } = {},
) {
  const playerKey = makePlayerKey(scope, playerIdx);
  const selectedSkill = getSelectedSkillForScope(scope, playerIdx);
  const attackLocked = scoutUiState.attackInlinePlayer === playerKey;
  const rawNext = attackLocked ? "attack" : nextSkillId || null;
  const blockContext =
    selectedSkill === "block" ||
    rawNext === "block" ||
    scoutUiState.blockInlinePlayer === playerKey;
  if (!blockContext && scoutUiState.blockConfirmByPlayer[playerKey] !== undefined) {
    delete scoutUiState.blockConfirmByPlayer[playerKey];
    if (scoutUiState.blockInlinePlayer === playerKey) scoutUiState.blockInlinePlayer = null;
  }
  const hasSelection =
    !!selectedSkill ||
    !!scoutUiState.serveMetaByPlayer[playerKey] ||
    !!getAttackMetaForPlayer(scope, playerIdx) ||
    attackLocked ||
    scoutUiState.serveTypeInlinePlayer === playerKey ||
    !!scoutUiState.blockConfirmByPlayer[playerKey];
  const view = {
    cancel: hasSelection
      ? () => {
          resetSkillSelectionForPlayer(playerIdx, scope);
          renderPlayers();
        }
      : null,
    groups: [],
  };
  const button = (text, className, onClick, extra = {}) =>
    Object.freeze({ text, className, onClick, ...extra });
  const colors = (skill) =>
    SKILL_COLORS[skill] || { bg: "#2f2f2f", text: "#e5e7eb" };
  const style = (skill) => ({
    backgroundColor: colors(skill).bg,
    color: colors(skill).text,
  });
  const group = (className, buttons, header = null, onPointerDown = null) => {
    view.groups.push(
      Object.freeze({
        className,
        buttons: Object.freeze(buttons),
        header,
        onPointerDown,
      }),
    );
    return Object.freeze(view);
  };
  const heading = (skill, text, next = false, colored = false) =>
    Object.freeze({
      text,
      className: "skill-title skill-" + skill + (next ? " next-skill" : ""),
      style: colored ? style(skill) : null,
    });
  const note = (text) => {
    view.note = text;
    return Object.freeze(view);
  };
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
  const serveError = () =>
    group(
      "code-grid",
      [
        button(
          "=",
          "event-btn code-negative",
          async (event) => {
            const success = await handleEventClick(
              playerIdx,
              "serve",
              "=",
              activeName,
              event.currentTarget,
              { scope },
            );
            if (!success) return;
            clearServeTypeInlineListener();
            setSelectedSkillForScope(scope, playerIdx, null);
            renderPlayers();
          },
          {
            data: {
              playerIdx,
              playerName: activeName,
              skillId: "serve",
              code: "=",
            },
          },
        ),
      ],
      heading("serve", "Battuta", false, true),
    );
  if (
    matchState.state.useOpponentTeam &&
    matchState.state.predictiveSkillFlow &&
    !(matchState.state.forceSkillActive && matchState.state.forceSkillScope === scope)
  ) {
    if (matchState.state.pendingServe?.scope === scope) {
      if (compact) return note("In attesa dell'altra squadra.");
      const server = getServerPlayerForScope(scope);
      const name = matchState.state.pendingServe.playerName || server?.name || null;
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
    return group(
      "code-grid block-confirm-grid",
      [
        button("No muro", "event-btn block-confirm-skip", () => {
          delete scoutUiState.blockConfirmByPlayer[playerKey];
          if (scoutUiState.blockInlinePlayer === playerKey) scoutUiState.blockInlinePlayer = null;
          setSelectedSkillForScope(scope, playerIdx, null);
          if (scope === "our")
            forceNextSkill("defense");
          else if (scope === "opponent") {
            matchState.state.opponentSkillFlowOverride = "defense";
            saveState();
          }
          scheduleRenderPlayers();
        }),
        button("Muro", "event-btn block-confirm-go", () => {
          scoutUiState.blockInlinePlayer = playerKey;
          scoutUiState.blockConfirmByPlayer[playerKey] = true;
          scheduleRenderPlayers();
        }),
      ],
      mobile ? null : heading("block", "Muro"),
    );
  };
  if (compact) {
    let picked = rawNext;
    if (blockPrompt)
      picked = resolveFlowSkillForScope(scope, "defense") || "defense";
    if (picked === "serve" && getServeBaseZoneForPlayer(playerIdx, scope) !== 1)
      return Object.freeze(view);
    if (
      rawNext === "block" &&
      (!isBlockEligibleForScope(scope) || blockOther())
    )
      return Object.freeze(view);
    if (
      rawNext === "block" &&
      !blockPrompt &&
      scoutUiState.blockConfirmByPlayer[playerKey] !== true
    ) {
      const confirmation = confirmBlock(true);
      if (confirmation) return confirmation;
    }
    const skill = SKILLS.find((item) => item.id === picked);
    return group(null, [
      button(
        picked ? skill?.label || picked : "Seleziona skill",
        "skill-picker-btn skill-single-btn" +
          (picked ? " skill-" + picked : ""),
        () => {
          if (picked) openSkillCodesModal(playerIdx, activeName, picked, scope);
          else openSkillModal(playerIdx, activeName, scope);
        },
        { style: picked ? style(picked) : null },
      ),
    ]);
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
    scheduleRenderPlayers();
    return Object.freeze(view);
  }
  if (picked !== "serve" && scoutUiState.serveTypeInlinePlayer === playerKey)
    clearServeTypeInlineListener();
  if (picked !== "attack" && scoutUiState.attackInlinePlayer === playerKey)
    clearAttackSelection(playerIdx, scope);
  if (!picked)
    return group(
      "skill-grid",
      enabled
        .filter((skill) => skill.id !== "block" || !blockOther())
        .map((skill) =>
          button(
            skill.label,
            "skill-picker-btn skill-" + skill.id,
            () => {
              setSelectedSkillForScope(scope, playerIdx, skill.id);
              scheduleRenderPlayers();
            },
            { style: style(skill.id) },
          ),
        ),
    );
  if (picked === "serve" && !scoutUiState.serveMetaByPlayer[playerKey]) {
    if (getServeBaseZoneForPlayer(playerIdx, scope) !== 1)
      return note("La battuta è disponibile solo per la zona 1.");
    if (scoutUiState.serveTypeInlinePlayer !== null && scoutUiState.serveTypeInlinePlayer !== playerKey)
      return Object.freeze(view);
    const select = async (type) => {
      await startServeTypeSelection(playerIdx, type, renderPlayers, scope);
    };
    bindServeTypeInlineListener(playerIdx, select, scope);
    return group(
      "code-grid serve-type-grid",
      [
        { id: "F", label: "Float (F)" },
        { id: "JF", label: "Jump float (JF)" },
        { id: "S", label: "Spin (S)" },
      ].map((type) => button(type.label, "event-btn", () => select(type.id))),
      heading("serve", "Battuta · tipo"),
      () => setServeTypeFocusPlayer(playerIdx, scope),
    );
  }
  if (picked === "attack" && !getAttackMetaForPlayer(scope, playerIdx)) {
    if (
      scoutUiState.attackInlinePlayer !== null &&
      scoutUiState.attackInlinePlayer !== playerKey &&
      isPlayerKeyInScope(scoutUiState.attackInlinePlayer, scope)
    )
      return Object.freeze(view);
    const header = heading("attack", "Attacco");
    if (shouldPromptAttackSetType(scope)) {
      const queued = normalizeSetTypeValue(scoutUiState.queuedSetTypeChoice);
      if (
        queued &&
        queued.toLowerCase() === "damp" &&
        isSetterPlayerForScope(scope, playerIdx)
      ) {
        if (scoutUiState.attackInlinePlayer === playerKey) return Object.freeze(view);
        const choice = scoutUiState.queuedSetTypeChoice;
        scoutUiState.queuedSetTypeChoice = null;
        setNextSetType("");
        startAttackSelection(
          playerIdx,
          choice,
          () => {
            if (scoutUiState.attackMetaByPlayer[playerKey])
              scoutUiState.attackMetaByPlayer[playerKey].fromNextSetType = true;
            renderPlayers();
          },
          scope,
        );
        return Object.freeze(view);
      }
      if (queued)
        return group(
          "code-grid attack-select-grid",
          [
            button("Attacco", "event-btn attack-main-btn", async () => {
              await startAttackSelection(
                playerIdx,
                queued,
                renderPlayers,
                scope,
              );
              if (scoutUiState.attackMetaByPlayer[playerKey])
                scoutUiState.attackMetaByPlayer[playerKey].fromNextSetType = true;
              scoutUiState.queuedSetTypeChoice = null;
              setNextSetType("");
            }),
          ],
          header,
        );
      const options = isSetterPlayerForScope(scope, playerIdx)
        ? [{ value: "Damp", label: "Damp" }]
        : liveScoreAndSetState.DEFAULT_SET_TYPE_OPTIONS;
      return group(
        "code-grid attack-select-grid",
        options.map((option) =>
          button(
            formatSetTypeLabelWithShortcut(option.value, option.label),
            "event-btn",
            async () => {
              await startAttackSelection(
                playerIdx,
                option.value,
                renderPlayers,
                scope,
              );
            },
          ),
        ),
        header,
      );
    }
    return group(
      "code-grid attack-select-grid",
      [
        button("Attacco", "event-btn attack-main-btn", async () => {
          await startAttackSelection(playerIdx, null, renderPlayers, scope);
        }),
      ],
      header,
    );
  }
  if (rawNext === "block" && blockOther()) return Object.freeze(view);
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
  const skill = SKILLS.find((item) => item.id === picked);
  const codes = (
    matchState.state.metricsConfig[picked]?.activeCodes || RESULT_CODES
  ).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  const ordered = codes
    .filter((code) => code !== "/" && code !== "=")
    .concat("/", "=");
  const buttons = ordered.map((code) =>
    button(
      code,
      "event-btn code-" +
        ((getCodeTone(picked, code))),
      async (event) => {
        const success = await handleEventClick(
          playerIdx,
          picked,
          code,
          activeName,
          event.currentTarget,
          {
            serveMeta: scoutUiState.serveMetaByPlayer[playerKey] || null,
            attackMeta: getAttackMetaForPlayer(scope, playerIdx) || null,
            scope,
          },
        );
        if (!success) return;
        delete scoutUiState.serveMetaByPlayer[playerKey];
        if (picked === "serve") clearServeTypeInlineListener();
        if (picked === "attack") clearAttackSelection(playerIdx, scope);
        if (picked === "block") {
          delete scoutUiState.blockConfirmByPlayer[playerKey];
          if (scoutUiState.blockInlinePlayer === playerKey) scoutUiState.blockInlinePlayer = null;
        }
        setSelectedSkillForScope(scope, playerIdx, null);
        renderPlayers();
      },
      { data: { playerIdx, playerName: activeName, skillId: picked, code } },
    ),
  );
  if (!(matchState.state.predictiveSkillFlow && nextSkillId))
    buttons.push(
      button(
        "← Scegli un altro fondamentale",
        "secondary small code-back-btn",
        () => {
          setSelectedSkillForScope(scope, playerIdx, null);
          renderPlayers();
        },
      ),
    );
  return group(
    "code-grid",
    buttons,
    heading(picked, skill?.label || picked, !!nextSkillId, true),
  );
}
