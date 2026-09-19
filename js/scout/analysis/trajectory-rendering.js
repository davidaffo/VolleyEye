function getTrajectoryBg(zone, isFarSide, cb) {
  const far = typeof isFarSide === "function" ? false : !!isFarSide;
  const onLoad = typeof isFarSide === "function" ? isFarSide : cb;
  const key = String(zone) + "-" + (far ? "far" : "near");
  if (trajectoryBgCache[key] && trajectoryBgCache[key].complete) {
    return trajectoryBgCache[key];
  }
  const img = new Image();
  img.src = resolveExportAssetPath(getTrajectoryImageForZone(zone, far));
  if (onLoad) {
    img.onload = onLoad;
  }
  trajectoryBgCache[key] = img;
  return img;
}
function getServeTrajectoryImages(cb) {
  if (
    serveTrajectoryImgs &&
    serveTrajectoryImgs.start &&
    serveTrajectoryImgs.end &&
    serveTrajectoryImgs.startFar &&
    serveTrajectoryImgs.endFar
  ) {
    if (
      serveTrajectoryImgs.start.complete &&
      serveTrajectoryImgs.end.complete &&
      serveTrajectoryImgs.startFar.complete &&
      serveTrajectoryImgs.endFar.complete
    ) {
      return serveTrajectoryImgs;
    }
  }
  const start = new Image();
  const end = new Image();
  const startFar = new Image();
  const endFar = new Image();
  start.src = resolveExportAssetPath(SERVE_START_IMG_NEAR);
  end.src = resolveExportAssetPath(SERVE_END_IMG_NEAR);
  startFar.src = resolveExportAssetPath(SERVE_START_IMG_FAR);
  endFar.src = resolveExportAssetPath(SERVE_END_IMG_FAR);
  if (cb) {
    start.onload = cb;
    end.onload = cb;
    startFar.onload = cb;
    endFar.onload = cb;
  }
  serveTrajectoryImgs = { start, end, startFar, endFar };
  return serveTrajectoryImgs;
}
function getAttackEmptyImage(isFarSide, cb) {
  const key = isFarSide ? "attack-empty-far" : "attack-empty-near";
  if (trajectoryBgCache[key] && trajectoryBgCache[key].complete) {
    return trajectoryBgCache[key];
  }
  const img = new Image();
  img.src = resolveExportAssetPath(isFarSide ? TRAJECTORY_IMG_FAR : TRAJECTORY_IMG_NEAR);
  if (cb) {
    img.onload = cb;
  }
  trajectoryBgCache[key] = img;
  return img;
}
function getTrajectoryColorForCode(code, variant = "attack") {
  const normalized = normalizeEvalCode(code) || String(code || "").trim();
  const palette = variant === "serve" ? TRAJECTORY_LINE_COLORS_SERVE : TRAJECTORY_LINE_COLORS;
  return palette[normalized] || "#38bdf8";
}
function getFilteredTrajectoryEvents() {
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    const dir = ev.attackDirection || ev.attackTrajectory;
    return dir && dir.start && dir.end;
  });
  return events.filter(ev => {
    const traj = ev.attackDirection || ev.attackTrajectory;
    const startZone = ev.attackStartZone || (traj && traj.startZone) || ev.zone || ev.playerPosition || null;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    if (!matchesAdvancedFilters(ev, trajectoryFilterState)) return false;
    if (trajectoryFilterState.setters.size) {
      const setterIdx = getSetterFromEvent(ev);
      if (setterIdx === null || !trajectoryFilterState.setters.has(setterIdx)) return false;
    }
    if (trajectoryFilterState.players.size && !trajectoryFilterState.players.has(ev.playerIdx)) return false;
    if (trajectoryFilterState.sets.size && !trajectoryFilterState.sets.has(ev.set)) return false;
    if (trajectoryFilterState.codes.size && !trajectoryFilterState.codes.has(ev.code)) return false;
    if (trajectoryFilterState.attackTypes.size && !trajectoryFilterState.attackTypes.has(buildAttackTypeLabel(ev.attackType))) return false;
    if (trajectoryFilterState.zones.size && !trajectoryFilterState.zones.has(startZone)) return false;
    return true;
  });
}
function getServeStartZone(ev) {
  if (!ev || !ev.serveStart) return null;
  return getAttackZone(ev.serveStart, true);
}
function getServeTrajectoryEventsForServer(scope) {
  const serverName = getActiveServerName(scope) || (getServerPlayerForScope(scope) || {}).name || "";
  const players = getPlayersForScope(scope);
  const serverIdx = serverName ? players.indexOf(serverName) : -1;
  let events = (state.events || []).filter(ev => {
    if (!ev || ev.skillId !== "serve") return false;
    if (!ev.serveStart || !ev.serveEnd) return false;
    if (getTeamScopeFromEvent(ev) !== scope) return false;
    if (serverName && ev.playerName === serverName) return true;
    if (serverIdx >= 0 && ev.playerIdx === serverIdx) return true;
    return false;
  });
  const lastEvent = events.length ? events[events.length - 1] : null;
  const eventSwap = lastEvent && typeof lastEvent.courtSideSwapped === "boolean" ? lastEvent.courtSideSwapped : null;
  if (lastEvent && typeof lastEvent.courtSideSwapped === "boolean") {
    events = events.filter(ev => ev && ev.courtSideSwapped === lastEvent.courtSideSwapped);
  }
  return { events, serverName, eventSwap };
}
function drawServeTrajectoryCanvas(canvas, visual, events, { scope, isFarServe, onImagesLoad } = {}) {
  if (!canvas || !visual) return;
  const redraw = onImagesLoad || (() => renderLogServeTrajectories());
  const imgs = getServeTrajectoryImages(redraw);
  const farFlag =
    typeof isFarServe === "boolean" ? isFarServe : scope ? isFarSideForScope(scope) : false;
  const startImg = imgs && (farFlag ? imgs.startFar : imgs.start);
  const endImg = imgs && (farFlag ? imgs.endFar : imgs.end);
  const startRatio = startImg && startImg.naturalWidth ? startImg.naturalHeight / startImg.naturalWidth : 0.65;
  const endRatio = endImg && endImg.naturalWidth ? endImg.naturalHeight / endImg.naturalWidth : 0.65;
  const width =
    (canvas.parentElement && canvas.parentElement.clientWidth) ||
    (startImg && startImg.naturalWidth) ||
    (endImg && endImg.naturalWidth) ||
    320;
  const startHeight = Math.max(80, Math.round(width * startRatio));
  const endHeight = Math.max(80, Math.round(width * endRatio));
  const gapOverlapPx = Math.round(width / 9);
  const gapHeight = Math.max(0, startHeight - Math.round(startHeight / 9));
  const gapCut = Math.min(gapOverlapPx, Math.max(0, gapHeight - 1));
  const effectiveGap = Math.max(0, gapHeight - gapCut);
  const height = startHeight + effectiveGap + endHeight;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  const gapImg = getAttackEmptyImage(!farFlag, redraw);
  const overlap = gapCut;
  if (farFlag) {
    if (gapHeight > 0) {
      const gapStart = startHeight - overlap;
      if (gapImg && gapImg.complete && gapImg.naturalWidth) {
        ctx.drawImage(gapImg, 0, 0, gapImg.naturalWidth, gapImg.naturalHeight, 0, gapStart, width, gapHeight);
      } else {
        ctx.fillStyle = "#ffb142";
        ctx.fillRect(0, gapStart, width, Math.max(1, gapHeight));
      }
    }
    if (startImg && startImg.complete && startImg.naturalWidth) {
      ctx.drawImage(startImg, 0, 0, width, startHeight);
    }
    if (endImg && endImg.complete && endImg.naturalWidth) {
      ctx.drawImage(endImg, 0, startHeight + effectiveGap, width, endHeight);
    }
  } else {
    if (endImg && endImg.complete && endImg.naturalWidth) {
      ctx.drawImage(endImg, 0, 0, width, endHeight);
    }
    if (gapHeight > 0) {
      const gapStart = endHeight;
      if (gapImg && gapImg.complete && gapImg.naturalWidth) {
        ctx.drawImage(gapImg, 0, 0, gapImg.naturalWidth, gapImg.naturalHeight, 0, gapStart, width, gapHeight);
      } else {
        ctx.fillStyle = "#ffb142";
        ctx.fillRect(0, gapStart, width, Math.max(1, gapHeight));
      }
    }
    if (startImg && startImg.complete && startImg.naturalWidth) {
      ctx.drawImage(startImg, 0, endHeight + effectiveGap, width, startHeight);
    }
  }
  const netY = farFlag ? startHeight + effectiveGap : endHeight;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 8;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(0, netY);
  ctx.lineTo(width, netY);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!events || events.length === 0) {
    visual.classList.add("empty");
    return;
  }
  visual.classList.remove("empty");
  events.forEach(ev => {
    const startRaw = ev.serveStart;
    const endRaw = ev.serveEnd;
    const start = farFlag && startRaw ? mirrorTrajectoryPoint(startRaw) : startRaw;
    const end = farFlag && endRaw ? mirrorTrajectoryPoint(endRaw) : endRaw;
    if (!start || !end) return;
    const sx = clamp01Val(start.x) * width;
    const sy = clamp01Val(start.y) * startHeight + (farFlag ? 0 : endHeight + effectiveGap);
    const ex = clamp01Val(end.x) * width;
    const ey = clamp01Val(end.y) * endHeight + (farFlag ? startHeight + effectiveGap : 0);
    ctx.strokeStyle = getTrajectoryColorForCode(ev.code, "serve");
    ctx.lineWidth = TRAJECTORY_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  });
}
function renderServeTrajectoryCard(
  card,
  { titleText, events, scope, isFarServe, onImagesLoad, playerIdx, stats } = {}
) {
  if (!card) return null;
  card.classList.add("trajectory-card", "serve-trajectory-card");
  card.innerHTML = "";
  if (typeof playerIdx === "number") {
    card.dataset.playerIdx = String(playerIdx);
  } else {
    delete card.dataset.playerIdx;
  }
  const visual = document.createElement("div");
  visual.className = "serve-trajectory-card__visual";
  const title = document.createElement("div");
  title.className = "trajectory-card__title";
  title.textContent = titleText || "—";
  const canvas = document.createElement("canvas");
  if (typeof playerIdx === "number") canvas.dataset.serveTrajCanvas = String(playerIdx);
  const empty = document.createElement("div");
  empty.className = "trajectory-card__empty";
  empty.textContent = "Nessuna traiettoria";
  visual.appendChild(title);
  visual.appendChild(canvas);
  visual.appendChild(empty);
  card.appendChild(visual);
  if (stats !== undefined) {
    const statsWrap = document.createElement("div");
    statsWrap.className = "serve-trajectory-card__stats";
    const statsTitle = document.createElement("div");
    statsTitle.className = "serve-trajectory-card__stats-title";
    statsTitle.textContent = "Dati battuta";
    const statsGrid = document.createElement("div");
    statsGrid.className = "serve-trajectory-card__stats-grid";
    statsWrap.appendChild(statsTitle);
    statsWrap.appendChild(statsGrid);
    card.appendChild(statsWrap);
    renderServeStatsGrid(statsGrid, stats);
  }
  drawServeTrajectoryCanvas(canvas, visual, events || [], {
    scope,
    isFarServe,
    onImagesLoad
  });
  return { canvas, visual };
}
function resolvePlayerIdxFromNameForScope(name, scope) {
  const players = getPlayersForScope(scope);
  if (!name || !players || !players.length) return -1;
  const directIdx = players.findIndex(p => p === name);
  if (directIdx !== -1) return directIdx;
  const raw = String(name).trim().toLowerCase();
  if (!raw) return -1;
  const normalized = raw.replace(/^[0-9]+\\s*/, "");
  return players.findIndex(p => {
    const base = String(p || "").trim().toLowerCase();
    if (!base) return false;
    return base === normalized || base === raw;
  });
}
function getServeStatsForServer(scope, serverName) {
  const players = getPlayersForScope(scope);
  const idx = resolvePlayerIdxFromNameForScope(serverName, scope);
  if (idx < 0 || !players[idx]) return null;
  const events = (state.events || []).filter(ev => getTeamScopeFromEvent(ev) === scope);
  const statsByPlayer = computeStatsByPlayerForEvents(events, players);
  const serveCounts = normalizeCounts(statsByPlayer[idx] && statsByPlayer[idx].serve);
  const serveMetrics = computeMetrics(serveCounts, "serve");
  return {
    total: totalFromCounts(serveCounts),
    ace: serveCounts["#"] || 0,
    error: serveCounts["="] || 0,
    pos: serveMetrics.pos === null ? "-" : formatPercent(serveMetrics.pos),
    eff: serveMetrics.eff === null ? "-" : formatPercent(serveMetrics.eff)
  };
}
function renderServeStatsGrid(targetEl, stats) {
  if (!targetEl) return;
  targetEl.innerHTML = "";
  if (!stats) {
    const empty = document.createElement("div");
    empty.className = "serve-trajectory-card__stat";
    empty.textContent = "Nessun dato";
    targetEl.appendChild(empty);
    return;
  }
  const rows = [
    { label: "Tot", value: stats.total },
    { label: "#", value: stats.ace },
    { label: "=", value: stats.error },
    { label: "Pos", value: stats.pos },
    { label: "Eff", value: stats.eff }
  ];
  rows.forEach(row => {
    const item = document.createElement("div");
    item.className = "serve-trajectory-card__stat";
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("strong");
    value.textContent = row.value;
    item.appendChild(label);
    item.appendChild(value);
    targetEl.appendChild(item);
  });
}
function getServingScopeForLogTrajectory() {
  if (state.useOpponentTeam && state.predictiveSkillFlow) {
    const ourNext = getPredictedSkillIdForScope("our");
    const oppNext = getPredictedSkillIdForScope("opponent");
    if (ourNext === "serve") return "our";
    if (oppNext === "serve") return "opponent";
  }
  if (state.pendingServe && state.pendingServe.scope) {
    return state.pendingServe.scope;
  }
  if (isPostServeLockForScope("our")) return "our";
  if (isPostServeLockForScope("opponent")) return "opponent";
  if (serveTrajectoryScope === "our" || serveTrajectoryScope === "opponent") {
    return serveTrajectoryScope;
  }
  return null;
}
function getActiveServeSelectionScope() {
  const keys = Object.keys(selectedSkillPerPlayer || {});
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (selectedSkillPerPlayer[key] !== "serve") continue;
    if (serveMetaByPlayer && serveMetaByPlayer[key]) continue;
    const scope = key.split(":")[0];
    if (scope === "our" || scope === "opponent") return scope;
  }
  return null;
}
function renderLogServeTrajectories() {
  if (!elLogServeTrajectory) return;
  const selectionScope = getActiveServeSelectionScope();
  const servingScope = getServingScopeForLogTrajectory() || selectionScope;
  const allowOur = !!state.showServeTrajectoryLogOur;
  const allowOpp = !!state.showServeTrajectoryLogOpp;
  const canShow = !!servingScope;
  if (elServeTrajectoryLogToggleInline) {
    elServeTrajectoryLogToggleInline.checked = allowOur;
  }
  if (elServeTrajectoryLogToggleInlineOpp) {
    elServeTrajectoryLogToggleInlineOpp.checked = allowOpp;
  }
  elLogServeTrajectory.classList.toggle("hidden", !canShow);
  if (!canShow) return;
  const showOur = servingScope === "our" && allowOur;
  const showOpp = servingScope === "opponent" && state.useOpponentTeam && allowOpp;
  if (elLogServeCardOur) elLogServeCardOur.classList.toggle("hidden", !showOur);
  if (elLogServeCardOpp) elLogServeCardOpp.classList.toggle("hidden", !showOpp);
  if (showOur && elLogServeCardOur) {
    const { events, serverName } = getServeTrajectoryEventsForServer("our");
    renderServeTrajectoryCard(elLogServeCardOur, {
      titleText: `Battuta · ${serverName ? formatNameWithNumber(serverName) : "—"}`,
      events,
      scope: "our",
      isFarServe: isFarSideForScope("our"),
      onImagesLoad: () => renderLogServeTrajectories(),
      stats: getServeStatsForServer("our", serverName)
    });
  }
  if (showOpp && elLogServeCardOpp) {
    const { events, serverName } = getServeTrajectoryEventsForServer("opponent");
    const formattedName = serverName
      ? formatNameWithNumberFor(serverName, getPlayerNumbersForScope("opponent"))
      : "—";
    renderServeTrajectoryCard(elLogServeCardOpp, {
      titleText: `Battuta · ${formattedName}`,
      events,
      scope: "opponent",
      isFarServe: isFarSideForScope("opponent"),
      onImagesLoad: () => renderLogServeTrajectories(),
      stats: getServeStatsForServer("opponent", serverName)
    });
  }
}
function initLogServeTrajectoryControls() {
  if (!elLogServeTrajectory) return;
  if (elServeTrajectoryLogToggleInline && !elServeTrajectoryLogToggleInline._bound) {
    elServeTrajectoryLogToggleInline.addEventListener("change", () => {
      state.showServeTrajectoryLogOur = !!elServeTrajectoryLogToggleInline.checked;
      saveState();
      renderLogServeTrajectories();
    });
    elServeTrajectoryLogToggleInline._bound = true;
  }
  if (elServeTrajectoryLogToggleInlineOpp && !elServeTrajectoryLogToggleInlineOpp._bound) {
    elServeTrajectoryLogToggleInlineOpp.addEventListener("change", () => {
      state.showServeTrajectoryLogOpp = !!elServeTrajectoryLogToggleInlineOpp.checked;
      saveState();
      renderLogServeTrajectories();
    });
    elServeTrajectoryLogToggleInlineOpp._bound = true;
  }
  renderLogServeTrajectories();
}
function getFilteredServeTrajectoryEvents() {
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "serve") return false;
    return ev.serveStart && ev.serveEnd;
  });
  return events.filter(ev => {
    const startZone = getServeStartZone(ev);
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    if (!matchesAdvancedFilters(ev, serveTrajectoryFilterState)) return false;
    if (serveTrajectoryFilterState.players.size && !serveTrajectoryFilterState.players.has(ev.playerIdx)) return false;
    if (serveTrajectoryFilterState.sets.size && !serveTrajectoryFilterState.sets.has(ev.set)) return false;
    if (serveTrajectoryFilterState.codes.size && !serveTrajectoryFilterState.codes.has(ev.code)) return false;
    if (serveTrajectoryFilterState.zones.size && !serveTrajectoryFilterState.zones.has(startZone)) return false;
    return true;
  });
}
function renderTrajectoryAnalysis() {
  if (!elTrajectoryGrid) return;
  renderTrajectoryFilters();
  renderAttackMetricsSummary(elTrajectoryAttackSummary, getFilteredAttackSummaryEvents());
  const canvases = elTrajectoryGrid.querySelectorAll("canvas[data-traj-canvas]");
  if (!canvases || canvases.length === 0) return;
  const analysisScope = getAnalysisTeamScope();
  const courtSideState = ensureCourtSideState("uiTrajectoryCourtSideByScope");
  const isFarView = getAnalysisCourtSide(courtSideState[analysisScope]) === "far";
  elTrajectoryGrid.classList.toggle("is-far", isFarView);
  const events = getFilteredTrajectoryEvents();
  const grouped = {};
  events.forEach(ev => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const zone = ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    if (!zone) return;
    if (!grouped[zone]) grouped[zone] = [];
    grouped[zone].push(ev);
  });
  canvases.forEach(canvas => {
    const zone = parseInt(canvas.dataset.trajCanvas, 10);
    const card = canvas.closest(".trajectory-card");
    const list = grouped[zone] || [];
    const img = getTrajectoryBg(zone, isFarView, () => renderTrajectoryAnalysis());
    const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.65;
    const width = (canvas.parentElement && canvas.parentElement.clientWidth) || img.naturalWidth || 320;
    const height = Math.max(120, Math.round(width * ratio || width * 0.65));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, 0, 0, width, height);
    }
    if (!list.length) {
      if (card) card.classList.add("empty");
      return;
    }
    if (card) card.classList.remove("empty");
    list.forEach(ev => {
      const traj = ev.attackDirection || ev.attackTrajectory || {};
      const startRaw = traj.start || ev.attackStart;
      const endRaw = traj.end || ev.attackEnd;
      const start = isFarView && startRaw ? mirrorTrajectoryPoint(startRaw) : startRaw;
      const end = isFarView && endRaw ? mirrorTrajectoryPoint(endRaw) : endRaw;
      if (!start || !end) return;
      const sx = clamp01Val(start.x) * width;
      const sy = clamp01Val(start.y) * height;
      const ex = clamp01Val(end.x) * width;
      const ey = clamp01Val(end.y) * height;
      ctx.strokeStyle = getTrajectoryColorForCode(ev.code, "attack");
      ctx.lineWidth = TRAJECTORY_LINE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    });
  });
}
function buildAttackTypeLabel(value) {
  const normalized = valueToString(value).trim();
  return normalized || "Non specificato";
}
function getFilteredAttackSummaryEvents() {
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return true;
  });
  return events.filter(ev => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const startZone = ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    const setNum = normalizeSetNumber(ev.set);
    if (!matchesAdvancedFilters(ev, trajectoryFilterState)) return false;
    if (trajectoryFilterState.setters.size) {
      const setterIdx = getSetterFromEvent(ev);
      if (setterIdx === null || !trajectoryFilterState.setters.has(setterIdx)) return false;
    }
    if (trajectoryFilterState.players.size && !trajectoryFilterState.players.has(ev.playerIdx)) return false;
    if (trajectoryFilterState.sets.size && !trajectoryFilterState.sets.has(setNum)) return false;
    if (trajectoryFilterState.codes.size && !trajectoryFilterState.codes.has(ev.code)) return false;
    if (trajectoryFilterState.attackTypes.size && !trajectoryFilterState.attackTypes.has(buildAttackTypeLabel(ev.attackType))) return false;
    if (trajectoryFilterState.zones.size && !trajectoryFilterState.zones.has(startZone)) return false;
    return true;
  });
}
function renderAttackMetricsSummary(target, events, compareEvents = null) {
  if (!target) return;
  const list = Array.isArray(events) ? events.filter(ev => ev && ev.skillId === "attack") : [];
  const compareList = Array.isArray(compareEvents)
    ? compareEvents.filter(ev => ev && ev.skillId === "attack")
    : null;
  target.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "players-empty";
    empty.textContent = "Nessun attacco per i filtri selezionati.";
    target.appendChild(empty);
    return;
  }
  const counts = emptyCounts();
  const byType = {};
  const compareCounts = emptyCounts();
  const compareByType = {};
  list.forEach(ev => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (code) counts[code] = (counts[code] || 0) + 1;
    const key = buildAttackTypeLabel(ev.attackType);
    if (!byType[key]) byType[key] = emptyCounts();
    if (code) byType[key][code] = (byType[key][code] || 0) + 1;
  });
  if (compareList) {
    compareList.forEach(ev => {
      const code = normalizeEvalCode(ev.code || ev.evaluation);
      if (code) compareCounts[code] = (compareCounts[code] || 0) + 1;
      const key = buildAttackTypeLabel(ev.attackType);
      if (!compareByType[key]) compareByType[key] = emptyCounts();
      if (code) compareByType[key][code] = (compareByType[key][code] || 0) + 1;
    });
  }
  const total = totalFromCounts(counts);
  const pointCount = countPointsForSkill(counts, "attack");
  const metrics = computeMetrics(counts, "attack");
  const compareTotal = totalFromCounts(compareCounts);
  const comparePointCount = countPointsForSkill(compareCounts, "attack");
  const compareMetrics = computeMetrics(compareCounts, "attack");
  const buildAttackCompareClass = (value, otherValue, better = "higher") => {
    if (!compareList || value === null || otherValue === null || value === otherValue) return "";
    const isBetter = better === "lower" ? value < otherValue : value > otherValue;
    return isBetter ? "is-better" : "is-worse";
  };
  const table = document.createElement("table");
  table.className = "attack-analysis-type-table";
  table.innerHTML =
    "<thead><tr><th>Tipo attacco</th><th>Tot</th><th>Err</th><th>Mur</th><th>Punti</th><th>% Punti</th><th>Eff</th></tr></thead>";
  const tbody = document.createElement("tbody");
  Object.keys(byType)
    .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))
    .forEach(type => {
      const rowCounts = normalizeCounts(byType[type]);
      const rowTotal = totalFromCounts(rowCounts);
      const rowPoints = countPointsForSkill(rowCounts, "attack");
      const rowMetrics = computeMetrics(rowCounts, "attack");
      const compareRowCounts = normalizeCounts(compareByType[type]);
      const compareRowTotal = totalFromCounts(compareRowCounts);
      const compareRowPoints = countPointsForSkill(compareRowCounts, "attack");
      const compareRowMetrics = computeMetrics(compareRowCounts, "attack");
      const tr = document.createElement("tr");
      [
        { text: type, compare: null, better: "neutral" },
        { text: rowTotal, compare: compareRowTotal, better: "neutral" },
        { text: rowCounts["="] || 0, compare: compareRowCounts["="] || 0, better: "lower" },
        { text: rowCounts["/"] || 0, compare: compareRowCounts["/"] || 0, better: "lower" },
        { text: rowPoints || 0, compare: compareRowPoints || 0, better: "higher" },
        {
          text: formatPercentValue(rowPoints || 0, rowTotal),
          compare: compareRowTotal ? (compareRowPoints || 0) / compareRowTotal : null,
          better: "higher",
          raw: rowTotal ? (rowPoints || 0) / rowTotal : null
        },
        {
          text: rowMetrics.eff === null ? "-" : formatPercent(rowMetrics.eff),
          compare: compareRowMetrics.eff,
          better: "higher",
          raw: rowMetrics.eff
        }
      ].forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell.text;
        const compareClass = buildAttackCompareClass(
          Object.prototype.hasOwnProperty.call(cell, "raw") ? cell.raw : cell.text,
          cell.compare,
          cell.better
        );
        if (compareClass) td.classList.add(compareClass);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  table.appendChild(tbody);
  const tfoot = document.createElement("tfoot");
  const totalRow = document.createElement("tr");
  totalRow.className = "attack-analysis-total-row";
  [
    { text: "Totale", compare: null, better: "neutral" },
    { text: total, compare: compareTotal, better: "neutral" },
    { text: counts["="] || 0, compare: compareCounts["="] || 0, better: "lower" },
    { text: counts["/"] || 0, compare: compareCounts["/"] || 0, better: "lower" },
    { text: pointCount || 0, compare: comparePointCount || 0, better: "higher" },
    {
      text: formatPercentValue(pointCount || 0, total),
      compare: compareTotal ? (comparePointCount || 0) / compareTotal : null,
      better: "higher",
      raw: total ? (pointCount || 0) / total : null
    },
    {
      text: metrics.eff === null ? "-" : formatPercent(metrics.eff),
      compare: compareMetrics.eff,
      better: "higher",
      raw: metrics.eff
    }
  ].forEach(cell => {
    const td = document.createElement("td");
    td.textContent = cell.text;
    const compareClass = buildAttackCompareClass(
      Object.prototype.hasOwnProperty.call(cell, "raw") ? cell.raw : cell.text,
      cell.compare,
      cell.better
    );
    if (compareClass) td.classList.add(compareClass);
    totalRow.appendChild(td);
  });
  tfoot.appendChild(totalRow);
  table.appendChild(tfoot);
  target.appendChild(table);
}
function renderServeTrajectoryAnalysis() {
  if (!elServeTrajectoryGrid) return;
  renderServeTrajectoryFilters();
  const events = getFilteredServeTrajectoryEvents();
  const analysisScope = getAnalysisTeamScope();
  const courtSideState = ensureCourtSideState("uiServeTrajectoryCourtSideByScope");
  const isFarView = getAnalysisCourtSide(courtSideState[analysisScope]) === "far";
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  const selectedPlayers = serveTrajectoryFilterState.players.size
    ? Array.from(serveTrajectoryFilterState.players)
    : Array.from(new Set(events.map(ev => ev.playerIdx))).filter(idx => typeof idx === "number");
  const playersToRender = selectedPlayers.length
    ? sortPlayerIndexesByNumberForScope(selectedPlayers, analysisScope)
    : [];
  elServeTrajectoryGrid.innerHTML = "";
  const grouped = {};
  events.forEach(ev => {
    if (typeof ev.playerIdx !== "number") return;
    if (!grouped[ev.playerIdx]) grouped[ev.playerIdx] = [];
    grouped[ev.playerIdx].push(ev);
  });
  playersToRender.forEach(playerIdx => {
    let list = grouped[playerIdx] || [];
    const lastEv = list.length ? list[list.length - 1] : null;
    const lastSwap = lastEv && typeof lastEv.courtSideSwapped === "boolean" ? lastEv.courtSideSwapped : null;
    if (lastSwap !== null) {
      list = list.filter(ev => ev && ev.courtSideSwapped === lastSwap);
    }
    const card = document.createElement("div");
    elServeTrajectoryGrid.appendChild(card);
    const titleText =
      analysisScope === "opponent"
        ? formatNameWithNumberFor(analysisPlayers[playerIdx], analysisNumbers) ||
          analysisPlayers[playerIdx] ||
          "—"
        : formatNameWithNumber(analysisPlayers[playerIdx]) || analysisPlayers[playerIdx] || "—";
    renderServeTrajectoryCard(card, {
      titleText,
      events: list,
      scope: analysisScope,
      isFarServe: isFarView,
      onImagesLoad: () => renderServeTrajectoryAnalysis(),
      playerIdx
    });
  });
}
const MATCH_SHEET_ROLE_ORDER = ["P", "S1", "C2", "O", "S2", "C1"];
const MATCH_SHEET_ROTATION_ORDER = [1, 6, 5, 4, 3, 2];
const MATCH_SHEET_DEFENSE_ZONES = [4, 2, 3, 6, 1];
const MATCH_SHEET_COURT_HEIGHT = 200;
const MATCH_SHEET_COURT_ZONES = {
  1: { x: 82, y: 45 },
  2: { x: 82, y: 15 },
  3: { x: 50, y: 15 },
  4: { x: 18, y: 15 },
  5: { x: 18, y: 45 },
  6: { x: 50, y: 45 }
};
const MATCH_SHEET_FAR_COURT_ZONES = {
  1: { x: 82, y: 24 },
  2: { x: 82, y: 76 },
  3: { x: 50, y: 76 },
  4: { x: 18, y: 76 },
  5: { x: 18, y: 24 },
  6: { x: 50, y: 24 }
};
const MATCH_SHEET_NEAR_COURT_ZONES = {
  1: { x: 82, y: 176 },
  2: { x: 82, y: 124 },
  3: { x: 50, y: 124 },
  4: { x: 18, y: 124 },
  5: { x: 18, y: 176 },
  6: { x: 50, y: 176 }
};
