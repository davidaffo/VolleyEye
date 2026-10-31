import { updateOpponentRotationDisplay } from "../teams/court-view.js";
import { renderOpponentPlayers, syncCourtSideLayout } from "../live/team-rendering.js";
import { resetAutoRoleCache } from "../teams/court-state-model.js";
import { getPointDirection } from "../analysis/scores.js";
import { rememberReceiveContext } from "../live/flow-model.js";
import { cancelPartialSkillFlowForScope } from "../scout/selection-state.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { captureScoutActionSnapshot } from "./history-model.js";
import { session as matchState } from "../../../js/globals.js";
import { resetSetTypeState, getLastFlowEvent, computeTwoTeamFlowFromEvent } from "../live/flow-model.js";
import { getTeamScopeFromEvent, getPlayerNumbersForScope } from "../teams/selectors.js";
import { commitCourtChangeForScope, commitCourtChange } from "../teams/court/court-engine.js";
import { isLiberoForScope } from "../teams/libero-model.js";
import { clearEventSelection } from "./selection-view.js";
import { renderEventsLog } from "./log-view.js";
import { getEventKey } from "../../domain/event-key.js";
import { saveState } from "../storage/save-state.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderPlayers } from "../live/team-rendering.js";
import { updateRotationDisplay } from "../teams/court-view.js";
import { renderLiberoBench } from "../scout/court-commands.js";
import { setCurrentSet, rotateOpponentCourt, rotateCourt } from "../teams/court/court-ui-bootstrap.js";
import { renderLiveScore, updateMatchStatusUI, setScoutControlsDisabled, publishRuntimeView } from "../core/runtime-view.js";
import { restoreSkillClock, restoreVideoClock } from "../live/clocks.js";
import { recomputeServeFlagsFromHistory } from "../live/live-score-and-set.js";
import { getCourtShape, cloneCourt } from "../teams/court-model.js";
import { formatNameWithNumberFor } from "../teams/roster-data.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";

export function restoreScoutActionSnapshot(snapshot) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.before || typeof snapshot.before !== "object" ||
      Array.isArray(snapshot.before) || !Array.isArray(snapshot.missing)) return false;
  const patches = snapshot.eventPatches || [];
  if (!Array.isArray(patches) || patches.some(patch => !patch || !patch.before || !patch.after)) return false;
  const events = matchState.state.events || [];
  let removed;
  if (Array.isArray(snapshot.actionEventIds) && snapshot.actionEventIds.length) {
    const owned = new Set(snapshot.actionEventIds);
    const last = events[events.length - 1];
    if (!last || !owned.has(last.eventId)) return false;
    removed = events.filter(event => event && owned.has(event.eventId));
    for (let index = events.length - 1; index >= 0; index--) {
      if (events[index] && owned.has(events[index].eventId)) events.splice(index, 1);
    }
  } else {
    // Compatibilità con ricevute precedenti prive degli identificativi del gruppo.
    let count = snapshot.eventCount;
    if (snapshot.previousEventId != null) {
      const index = events.findIndex(event => event && event.eventId === snapshot.previousEventId);
      if (index === -1) return false;
      count = index + 1;
    }
    if (!Number.isInteger(count) || count < 0 || count >= events.length) return false;
    removed = events.splice(count);
  }
  // Non sostituiamo gli eventi precedenti: eventuali correzioni restano valide.
  patches.forEach(patch => {
    const event = events.find(item => item.eventId === patch.eventId);
    if (!event) return;
    ["code", "pendingBlockEval", "derivedFromBlock"].filter(key => Object.hasOwn(patch.before, key)).forEach(key => {
      if (JSON.stringify(event[key]) !== JSON.stringify(patch.after[key])) return;
      const value = patch.before[key];
      if (value === null) delete event[key];
      else event[key] = value;
    });
  });
  const schema = captureScoutActionSnapshot({ includeSetState: true });
  const allowed = new Set(Object.keys(schema.before).concat(schema.missing));
  snapshot.missing.forEach(key => { if (allowed.has(key)) delete matchState.state[key]; });
  Object.keys(snapshot.before).forEach(key => {
    if (allowed.has(key)) matchState.state[key] = JSON.parse(JSON.stringify(snapshot.before[key]));
  });
  removeScoutEventReferences(removed);
  refreshScoutAfterUndo();
  return true;
}

