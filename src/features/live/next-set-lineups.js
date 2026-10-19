
import { getDefaultSetStartForScope, getMatchInitialSetStart, computeSetWinner, getDerivedServeForSetStart } from "../teams/set-start-model.js";
import { getCourtShape, cloneCourt } from "../teams/court-model.js";
import { computeSetWinScore } from "../analysis/set-results.js";

import { removeLiberosAndRestoreForScope } from "../teams/libero-model.js";
import { commitCourtChange, commitCourtChangeForScope, setIsServing, enforceAutoLiberoForState, enforceAutoLiberoForScope } from "../teams/court/court-engine.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getLiberosForScope } from "../teams/selectors.js";
import { isDesktopCourtModalLayout, setCourtAreaLocked, setModalOpenState } from "../layout/modals.js";
import { updateCourtModalPlacement } from "../scout-ui.js";
import { lineup } from "../../domain/lineup.js";
import { publishNextSetView } from "./next-set-view.js";
import { publishRuntimeView } from "../core/runtime-view.js";
import { setLineupOpen } from "./lineup-view.js";

import { session as matchState } from "../../../js/globals.js";

import { renderLineupModal } from "./lineup-editor.js";
import { updateLineupModalControls, cancelPartialSkillFlowForScope } from "./skill-selection.js";
import { setScoutControlsDisabled, applySetChange, renderLiveScore, updateMatchStatusUI } from "./live-score-and-set.js";
import { syncCourtSideLayout, renderPlayers, renderOpponentPlayers } from "./team-rendering.js";
import { setRotation, setOpponentRotation, renderLineupChips } from "../teams/court/court-ui-bootstrap.js";
import { saveState } from "../storage/save-state.js";
import { renderEventsLog } from "../video/video-events.js";









export function cloneSetMap(map) {
  return JSON.parse(JSON.stringify(map || {}));
}

export function getNextSetEntry(scope) {
  if (!scoutUiState.nextSetDraft) return null;
  return scope === "opponent" ? scoutUiState.nextSetDraft.opponent : scoutUiState.nextSetDraft.our;
}

export function updateNextSetEntry(scope, entry) {
  if (!scoutUiState.nextSetDraft || !entry) return;
  if (scope === "opponent") {
    scoutUiState.nextSetDraft.opponent = entry;
  } else {
    scoutUiState.nextSetDraft.our = entry;
  }
}

export function setNextSetPlayer(scope, posIdx, name) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const liberos = getLiberosForScope(scope);
  const core = lineup;
  let nextCourt = [];
  if (core && typeof core.setPlayerOnCourt === "function") {
    nextCourt = core.setPlayerOnCourt({
      court: entry.court || [],
      posIdx,
      playerName: name,
      liberos
    });
  } else {
    nextCourt = getCourtShape(entry.court || []).map((slot, idx) => {
      const updated = Object.assign({}, slot);
      if (updated.main === name) updated.main = "";
      if (updated.replaced === name) updated.replaced = "";
      if (idx === posIdx) updated.main = name;
      return updated;
    });
  }
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}

export function swapNextSetSlots(scope, fromIdx, toIdx) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const core = lineup;
  let nextCourt = [];
  if (core && typeof core.swapCourtSlots === "function") {
    nextCourt = core.swapCourtSlots({
      court: entry.court || [],
      fromIdx,
      toIdx
    });
  } else {
    nextCourt = getCourtShape(entry.court || []);
    const tmp = nextCourt[fromIdx];
    nextCourt[fromIdx] = nextCourt[toIdx];
    nextCourt[toIdx] = tmp;
  }
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}

export function clearNextSetSlot(scope, posIdx) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const nextCourt = getCourtShape(entry.court || []).map((slot, idx) => {
    if (idx !== posIdx) return slot;
    return { main: "", replaced: "" };
  });
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}

export function renderNextSetLineups() {
  if (!scoutUiState.nextSetDraft) return;

    publishNextSetView();
    return;

}

export function syncNextSetPreferredLiberoSelects() {

 publishNextSetView(); return;
}

export function updateNextSetRotationUI() {

 publishNextSetView(); return;
}

export function setNextSetRotation(scope, value) {
  if (!scoutUiState.nextSetDraft) return;
  const rotation = Math.min(6, Math.max(1, parseInt(value, 10) || 1));
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  updateNextSetEntry(scope, Object.assign({}, entry, { rotation }));
  updateNextSetRotationUI();
}

