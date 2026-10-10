let reactTrajectoryHandlers;
function getReactTrajectoryPointerHandlers() {
  if (reactTrajectoryHandlers) return reactTrajectoryHandlers;
  const getPos = (e) => {
    if (!elAttackTrajectoryCanvas) return null;
    const rect = elAttackTrajectoryCanvas.getBoundingClientRect();
    const clientX =
      e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX);
    const clientY =
      e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
    if (clientX == null || clientY == null) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const onPointerDown = (e) => {
    const pos = getPos(e);
    if (!pos || !elAttackTrajectoryCanvas) return;
    if (e.cancelable) e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (
      typeof elAttackTrajectoryCanvas.setPointerCapture === "function" &&
      e.pointerId != null
    ) {
      elAttackTrajectoryCanvas.setPointerCapture(e.pointerId);
    }
    if (trajectoryMode === "serve-start") {
      trajectoryStart = pos;
      trajectoryEnd = null;
      trajectoryDragging = true;
      drawTrajectory();
      return;
    }
    if (trajectoryMode === "serve-end") {
      trajectoryStart = null;
      trajectoryEnd = pos;
      trajectoryDragging = true;
      drawTrajectory();
      return;
    }
    if (state.attackTrajectorySimplified) {
      if (!trajectoryStart) {
        if (!trajectoryNetPointId) {
          const defaultNetPoint = getDefaultTrajectoryNetPointId(
            trajectoryBaseZone,
            trajectorySetType,
          );
          setTrajectoryNetPointId(defaultNetPoint);
        }
        applyTrajectoryStartFromNetPoint();
      }
      trajectoryDragging = true;
      trajectoryEnd = pos;
      drawTrajectory(pos);
      return;
    }
    if (!trajectoryStart || trajectoryEnd) {
      const box = getTrajectoryDisplayBox();
      const w = box
        ? box.width
        : elAttackTrajectoryCanvas.clientWidth ||
          elAttackTrajectoryCanvas.width ||
          1;
      const startFromTop = trajectoryMirror || trajectoryForceFar;
      const fixedY = box
        ? box.offsetY + (startFromTop ? 0.5 : box.height - 0.5)
        : startFromTop
          ? 0.5
          : elAttackTrajectoryCanvas.height - 0.5; // partenza forzata sul bordo basso
      trajectoryStart = { x: pos.x, y: fixedY };
      trajectoryEnd = null;
      const xWithinStage = box ? pos.x - box.offsetX : pos.x;
      const third =
        xWithinStage < w / 3 ? 0 : xWithinStage < (2 * w) / 3 ? 1 : 2;
      const isFarSide = trajectoryForceFar;
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
        trajectoryMirror || trajectoryForceFar,
      ); // mostra il campo della zona front-row
      if (
        elAttackTrajectoryImage &&
        elAttackTrajectoryImage.dataset.activeSrc !== imgSrc
      ) {
        elAttackTrajectoryImage.dataset.activeSrc = imgSrc;
        publishReactTrajectoryImage(imgSrc);
      }
    }
    trajectoryDragging = true;
    drawTrajectory();
  };
  const onPointerMove = (e) => {
    if (!trajectoryDragging || (!trajectoryStart && !trajectoryEnd)) return;
    const pos = getPos(e);
    if (!pos) return;
    if (e.cancelable) e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (trajectoryMode === "serve-start") {
      trajectoryStart = pos;
      drawTrajectory();
      return;
    }
    if (trajectoryMode === "serve-end") {
      trajectoryEnd = pos;
      drawTrajectory();
      return;
    }
    drawTrajectory(pos);
  };
  const onPointerUp = (e) => {
    if (!trajectoryDragging || (!trajectoryStart && !trajectoryEnd)) return;
    const pos = getPos(e);
    trajectoryDragging = false;
    if (e.cancelable) e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (
      elAttackTrajectoryCanvas &&
      typeof elAttackTrajectoryCanvas.releasePointerCapture === "function" &&
      e.pointerId != null
    ) {
      elAttackTrajectoryCanvas.releasePointerCapture(e.pointerId);
    }
    if (!pos) return;
    if (trajectoryMode === "serve-start") {
      trajectoryStart = pos;
      drawTrajectory();
      confirmCurrentTrajectory();
      return;
    }
    if (trajectoryMode === "serve-end") {
      trajectoryEnd = pos;
      drawTrajectory();
      confirmCurrentTrajectory();
      return;
    }
    trajectoryEnd = pos;
    drawTrajectory();
    confirmCurrentTrajectory();
  };
  const confirmCurrentTrajectory = () => {
    if (trajectoryMode === "serve-start") {
      if (!trajectoryStart) return;
      const rawPoint = normalizeTrajectoryPoint(trajectoryStart);
      const mirrorForStorage = trajectoryMirror || trajectoryForceFar;
      const point = mirrorForStorage
        ? mirrorTrajectoryPoint(rawPoint)
        : rawPoint;
      closeAttackTrajectoryModal({ point, serveType: serveTrajectoryType });
      return;
    }
    if (trajectoryMode === "serve-end") {
      const pt = trajectoryEnd || trajectoryStart;
      if (!pt) return;
      const rawPoint = normalizeTrajectoryPoint(pt);
      const mirrorForStorage = trajectoryMirror || trajectoryForceFar;
      const point = mirrorForStorage
        ? mirrorTrajectoryPoint(rawPoint)
        : rawPoint;
      closeAttackTrajectoryModal({ point });
      return;
    }
    if (!trajectoryStart || !trajectoryEnd) return;
    const rawStart = normalizeTrajectoryPoint(trajectoryStart);
    const rawEnd = normalizeTrajectoryPoint(trajectoryEnd);
    const mirrorForStorage = trajectoryMirror || trajectoryForceFar;
    const start = mirrorForStorage ? mirrorTrajectoryPoint(rawStart) : rawStart;
    const end = mirrorForStorage ? mirrorTrajectoryPoint(rawEnd) : rawEnd;
    const isFar = false;
    const startZone = mapBackRowZone(
      getAttackZone(start, isFar),
      trajectoryBaseZone,
    );
    const endZone = mapBackRowZone(
      getAttackZone(end, isFar),
      trajectoryBaseZone,
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
  return (reactTrajectoryHandlers = {
    down: onPointerDown,
    move: onPointerMove,
    up: onPointerUp,
  });
}
function handleReactTrajectoryPointer(kind, event) {
  getReactTrajectoryPointerHandlers()[kind]?.(event);
}
function chooseReactTrajectoryNetPoint(id) {
  if (!id) return;
  setTrajectoryNetPointId(id);
  trajectoryEnd = null;
  applyTrajectoryStartFromNetPoint();
}
function publishReactTrajectoryImage(source) {
  if (elAttackTrajectoryImage)
    elAttackTrajectoryImage.dataset.activeSrc = source;
  trajectoryModalStore.publish({ source });
}
function publishReactTrajectoryModal(open) {
  const mode = trajectoryMode,
    simplified = !!state.attackTrajectorySimplified;
  trajectoryModalStore.publish({
    open,
    className: elAttackTrajectoryModal.className,
    source:
      elAttackTrajectoryImage.dataset.activeSrc || elAttackTrajectoryImage.src,
    showNet: mode === "attack" && simplified,
    netPoint: trajectoryNetPointId,
    showServe: mode === "serve-start",
    serveType: serveTrajectoryType,
    instructions:
      mode === "serve-start" || mode === "serve-end"
        ? ""
        : simplified
          ? "Scegli il punto rete e poi clicca il punto di arrivo."
          : "Clicca (o trascina) per disegnare la traiettoria dal punto di partenza a quello di arrivo.",
  });
}
