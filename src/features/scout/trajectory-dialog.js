import { session } from "../state/scout-trajectory-dialog.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getTrajectoryImageForZone } from "../analysis/trajectory-assets.js";
import { drawTrajectory, getDefaultTrajectoryNetPointId, setTrajectoryNetPointId, applyTrajectoryStartFromNetPoint, getTrajectoryDisplayBox, normalizeTrajectoryPoint, closeAttackTrajectoryModal } from "../live/trajectories.js";
import { mirrorTrajectoryPoint, mapBackRowZone, getAttackZone, computeAttackDirectionDeg } from "../../domain/trajectory-geometry.js";
import { session as matchState } from "../../../js/globals.js";
import { trajectoryModalStore } from "../../state/roster-import-store.mjs";



const trajectoryDialogState = session;

export function getReactTrajectoryPointerHandlers() {
  if (trajectoryDialogState.reactTrajectoryHandlers) return trajectoryDialogState.reactTrajectoryHandlers;
  const getPos = (e) => {
    if (!scoutUiState.elAttackTrajectoryCanvas) return null;
    const rect = scoutUiState.elAttackTrajectoryCanvas.getBoundingClientRect();
    const clientX =
      e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX);
    const clientY =
      e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
    if (clientX == null || clientY == null) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const onPointerDown = (e) => {
    const pos = getPos(e);
    if (!pos || !scoutUiState.elAttackTrajectoryCanvas) return;
    if (e.cancelable) e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (
      typeof scoutUiState.elAttackTrajectoryCanvas.setPointerCapture === "function" &&
      e.pointerId != null
    ) {
      scoutUiState.elAttackTrajectoryCanvas.setPointerCapture(e.pointerId);
    }
    if (scoutUiState.trajectoryMode === "serve-start") {
      scoutUiState.trajectoryStart = pos;
      scoutUiState.trajectoryEnd = null;
      scoutUiState.trajectoryDragging = true;
      drawTrajectory();
      return;
    }
    if (scoutUiState.trajectoryMode === "serve-end") {
      scoutUiState.trajectoryStart = null;
      scoutUiState.trajectoryEnd = pos;
      scoutUiState.trajectoryDragging = true;
      drawTrajectory();
      return;
    }
    if (matchState.state.attackTrajectorySimplified) {
      if (!scoutUiState.trajectoryStart) {
        if (!scoutUiState.trajectoryNetPointId) {
          const defaultNetPoint = getDefaultTrajectoryNetPointId(
            scoutUiState.trajectoryBaseZone,
            scoutUiState.trajectorySetType,
          );
          setTrajectoryNetPointId(defaultNetPoint);
        }
        applyTrajectoryStartFromNetPoint();
      }
      scoutUiState.trajectoryDragging = true;
      scoutUiState.trajectoryEnd = pos;
      drawTrajectory(pos);
      return;
    }
    if (!scoutUiState.trajectoryStart || scoutUiState.trajectoryEnd) {
      const box = getTrajectoryDisplayBox();
      const w = box
        ? box.width
        : scoutUiState.elAttackTrajectoryCanvas.clientWidth ||
          scoutUiState.elAttackTrajectoryCanvas.width ||
          1;
      const startFromTop = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
      const fixedY = box
        ? box.offsetY + (startFromTop ? 0.5 : box.height - 0.5)
        : startFromTop
          ? 0.5
          : scoutUiState.elAttackTrajectoryCanvas.height - 0.5; // partenza forzata sul bordo basso
      scoutUiState.trajectoryStart = { x: pos.x, y: fixedY };
      scoutUiState.trajectoryEnd = null;
      const xWithinStage = box ? pos.x - box.offsetX : pos.x;
      const third =
        xWithinStage < w / 3 ? 0 : xWithinStage < (2 * w) / 3 ? 1 : 2;
      const isFarSide = scoutUiState.trajectoryForceFar;
      const leftZone = isFarSide ? 5 : 4;
      const midZone = isFarSide ? 6 : 3;
      const rightZone = isFarSide ? 1 : 2;
      const zoneFromClickRaw = startFromTop
        ? third === 0
          ? rightZone
          : third === 1
            ? midZone
            : leftZone
        : third === 0
          ? leftZone
          : third === 1
            ? midZone
            : rightZone;
      const imgSrc = getTrajectoryImageForZone(
        zoneFromClickRaw,
        scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar,
      ); // mostra il campo della zona front-row
      if (
        scoutUiState.elAttackTrajectoryImage &&
        scoutUiState.elAttackTrajectoryImage.dataset.activeSrc !== imgSrc
      ) {
        scoutUiState.elAttackTrajectoryImage.dataset.activeSrc = imgSrc;
        publishReactTrajectoryImage(imgSrc);
      }
    }
    scoutUiState.trajectoryDragging = true;
    drawTrajectory();
  };
  const onPointerMove = (e) => {
    if (!scoutUiState.trajectoryDragging || (!scoutUiState.trajectoryStart && !scoutUiState.trajectoryEnd)) return;
    const pos = getPos(e);
    if (!pos) return;
    if (e.cancelable) e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (scoutUiState.trajectoryMode === "serve-start") {
      scoutUiState.trajectoryStart = pos;
      drawTrajectory();
      return;
    }
    if (scoutUiState.trajectoryMode === "serve-end") {
      scoutUiState.trajectoryEnd = pos;
      drawTrajectory();
      return;
    }
    drawTrajectory(pos);
  };
  const onPointerUp = (e) => {
    if (!scoutUiState.trajectoryDragging || (!scoutUiState.trajectoryStart && !scoutUiState.trajectoryEnd)) return;
    const pos = getPos(e);
    scoutUiState.trajectoryDragging = false;
    if (e.cancelable) e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (
      scoutUiState.elAttackTrajectoryCanvas &&
      typeof scoutUiState.elAttackTrajectoryCanvas.releasePointerCapture === "function" &&
      e.pointerId != null
    ) {
      scoutUiState.elAttackTrajectoryCanvas.releasePointerCapture(e.pointerId);
    }
    if (!pos) return;
    if (scoutUiState.trajectoryMode === "serve-start") {
      scoutUiState.trajectoryStart = pos;
      drawTrajectory();
      confirmCurrentTrajectory();
      return;
    }
    if (scoutUiState.trajectoryMode === "serve-end") {
      scoutUiState.trajectoryEnd = pos;
      drawTrajectory();
      confirmCurrentTrajectory();
      return;
    }
    scoutUiState.trajectoryEnd = pos;
    drawTrajectory();
    confirmCurrentTrajectory();
  };
  const confirmCurrentTrajectory = () => {
    if (scoutUiState.trajectoryMode === "serve-start") {
      if (!scoutUiState.trajectoryStart) return;
      const rawPoint = normalizeTrajectoryPoint(scoutUiState.trajectoryStart);
      const mirrorForStorage = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
      const point = mirrorForStorage
        ? mirrorTrajectoryPoint(rawPoint)
        : rawPoint;
      closeAttackTrajectoryModal({ point, serveType: scoutUiState.serveTrajectoryType });
      return;
    }
    if (scoutUiState.trajectoryMode === "serve-end") {
      const pt = scoutUiState.trajectoryEnd || scoutUiState.trajectoryStart;
      if (!pt) return;
      const rawPoint = normalizeTrajectoryPoint(pt);
      const mirrorForStorage = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
      const point = mirrorForStorage
        ? mirrorTrajectoryPoint(rawPoint)
        : rawPoint;
      closeAttackTrajectoryModal({ point });
      return;
    }
    if (!scoutUiState.trajectoryStart || !scoutUiState.trajectoryEnd) return;
    const rawStart = normalizeTrajectoryPoint(scoutUiState.trajectoryStart);
    const rawEnd = normalizeTrajectoryPoint(scoutUiState.trajectoryEnd);
    const mirrorForStorage = scoutUiState.trajectoryMirror || scoutUiState.trajectoryForceFar;
    const start = mirrorForStorage ? mirrorTrajectoryPoint(rawStart) : rawStart;
    const end = mirrorForStorage ? mirrorTrajectoryPoint(rawEnd) : rawEnd;
    const isFar = false;
    const startZone = mapBackRowZone(
      getAttackZone(start, isFar),
      scoutUiState.trajectoryBaseZone,
    );
    const endZone = mapBackRowZone(
      getAttackZone(end, isFar),
      scoutUiState.trajectoryBaseZone,
    );
    const directionDeg = computeAttackDirectionDeg(start, end);
    closeAttackTrajectoryModal({
      start,
      end,
      startZone,
      endZone,
      directionDeg,
    });
  };
  return (trajectoryDialogState.reactTrajectoryHandlers = {
    down: onPointerDown,
    move: onPointerMove,
    up: onPointerUp,
  });
}

