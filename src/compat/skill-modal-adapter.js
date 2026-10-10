function publishSkillModalCancel(cancelVisible) {
  skillModalStore.publish({ cancelVisible });
}
function setSkillModalOpen(open) {
  skillModalStore.publish({ open, courtModal: isDesktopCourtModalLayout() });
}
function skillModalPlayerLabel(playerIdx, playerName, scope) {
  const name = playerName || getPlayersForScope(scope)[playerIdx];
  return (
    (scope === "opponent"
      ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
      : formatNameWithNumber(name)) ||
    name ||
    "Giocatrice"
  );
}
function publishSkillModalChoice(playerIdx, playerName, scope) {
  setSkillModalCancelVisibility(false);
  activeSkillModalContext = {
    playerIdx,
    playerName: playerName || null,
    skillId: null,
    scope,
  };
  updateSetTypeVisibility(
    getPredictedSkillIdForScope(scope) || getPredictedSkillId(),
  );
  modalMode = "skill";
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
function publishSkillModalCodes(playerIdx, playerName, skillId, scope) {
  setSkillModalCancelVisibility(true);
  activeSkillModalContext = {
    playerIdx,
    playerName: playerName || null,
    skillId,
    scope,
  };
  const predicted = getPredictedSkillIdForScope(scope) || getPredictedSkillId();
  updateSetTypeVisibility(skillId === "attack" ? "attack" : predicted);
  modalMode = "skill-codes";
  const skill = SKILLS.find((item) => item.id === skillId);
  const title =
    (skill ? skill.label + " · " : "") +
    skillModalPlayerLabel(playerIdx, playerName, scope);
  const key = makePlayerKey(scope, playerIdx);
  const onBack = () => {
    delete serveMetaByPlayer[key];
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
    state.useOpponentTeam &&
    state.predictiveSkillFlow &&
    state.pendingServe?.scope === scope
  ) {
    closeSkillModal();
    renderPlayers();
    return;
  }
  if (skillId !== "serve" && serveTypeInlinePlayer === key)
    clearServeTypeInlineListener();
  if (skillId !== "attack" && attackInlinePlayer === key)
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
  if (skillId === "serve" && !serveMetaByPlayer[key]) {
    if (serveTypeInlinePlayer !== null && serveTypeInlinePlayer !== key) return;
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
      attackInlinePlayer !== null &&
      attackInlinePlayer !== key &&
      isPlayerKeyInScope(attackInlinePlayer, scope)
    )
      return;
    if (shouldPromptAttackSetType(scope)) {
      const queued = normalizeSetTypeValue(queuedSetTypeChoice);
      if (queued) {
        startAttackSelection(
          playerIdx,
          queued,
          () => {
            if (attackMetaByPlayer[key])
              attackMetaByPlayer[key].fromNextSetType = true;
            queuedSetTypeChoice = null;
            setNextSetType("");
            renderSkillCodes(playerIdx, playerName, skillId, scope);
          },
          scope,
        );
        return;
      }
      const options = isSetterPlayerForScope(scope, playerIdx)
        ? [{ value: "Damp", label: "Damp" }]
        : DEFAULT_SET_TYPE_OPTIONS;
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
      if (attackInlinePlayer === key) return;
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
    state.metricsConfig?.[skillId]?.activeCodes || RESULT_CODES
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
              serveMeta: serveMetaByPlayer[key] || null,
              attackMeta: attackMeta || null,
              scope,
            },
          );
          if (!success) return;
          delete serveMetaByPlayer[key];
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
            (typeof getCodeTone === "function"
              ? getCodeTone(skillId, code)
              : "neutral"),
          data: { playerIdx, playerName: nameValue, skillId, code },
        },
      ),
    ),
  );
}
