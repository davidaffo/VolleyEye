import { session } from "../state/live-live-score-and-set.js";
import { computePointsSummary, getPointDirection, ensureScoreOverrides, getScoreOverrideForSet } from "../analysis/scores.js";
import { session as matchState } from "../../../js/globals.js";
import { publishRuntimeView, renderLiveScore, updateMatchStatusUI } from "../core/runtime-view.js";
import { cloneSetMap } from "./next-set-model.js";
import { computeSetWinner } from "../teams/set-start-model.js";
import { getTeamScopeFromEvent, getOppositeScope, getTeamNameForScope } from "../teams/selectors.js";
import { getPlayerIdForScope } from "../teams/player-identity.js";
import { ensurePointRulesDefaults } from "../settings/rules.js";
import { rotateCourt, rotateOpponentCourt, setCurrentSet } from "../teams/court/court-ui-bootstrap.js";
import { applyAutoRolePositioning } from "../teams/court/court-engine.js";
import { enforceAutoLiberoForScope, enforceAutoLiberoForState } from "../teams/court-state-model.js";
import { saveState } from "../storage/save-state.js";
import { getLastFlowEvent, computeTwoTeamFlowFromEvent, getPredictedSkillId, clearReceiveContext } from "./flow-model.js";
import { updateNextSkillIndicator } from "../scout/flow-view.js";
import { captureScoutActionSnapshot, attachScoutActionSnapshot } from "../events/history-model.js";
import { cancelPartialSkillFlowForScope } from "../scout/selection-state.js";
import { buildBaseEventPayload, recordSetAction } from "../events/recording-model.js";
import { pauseSkillClock, pauseVideoClock, resumeSkillClock, resumeVideoClock, snapshotSkillClock, snapshotVideoClock } from "./clocks.js";
import { renderEventsLog } from "../events/log-view.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderPlayers } from "./team-rendering.js";
import { renderAggregatedTable } from "../analysis/aggregated-table.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { forceNextSkill } from "./trajectories.js";
import { renderScoreAndRotations } from "../analysis/score-view.js";

const liveScoreAndSetState = session;


