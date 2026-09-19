function resetTrajectoryState() {
  trajectoryStart = null;
  trajectoryEnd = null;
  trajectoryDragging = false;
  if (elAttackTrajectoryCanvas) {
    const ctx = elAttackTrajectoryCanvas.getContext("2d");
    ctx && ctx.clearRect(0, 0, elAttackTrajectoryCanvas.width, elAttackTrajectoryCanvas.height);
  }
}
function resizeTrajectoryCanvas() {
  if (!elAttackTrajectoryCanvas || !elAttackTrajectoryImage) return;
  const rect = elAttackTrajectoryImage.getBoundingClientRect();
  const canvas = elAttackTrajectoryCanvas;
  const height = rect.height;
  canvas.width = rect.width;
  canvas.height = height;
  canvas.style.width = rect.width + "px";
  canvas.style.height = height + "px";
  if (canvas.parentElement) {
    const inCourtModal = !!(elAttackTrajectoryModal && elAttackTrajectoryModal.classList.contains("court-modal"));
    canvas.parentElement.style.height = inCourtModal ? "" : height + "px";
  }
  drawTrajectory();
}
function drawTrajectory(tempEnd = null) {
  if (!elAttackTrajectoryCanvas) return;
  const ctx = elAttackTrajectoryCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, elAttackTrajectoryCanvas.width, elAttackTrajectoryCanvas.height);
  const start = trajectoryStart;
  const end = tempEnd || trajectoryEnd;
  if (trajectoryMode === "serve-start") {
    const pt = start;
    if (pt) {
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (trajectoryMode === "serve-end") {
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
function getTrajectoryDisplayBox() {
  if (!elAttackTrajectoryCanvas || !elAttackTrajectoryImage) return null;
  const stageW = elAttackTrajectoryCanvas.clientWidth || elAttackTrajectoryCanvas.width || 1;
  const stageH = elAttackTrajectoryCanvas.clientHeight || elAttackTrajectoryCanvas.height || 1;
  const natW = elAttackTrajectoryImage.naturalWidth || stageW;
  const natH = elAttackTrajectoryImage.naturalHeight || stageH;
  if (!natW || !natH) return { offsetX: 0, offsetY: 0, width: stageW, height: stageH };
  const scale = Math.min(stageW / natW, stageH / natH);
  const dispW = natW * scale;
  const dispH = natH * scale;
  const offsetX = (stageW - dispW) / 2;
  const offsetY = (stageH - dispH) / 2;
  return { offsetX, offsetY, width: dispW, height: dispH };
}
function denormalizeTrajectoryPoint(norm) {
  const box = getTrajectoryDisplayBox();
  if (!box || !norm) return null;
  return {
    x: box.offsetX + clamp01(norm.x || 0) * box.width,
    y: box.offsetY + clamp01(norm.y || 0) * box.height
  };
}
function normalizeTrajectoryPoint(pt) {
  if (!elAttackTrajectoryCanvas || !pt) return null;
  const box = getTrajectoryDisplayBox();
  if (!box) return { x: 0, y: 0 };
  const relX = (pt.x - box.offsetX) / (box.width || 1);
  const relY = (pt.y - box.offsetY) / (box.height || 1);
  return {
    x: clamp01(relX),
    y: clamp01(relY)
  };
}
function mirrorTrajectoryPoint(norm) {
  if (!norm) return norm;
  return {
    x: 1 - clamp01(norm.x),
    y: 1 - clamp01(norm.y)
  };
}
function computeAttackDirectionDeg(start, end) {
  if (!start || !end) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return Math.round(((angle + 360) % 360) * 10) / 10; // 0-360, 1 decimal
}
function getAttackZone(normalizedPoint, isFarSide = false) {
  if (!normalizedPoint) return null;
  const x = clamp01(normalizedPoint.x);
  const third = x < 1 / 3 ? 0 : x < 2 / 3 ? 1 : 2;
  if (!isFarSide) {
    return third === 0 ? 4 : third === 1 ? 3 : 2;
  }
  return third === 0 ? 5 : third === 1 ? 6 : 1;
}
function mapBackRowZone(zone, baseZone) {
  if (!zone) return zone;
  const isBackRow = baseZone === 5 || baseZone === 6 || baseZone === 1;
  if (isBackRow) {
    if (zone === 4) return 5;
    if (zone === 3) return 6;
    if (zone === 2) return 1;
  }
  return zone;
}
function getTrajectoryNetPoint(id) {
  if (!id) return null;
  return TRAJECTORY_NET_POINTS.find(point => point.id === id) || null;
}
function getDefaultTrajectoryNetPointId(baseZone, setType) {
  if (setType === "fast") return "6-F";
  if ((setType || "").toLowerCase() === "damp") return "4";
  if (baseZone === 4 || baseZone === 5) return "5";
  if (baseZone === 3 || baseZone === 6) return "3";
  if (baseZone === 2 || baseZone === 1) return "6-F";
  return "3";
}
function getNearestTrajectoryNetPointId(start) {
  if (!start) return null;
  const x = clamp01(start.x);
  let closest = TRAJECTORY_NET_POINTS[0];
  let best = Math.abs(x - closest.x);
  for (let i = 1; i < TRAJECTORY_NET_POINTS.length; i++) {
    const candidate = TRAJECTORY_NET_POINTS[i];
    const diff = Math.abs(x - candidate.x);
    if (diff < best) {
      best = diff;
      closest = candidate;
    }
  }
  return closest ? closest.id : null;
}
function setTrajectoryNetPointId(id) {
  trajectoryNetPointId = id;
  if (!elAttackTrajectoryNetpoints) return;
  const buttons = elAttackTrajectoryNetpoints.querySelectorAll("[data-net-point]");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.netPoint === id);
  });
}
function updateTrajectoryImageFromStart() {
  if (trajectoryMode !== "attack") return;
  if (!trajectoryStart || !elAttackTrajectoryImage) return;
  const startNorm = normalizeTrajectoryPoint(trajectoryStart);
  if (!startNorm) return;
  const mirrorX = trajectoryMirror || trajectoryForceFar;
  const zoneNorm = mirrorX
    ? { x: 1 - clamp01(startNorm.x), y: clamp01(startNorm.y) }
    : startNorm;
  const startZoneRaw = getAttackZone(zoneNorm, trajectoryForceFar);
  const imgSrc = getTrajectoryImageForZone(startZoneRaw, trajectoryMirror || trajectoryForceFar);
  if (elAttackTrajectoryImage.dataset.activeSrc !== imgSrc) {
    elAttackTrajectoryImage.dataset.activeSrc = imgSrc;
    elAttackTrajectoryImage.src = imgSrc;
  }
}
function applyTrajectoryStartFromNetPoint() {
  if (trajectoryMode !== "attack") return;
  const point = getTrajectoryNetPoint(trajectoryNetPointId);
  if (!point || !elAttackTrajectoryCanvas) return;
  const box = getTrajectoryDisplayBox();
  const canvas = elAttackTrajectoryCanvas;
  const mirrorX = trajectoryMirror || trajectoryForceFar;
  const normX = mirrorX ? 1 - point.x : point.x;
  const x = box ? box.offsetX + normX * box.width : normX * canvas.width;
  const startFromTop = trajectoryMirror || trajectoryForceFar;
  const fixedY = box
    ? box.offsetY + (startFromTop ? 0.5 : box.height - 0.5)
    : startFromTop
      ? 0.5
      : canvas.height - 0.5;
  trajectoryStart = { x, y: fixedY };
  updateTrajectoryImageFromStart();
  drawTrajectory();
}
function openAttackTrajectoryModal(prefill = null) {
  return new Promise(resolve => {
    if (!elAttackTrajectoryModal || !elAttackTrajectoryCanvas || !elAttackTrajectoryImage) {
      resolve(null);
      return;
    }
    const forcePopup = !!(prefill && prefill.forcePopup);
    attackTrajectoryForcePopup = forcePopup;
    if (!forcePopup) {
      elAttackTrajectoryModal.classList.remove("force-popup");
      if (isDesktopCourtModalLayout()) {
        setCourtAreaLocked(true);
        setAttackTrajectoryCourtSizing(true);
      }
      updateCourtModalPlacement();
    } else {
      elAttackTrajectoryModal.classList.add("force-popup");
      setAttackTrajectoryCourtSizing(false);
      restoreModalToPopup(elAttackTrajectoryModal);
    }
    const scope = prefill && prefill.scope ? prefill.scope : "our";
    const mirrorFlag = scope === "opponent" ? state.opponentCourtViewMirrored : state.courtViewMirrored;
    trajectoryForceFar = !!(prefill && prefill.forceFar);
    trajectoryMirror = !forcePopup && !!mirrorFlag && !trajectoryForceFar;
    const mode = (prefill && prefill.mode) || "attack";
    trajectoryMode = mode;
    serveTrajectoryScope = mode === "serve-start" || mode === "serve-end" ? scope : null;
    trajectoryBaseZone = prefill && prefill.baseZone ? prefill.baseZone : null;
    trajectorySetType = prefill && prefill.setType ? prefill.setType : null;
    trajectoryResolver = resolve;
    resetTrajectoryState();
    trajectoryNetPointId = null;
    const simplified = !!state.attackTrajectorySimplified;
    if (elAttackTrajectoryNetpoints) {
      const shouldShowNet = mode === "attack" && simplified;
      elAttackTrajectoryNetpoints.classList.toggle("hidden", !shouldShowNet);
    }
    if (elServeTypeButtons) {
      elServeTypeButtons.classList.toggle("hidden", mode !== "serve-start");
      if (mode === "serve-start") {
        setServeTypeSelection("JF");
      }
    }
    if (elAttackTrajectoryInstructions) {
      const hideInstructions = mode === "serve-start" || mode === "serve-end";
      elAttackTrajectoryInstructions.textContent = hideInstructions
        ? ""
        : simplified
          ? "Scegli il punto rete e poi clicca il punto di arrivo."
          : "Clicca (o trascina) per disegnare la traiettoria dal punto di partenza a quello di arrivo.";
      elAttackTrajectoryInstructions.classList.toggle("hidden", hideInstructions);
    }
    const getInitialImage = () => {
      if (trajectoryForceFar) {
        if (mode === "serve-start") return SERVE_START_IMG_FAR;
        if (mode === "serve-end") return SERVE_END_IMG_FAR;
        return TRAJECTORY_IMG_FAR;
      }
      if (mode === "serve-start") return trajectoryMirror ? SERVE_START_IMG_FAR : SERVE_START_IMG_NEAR;
      if (mode === "serve-end") return trajectoryMirror ? SERVE_END_IMG_FAR : SERVE_END_IMG_NEAR;
      return trajectoryMirror ? TRAJECTORY_IMG_FAR : TRAJECTORY_IMG_NEAR;
    };
    elAttackTrajectoryImage.dataset.activeSrc = getInitialImage();
    elAttackTrajectoryImage.src = getInitialImage();
    if (serveTypeKeyHandler) {
      window.removeEventListener("keydown", serveTypeKeyHandler);
    }
    if (trajectoryEscapeHandler) {
      window.removeEventListener("keydown", trajectoryEscapeHandler);
      trajectoryEscapeHandler = null;
    }
    if (mode === "serve-start") {
      if (prefill && prefill.serveType) {
        setServeTypeSelection(prefill.serveType);
      }
      serveTypeKeyHandler = e => {
        const key = (e.key || "").toUpperCase();
        if (key === "F" || key === "J" || key === "S") {
          setServeTypeSelection(key === "J" ? "JF" : key);
        }
      };
      window.addEventListener("keydown", serveTypeKeyHandler);
    } else {
      serveTypeKeyHandler = null;
    }
    trajectoryEscapeHandler = e => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      closeAttackTrajectoryModal(null);
    };
    window.addEventListener("keydown", trajectoryEscapeHandler);
    elAttackTrajectoryModal.classList.remove("hidden");
    setModalOpenState(true, forcePopup);
    renderLogServeTrajectories();
    const applyPrefill = () => {
      if (!elAttackTrajectoryCanvas || elAttackTrajectoryCanvas.width === 0 || elAttackTrajectoryCanvas.height === 0) {
        return;
      }
      if (prefill && prefill.start && prefill.end) {
        const mirrorForDisplay = trajectoryMirror || trajectoryForceFar;
        const startNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.start) : prefill.start;
        const endNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.end) : prefill.end;
        const startPx = denormalizeTrajectoryPoint(startNorm);
        const endPx = denormalizeTrajectoryPoint(endNorm);
        if (!startPx || !endPx) return;
        trajectoryStart = startPx;
        trajectoryEnd = endPx;
        if (simplified) {
          const inferredNetPoint = getNearestTrajectoryNetPointId(startNorm);
          setTrajectoryNetPointId(inferredNetPoint || getDefaultTrajectoryNetPointId(trajectoryBaseZone, trajectorySetType));
        }
        updateTrajectoryImageFromStart();
        drawTrajectory();
        return;
      }
      if (mode === "serve-start" && prefill && prefill.start) {
        const mirrorForDisplay = trajectoryMirror || trajectoryForceFar;
        const startNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.start) : prefill.start;
        const startPx = denormalizeTrajectoryPoint(startNorm);
        if (startPx) {
          trajectoryStart = startPx;
          drawTrajectory();
        }
      }
      if (mode === "serve-end" && prefill && prefill.end) {
        const mirrorForDisplay = trajectoryMirror || trajectoryForceFar;
        const endNorm = mirrorForDisplay ? mirrorTrajectoryPoint(prefill.end) : prefill.end;
        const endPx = denormalizeTrajectoryPoint(endNorm);
        if (endPx) {
          trajectoryEnd = endPx;
          drawTrajectory();
        }
      }
      if (simplified && mode === "attack") {
        const defaultNetPoint = getDefaultTrajectoryNetPointId(trajectoryBaseZone, trajectorySetType);
        setTrajectoryNetPointId(defaultNetPoint);
        applyTrajectoryStartFromNetPoint();
      }
    };
    requestAnimationFrame(() => {
      resizeTrajectoryCanvas();
      setTimeout(() => {
        resizeTrajectoryCanvas();
        applyPrefill();
      }, 50);
    });
  });
}
function closeAttackTrajectoryModal(result = null) {
  if (!elAttackTrajectoryModal) return;
  elAttackTrajectoryModal.classList.add("hidden");
  setModalOpenState(false, attackTrajectoryForcePopup);
  setAttackTrajectoryCourtSizing(false);
  elAttackTrajectoryModal.classList.remove("force-popup");
  attackTrajectoryForcePopup = false;
  if (result) {
    suppressTransientClicks();
  }
  trajectoryMirror = false;
  trajectoryForceFar = false;
  trajectoryBaseZone = null;
  trajectorySetType = null;
  trajectoryMode = "attack";
  serveTrajectoryScope = null;
  if (serveTypeKeyHandler) {
    window.removeEventListener("keydown", serveTypeKeyHandler);
    serveTypeKeyHandler = null;
  }
  if (trajectoryEscapeHandler) {
    window.removeEventListener("keydown", trajectoryEscapeHandler);
    trajectoryEscapeHandler = null;
  }
  if (trajectoryResolver) {
    trajectoryResolver(result);
    trajectoryResolver = null;
  }
  renderLogServeTrajectories();
}
async function captureServeTrajectory(event, { forcePopup = false } = {}) {
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
function forceNextSkill(skillId, scope = "our") {
  if (!skillId) return;
  cancelPartialSkillFlowForScope(scope);
  state.predictiveSkillFlow = true;
  state.freeballPending = false;
  state.freeballPendingScope = scope;
  state.skillFlowOverride = null;
  state.opponentSkillFlowOverride = null;
  state.pendingServe = null;
  state.forceSkillActive = true;
  state.forceSkillScope = scope;
  if (scope === "opponent") {
    state.opponentSkillFlowOverride = skillId;
  } else {
    state.skillFlowOverride = skillId;
  }
  state.flowTeamScope = scope;
  if (scope === "our") {
    if (skillId === "serve" && !state.isServing) {
      state.isServing = true;
      state.autoRotatePending = false;
      if (typeof enforceAutoLiberoForState === "function") {
        enforceAutoLiberoForState({ skipServerOnServe: true });
      }
    }
    if (skillId === "pass") {
      state.isServing = false;
      state.autoRotatePending = true;
      state.freeballPending = false;
      if (typeof enforceAutoLiberoForState === "function") {
        enforceAutoLiberoForState({ skipServerOnServe: true });
      }
    }
  }
  saveState({ persistLocal: true });
  renderPlayers();
  updateNextSkillIndicator(skillId);
  const toggle = document.getElementById("predictive-skill-toggle");
  if (toggle) toggle.checked = true;
}
const SCOUT_WIDGET_IDS = ["video", "dvw", "events", "serve-trajectories"];
const SCOUT_WIDGET_ZONE_IDS = ["center-top", "center-bottom", "right"];
const SCOUT_WIDGET_LABELS = {
  video: "Video scout",
  dvw: "Codice DataVolley",
  events: "Tabella eventi",
  "serve-trajectories": "Traiettorie di battuta"
};
let activeScoutWidgetDrag = null;