export function rotateNextSetCourt(scope, direction) {
  if (!scoutUiState.nextSetDraft) return;
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const court = getCourtShape(entry.court || []);
  let rotated = [];
  if (direction === "cw") {
    rotated = [court[5], court[0], court[1], court[2], court[3], court[4]];
  } else {
    rotated = [court[1], court[2], court[3], court[4], court[5], court[0]];
  }
  const currentRotation = entry.rotation || 1;
  const rotation = direction === "cw" ? ((currentRotation % 6) + 1) : (currentRotation === 1 ? 6 : currentRotation - 1);
  updateNextSetEntry(scope, Object.assign({}, entry, { court: rotated, rotation }));
  renderNextSetLineups();
}











export function updateSetScoreDisplays() {
  const score = computeSetWinScore();
  const label = score.for + " - " + score.against;

  publishRuntimeView();
}



export function buildNextSetDraft(setNum) {
  const nextSet = Math.min(5, Math.max(1, setNum || 1));
  const defaultsOur = getDefaultSetStartForScope("our");
  const defaultsOpp = getDefaultSetStartForScope("opponent");
  const initialOur = getMatchInitialSetStart("our");
  const initialOpp = getMatchInitialSetStart("opponent");
  const savedStart = matchState.state.setStarts && matchState.state.setStarts[nextSet] ? matchState.state.setStarts[nextSet] : null;
  const savedOur = savedStart && savedStart.our ? savedStart.our : null;
  const savedOpp = savedStart && savedStart.opponent ? savedStart.opponent : null;
  const baseOurCourt =
    savedOur && savedOur.court
      ? cloneCourt(savedOur.court)
      : initialOur && initialOur.court
      ? cloneCourt(initialOur.court)
      : defaultsOur && defaultsOur.court
      ? cloneCourt(defaultsOur.court)
      : (removeLiberosAndRestoreForScope(matchState.state.court || [], "our"));
  const baseOppCourt =
    savedOpp && savedOpp.court
      ? cloneCourt(savedOpp.court)
      : initialOpp && initialOpp.court
      ? cloneCourt(initialOpp.court)
      : defaultsOpp && defaultsOpp.court
      ? cloneCourt(defaultsOpp.court)
      : (removeLiberosAndRestoreForScope(matchState.state.opponentCourt || [], "opponent"));
  const our = {
    court: cloneCourt(baseOurCourt),
    rotation:
      savedOur && typeof savedOur.rotation === "number"
        ? savedOur.rotation
        : initialOur && initialOur.rotation
          ? initialOur.rotation
          : defaultsOur && defaultsOur.rotation
          ? defaultsOur.rotation
          : matchState.state.rotation || 1
  };
  const opponent = {
    court: cloneCourt(baseOppCourt),
    rotation:
      savedOpp && typeof savedOpp.rotation === "number"
        ? savedOpp.rotation
        : initialOpp && initialOpp.rotation
          ? initialOpp.rotation
          : defaultsOpp && defaultsOpp.rotation
          ? defaultsOpp.rotation
          : matchState.state.opponentRotation || 1
  };
  const serveDefault = getDerivedServeForSetStart(nextSet);
  return {
    setNum: nextSet,
    our,
    opponent,
    swapCourt: savedStart ? !!savedStart.swapCourt : nextSet > 1 ? !matchState.state.courtSideSwapped : false,
    isServing: serveDefault
  };
}

export function openNextSetLineupModal(scope = "our") {
  if (!scoutUiState.nextSetDraft) return;
  scoutUiState.lineupModalContext = "next-set";
  scoutUiState.lineupModalScope = scope === "opponent" ? "opponent" : "our";
  const entry = scoutUiState.lineupModalScope === "opponent" ? scoutUiState.nextSetDraft.opponent : scoutUiState.nextSetDraft.our;
  scoutUiState.lineupModalCourt = cloneCourt((entry && entry.court) || []);
  scoutUiState.lineupModalDefaultRotation = entry && typeof entry.rotation === "number" ? entry.rotation : null;
  scoutUiState.lineupDragName = "";
  scoutUiState.lineupSelectedName = "";
  scoutUiState.lineupNumberMode = false;
  renderLineupModal();
  updateLineupModalControls();
  if (scoutUiState.elLineupModal) {
    if (isDesktopCourtModalLayout()) {
      setCourtAreaLocked(true);
    }
    updateCourtModalPlacement();
    setLineupOpen(true);
    setModalOpenState(true);
  }
}

export function openNextSetModal(setNum) {
  if (!scoutUiState.elNextSetInline) return;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (activeTab !== "scout") return;
  scoutUiState.nextSetDraft = buildNextSetDraft(setNum);

  scoutUiState.nextSetModalOpen = true;
  setScoutControlsDisabled(true);
  const courtArea = document.getElementById("court-area");
  if (courtArea) {
    courtArea.classList.add("court-area--next-set");
  }
  renderNextSetLineups();
  syncNextSetPreferredLiberoSelects();
}

