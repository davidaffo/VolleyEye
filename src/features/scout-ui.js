


import { isDesktopCourtModalLayout } from "./layout/modals.js";

import { normalizePlayerKey } from "./teams/player-identity.js";
import { getTeamScopeFromEvent } from "./teams/selectors.js";
import { session } from "./state/scout-ui.js";
import { renderPlayerPhotoEditor } from "./players/photo-editor.js";

import { session as matchState } from "../../js/globals.js";
import { listenRuntime, session as browserEffectsState, unlistenRuntime } from "../app/browser-effects.js";




import { extractRosterFromTeam } from "./teams/storage/team-repository.js";
import { saveMatchToStorage } from "./storage/match-repository.js";
import { cloneIsolationData } from "../domain/snapshots.js";
import { saveState } from "./storage/save-state.js";
import { syncEventPlayerLinks } from "./events/player-links.js";
import { resizeTrajectoryCanvas } from "./live/trajectories.js";
import { renderPlayers } from "./live/team-rendering.js";
import { courtPlacementStore } from "../state/roster-import-store.mjs";




const scoutUiState = session;



export function navigateToResetBootstrap() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("reset_app") === "1") return;
  url.searchParams.set("reset_app", "1");
  window.location.replace(url.toString());
}

export function handleIncomingResetSignal(signalId = "") {
  if (typeof window === "undefined") return;
  const normalized = String(signalId || "").trim();
  if (!normalized || normalized === scoutUiState.lastHandledResetSignal) return;
  scoutUiState.lastHandledResetSignal = normalized;
  window.__appResetInProgress = true;
  window.__recentAppResetAt = Date.now();
  navigateToResetBootstrap();
}

export function broadcastResetSignal(signalId) {
  if (typeof window === "undefined") return;
  const payload = {
    id: String(signalId || Date.now()),
    at: new Date().toISOString()
  };
  try {
    localStorage.setItem(scoutUiState.APP_RESET_SIGNAL_KEY, JSON.stringify(payload));
  } catch (_) {
    // ignore
  }
  try {
    if (!scoutUiState.resetSyncChannel && "BroadcastChannel" in window) {
      scoutUiState.resetSyncChannel = new BroadcastChannel(scoutUiState.APP_RESET_CHANNEL);
    }
    if (scoutUiState.resetSyncChannel) {
      scoutUiState.resetSyncChannel.postMessage(payload);
    }
  } catch (_) {
    // ignore
  }
}

export function initCrossTabResetSync() {
  if (typeof window === "undefined" || window.__resetSyncInitialized) return;
  window.__resetSyncInitialized = true;
  listenRuntime(window, "storage", event => {
    if (!event || event.key !== scoutUiState.APP_RESET_SIGNAL_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue);
      handleIncomingResetSignal(payload && payload.id);
    } catch (_) {
      // ignore
    }
  });
  try {
    if ("BroadcastChannel" in window) {
      scoutUiState.resetSyncChannel = new BroadcastChannel(scoutUiState.APP_RESET_CHANNEL);
      scoutUiState.resetSyncChannel.addEventListener("message", event => {
        const payload = event && event.data;
        handleIncomingResetSignal(payload && payload.id);
      });
    }
  } catch (_) {
    // ignore
  }
}

















































export function buildPayloadRosterNameToIdMap(payload, scope) {
  if (!payload || !payload.state) return null;
  const teamName =
    scope === "opponent"
      ? (payload.state.selectedOpponentTeam || "").trim()
      : (payload.state.selectedTeam || "").trim();
  if (!teamName) return null;
  const mapSource =
    scope === "opponent"
      ? payload.state.savedOpponentTeams || payload.state.savedTeams
      : payload.state.savedTeams;
  const team = mapSource && mapSource[teamName] ? mapSource[teamName] : null;
  if (!team) return null;
  const roster = extractRosterFromTeam(team);
  const detailed = Array.isArray(roster.playersDetailed) ? roster.playersDetailed : [];
  const nameToId = new Map();
  detailed.forEach(player => {
    const id = player && (player.id || player.playerId);
    const name = player && player.name;
    if (!id || !name) return;
    nameToId.set(normalizePlayerKey(name), id);
  });
  return nameToId;
}