export function handleReactTrajectoryPointer(kind, event) {
  getReactTrajectoryPointerHandlers()[kind]?.(event);
}

export function chooseReactTrajectoryNetPoint(id) {
  if (!id) return;
  setTrajectoryNetPointId(id);
  scoutUiState.trajectoryEnd = null;
  applyTrajectoryStartFromNetPoint();
}

export function publishReactTrajectoryImage(source) {
  if (scoutUiState.elAttackTrajectoryImage)
    scoutUiState.elAttackTrajectoryImage.dataset.activeSrc = source;
  trajectoryModalStore.publish({ source });
}

export function publishReactTrajectoryModal(open) {
  const mode = scoutUiState.trajectoryMode,
    simplified = !!matchState.state.attackTrajectorySimplified;
  trajectoryModalStore.publish({
    open,
    className: scoutUiState.elAttackTrajectoryModal.className,
    source:
      scoutUiState.elAttackTrajectoryImage.dataset.activeSrc || scoutUiState.elAttackTrajectoryImage.src,
    showNet: mode === "attack" && simplified,
    netPoint: scoutUiState.trajectoryNetPointId,
    showServe: mode === "serve-start",
    serveType: scoutUiState.serveTrajectoryType,
    instructions:
      mode === "serve-start" || mode === "serve-end"
        ? ""
        : simplified
          ? "Scegli il punto rete e poi clicca il punto di arrivo."
          : "Clicca (o trascina) per disegnare la traiettoria dal punto di partenza a quello di arrivo.",
  });
}