export function undoLastEvent() {
  if (!matchState.state.events || matchState.state.events.length === 0) {
    alert("Non ci sono eventi da annullare.");
    return;
  }
  const ev = matchState.state.events[matchState.state.events.length - 1];
  if (ev && ev.actionType === "set-change" &&
      !confirm(`Annullare il passaggio al set ${ev.nextSet || ev.set}? Tornerai al set ${ev.prevSet || 1} e al suo punteggio.`)) return;
  if (ev && restoreScoutActionSnapshot(ev.undoState || ev.__undoSnapshot)) {
    return;
  }
  const removed = [matchState.state.events.pop()];
  // Compatibilità con vecchi file: una ricezione e la battuta derivata sono una sola azione.
  const previous = matchState.state.events[matchState.state.events.length - 1];
  if (ev && ev.skillId === "pass" && previous && previous.derivedFromPassServe &&
      Number(previous.set || 1) === Number(ev.set || 1) &&
      (ev.relatedEvents || []).includes(previous.eventId)) removed.push(matchState.state.events.pop());
  if (ev && ev.skillId === "block") {
    (matchState.state.events || []).forEach(event => {
      if (event.skillId === "attack" && event.derivedFromBlock &&
          Number(event.set || 1) === Number(ev.set || 1) &&
          (event.relatedEvents || []).includes(ev.eventId)) {
        event.code = "/";
        event.pendingBlockEval = true;
        delete event.derivedFromBlock;
      }
    });
  }
  removeScoutEventReferences(removed);
  clearScoutFlowOverridesAfterUndo();
  matchState.state.freeballPending = false;
  matchState.state.freeballPendingScope = null;
  matchState.state.pendingServe = null;
  if (!ev) {
    refreshScoutAfterUndo();
    return;
  }
  if (ev.actionType === "set-change" || ev.actionType === "match-end") {
    const prevSet = ev.prevSet || 1;
    const prevFinished = !!ev.prevMatchFinished;
    if (ev.prevSetResults) {
      matchState.state.setResults = ev.prevSetResults;
    } else if (ev.actionType === "set-change") {
      matchState.state.setResults = Object.fromEntries(Object.entries(matchState.state.setResults || {}).filter(([key]) => Number(key) < Number(prevSet)));
    }
    if (ev.prevSetStarts) {
      matchState.state.setStarts = ev.prevSetStarts;
    } else if (ev.actionType === "set-change") {
      matchState.state.setStarts = Object.fromEntries(Object.entries(matchState.state.setStarts || {}).filter(([key]) => Number(key) <= Number(prevSet)));
    }
    matchState.state.matchFinished = prevFinished;
    restoreSkillClock(ev.prevClock || null);
    restoreVideoClock(ev.prevVideoClock || null);
    setCurrentSet(prevSet, { save: false });
    updateMatchStatusUI();
    setScoutControlsDisabled(!!matchState.state.matchFinished);
    restoreLegacyScoutSet(prevSet);
    recomputeServeFlagsFromHistory({ skipAutoLibero: true });
    refreshScoutAfterUndo();
    return;
  }
  if (ev && ev.autoRotationDirection) {
    const reverseDir = ev.autoRotationDirection === "ccw" ? "cw" : "ccw";
    const scope = ev.autoRotationScope || "our";
    if (scope === "opponent") {
      if (typeof rotateOpponentCourt === "function") {
        rotateOpponentCourt(reverseDir);
      }
    } else if (typeof rotateCourt === "function") {
      rotateCourt(reverseDir);
    }
  }
  if (ev && ev.actionType === "substitution") {
    undoSubstitutionEvent(ev);
  }
  if (matchState.state.predictiveSkillFlow) {
    if (typeof resetSetTypeState === "function") {
      resetSetTypeState();
    } else {
      Object.keys(selectedSkillPerPlayer || {}).forEach(key => delete selectedSkillPerPlayer[key]);
    }
    const lastFlow = getLastFlowEvent(matchState.state.events || []);
    if (matchState.state.useOpponentTeam) {
      if (lastFlow) {
        const next = computeTwoTeamFlowFromEvent(lastFlow);
        matchState.state.flowTeamScope = next.teamScope || matchState.state.flowTeamScope || (matchState.state.isServing ? "our" : "opponent");
      } else {
        matchState.state.flowTeamScope = matchState.state.isServing ? "our" : "opponent";
      }
    } else {
      matchState.state.flowTeamScope = "our";
    }
  }
  recomputeServeFlagsFromHistory({ skipAutoLibero: true });
  refreshScoutAfterUndo();
}