export function backfillPlayerIdsInPayload(payload) {
  if (!payload || !payload.state || !Array.isArray(payload.state.events)) return 0;
  const rosterOur = Array.isArray(payload.state.players) ? payload.state.players : [];
  const rosterOpp = Array.isArray(payload.state.opponentPlayers) ? payload.state.opponentPlayers : [];
  const mapOur = buildPayloadRosterNameToIdMap(payload, "our");
  const mapOpp = buildPayloadRosterNameToIdMap(payload, "opponent");
  let updated = 0;
  payload.state.events.forEach(ev => {
    if (!ev || ev.playerId) return;
    const scope = getTeamScopeFromEvent(ev);
    const roster = scope === "opponent" ? rosterOpp : rosterOur;
    let name = ev.playerName;
    if (!name && typeof ev.playerIdx === "number" && roster[ev.playerIdx]) {
      name = roster[ev.playerIdx];
      ev.playerName = name;
    }
    if (!name) return;
    const map = scope === "opponent" ? mapOpp : mapOur;
    if (!map) return;
    const id = map.get(normalizePlayerKey(name));
    if (id) {
      ev.playerId = id;
      updated += 1;
    }
  });
  return updated;
}

export function backfillPlayerIdsInSavedMatches() {
  const saved = matchState.state.savedMatches || {};
  let updatedMatches = 0;
  let updatedEvents = 0;
  Object.entries(saved).forEach(([name, payload]) => {
    const count = backfillPlayerIdsInPayload(payload);
    if (count > 0) {
      updatedMatches += 1;
      updatedEvents += count;
      saveMatchToStorage(name, payload);
      saved[name] = payload;
      if (name === matchState.state.selectedMatch) {
        matchState.state.events = cloneIsolationData(payload.state.events || matchState.state.events || []);
        syncEventPlayerLinks(matchState.state.events || []);
      }
    }
  });
  matchState.state.savedMatches = saved;
  if (updatedMatches > 0) {
    saveState();
  }
  alert(
    updatedMatches > 0
      ? `Aggiornati ${updatedEvents} eventi in ${updatedMatches} match.`
      : "Nessun match da aggiornare."
  );
}









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

export function applyTopBarVisibility() {
  const hidden = !!matchState.state.uiTopBarHidden;
  document.body.classList.toggle("top-bar-hidden", hidden);

}

export function ensureVideoLayoutState() {
  const current = matchState.state.uiVideoLayout && typeof matchState.state.uiVideoLayout === "object" ? matchState.state.uiVideoLayout : {};
  matchState.state.uiVideoLayout = {
    analysisHeight:
      Number.isFinite(current.analysisHeight) && current.analysisHeight > 0
        ? current.analysisHeight
        : Number.isFinite(current.analysisWidth) && current.analysisWidth > 0
          ? current.analysisWidth
          : scoutUiState.VIDEO_LAYOUT_DEFAULTS.analysisHeight,
    scoutHeight:
      Number.isFinite(current.scoutHeight) && current.scoutHeight > 0
        ? current.scoutHeight
        : Number.isFinite(current.scoutWidth) && current.scoutWidth > 0
          ? current.scoutWidth
          : scoutUiState.VIDEO_LAYOUT_DEFAULTS.scoutHeight
  };
  return matchState.state.uiVideoLayout;
}



export function clampVideoLayoutSize(kind, size) {
  const limits = scoutUiState.VIDEO_LAYOUT_LIMITS[kind] || scoutUiState.VIDEO_LAYOUT_LIMITS.analysisHeight;
  const viewportMax = Math.max(limits.min, window.innerHeight - 140);
  const hardMax = Math.max(limits.min, Math.min(limits.max, viewportMax));
  return Math.max(limits.min, Math.min(hardMax, Math.round(size)));
}

