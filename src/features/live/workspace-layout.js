import { session } from "../state/live-workspace-layout.js";
import { workspaceStore } from '../../state/workspace-store.mjs';
import { session as matchState } from "../../../js/globals.js";
import { session as trajectoriesState } from "../state/live-trajectories.js";
import { saveState } from "../storage/save-state.js";
import { unlistenRuntime, listenRuntime } from "../../app/browser-effects.js";
import { renderEventsLog } from "../video/video-events.js";



const workspaceLayoutState = session;

export function getDefaultScoutWidgetLayout() {
  return {
    customized: false,
    "center-top": matchState.state.useOpponentTeam ? [] : ["video"],
    "center-bottom": [],
    right: matchState.state.useOpponentTeam
      ? ["video", "dvw", "events", "serve-trajectories"]
      : ["dvw", "events", "serve-trajectories"]
  };
}

export function normalizeScoutWidgetLayout() {
  const raw = matchState.state.uiScoutWidgetLayout && typeof matchState.state.uiScoutWidgetLayout === "object"
    ? matchState.state.uiScoutWidgetLayout
    : null;
  if (!raw || raw.customized !== true) {
    matchState.state.uiScoutWidgetLayout = getDefaultScoutWidgetLayout();
    return matchState.state.uiScoutWidgetLayout;
  }
  const normalized = { customized: true, "center-top": [], "center-bottom": [], right: [] };
  const used = new Set();
  trajectoriesState.SCOUT_WIDGET_ZONE_IDS.forEach(zoneId => {
    const entries = Array.isArray(raw[zoneId]) ? raw[zoneId] : [];
    entries.forEach(widgetId => {
      if (!trajectoriesState.SCOUT_WIDGET_IDS.includes(widgetId) || used.has(widgetId)) return;
      normalized[zoneId].push(widgetId);
      used.add(widgetId);
    });
  });
  trajectoriesState.SCOUT_WIDGET_IDS.forEach(widgetId => {
    if (!used.has(widgetId)) normalized.right.push(widgetId);
  });
  matchState.state.uiScoutWidgetLayout = normalized;
  return normalized;
}

export function getScoutWidgetZone(zoneId) {
  return document.querySelector(`[data-scout-widget-zone="${zoneId}"]`);
}

export function applyScoutWidgetLayout() {
  const layout = normalizeScoutWidgetLayout();
  const previous = workspaceStore.getSnapshot().layout;
  const next = previous && JSON.stringify(previous) === JSON.stringify(layout) ? previous
    : Object.freeze({ customized: layout.customized, ...Object.fromEntries(
      trajectoriesState.SCOUT_WIDGET_ZONE_IDS.map(zone => [zone, Object.freeze([...layout[zone]])])) });
  workspaceStore.publish({ layout: next, videoVisible: !!matchState.state.videoScoutMode });
}

export function saveScoutWidgetLayout() {
  matchState.state.uiScoutWidgetLayout = { ...normalizeScoutWidgetLayout(), customized: true };
  saveState({ persistLocal: true });
}

function placeScoutWidget(widget, zone, before = null) {
  if (!widget || !zone) return;
  const widgetId = widget.dataset.scoutWidget, zoneId = zone.dataset.scoutWidgetZone;
  if (!trajectoriesState.SCOUT_WIDGET_IDS.includes(widgetId) || !trajectoriesState.SCOUT_WIDGET_ZONE_IDS.includes(zoneId)) return;
  const layout = normalizeScoutWidgetLayout();
  const next = { customized: true, ...Object.fromEntries(trajectoriesState.SCOUT_WIDGET_ZONE_IDS.map(id =>
    [id, layout[id].filter(widget => widget !== widgetId)])) };
  const index = before ? next[zoneId].indexOf(before.dataset.scoutWidget) : -1;
  next[zoneId].splice(index < 0 ? next[zoneId].length : index, 0, widgetId);
  matchState.state.uiScoutWidgetLayout = next;
  applyScoutWidgetLayout();
}

