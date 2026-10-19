import { session } from "../state/live-live-score-and-set.js";

import { computePointsSummary, getPointDirection, ensureScoreOverrides, getScoreOverrideForSet } from "../analysis/scores.js";
import { session as matchState } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { updateSetScoreDisplays, cloneSetMap } from "./next-set-lineups.js";
import { computeSetWinner } from "../teams/set-start-model.js";
import { publishRuntimeView, publishScoutControlState } from "../core/runtime-view.js";
import { publishReactAggregatedScore } from "../analysis/score-view.js";
import { getTeamScopeFromEvent, getOppositeScope, getTeamNameForScope } from "../teams/selectors.js";
import { getPlayerIdForScope } from "../teams/player-identity.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { ensurePointRulesDefaults } from "../settings/rules.js";
import { rotateCourt, rotateOpponentCourt, applyAutoRolePositioning, setCurrentSet } from "../teams/court/court-ui-bootstrap.js";
import { enforceAutoLiberoForScope, enforceAutoLiberoForState } from "../teams/court/court-engine.js";
import { saveState } from "../storage/save-state.js";
import { getLastFlowEvent, computeTwoTeamFlowFromEvent, getPredictedSkillId } from "./flow-model.js";
import { updateNextSkillIndicator } from "./game-flow.js";
import { captureScoutActionSnapshot, attachScoutActionSnapshot } from "../core/app-lifecycle.js";
import { cancelPartialSkillFlowForScope } from "./skill-selection.js";
import { buildBaseEventPayload, ensureSkillClock, ensureVideoClock, pauseSkillClock, pauseVideoClock, resumeSkillClock, resumeVideoClock } from "./live-entry.js";
import { clearReceiveContext } from "./event-recording.js";
import { renderEventsLog } from "../video/video-events.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderPlayers } from "./team-rendering.js";
import { renderAggregatedTable } from "../analysis/aggregated-table.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { forceNextSkill } from "./trajectories.js";
import { ensureSetStartSnapshot } from "../analysis/player-model.js";



const liveScoreAndSetState = session;

export function renderLiveScore() {
  const summary = computePointsSummary(matchState.state.currentSet || 1);
  const totalLabel = summary.totalFor + " - " + summary.totalAgainst;
  
  updateSetScoreDisplays();
  updateMatchStatusUI();
  publishRuntimeView();
}

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
  let servingScope = matchState.state.isServing ? "our" : "opponent";
  if (!matchState.state || !matchState.state.autoRotate) {
    matchState.state.isServing = servingScope === "our";
    matchState.state.autoRotatePending = false;
    return;
  }
  (matchState.state.events || []).forEach(ev => {
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
  matchState.state.isServing = servingScope === "our";
  matchState.state.autoRotatePending = !matchState.state.isServing;
  matchState.state.opponentAutoRotatePending = matchState.state.isServing;
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
  if (!options.skipAutoLibero) {
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

export function snapshotSkillClock() {
  ensureSkillClock();
  return {
    paused: !!matchState.state.skillClock.paused,
    pausedAtMs: matchState.state.skillClock.pausedAtMs || null,
    pausedAccumMs: matchState.state.skillClock.pausedAccumMs || 0,
    lastEffectiveMs: matchState.state.skillClock.lastEffectiveMs || null
  };
}

export function restoreSkillClock(snapshot) {
  ensureSkillClock();
  if (!snapshot) return;
  matchState.state.skillClock.paused = !!snapshot.paused;
  matchState.state.skillClock.pausedAtMs = snapshot.pausedAtMs || null;
  matchState.state.skillClock.pausedAccumMs = snapshot.pausedAccumMs || 0;
  matchState.state.skillClock.lastEffectiveMs = snapshot.lastEffectiveMs || null;
}

export function snapshotVideoClock() {
  ensureVideoClock();
  return {
    paused: !!matchState.state.videoClock.paused,
    pausedAtMs: matchState.state.videoClock.pausedAtMs || null,
    pausedAccumMs: matchState.state.videoClock.pausedAccumMs || 0,
    startMs: matchState.state.videoClock.startMs || Date.now(),
    currentSeconds: matchState.state.videoClock.currentSeconds || 0
  };
}

export function restoreVideoClock(snapshot) {
  ensureVideoClock();
  if (!snapshot) return;
  matchState.state.videoClock.paused = !!snapshot.paused;
  matchState.state.videoClock.pausedAtMs = snapshot.pausedAtMs || null;
  matchState.state.videoClock.pausedAccumMs = snapshot.pausedAccumMs || 0;
  matchState.state.videoClock.startMs = snapshot.startMs || Date.now();
  matchState.state.videoClock.currentSeconds = snapshot.currentSeconds || 0;
}

export function isTeamReadyForScout() {
  const teams = Object.keys(matchState.state.savedTeams || {});
  const selected = (matchState.state.selectedTeam || "").trim();
  return (
    teams.length > 0 &&
    !!selected &&
    teams.includes(selected) &&
    Array.isArray(matchState.state.players) &&
    matchState.state.players.length > 0
  );
}

export function updateMatchStatusUI() {
  const finished = !!matchState.state.matchFinished;
  const teamReady = isTeamReadyForScout();
  const label = finished ? "Riprendi partita" : "Pausa/Termina";
  const mainBtns = [rosterLineupState.elBtnEndMatch, rosterLineupState.elBtnEndMatchModal].filter(Boolean);

  if (!scoutUiState.nextSetModalOpen) {
    setScoutControlsDisabled(finished || !teamReady);
  }
  document.body.dataset.teamReady = teamReady ? "true" : "false";
  document.body.dataset.matchFinished = finished ? "true" : "false";
}

export function setScoutControlsDisabled(disabled) {
  publishScoutControlState(disabled);
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

return;
});
}

export function recordSetAction(actionType, payload) {
  ensureSetStartSnapshot(matchState.state.currentSet || 1);
  const code = payload && payload.code ? payload.code : actionType;
  const event = buildBaseEventPayload(
    Object.assign({}, payload, {
      skillId: "manual",
      code,
      actionType
    })
  );
  clearReceiveContext();
  matchState.state.events.push(event);
}

export function applySetChange(nextSet, options = {}) {
  const actionSnapshot = captureScoutActionSnapshot();
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
    updateSetScoreDisplays();
    updateMatchStatusUI();
    return;
  }
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

export function renderScoreAndRotations(summary, teamScope = "our", options = {}) {

return publishReactAggregatedScore(summary,teamScope,options);
}
