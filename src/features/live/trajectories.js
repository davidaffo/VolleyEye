import { mirrorTrajectoryPoint, getAttackZone, clamp01 } from "../../domain/trajectory-geometry.js";
import { session } from "../state/live-trajectories.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { setAttackTrajectoryCourtSizing, updateCourtModalPlacement, restoreModalToPopup } from "../scout-ui.js";
import { getTrajectoryImageForZone } from "../analysis/trajectory-assets.js";
import { isDesktopCourtModalLayout, setCourtAreaLocked, setModalOpenState } from "../layout/modals.js";
import { getTeamScopeFromEvent, isFarSideForScope } from "../teams/selectors.js";

import { trajectoryModalStore } from "../../state/roster-import-store.mjs";
import { publishReactTrajectoryImage, publishReactTrajectoryModal } from "../scout/trajectory-dialog.js";
import { session as matchState } from "../../../js/globals.js";
import { setServeTypeSelection, cancelPartialSkillFlowForScope } from "./skill-selection.js";
import { unlistenRuntime, listenRuntime, session as browserEffectsState } from "../../app/browser-effects.js";
import { renderLogServeTrajectories, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { suppressTransientClicks } from "./lineup-editor.js";
import { saveState } from "../storage/save-state.js";
import { renderEventsLog } from "../video/video-events.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { enforceAutoLiberoForState } from "../teams/court-state-model.js";
import { renderPlayers } from "./team-rendering.js";
import { updateNextSkillIndicator } from "./game-flow.js";



const trajectoriesState = session;

export function resetTrajectoryState() {
  scoutUiState.trajectoryStart = null;
  scoutUiState.trajectoryEnd = null;
  scoutUiState.trajectoryDragging = false;
  if (scoutUiState.elAttackTrajectoryCanvas) {
    const ctx = scoutUiState.elAttackTrajectoryCanvas.getContext("2d");
    ctx && ctx.clearRect(0, 0, scoutUiState.elAttackTrajectoryCanvas.width, scoutUiState.elAttackTrajectoryCanvas.height);
  }
}

export function resizeTrajectoryCanvas() {
  if (!scoutUiState.elAttackTrajectoryCanvas || !scoutUiState.elAttackTrajectoryImage) return;
  const rect = scoutUiState.elAttackTrajectoryImage.getBoundingClientRect();
  const canvas = scoutUiState.elAttackTrajectoryCanvas;
  const height = rect.height;
  canvas.width = rect.width;
  canvas.height = height;
  canvas.style.width = rect.width + "px";
  canvas.style.height = height + "px";
  if (canvas.parentElement) {
    const inCourtModal = !!(scoutUiState.elAttackTrajectoryModal && scoutUiState.elAttackTrajectoryModal.classList.contains("court-modal"));
    canvas.parentElement.style.height = inCourtModal ? "" : height + "px";
  }
  drawTrajectory();
}

export function drawTrajectory(tempEnd = null) {
  if (!scoutUiState.elAttackTrajectoryCanvas) return;
  const ctx = scoutUiState.elAttackTrajectoryCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, scoutUiState.elAttackTrajectoryCanvas.width, scoutUiState.elAttackTrajectoryCanvas.height);
  const start = scoutUiState.trajectoryStart;
  const end = tempEnd || scoutUiState.trajectoryEnd;
  if (scoutUiState.trajectoryMode === "serve-start") {
    const pt = start;
    if (pt) {
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (scoutUiState.trajectoryMode === "serve-end") {
    const pt = end || start;
    if (pt) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (start) {
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (start && end) {
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function getTrajectoryDisplayBox() {
  if (!scoutUiState.elAttackTrajectoryCanvas || !scoutUiState.elAttackTrajectoryImage) return null;
  const stageW = scoutUiState.elAttackTrajectoryCanvas.clientWidth || scoutUiState.elAttackTrajectoryCanvas.width || 1;
  const stageH = scoutUiState.elAttackTrajectoryCanvas.clientHeight || scoutUiState.elAttackTrajectoryCanvas.height || 1;
  const natW = scoutUiState.elAttackTrajectoryImage.naturalWidth || stageW;
  const natH = scoutUiState.elAttackTrajectoryImage.naturalHeight || stageH;
  if (!natW || !natH) return { offsetX: 0, offsetY: 0, width: stageW, height: stageH };
  const scale = Math.min(stageW / natW, stageH / natH);
  const dispW = natW * scale;
  const dispH = natH * scale;
  const offsetX = (stageW - dispW) / 2;
  const offsetY = (stageH - dispH) / 2;
  return { offsetX, offsetY, width: dispW, height: dispH };
}

export function denormalizeTrajectoryPoint(norm) {
  const box = getTrajectoryDisplayBox();
  if (!box || !norm) return null;
  return {
    x: box.offsetX + clamp01(norm.x || 0) * box.width,
    y: box.offsetY + clamp01(norm.y || 0) * box.height
  };
}

export function normalizeTrajectoryPoint(pt) {
  if (!scoutUiState.elAttackTrajectoryCanvas || !pt) return null;
  const box = getTrajectoryDisplayBox();
  if (!box) return { x: 0, y: 0 };
  const relX = (pt.x - box.offsetX) / (box.width || 1);
  const relY = (pt.y - box.offsetY) / (box.height || 1);
  return {
    x: clamp01(relX),
    y: clamp01(relY)
  };
}









export function getTrajectoryNetPoint(id) {
  if (!id) return null;
  return scoutUiState.TRAJECTORY_NET_POINTS.find(point => point.id === id) || null;
}

export function getDefaultTrajectoryNetPointId(baseZone, setType) {
  if (setType === "fast") return "6-F";
  if ((setType || "").toLowerCase() === "damp") return "4";
  if (baseZone === 4 || baseZone === 5) return "5";
  if (baseZone === 3 || baseZone === 6) return "3";
  if (baseZone === 2 || baseZone === 1) return "6-F";
  return "3";
}

export function getNearestTrajectoryNetPointId(start) {
  if (!start) return null;
  const x = clamp01(start.x);
  let closest = scoutUiState.TRAJECTORY_NET_POINTS[0];
  let best = Math.abs(x - closest.x);
  for (let i = 1; i < scoutUiState.TRAJECTORY_NET_POINTS.length; i++) {
    const candidate = scoutUiState.TRAJECTORY_NET_POINTS[i];
    const diff = Math.abs(x - candidate.x);
    if (diff < best) {
      best = diff;
      closest = candidate;
    }
  }
  return closest ? closest.id : null;
}

export function setTrajectoryNetPointId(id) {
  scoutUiState.trajectoryNetPointId = id;
  if (!scoutUiState.elAttackTrajectoryNetpoints) return;
  trajectoryModalStore.publish({netPoint:id});return;

}

export function updateTrajectoryImageFromStart() {
  if (scoutUiState.trajectoryMode !== "attack") return;
  if (!scoutUiState.trajectoryStart || !scoutUiState.elAttackTrajectoryImage) return;
  const startNorm = normalizeTrajectoryPoint(scoutUiState.trajectoryStart);
  if (!startNorm) return;
  const mirrorX = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
  const zoneNorm = mirrorX
    ? { x: 1 - clamp01(startNorm.x), y: clamp01(startNorm.y) }
    : startNorm;
  const startZoneRaw = getAttackZone(zoneNorm, scoutUiState.trajectoryForceFar);
  const imgSrc = getTrajectoryImageForZone(startZoneRaw, scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar);
  if (scoutUiState.elAttackTrajectoryImage.dataset.activeSrc !== imgSrc) {
    scoutUiState.elAttackTrajectoryImage.dataset.activeSrc = imgSrc;
    publishReactTrajectoryImage(imgSrc);
  }
}

export function applyTrajectoryStartFromNetPoint() {
  if (scoutUiState.trajectoryMode !== "attack") return;
  const point = getTrajectoryNetPoint(scoutUiState.trajectoryNetPointId);
  if (!point || !scoutUiState.elAttackTrajectoryCanvas) return;
  const box = getTrajectoryDisplayBox();
  const canvas = scoutUiState.elAttackTrajectoryCanvas;
  const mirrorX = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
  const normX = mirrorX ? 1 - point.x : point.x;
  const x = box ? box.offsetX + normX * box.width : normX * canvas.width;
  const startFromTop = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
  const fixedY = box
    ? box.offsetY + (startFromTop ? 0.5 : box.height - 0.5)
    : startFromTop
      ? 0.5
      : canvas.height - 0.5;
  scoutUiState.trajectoryStart = { x, y: fixedY };
  updateTrajectoryImageFromStart();
  drawTrajectory();
}

export function openAttackTrajectoryModal(prefill = null) {
  return new Promise(resolve => {
    if (!scoutUiState.elAttackTrajectoryModal || !scoutUiState.elAttackTrajectoryCanvas || !scoutUiState.elAttackTrajectoryImage) {
      resolve(null);
      return;
    }
    const forcePopup = !!(prefill && prefill.forcePopup);
    scoutUiState.attackTrajectoryForcePopup = forcePopup;
    if (!forcePopup) {
      scoutUiState.elAttackTrajectoryModal.classList.remove("force-popup");
      if (isDesktopCourtModalLayout()) {
        setCourtAreaLocked(true);
        setAttackTrajectoryCourtSizing(true);
      }
      updateCourtModalPlacement();
    } else {
      scoutUiState.elAttackTrajectoryModal.classList.add("force-popup");
      setAttackTrajectoryCourtSizing(false);
      restoreModalToPopup(scoutUiState.elAttackTrajectoryModal);
    }
    const scope = prefill && prefill.scope ? prefill.scope : "our";
    const mirrorFlag = scope === "opponent" ? matchState.state.opponentCourtViewMirrored : matchState.state.courtViewMirrored;
    scoutUiState.trajectoryForceFar = !!(prefill && prefill.forceFar);
    scoutUiState.trajectoryMirror = !forcePopup && !!mirrorFlag && !scoutUiState.trajectoryForceFar;
    const mode = (prefill && prefill.mode) || "attack";
    scoutUiState.trajectoryMode = mode;
    scoutUiState.serveTrajectoryScope = mode === "serve-start" || mode === "serve-end" ? scope : null;
    scoutUiState.trajectoryBaseZone = prefill && prefill.baseZone ? prefill.baseZone : null;
    scoutUiState.trajectorySetType = prefill && prefill.setType ? prefill.setType : null;
    scoutUiState.trajectoryResolver = resolve;
    resetTrajectoryState();
    scoutUiState.trajectoryNetPointId = null;
    const simplified = !!matchState.state.attackTrajectorySimplified;
    if (scoutUiState.elAttackTrajectoryNetpoints) {
      const shouldShowNet = mode === "attack" && simplified;

    }
    if (scoutUiState.elServeTypeButtons) {

      if (mode === "serve-start") {
        setServeTypeSelection("JF");
      }
    }

    const getInitialImage = () => {
      if (scoutUiState.trajectoryForceFar) {
        if (mode === "serve-start") return scoutUiState.SERVE_START_IMG_FAR;
        if (mode === "serve-end") return scoutUiState.SERVE_END_IMG_FAR;
        return scoutUiState.TRAJECTORY_IMG_FAR;
      }
      if (mode === "serve-start") return scoutUiState.trajectoryMirror ? scoutUiState.SERVE_START_IMG_FAR : scoutUiState.SERVE_START_IMG_NEAR;
      if (mode === "serve-end") return scoutUiState.trajectoryMirror ? scoutUiState.SERVE_END_IMG_FAR : scoutUiState.SERVE_END_IMG_NEAR;
      return scoutUiState.trajectoryMirror ? scoutUiState.TRAJECTORY_IMG_FAR : scoutUiState.TRAJECTORY_IMG_NEAR;
    };
    scoutUiState.elAttackTrajectoryImage.dataset.activeSrc = getInitialImage();
    publishReactTrajectoryImage(getInitialImage());
    if (scoutUiState.serveTypeKeyHandler) {
      unlistenRuntime(window, "keydown", scoutUiState.serveTypeKeyHandler);
    }
    if (scoutUiState.trajectoryEscapeHandler) {
      unlistenRuntime(window, "keydown", scoutUiState.trajectoryEscapeHandler);
      scoutUiState.trajectoryEscapeHandler = null;
    }
    if (mode === "serve-start") {
      if (prefill && prefill.serveType) {
        setServeTypeSelection(prefill.serveType);
      }
      scoutUiState.serveTypeKeyHandler = e => {
        const key = (e.key || "").toUpperCase();
        if (key === "F" || key === "J" || key === "S") {
          setServeTypeSelection(key === "J" ? "JF" : key);
        }
      };
      listenRuntime(window, "keydown", scoutUiState.serveTypeKeyHandler);
    } else {
      scoutUiState.serveTypeKeyHandler = null;
    }
    scoutUiState.trajectoryEscapeHandler = e => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      closeAttackTrajectoryModal(null);
    };
    listenRuntime(window, "keydown", scoutUiState.trajectoryEscapeHandler);
    scoutUiState.elAttackTrajectoryModal.classList.remove("hidden");
    publishReactTrajectoryModal(true);
    setModalOpenState(true, forcePopup);
    renderLogServeTrajectories();
    const applyPrefill = () => {
      if (!scoutUiState.elAttackTrajectoryCanvas || scoutUiState.elAttackTrajectoryCanvas.width === 0 || scoutUiState.elAttackTrajectoryCanvas.height === 0) {
        return;
      }
      if (prefill && prefill.start && prefill.end) {
        const mirrorForDisplay = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
        const startNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.start) : prefill.start;
        const endNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.end) : prefill.end;
        const startPx = denormalizeTrajectoryPoint(startNorm);
        const endPx = denormalizeTrajectoryPoint(endNorm);
        if (!startPx || !endPx) return;
        scoutUiState.trajectoryStart = startPx;
        scoutUiState.trajectoryEnd = endPx;
        if (simplified) {
          const inferredNetPoint = getNearestTrajectoryNetPointId(startNorm);
          setTrajectoryNetPointId(inferredNetPoint || getDefaultTrajectoryNetPointId(scoutUiState.trajectoryBaseZone, scoutUiState.trajectorySetType));
        }
        updateTrajectoryImageFromStart();
        drawTrajectory();
        return;
      }
      if (mode === "serve-start" && prefill && prefill.start) {
        const mirrorForDisplay = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
        const startNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.start) : prefill.start;
        const startPx = denormalizeTrajectoryPoint(startNorm);
        if (startPx) {
          scoutUiState.trajectoryStart = startPx;
          drawTrajectory();
        }
      }
      if (mode === "serve-end" && prefill && prefill.end) {
        const mirrorForDisplay = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
        const endNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.end) : prefill.end;
        const endPx = denormalizeTrajectoryPoint(endNorm);
        if (endPx) {
          scoutUiState.trajectoryEnd = endPx;
          drawTrajectory();
        }
      }
      if (simplified && mode === "attack") {
        const defaultNetPoint = getDefaultTrajectoryNetPointId(scoutUiState.trajectoryBaseZone, scoutUiState.trajectorySetType);
        setTrajectoryNetPointId(defaultNetPoint);
        applyTrajectoryStartFromNetPoint();
      }
    };
    requestAnimationFrame(() => {
      resizeTrajectoryCanvas();
      browserEffectsState.setTimeout(() => {
        resizeTrajectoryCanvas();
        applyPrefill();
      }, 50);
    });
  });
}

export function closeAttackTrajectoryModal(result = null) {
  if (!scoutUiState.elAttackTrajectoryModal) return;
  scoutUiState.elAttackTrajectoryModal.classList.add("hidden");
  setModalOpenState(false, scoutUiState.attackTrajectoryForcePopup);
  setAttackTrajectoryCourtSizing(false);
  scoutUiState.elAttackTrajectoryModal.classList.remove("force-popup");
  scoutUiState.attackTrajectoryForcePopup = false;
  if (result) {
    suppressTransientClicks();
  }
  scoutUiState.trajectoryMirror = false;
  scoutUiState.trajectoryForceFar = false;
  scoutUiState.trajectoryBaseZone = null;
  scoutUiState.trajectorySetType = null;
  scoutUiState.trajectoryMode = "attack";
  scoutUiState.serveTrajectoryScope = null;
  if (scoutUiState.serveTypeKeyHandler) {
    unlistenRuntime(window, "keydown", scoutUiState.serveTypeKeyHandler);
    scoutUiState.serveTypeKeyHandler = null;
  }
  if (scoutUiState.trajectoryEscapeHandler) {
    unlistenRuntime(window, "keydown", scoutUiState.trajectoryEscapeHandler);
    scoutUiState.trajectoryEscapeHandler = null;
  }
  if (scoutUiState.trajectoryResolver) {
    scoutUiState.trajectoryResolver(result);
    scoutUiState.trajectoryResolver = null;
  }
  publishReactTrajectoryModal(false);
  renderLogServeTrajectories();
}

export async function captureServeTrajectory(event, { forcePopup = false } = {}) {
  try {
    const scope = getTeamScopeFromEvent(event);
    const forceFar = forcePopup ? false : isFarSideForScope(scope);
    const startRes = await openAttackTrajectoryModal({
      mode: "serve-start",
      start: event.serveStart || null,
      forcePopup,
      forceFar,
      scope
    });
    if (startRes && startRes.serveType) {
      event.serveType = startRes.serveType;
    }
    if (startRes && startRes.point) {
      event.serveStart = startRes.point;
    }
    const endRes = await openAttackTrajectoryModal({
      mode: "serve-end",
      end: event.serveEnd || null,
      forcePopup,
      forceFar,
      scope
    });
    if (endRes && endRes.point) {
      event.serveEnd = endRes.point;
    }
  } catch (err) {
    console.error("Errore cattura traiettoria servizio", err);
  } finally {
    saveState();
    renderEventsLog({ suppressScroll: true });
    renderVideoAnalysis();
    renderServeTrajectoryAnalysis();
  }
}

export function forceNextSkill(skillId, scope = "our") {
  if (!skillId) return;
  cancelPartialSkillFlowForScope(scope);
  matchState.state.predictiveSkillFlow = true;
  matchState.state.freeballPending = false;
  matchState.state.freeballPendingScope = scope;
  matchState.state.skillFlowOverride = null;
  matchState.state.opponentSkillFlowOverride = null;
  matchState.state.pendingServe = null;
  matchState.state.forceSkillActive = true;
  matchState.state.forceSkillScope = scope;
  if (scope === "opponent") {
    matchState.state.opponentSkillFlowOverride = skillId;
  } else {
    matchState.state.skillFlowOverride = skillId;
  }
  matchState.state.flowTeamScope = scope;
  if (scope === "our") {
    if (skillId === "serve" && !matchState.state.isServing) {
      matchState.state.isServing = true;
      matchState.state.autoRotatePending = false;
      enforceAutoLiberoForState({ skipServerOnServe: true });
    }
    if (skillId === "pass") {
      matchState.state.isServing = false;
      matchState.state.autoRotatePending = true;
      matchState.state.freeballPending = false;
      enforceAutoLiberoForState({ skipServerOnServe: true });
    }
  }
  saveState({ persistLocal: true });
  renderPlayers();
  updateNextSkillIndicator(skillId);
  const toggle = document.getElementById("predictive-skill-toggle");

}
