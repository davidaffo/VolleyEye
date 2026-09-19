function valueToString(val) {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val) || typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch (_) {
      return String(val);
    }
  }
  return String(val);
}
function parseInputValue(raw) {
  const str = (raw || "").trim();
  if (str === "") return null;
  // Try JSON first (for arrays/objects/booleans/null/numbers)
  try {
    return JSON.parse(str);
  } catch (_) {
    const num = parseFloat(str);
    if (!Number.isNaN(num)) return num;
    return str;
  }
}
function formatAttackPhaseLabel(val) {
  const phase = normalizePhaseValue(val);
  if (phase === "bp") return "BP";
  if (phase === "so") return "SO";
  return "";
}
function createNumberInput(ev, field, min, max, onDone) {
  const input = document.createElement("input");
  input.type = "number";
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  input.value = ev[field] === null || ev[field] === undefined ? "" : String(ev[field]);
  input.addEventListener("change", () => {
    markVideoUndoCapture(input);
    const val = parseFloat(input.value);
    if (!Number.isNaN(val) && (min === undefined || val >= min) && (max === undefined || val <= max)) {
      ev[field] = val;
      refreshAfterVideoEdit(true);
    }
  });
  input.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
    renderEventsLog();
  });
  return input;
}
function createTextInput(ev, field, onDone) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = valueToString(ev[field]);
  input.addEventListener("change", () => {
    markVideoUndoCapture(input);
    ev[field] = parseInputValue(input.value);
    refreshAfterVideoEdit(false);
  });
  input.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
    renderEventsLog();
  });
  return input;
}
function createCheckboxInput(ev, field, onDone) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!ev[field];
  input.addEventListener("change", () => {
    ev[field] = input.checked;
    refreshAfterVideoEdit(false);
  });
  input.addEventListener("blur", () => {
    if (typeof onDone === "function") onDone();
    renderVideoAnalysis();
    renderEventsLog();
  });
  return input;
}
function getNextEventId() {
  const maxId = (state.events || []).reduce((max, ev) => {
    const val = typeof ev.eventId === "number" ? ev.eventId : 0;
    return val > max ? val : max;
  }, 0);
  return maxId + 1;
}
function ensureSkillClock() {
  state.skillClock = state.skillClock || { paused: false, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: null };
  if (typeof state.skillClock.paused !== "boolean") state.skillClock.paused = false;
  if (typeof state.skillClock.pausedAccumMs !== "number") state.skillClock.pausedAccumMs = 0;
  return state.skillClock;
}
function getSkillClockMs() {
  ensureSkillClock();
  if (state.skillClock.paused) {
    return state.skillClock.lastEffectiveMs || 0;
  }
  return Date.now() - (state.skillClock.pausedAccumMs || 0);
}
function pauseSkillClock() {
  ensureSkillClock();
  if (state.skillClock.paused) return;
  state.skillClock.lastEffectiveMs = getSkillClockMs();
  state.skillClock.pausedAtMs = Date.now();
  state.skillClock.paused = true;
}
function resumeSkillClock() {
  ensureSkillClock();
  if (!state.skillClock.paused) return;
  const now = Date.now();
  const pausedAt = state.skillClock.pausedAtMs || now;
  state.skillClock.pausedAccumMs = (state.skillClock.pausedAccumMs || 0) + Math.max(0, now - pausedAt);
  state.skillClock.paused = false;
  state.skillClock.pausedAtMs = null;
  state.skillClock.lastEffectiveMs = null;
}
function ensureVideoClock() {
  const offset = state.video && typeof state.video.offsetSeconds === "number" ? state.video.offsetSeconds : 0;
  state.videoClock = state.videoClock || {
    startMs: Date.now(),
    paused: false,
    pausedAtMs: null,
    pausedAccumMs: 0,
    currentSeconds: offset
  };
  if (typeof state.videoClock.paused !== "boolean") state.videoClock.paused = false;
  if (typeof state.videoClock.pausedAccumMs !== "number") state.videoClock.pausedAccumMs = 0;
  if (typeof state.videoClock.startMs !== "number") state.videoClock.startMs = Date.now();
  if (typeof state.videoClock.currentSeconds !== "number") state.videoClock.currentSeconds = offset;
  return state.videoClock;
}
function getVideoClockSeconds() {
  ensureVideoClock();
  const offset = state.video && typeof state.video.offsetSeconds === "number" ? state.video.offsetSeconds : 0;
  if (state.videoClock.paused) {
    return state.videoClock.currentSeconds || offset;
  }
  const elapsed = Date.now() - (state.videoClock.startMs || Date.now()) - (state.videoClock.pausedAccumMs || 0);
  const seconds = Math.max(0, offset + elapsed / 1000);
  state.videoClock.currentSeconds = seconds;
  return seconds;
}
function pauseVideoClock() {
  ensureVideoClock();
  if (state.videoClock.paused) return;
  state.videoClock.currentSeconds = getVideoClockSeconds();
  state.videoClock.pausedAtMs = Date.now();
  state.videoClock.paused = true;
}
function resumeVideoClock() {
  ensureVideoClock();
  if (!state.videoClock.paused) return;
  const now = Date.now();
  const pausedAt = state.videoClock.pausedAtMs || now;
  state.videoClock.pausedAccumMs = (state.videoClock.pausedAccumMs || 0) + Math.max(0, now - pausedAt);
  state.videoClock.paused = false;
  state.videoClock.pausedAtMs = null;
}
function getActiveVideoPlaybackSeconds() {
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  const preferScout = !!state.videoScoutMode && activeTab !== "video";
  if (state.video && state.video.youtubeId) {
    const scoutFirst =
      preferScout &&
      ytPlayerScout &&
      ytPlayerScoutReady &&
      typeof ytPlayerScout.getCurrentTime === "function";
    if (scoutFirst) {
      const t = ytPlayerScout.getCurrentTime();
      if (isFinite(t)) return Math.max(0, t);
    }
    if (ytPlayer && ytPlayerReady && typeof ytPlayer.getCurrentTime === "function") {
      const t = ytPlayer.getCurrentTime();
      if (isFinite(t)) return Math.max(0, t);
    }
    if (
      ytPlayerScout &&
      ytPlayerScoutReady &&
      typeof ytPlayerScout.getCurrentTime === "function"
    ) {
      const t = ytPlayerScout.getCurrentTime();
      if (isFinite(t)) return Math.max(0, t);
    }
    return null;
  }
  if (preferScout && elAnalysisVideoScout && typeof elAnalysisVideoScout.currentTime === "number") {
    return Math.max(0, elAnalysisVideoScout.currentTime || 0);
  }
  if (elAnalysisVideo && typeof elAnalysisVideo.currentTime === "number") {
    return Math.max(0, elAnalysisVideo.currentTime || 0);
  }
  if (elAnalysisVideoScout && typeof elAnalysisVideoScout.currentTime === "number") {
    return Math.max(0, elAnalysisVideoScout.currentTime || 0);
  }
  return null;
}
function isVideoElementPlaying(videoEl) {
  return !!(videoEl && !videoEl.paused && !videoEl.ended && videoEl.readyState >= 2);
}
function isYoutubePlayerPlaying(player, readyFlag) {
  if (!readyFlag || !player || typeof player.getPlayerState !== "function") return false;
  try {
    return player.getPlayerState() === 1;
  } catch (_) {
    return false;
  }
}
function isVideoPlaybackActive() {
  if (state.video && state.video.youtubeId) {
    if (isYoutubePlayerPlaying(ytPlayerScout, ytPlayerScoutReady)) return true;
    if (isYoutubePlayerPlaying(ytPlayer, ytPlayerReady)) return true;
    return false;
  }
  return isVideoElementPlaying(elAnalysisVideoScout) || isVideoElementPlaying(elAnalysisVideo);
}
function scheduleVideoSafeRender(task) {
  if (typeof task !== "function") return;
  if (!state.videoScoutMode || !isVideoPlaybackActive()) {
    task();
    return;
  }
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(task, { timeout: 200 });
    return;
  }
  setTimeout(task, 60);
}
function scheduleRenderPlayers() {
  scheduleVideoSafeRender(renderPlayers);
}
function schedulePostEventUpdates({
  suppressScroll = false,
  includeAggregates = true,
  append = true,
  playerIdx = null,
  skillId = null,
  persistLocal = false,
  scope = "our"
} = {}) {
  scheduleVideoSafeRender(() => {
    saveState({ persistLocal });
    if (scope === "our" && typeof playerIdx === "number" && skillId) {
      updateSkillStatsUI(playerIdx, skillId);
    }
    renderPlayers();
    scrollToActiveCourtOnMobileAlways();
    renderEventsLog({ suppressScroll, append });
    if (includeAggregates) {
      renderLiveScore();
      renderScoreAndRotations(computePointsSummary());
      renderAggregatedTable();
      renderVideoAnalysis();
      renderTrajectoryAnalysis();
      renderServeTrajectoryAnalysis();
    }
  });
}
function applySavedPlaybackToVideo(videoEl) {
  if (!videoEl || !state.video) return;
  const saved = state.video.lastPlaybackSeconds;
  if (typeof saved !== "number" || !isFinite(saved)) return;
  const target = Math.max(0, saved);
  const applyTime = () => {
    try {
      videoEl.currentTime = target;
    } catch (_) {
      // ignore seek errors
    }
  };
  if (videoEl.readyState >= 1) {
    applyTime();
    return;
  }
  const onMeta = () => {
    applyTime();
    videoEl.removeEventListener("loadedmetadata", onMeta);
  };
  videoEl.addEventListener("loadedmetadata", onMeta);
}
function updateVideoPlaybackSnapshot(forcedSeconds = null, force = false) {
  if (typeof window !== "undefined" && window.__appResetInProgress) return;
  if (!state.video) return;
  const now = Date.now();
  if (!force && now - lastVideoSnapshotMs < 1500) return;
  const playback =
    typeof forcedSeconds === "number" && isFinite(forcedSeconds)
      ? forcedSeconds
      : getActiveVideoPlaybackSeconds();
  if (typeof playback !== "number" || !isFinite(playback)) return;
  lastVideoSnapshotMs = now;
  state.video.lastPlaybackSeconds = Math.max(0, playback);
  saveState({ persistLocal: true });
}
function startVideoPlaybackSnapshotTimer() {
  if (videoSnapshotTimer) return;
  videoSnapshotTimer = setInterval(() => {
    if (!state.video || !state.video.youtubeId) return;
    updateVideoPlaybackSnapshot();
  }, 2000);
}
function getEventVideoSeconds(baseVideoTime = null) {
  if (typeof baseVideoTime === "number") return Math.max(0, baseVideoTime);
  if (state.videoScoutMode) {
    const playback = getActiveVideoPlaybackSeconds();
    if (typeof playback === "number") return Math.max(0, playback);
  }
  if (!state.events || state.events.length === 0) {
    ensureVideoClock();
    if (
      state.videoClock.paused &&
      (state.videoClock.currentSeconds || 0) === 0 &&
      state.videoClock.pausedAccumMs === 0
    ) {
      state.videoClock.startMs = Date.now();
      state.videoClock.currentSeconds = 0;
      state.videoClock.paused = false;
      state.videoClock.pausedAtMs = null;
    }
    return 0;
  }
  return getVideoClockSeconds();
}
function buildBaseEventPayload(base) {
  ensureSkillClock();
  if (
    (!state.events || state.events.length === 0) &&
    state.skillClock &&
    state.skillClock.pausedAccumMs === 0 &&
    !state.skillClock.pausedAtMs &&
    !state.skillClock.lastEffectiveMs
  ) {
    state.skillClock.pausedAccumMs = Date.now();
    state.skillClock.paused = false;
    state.skillClock.pausedAtMs = null;
    state.skillClock.lastEffectiveMs = 0;
  }
  ensureVideoClock();
  if (
    (!state.events || state.events.length === 0) &&
    state.videoClock &&
    state.videoClock.paused &&
    state.videoClock.pausedAccumMs === 0 &&
    !state.videoClock.pausedAtMs &&
    (state.videoClock.currentSeconds || 0) === 0
  ) {
    const offset = state.video && typeof state.video.offsetSeconds === "number" ? state.video.offsetSeconds : 0;
    state.videoClock.startMs = Date.now();
    state.videoClock.currentSeconds = Math.max(0, offset);
    state.videoClock.paused = false;
    state.videoClock.pausedAtMs = null;
  }
  const now = new Date();
  const nowIso = now.toISOString();
  const clockMs = getSkillClockMs();
  let videoSeconds = getEventVideoSeconds(base && base.videoTime);
  if (
    (!state.events || state.events.length === 0) &&
    !state.videoScoutMode &&
    !(base && typeof base.videoTime === "number")
  ) {
    ensureVideoClock();
    state.videoClock.startMs = Date.now();
    state.videoClock.pausedAccumMs = 0;
    state.videoClock.paused = false;
    state.videoClock.pausedAtMs = null;
    state.videoClock.currentSeconds = 0;
    videoSeconds = 0;
  }
  const teamScope = (base && (base.teamScope || base.team)) || "our";
  const teamMeta = getTeamOfficialMetaForScope(teamScope);
  const playerNumberAtEvent =
    typeof base.playerNumberAtEvent === "string"
      ? base.playerNumberAtEvent
      : (() => {
          const playerName =
            base.playerName ||
            (typeof base.playerIdx === "number" ? getPlayersForScope(teamScope)[base.playerIdx] : "") ||
            "";
          const numbers = getPlayerNumbersForScope(teamScope);
          return playerName && numbers[playerName] !== undefined && numbers[playerName] !== null
            ? String(numbers[playerName])
            : "";
        })();
  const rotationValue = teamScope === "opponent" ? state.opponentRotation : state.rotation;
  const rotation = Math.min(6, Math.max(1, parseInt(rotationValue, 10) || 1));
  const scoreSnapshot = computePointsSummary(state.currentSet || 1);
  const zone =
    typeof base.playerIdx === "number"
      ? getCurrentZoneForPlayer(base.playerIdx, base.skillId, teamScope)
      : null;
  const lastEvent = state.events && state.events.length > 0 ? state.events[state.events.length - 1] : null;
  const lastEventTime = lastEvent ? lastEvent.t : null;
  const durationMs = getDefaultSkillDurationMs();
  return {
    eventId: getNextEventId(),
    t: nowIso,
    durationMs: durationMs,
    clockMs,
    set: state.currentSet,
    rotation,
    courtSideSwapped: !!state.courtSideSwapped,
    playerIdx: base.playerIdx,
    playerId: base.playerId || null,
    playerCodeOfficial: sanitizeOfficialString(base.playerCodeOfficial) || getPlayerOfficialCodeForScope(teamScope, base.playerIdx, base.playerName),
    playerNumberAtEvent,
    playerName:
      base.playerName ||
      (typeof base.playerIdx === "number"
        ? getPlayersForScope(teamScope)[base.playerIdx]
        : base.playerName) ||
      null,
    zone,
    originZone: zone,
    skillId: base.skillId,
    code: base.code,
    pointDirection: base.pointDirection || null,
    value: base.value,
    autoRotationDirection: null,
    autoRotateNext: null,
    setterPosition: rotation,
    opponentSetterPosition:
      teamScope === "opponent"
        ? Math.min(6, Math.max(1, parseInt(state.rotation, 10) || 1))
        : Math.min(6, Math.max(1, parseInt(state.opponentRotation, 10) || 1)),
    playerPosition: zone,
    receivePosition: null,
    base: base.base || null,
    setType: base.setType || null,
    combination: base.combination || null,
    serveStart: null,
    serveEnd: null,
    serveType: null,
    receiveEvaluation: null,
    attackEvaluation: null,
    attackBp: null,
    attackType: null,
    attackStartZone: null,
    attackEndZone: null,
    attackStart: null,
    attackEnd: null,
    attackDirection: null,
    blockNumber: null,
    errorType: base.errorType || null,
    playerIn: base.playerIn || null,
    playerOut: base.playerOut || null,
    relatedEvents: base.relatedEvents || [],
    team: teamScope === "opponent" ? "opponent" : "our",
    teamName: getTeamNameForScope(teamScope),
    teamCodeOfficial: sanitizeOfficialString(base.teamCodeOfficial) || teamMeta.teamCodeOfficial || "",
    teamIdOfficial: sanitizeOfficialString(base.teamIdOfficial) || teamMeta.teamIdOfficial || "",
    homeScore: scoreSnapshot.totalFor || 0,
    visitorScore: scoreSnapshot.totalAgainst || 0,
    actionType: base.actionType || null,
    prevSet: base.prevSet || null,
    nextSet: base.nextSet || null,
    prevMatchFinished: base.prevMatchFinished || null,
    nextMatchFinished: base.nextMatchFinished || null,
    prevClock: base.prevClock || null,
    nextClock: base.nextClock || null,
    prevVideoClock: base.prevVideoClock || null,
    nextVideoClock: base.nextVideoClock || null,
    videoTime: videoSeconds,
    dv: normalizeDataVolleyEventMeta(base.dv)
  };
}
function setSkillModalCancelVisibility(visible) {
  if (!elSkillModalCancel) return;
  elSkillModalCancel.classList.toggle("hidden", !visible);
}
function renderSkillChoice(playerIdx, playerName, scope = "our") {
  if (state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  if (!elSkillModalBody) return;
  setSkillModalCancelVisibility(false);
  activeSkillModalContext = { playerIdx, playerName: playerName || null, skillId: null, scope };
  updateSetTypeVisibility(getPredictedSkillIdForScope(scope) || getPredictedSkillId());
  modalMode = "skill";
  modalSubPosIdx = -1;
  elSkillModalBody.innerHTML = "";
  const players = getPlayersForScope(scope);
  if (elSkillModalTitle) {
    const title =
      (scope === "opponent"
        ? formatNameWithNumberFor(playerName || players[playerIdx], getPlayerNumbersForScope(scope))
        : formatNameWithNumber(playerName || players[playerIdx])) ||
      (playerName || "Giocatrice");
    elSkillModalTitle.textContent = title + " · scegli fondamentale";
  }
  const enabledSkills = getEnabledSkillsForScope(scope);
  if (enabledSkills.length === 0) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Abilita almeno un fondamentale nelle impostazioni per scoutizzare.";
    elSkillModalBody.appendChild(empty);
    return;
  }
  const grid = document.createElement("div");
  grid.className = "modal-skill-grid";
  enabledSkills.forEach(skill => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "modal-skill-btn";
    btn.innerHTML = `<span>${skill.label}</span><span class="modal-skill-badge badge-${skill.id}">${skill.label[0]}</span>`;
    btn.addEventListener("click", () => renderSkillCodes(playerIdx, playerName, skill.id, scope));
    grid.appendChild(btn);
  });
  elSkillModalBody.appendChild(grid);
}
function renderSkillCodes(playerIdx, playerName, skillId, scope = "our") {
  if (!elSkillModalBody) return;
  setSkillModalCancelVisibility(true);
  activeSkillModalContext = { playerIdx, playerName: playerName || null, skillId, scope };
  const predicted = getPredictedSkillIdForScope(scope) || getPredictedSkillId();
  updateSetTypeVisibility(skillId === "attack" ? "attack" : predicted);
  modalMode = "skill-codes";
  modalSubPosIdx = -1;
  elSkillModalBody.innerHTML = "";
  const skill = SKILLS.find(s => s.id === skillId);
  const players = getPlayersForScope(scope);
  const nameValue = playerName || players[playerIdx];
  const title =
    (scope === "opponent"
      ? formatNameWithNumberFor(nameValue, getPlayerNumbersForScope(scope))
      : formatNameWithNumber(nameValue)) ||
    (nameValue || "Giocatrice");
  if (elSkillModalTitle) {
    elSkillModalTitle.textContent =
      (skill ? skill.label + " · " : "") + title;
  }
  const header = document.createElement("div");
  header.className = "modal-skill-head";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "secondary modal-skill-back";
  backBtn.textContent = "Indietro";
  backBtn.addEventListener("click", () => {
    delete serveMetaByPlayer[makePlayerKey(scope, playerIdx)];
    clearServeTypeInlineListener();
    clearAttackSelection(playerIdx, scope);
    renderSkillChoice(playerIdx, playerName, scope);
  });
  header.appendChild(backBtn);
  elSkillModalBody.appendChild(header);

  const playerKey = makePlayerKey(scope, playerIdx);
  if (
    skillId === "serve" &&
    state.useOpponentTeam &&
    state.predictiveSkillFlow &&
    state.pendingServe &&
    state.pendingServe.scope === scope
  ) {
    closeSkillModal();
    renderPlayers();
    return;
  }
  if (skillId !== "serve" && serveTypeInlinePlayer === playerKey) {
    clearServeTypeInlineListener();
  }
  if (skillId !== "attack" && attackInlinePlayer === playerKey) {
    clearAttackSelection(playerIdx, scope);
  }
  if (skillId === "serve" && !serveMetaByPlayer[playerKey]) {
    if (serveTypeInlinePlayer !== null && serveTypeInlinePlayer !== playerKey) {
      return;
    }
    const typeWrap = document.createElement("div");
    typeWrap.className = "modal-skill-codes";
    typeWrap.addEventListener("pointerdown", () => setServeTypeFocusPlayer(playerIdx, scope));
    setServeTypeFocusPlayer(playerIdx, scope);
    const types = [
      { id: "F", label: "Float (F)" },
      { id: "JF", label: "Jump float (JF)" },
      { id: "S", label: "Spin (S)" }
    ];
    const handleSelect = async type => {
      await startServeTypeSelection(
        playerIdx,
        type,
        () => {
          renderSkillCodes(playerIdx, playerName, skillId, scope);
        },
        scope
      );
    };
    types.forEach(t => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-btn";
      btn.textContent = t.label;
      btn.addEventListener("click", () => handleSelect(t.id));
      typeWrap.appendChild(btn);
    });
    bindServeTypeInlineListener(playerIdx, handleSelect, scope);
    elSkillModalBody.appendChild(typeWrap);
    return;
  }
  if (skillId === "attack" && !getAttackMetaForPlayer(scope, playerIdx)) {
    if (
      attackInlinePlayer !== null &&
      attackInlinePlayer !== playerKey &&
      isPlayerKeyInScope(attackInlinePlayer, scope)
    ) {
      return;
    }
    if (shouldPromptAttackSetType(scope)) {
      const queuedSetType = normalizeSetTypeValue(queuedSetTypeChoice);
      if (queuedSetType) {
        startAttackSelection(playerIdx, queuedSetType, () => {
          const key = makePlayerKey(scope, playerIdx);
          if (attackMetaByPlayer[key]) {
            attackMetaByPlayer[key].fromNextSetType = true;
          }
          queuedSetTypeChoice = null;
          setNextSetType("");
          renderSkillCodes(playerIdx, playerName, skillId, scope);
        }, scope);
        return;
      }
      const wrap = document.createElement("div");
      wrap.className = "modal-skill-codes";
      const setTypeOptions = isSetterPlayerForScope(scope, playerIdx)
        ? [{ value: "Damp", label: "Damp" }]
        : DEFAULT_SET_TYPE_OPTIONS;
      setTypeOptions.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "event-btn";
        btn.textContent = formatSetTypeLabelWithShortcut(opt.value, opt.label);
        btn.addEventListener("click", async () => {
          await startAttackSelection(playerIdx, opt.value, () => {
            renderSkillCodes(playerIdx, playerName, skillId, scope);
          }, scope);
        });
        wrap.appendChild(btn);
      });
      elSkillModalBody.appendChild(wrap);
    } else {
      if (attackInlinePlayer === playerKey) return;
      startAttackSelection(playerIdx, null, () => {
        renderSkillCodes(playerIdx, playerName, skillId, scope);
      }, scope);
    }
    return;
  }

  const codesWrap = document.createElement("div");
  codesWrap.className = "modal-skill-codes";
  const codes = (state.metricsConfig?.[skillId]?.activeCodes || RESULT_CODES).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  const ordered = codes.filter(c => c !== "/" && c !== "=").concat("/", "=");
  ordered.forEach(code => {
    const btn = document.createElement("button");
    btn.type = "button";
    const tone = typeof getCodeTone === "function" ? getCodeTone(skillId, code) : "neutral";
    btn.className = "event-btn code-" + tone;
    btn.textContent = code;
    btn.dataset.playerIdx = String(playerIdx);
    btn.dataset.playerName = nameValue;
    btn.dataset.skillId = skillId;
    btn.dataset.code = code;
    btn.addEventListener("click", async e => {
      const attackMeta = getAttackMetaForPlayer(scope, playerIdx);
      const usedQueuedSetType =
        skillId === "attack" &&
        attackMeta &&
        attackMeta.fromNextSetType;
      const success = await handleEventClick(
        playerIdx,
        skillId,
        code,
        playerName,
        e.currentTarget,
        {
          serveMeta: serveMetaByPlayer[playerKey] || null,
          attackMeta: attackMeta || null,
          scope
        }
      );
      if (success) {
        delete serveMetaByPlayer[playerKey];
        if (skillId === "serve") {
          clearServeTypeInlineListener();
        }
        if (skillId === "attack") {
          if (usedQueuedSetType) {
            setNextSetType("");
          }
          clearAttackSelection(playerIdx, scope);
        }
        closeSkillModal();
      }
    });
    codesWrap.appendChild(btn);
  });
  elSkillModalBody.appendChild(codesWrap);
}
function openSkillModal(playerIdx, playerName, scope = "our") {
  if (!elSkillModal || !elSkillModalBody) return;
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const players = getPlayersForScope(scope);
  if (isNaN(idx) || !players[idx]) return;
  renderSkillChoice(idx, playerName, scope);
  elSkillModal.classList.remove("hidden");
  setModalOpenState(true);
}
function openSkillCodesModal(playerIdx, playerName, skillId, scope = "our") {
  if (!elSkillModal || !elSkillModalBody) return;
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const players = getPlayersForScope(scope);
  if (isNaN(idx) || !players[idx]) return;
  if (!skillId) return;
  renderSkillCodes(idx, playerName, skillId, scope);
  elSkillModal.classList.remove("hidden");
  setModalOpenState(true);
}
function openSubModal(posIdx) {
  if (!elSkillModal || !elSkillModalBody) return;
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  modalMode = "sub";
  modalSubPosIdx = posIdx;
  elSkillModalBody.innerHTML = "";
  setSkillModalCancelVisibility(false);
  if (elSkillModalTitle) {
    elSkillModalTitle.textContent = "Sostituisci posizione " + (posIdx + 1);
  }
  const bench = getBenchPlayers();
  const liberos = getBenchLiberos();
  const candidates = Array.from(new Set([...bench, ...liberos]));
  if (candidates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Nessuna riserva disponibile.";
    elSkillModalBody.appendChild(empty);
  } else {
    candidates.forEach(name => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isLib = (state.liberos || []).includes(name);
      btn.className = "sub-option-btn" + (isLib ? " libero" : "");
      btn.textContent = formatNameWithNumber(name);
      if (isLib) {
        const tag = document.createElement("span");
        tag.className = "sub-libero-tag";
        tag.textContent = "Libero";
        btn.appendChild(tag);
      }
      btn.addEventListener("click", () => {
        setCourtPlayer(posIdx, "main", name);
        closeSkillModal();
      });
      elSkillModalBody.appendChild(btn);
    });
  }
  elSkillModal.classList.remove("hidden");
  setModalOpenState(true);
}
function cancelSkillModalFlow() {
  if (!activeSkillModalContext) return;
  const { playerIdx, playerName, scope } = activeSkillModalContext;
  resetSkillSelectionForPlayer(playerIdx, scope);
  renderSkillChoice(playerIdx, playerName, scope);
}
function closeSkillModal() {
  if (!elSkillModal) return;
  elSkillModal.classList.add("hidden");
  setModalOpenState(false);
  activeSkillModalContext = null;
  setSkillModalCancelVisibility(false);
}
function isErrorPickModeForScope(scope) {
  return !!(errorPickModeState && errorPickModeState.scope === scope);
}
function isPointPickModeForScope(scope) {
  return !!(pointPickModeState && pointPickModeState.scope === scope);
}
function stopErrorPickMode(options = {}) {
  if (!errorPickModeState) return;
  errorPickModeState = null;
  if (typeof renderBenchChips === "function") {
    renderBenchChips();
  }
  if (options && options.render === false) return;
  renderPlayers();
}
function stopPointPickMode(options = {}) {
  if (!pointPickModeState) return;
  pointPickModeState = null;
  if (options && options.render === false) return;
  renderPlayers();
}
function startErrorPickMode(scope = "our") {
  const players = getPlayersForScope(scope);
  if (!players || players.length === 0) {
    openErrorModal({ scope });
    return;
  }
  stopPointPickMode({ render: false });
  closeSkillModal();
  closePointModal();
  closeErrorModal();
  errorPickModeState = { scope };
  if (typeof renderBenchChips === "function") {
    renderBenchChips();
  }
  renderPlayers();
}
function startPointPickMode(scope = "our") {
  const players = getPlayersForScope(scope);
  if (!players || players.length === 0) {
    openPointModal();
    return;
  }
  stopErrorPickMode({ render: false });
  closeSkillModal();
  closeErrorModal();
  closePointModal();
  pointPickModeState = { scope };
  renderPlayers();
}
function openErrorModalForPickedPlayer(scope, playerIdx, playerName) {
  stopErrorPickMode({ render: false });
  openErrorModal({
    scope,
    playerIdx,
    playerName,
    fromPicker: true
  });
}
function applyPointForPickedPlayer(scope, playerIdx, playerName) {
  addPlayerPoint(playerIdx, playerName, scope);
  stopPointPickMode();
}
function getBenchEntriesForScope(scope) {
  const players = getPlayersForScope(scope) || [];
  if (!players.length) return [];
  const courtSource = scope === "opponent" ? state.opponentCourt || [] : state.court || [];
  const court =
    typeof ensureCourtShapeFor === "function" ? ensureCourtShapeFor(courtSource) : getCourtShape(courtSource);
  const inCourt = new Set();
  court.forEach(slot => {
    const name = slot && slot.main ? slot.main : "";
    if (name) inCourt.add(name);
  });
  const entries = getSortedPlayerEntriesForScope(scope);
  return entries.filter(entry => entry && entry.name && !inCourt.has(entry.name));
}
// esponi per gli handler inline (fallback mobile)
function renderErrorModal() {
  if (!elErrorModalBody) return;
  elErrorModalBody.innerHTML = "";
  const scope = (errorModalPrefillPlayer && errorModalPrefillPlayer.scope) || "our";
  const isPlayerPrefilled =
    !!(errorModalPrefillPlayer && typeof errorModalPrefillPlayer.playerIdx === "number");
  const isFromPickMode = !!(errorModalPrefillPlayer && errorModalPrefillPlayer.fromPicker);
  const isTeamFromPickMode = !!(errorModalPrefillPlayer && errorModalPrefillPlayer.teamFromPicker);
  const pickedIdx = isPlayerPrefilled ? errorModalPrefillPlayer.playerIdx : null;
  const pickedName = isPlayerPrefilled
    ? errorModalPrefillPlayer.playerName ||
      (getPlayersForScope(scope) && getPlayersForScope(scope)[errorModalPrefillPlayer.playerIdx]) ||
      "Giocatrice"
    : "";
  const typeSection = document.createElement("div");
  typeSection.className = "error-type-section";
  const typeLabel = document.createElement("p");
  typeLabel.className = "section-note";
  typeLabel.textContent = "Tipo errore:";
  typeSection.appendChild(typeLabel);
  const typeGrid = document.createElement("div");
  typeGrid.className = "error-choice-grid error-type-grid";
  ERROR_TYPES.forEach(item => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "error-choice-btn error-type-btn";
    btn.textContent = item.label;
    btn.dataset.errorType = item.id;
    btn.addEventListener("click", () => {
      setSelectedErrorType(item.id, typeGrid);
      if (isFromPickMode && typeof pickedIdx === "number") {
        addPlayerError(pickedIdx, pickedName, item.id, scope);
        errorModalPrefillPlayer = null;
        closeErrorModal();
      } else if (isTeamFromPickMode) {
        handleTeamError(item.id, scope);
        errorModalPrefillPlayer = null;
        closeErrorModal();
      }
    });
    typeGrid.appendChild(btn);
  });
  typeSection.appendChild(typeGrid);
  elErrorModalBody.appendChild(typeSection);
  setSelectedErrorType(selectedErrorType || "Generic", typeGrid);
  const note = document.createElement("p");
  note.className = "section-note";
  note.textContent = isFromPickMode || isTeamFromPickMode
    ? "Seleziona il tipo errore/fallo da assegnare."
    : "Seleziona la giocatrice a cui assegnare l'errore/fallo oppure applicalo alla squadra.";
  elErrorModalBody.appendChild(note);
  if (isFromPickMode && pickedName) {
    const target = document.createElement("p");
    target.className = "section-note";
    target.textContent = "Giocatrice: " + formatNameWithNumber(pickedName);
    elErrorModalBody.appendChild(target);
    return;
  }
  if (isTeamFromPickMode) {
    const target = document.createElement("p");
    target.className = "section-note";
    target.textContent = "Destinazione: squadra";
    elErrorModalBody.appendChild(target);
    return;
  }
  const grid = document.createElement("div");
  grid.className = "error-choice-grid";
  if (isPlayerPrefilled) {
    const preBtn = document.createElement("button");
    preBtn.type = "button";
    preBtn.className = "error-choice-btn";
    preBtn.textContent = "Applica a " + formatNameWithNumber(pickedName);
    preBtn.addEventListener("click", () => {
      addPlayerError(errorModalPrefillPlayer.playerIdx, pickedName, selectedErrorType, scope);
      errorModalPrefillPlayer = null;
      closeErrorModal();
    });
    grid.appendChild(preBtn);
  }
  if (!isFromPickMode) {
    const teamBtn = document.createElement("button");
    teamBtn.type = "button";
    teamBtn.className = "error-choice-btn danger";
    teamBtn.textContent = "Assegna alla squadra";
    teamBtn.addEventListener("click", () => {
      handleTeamError(selectedErrorType, scope);
      errorModalPrefillPlayer = null;
      closeErrorModal();
    });
    grid.appendChild(teamBtn);
  }
  const players = getPlayersForScope(scope);
  if (!players || players.length === 0) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Aggiungi giocatrici per assegnare l'errore.";
    elErrorModalBody.appendChild(empty);
    elErrorModalBody.appendChild(grid);
    return;
  }
  const entries =
    scope === "opponent"
      ? getSortedPlayerEntriesForScope(scope)
      : getSortedPlayerEntries();
  entries.forEach(({ name, idx }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "error-choice-btn";
    btn.textContent =
      scope === "opponent"
        ? formatNameWithNumberFor(name, getPlayerNumbersForScope(scope))
        : formatNameWithNumber(name);
    btn.addEventListener("click", () => {
      addPlayerError(idx, name, selectedErrorType, scope);
      errorModalPrefillPlayer = null;
      closeErrorModal();
    });
    grid.appendChild(btn);
  });
  elErrorModalBody.appendChild(grid);
}
function renderPointModal() {
  if (!elPointModalBody) return;
  elPointModalBody.innerHTML = "";
  const note = document.createElement("p");
  note.className = "section-note";
  note.textContent = "Seleziona la giocatrice a cui assegnare il punto oppure applicalo alla squadra.";
  elPointModalBody.appendChild(note);
  const grid = document.createElement("div");
  grid.className = "error-choice-grid";
  const teamBtn = document.createElement("button");
  teamBtn.type = "button";
  teamBtn.className = "error-choice-btn success";
  teamBtn.textContent = "Assegna alla squadra";
  teamBtn.addEventListener("click", () => {
    handleTeamPoint();
    closePointModal();
  });
  grid.appendChild(teamBtn);
  if (!state.players || state.players.length === 0) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Aggiungi giocatrici per assegnare il punto.";
    elPointModalBody.appendChild(empty);
    elPointModalBody.appendChild(grid);
    return;
  }
  getSortedPlayerEntries().forEach(({ name, idx }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "error-choice-btn";
    btn.textContent = formatNameWithNumber(name);
    btn.addEventListener("click", () => {
      addPlayerPoint(idx, name);
      closePointModal();
    });
    grid.appendChild(btn);
  });
  elPointModalBody.appendChild(grid);
}
function openErrorModal(prefill = null) {
  if (!elErrorModal) return;
  stopErrorPickMode({ render: false });
  errorModalPrefillPlayer = prefill;
  renderErrorModal();
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  elErrorModal.classList.remove("hidden");
  setModalOpenState(true);
}
function closeErrorModal() {
  if (!elErrorModal) return;
  elErrorModal.classList.add("hidden");
  errorModalPrefillPlayer = null;
  setModalOpenState(false);
}
function openPointModal() {
  if (!elPointModal) return;
  renderPointModal();
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  elPointModal.classList.remove("hidden");
  setModalOpenState(true);
}
function closePointModal() {
  if (!elPointModal) return;
  elPointModal.classList.add("hidden");
  setModalOpenState(false);
}
function attachModalCloseHandlers() {
  const closeHandler = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closeSkillModal();
  };
  const events = ["click", "pointerup", "pointerdown", "touchend", "touchstart"];
  const closeButtons = [elSkillModalClose, document.querySelector(".skill-modal__close-abs")];
  closeButtons.forEach(btn => {
    if (!btn) return;
    events.forEach(evt => {
      btn.addEventListener(evt, closeHandler, { passive: false, capture: true });
    });
    btn.onclick = closeHandler;
  });
  if (elSkillModalBackdrop) {
    events.forEach(evt =>
      elSkillModalBackdrop.addEventListener(evt, closeHandler, { passive: false })
    );
  }
  const closeAggSkillHandler = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closeAggSkillModal();
  };
  if (elAggSkillModalClose) {
    events.forEach(evt => {
      elAggSkillModalClose.addEventListener(evt, closeAggSkillHandler, {
        passive: false,
        capture: true
      });
    });
    elAggSkillModalClose.onclick = closeAggSkillHandler;
  }
  if (elAggSkillModalBackdrop) {
    events.forEach(evt =>
      elAggSkillModalBackdrop.addEventListener(evt, closeAggSkillHandler, { passive: false })
    );
  }
  const closeErrorHandler = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closeErrorModal();
  };
  const closePointHandler = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closePointModal();
  };
  const errorCloseButtons = [elErrorModalClose];
  errorCloseButtons.forEach(btn => {
    if (!btn) return;
    events.forEach(evt => {
      btn.addEventListener(evt, closeErrorHandler, { passive: false, capture: true });
    });
    btn.onclick = closeErrorHandler;
  });
  if (elErrorModalBackdrop) {
    events.forEach(evt =>
      elErrorModalBackdrop.addEventListener(evt, closeErrorHandler, { passive: false })
    );
  }
  const pointCloseButtons = [elPointModalClose];
  pointCloseButtons.forEach(btn => {
    if (!btn) return;
    events.forEach(evt => {
      btn.addEventListener(evt, closePointHandler, { passive: false, capture: true });
    });
    btn.onclick = closePointHandler;
  });
  if (elPointModalBackdrop) {
    events.forEach(evt =>
      elPointModalBackdrop.addEventListener(evt, closePointHandler, { passive: false })
    );
  }
  if (elSkillModal) {
    elSkillModal.addEventListener(
      "click",
      e => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[data-close-skill]")) {
          closeHandler(e);
        }
      },
      true
    );
  }
  if (elErrorModal) {
    elErrorModal.addEventListener(
      "click",
      e => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[data-close-error]")) {
          closeErrorHandler(e);
        }
      },
      true
    );
  }
  if (elPointModal) {
    elPointModal.addEventListener(
      "click",
      e => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[data-close-point]")) {
          closePointHandler(e);
        }
      },
      true
    );
  }
  const closeBulkHandler = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closeBulkEditModal();
  };
  const bulkCloseButtons = [elBulkEditClose, elBulkEditCancel];
  bulkCloseButtons.forEach(btn => {
    if (!btn) return;
    events.forEach(evt => {
      btn.addEventListener(evt, closeBulkHandler, { passive: false, capture: true });
    });
    btn.onclick = closeBulkHandler;
  });
  if (elBulkEditBackdrop) {
    events.forEach(evt =>
      elBulkEditBackdrop.addEventListener(evt, closeBulkHandler, { passive: false })
    );
  }
  if (elBulkEditModal) {
    elBulkEditModal.addEventListener(
      "click",
      e => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[data-close-bulk]")) {
          closeBulkHandler(e);
        }
      },
      true
    );
  }
}
