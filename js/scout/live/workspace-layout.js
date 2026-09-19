function getDefaultScoutWidgetLayout() {
  return {
    customized: false,
    "center-top": state.useOpponentTeam ? [] : ["video"],
    "center-bottom": [],
    right: state.useOpponentTeam
      ? ["video", "dvw", "events", "serve-trajectories"]
      : ["dvw", "events", "serve-trajectories"]
  };
}
function normalizeScoutWidgetLayout() {
  const raw = state.uiScoutWidgetLayout && typeof state.uiScoutWidgetLayout === "object"
    ? state.uiScoutWidgetLayout
    : null;
  if (!raw || raw.customized !== true) {
    state.uiScoutWidgetLayout = getDefaultScoutWidgetLayout();
    return state.uiScoutWidgetLayout;
  }
  const normalized = { customized: true, "center-top": [], "center-bottom": [], right: [] };
  const used = new Set();
  SCOUT_WIDGET_ZONE_IDS.forEach(zoneId => {
    const entries = Array.isArray(raw[zoneId]) ? raw[zoneId] : [];
    entries.forEach(widgetId => {
      if (!SCOUT_WIDGET_IDS.includes(widgetId) || used.has(widgetId)) return;
      normalized[zoneId].push(widgetId);
      used.add(widgetId);
    });
  });
  SCOUT_WIDGET_IDS.forEach(widgetId => {
    if (!used.has(widgetId)) normalized.right.push(widgetId);
  });
  state.uiScoutWidgetLayout = normalized;
  return normalized;
}
function getScoutWidgetZone(zoneId) {
  return document.querySelector(`[data-scout-widget-zone="${zoneId}"]`);
}
function applyScoutWidgetLayout() {
  const layout = normalizeScoutWidgetLayout();
  SCOUT_WIDGET_ZONE_IDS.forEach(zoneId => {
    const zone = getScoutWidgetZone(zoneId);
    if (!zone) return;
    layout[zoneId].forEach(widgetId => {
      const widget = document.querySelector(`[data-scout-widget="${widgetId}"]`);
      if (widget) zone.appendChild(widget);
    });
  });
}
function saveScoutWidgetLayout() {
  const layout = { customized: true, "center-top": [], "center-bottom": [], right: [] };
  SCOUT_WIDGET_ZONE_IDS.forEach(zoneId => {
    const zone = getScoutWidgetZone(zoneId);
    if (!zone) return;
    layout[zoneId] = Array.from(zone.querySelectorAll(":scope > [data-scout-widget]"))
      .map(widget => widget.dataset.scoutWidget)
      .filter(widgetId => SCOUT_WIDGET_IDS.includes(widgetId));
  });
  state.uiScoutWidgetLayout = layout;
  saveState({ persistLocal: true });
}
function moveScoutWidgetInZone(widget, zone, clientY) {
  if (!widget || !zone) return;
  const siblings = Array.from(zone.querySelectorAll(":scope > [data-scout-widget]"))
    .filter(candidate => candidate !== widget && !candidate.classList.contains("hidden"));
  const before = siblings.find(candidate => {
    const rect = candidate.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });
  zone.insertBefore(widget, before || null);
  document.querySelectorAll("[data-scout-widget-zone]").forEach(candidate => {
    candidate.classList.toggle("is-drop-target", candidate === zone);
  });
}
function moveScoutWidgetAtPointer(widget, clientX, clientY) {
  const target = document.elementFromPoint(clientX, clientY);
  let zone = target && target.closest ? target.closest("[data-scout-widget-zone]") : null;
  if (!zone && target && target.closest && target.closest(".scout-col-right")) {
    zone = getScoutWidgetZone("right");
  }
  if (!zone || !activeScoutWidgetDrag) return;
  activeScoutWidgetDrag.pendingZone = zone;
  activeScoutWidgetDrag.pendingClientY = clientY;
  document.querySelectorAll("[data-scout-widget-zone]").forEach(candidate => {
    candidate.classList.toggle("is-drop-target", candidate === zone);
  });
}
function showScoutWidgetDragState(widget) {
  widget.classList.add("is-dragging");
  document.body.classList.add("scout-widget-dragging");
  const ghost = document.createElement("div");
  ghost.className = "scout-widget-drag-ghost";
  ghost.textContent = SCOUT_WIDGET_LABELS[widget.dataset.scoutWidget] || "Pannello";
  document.body.appendChild(ghost);
  if (activeScoutWidgetDrag) activeScoutWidgetDrag.ghost = ghost;
}
function positionScoutWidgetDragGhost(clientX, clientY) {
  const ghost = activeScoutWidgetDrag && activeScoutWidgetDrag.ghost;
  if (!ghost) return;
  ghost.style.transform = `translate3d(${Math.round(clientX + 12)}px, ${Math.round(clientY + 12)}px, 0)`;
}
function finishScoutWidgetDrag(cancelled = false) {
  if (!activeScoutWidgetDrag) return;
  const {
    widget,
    originParent,
    originNextSibling,
    pendingZone,
    pendingClientY,
    ghost,
    handle,
    pointerId,
    moved
  } = activeScoutWidgetDrag;
  if (!cancelled && moved && pendingZone) {
    moveScoutWidgetInZone(widget, pendingZone, pendingClientY);
  }
  if (cancelled && moved && originParent) {
    originParent.insertBefore(
      widget,
      originNextSibling && originNextSibling.parentElement === originParent ? originNextSibling : null
    );
  }
  widget.classList.remove("is-dragging");
  if (ghost) ghost.remove();
  if (handle && handle.releasePointerCapture && pointerId !== null && pointerId !== undefined) {
    try {
      handle.releasePointerCapture(pointerId);
    } catch (_) {
      // Il browser può aver già rilasciato la cattura al pointerup.
    }
  }
  document.body.classList.remove("scout-widget-dragging");
  document.querySelectorAll("[data-scout-widget-zone]").forEach(zone => {
    zone.classList.remove("is-drop-target");
  });
  window.removeEventListener("pointermove", handleScoutWidgetPointerMove);
  window.removeEventListener("pointerup", handleScoutWidgetPointerUp);
  window.removeEventListener("pointercancel", handleScoutWidgetPointerCancel);
  activeScoutWidgetDrag = null;
  if (moved && !cancelled) saveScoutWidgetLayout();
}
function handleScoutWidgetPointerDown(event, widget) {
  if (event.button !== undefined && event.button !== 0) return;
  if (event.cancelable) event.preventDefault();
  const handle = event.currentTarget;
  activeScoutWidgetDrag = {
    widget,
    handle,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originParent: widget.parentElement,
    originNextSibling: widget.nextElementSibling,
    moved: false
  };
  if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", handleScoutWidgetPointerMove, { passive: false });
  window.addEventListener("pointerup", handleScoutWidgetPointerUp);
  window.addEventListener("pointercancel", handleScoutWidgetPointerCancel);
}
function handleScoutWidgetPointerMove(event) {
  const session = activeScoutWidgetDrag;
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
function handleScoutWidgetPointerUp() {
  finishScoutWidgetDrag(false);
}
function handleScoutWidgetPointerCancel() {
  finishScoutWidgetDrag(true);
}
function moveScoutWidgetWithKeyboard(event, widget) {
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
  destination.insertBefore(widget, destination === zone ? before : null);
  saveScoutWidgetLayout();
  const handle = widget.querySelector(":scope > .scout-widget-handle");
  if (handle) handle.focus();
}
function bindScoutWidgetLayout() {
  applyScoutWidgetLayout();
  document.querySelectorAll("[data-scout-widget]").forEach(widget => {
    if (widget.querySelector(":scope > .scout-widget-handle")) return;
    const widgetId = widget.dataset.scoutWidget;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "scout-widget-handle";
    handle.textContent = "⠿";
    handle.draggable = false;
    handle.title = "Trascina per spostare";
    handle.setAttribute("aria-label", `Sposta ${SCOUT_WIDGET_LABELS[widgetId] || "pannello"}`);
    handle.addEventListener("pointerdown", event => handleScoutWidgetPointerDown(event, widget));
    handle.addEventListener("keydown", event => moveScoutWidgetWithKeyboard(event, widget));
    widget.insertBefore(handle, widget.firstChild);
  });
  const reset = document.getElementById("btn-reset-scout-widgets");
  if (reset && reset.dataset.layoutBound !== "true") {
    reset.dataset.layoutBound = "true";
    reset.addEventListener("click", () => {
      state.uiScoutWidgetLayout = null;
      applyScoutWidgetLayout();
      saveState({ persistLocal: true });
    });
  }
}
function relocateVideoScoutContainer() {
  applyScoutWidgetLayout();
}
function updateVideoScoutModeLayout() {
  if (!elVideoScoutContainer) return;
  const useScout = !!state.videoScoutMode;
  elVideoScoutContainer.classList.toggle("hidden", !useScout);
  if (typeof elVideoScoutControls !== "undefined" && elVideoScoutControls) {
    elVideoScoutControls.classList.toggle("hidden", !useScout);
  }
  relocateVideoScoutContainer();
  renderEventsLog({ suppressScroll: true });
  if (!useScout) {
    if (elAnalysisVideoScout) {
      elAnalysisVideoScout.pause();
    }
    if (ytPlayerScout && typeof ytPlayerScout.pauseVideo === "function") {
      ytPlayerScout.pauseVideo();
    }
  }
}
let videoObjectUrl = "";
let ytPlayer = null;
let ytApiPromise = null;
let ytPlayerReady = false;
let currentYoutubeId = "";
let youtubeFallback = false;
let pendingYoutubeSeek = null;
let ytPlayerScout = null;
let ytPlayerScoutReady = false;
let currentYoutubeIdScout = "";
let youtubeScoutFallback = false;
let lastVideoSnapshotMs = 0;
let videoSnapshotTimer = null;
let playByPlayTimer = null;
const playByPlayState = {
  active: false,
  index: -1,
  key: null,
  endTime: null,
  endAtMs: null
};
let bulkEditActive = false;
let bulkEditSession = null;
const videoUndoStack = [];
const VIDEO_UNDO_LIMIT = 30;
const BASE_KEY_MAP = {
  "1": "K1",
  "2": "K2",
  C: "KC",
  B: "KB",
  "7": "K7",
  F: "KF"
};
let baseModalTargetEvents = [];
let setterModalTargetEvents = [];
const ATTACK_TYPE_KEY_MAP = {
  R: "Regolare",
  P: "Pallonetto",
  Z: "Piazzata",
  S: "Spinta"
};
let attackTypeModalTargetEvents = [];
const BLOCK_NUMBER_KEY_MAP = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3
};
let blockNumberModalTargetEvents = [];