export function handleAutoRotationFromEvent(eventObj, scope = "our") {
  if (!matchState.state || !matchState.state.autoRotate) {
    matchState.state.autoRotatePending = false;
    return;
  }
  const eventScope = scope || getTeamScopeFromEvent(eventObj);
  ensurePointRulesDefaults();
  if (eventScope === "opponent") {
    const opponentServing = !matchState.state.isServing;
    const wasReceiving = !opponentServing || !!matchState.state.opponentAutoRotatePending;
    const ourWasReceiving = !matchState.state.isServing || !!matchState.state.autoRotatePending;
    eventObj.autoRotatePrev = wasReceiving;
    if (eventObj.skillId === "serve") {
      const direction = getPointDirection(eventObj);
      const opponentKeepsServe = direction !== "against";
      if (!opponentKeepsServe && ourWasReceiving) {
        rotateCourt("ccw");
        eventObj.autoRotationDirection = "ccw";
        eventObj.autoRotationScope = "our";
      }
      matchState.state.isServing = !opponentKeepsServe;
      matchState.state.opponentAutoRotatePending = !opponentKeepsServe;
      matchState.state.autoRotatePending = opponentKeepsServe;
      eventObj.autoRotateNext = !opponentKeepsServe;
      if (!matchState.state.isServing) {
        enforceAutoLiberoForScope("our", { skipServerOnServe: true });
      }
      if (matchState.state.isServing) {
        enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
      }
      saveState();
      return;
    }
    if (eventObj.skillId === "pass") {
      matchState.state.opponentAutoRotatePending = true;
      matchState.state.isServing = true;
      eventObj.autoRotateNext = true;
      enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
      saveState();
      return;
    }
    let pending = wasReceiving;
    let serving = opponentServing;
    const direction = getPointDirection(eventObj);
    if (direction === "for") {
      if (pending) {
        rotateOpponentCourt("ccw");
        eventObj.autoRotationDirection = "ccw";
        eventObj.autoRotationScope = "opponent";
      }
      pending = false;
      serving = true;
    } else if (direction === "against") {
      pending = true;
      serving = false;
      if (ourWasReceiving) {
        rotateCourt("ccw");
        eventObj.autoRotationDirection = "ccw";
        eventObj.autoRotationScope = "our";
      }
      matchState.state.autoRotatePending = false;
    } else {
      pending = pending || !serving;
    }
    matchState.state.opponentAutoRotatePending = pending;
    matchState.state.isServing = !serving;
    eventObj.autoRotateNext = pending;
    if (matchState.state.isServing) {
      enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
    }
    saveState();
    return;
  }
  const wasReceiving = !matchState.state.isServing || !!matchState.state.autoRotatePending;
  const opponentWasReceiving = !!matchState.state.isServing || !!matchState.state.opponentAutoRotatePending;
  eventObj.autoRotatePrev = wasReceiving;
  if (eventObj.skillId === "serve") {
    const direction = getPointDirection(eventObj);
    const keepServe = direction !== "against";
    if (!keepServe && opponentWasReceiving) {
      rotateOpponentCourt("ccw");
      eventObj.autoRotationDirection = "ccw";
      eventObj.autoRotationScope = "opponent";
    }
    matchState.state.isServing = keepServe;
    matchState.state.autoRotatePending = !keepServe;
    matchState.state.opponentAutoRotatePending = keepServe;
    eventObj.autoRotateNext = !keepServe;
    if (!matchState.state.isServing) {
      enforceAutoLiberoForScope("our", { skipServerOnServe: true });
    }
    if (matchState.state.isServing) {
      enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
    }
    saveState();
    return;
  }
  if (eventObj.skillId === "pass") {
    matchState.state.autoRotatePending = true;
    matchState.state.isServing = false;
    eventObj.autoRotateNext = true;
    enforceAutoLiberoForScope("our", { skipServerOnServe: true });
    saveState();
    return;
  }
  let pending = wasReceiving;
  let serving = !!matchState.state.isServing;
  const direction = getPointDirection(eventObj);
  if (direction === "for") {
    if (pending) {
      rotateCourt("ccw");
      eventObj.autoRotationDirection = "ccw";
      eventObj.autoRotationScope = "our";
    }
    pending = false;
    serving = true;
  } else if (direction === "against") {
    pending = true;
    serving = false;
    if (opponentWasReceiving) {
      rotateOpponentCourt("ccw");
      eventObj.autoRotationDirection = "ccw";
      eventObj.autoRotationScope = "opponent";
    }
    matchState.state.opponentAutoRotatePending = false;
  } else {
    pending = pending || !serving;
  }
  matchState.state.autoRotatePending = pending;
  matchState.state.isServing = serving;
  eventObj.autoRotateNext = pending;
  if (!matchState.state.isServing) {
    enforceAutoLiberoForScope("our", { skipServerOnServe: true });
  }
  if (matchState.state.isServing) {
    enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
  }
  saveState();
  if (matchState.state.autoRolePositioning) {
    applyAutoRolePositioning();
  }
}