export function applyVideoLayoutWidths() {
  ensureVideoLayoutState();
  const root = document.documentElement;
  const analysisHeight = `${clampVideoLayoutSize("analysisHeight", matchState.state.uiVideoLayout.analysisHeight)}px`;
  const scoutHeight = `${clampVideoLayoutSize("scoutHeight", matchState.state.uiVideoLayout.scoutHeight)}px`;
  if (
    typeof root.style.getPropertyValue !== "function" ||
    root.style.getPropertyValue("--video-panel-height") !== analysisHeight
  ) {
    root.style.setProperty("--video-panel-height", analysisHeight);
  }
  if (
    typeof root.style.getPropertyValue !== "function" ||
    root.style.getPropertyValue("--video-scout-height") !== scoutHeight
  ) {
    root.style.setProperty("--video-scout-height", scoutHeight);
  }
}

export function setVideoLayoutWidth(kind, width, persist = true) {
  ensureVideoLayoutState();
  matchState.state.uiVideoLayout[kind] = clampVideoLayoutSize(kind, width);
  applyVideoLayoutWidths();
  if (persist) {
    saveState({ persistLocal: true });
  }
}

export function stopVideoResizeDrag() {
  if (!scoutUiState.activeVideoResizeSession) return;
  document.body.classList.remove("video-panel-resizing");
  unlistenRuntime(window, "pointermove", scoutUiState.activeVideoResizeSession.onMove);
  unlistenRuntime(window, "pointerup", scoutUiState.activeVideoResizeSession.onUp);
  unlistenRuntime(window, "pointercancel", scoutUiState.activeVideoResizeSession.onUp);
  const { kind, currentSize } = scoutUiState.activeVideoResizeSession;
  scoutUiState.activeVideoResizeSession = null;
  setVideoLayoutWidth(kind, currentSize, true);
}

export function startVideoResizeDrag(event, kind) {
  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (event.cancelable) event.preventDefault();
  ensureVideoLayoutState();
  const startY = event.clientY;
  const startSize = clampVideoLayoutSize(kind, matchState.state.uiVideoLayout[kind]);
  const onMove = moveEvent => {
    const delta = moveEvent.clientY - startY;
    const nextSize = clampVideoLayoutSize(kind, startSize + delta);
    if (!scoutUiState.activeVideoResizeSession) return;
    scoutUiState.activeVideoResizeSession.currentSize = nextSize;
    matchState.state.uiVideoLayout[kind] = nextSize;
    applyVideoLayoutWidths();
  };
  const onUp = () => stopVideoResizeDrag();
  scoutUiState.activeVideoResizeSession = {
    kind,
    currentSize: startSize,
    onMove,
    onUp
  };
  document.body.classList.add("video-panel-resizing");
  listenRuntime(window, "pointermove", onMove);
  listenRuntime(window, "pointerup", onUp);
  listenRuntime(window, "pointercancel", onUp);
}

export function bindVideoResizeHandle(handle, kind) {

return;
}

export function ensureScoutColumnState() {
  const current = matchState.state.uiScoutColumns && typeof matchState.state.uiScoutColumns === "object"
    ? matchState.state.uiScoutColumns
    : {};
  const hasLegacyLeftWidth = Object.prototype.hasOwnProperty.call(current, "left");
  const savedLeft = Number(current.left);
  const savedRight = Number(current.right);
  current.left = Number.isFinite(savedLeft) && savedLeft > 0
    ? savedLeft
    : scoutUiState.SCOUT_COLUMN_DEFAULTS.left;
  current.right = hasLegacyLeftWidth && savedRight === 300
    ? scoutUiState.SCOUT_COLUMN_DEFAULTS.right
    : Number.isFinite(savedRight) && savedRight > 0
      ? savedRight
      : scoutUiState.SCOUT_COLUMN_DEFAULTS.right;
  matchState.state.uiScoutColumns = current;
  return current;
}

