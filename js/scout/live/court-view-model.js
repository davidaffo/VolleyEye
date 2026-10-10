// Domain view models describe available scout actions without constructing DOM nodes.
// React owns the controls; these callbacks retain the established scoring workflows.
function buildScoutSkillView(
  playerIdx,
  activeName,
  { nextSkillId = null, scope = "our" } = {},
) {
  const playerKey = makePlayerKey(scope, playerIdx);
  const selectedSkill = getSelectedSkillForScope(scope, playerIdx);
  const attackLocked = attackInlinePlayer === playerKey;
  const rawNext = attackLocked ? "attack" : nextSkillId || null;
  const blockContext =
    selectedSkill === "block" ||
    rawNext === "block" ||
    blockInlinePlayer === playerKey;
  if (!blockContext && blockConfirmByPlayer[playerKey] !== undefined) {
    delete blockConfirmByPlayer[playerKey];
    if (blockInlinePlayer === playerKey) blockInlinePlayer = null;
  }
  const hasSelection =
    !!selectedSkill ||
    !!serveMetaByPlayer[playerKey] ||
    !!getAttackMetaForPlayer(scope, playerIdx) ||
    attackLocked ||
    serveTypeInlinePlayer === playerKey ||
    !!blockConfirmByPlayer[playerKey];
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
    !!state.forceMobileLayout ||
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
    state.useOpponentTeam &&
    state.predictiveSkillFlow &&
    !(state.forceSkillActive && state.forceSkillScope === scope)
  ) {
    if (state.pendingServe?.scope === scope) {
      if (compact) return note("In attesa dell'altra squadra.");
      const server = getServerPlayerForScope(scope);
      const name = state.pendingServe.playerName || server?.name || null;
      const index =
        typeof state.pendingServe.playerIdx === "number"
          ? state.pendingServe.playerIdx
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
    blockInlinePlayer !== null &&
    blockInlinePlayer !== playerKey &&
    isPlayerKeyInScope(blockInlinePlayer, scope);
  const confirmBlock = (mobile) => {
    if (shouldSkipBlockConfirm(scope)) {
      blockConfirmByPlayer[playerKey] = true;
      return null;
    }
    return group(
      "code-grid block-confirm-grid",
      [
        button("No muro", "event-btn block-confirm-skip", () => {
          delete blockConfirmByPlayer[playerKey];
          if (blockInlinePlayer === playerKey) blockInlinePlayer = null;
          setSelectedSkillForScope(scope, playerIdx, null);
          if (typeof forceNextSkill === "function" && scope === "our")
            forceNextSkill("defense");
          else if (scope === "opponent") {
            state.opponentSkillFlowOverride = "defense";
            saveState();
          }
          scheduleRenderPlayers();
        }),
        button("Muro", "event-btn block-confirm-go", () => {
          blockInlinePlayer = playerKey;
          blockConfirmByPlayer[playerKey] = true;
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
      blockConfirmByPlayer[playerKey] !== true
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
    state.useOpponentTeam &&
    state.predictiveSkillFlow &&
    serveMetaByPlayer[playerKey]
  ) {
    state.pendingServe = {
      scope,
      playerIdx,
      playerName: activeName,
      meta: serveMetaByPlayer[playerKey],
    };
    delete serveMetaByPlayer[playerKey];
    setSelectedSkillForScope(scope, playerIdx, null);
    scheduleRenderPlayers();
    return Object.freeze(view);
  }
  if (picked !== "serve" && serveTypeInlinePlayer === playerKey)
    clearServeTypeInlineListener();
  if (picked !== "attack" && attackInlinePlayer === playerKey)
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
  if (picked === "serve" && !serveMetaByPlayer[playerKey]) {
    if (getServeBaseZoneForPlayer(playerIdx, scope) !== 1)
      return note("La battuta è disponibile solo per la zona 1.");
    if (serveTypeInlinePlayer !== null && serveTypeInlinePlayer !== playerKey)
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
      attackInlinePlayer !== null &&
      attackInlinePlayer !== playerKey &&
      isPlayerKeyInScope(attackInlinePlayer, scope)
    )
      return Object.freeze(view);
    const header = heading("attack", "Attacco");
    if (shouldPromptAttackSetType(scope)) {
      const queued = normalizeSetTypeValue(queuedSetTypeChoice);
      if (
        queued &&
        queued.toLowerCase() === "damp" &&
        isSetterPlayerForScope(scope, playerIdx)
      ) {
        if (attackInlinePlayer === playerKey) return Object.freeze(view);
        const choice = queuedSetTypeChoice;
        queuedSetTypeChoice = null;
        setNextSetType("");
        startAttackSelection(
          playerIdx,
          choice,
          () => {
            if (attackMetaByPlayer[playerKey])
              attackMetaByPlayer[playerKey].fromNextSetType = true;
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
              if (attackMetaByPlayer[playerKey])
                attackMetaByPlayer[playerKey].fromNextSetType = true;
              queuedSetTypeChoice = null;
              setNextSetType("");
            }),
          ],
          header,
        );
      const options = isSetterPlayerForScope(scope, playerIdx)
        ? [{ value: "Damp", label: "Damp" }]
        : DEFAULT_SET_TYPE_OPTIONS;
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
    blockConfirmByPlayer[playerKey] !== true
  ) {
    const confirmation = confirmBlock(false);
    if (confirmation) return confirmation;
  }
  if (
    picked === "attack" &&
    ((attackInlinePlayer !== null &&
      attackInlinePlayer !== playerKey &&
      isPlayerKeyInScope(attackInlinePlayer, scope)) ||
      !getAttackMetaForPlayer(scope, playerIdx))
  )
    return note("Attacco in corso: completa la valutazione.");
  const skill = SKILLS.find((item) => item.id === picked);
  const codes = (
    state.metricsConfig[picked]?.activeCodes || RESULT_CODES
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
        (typeof getCodeTone === "function"
          ? getCodeTone(picked, code)
          : "neutral"),
      async (event) => {
        const success = await handleEventClick(
          playerIdx,
          picked,
          code,
          activeName,
          event.currentTarget,
          {
            serveMeta: serveMetaByPlayer[playerKey] || null,
            attackMeta: getAttackMetaForPlayer(scope, playerIdx) || null,
            scope,
          },
        );
        if (!success) return;
        delete serveMetaByPlayer[playerKey];
        if (picked === "serve") clearServeTypeInlineListener();
        if (picked === "attack") clearAttackSelection(playerIdx, scope);
        if (picked === "block") {
          delete blockConfirmByPlayer[playerKey];
          if (blockInlinePlayer === playerKey) blockInlinePlayer = null;
        }
        setSelectedSkillForScope(scope, playerIdx, null);
        renderPlayers();
      },
      { data: { playerIdx, playerName: activeName, skillId: picked, code } },
    ),
  );
  if (!(state.predictiveSkillFlow && nextSkillId))
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
