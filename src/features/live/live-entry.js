import { clearErrorPickMode } from "../scout/pick-model.js";
import { session as matchState } from "../../../js/globals.js";
import { renderPlayers } from "./team-rendering.js";
import { saveState } from "../storage/save-state.js";
import { scrollToActiveCourtOnMobileAlways, isDesktopCourtModalLayout, setCourtAreaLocked, setModalOpenState } from "../layout/modals.js";
import { updateCourtModalPlacement } from "../scout-ui.js";
import { getPlayersForScope } from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { renderEventsLog } from "../events/log-view.js";
import { renderLiveScore } from "../core/runtime-view.js";
import { renderScoreAndRotations } from "../analysis/score-view.js";
import { addPlayerPoint } from "./live-score-and-set.js";
import { computePointsSummary } from "../analysis/scores.js";
import { renderAggregatedTable } from "../analysis/aggregated-table.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { setSkillModalOpen, closeSkillModal } from "../scout/skill-modal-state.js";
import { renderSkillChoice, renderSkillCodes } from "../scout/skill-dialog.js";
import { resetSkillSelectionForPlayer } from "../scout/selection-state.js";
import { publishAttributionView, setAttributionOpen } from "../scout/attribution-view.js";
import { scheduleVideoSafeRender } from "../video/media-state.js";

export function schedulePostEventUpdates({
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








export function openSkillModal(playerIdx, playerName, scope = "our") {
  if (!matchState.elSkillModal || !matchState.elSkillModalBody) return;
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const players = getPlayersForScope(scope);
  if (isNaN(idx) || !players[idx]) return;
  renderSkillChoice(idx, playerName, scope);
  setSkillModalOpen(true);
  setModalOpenState(true);
}

export function openSkillCodesModal(playerIdx, playerName, skillId, scope = "our") {
  if (!matchState.elSkillModal || !matchState.elSkillModalBody) return;
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const players = getPlayersForScope(scope);
  if (isNaN(idx) || !players[idx]) return;
  if (!skillId) return;
  renderSkillCodes(idx, playerName, skillId, scope);
  setSkillModalOpen(true);
  setModalOpenState(true);
}

export function cancelSkillModalFlow() {
  if (!scoutUiState.activeSkillModalContext) return;
  const { playerIdx, playerName, scope } = scoutUiState.activeSkillModalContext;
  resetSkillSelectionForPlayer(playerIdx, scope);
  renderSkillChoice(playerIdx, playerName, scope);
}


export function stopErrorPickMode(options = {}) {
  if (!clearErrorPickMode()) return;
  if (options && options.render === false) return;
  renderPlayers();
}

export function stopPointPickMode(options = {}) {
  if (!scoutUiState.pointPickModeState) return;
  scoutUiState.pointPickModeState = null;
  if (options && options.render === false) return;
  renderPlayers();
}

export function startErrorPickMode(scope = "our") {
  const players = getPlayersForScope(scope);
  if (!players || players.length === 0) {
    openErrorModal({ scope });
    return;
  }
  stopPointPickMode({ render: false });
  closeSkillModal();
  closePointModal();
  closeErrorModal();
  scoutUiState.errorPickModeState = { scope };
  renderPlayers();
}

export function startPointPickMode(scope = "our") {
  const players = getPlayersForScope(scope);
  if (!players || players.length === 0) {
    openPointModal();
    return;
  }
  stopErrorPickMode({ render: false });
  closeSkillModal();
  closeErrorModal();
  closePointModal();
  scoutUiState.pointPickModeState = { scope };
  renderPlayers();
}

export function openErrorModalForPickedPlayer(scope, playerIdx, playerName) {
  stopErrorPickMode({ render: false });
  openErrorModal({
    scope,
    playerIdx,
    playerName,
    fromPicker: true
  });
}

export function applyPointForPickedPlayer(scope, playerIdx, playerName) {
  addPlayerPoint(playerIdx, playerName, scope);
  stopPointPickMode();
}

export function renderErrorModal() {
  if (!matchState.elErrorModalBody) return;

 publishAttributionView("error"); return;
}

export function renderPointModal() {
  if (!matchState.elPointModalBody) return;

 publishAttributionView("point"); return;
}

export function openErrorModal(prefill = null) {
  if (!matchState.elErrorModal) return;
  stopErrorPickMode({ render: false });
  scoutUiState.errorModalPrefillPlayer = prefill;
  renderErrorModal();
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  setAttributionOpen("error", true);
  setModalOpenState(true);
}

export function closeErrorModal() {
  if (!matchState.elErrorModal) return;
  setAttributionOpen("error", false);
  scoutUiState.errorModalPrefillPlayer = null;
  setModalOpenState(false);
}

export function openPointModal() {
  if (!matchState.elPointModal) return;
  renderPointModal();
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  setAttributionOpen("point", true);
  setModalOpenState(true);
}

export function closePointModal() {
  if (!matchState.elPointModal) return;
  setAttributionOpen("point", false);
  setModalOpenState(false);
}