export function getScoutColumnAvailableWidth() {
  if (!scoutUiState.elScoutGrid) return 0;
  const styles = window.getComputedStyle(scoutUiState.elScoutGrid);
  const gap = parseFloat(styles.columnGap) || 0;
  const handlesWidth = [scoutUiState.elScoutResizeLeft, scoutUiState.elScoutResizeRight]
    .reduce((total, handle) => total + (handle ? handle.offsetWidth : 0), 0);
  return Math.max(0, scoutUiState.elScoutGrid.clientWidth - handlesWidth - gap * 4);
}

export function resolveScoutColumnWidths(preferredSide = "") {
  const current = ensureScoutColumnState();
  const available = getScoutColumnAvailableWidth();
  const maxSides = Math.max(
    scoutUiState.SCOUT_COLUMN_LIMITS.left + scoutUiState.SCOUT_COLUMN_LIMITS.right,
    available - scoutUiState.SCOUT_COLUMN_LIMITS.center
  );
  let left = Math.max(scoutUiState.SCOUT_COLUMN_LIMITS.left, Math.round(current.left));
  let right = Math.max(scoutUiState.SCOUT_COLUMN_LIMITS.right, Math.round(current.right));
  if (left + right > maxSides) {
    if (preferredSide === "left") {
      left = Math.max(scoutUiState.SCOUT_COLUMN_LIMITS.left, maxSides - right);
    } else if (preferredSide === "right") {
      right = Math.max(scoutUiState.SCOUT_COLUMN_LIMITS.right, maxSides - left);
    } else {
      const leftFlexible = left - scoutUiState.SCOUT_COLUMN_LIMITS.left;
      const rightFlexible = right - scoutUiState.SCOUT_COLUMN_LIMITS.right;
      const flexibleTotal = leftFlexible + rightFlexible;
      const targetFlexible = Math.max(
        0,
        maxSides - scoutUiState.SCOUT_COLUMN_LIMITS.left - scoutUiState.SCOUT_COLUMN_LIMITS.right
      );
      const ratio = flexibleTotal > 0 ? Math.min(1, targetFlexible / flexibleTotal) : 0;
      left = scoutUiState.SCOUT_COLUMN_LIMITS.left + Math.round(leftFlexible * ratio);
      right = scoutUiState.SCOUT_COLUMN_LIMITS.right + Math.round(rightFlexible * ratio);
    }
  }
  return { left, right };
}

export function applyScoutColumnLayout(preferredSide = "") {
  if (
    !scoutUiState.elScoutGrid ||
    scoutUiState.elScoutGrid.clientWidth <= 0 ||
    window.matchMedia("(max-width: 900px)").matches
  ) return;
  const widths = resolveScoutColumnWidths(preferredSide);
  const layoutKey = `${scoutUiState.elScoutGrid.clientWidth}:${widths.left}:${widths.right}`;
  if (layoutKey === scoutUiState.elScoutGrid.__volleyEyeColumnLayoutKey) return;
  scoutUiState.elScoutGrid.__volleyEyeColumnLayoutKey = layoutKey;
  scoutUiState.elScoutGrid.style.setProperty("--scout-left-width", `${widths.left}px`);
  scoutUiState.elScoutGrid.style.setProperty("--scout-right-width", `${widths.right}px`);
  if (scoutUiState.elScoutResizeLeft) scoutUiState.elScoutResizeLeft.setAttribute("aria-valuenow", String(widths.left));
  if (scoutUiState.elScoutResizeRight) scoutUiState.elScoutResizeRight.setAttribute("aria-valuenow", String(widths.right));
}

export function setScoutColumnWidth(side, width, persist = true) {
  if (side !== "left" && side !== "right") return;
  const current = ensureScoutColumnState();
  current[side] = Math.max(scoutUiState.SCOUT_COLUMN_LIMITS[side], Math.round(width));
  const resolved = resolveScoutColumnWidths(side);
  current[side] = resolved[side];
  applyScoutColumnLayout(side);
  if (persist) saveState({ persistLocal: true });
}

