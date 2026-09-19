function clearReceiveContext(scope = "our") {
  lastReceiveContext[scope] = null;
}
function animateFreeballButton() {
  if (!elBtnFreeball) return;
  elBtnFreeball.classList.remove("freeball-pulse");
  // force reflow to restart animation
  // eslint-disable-next-line no-unused-expressions
  elBtnFreeball.offsetWidth;
  elBtnFreeball.classList.add("freeball-pulse");
  setTimeout(() => elBtnFreeball.classList.remove("freeball-pulse"), 420);
}
function animateEventToLog() {
  // fallback no-op: some builds don't include the log animation helper
}
function triggerFreeballFlow({ persist = true, rerender = true, startSkill = null, scope = "our" } = {}) {
  cancelPartialSkillFlowForScope(scope);
  const desiredStartSkill = startSkill || getFreeballStartSkill(scope);
  state.freeballPending = true;
  state.freeballPendingScope = scope;
  state.flowTeamScope = scope;
  state.predictiveSkillFlow = true;
  if (scope === "opponent") {
    state.opponentSkillFlowOverride = desiredStartSkill;
  } else {
    state.skillFlowOverride = desiredStartSkill;
  }
  animateFreeballButton();
  if (persist) saveState();
  if (rerender) {
    renderPlayers();
    updateNextSkillIndicator(getPredictedSkillIdForScope(scope));
  }
}
function rememberReceiveContext(ev) {
  if (!ev) return;
  const scope = getTeamScopeFromEvent(ev);
  const zone = ev.zone || ev.playerPosition || null;
  lastReceiveContext[scope] = {
    zone,
    evaluation: ev.code || ev.receiveEvaluation || null,
    set: ev.set || null,
    eventId: ev.eventId || null
  };
}
function applyReceiveContextToEvent(ev) {
  if (!ev) return;
  const scope = getTeamScopeFromEvent(ev);
  // Un servizio segna l'inizio di un nuovo scambio
  if (ev.skillId === "serve") {
    clearReceiveContext(scope);
    return;
  }
  // Registra la ricezione e salva i dati utili per le azioni successive
  if (ev.skillId === "pass") {
    const zone = ev.zone || ev.playerPosition || null;
    if (ev.receivePosition == null) ev.receivePosition = zone;
    rememberReceiveContext(ev);
    return;
  }
  const ctx = lastReceiveContext[scope];
  const sameSet = ctx && (ctx.set === null || ctx.set === ev.set);
  const fromReceive = !!ctx && sameSet;
  if ((ev.skillId === "second" || ev.skillId === "attack") && fromReceive) {
    if (ctx.zone != null && ev.receivePosition == null) ev.receivePosition = ctx.zone;
    if (ctx.evaluation && !ev.receiveEvaluation) ev.receiveEvaluation = ctx.evaluation;
  }
  if (ev.skillId === "attack") {
    // Default BP, salvo attacco immediato dopo ricezione (solo il primo)
    ev.attackBp = !fromReceive;
    clearReceiveContext(scope);
  }
}
function addRelatedEvent(ev, relatedId) {
  if (!ev || relatedId === null || relatedId === undefined) return;
  if (!Array.isArray(ev.relatedEvents)) {
    ev.relatedEvents = [];
  }
  if (!ev.relatedEvents.includes(relatedId)) {
    ev.relatedEvents.push(relatedId);
  }
}
function addRelatedLink(ev, relatedId, type) {
  if (!ev || relatedId === null || relatedId === undefined) return;
  if (!type) return;
  if (!Array.isArray(ev.relatedLinks)) {
    ev.relatedLinks = [];
  }
  if (!ev.relatedLinks.some(link => link && link.eventId === relatedId && link.type === type)) {
    ev.relatedLinks.push({ eventId: relatedId, type });
  }
}
function linkEvents(evA, evB, type = null) {
  if (!evA || !evB) return;
  if (evA.eventId === null || evA.eventId === undefined) return;
  if (evB.eventId === null || evB.eventId === undefined) return;
  addRelatedEvent(evA, evB.eventId);
  addRelatedEvent(evB, evA.eventId);
  if (type) {
    addRelatedLink(evA, evB.eventId, type);
    addRelatedLink(evB, evA.eventId, type);
  }
}
function findLastEventBySkills(events, { scope = null, skillIds = [] } = {}) {
  const list = Array.isArray(events) ? events : [];
  const ids = Array.isArray(skillIds) ? skillIds : [skillIds];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i];
    if (!ev || !ids.includes(ev.skillId)) continue;
    if (scope && getTeamScopeFromEvent(ev) !== scope) continue;
    return ev;
  }
  return null;
}
function incrementSkillStats(scope, playerIdx, skillId, code) {
  if (typeof playerIdx !== "number" || playerIdx < 0) return;
  if (scope === "our") {
    if (!state.stats[playerIdx]) {
      state.stats[playerIdx] = {};
    }
    if (!state.stats[playerIdx][skillId]) {
      state.stats[playerIdx][skillId] = { "#": 0, "+": 0, "!": 0, "-": 0, "=": 0, "/": 0 };
    }
    state.stats[playerIdx][skillId][code] =
      (state.stats[playerIdx][skillId][code] || 0) + 1;
    return;
  }
  state.opponentStats = state.opponentStats || [];
  if (!state.opponentStats[playerIdx]) {
    state.opponentStats[playerIdx] = {};
  }
  if (!state.opponentStats[playerIdx][skillId]) {
    state.opponentStats[playerIdx][skillId] = { "#": 0, "+": 0, "!": 0, "-": 0, "=": 0, "/": 0 };
  }
  state.opponentStats[playerIdx][skillId][code] =
    (state.opponentStats[playerIdx][skillId][code] || 0) + 1;
}
async function handleEventClick(
  playerIdxStr,
  skillId,
  code,
  playerName,
  sourceEl,
  { setTypeChoice = null, serveMeta = null, attackMeta = null, scope = "our" } = {}
) {
  if (state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return false;
  }
  ensureSetStartSnapshot(state.currentSet || 1);
  let forceMatch = false;
  let allowPendingServePass = false;
  let flowState = null;
  let activeOverride = null;
  let inferredServeEvent = null;
  if (state.useOpponentTeam && state.predictiveSkillFlow) {
    flowState = getAutoFlowState();
    activeOverride = scope === "opponent" ? state.opponentSkillFlowOverride : state.skillFlowOverride;
    forceMatch = state.forceSkillActive && state.forceSkillScope === scope && activeOverride === skillId;
    allowPendingServePass =
      state.pendingServe &&
      state.pendingServe.scope &&
      getOppositeScope(state.pendingServe.scope) === scope &&
      skillId === "pass";
  }
  const wasFreeball = !!state.freeballPending;
  const players = getPlayersForScope(scope);
  let playerIdx = parseInt(playerIdxStr, 10);
  if (isNaN(playerIdx) || !players[playerIdx]) {
    playerIdx = players.findIndex(p => p === playerName);
  }
  if ((playerIdx === -1 || !players[playerIdx]) && playerName) {
    const raw = playerName.trim().toLowerCase();
    const normalized = raw.replace(/^[0-9]+\\s*/, "");
    playerIdx = players.findIndex(p => {
      const base = (p || "").trim().toLowerCase();
      if (!base) return false;
      return base === normalized || base === raw;
    });
  }
  if (playerIdx === -1 || !players[playerIdx]) return false;
  const playerId = getPlayerIdForScope(scope, playerIdx, players[playerIdx]);
  if (skillId === "attack" && !attackMeta) {
    attackMeta = getAttackMetaForPlayer(scope, playerIdx);
  }
  if (skillId === "serve" && !serveMeta && state.pendingServe && state.pendingServe.scope === scope) {
    serveMeta = state.pendingServe.meta || null;
  }
  if (skillId === "serve") {
    const serveZone = getServeBaseZoneForPlayer(playerIdx, scope);
    if (serveZone !== 1) {
      return false;
    }
  }
  if (state.useOpponentTeam && state.predictiveSkillFlow) {
    const playerLabel = playerName || players[playerIdx];
    if (forceMatch || allowPendingServePass) {
      // forced skill always allowed
    } else if (isPostServeLockForScope(scope)) {
      if (skillId !== "serve" || code !== "=" || getActiveServerName(scope) !== playerLabel) {
        return false;
      }
    } else if (
      flowState &&
      flowState.teamScope &&
      flowState.teamScope !== scope &&
      !canOverrideServeError(scope, skillId, code, flowState, playerLabel)
    ) {
      return false;
    }
  }
  const actionSnapshot = captureScoutActionSnapshot();
  state.freeballPending = false;
  state.freeballPendingScope = scope;
  if (scope === "opponent") {
    state.opponentSkillFlowOverride = null;
  } else {
    state.skillFlowOverride = null;
  }
  const selectionVideoTime = state.videoScoutMode
    ? serveMeta && typeof serveMeta.videoTime === "number"
      ? serveMeta.videoTime
      : attackMeta && typeof attackMeta.videoTime === "number"
        ? attackMeta.videoTime
        : null
    : null;
  if (state.pendingServe && !forceMatch) {
    const pendingScope = state.pendingServe.scope;
    if (pendingScope && scope !== pendingScope && skillId !== "pass") {
      return false;
    }
  }
  const shouldInferServe = shouldInferServeFromPass(scope, skillId);
  if (shouldInferServe) {
    const servingScope = getOppositeScope(scope);
    const server = getServerPlayerForScope(servingScope);
    const pendingServe = state.pendingServe;
    const serveMetaToUse =
      pendingServe && pendingServe.scope === servingScope ? pendingServe.meta || {} : serveMeta || {};
    const serverName =
      pendingServe && pendingServe.scope === servingScope && pendingServe.playerName
        ? pendingServe.playerName
        : server
          ? server.name
          : null;
    const serverIdx =
      pendingServe && pendingServe.scope === servingScope && typeof pendingServe.playerIdx === "number"
        ? pendingServe.playerIdx
        : server
          ? server.idx
          : null;
    if (serverName) {
      const serveCode = getServeCodeFromPassCode(code);
      const serverId = getPlayerIdForScope(servingScope, serverIdx, serverName);
      const serveEvent = buildBaseEventPayload({
        playerIdx: serverIdx,
        playerId: serverId,
        playerName: serverName,
        skillId: "serve",
        code: serveCode,
        videoTime:
          state.videoScoutMode && typeof serveMetaToUse.videoTime === "number"
            ? serveMetaToUse.videoTime
            : null,
        teamScope: servingScope
      });
      serveEvent.derivedFromPassServe = true;
      serveEvent.serveType = serveMetaToUse.serveType || serveEvent.serveType || "JF";
      serveEvent.serveStart = serveMetaToUse.serveStart || serveEvent.serveStart || null;
      serveEvent.serveEnd = serveMetaToUse.serveEnd || serveEvent.serveEnd || null;
      applyReceiveContextToEvent(serveEvent);
      state.events.push(serveEvent);
      inferredServeEvent = serveEvent;
      incrementSkillStats(servingScope, serverIdx, "serve", serveCode);
      if (state.pendingServe && state.pendingServe.scope === servingScope) {
        state.pendingServe = null;
      }
    }
  }
  const event = buildBaseEventPayload({
    playerIdx,
    playerId,
    playerName: players[playerIdx],
    skillId,
    code,
    videoTime: selectionVideoTime,
    teamScope: scope
  });
  attachScoutActionSnapshot(event, actionSnapshot);
  if (inferredServeEvent) {
    linkEvents(inferredServeEvent, event, "serve-pass");
  } else if (skillId === "pass" && state.useOpponentTeam) {
    const lastServe = findLastEventBySkills(state.events, {
      scope: getOppositeScope(scope),
      skillIds: ["serve"]
    });
    if (lastServe) {
      linkEvents(lastServe, event, "serve-pass");
    }
  }
  if (skillId === "defense" && state.useOpponentTeam) {
    const lastAttackOrBlock = findLastEventBySkills(state.events, {
      scope: getOppositeScope(scope),
      skillIds: ["attack", "block"]
    });
    if (lastAttackOrBlock) {
      const relType = lastAttackOrBlock.skillId === "block" ? "block-defense" : "attack-defense";
      linkEvents(lastAttackOrBlock, event, relType);
    }
  }
  if (skillId === "attack" && state.useOpponentTeam) {
    const lastSet = findLastEventBySkills(state.events, {
      scope,
      skillIds: ["second"]
    });
    if (lastSet) {
      linkEvents(lastSet, event, "set-attack");
    }
  }
  if (skillId === "serve") {
    if (serveMeta) {
      event.serveType = serveMeta.serveType || event.serveType || "JF";
      event.serveStart = serveMeta.serveStart || event.serveStart || null;
      event.serveEnd = serveMeta.serveEnd || event.serveEnd || null;
    } else if (!event.serveType) {
      event.serveType = "JF";
    }
    clearServeTypeInlineListener();
    if (state.pendingServe && state.pendingServe.scope === scope) {
      state.pendingServe = null;
    }
  }
  let appliedSetType = setTypeChoice || (attackMeta && attackMeta.setType) || null;
  if (skillId === "attack") {
    const otherScope = getOppositeScope(scope);
    if (
      state.useOpponentTeam &&
      state.predictiveSkillFlow &&
      code === "/" &&
      isSkillEnabledForScope("block", otherScope)
    ) {
      event.pendingBlockEval = true;
    }
    if (appliedSetType) {
      event.setType = appliedSetType;
    }
    if (attackMeta && attackMeta.trajectory) {
      applyAttackTrajectoryToEvent(event, attackMeta.trajectory);
    }
    const setterFromSet = getSetterFromLastSetEventForScope(scope);
    if (setterFromSet && (setterFromSet.idx !== null || setterFromSet.name)) {
      event.setterIdx = setterFromSet.idx;
      event.setterName = setterFromSet.name;
    } else {
      const setterFromCourt = getSetterFromCourtForScope(scope);
      event.setterIdx = setterFromCourt.idx;
      event.setterName = setterFromCourt.name;
    }
    // di default consideriamo l'attacco BP, poi correggiamo se deriva da ricezione
    event.attackBp = true;
  }
  event.fromFreeball = wasFreeball || skillId === "freeball";
  if (!event.fromFreeball && (skillId === "second" || skillId === "attack")) {
    const prevEvent = state.events && state.events.length ? state.events[state.events.length - 1] : null;
    if (
      prevEvent &&
      ((skillId === "second" && prevEvent.skillId === "freeball") ||
        (skillId === "attack" && prevEvent.skillId === "second")) &&
      prevEvent.fromFreeball &&
      getTeamScopeFromEvent(prevEvent) === scope
    ) {
      event.fromFreeball = true;
    }
  }
  applyReceiveContextToEvent(event);
  state.events.push(event);
  handleAutoRotationFromEvent(event, scope);
  if (!state.useOpponentTeam && state.predictiveSkillFlow && scope === "our" && skillId === "serve") {
    if (code === "/") {
      state.freeballPending = true;
      state.freeballPendingScope = "our";
      state.skillFlowOverride = getFreeballStartSkill("our");
    } else {
      const direction = typeof getPointDirection === "function" ? getPointDirection(event) : null;
      state.skillFlowOverride = direction === "for" ? "serve" : direction === "against" ? "pass" : "defense";
    }
    state.flowTeamScope = "our";
  }
  if (state.useOpponentTeam) {
    const nextFlow = computeTwoTeamFlowFromEvent(event);
    state.flowTeamScope = nextFlow.teamScope;
  }
  if (state.useOpponentTeam && state.predictiveSkillFlow && skillId === "serve" && code === "=") {
    const nextServeScope = getOppositeScope(scope);
    state.flowTeamScope = nextServeScope;
    state.isServing = nextServeScope === "our";
  }
  incrementSkillStats(scope, playerIdx, skillId, code);
  if (skillId === "attack") {
    clearAttackSelection(playerIdx, scope);
  }
  if (state.forceSkillActive && state.forceSkillScope === scope) {
    state.forceSkillActive = false;
    state.forceSkillScope = null;
  }
  const inferredAttackEvent = skillId === "block" ? applyBlockInference(event, scope, code) : null;
  if (inferredAttackEvent) {
    linkEvents(inferredAttackEvent, event, "attack-block");
  }
  if (skillId === "serve" && code === "/") {
    triggerFreeballFlow({ persist: false, rerender: false, scope });
  }
  if (skillId === "attack" && code === "!") {
    triggerFreeballFlow({ persist: false, rerender: false, scope });
  }
  if (
    state.useOpponentTeam &&
    state.predictiveSkillFlow &&
    (skillId === "pass" || skillId === "defense") &&
    code === "/"
  ) {
    triggerFreeballFlow({ persist: false, rerender: false, scope: getOppositeScope(scope) });
  }
  animateEventToLog(sourceEl, skillId, code);
  const persistLocal = typeof getPointDirection === "function" && !!getPointDirection(event);
  schedulePostEventUpdates({
    includeAggregates: !state.predictiveSkillFlow || !!inferredAttackEvent,
    append: !inferredAttackEvent,
    playerIdx,
    skillId,
    persistLocal,
    scope
  });
  if (
    (scope === "opponent" ? state.opponentAttackTrajectoryEnabled : state.attackTrajectoryEnabled) &&
    skillId === "attack" &&
    !(attackMeta && attackMeta.trajectory) &&
    !(attackMeta && attackMeta.trajectorySkipped)
  ) {
    const baseZoneForMapping = event.originZone || event.zone || event.playerPosition || null;
    const forceFar = isFarSideForScope(scope);
    openAttackTrajectoryModal({
      baseZone: baseZoneForMapping,
      setType: event.setType || null,
      forceFar,
      scope
    }).then(coords => {
      if (coords && coords.start && coords.end) {
        const mapZone = z => mapBackRowZone(z, baseZoneForMapping);
        const trajectoryPayload = {
          start: coords.start,
          end: coords.end,
          startZone: mapZone(coords.startZone || null),
          endZone: mapZone(coords.endZone || null),
          directionDeg: null
        };
        event.attackStart = coords.start;
        event.attackEnd = coords.end;
        event.attackStartZone = trajectoryPayload.startZone;
        event.attackEndZone = trajectoryPayload.endZone;
        event.attackDirection = trajectoryPayload; // richiesta: tutto dentro direzione attacco
        event.attackTrajectory = trajectoryPayload;
        if (!event.originZone) {
          event.originZone = baseZoneForMapping;
        }
        if (trajectoryPayload.startZone) {
          event.zone = trajectoryPayload.startZone;
          event.playerPosition = trajectoryPayload.startZone;
        }
        saveState({ persistLocal });
        renderEventsLog({ suppressScroll: true });
        renderVideoAnalysis();
        renderTrajectoryAnalysis();
        renderServeTrajectoryAnalysis();
      }
    });
  }
  if (
    (scope === "opponent" ? state.opponentServeTrajectoryEnabled : state.serveTrajectoryEnabled) &&
    skillId === "serve" &&
    !serveMeta &&
    code !== "="
  ) {
    captureServeTrajectory(event);
  }
  return true;
}