export function undoContestedRally() {
  const events = matchState.state.events || [];
  const currentSet = Number(matchState.state.currentSet || 1);
  let serveIndex = -1;
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    if (!event) continue;
    if (
      Number(event.set || 1) !== currentSet ||
      event.actionType === "set-change" ||
      event.actionType === "match-end"
    ) break;
    if (event.skillId === "serve") {
      serveIndex = index;
      break;
    }
  }
  if (serveIndex === -1) {
    alert("Non c’è una battuta da annullare nell’azione corrente.");
    return;
  }
  // Uno snapshot può annullare insieme battuta derivata e ricezione.
  while (matchState.state.events.length > serveIndex) {
    const previousLength = matchState.state.events.length;
    undoLastEvent();
    if (matchState.state.events.length >= previousLength) break;
  }
}

export function deleteEventByKey(eventKey) {
  if (!eventKey) return;
  const evIndex = (matchState.state.events || []).findIndex((ev, idx) => getEventKey(ev, idx) === eventKey);
  if (evIndex === -1) return;
  const ev = matchState.state.events[evIndex];
  const isStructuralEvent =
    ev && ["substitution", "set-change", "match-end"].includes(ev.actionType);
  if (isStructuralEvent && evIndex !== matchState.state.events.length - 1) {
    alert(
      "Non puoi eliminare un cambio o un passaggio di set nel mezzo dello storico: il campo successivo diventerebbe incoerente. Annulla prima le azioni più recenti."
    );
    return;
  }
  const label = ev
    ? (() => {
        const scope = getTeamScopeFromEvent(ev);
        const numbers = getPlayerNumbersForScope(scope);
        const nameLabel = ev.playerName ? formatNameWithNumberFor(ev.playerName, numbers) : "";
        return `${nameLabel} ${ev.skillId || ""} ${ev.code || ""}`.trim();
      })()
    : "questa skill";
  if (!confirm(`Eliminare ${label}?`)) return;
  if (isStructuralEvent) {
    undoLastEvent();
    clearEventSelection();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    return;
  }
  matchState.state.events.splice(evIndex, 1);
  clearEventSelection();
  recomputeServeFlagsFromHistory({ skipAutoLibero: true });
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  renderLiberoBench();

  updateRotationDisplay();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}

export function undoSubstitutionEvent(ev) {
  if (!ev) return false;
  const playerIn = (ev.playerIn || "").trim();
  const playerOut = (ev.playerOut || "").trim();
  if (!playerIn || !playerOut) return false;
  const scope = getTeamScopeFromEvent(ev);
  if (
    isLiberoForScope(playerIn, scope) || isLiberoForScope(playerOut, scope)
  ) {
    return false;
  }
  const baseCourt = getCourtShape(scope === "opponent" ? matchState.state.opponentCourt : matchState.state.court);
  const inIdx = baseCourt.findIndex(slot => slot && slot.main === playerIn);
  if (inIdx === -1) return false;
  const outIdx = baseCourt.findIndex(slot => slot && slot.main === playerOut);
  const nextCourt = cloneCourt(baseCourt);
  if (outIdx !== -1 && outIdx !== inIdx) {
    nextCourt[inIdx].main = playerOut;
    nextCourt[outIdx].main = playerIn;
  } else {
    nextCourt[inIdx].main = playerOut;
  }
  if (scope === "opponent") {
    commitCourtChangeForScope(nextCourt, "opponent");
  } else {
    commitCourtChange(nextCourt, { clean: true });
  }
  return true;
}

export function clearScoutFlowOverridesAfterUndo() {
  matchState.state.skillFlowOverride = null;
  matchState.state.opponentSkillFlowOverride = null;
  matchState.state.forceSkillActive = false;
  matchState.state.forceSkillScope = null;
}

export function removeScoutEventReferences(removed) {
  const ids = new Set(removed.map(event => event && event.eventId).filter(id => id != null));
  (matchState.state.events || []).forEach(event => {
    if (!event) return;
    if (Array.isArray(event.relatedEvents)) event.relatedEvents = event.relatedEvents.filter(id => !ids.has(id));
    if (Array.isArray(event.relatedLinks)) event.relatedLinks = event.relatedLinks.filter(link => link && !ids.has(link.eventId));
  });
}

