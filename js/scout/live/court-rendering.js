function renderSkillRows(targetEl, playerIdx, activeName, options = {}) {
  if (!targetEl) return;
  const { closeAfterAction = false, nextSkillId = null, scope = "our" } = options;
  const playerKey = makePlayerKey(scope, playerIdx);
  const selectedSkill = getSelectedSkillForScope(scope, playerIdx);
  const attackLockedForPlayer = attackInlinePlayer === playerKey;
  const rawNextSkillId = attackLockedForPlayer ? "attack" : nextSkillId || null;
  const isBlockContext =
    selectedSkill === "block" || rawNextSkillId === "block" || blockInlinePlayer === playerKey;
  if (!isBlockContext && blockConfirmByPlayer[playerKey] !== undefined) {
    delete blockConfirmByPlayer[playerKey];
    if (blockInlinePlayer === playerKey) {
      blockInlinePlayer = null;
    }
  }
  const hasActiveSelection =
    !!selectedSkill ||
    !!serveMetaByPlayer[playerKey] ||
    !!getAttackMetaForPlayer(scope, playerIdx) ||
    attackLockedForPlayer ||
    serveTypeInlinePlayer === playerKey ||
    !!blockConfirmByPlayer[playerKey];
  let cancelBtn = targetEl.querySelector(".player-skill-cancel");
  if (hasActiveSelection) {
    if (!cancelBtn) {
      cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "player-skill-cancel";
      cancelBtn.title = "Annulla fondamentale";
      cancelBtn.textContent = "✕";
      cancelBtn.addEventListener("click", e => {
        e.stopPropagation();
        resetSkillSelectionForPlayer(playerIdx, scope);
        if (closeAfterAction) closeSkillModal();
        renderPlayers();
      });
      targetEl.appendChild(cancelBtn);
    }
  } else if (cancelBtn) {
    cancelBtn.remove();
  }
  let forcedSkillId = null;
  const getSkillColors = skillId => {
    const fallback = { bg: "#2f2f2f", text: "#e5e7eb" };
    return SKILL_COLORS[skillId] || fallback;
  };
  const isCompactMobile = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  const blockPromptActiveForScope =
    rawNextSkillId === "block" &&
    getNetBlockPromptScope() === scope &&
    !isForcedBlockScope(scope);
  const enabledSkills = getEnabledSkillsForScope(scope);
  if (enabledSkills.length === 0) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Abilita almeno un fondamentale nelle impostazioni per scoutizzare.";
    targetEl.appendChild(empty);
    return;
  }
  const activeAttackKey = getActiveAttackKeyForScope(scope);
  if (activeAttackKey && activeAttackKey !== playerKey) {
    const locked = document.createElement("div");
    locked.className = "players-empty";
    locked.textContent = "Attacco in corso: completa la valutazione.";
    targetEl.appendChild(locked);
    return;
  }
  if (state.useOpponentTeam && state.predictiveSkillFlow) {
    const isForcedScope = state.forceSkillActive && state.forceSkillScope === scope;
    if (!isForcedScope) {
      if (state.pendingServe && state.pendingServe.scope === scope) {
        if (isCompactMobile) {
          const locked = document.createElement("div");
          locked.className = "players-empty";
          locked.textContent = "In attesa dell'altra squadra.";
          targetEl.appendChild(locked);
          return;
        }
        const fallbackServer = getServerPlayerForScope(scope);
        const pendingName = state.pendingServe.playerName || (fallbackServer && fallbackServer.name) || null;
        const pendingIdx = typeof state.pendingServe.playerIdx === "number" ? state.pendingServe.playerIdx : null;
        const normalizedPending = pendingName ? pendingName.trim().toLowerCase() : null;
        const normalizedActive = activeName ? activeName.trim().toLowerCase() : null;
        const isPendingPlayer =
          (pendingIdx !== null && pendingIdx === playerIdx) ||
          (normalizedPending && normalizedActive && normalizedPending === normalizedActive);
        if (isPendingPlayer && isSkillEnabledForScope("serve", scope)) {
          const grid = document.createElement("div");
          grid.className = "code-grid";
          const title = document.createElement("div");
          title.className = "skill-header";
          const titleSpan = document.createElement("span");
          titleSpan.className = "skill-title skill-serve";
          const colors = getSkillColors("serve");
          titleSpan.style.backgroundColor = colors.bg;
          titleSpan.style.color = colors.text;
          titleSpan.textContent = "Battuta";
          title.appendChild(titleSpan);
          grid.appendChild(title);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "event-btn code-negative";
          btn.textContent = "=";
          btn.dataset.playerIdx = String(playerIdx);
          btn.dataset.playerName = activeName;
          btn.dataset.skillId = "serve";
          btn.dataset.code = "=";
          btn.addEventListener("click", async e => {
            const success = await handleEventClick(
              playerIdx,
              "serve",
              "=",
              activeName,
              e.currentTarget,
              { scope }
            );
            if (!success) return;
            clearServeTypeInlineListener();
            setSelectedSkillForScope(scope, playerIdx, null);
            renderPlayers();
          });
          grid.appendChild(btn);
          targetEl.appendChild(grid);
          return;
        }
        const locked = document.createElement("div");
        locked.className = "players-empty";
        locked.textContent = "In attesa dell'altra squadra.";
        targetEl.appendChild(locked);
        return;
      }
      if (isPostServeLockForScope(scope)) {
        const serverName = getActiveServerName(scope);
        if (serverName && serverName === activeName && isSkillEnabledForScope("serve", scope)) {
          const grid = document.createElement("div");
          grid.className = "code-grid";
          const title = document.createElement("div");
          title.className = "skill-header";
          const titleSpan = document.createElement("span");
          titleSpan.className = "skill-title skill-serve";
          const colors = getSkillColors("serve");
          titleSpan.style.backgroundColor = colors.bg;
          titleSpan.style.color = colors.text;
          titleSpan.textContent = "Battuta";
          title.appendChild(titleSpan);
          grid.appendChild(title);
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "event-btn code-negative";
          btn.textContent = "=";
          btn.dataset.playerIdx = String(playerIdx);
          btn.dataset.playerName = activeName;
          btn.dataset.skillId = "serve";
          btn.dataset.code = "=";
          btn.addEventListener("click", async e => {
            const success = await handleEventClick(
              playerIdx,
              "serve",
              "=",
              activeName,
              e.currentTarget,
              { scope }
            );
            if (!success) return;
            clearServeTypeInlineListener();
            setSelectedSkillForScope(scope, playerIdx, null);
            renderPlayers();
          });
          grid.appendChild(btn);
          targetEl.appendChild(grid);
          return;
        }
        const locked = document.createElement("div");
        locked.className = "players-empty";
        locked.textContent = "In attesa dell'altra squadra.";
        targetEl.appendChild(locked);
        return;
      }
      const flowState = getAutoFlowState();
      const server = getServerPlayerForScope(scope);
      const allowServeErrorOnly =
        flowState &&
        flowState.teamScope &&
        flowState.teamScope !== scope &&
        flowState.skillId === "pass" &&
        isSkillEnabledForScope("serve", scope) &&
        server &&
        server.name === activeName;
      if (allowServeErrorOnly) {
        const grid = document.createElement("div");
        grid.className = "code-grid";
        const title = document.createElement("div");
        title.className = "skill-header";
        const titleSpan = document.createElement("span");
        titleSpan.className = "skill-title skill-serve";
        const colors = getSkillColors("serve");
        titleSpan.style.backgroundColor = colors.bg;
        titleSpan.style.color = colors.text;
        titleSpan.textContent = "Battuta";
        title.appendChild(titleSpan);
        grid.appendChild(title);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "event-btn code-negative";
        btn.textContent = "=";
        btn.dataset.playerIdx = String(playerIdx);
        btn.dataset.playerName = activeName;
        btn.dataset.skillId = "serve";
        btn.dataset.code = "=";
        btn.addEventListener("click", async e => {
          const success = await handleEventClick(
            playerIdx,
            "serve",
            "=",
            activeName,
            e.currentTarget,
            { scope }
          );
          if (!success) return;
          clearServeTypeInlineListener();
          setSelectedSkillForScope(scope, playerIdx, null);
          renderPlayers();
        });
        grid.appendChild(btn);
        targetEl.appendChild(grid);
        return;
      }
      if (flowState && flowState.teamScope && flowState.teamScope !== scope) {
        const locked = document.createElement("div");
        locked.className = "players-empty";
        locked.textContent = "In attesa dell'altra squadra.";
        targetEl.appendChild(locked);
        return;
      }
    }
  }
  if (isCompactMobile) {
    let pickedSkillId = rawNextSkillId;
    if (blockPromptActiveForScope) {
      pickedSkillId = resolveFlowSkillForScope(scope, "defense") || "defense";
    }
    if (pickedSkillId === "serve") {
      const serveZone = getServeBaseZoneForPlayer(playerIdx, scope);
      if (serveZone !== 1) {
        return;
      }
    }
    if (rawNextSkillId === "block" && !isBlockEligibleForScope(scope)) {
      return;
    }
    if (
      rawNextSkillId === "block" &&
      blockInlinePlayer !== null &&
      blockInlinePlayer !== playerKey &&
      isPlayerKeyInScope(blockInlinePlayer, scope)
    ) {
      return;
    }
    if (rawNextSkillId === "block" && !blockPromptActiveForScope && blockConfirmByPlayer[playerKey] !== true) {
      if (shouldSkipBlockConfirm(scope)) {
        blockConfirmByPlayer[playerKey] = true;
      } else {
        const grid = document.createElement("div");
        grid.className = "code-grid block-confirm-grid";
        const skipBtn = document.createElement("button");
        skipBtn.type = "button";
        skipBtn.className = "event-btn block-confirm-skip";
        skipBtn.textContent = "No muro";
        skipBtn.addEventListener("click", () => {
          delete blockConfirmByPlayer[playerKey];
          if (blockInlinePlayer === playerKey) blockInlinePlayer = null;
          setSelectedSkillForScope(scope, playerIdx, null);
          const predicted = getPredictedSkillIdForScope(scope);
          const nextSkill = predicted === "block" ? "defense" : "defense";
          if (typeof forceNextSkill === "function" && scope === "our") {
            forceNextSkill(nextSkill);
          } else if (scope === "opponent") {
            state.opponentSkillFlowOverride = nextSkill;
            saveState();
          }
          scheduleRenderPlayers();
        });
        const goBtn = document.createElement("button");
        goBtn.type = "button";
        goBtn.className = "event-btn block-confirm-go";
        goBtn.textContent = "Muro";
        goBtn.addEventListener("click", () => {
          blockInlinePlayer = playerKey;
          blockConfirmByPlayer[playerKey] = true;
          scheduleRenderPlayers();
        });
        grid.appendChild(skipBtn);
        grid.appendChild(goBtn);
        targetEl.appendChild(grid);
        return;
      }
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-picker-btn skill-single-btn" + (pickedSkillId ? " skill-" + pickedSkillId : "");
    if (pickedSkillId) {
      const colors = getSkillColors(pickedSkillId);
      const meta = SKILLS.find(s => s.id === pickedSkillId);
      btn.style.backgroundColor = colors.bg;
      btn.style.color = colors.text;
      btn.textContent = meta ? meta.label : pickedSkillId;
      btn.addEventListener("click", () => {
        openSkillCodesModal(playerIdx, activeName, pickedSkillId, scope);
      });
    } else {
      btn.textContent = "Seleziona skill";
      btn.addEventListener("click", () => openSkillModal(playerIdx, activeName, scope));
    }
    targetEl.appendChild(btn);
    return;
  }
  const enabledSkillIds = new Set(enabledSkills.map(s => s.id));
  let pickedSkillId =
    forcedSkillId ??
    (attackLockedForPlayer ? "attack" : nextSkillId) ??
    getSelectedSkillForScope(scope, playerIdx);
  if (blockPromptActiveForScope && pickedSkillId === "block") {
    pickedSkillId = resolveFlowSkillForScope(scope, "defense") || "defense";
  }
  if (pickedSkillId && !enabledSkillIds.has(pickedSkillId)) {
    if (!nextSkillId) setSelectedSkillForScope(scope, playerIdx, null);
    pickedSkillId = null;
  }
  if (
    pickedSkillId === "serve" &&
    state.useOpponentTeam &&
    state.predictiveSkillFlow &&
    serveMetaByPlayer[playerKey]
  ) {
    const cachedMeta = serveMetaByPlayer[playerKey];
    state.pendingServe = {
      scope,
      playerIdx,
      playerName: activeName,
      meta: cachedMeta
    };
    delete serveMetaByPlayer[playerKey];
    setSelectedSkillForScope(scope, playerIdx, null);
    scheduleRenderPlayers();
    return;
  }
  if (pickedSkillId !== "serve" && serveTypeInlinePlayer === playerKey) {
    clearServeTypeInlineListener();
  }
  if (pickedSkillId !== "attack" && attackInlinePlayer === playerKey) {
    clearAttackSelection(playerIdx, scope);
  }
  if (!pickedSkillId) {
    const grid = document.createElement("div");
    grid.className = "skill-grid";
    enabledSkills.forEach(skill => {
      if (
        skill.id === "block" &&
        blockInlinePlayer !== null &&
        blockInlinePlayer !== playerKey &&
        isPlayerKeyInScope(blockInlinePlayer, scope)
      ) {
        return;
      }
      const colors = getSkillColors(skill.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-picker-btn skill-" + skill.id;
      btn.style.backgroundColor = colors.bg;
      btn.style.color = colors.text;
      btn.textContent = skill.label;
      btn.addEventListener("click", () => {
        setSelectedSkillForScope(scope, playerIdx, skill.id);
        scheduleRenderPlayers();
      });
      grid.appendChild(btn);
    });
    targetEl.appendChild(grid);
    return;
  }
  if (pickedSkillId === "serve" && !serveMetaByPlayer[playerKey]) {
    const serveZone = getServeBaseZoneForPlayer(playerIdx, scope);
    if (serveZone !== 1) {
      const locked = document.createElement("div");
      locked.className = "players-empty";
      locked.textContent = "La battuta è disponibile solo per la zona 1.";
      targetEl.appendChild(locked);
      return;
    }
    if (serveTypeInlinePlayer !== null && serveTypeInlinePlayer !== playerKey) {
      return;
    }
    const grid = document.createElement("div");
    grid.className = "code-grid serve-type-grid";
    grid.addEventListener("pointerdown", () => setServeTypeFocusPlayer(playerIdx, scope));
    const title = document.createElement("div");
    title.className = "skill-header";
    const titleSpan = document.createElement("span");
    titleSpan.className = "skill-title skill-serve";
    titleSpan.textContent = "Battuta · tipo";
    title.appendChild(titleSpan);
    grid.appendChild(title);
    const types = [
      { id: "F", label: "Float (F)" },
      { id: "JF", label: "Jump float (JF)" },
      { id: "S", label: "Spin (S)" }
    ];
    const handleSelect = async type => {
      await startServeTypeSelection(playerIdx, type, renderPlayers, scope);
    };
    types.forEach(t => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-btn";
      btn.textContent = t.label;
      btn.addEventListener("click", () => handleSelect(t.id));
      grid.appendChild(btn);
    });
    bindServeTypeInlineListener(playerIdx, handleSelect, scope);
    targetEl.appendChild(grid);
    return;
  }
  if (pickedSkillId === "attack" && !getAttackMetaForPlayer(scope, playerIdx)) {
    if (
      attackInlinePlayer !== null &&
      attackInlinePlayer !== playerKey &&
      isPlayerKeyInScope(attackInlinePlayer, scope)
    ) {
      return;
    }
    if (shouldPromptAttackSetType(scope)) {
      const queuedSetType = normalizeSetTypeValue(queuedSetTypeChoice);
      if (queuedSetType && queuedSetType.toLowerCase() === "damp" && isSetterPlayerForScope(scope, playerIdx)) {
        if (attackInlinePlayer === playerKey) return;
        const dampChoice = queuedSetTypeChoice;
        queuedSetTypeChoice = null;
        setNextSetType("");
        startAttackSelection(
          playerIdx,
          dampChoice,
          () => {
            const metaKey = makePlayerKey(scope, playerIdx);
            if (attackMetaByPlayer[metaKey]) {
              attackMetaByPlayer[metaKey].fromNextSetType = true;
            }
            renderPlayers();
          },
          scope
        );
        return;
      }
      if (queuedSetType) {
        const grid = document.createElement("div");
        grid.className = "code-grid attack-select-grid";
        const title = document.createElement("div");
        title.className = "skill-header";
        const titleSpan = document.createElement("span");
        titleSpan.className = "skill-title skill-attack";
        titleSpan.textContent = "Attacco";
        title.appendChild(titleSpan);
        grid.appendChild(title);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "event-btn attack-main-btn";
        btn.textContent = "Attacco";
        btn.addEventListener("click", async () => {
          await startAttackSelection(playerIdx, queuedSetType, renderPlayers, scope);
          const metaKey = makePlayerKey(scope, playerIdx);
          if (attackMetaByPlayer[metaKey]) {
            attackMetaByPlayer[metaKey].fromNextSetType = true;
          }
          queuedSetTypeChoice = null;
          setNextSetType("");
        });
        grid.appendChild(btn);
        targetEl.appendChild(grid);
        return;
      }
      const grid = document.createElement("div");
      grid.className = "code-grid attack-select-grid";
      const title = document.createElement("div");
      title.className = "skill-header";
      const titleSpan = document.createElement("span");
      titleSpan.className = "skill-title skill-attack";
      titleSpan.textContent = "Attacco";
      title.appendChild(titleSpan);
      grid.appendChild(title);
      const setTypeOptions = isSetterPlayerForScope(scope, playerIdx)
        ? [{ value: "Damp", label: "Damp" }]
        : DEFAULT_SET_TYPE_OPTIONS;
      setTypeOptions.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "event-btn";
        btn.textContent = formatSetTypeLabelWithShortcut(opt.value, opt.label);
        btn.addEventListener("click", async () => {
          await startAttackSelection(playerIdx, opt.value, renderPlayers, scope);
        });
        grid.appendChild(btn);
      });
      targetEl.appendChild(grid);
    } else if (nextSkillId) {
      const grid = document.createElement("div");
      grid.className = "code-grid attack-select-grid";
      const title = document.createElement("div");
      title.className = "skill-header";
      const titleSpan = document.createElement("span");
      titleSpan.className = "skill-title skill-attack";
      titleSpan.textContent = "Attacco";
      title.appendChild(titleSpan);
      grid.appendChild(title);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-btn attack-main-btn";
      btn.textContent = "Attacco";
      btn.addEventListener("click", async () => {
        await startAttackSelection(playerIdx, null, renderPlayers, scope);
      });
      grid.appendChild(btn);
      targetEl.appendChild(grid);
    } else {
      const grid = document.createElement("div");
      grid.className = "code-grid attack-select-grid";
      const title = document.createElement("div");
      title.className = "skill-header";
      const titleSpan = document.createElement("span");
      titleSpan.className = "skill-title skill-attack";
      titleSpan.textContent = "Attacco";
      title.appendChild(titleSpan);
      grid.appendChild(title);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-btn attack-main-btn";
      btn.textContent = "Attacco";
      btn.addEventListener("click", async () => {
        await startAttackSelection(playerIdx, null, renderPlayers, scope);
      });
      grid.appendChild(btn);
      targetEl.appendChild(grid);
    }
    return;
  }
  if (
    rawNextSkillId === "block" &&
    blockInlinePlayer !== null &&
    blockInlinePlayer !== playerKey &&
    isPlayerKeyInScope(blockInlinePlayer, scope)
  ) {
    return;
  }
  if (rawNextSkillId === "block" && !blockPromptActiveForScope && blockConfirmByPlayer[playerKey] !== true) {
    if (shouldSkipBlockConfirm(scope)) {
      blockConfirmByPlayer[playerKey] = true;
    } else {
    const grid = document.createElement("div");
    grid.className = "code-grid block-confirm-grid";
    const title = document.createElement("div");
    title.className = "skill-header";
    const titleSpan = document.createElement("span");
    titleSpan.className = "skill-title skill-block";
    titleSpan.textContent = "Muro";
    title.appendChild(titleSpan);
    grid.appendChild(title);
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "event-btn block-confirm-skip";
    skipBtn.textContent = "No muro";
    skipBtn.addEventListener("click", () => {
      delete blockConfirmByPlayer[playerKey];
      if (blockInlinePlayer === playerKey) blockInlinePlayer = null;
      setSelectedSkillForScope(scope, playerIdx, null);
      const predicted = getPredictedSkillIdForScope(scope);
      const nextSkill = predicted === "block" ? "defense" : "defense";
      if (typeof forceNextSkill === "function" && scope === "our") {
        forceNextSkill(nextSkill);
      } else if (scope === "opponent") {
        state.opponentSkillFlowOverride = nextSkill;
        saveState();
      }
      scheduleRenderPlayers();
    });
    const goBtn = document.createElement("button");
    goBtn.type = "button";
    goBtn.className = "event-btn block-confirm-go";
    goBtn.textContent = "Muro";
    goBtn.addEventListener("click", () => {
      blockInlinePlayer = playerKey;
      blockConfirmByPlayer[playerKey] = true;
      scheduleRenderPlayers();
    });
    grid.appendChild(skipBtn);
    grid.appendChild(goBtn);
    targetEl.appendChild(grid);
    return;
    }
  }
  if (pickedSkillId === "attack") {
    const metaKey = makePlayerKey(scope, playerIdx);
    if (
      attackInlinePlayer !== null &&
      attackInlinePlayer !== metaKey &&
      isPlayerKeyInScope(attackInlinePlayer, scope)
    ) {
      const locked = document.createElement("div");
      locked.className = "players-empty";
      locked.textContent = "Attacco in corso: completa la valutazione.";
      targetEl.appendChild(locked);
      return;
    }
    if (!getAttackMetaForPlayer(scope, playerIdx)) {
      const locked = document.createElement("div");
      locked.className = "players-empty";
      locked.textContent = "Attacco in corso: completa la valutazione.";
      targetEl.appendChild(locked);
      return;
    }
  }
  const skillMeta = SKILLS.find(s => s.id === pickedSkillId);
  const codes = (state.metricsConfig[pickedSkillId]?.activeCodes || RESULT_CODES).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  const ordered = codes.filter(c => c !== "/" && c !== "=").concat("/", "=");
  const grid = document.createElement("div");
  grid.className = "code-grid";
  const title = document.createElement("div");
  title.className = "skill-header";
  const titleSpan = document.createElement("span");
  titleSpan.className = "skill-title skill-" + pickedSkillId + (nextSkillId ? " next-skill" : "");
  const colors = getSkillColors(pickedSkillId);
  titleSpan.style.backgroundColor = colors.bg;
  titleSpan.style.color = colors.text;
  titleSpan.textContent = skillMeta ? skillMeta.label : pickedSkillId;
  title.appendChild(titleSpan);
  grid.appendChild(title);
  ordered.forEach(code => {
    const btn = document.createElement("button");
    btn.type = "button";
    const tone = typeof getCodeTone === "function" ? getCodeTone(pickedSkillId, code) : "neutral";
    btn.className = "event-btn code-" + tone;
    btn.textContent = code;
    btn.dataset.playerIdx = String(playerIdx);
    btn.dataset.playerName = activeName;
    btn.dataset.skillId = pickedSkillId;
    btn.dataset.code = code;
    btn.addEventListener("click", async e => {
      const attackMeta = getAttackMetaForPlayer(scope, playerIdx);
      const success = await handleEventClick(
        playerIdx,
        pickedSkillId,
        code,
        activeName,
        e.currentTarget,
        {
          serveMeta: serveMetaByPlayer[playerKey] || null,
          attackMeta: attackMeta || null,
          scope
        }
      );
      if (!success) return;
      delete serveMetaByPlayer[playerKey];
      if (pickedSkillId === "serve") {
        clearServeTypeInlineListener();
      }
      if (pickedSkillId === "attack") {
        clearAttackSelection(playerIdx, scope);
      }
      if (pickedSkillId === "block") {
        delete blockConfirmByPlayer[playerKey];
        if (blockInlinePlayer === playerKey) blockInlinePlayer = null;
      }
      setSelectedSkillForScope(scope, playerIdx, null);
      if (closeAfterAction) closeSkillModal();
      renderPlayers();
    });
    grid.appendChild(btn);
  });
  const showBackBtn = !(state.predictiveSkillFlow && nextSkillId);
  if (showBackBtn) {
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "secondary small code-back-btn";
    backBtn.textContent = "← Scegli un altro fondamentale";
    backBtn.addEventListener("click", () => {
      setSelectedSkillForScope(scope, playerIdx, null);
      renderPlayers();
    });
    grid.appendChild(backBtn);
  }
  targetEl.appendChild(grid);
}
function renderTeamCourtCards(options = {}) {
  const {
    container,
    scope = "our",
    court = [],
    baseCourt = null,
    displayCourt = null,
    numbersMap = {},
    captainSet = new Set(),
    libSet = new Set(),
    allowDrag = false,
    allowReturn = false,
    isCompactMobile = false,
    nextSkillId = null,
    allowDrop = false,
    allowSkills = true
  } = options;
  if (!container) return;
  const players = getPlayersForScope(scope);
  const renderOrder = [3, 2, 1, 4, 5, 0];
  const map = displayCourt || court.map((slot, idx) => ({ slot, idx }));
  const errorPickModeActive = isErrorPickModeForScope(scope);
  const pointPickModeActive = isPointPickModeForScope(scope);
  const benchHostSelector = `.error-pick-bench-host[data-team-scope="${scope}"]`;
  const pointHostSelector = `.point-pick-host[data-team-scope="${scope}"]`;
  const parentBox = container.parentElement || null;
  if (parentBox) {
    parentBox.querySelectorAll(benchHostSelector).forEach(node => node.remove());
    parentBox.querySelectorAll(pointHostSelector).forEach(node => node.remove());
  }
  if (errorPickModeActive || pointPickModeActive) {
    const toolbar = document.createElement("div");
    toolbar.className = "error-pick-toolbar";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "player-skill-cancel error-pick-close";
    closeBtn.title = "Annulla";
    closeBtn.setAttribute(
      "aria-label",
      pointPickModeActive ? "Annulla selezione punto" : "Annulla selezione errore"
    );
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => {
      if (pointPickModeActive) {
        stopPointPickMode();
      } else {
        stopErrorPickMode();
      }
    });
    toolbar.appendChild(closeBtn);
    container.appendChild(toolbar);
  }
  renderOrder.forEach(idx => {
    const meta = POSITIONS_META[idx];
    const slotInfo = map[idx] || { slot: { main: "" }, idx: idx };
    const slot = slotInfo.slot || { main: "" };
    const posIdx = slotInfo.idx != null ? slotInfo.idx : idx;
    const fallbackSlot = baseCourt && baseCourt[idx] ? baseCourt[idx] : null;
    const effectiveSlot = !slot.main && fallbackSlot && fallbackSlot.main ? fallbackSlot : slot;
    const activeName = effectiveSlot.main;
    const card = document.createElement("div");
    card.className = "player-card court-card pos-" + (idx + 1);
    const playerPhoto = activeName ? getPlayerPhotoForScope(scope, activeName) : "";
    const isLibSlot = libSet.has(effectiveSlot.main);
    const activePlayerIdx = activeName ? players.indexOf(activeName) : -1;
    const isSetterSlot = activePlayerIdx >= 0 && isSetterPlayerForScope(scope, activePlayerIdx);
    if (isLibSlot) {
      card.classList.add("libero-card");
    } else if (isSetterSlot) {
      card.classList.add("setter-card");
    }
    card.dataset.posNumber = String(idx + 1);
    card.dataset.posIndex = String(posIdx);
    card.dataset.playerName = activeName || "";
    card.dataset.teamScope = scope;
    if (!activeName) {
      card.classList.add("empty");
    }
    if (playerPhoto) {
      card.classList.add("has-player-photo");
      card.style.setProperty("--player-photo-image", `url(${JSON.stringify(playerPhoto)})`);
    }
    if (isCompactMobile) {
      card.classList.add("compact-card");
    }
    card.dataset.dropTarget = "main";
    const header = document.createElement("div");
    const canDrag = allowDrag && !!activeName && isLibSlot;
    header.className = "court-header" + (canDrag ? " draggable" : "");
    header.draggable = canDrag;
    if (canDrag) {
      header.addEventListener("dragstart", e => handleCourtDragStart(e, posIdx));
      header.addEventListener("dragend", handleCourtDragEnd);
    }
    const tagBar = document.createElement("div");
    tagBar.className = "court-tagbar";
    const posLabel = document.createElement("span");
    posLabel.className = "court-pos-label";
    posLabel.textContent = "Pos " + (idx + 1);
    const tagLibero = document.createElement("span");
    tagLibero.className = "court-libero-pill";
    tagLibero.textContent = isLibSlot ? "L" : "P";
    tagLibero.classList.toggle("court-setter-pill", !isLibSlot && isSetterSlot);
    tagLibero.style.visibility = isLibSlot || isSetterSlot ? "visible" : "hidden";
    tagBar.appendChild(posLabel);
    tagBar.appendChild(tagLibero);
    if (allowReturn && isLibSlot && effectiveSlot.replaced) {
      const btnReturn = document.createElement("button");
      btnReturn.type = "button";
      btnReturn.className = "libero-return-btn";
      btnReturn.title = "Rientra " + effectiveSlot.replaced;
      btnReturn.textContent = "↩";
      const handleReturn = e => {
        e.stopPropagation();
        if (scope === "opponent" && typeof restorePlayerFromLiberoForScope === "function") {
          restorePlayerFromLiberoForScope(posIdx, "opponent");
        } else if (typeof restorePlayerFromLibero === "function") {
          restorePlayerFromLibero(posIdx);
        }
      };
      btnReturn.addEventListener("click", handleReturn);
      btnReturn.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          handleReturn(e);
        }
      });
      tagBar.appendChild(btnReturn);
    }
    header.appendChild(tagBar);
    const nameBlock = document.createElement("div");
    nameBlock.className = "court-name-block inline";
    const nameLabel = document.createElement("div");
    nameLabel.className = "court-name";
    if (isLibSlot) {
      nameLabel.classList.add("libero-flag");
    }
      if (activeName && scope === "opponent" && typeof formatNameWithNumberFor === "function") {
        nameLabel.textContent = formatNameWithNumberFor(activeName, numbersMap, {
          captainSet,
          compactCourt: true
        });
    } else {
      nameLabel.textContent = activeName
        ? formatNameWithNumber(activeName, { compactCourt: true })
        : scope === "our"
          ? "Trascina una giocatrice qui"
          : "—";
    }
    nameBlock.appendChild(nameLabel);
    if (scope === "our" || scope === "opponent") {
      const roleTag = document.createElement("span");
      roleTag.className = "court-role-tag";
      const rotationValue = scope === "opponent" ? state.opponentRotation : state.rotation;
      roleTag.textContent =
        typeof getRoleLabelForRotation === "function"
          ? getRoleLabelForRotation((posIdx || 0) + 1, rotationValue || 1)
          : getRoleLabel((posIdx || 0) + 1);
      nameBlock.appendChild(roleTag);
    }
    header.appendChild(nameBlock);
    card.appendChild(header);

    if (allowDrop) {
      card.addEventListener("dragenter", e => handlePositionDragOver(e, card), true);
      card.addEventListener("dragover", e => handlePositionDragOver(e, card), true);
      card.addEventListener("dragleave", () => handlePositionDragLeave(card), true);
      card.addEventListener("drop", e => handlePositionDrop(e, card), true);
    }

    if (allowSkills && activeName && (scope === "our" || scope === "opponent")) {
      const playerIdx = players.findIndex(p => p === activeName);
      if (playerIdx === -1) {
        container.appendChild(card);
        return;
      }
      if (pointPickModeActive) {
        const pointRow = document.createElement("div");
        pointRow.className = "skill-row error-pick-row";
        const pointBtn = document.createElement("button");
        pointBtn.type = "button";
        pointBtn.className = "event-btn success error-pick-btn";
        pointBtn.textContent = "Punto";
        pointBtn.addEventListener("click", () => {
          applyPointForPickedPlayer(scope, playerIdx, activeName);
        });
        pointRow.appendChild(pointBtn);
        card.appendChild(pointRow);
      } else if (errorPickModeActive) {
        const errorRow = document.createElement("div");
        errorRow.className = "skill-row error-pick-row";
        const errorBtn = document.createElement("button");
        errorBtn.type = "button";
        errorBtn.className = "event-btn danger error-pick-btn";
        errorBtn.textContent = "Errore";
        errorBtn.addEventListener("click", () => {
          openErrorModalForPickedPlayer(scope, playerIdx, activeName);
        });
        errorRow.appendChild(errorBtn);
        card.appendChild(errorRow);
      } else {
        renderSkillRows(card, playerIdx, activeName, { nextSkillId, scope });
      }
    }
    if (meta) {
      card.style.gridArea = meta.gridArea;
    }
    container.appendChild(card);
  });
  if (!errorPickModeActive && !pointPickModeActive) return;
  if (!parentBox) return;
  if (pointPickModeActive) {
    const pointHost = document.createElement("div");
    pointHost.className = "point-pick-host";
    pointHost.dataset.teamScope = scope;
    const pointSection = document.createElement("div");
    pointSection.className = "error-pick-bench";
    const pointTitle = document.createElement("div");
    pointTitle.className = "error-pick-bench-title";
    pointTitle.textContent = "Punto";
    pointSection.appendChild(pointTitle);
    const teamPointBtn = document.createElement("button");
    teamPointBtn.type = "button";
    teamPointBtn.className = "error-choice-btn success";
    teamPointBtn.textContent = "Assegna alla squadra";
    teamPointBtn.addEventListener("click", () => {
      handleTeamPoint(scope);
      stopPointPickMode();
    });
    pointSection.appendChild(teamPointBtn);
    pointHost.appendChild(pointSection);
    const panel = parentBox.closest("[data-team-panel]");
    const isFarPanel = !!(panel && panel.classList.contains("team-panel--far"));
    if (isFarPanel) {
      parentBox.insertBefore(pointHost, container);
    } else {
      parentBox.insertBefore(pointHost, container.nextSibling);
    }
    return;
  }
  const benchHost = document.createElement("div");
  benchHost.className = "error-pick-bench-host";
  benchHost.dataset.teamScope = scope;
  const benchSection = document.createElement("div");
  benchSection.className = "error-pick-bench";
  const benchTitle = document.createElement("div");
  benchTitle.className = "error-pick-bench-title";
  benchTitle.textContent = "Panchina";
  benchSection.appendChild(benchTitle);
  const teamErrorBtn = document.createElement("button");
  teamErrorBtn.type = "button";
  teamErrorBtn.className = "error-choice-btn danger error-pick-bench-team-error";
  teamErrorBtn.textContent = "Errore squadra";
  teamErrorBtn.addEventListener("click", () => {
    openErrorModal({
      scope,
      teamFromPicker: true
    });
  });
  benchSection.appendChild(teamErrorBtn);
  const benchGrid = document.createElement("div");
  benchGrid.className = "error-choice-grid error-pick-bench-grid";
  const entries = getBenchEntriesForScope(scope);
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Nessuna giocatrice in panchina.";
    benchGrid.appendChild(empty);
  } else {
    entries.forEach(({ name, idx }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "error-choice-btn danger error-pick-bench-btn";
      btn.textContent =
        scope === "opponent"
          ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
          : formatNameWithNumber(name);
      btn.addEventListener("click", () => {
        openErrorModalForPickedPlayer(scope, idx, name);
      });
      benchGrid.appendChild(btn);
    });
  }
  benchSection.appendChild(benchGrid);
  benchHost.appendChild(benchSection);
  const panel = parentBox.closest("[data-team-panel]");
  const isFarPanel = !!(panel && panel.classList.contains("team-panel--far"));
  if (isFarPanel) {
    parentBox.insertBefore(benchHost, container);
  } else {
    parentBox.insertBefore(benchHost, container.nextSibling);
  }
}
