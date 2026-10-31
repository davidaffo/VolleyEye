import { captureScoutActionSnapshot } from "../events/history-model.js";
import { computeSetWinner } from "../teams/set-start-model.js";
import { getCourtShape, cloneCourt } from "../teams/court-model.js";
import { commitCourtChange, commitCourtChangeForScope, setIsServing } from "../teams/court/court-engine.js";
import { enforceAutoLiberoForState, enforceAutoLiberoForScope } from "../teams/court-state-model.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { isDesktopCourtModalLayout, setCourtAreaLocked, setModalOpenState } from "../layout/modals.js";
import { updateCourtModalPlacement } from "../scout-ui.js";
import { publishNextSetView, renderNextSetLineups } from "./next-set-view.js";
import { setLineupOpen, publishLineupView } from "./lineup-view.js";
import { session as matchState } from "../../../js/globals.js";
import { renderLineupModal } from "./lineup-editor.js";
import { cancelPartialSkillFlowForScope } from "../scout/selection-state.js";
import { setScoutControlsDisabled, renderLiveScore, updateMatchStatusUI, publishRuntimeView } from "../core/runtime-view.js";
import { applySetChange } from "./live-score-and-set.js";
import { syncCourtSideLayout, renderPlayers, renderOpponentPlayers } from "./team-rendering.js";
import { setRotation, setOpponentRotation } from "../teams/court/court-ui-bootstrap.js";
import { saveState } from "../storage/save-state.js";
import { renderEventsLog } from "../events/log-view.js";
import { cloneSetMap, getNextSetEntry, updateNextSetEntry, buildNextSetDraft } from "./next-set-model.js";

export function setNextSetRotation(scope, value) {
  if (!scoutUiState.nextSetDraft) return;
  const rotation = Math.min(6, Math.max(1, parseInt(value, 10) || 1));
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  updateNextSetEntry(scope, Object.assign({}, entry, { rotation }));
  publishNextSetView();
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
  publishLineupView();
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
  publishNextSetView();
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
  const actionSnapshot = captureScoutActionSnapshot({ includeSetState: true });
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
      actionSnapshot,
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

  renderOpponentPlayers();
  publishRuntimeView();
  closeNextSetModal({ force: true });
}

export function shouldOpenNextSetModal() {
  const hasEvents = matchState.state.events && matchState.state.events.length > 0;
  const currentSet = matchState.state.currentSet || 1;
  const hasStart = matchState.state.setStarts && matchState.state.setStarts[currentSet];
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  return activeTab === "scout" && !hasEvents && !hasStart;
}