export function refreshScoutAfterUndo() {
  const pendingServe = matchState.state.pendingServe;
  if (typeof cancelPartialSkillFlowForScope === "function") {
    cancelPartialSkillFlowForScope("our");
    cancelPartialSkillFlowForScope("opponent");
  }
  matchState.state.pendingServe = pendingServe;
  clearScoutFlowOverridesAfterUndo();
  if (typeof resetSetTypeState === "function") resetSetTypeState();
  // Anche il contesto fuori da matchState.state deve corrispondere agli eventi rimasti.
  if (typeof scoutUiState.lastReceiveContext !== "undefined") {
    scoutUiState.lastReceiveContext = { our: null, opponent: null };
    const set = Number(matchState.state.currentSet || 1);
    (matchState.state.events || []).forEach(event => {
      if (!event || Number(event.set || 1) !== set) return;
      const scope = getTeamScopeFromEvent(event);
      if (event.skillId === "serve" || event.skillId === "attack" || getPointDirection(event)) {
        scoutUiState.lastReceiveContext[scope] = null;
      } else if (event.skillId === "pass" && typeof rememberReceiveContext === "function") {
        rememberReceiveContext(event);
      }
    });
  }
  const restoredBaseCourt = (base, court) => JSON.parse(JSON.stringify(
    Array.isArray(base) && base.length === 6 ? base : court || []
  ));
  if (typeof rosterLineupState.autoRoleBaseCourt !== "undefined") rosterLineupState.autoRoleBaseCourt = restoredBaseCourt(matchState.state.autoRoleBaseCourt, matchState.state.court);
  if (typeof rosterLineupState.opponentAutoRoleBaseCourt !== "undefined") rosterLineupState.opponentAutoRoleBaseCourt = restoredBaseCourt(matchState.state.opponentAutoRoleBaseCourt, matchState.state.opponentCourt);
  if (typeof resetAutoRoleCache === "function") resetAutoRoleCache();
  if (typeof publishRuntimeView === "function") publishRuntimeView(matchState.state.currentSet || 1);
  if (typeof syncCourtSideLayout === "function") syncCourtSideLayout();
  recalcAllStatsAndUpdateUI();
  saveState({ persistLocal: true });
  renderEventsLog();
  renderPlayers();
  renderLiberoBench();
  updateRotationDisplay();
  if (typeof renderOpponentPlayers === "function") renderOpponentPlayers();
  if (typeof updateOpponentRotationDisplay === "function") updateOpponentRotationDisplay();
  renderLiveScore();
  publishRuntimeView();
  if (typeof updateMatchStatusUI === "function") updateMatchStatusUI();
}

export function restoreLegacyScoutSet(setNum) {
  const start = matchState.state.setStarts && matchState.state.setStarts[setNum];
  if (!start) return;
  matchState.state.courtSideSwapped = !!start.swapCourt;
  for (const scope of ["our", "opponent"]) {
    const initial = scope === "our" ? start.our : start.opponent;
    if (!initial || !Array.isArray(initial.court)) continue;
    let court = JSON.parse(JSON.stringify(initial.court));
    let rotation = Number(initial.rotation || 1);
    const rotateTo = value => {
      const target = Number(value);
      if (!Number.isInteger(target) || target < 1 || target > 6) return;
      const steps = (rotation - target + 6) % 6;
      court = court.slice(steps).concat(court.slice(0, steps));
      rotation = target;
    };
    (matchState.state.events || []).forEach(event => {
      if (Number(event.set || 1) !== Number(setNum)) return;
      const eventScope = getTeamScopeFromEvent(event);
      rotateTo(eventScope === scope ? event.rotation : event.opponentSetterPosition);
      if (eventScope === scope && event.actionType === "substitution") {
        court.forEach(slot => { if (slot.main === event.playerOut) slot.main = event.playerIn; });
      }
      if (event.autoRotationDirection && (event.autoRotationScope || "our") === scope) {
        rotateTo(event.autoRotationDirection === "ccw" ? (rotation + 4) % 6 + 1 : rotation % 6 + 1);
      }
    });
    matchState.state[scope === "our" ? "court" : "opponentCourt"] = court;
    matchState.state[scope === "our" ? "rotation" : "opponentRotation"] = rotation;
  }
}
