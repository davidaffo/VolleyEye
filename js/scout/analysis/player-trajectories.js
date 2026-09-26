function syncPlayerTrajectoryFilterState() {
  playerTrajectoryFilterState.sets = new Set(getCheckedValues(elPlayerTrajFilterSets, { asNumber: true }));
  playerTrajectoryFilterState.codes = new Set(getCheckedValues(elPlayerTrajFilterCodes));
  playerTrajectoryFilterState.attackTypes = new Set(getCheckedValues(elPlayerTrajFilterAttackTypes));
  playerTrajectoryFilterState.zones = new Set(getCheckedValues(elPlayerTrajFilterZones, { asNumber: true }));
  playerTrajectoryFilterState.setTypes = new Set(getCheckedValues(elPlayerTrajFilterSetTypes));
  playerTrajectoryFilterState.bases = new Set(getCheckedValues(elPlayerTrajFilterBases));
  playerTrajectoryFilterState.phases = new Set(getCheckedValues(elPlayerTrajFilterPhases));
  playerTrajectoryFilterState.receiveEvaluations = new Set(getCheckedValues(elPlayerTrajFilterReceiveEvals));
  playerTrajectoryFilterState.receiveZones = new Set(getCheckedValues(elPlayerTrajFilterReceiveZones, { asNumber: true }));
  playerTrajectoryFilterState.prevSkill = (elPlayerTrajFilterPrev && elPlayerTrajFilterPrev.value) || "any";
}
function handlePlayerTrajectoryFilterChange() {
  syncPlayerTrajectoryFilterState();
  renderPlayerTrajectoryAnalysis();
}
function resetPlayerTrajectoryFilters() {
  playerTrajectoryFilterState.sets.clear();
  playerTrajectoryFilterState.codes.clear();
  playerTrajectoryFilterState.attackTypes.clear();
  playerTrajectoryFilterState.zones.clear();
  playerTrajectoryFilterState.setTypes.clear();
  playerTrajectoryFilterState.bases.clear();
  playerTrajectoryFilterState.phases.clear();
  playerTrajectoryFilterState.receiveEvaluations.clear();
  playerTrajectoryFilterState.receiveZones.clear();
  playerTrajectoryFilterState.prevSkill = "any";
  if (elPlayerTrajFilterPrev) elPlayerTrajFilterPrev.value = "any";
  renderPlayerTrajectoryFilters();
  renderPlayerTrajectoryAnalysis();
}
function renderPlayerTrajectoryFilters() {
  if (!elPlayerTrajectoryGrid) return;
  const playerIdx = getPlayerAnalysisPlayerIdx();
  const allAttackEvents = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return ev.playerIdx === playerIdx;
  });
  const events = allAttackEvents.filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    const dir = ev.attackDirection || ev.attackTrajectory;
    if (!dir || !dir.start || !dir.end) return false;
    return true;
  });
  const setsOpts = buildUniqueOptions(events.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  const codesOpts = filterNormalEvalOptions(
    buildUniqueOptions(events.map(ev => ev.code), { labelFn: val => val })
  );
  const attackTypeOpts = buildUniqueOptions(
    allAttackEvents.map(ev => buildAttackTypeLabel(ev.attackType)),
    { labelFn: val => val }
  );
  const zonesOpts = buildUniqueOptions(
    events.map(ev => {
      const traj = ev.attackDirection || ev.attackTrajectory || {};
      return ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    }),
    { asNumber: true, labelFn: val => "Z" + val }
  );
  const setTypeOpts = buildUniqueOptions(
    events.map(ev =>
      normalizeSetTypeValue(ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType))
    ),
    { labelFn: val => getOptionLabel(DEFAULT_SET_TYPE_OPTIONS, val) }
  );
  const baseOpts = buildUniqueOptions(
    events.map(ev => normalizeBaseValue(ev.base)),
    { labelFn: val => getOptionLabel(DEFAULT_BASE_OPTIONS, val) }
  );
  const phaseOpts = buildUniqueOptions(events.map(ev => getEventPhaseValue(ev)), {
    labelFn: val => getOptionLabel(DEFAULT_PHASE_OPTIONS, val)
  });
  const recvEvalOpts = buildUniqueOptions(
    events.map(ev => normalizeEvalCode(ev.receiveEvaluation)),
    { labelFn: val => val }
  );
  const recvZoneOpts = buildUniqueOptions(
    events.map(ev => normalizeReceiveZone(ev.receivePosition || ev.receiveZone)),
    { asNumber: true, labelFn: val => "Z" + val }
  );

  playerTrajectoryFilterState.sets = new Set(
    [...playerTrajectoryFilterState.sets].filter(setNum => setsOpts.some(o => Number(o.value) === setNum))
  );
  playerTrajectoryFilterState.codes = new Set(
    [...playerTrajectoryFilterState.codes].filter(code => codesOpts.some(c => c.value === code))
  );
  playerTrajectoryFilterState.attackTypes = new Set(
    [...playerTrajectoryFilterState.attackTypes].filter(val => attackTypeOpts.some(o => o.value === val))
  );
  playerTrajectoryFilterState.zones = new Set(
    [...playerTrajectoryFilterState.zones].filter(z => zonesOpts.some(o => Number(o.value) === z))
  );
  playerTrajectoryFilterState.setTypes = new Set(
    [...playerTrajectoryFilterState.setTypes].filter(val => setTypeOpts.some(o => o.value === val))
  );
  playerTrajectoryFilterState.bases = new Set(
    [...playerTrajectoryFilterState.bases].filter(val => baseOpts.some(o => o.value === val))
  );
  playerTrajectoryFilterState.phases = new Set(
    [...playerTrajectoryFilterState.phases].filter(val => phaseOpts.some(o => o.value === val))
  );
  playerTrajectoryFilterState.receiveEvaluations = new Set(
    [...playerTrajectoryFilterState.receiveEvaluations].filter(val => recvEvalOpts.some(o => o.value === val))
  );
  playerTrajectoryFilterState.receiveZones = new Set(
    [...playerTrajectoryFilterState.receiveZones].filter(val => recvZoneOpts.some(o => Number(o.value) === val))
  );
  if (!PREVIOUS_SKILL_OPTIONS.some(opt => opt.value === playerTrajectoryFilterState.prevSkill)) {
    playerTrajectoryFilterState.prevSkill = "any";
  }

  const visibleFilters = [];
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterSets, setsOpts, playerTrajectoryFilterState.sets, {
      asNumber: true,
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterSetTypes, setTypeOpts, playerTrajectoryFilterState.setTypes, {
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterBases, baseOpts, playerTrajectoryFilterState.bases, {
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterPhases, phaseOpts, playerTrajectoryFilterState.phases, {
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterReceiveEvals, recvEvalOpts, playerTrajectoryFilterState.receiveEvaluations, {
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterReceiveZones, recvZoneOpts, playerTrajectoryFilterState.receiveZones, {
      asNumber: true,
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterCodes, codesOpts, playerTrajectoryFilterState.codes, {
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterAttackTypes, attackTypeOpts, playerTrajectoryFilterState.attackTypes, {
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerTrajFilterZones, zonesOpts, playerTrajectoryFilterState.zones, {
      asNumber: true,
      onChange: handlePlayerTrajectoryFilterChange
    })
  );
  toggleFilterVisibility(elPlayerTrajFilterPrev, true);
  toggleFilterVisibility(elPlayerTrajFilterReset, visibleFilters.some(Boolean));
  if (elPlayerTrajFilterPrev) {
    elPlayerTrajFilterPrev.value = playerTrajectoryFilterState.prevSkill || "any";
    if (!elPlayerTrajFilterPrev._playerTrajPrevBound) {
      elPlayerTrajFilterPrev.addEventListener("change", handlePlayerTrajectoryFilterChange);
      elPlayerTrajFilterPrev._playerTrajPrevBound = true;
    }
  }
  if (elPlayerTrajFilterReset && !elPlayerTrajFilterReset._playerTrajResetBound) {
    elPlayerTrajFilterReset.addEventListener("click", resetPlayerTrajectoryFilters);
    elPlayerTrajFilterReset._playerTrajResetBound = true;
  }
}
function getFilteredPlayerTrajectoryEvents() {
  const playerIdx = getPlayerAnalysisPlayerIdx();
  return getFilteredPlayerTrajectoryEventsForPlayer(playerIdx);
}
function buildPlayerTrajectoryGridSkeleton() {
  const grid = document.createElement("div");
  grid.className = "trajectory-grid";
  [4, 3, 2, 5, 6, 1].forEach(zone => {
    const card = document.createElement("div");
    card.className = `trajectory-card traj-area-z${zone}`;
    card.dataset.zone = String(zone);
    const title = document.createElement("div");
    title.className = "trajectory-card__title";
    title.textContent = "Zona " + zone;
    const canvas = document.createElement("canvas");
    canvas.dataset.trajCanvas = String(zone);
    const empty = document.createElement("div");
    empty.className = "trajectory-card__empty";
    empty.textContent = "Nessuna traiettoria";
    card.appendChild(title);
    card.appendChild(canvas);
    card.appendChild(empty);
    grid.appendChild(card);
  });
  return grid;
}
function getFilteredPlayerTrajectoryEventsForPlayer(playerIdx) {
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    const dir = ev.attackDirection || ev.attackTrajectory;
    if (!dir || !dir.start || !dir.end) return false;
    if (playerIdx === null) return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return ev.playerIdx === playerIdx;
  });
  return events.filter(ev => {
    const traj = ev.attackDirection || ev.attackTrajectory;
    const startZone = ev.attackStartZone || (traj && traj.startZone) || ev.zone || ev.playerPosition || null;
    const setNum = normalizeSetNumber(ev.set);
    if (!matchesAdvancedFilters(ev, playerTrajectoryFilterState)) return false;
    if (playerTrajectoryFilterState.sets.size && !playerTrajectoryFilterState.sets.has(setNum)) return false;
    if (playerTrajectoryFilterState.codes.size && !playerTrajectoryFilterState.codes.has(ev.code)) return false;
    if (playerTrajectoryFilterState.attackTypes.size && !playerTrajectoryFilterState.attackTypes.has(buildAttackTypeLabel(ev.attackType))) return false;
    if (playerTrajectoryFilterState.zones.size && !playerTrajectoryFilterState.zones.has(startZone)) return false;
    return true;
  });
}
function getFilteredPlayerAttackSummaryEventsForPlayer(playerIdx) {
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return ev.playerIdx === playerIdx;
  });
  return events.filter(ev => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const startZone = ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    const setNum = normalizeSetNumber(ev.set);
    if (!matchesAdvancedFilters(ev, playerTrajectoryFilterState)) return false;
    if (playerTrajectoryFilterState.sets.size && !playerTrajectoryFilterState.sets.has(setNum)) return false;
    if (playerTrajectoryFilterState.codes.size && !playerTrajectoryFilterState.codes.has(ev.code)) return false;
    if (playerTrajectoryFilterState.attackTypes.size && !playerTrajectoryFilterState.attackTypes.has(buildAttackTypeLabel(ev.attackType))) return false;
    if (playerTrajectoryFilterState.zones.size && !playerTrajectoryFilterState.zones.has(startZone)) return false;
    return true;
  });
}
function renderPlayerTrajectoryAnalysis() {
  if (!elPlayerTrajectoryGrid) return;
  renderPlayerTrajectoryFilters();
  renderAttackMetricsSummary(
    elPlayerAttackSummary,
    getFilteredPlayerAttackSummaryEventsForPlayer(getPlayerAnalysisPlayerIdx())
  );
  renderAttackTrajectoryGridForPlayer(elPlayerTrajectoryGrid, getPlayerAnalysisPlayerIdx());
}
function renderAttackTrajectoryGridForPlayer(targetGrid, playerIdx) {
  if (!targetGrid) return;
  renderTrajectoryLegend(targetGrid, "attack");
  const canvases = targetGrid.querySelectorAll("canvas[data-traj-canvas]");
  if (!canvases || canvases.length === 0) return;
  const prefs = ensurePlayerAnalysisState();
  const analysisScope = getAnalysisTeamScope();
  const isFarView = getAnalysisCourtSide(prefs.courtSideByScope[analysisScope]) === "far";
  targetGrid.classList.toggle("is-far", isFarView);
  const events = getFilteredPlayerTrajectoryEventsForPlayer(playerIdx);
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
    const img = getTrajectoryBg(zone, isFarView, () => renderPlayerAnalysis());
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
function syncPlayerServeTrajectoryFilterState() {
  playerServeTrajectoryFilterState.sets = new Set(getCheckedValues(elPlayerServeTrajFilterSets, { asNumber: true }));
  playerServeTrajectoryFilterState.codes = new Set(getCheckedValues(elPlayerServeTrajFilterCodes));
  playerServeTrajectoryFilterState.zones = new Set(getCheckedValues(elPlayerServeTrajFilterZones, { asNumber: true }));
  playerServeTrajectoryFilterState.setTypes = new Set(getCheckedValues(elPlayerServeTrajFilterSetTypes));
  playerServeTrajectoryFilterState.bases = new Set(getCheckedValues(elPlayerServeTrajFilterBases));
  playerServeTrajectoryFilterState.phases = new Set(getCheckedValues(elPlayerServeTrajFilterPhases));
  playerServeTrajectoryFilterState.receiveEvaluations = new Set(getCheckedValues(elPlayerServeTrajFilterReceiveEvals));
  playerServeTrajectoryFilterState.receiveZones = new Set(getCheckedValues(elPlayerServeTrajFilterReceiveZones, { asNumber: true }));
}
function handlePlayerServeTrajectoryFilterChange() {
  syncPlayerServeTrajectoryFilterState();
  renderPlayerServeTrajectoryAnalysis();
}
function resetPlayerServeTrajectoryFilters() {
  playerServeTrajectoryFilterState.sets.clear();
  playerServeTrajectoryFilterState.codes.clear();
  playerServeTrajectoryFilterState.zones.clear();
  playerServeTrajectoryFilterState.setTypes.clear();
  playerServeTrajectoryFilterState.bases.clear();
  playerServeTrajectoryFilterState.phases.clear();
  playerServeTrajectoryFilterState.receiveEvaluations.clear();
  playerServeTrajectoryFilterState.receiveZones.clear();
  renderPlayerServeTrajectoryFilters();
  renderPlayerServeTrajectoryAnalysis();
}
function renderPlayerServeTrajectoryFilters() {
  if (!elPlayerServeTrajectoryGrid) return;
  const playerIdx = getPlayerAnalysisPlayerIdx();
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "serve") return false;
    if (!ev.serveStart || !ev.serveEnd) return false;
    if (playerIdx === null) return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return ev.playerIdx === playerIdx;
  });
  const setsOpts = buildUniqueOptions(events.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  const codesOpts = filterNormalEvalOptions(
    buildUniqueOptions(events.map(ev => ev.code), { labelFn: val => val })
  );
  const zonesOpts = buildUniqueOptions(events.map(ev => getServeStartZone(ev)), {
    asNumber: true,
    labelFn: val => "Z" + val
  });
  const setTypeOpts = buildUniqueOptions(
    events.map(ev =>
      normalizeSetTypeValue(ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType))
    ),
    { labelFn: val => getOptionLabel(DEFAULT_SET_TYPE_OPTIONS, val) }
  );
  const baseOpts = buildUniqueOptions(
    events.map(ev => normalizeBaseValue(ev.base)),
    { labelFn: val => getOptionLabel(DEFAULT_BASE_OPTIONS, val) }
  );
  const phaseOpts = buildUniqueOptions(events.map(ev => getEventPhaseValue(ev)), {
    labelFn: val => getOptionLabel(DEFAULT_PHASE_OPTIONS, val)
  });
  const recvEvalOpts = buildUniqueOptions(
    events.map(ev => normalizeEvalCode(ev.receiveEvaluation)),
    { labelFn: val => val }
  );
  const recvZoneOpts = buildUniqueOptions(
    events.map(ev => normalizeReceiveZone(ev.receivePosition || ev.receiveZone)),
    { asNumber: true, labelFn: val => "Z" + val }
  );

  playerServeTrajectoryFilterState.sets = new Set(
    [...playerServeTrajectoryFilterState.sets].filter(setNum => setsOpts.some(o => Number(o.value) === setNum))
  );
  playerServeTrajectoryFilterState.codes = new Set(
    [...playerServeTrajectoryFilterState.codes].filter(code => codesOpts.some(c => c.value === code))
  );
  playerServeTrajectoryFilterState.zones = new Set(
    [...playerServeTrajectoryFilterState.zones].filter(z => zonesOpts.some(o => Number(o.value) === z))
  );
  playerServeTrajectoryFilterState.setTypes = new Set(
    [...playerServeTrajectoryFilterState.setTypes].filter(val => setTypeOpts.some(o => o.value === val))
  );
  playerServeTrajectoryFilterState.bases = new Set(
    [...playerServeTrajectoryFilterState.bases].filter(val => baseOpts.some(o => o.value === val))
  );
  playerServeTrajectoryFilterState.phases = new Set(
    [...playerServeTrajectoryFilterState.phases].filter(val => phaseOpts.some(o => o.value === val))
  );
  playerServeTrajectoryFilterState.receiveEvaluations = new Set(
    [...playerServeTrajectoryFilterState.receiveEvaluations].filter(val => recvEvalOpts.some(o => o.value === val))
  );
  playerServeTrajectoryFilterState.receiveZones = new Set(
    [...playerServeTrajectoryFilterState.receiveZones].filter(val => recvZoneOpts.some(o => Number(o.value) === val))
  );

  const visibleFilters = [];
  visibleFilters.push(
    renderDynamicFilter(elPlayerServeTrajFilterSets, setsOpts, playerServeTrajectoryFilterState.sets, {
      asNumber: true,
      onChange: handlePlayerServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerServeTrajFilterSetTypes, setTypeOpts, playerServeTrajectoryFilterState.setTypes, {
      onChange: handlePlayerServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerServeTrajFilterBases, baseOpts, playerServeTrajectoryFilterState.bases, {
      onChange: handlePlayerServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerServeTrajFilterPhases, phaseOpts, playerServeTrajectoryFilterState.phases, {
      onChange: handlePlayerServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(
      elPlayerServeTrajFilterReceiveEvals,
      recvEvalOpts,
      playerServeTrajectoryFilterState.receiveEvaluations,
      { onChange: handlePlayerServeTrajectoryFilterChange }
    )
  );
  visibleFilters.push(
    renderDynamicFilter(
      elPlayerServeTrajFilterReceiveZones,
      recvZoneOpts,
      playerServeTrajectoryFilterState.receiveZones,
      { asNumber: true, onChange: handlePlayerServeTrajectoryFilterChange }
    )
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerServeTrajFilterCodes, codesOpts, playerServeTrajectoryFilterState.codes, {
      onChange: handlePlayerServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerServeTrajFilterZones, zonesOpts, playerServeTrajectoryFilterState.zones, {
      asNumber: true,
      onChange: handlePlayerServeTrajectoryFilterChange
    })
  );
  toggleFilterVisibility(elPlayerServeTrajFilterReset, visibleFilters.some(Boolean));
  if (elPlayerServeTrajFilterReset && !elPlayerServeTrajFilterReset._playerServeResetBound) {
    elPlayerServeTrajFilterReset.addEventListener("click", resetPlayerServeTrajectoryFilters);
    elPlayerServeTrajFilterReset._playerServeResetBound = true;
  }
}
function getFilteredPlayerServeTrajectoryEvents() {
  const playerIdx = getPlayerAnalysisPlayerIdx();
  return getFilteredPlayerServeTrajectoryEventsForPlayer(playerIdx);
}
function getFilteredPlayerServeTrajectoryEventsForPlayer(playerIdx) {
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "serve") return false;
    if (!ev.serveStart || !ev.serveEnd) return false;
    if (playerIdx === null) return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return ev.playerIdx === playerIdx;
  });
  return events.filter(ev => {
    const startZone = getServeStartZone(ev);
    const setNum = normalizeSetNumber(ev.set);
    if (!matchesAdvancedFilters(ev, playerServeTrajectoryFilterState)) return false;
    if (playerServeTrajectoryFilterState.sets.size && !playerServeTrajectoryFilterState.sets.has(setNum)) return false;
    if (playerServeTrajectoryFilterState.codes.size && !playerServeTrajectoryFilterState.codes.has(ev.code)) return false;
    if (playerServeTrajectoryFilterState.zones.size && !playerServeTrajectoryFilterState.zones.has(startZone)) return false;
    return true;
  });
}
function renderPlayerServeTrajectoryAnalysis() {
  if (!elPlayerServeTrajectoryGrid) return;
  renderPlayerServeTrajectoryFilters();
  renderServeTrajectoryGridForPlayer(elPlayerServeTrajectoryGrid, getPlayerAnalysisPlayerIdx());
}
function renderServeTrajectoryGridForPlayer(targetGrid, playerIdx) {
  if (!targetGrid) return;
  const events = getFilteredPlayerServeTrajectoryEventsForPlayer(playerIdx);
  targetGrid.innerHTML = "";
  if (playerIdx === null) return;
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const card = document.createElement("div");
  targetGrid.appendChild(card);
  const titleText =
    analysisScope === "opponent"
      ? formatNameWithNumberFor(players[playerIdx], numbers) || players[playerIdx] || "—"
      : formatNameWithNumber(players[playerIdx]) || players[playerIdx] || "—";
  const prefs = ensurePlayerAnalysisState();
  const isFarView = getAnalysisCourtSide(prefs.courtSideByScope[analysisScope]) === "far";
  renderServeTrajectoryCard(card, {
    titleText,
    events,
    scope: analysisScope,
    isFarServe: isFarView,
    onImagesLoad: () => renderPlayerAnalysis(),
    playerIdx
  });
  renderTrajectoryLegend(targetGrid, "serve");
}
