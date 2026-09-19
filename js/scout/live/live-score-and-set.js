function renderLiveScore() {
  const summary = computePointsSummary(state.currentSet || 1);
  const totalLabel = summary.totalFor + " - " + summary.totalAgainst;
  if (elLiveScore) {
    elLiveScore.textContent = totalLabel;
    elLiveScore.classList.add("emph");
  }
  if (elLiveScoreModal) {
    elLiveScoreModal.textContent = totalLabel;
  }
  updateSetScoreDisplays();
  updateMatchStatusUI();
}
function handleAutoRotationFromEvent(eventObj, scope = "our") {
  if (!state || !state.autoRotate) {
    state.autoRotatePending = false;
    return;
  }
  const eventScope = scope || getTeamScopeFromEvent(eventObj);
  if (typeof ensurePointRulesDefaults === "function") {
    ensurePointRulesDefaults();
  }
  if (eventScope === "opponent") {
    const opponentServing = !state.isServing;
    const wasReceiving = !opponentServing || !!state.opponentAutoRotatePending;
    const ourWasReceiving = !state.isServing || !!state.autoRotatePending;
    eventObj.autoRotatePrev = wasReceiving;
    if (eventObj.skillId === "serve") {
      const direction = getPointDirection(eventObj);
      const opponentKeepsServe = direction !== "against";
      if (!opponentKeepsServe && ourWasReceiving && typeof rotateCourt === "function") {
        rotateCourt("ccw");
        eventObj.autoRotationDirection = "ccw";
        eventObj.autoRotationScope = "our";
      }
      state.isServing = !opponentKeepsServe;
      state.opponentAutoRotatePending = !opponentKeepsServe;
      state.autoRotatePending = opponentKeepsServe;
      eventObj.autoRotateNext = !opponentKeepsServe;
      if (typeof enforceAutoLiberoForScope === "function") {
        if (!state.isServing) {
          enforceAutoLiberoForScope("our", { skipServerOnServe: true });
        }
        if (state.isServing) {
          enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
        }
      }
      saveState();
      return;
    }
    if (eventObj.skillId === "pass") {
      state.opponentAutoRotatePending = true;
      state.isServing = true;
      eventObj.autoRotateNext = true;
      if (typeof enforceAutoLiberoForScope === "function") {
        enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
      }
      saveState();
      return;
    }
    let pending = wasReceiving;
    let serving = opponentServing;
    const direction = getPointDirection(eventObj);
    if (direction === "for") {
      if (pending && typeof rotateOpponentCourt === "function") {
        rotateOpponentCourt("ccw");
        eventObj.autoRotationDirection = "ccw";
        eventObj.autoRotationScope = "opponent";
      }
      pending = false;
      serving = true;
    } else if (direction === "against") {
      pending = true;
      serving = false;
      if (ourWasReceiving && typeof rotateCourt === "function") {
        rotateCourt("ccw");
        eventObj.autoRotationDirection = "ccw";
        eventObj.autoRotationScope = "our";
      }
      state.autoRotatePending = false;
    } else {
      pending = pending || !serving;
    }
    state.opponentAutoRotatePending = pending;
    state.isServing = !serving;
    eventObj.autoRotateNext = pending;
    if (typeof enforceAutoLiberoForScope === "function" && state.isServing) {
      enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
    }
    saveState();
    return;
  }
  const wasReceiving = !state.isServing || !!state.autoRotatePending;
  const opponentWasReceiving = !!state.isServing || !!state.opponentAutoRotatePending;
  eventObj.autoRotatePrev = wasReceiving;
  if (eventObj.skillId === "serve") {
    const direction = getPointDirection(eventObj);
    const keepServe = direction !== "against";
    if (!keepServe && opponentWasReceiving && typeof rotateOpponentCourt === "function") {
      rotateOpponentCourt("ccw");
      eventObj.autoRotationDirection = "ccw";
      eventObj.autoRotationScope = "opponent";
    }
    state.isServing = keepServe;
    state.autoRotatePending = !keepServe;
    state.opponentAutoRotatePending = keepServe;
    eventObj.autoRotateNext = !keepServe;
    if (typeof enforceAutoLiberoForScope === "function") {
      if (!state.isServing) {
        enforceAutoLiberoForScope("our", { skipServerOnServe: true });
      }
      if (state.isServing) {
        enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
      }
    }
    saveState();
    return;
  }
  if (eventObj.skillId === "pass") {
    state.autoRotatePending = true;
    state.isServing = false;
    eventObj.autoRotateNext = true;
    if (typeof enforceAutoLiberoForScope === "function") {
      enforceAutoLiberoForScope("our", { skipServerOnServe: true });
    }
    saveState();
    return;
  }
  let pending = wasReceiving;
  let serving = !!state.isServing;
  const direction = getPointDirection(eventObj);
  if (direction === "for") {
    if (pending && typeof rotateCourt === "function") {
      rotateCourt("ccw");
      eventObj.autoRotationDirection = "ccw";
      eventObj.autoRotationScope = "our";
    }
    pending = false;
    serving = true;
  } else if (direction === "against") {
    pending = true;
    serving = false;
    if (opponentWasReceiving && typeof rotateOpponentCourt === "function") {
      rotateOpponentCourt("ccw");
      eventObj.autoRotationDirection = "ccw";
      eventObj.autoRotationScope = "opponent";
    }
    state.opponentAutoRotatePending = false;
  } else {
    pending = pending || !serving;
  }
  state.autoRotatePending = pending;
  state.isServing = serving;
  eventObj.autoRotateNext = pending;
  if (typeof enforceAutoLiberoForScope === "function") {
    if (!state.isServing) {
      enforceAutoLiberoForScope("our", { skipServerOnServe: true });
    }
    if (state.isServing) {
      enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
    }
  }
  saveState();
  if (state.autoRolePositioning && typeof applyAutoRolePositioning === "function") {
    applyAutoRolePositioning();
  }
}
function recomputeServeFlagsFromHistory(options = {}) {
  let servingScope = state.isServing ? "our" : "opponent";
  if (!state || !state.autoRotate) {
    state.isServing = servingScope === "our";
    state.autoRotatePending = false;
    return;
  }
  (state.events || []).forEach(ev => {
    if (!ev) return;
    const scope = getTeamScopeFromEvent(ev);
    if (ev.skillId === "serve") {
      servingScope = scope;
      return;
    }
    const dir = getPointDirection(ev);
    if (dir === "for") {
      servingScope = scope;
    } else if (dir === "against") {
      servingScope = getOppositeScope(scope);
    }
  });
  state.isServing = servingScope === "our";
  state.autoRotatePending = !state.isServing;
  state.opponentAutoRotatePending = state.isServing;
  if (state.useOpponentTeam && state.predictiveSkillFlow) {
    const lastFlowEvent = getLastFlowEvent(state.events || []);
    if (lastFlowEvent) {
      const next = computeTwoTeamFlowFromEvent(lastFlowEvent);
      state.flowTeamScope = next.teamScope || servingScope;
    } else {
      state.flowTeamScope = servingScope;
    }
  } else {
    state.flowTeamScope = servingScope;
  }
  if (!options.skipAutoLibero && typeof enforceAutoLiberoForState === "function") {
    enforceAutoLiberoForState({ skipServerOnServe: true });
  }
}
function addManualPoint(
  direction,
  value,
  codeLabel,
  playerIdx = null,
  playerName = "Squadra",
  errorType = null,
  scope = "our"
) {
  if (state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  cancelPartialSkillFlowForScope(scope);
  if (
    (!state.events || state.events.length === 0) &&
    typeof window !== "undefined" &&
    window.trackVolleyEyeEventOnce
  ) {
    window.trackVolleyEyeEventOnce("scout_started", {
      scout_mode: state.predictiveSkillFlow ? "guided" : "manual",
      team_scope: state.useOpponentTeam ? "both" : "our"
    });
  }
  state.freeballPending = false;
  const playerId = getPlayerIdForScope(scope, playerIdx, playerName);
  const event = buildBaseEventPayload({
    playerIdx,
    playerId,
    playerName: playerName,
    skillId: "manual",
    code: codeLabel || direction,
    pointDirection: direction,
    value: value,
    errorType: errorType || null,
    teamScope: scope
  });
  clearReceiveContext(scope);
  state.events.push(event);
  handleAutoRotationFromEvent(event, scope);
  if (state.useOpponentTeam) {
    const nextFlow = computeTwoTeamFlowFromEvent(event);
    state.flowTeamScope = nextFlow.teamScope;
  }
  saveState({ persistLocal: true });
  renderEventsLog();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
  if (!state.predictiveSkillFlow) {
    renderLiveScore();
    renderScoreAndRotations(computePointsSummary());
    renderAggregatedTable();
    renderVideoAnalysis();
  }
}
function handleManualScore(direction, delta) {
  const setNum = state.currentSet || 1;
  ensureScoreOverrides();
  const baseSummary = computePointsSummary(setNum, { includeOverrides: false });
  const currentOverride = getScoreOverrideForSet(setNum);
  const key = direction === "against" ? "against" : "for";
  const next = Object.assign({}, currentOverride);
  next[key] = (next[key] || 0) + delta;
  if (key === "for") {
    next.for = Math.max(next.for, -(baseSummary.totalFor || 0));
  } else {
    next.against = Math.max(next.against, -(baseSummary.totalAgainst || 0));
  }
  state.scoreOverrides[setNum] = next;
  saveState({ persistLocal: true });
  renderLiveScore();
  renderScoreAndRotations(computePointsSummary());
  renderAggregatedTable();
  renderVideoAnalysis();
}
function handleTeamPoint(scope = "our") {
  const teamLabel = getTeamNameForScope(scope);
  addManualPoint("for", 1, "for", null, teamLabel, null, scope);
}
function handleOpponentErrorPoint() {
  state.skillFlowOverride = null;
  const scope = state.useOpponentTeam ? "opponent" : "our";
  const label = state.useOpponentTeam ? getTeamNameForScope("opponent") : "Avversaria";
  addManualPoint("for", 1, "opp-error", null, label, null, scope);
  if (!state.useOpponentTeam && state.predictiveSkillFlow) {
    forceNextSkill("serve", "our");
  } else {
    updateNextSkillIndicator(getPredictedSkillIdForScope("opponent"));
  }
}
function addPlayerError(playerIdx, playerName, errorType = null, scope = "our") {
  if (state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  addManualPoint("against", 1, "error", playerIdx, playerName || "Giocatrice", errorType, scope);
}
function addPlayerPoint(playerIdx, playerName, scope = "our") {
  if (state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  addManualPoint("for", 1, "for", playerIdx, playerName || "Giocatrice", null, scope);
}
function handleTeamError(errorType = null, scope = "our") {
  const teamLabel = getTeamNameForScope(scope);
  addManualPoint("against", 1, "team-error", null, teamLabel, errorType, scope);
}
function handleOpponentPoint() {
  state.skillFlowOverride = null;
  const scope = state.useOpponentTeam ? "opponent" : "our";
  const label = state.useOpponentTeam ? getTeamNameForScope("opponent") : "Avversaria";
  addManualPoint("against", 1, "opp-point", null, label, null, scope);
  if (!state.useOpponentTeam && state.predictiveSkillFlow) {
    forceNextSkill("pass", "our");
  } else {
    updateNextSkillIndicator(getPredictedSkillIdForScope("opponent"));
  }
}
function handleOpponentFreeballSingle() {
  if (state.useOpponentTeam) return;
  cancelPartialSkillFlowForScope("our");
  state.skillFlowOverride = null;
  if (state.predictiveSkillFlow) {
    forceNextSkill("defense", "our");
  } else {
    renderPlayers();
    updateNextSkillIndicator(getPredictedSkillId());
  }
}
function snapshotSkillClock() {
  ensureSkillClock();
  return {
    paused: !!state.skillClock.paused,
    pausedAtMs: state.skillClock.pausedAtMs || null,
    pausedAccumMs: state.skillClock.pausedAccumMs || 0,
    lastEffectiveMs: state.skillClock.lastEffectiveMs || null
  };
}
function restoreSkillClock(snapshot) {
  ensureSkillClock();
  if (!snapshot) return;
  state.skillClock.paused = !!snapshot.paused;
  state.skillClock.pausedAtMs = snapshot.pausedAtMs || null;
  state.skillClock.pausedAccumMs = snapshot.pausedAccumMs || 0;
  state.skillClock.lastEffectiveMs = snapshot.lastEffectiveMs || null;
}
function snapshotVideoClock() {
  ensureVideoClock();
  return {
    paused: !!state.videoClock.paused,
    pausedAtMs: state.videoClock.pausedAtMs || null,
    pausedAccumMs: state.videoClock.pausedAccumMs || 0,
    startMs: state.videoClock.startMs || Date.now(),
    currentSeconds: state.videoClock.currentSeconds || 0
  };
}
function restoreVideoClock(snapshot) {
  ensureVideoClock();
  if (!snapshot) return;
  state.videoClock.paused = !!snapshot.paused;
  state.videoClock.pausedAtMs = snapshot.pausedAtMs || null;
  state.videoClock.pausedAccumMs = snapshot.pausedAccumMs || 0;
  state.videoClock.startMs = snapshot.startMs || Date.now();
  state.videoClock.currentSeconds = snapshot.currentSeconds || 0;
}
function isTeamReadyForScout() {
  const teams = Object.keys(state.savedTeams || {});
  const selected = (state.selectedTeam || "").trim();
  return (
    teams.length > 0 &&
    !!selected &&
    teams.includes(selected) &&
    Array.isArray(state.players) &&
    state.players.length > 0
  );
}
function updateMatchStatusUI() {
  const finished = !!state.matchFinished;
  const teamReady = isTeamReadyForScout();
  const label = finished ? "Riprendi partita" : "Pausa/Termina";
  const mainBtns = [elBtnEndMatch, elBtnEndMatchModal].filter(Boolean);
  mainBtns.forEach(btn => {
    btn.textContent = label;
    btn.classList.toggle("danger", !finished);
    btn.classList.toggle("resume-btn", finished);
    btn.classList.toggle("primary", finished);
  });
  if (!nextSetModalOpen) {
    setScoutControlsDisabled(finished || !teamReady);
  }
  document.body.dataset.teamReady = teamReady ? "true" : "false";
  document.body.dataset.matchFinished = finished ? "true" : "false";
}
function setScoutControlsDisabled(disabled) {
  const allowIds = new Set([
    "btn-end-match",
    "btn-end-match-modal",
    "btn-swap-libero",
    "btn-swap-libero-opp",
    "btn-libero-to-bench"
  ]);
  const scope = document.querySelector('[data-tab="scout"]');
  if (!scope) return;
  scope.querySelectorAll("button").forEach(btn => {
    if (!btn || allowIds.has(btn.id)) return;
    if (btn.closest("#next-set-inline")) return;
    btn.disabled = !!disabled;
  });
}
function recordSetAction(actionType, payload) {
  ensureSetStartSnapshot(state.currentSet || 1);
  const code = payload && payload.code ? payload.code : actionType;
  const event = buildBaseEventPayload(
    Object.assign({}, payload, {
      skillId: "manual",
      code,
      actionType
    })
  );
  clearReceiveContext();
  state.events.push(event);
}
function applySetChange(nextSet, options = {}) {
  const {
    prevSet = state.currentSet || 1,
    prevFinished = !!state.matchFinished,
    nextFinished = false,
    actionType = "set-change",
    prevClock = snapshotSkillClock(),
    prevVideoClock = snapshotVideoClock(),
    prevSetResults = null,
    nextSetResults = null,
    prevSetStarts = null,
    nextSetStarts = null
  } = options;
  if (actionType === "match-end") {
    pauseSkillClock();
    pauseVideoClock();
    state.matchFinished = true;
    setCurrentSet(nextSet);
    saveState({ persistLocal: true });
    renderEventsLog();
    renderLiveScore();
    updateMatchStatusUI();
    return;
  }
  if (nextFinished) {
    pauseSkillClock();
    pauseVideoClock();
  }
  if (!nextFinished && prevFinished) {
    resumeSkillClock();
    resumeVideoClock();
  }
  state.matchFinished = nextFinished;
  setCurrentSet(nextSet);
  if (nextSetResults) {
    state.setResults = nextSetResults;
  }
  if (nextSetStarts) {
    state.setStarts = nextSetStarts;
  }
  recordSetAction(actionType, {
    prevSet,
    nextSet,
    prevMatchFinished: prevFinished,
    nextMatchFinished: nextFinished,
    prevClock,
    nextClock: snapshotSkillClock(),
    prevVideoClock,
    nextVideoClock: snapshotVideoClock(),
    prevSetResults,
    nextSetResults,
    prevSetStarts,
    nextSetStarts
  });
  saveState({ persistLocal: true });
  renderEventsLog();
  renderLiveScore();
  updateMatchStatusUI();
}
function goToNextSet() {
  const current = state.currentSet || 1;
  const next = Math.min(5, current + 1);
  if (current === next && !state.matchFinished) return;
  applySetChange(next, {
    prevSet: current,
    nextSet: next,
    prevFinished: !!state.matchFinished,
    nextFinished: false,
    actionType: "set-change"
  });
}
function endMatch() {
  if (state.matchFinished) {
    resumeSkillClock();
    resumeVideoClock();
    state.matchFinished = false;
    if (state.matchEndSetSnapshot) {
      state.setResults = state.matchEndSetSnapshot;
      state.matchEndSetSnapshot = null;
    }
    state.matchEndSetRecorded = null;
    saveState({ persistLocal: true });
    updateSetScoreDisplays();
    updateMatchStatusUI();
    return;
  }
  const current = state.currentSet || 1;
  const winner = computeSetWinner(current);
  if (winner) {
    state.matchEndSetSnapshot = cloneSetMap(state.setResults);
    state.matchEndSetRecorded = { set: current, winner };
    state.setResults = cloneSetMap(state.setResults);
    state.setResults[current] = winner;
  } else {
    state.matchEndSetSnapshot = cloneSetMap(state.setResults);
    state.matchEndSetRecorded = { set: current, winner: null };
  }
  applySetChange(current, {
    prevSet: current,
    nextSet: current,
    prevFinished: !!state.matchFinished,
    nextFinished: true,
    actionType: "match-end"
  });
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_completed", { set_count: current });
  }
}
function renderScoreAndRotations(summary, teamScope = "our", options = {}) {
  const scoreSummary = summary || computePointsSummary(null, { teamScope, events: options.events });
  const effectiveSummary = scoreSummary;
  const totalLabel = scoreSummary.totalFor + " - " + scoreSummary.totalAgainst;
  if (elAggScore) {
    elAggScore.textContent = totalLabel;
  }
  updateSetScoreDisplays();
  if (elAggSetCards) {
    elAggSetCards.innerHTML = "";
    const setsData = computeSetScores(teamScope, { events: options.events });
    if (!setsData.sets || setsData.sets.length === 0) {
      const span = document.createElement("div");
      span.className = "score-set-chip";
      span.textContent = "Nessun set";
      elAggSetCards.appendChild(span);
    } else {
      setsData.sets.forEach(s => {
        const chip = document.createElement("div");
        chip.className = "score-set-chip";
        chip.textContent = "S" + s.set + ": " + s.for + "-" + s.against;
        elAggSetCards.appendChild(chip);
      });
    }
  }
  const rotationSummary = scoreSummary;
  const rotationWrapper = document.querySelector(".rotation-wrapper");
  if (aggTableView.mode !== "summary") {
    if (rotationWrapper) rotationWrapper.classList.add("hidden");
    if (elRotationTableBody) {
      elRotationTableBody.innerHTML = "";
    }
    return;
  }
  if (rotationWrapper) rotationWrapper.classList.remove("hidden");
  const hasRotationEvents =
    rotationSummary.hasRotationEvents !== undefined
      ? rotationSummary.hasRotationEvents
      : rotationSummary.rotations.some(r => r.for || r.against);
  if (!elRotationTableBody) return;
  elRotationTableBody.innerHTML = "";
  const rotationLabel = rot => "P" + String(rot || 1);
  if (!hasRotationEvents) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "Registra eventi per vedere le rotazioni.";
    tr.appendChild(td);
    elRotationTableBody.appendChild(tr);
    return;
  }
  const allowHighlights = aggTableView.mode === "summary";
  const highlightEnabled =
    allowHighlights &&
    rotationSummary.bestRotation !== null &&
    rotationSummary.worstRotation !== null;
  rotationSummary.rotations.forEach(rot => {
    const tr = document.createElement("tr");
    tr.className = "rotation-row";
    if (highlightEnabled && rot.rotation === rotationSummary.bestRotation) {
      tr.classList.add("best");
    }
    if (
      highlightEnabled &&
      rot.rotation === rotationSummary.worstRotation &&
      rotationSummary.worstRotation !== rotationSummary.bestRotation
    ) {
      tr.classList.add("worst");
    }
    const cells = [
      rotationLabel(rot.rotation),
      rot.for,
      rot.against,
      formatDelta(rot.delta)
    ];
    cells.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    elRotationTableBody.appendChild(tr);
  });
}
const DEFAULT_SET_TYPE_OPTIONS = [
  { value: "mezza", label: "Mezza" },
  { value: "super", label: "Super" },
  { value: "quick", label: "Quick" },
  { value: "veloce", label: "Veloce" },
  { value: "fast", label: "Fast" },
  { value: "alta", label: "Alta" }
];
const SET_TYPE_SHORTCUTS = {
  mezza: "M",
  super: "S",
  quick: "Q",
  veloce: "V",
  fast: "F",
  alta: "H",
  damp: "D"
};
const DEFAULT_BASE_OPTIONS = [
  { value: "K1", label: "K1" },
  { value: "K2", label: "K2" },
  { value: "KC", label: "KC" },
  { value: "KB", label: "KB" },
  { value: "K7", label: "K7" },
  { value: "KF", label: "KF" }
];
const DEFAULT_PHASE_OPTIONS = [
  { value: "so", label: "Side-out (SO)" },
  { value: "bp", label: "Break point (BP)" }
];
const PREVIOUS_SKILL_OPTIONS = [
  { value: "any", label: "Tutte" },
  { value: "freeball-positive", label: "Freeball o ricezione positiva" },
  { value: "defense-negative", label: "Difesa + ricezione negativa" },
  { value: "freeball-only", label: "Solo freeball" },
  { value: "dig-only", label: "Solo difesa" }
];
