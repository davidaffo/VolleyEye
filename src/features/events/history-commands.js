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
  if (!snapshot || typeof snapshot !== "object") return false;
  Object.keys(matchState.state).forEach(key => delete matchState.state[key]);
  Object.assign(matchState.state, snapshot);
  resetSetTypeState();
  saveState({ persistLocal: true });
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  renderLiberoBench();

  updateRotationDisplay();
  renderLiveScore();
  publishRuntimeView();
  return true;
}

export function undoLastEvent() {
  if (!matchState.state.events || matchState.state.events.length === 0) {
    alert("Non ci sono eventi da annullare.");
    return;
  }
  const ev = matchState.state.events[matchState.state.events.length - 1];
  if (ev && ev.__undoSnapshot && restoreScoutActionSnapshot(ev.__undoSnapshot)) {
    return;
  }
  matchState.state.events.pop();
  if (!ev) {
    saveState();
    recalcAllStatsAndUpdateUI();
    renderEventsLog();
    renderPlayers();
    renderLiberoBench();

    updateRotationDisplay();
    return;
  }
  if (ev.actionType === "set-change" || ev.actionType === "match-end") {
    const prevSet = ev.prevSet || 1;
    const prevFinished = !!ev.prevMatchFinished;
    if (ev.prevSetResults) {
      matchState.state.setResults = ev.prevSetResults;
    }
    if (ev.prevSetStarts) {
      matchState.state.setStarts = ev.prevSetStarts;
    }
    matchState.state.matchFinished = prevFinished;
    restoreSkillClock(ev.prevClock || null);
    restoreVideoClock(ev.prevVideoClock || null);
    setCurrentSet(prevSet, { save: false });
    updateMatchStatusUI();
    setScoutControlsDisabled(!!matchState.state.matchFinished);
    saveState();
    recalcAllStatsAndUpdateUI();
    renderEventsLog();
    renderPlayers();
    renderLiberoBench();

    updateRotationDisplay();
    publishRuntimeView();
    return;
  }
  if (ev && ev.autoRotationDirection) {
    const reverseDir = ev.autoRotationDirection === "ccw" ? "cw" : "ccw";
    const scope = ev.autoRotationScope || "our";
    if (scope === "opponent") {
      rotateOpponentCourt(reverseDir);
    } else {
      rotateCourt(reverseDir);
    }
  }
  if (ev && ev.actionType === "substitution") {
    undoSubstitutionEvent(ev);
  }
  const idx = ev.playerIdx;
  const skillId = ev.skillId;
  if (
    matchState.state.stats[idx] &&
    matchState.state.stats[idx][skillId] &&
    matchState.state.stats[idx][skillId][ev.code] > 0
  ) {
    matchState.state.stats[idx][skillId][ev.code]--;
  }
  if (matchState.state.predictiveSkillFlow) {
    resetSetTypeState();
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
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  renderLiberoBench();

  updateRotationDisplay();
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