export function recomputeServeFlagsFromHistory(options = {}) {
  const currentSet = Number(matchState.state.currentSet || 1);
  const start = matchState.state.setStarts && matchState.state.setStarts[currentSet];
  let servingScope = (start ? start.isServing : matchState.state.isServing) ? "our" : "opponent";
  (matchState.state.events || []).forEach(ev => {
    if (!ev || Number(ev.set || 1) !== currentSet) return;
    const scope = getTeamScopeFromEvent(ev);
    const dir = getPointDirection(ev);
    if (dir === "for") {
      servingScope = scope;
    } else if (dir === "against") {
      servingScope = getOppositeScope(scope);
    } else if (ev.skillId === "serve") {
      servingScope = scope;
    }
  });
  matchState.state.isServing = servingScope === "our";
  matchState.state.autoRotatePending = !!matchState.state.autoRotate && !matchState.state.isServing;
  matchState.state.opponentAutoRotatePending = !!matchState.state.autoRotate && matchState.state.isServing;
  if (matchState.state.useOpponentTeam && matchState.state.predictiveSkillFlow) {
    const lastFlowEvent = getLastFlowEvent(matchState.state.events || []);
    if (lastFlowEvent) {
      const next = computeTwoTeamFlowFromEvent(lastFlowEvent);
      matchState.state.flowTeamScope = next.teamScope || servingScope;
    } else {
      matchState.state.flowTeamScope = servingScope;
    }
  } else {
    matchState.state.flowTeamScope = servingScope;
  }
  if (!options.skipAutoLibero && typeof enforceAutoLiberoForState === "function") {
    enforceAutoLiberoForState({ skipServerOnServe: true });
  }
}