export function closeNextSetModal({ force = false } = {}) {
  if (!scoutUiState.elNextSetInline) return;
  if (!force && scoutUiState.nextSetDraft && scoutUiState.nextSetDraft.setNum === 1) return;

  scoutUiState.nextSetDraft = null;
  scoutUiState.nextSetModalOpen = false;
  publishNextSetView();
  setScoutControlsDisabled(!!matchState.state.matchFinished);
  scoutUiState.nextSetDragName = "";
  scoutUiState.nextSetDragFromIdx = null;
  scoutUiState.nextSetDragScope = null;
  const courtArea = document.getElementById("court-area");
  if (courtArea) {
    courtArea.classList.remove("court-area--next-set");
  }
}

export function applyNextSetDraft() {
  if (!scoutUiState.nextSetDraft) return;
  const prevSet = matchState.state.currentSet || 1;
  const nextSet = scoutUiState.nextSetDraft.setNum || prevSet;
  const prevSetResults = cloneSetMap(matchState.state.setResults);
  const prevSetStarts = cloneSetMap(matchState.state.setStarts);
  const nextSetResults = cloneSetMap(prevSetResults);
  if (nextSet > 1 && !nextSetResults[prevSet]) {
    const winner = computeSetWinner(prevSet);
    if (winner) nextSetResults[prevSet] = winner;
  }
  const nextSetStarts = cloneSetMap(prevSetStarts);
  const ourRotation =
    typeof scoutUiState.nextSetDraft.our.rotation === "number"
      ? scoutUiState.nextSetDraft.our.rotation
      : matchState.state.rotation || 1;
  const oppRotation =
    typeof scoutUiState.nextSetDraft.opponent.rotation === "number"
      ? scoutUiState.nextSetDraft.opponent.rotation
      : matchState.state.opponentRotation || 1;
  nextSetStarts[nextSet] = {
    our: { court: cloneCourt(scoutUiState.nextSetDraft.our.court || []), rotation: ourRotation },
    opponent: { court: cloneCourt(scoutUiState.nextSetDraft.opponent.court || []), rotation: oppRotation },
    swapCourt: !!scoutUiState.nextSetDraft.swapCourt,
    isServing: !!scoutUiState.nextSetDraft.isServing
  };
  matchState.state.setResults = nextSetResults;
  matchState.state.setStarts = nextSetStarts;
  matchState.state.courtSideSwapped = !!scoutUiState.nextSetDraft.swapCourt;
  syncCourtSideLayout();
  commitCourtChange(cloneCourt(scoutUiState.nextSetDraft.our.court || []), { clean: true });
  commitCourtChangeForScope(cloneCourt(scoutUiState.nextSetDraft.opponent.court || []), "opponent");
  setRotation(ourRotation);
  setOpponentRotation(oppRotation);
  setIsServing(!!scoutUiState.nextSetDraft.isServing);
  matchState.state.flowTeamScope = matchState.state.isServing ? "our" : "opponent";
  matchState.state.pendingServe = null;
  matchState.state.forceSkillActive = false;
  matchState.state.forceSkillScope = null;
  matchState.state.skillFlowOverride = null;
  matchState.state.opponentSkillFlowOverride = null;
  cancelPartialSkillFlowForScope("our");
  cancelPartialSkillFlowForScope("opponent");
  enforceAutoLiberoForState({ skipServerOnServe: true });
  if (matchState.state.useOpponentTeam) {
    enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
  }
  if (nextSet !== prevSet) {
    applySetChange(nextSet, {
      prevSet,
      nextSet,
      prevFinished: !!matchState.state.matchFinished,
      nextFinished: false,
      actionType: "set-change",
      prevSetResults,
      nextSetResults,
      prevSetStarts,
      nextSetStarts
    });
  } else {
    matchState.state.matchFinished = false;
    saveState({ persistLocal: true });
    renderEventsLog();
    renderLiveScore();
    updateMatchStatusUI();
  }
  renderPlayers();
  renderLineupChips();
  renderOpponentPlayers();
  updateSetScoreDisplays();
  closeNextSetModal({ force: true });
}

export function shouldOpenNextSetModal() {
  const hasEvents = matchState.state.events && matchState.state.events.length > 0;
  const currentSet = matchState.state.currentSet || 1;
  const hasStart = matchState.state.setStarts && matchState.state.setStarts[currentSet];
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  return activeTab === "scout" && !hasEvents && !hasStart;
}
