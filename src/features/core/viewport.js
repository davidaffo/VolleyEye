import { applyVideoLayoutWidths, applyScoutColumnLayout, updateCourtModalPlacement, bindScoutColumnResizeHandle } from "../scout-ui.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { isDesktopCourtModalLayout } from "../layout/modals.js";
import { renderPlayerPhotoEditor } from "../players/photo-editor.js";
import { session as matchState } from "../../../js/globals.js";
import { listenRuntime, session as browserEffectsState } from "../../app/browser-effects.js";
import { resizeTrajectoryCanvas } from "../scout/trajectory-canvas.js";
import { renderPlayers } from "../live/team-rendering.js";

export function isCompactViewportLayout() {
  return !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
}

export function flushViewportLayoutUpdate({ settled = false } = {}) {
  scoutUiState.viewportLayoutFrame = null;
  const compactMode = isCompactViewportLayout();
  const compactModeChanged =
    scoutUiState.lastViewportCompactMode !== null && compactMode !== scoutUiState.lastViewportCompactMode;
  scoutUiState.lastViewportCompactMode = compactMode;
  applyVideoLayoutWidths();
  applyScoutColumnLayout();
  const courtPlacementMode = typeof isDesktopCourtModalLayout === "function"
    ? isDesktopCourtModalLayout()
    : null;
  if (courtPlacementMode !== scoutUiState.lastCourtPlacementMode) {
    scoutUiState.lastCourtPlacementMode = courtPlacementMode;
    if (typeof updateCourtModalPlacement === "function") updateCourtModalPlacement();
  }
  if (
    typeof scoutUiState.elAttackTrajectoryModal !== "undefined" &&
    scoutUiState.elAttackTrajectoryModal &&
    !scoutUiState.elAttackTrajectoryModal.classList.contains("hidden")
  ) {
    resizeTrajectoryCanvas();
  }
  if (
    typeof matchState.elPlayerPhotoModal !== "undefined" &&
    matchState.elPlayerPhotoModal &&
    !matchState.elPlayerPhotoModal.classList.contains("hidden")
  ) {
    renderPlayerPhotoEditor();
  }
  if (compactModeChanged) {
    renderPlayers();
  }
  if (settled) {
    // A final pass catches the last browser reflow without rebuilding the court.
    applyVideoLayoutWidths();
    applyScoutColumnLayout();
  }
}

export function scheduleViewportLayoutUpdate() {
  if (scoutUiState.viewportLayoutFrame === null) {
    scoutUiState.viewportLayoutFrame = requestAnimationFrame(() => flushViewportLayoutUpdate());
  }
  if (scoutUiState.viewportLayoutSettleTimer !== null) browserEffectsState.clearTimeout(scoutUiState.viewportLayoutSettleTimer);
  scoutUiState.viewportLayoutSettleTimer = browserEffectsState.setTimeout(() => {
    scoutUiState.viewportLayoutSettleTimer = null;
    if (scoutUiState.viewportLayoutFrame !== null) {
      cancelAnimationFrame(scoutUiState.viewportLayoutFrame);
      scoutUiState.viewportLayoutFrame = null;
    }
    flushViewportLayoutUpdate({ settled: true });
  }, 120);
}

export function bindViewportResizeUpdates() {
  if (scoutUiState.viewportResizeBound) return;
  scoutUiState.viewportResizeBound = true;
  scoutUiState.lastViewportCompactMode = isCompactViewportLayout();
  scoutUiState.lastCourtPlacementMode =
    typeof isDesktopCourtModalLayout === "function" ? isDesktopCourtModalLayout() : null;
  listenRuntime(window, "resize", scheduleViewportLayoutUpdate, { passive: true });
}

export function bindScoutColumnResize() {
  bindScoutColumnResizeHandle(scoutUiState.elScoutResizeLeft, "left");
  bindScoutColumnResizeHandle(scoutUiState.elScoutResizeRight, "right");
  if (!scoutUiState.scoutGridResizeObserver && scoutUiState.elScoutGrid && typeof ResizeObserver === "function") {
    scoutUiState.scoutGridResizeObserver = new ResizeObserver(() => scheduleViewportLayoutUpdate());
    scoutUiState.scoutGridResizeObserver.observe(scoutUiState.elScoutGrid);
  }
  bindViewportResizeUpdates();
}