export function addManualPoint(
  direction,
  value,
  codeLabel,
  playerIdx = null,
  playerName = "Squadra",
  errorType = null,
  scope = "our"
) {
  if (matchState.state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  const actionSnapshot = captureScoutActionSnapshot();
  // Punto/errore manuale è un confine di azione: qualsiasi popup o selezione
  // parziale di entrambe le squadre non deve influenzare il rally successivo.
  cancelPartialSkillFlowForScope("our");
  if (matchState.state.useOpponentTeam) cancelPartialSkillFlowForScope("opponent");
  matchState.state.forceSkillActive = false;
  matchState.state.forceSkillScope = null;
  if (
    (!matchState.state.events || matchState.state.events.length === 0) &&
    typeof window !== "undefined" &&
    window.trackVolleyEyeEventOnce
  ) {
    window.trackVolleyEyeEventOnce("scout_started", {
      scout_mode: matchState.state.predictiveSkillFlow ? "guided" : "manual",
      team_scope: matchState.state.useOpponentTeam ? "both" : "our"
    });
  }
  matchState.state.freeballPending = false;
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
  attachScoutActionSnapshot(event, actionSnapshot);
  clearReceiveContext(scope);
  matchState.state.events.push(event);
  handleAutoRotationFromEvent(event, scope);
  const scoringScope = direction === "for" ? scope : getOppositeScope(scope);
  matchState.state.pendingServe = null;
  matchState.state.freeballPending = false;
  matchState.state.freeballPendingScope = scoringScope;
  matchState.state.isServing = scoringScope === "our";
  if (matchState.state.useOpponentTeam) {
    matchState.state.flowTeamScope = scoringScope;
    matchState.state.skillFlowOverride = scoringScope === "our" ? "serve" : null;
    matchState.state.opponentSkillFlowOverride = scoringScope === "opponent" ? "serve" : null;
  } else {
    matchState.state.flowTeamScope = "our";
    matchState.state.skillFlowOverride = scoringScope === "our" ? "serve" : "pass";
    matchState.state.opponentSkillFlowOverride = null;
  }
  saveState({ persistLocal: true });
  renderEventsLog();
  recalcAllStatsAndUpdateUI();
  renderPlayers();
  if (!matchState.state.predictiveSkillFlow) {
    renderLiveScore();
    renderScoreAndRotations(computePointsSummary());
    renderAggregatedTable();
    renderVideoAnalysis();
  }
}

export function handleManualScore(direction, delta) {
  const setNum = matchState.state.currentSet || 1;
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
  matchState.state.scoreOverrides[setNum] = next;
  saveState({ persistLocal: true });
  renderLiveScore();
  renderScoreAndRotations(computePointsSummary());
  renderAggregatedTable();
  renderVideoAnalysis();
}

export function handleTeamPoint(scope = "our") {
  const teamLabel = getTeamNameForScope(scope);
  addManualPoint("for", 1, "for", null, teamLabel, null, scope);
}

export function handleOpponentErrorPoint() {
  matchState.state.skillFlowOverride = null;
  const scope = "our";
  const label = matchState.state.useOpponentTeam ? getTeamNameForScope("opponent") : "Avversaria";
  addManualPoint("for", 1, "opp-error", null, label, null, scope);
}

export function addPlayerError(playerIdx, playerName, errorType = null, scope = "our") {
  if (matchState.state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  addManualPoint("against", 1, "error", playerIdx, playerName || "Giocatrice", errorType, scope);
}

export function addPlayerPoint(playerIdx, playerName, scope = "our") {
  if (matchState.state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  addManualPoint("for", 1, "for", playerIdx, playerName || "Giocatrice", null, scope);
}

export function handleTeamError(errorType = null, scope = "our") {
  const teamLabel = getTeamNameForScope(scope);
  addManualPoint("against", 1, "team-error", null, teamLabel, errorType, scope);
}

export function handleOpponentPoint() {
  matchState.state.skillFlowOverride = null;
  const scope = matchState.state.useOpponentTeam ? "opponent" : "our";
  const label = matchState.state.useOpponentTeam ? getTeamNameForScope("opponent") : "Avversaria";
  addManualPoint(matchState.state.useOpponentTeam ? "for" : "against", 1, "opp-point", null, label, null, scope);
}

export function handleOpponentFreeballSingle() {
  if (matchState.state.useOpponentTeam) return;
  cancelPartialSkillFlowForScope("our");
  matchState.state.skillFlowOverride = null;
  if (matchState.state.predictiveSkillFlow) {
    forceNextSkill("defense", "our");
  } else {
    renderPlayers();
    updateNextSkillIndicator(getPredictedSkillId());
  }
}









export function applySetChange(nextSet, options = {}) {
  const actionSnapshot = options.actionSnapshot || captureScoutActionSnapshot({ includeSetState: true });
  const {
    prevSet = matchState.state.currentSet || 1,
    prevFinished = !!matchState.state.matchFinished,
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
    matchState.state.matchFinished = true;
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
  matchState.state.matchFinished = nextFinished;
  setCurrentSet(nextSet);
  if (nextSetResults) {
    matchState.state.setResults = nextSetResults;
  }
  if (nextSetStarts) {
    matchState.state.setStarts = nextSetStarts;
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
  attachScoutActionSnapshot(matchState.state.events[matchState.state.events.length - 1], actionSnapshot);
  saveState({ persistLocal: true });
  renderEventsLog();
  renderLiveScore();
  updateMatchStatusUI();
}

export function endMatch() {
  if (matchState.state.matchFinished) {
    resumeSkillClock();
    resumeVideoClock();
    matchState.state.matchFinished = false;
    if (matchState.state.matchEndSetSnapshot) {
      matchState.state.setResults = matchState.state.matchEndSetSnapshot;
      matchState.state.matchEndSetSnapshot = null;
    }
    matchState.state.matchEndSetRecorded = null;
    saveState({ persistLocal: true });
    publishRuntimeView();
    updateMatchStatusUI();
    return;
  }
  const actionSnapshot = captureScoutActionSnapshot({ includeSetState: true });
  const current = matchState.state.currentSet || 1;
  const winner = computeSetWinner(current);
  if (winner) {
    matchState.state.matchEndSetSnapshot = cloneSetMap(matchState.state.setResults);
    matchState.state.matchEndSetRecorded = { set: current, winner };
    matchState.state.setResults = cloneSetMap(matchState.state.setResults);
    matchState.state.setResults[current] = winner;
  } else {
    matchState.state.matchEndSetSnapshot = cloneSetMap(matchState.state.setResults);
    matchState.state.matchEndSetRecorded = { set: current, winner: null };
  }
  applySetChange(current, {
    actionSnapshot,
    prevSet: current,
    nextSet: current,
    prevFinished: !!matchState.state.matchFinished,
    nextFinished: true,
    actionType: "match-end"
  });
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_completed", { set_count: current });
  }
}