export function stopScoutColumnResize() {
  if (!scoutUiState.activeScoutColumnResizeSession) return;
  const { side, currentWidth, onMove, onUp } = scoutUiState.activeScoutColumnResizeSession;
  scoutUiState.activeScoutColumnResizeSession = null;
  document.body.classList.remove("scout-columns-resizing");
  unlistenRuntime(window, "pointermove", onMove);
  unlistenRuntime(window, "pointerup", onUp);
  unlistenRuntime(window, "pointercancel", onUp);
  setScoutColumnWidth(side, currentWidth, true);
}

export function startScoutColumnResize(event, side) {
  if (side !== "left" && side !== "right") return;
  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (event.cancelable) event.preventDefault();
  const startX = event.clientX;
  const startWidth = resolveScoutColumnWidths(side)[side];
  const onMove = moveEvent => {
    if (!scoutUiState.activeScoutColumnResizeSession) return;
    const delta = moveEvent.clientX - startX;
    const nextWidth = startWidth + (side === "left" ? delta : -delta);
    scoutUiState.activeScoutColumnResizeSession.currentWidth = nextWidth;
    setScoutColumnWidth(side, nextWidth, false);
  };
  const onUp = () => stopScoutColumnResize();
  scoutUiState.activeScoutColumnResizeSession = { side, currentWidth: startWidth, onMove, onUp };
  document.body.classList.add("scout-columns-resizing");
  listenRuntime(window, "pointermove", onMove);
  listenRuntime(window, "pointerup", onUp);
  listenRuntime(window, "pointercancel", onUp);
}

export function bindScoutColumnResizeHandle(handle, side) {

return;
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









export function setAttackTrajectoryCourtSizing(isCourt) {
  if (!scoutUiState.attackTrajectoryCourtSizingEls.content) {
    scoutUiState.attackTrajectoryCourtSizingEls.content = scoutUiState.elAttackTrajectoryModal?.querySelector(".attack-trajectory-content") || null;
    scoutUiState.attackTrajectoryCourtSizingEls.body = scoutUiState.elAttackTrajectoryModal?.querySelector(".attack-trajectory-body") || null;
    scoutUiState.attackTrajectoryCourtSizingEls.stage = scoutUiState.elAttackTrajectoryModal?.querySelector(".attack-trajectory-stage") || null;
  }
  const { content, body, stage } = scoutUiState.attackTrajectoryCourtSizingEls;
  if (isCourt) {
    if (content) {
      content.style.width = "100%";
      content.style.height = "100%";
      content.style.maxHeight = "100%";
      content.style.minHeight = "0";
      content.style.display = "grid";
      content.style.gridTemplateRows = "1fr auto";
      content.style.overflow = "hidden";
    }
    if (body) {
      body.style.flex = "1 1 auto";
      body.style.height = "100%";
      body.style.minHeight = "0";
    }
    if (stage) {
      stage.style.flex = "1 1 auto";
      stage.style.height = "100%";
      stage.style.minHeight = "0";
      stage.style.maxHeight = "100%";
    }
  } else {
    if (content) {
      content.style.width = "";
      content.style.height = "";
      content.style.maxHeight = "";
      content.style.minHeight = "";
      content.style.display = "";
      content.style.gridTemplateRows = "";
      content.style.overflow = "";
    }
    if (body) {
      body.style.flex = "";
      body.style.height = "";
      body.style.minHeight = "";
    }
    if (stage) {
      stage.style.flex = "";
      stage.style.height = "";
      stage.style.minHeight = "";
      stage.style.maxHeight = "";
    }
  }
}



export function updateCourtModalPlacement() {
  const useCourt = isDesktopCourtModalLayout();
  document.body.classList.toggle("desktop-court-modal", useCourt);
  scoutUiState.courtOverlayEl = document.getElementById("court-overlay");
  courtPlacementStore.publish({ useCourt, popupIds: scoutUiState.courtModalElements.filter(modal => modal?.classList.contains("force-popup")).map(modal => modal.id) });
}

export function restoreModalToPopup(modal) {
  if (!modal) return;
  const current = courtPlacementStore.getSnapshot();
  courtPlacementStore.publish({ popupIds: [...new Set([...current.popupIds, modal.id])] });
}



