export function moveScoutWidgetInZone(widget, zone, clientY) {
  if (!widget || !zone) return;
  const siblings = Array.from(zone.querySelectorAll(":scope > [data-scout-widget]"))
    .filter(candidate => candidate !== widget && !candidate.classList.contains("hidden"));
  const before = siblings.find(candidate => {
    const rect = candidate.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  placeScoutWidget(widget, zone, before);
}

export function moveScoutWidgetAtPointer(widget, clientX, clientY) {
  const target = document.elementFromPoint(clientX, clientY);
  let zone = target && target.closest ? target.closest("[data-scout-widget-zone]") : null;
  if (!zone && target && target.closest && target.closest(".scout-col-right")) {
    zone = getScoutWidgetZone("right");
  }
  if (!zone || !trajectoriesState.activeScoutWidgetDrag) return;
  trajectoriesState.activeScoutWidgetDrag.pendingZone = zone;
  trajectoriesState.activeScoutWidgetDrag.pendingClientY = clientY;
  const drag = workspaceStore.getSnapshot().drag;
  if (drag && drag.target !== zone.dataset.scoutWidgetZone)
    workspaceStore.publish({ drag: Object.freeze({ ...drag, target: zone.dataset.scoutWidgetZone }) });
}

export function showScoutWidgetDragState(widget) {
  const drag = trajectoriesState.activeScoutWidgetDrag;
  workspaceStore.publish({ drag: Object.freeze({ widget: widget.dataset.scoutWidget,
    label: trajectoriesState.SCOUT_WIDGET_LABELS[widget.dataset.scoutWidget] || 'Pannello',
    x: drag.startX, y: drag.startY, target: null }) });
}

export function positionScoutWidgetDragGhost(clientX, clientY) {
  const drag = workspaceStore.getSnapshot().drag;
  if (drag) workspaceStore.publish({ drag: Object.freeze({ ...drag, x: clientX, y: clientY }) });
}

export function finishScoutWidgetDrag(cancelled = false) {
  if (!trajectoriesState.activeScoutWidgetDrag) return;
  const {
    widget,
    pendingZone,
    pendingClientY,
    handle,
    pointerId,
    moved
  } = trajectoriesState.activeScoutWidgetDrag;
  if (!cancelled && moved && pendingZone) {
    moveScoutWidgetInZone(widget, pendingZone, pendingClientY);
  }
  if (handle && handle.releasePointerCapture && pointerId !== null && pointerId !== undefined) {
    try {
      handle.releasePointerCapture(pointerId);
    } catch (_) {
      // Il browser può aver già rilasciato la cattura al pointerup.
    }
  }
  workspaceStore.publish({ drag: null });
  unlistenRuntime(window, "pointermove", handleScoutWidgetPointerMove);
  unlistenRuntime(window, "pointerup", handleScoutWidgetPointerUp);
  unlistenRuntime(window, "pointercancel", handleScoutWidgetPointerCancel);
  trajectoriesState.activeScoutWidgetDrag = null;
  if (moved && !cancelled) saveScoutWidgetLayout();
}

export function handleScoutWidgetPointerDown(event, widget) {
  if (event.button !== undefined && event.button !== 0) return;
  if (event.cancelable) event.preventDefault();
  const handle = event.currentTarget;
  trajectoriesState.activeScoutWidgetDrag = {
    widget,
    handle,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
  if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
  listenRuntime(window, "pointermove", handleScoutWidgetPointerMove, { passive: false });
  listenRuntime(window, "pointerup", handleScoutWidgetPointerUp);
  listenRuntime(window, "pointercancel", handleScoutWidgetPointerCancel);
}

export function handleScoutWidgetPointerMove(event) {
  const session = trajectoriesState.activeScoutWidgetDrag;
  if (!session || session.pointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
  if (!session.moved && distance < 6) return;
  if (event.cancelable) event.preventDefault();
  if (!session.moved) {
    session.moved = true;
    showScoutWidgetDragState(session.widget);
  }
  positionScoutWidgetDragGhost(event.clientX, event.clientY);
  moveScoutWidgetAtPointer(session.widget, event.clientX, event.clientY);
}

export function handleScoutWidgetPointerUp() {
  finishScoutWidgetDrag(false);
}

export function handleScoutWidgetPointerCancel() {
  finishScoutWidgetDrag(true);
}

export function moveScoutWidgetWithKeyboard(event, widget) {
  const zone = widget.parentElement;
  if (!zone || !zone.matches("[data-scout-widget-zone]")) return;
  const zoneId = zone.dataset.scoutWidgetZone;
  const siblings = Array.from(zone.querySelectorAll(":scope > [data-scout-widget]"));
  const index = siblings.indexOf(widget);
  let destination = zone;
  let before = null;
  if (event.key === "ArrowUp") {
    if (index > 0) before = siblings[index - 1];
    else if (zoneId === "center-bottom") destination = getScoutWidgetZone("center-top");
    else return;
  } else if (event.key === "ArrowDown") {
    if (index < siblings.length - 1) before = siblings[index + 1].nextElementSibling;
    else if (zoneId === "center-top") destination = getScoutWidgetZone("center-bottom");
    else return;
  } else if (event.key === "ArrowLeft") {
    if (zoneId === "center-top") return;
    destination = getScoutWidgetZone("center-top");
  } else if (event.key === "ArrowRight") {
    if (zoneId === "right") return;
    destination = getScoutWidgetZone("right");
  } else {
    return;
  }
  if (!destination) return;
  event.preventDefault();
  placeScoutWidget(widget, destination, destination === zone ? before : null);
  saveScoutWidgetLayout();
  const handle = widget.querySelector(":scope > .scout-widget-handle");
  if (handle) handle.focus();
}

export function bindScoutWidgetLayout() { applyScoutWidgetLayout(); }

export function relocateVideoScoutContainer() {
  applyScoutWidgetLayout();
}

export function updateVideoScoutModeLayout() {
  if (!matchState.elVideoScoutContainer) return;
  const useScout = !!matchState.state.videoScoutMode;
  workspaceStore.publish({ videoVisible: useScout });
  if (typeof matchState.elVideoScoutControls !== "undefined" && matchState.elVideoScoutControls) {
    matchState.elVideoScoutControls.classList.toggle("hidden", !useScout);
  }
  relocateVideoScoutContainer();
  renderEventsLog({ suppressScroll: true });
  if (!useScout) {
    if (matchState.elAnalysisVideoScout) {
      matchState.elAnalysisVideoScout.pause();
    }
    if (workspaceLayoutState.ytPlayerScout && typeof workspaceLayoutState.ytPlayerScout.pauseVideo === "function") {
      workspaceLayoutState.ytPlayerScout.pauseVideo();
    }
  }
}
