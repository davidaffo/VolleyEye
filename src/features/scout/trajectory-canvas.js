import { clamp01 } from "../../domain/trajectory-geometry.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { trajectoryModalStore } from "../../state/roster-import-store.mjs";

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
  const x = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar ? 1 - clamp01(start.x) : clamp01(start.x);
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
