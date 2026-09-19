function renderTrajectoryFilters() {
  if (!elTrajectoryGrid) return;
  renderAnalysisTeamFilter();
  const analysisScope = getAnalysisTeamScope();
  const events = filterEventsByAnalysisTeam();
  const attackEvents = events.filter(ev => ev && ev.skillId === "attack");
  const trajEvents = attackEvents.filter(ev => {
    const dir = ev.attackDirection || ev.attackTrajectory;
    return dir && dir.start && dir.end;
  });
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  const setterLabels = new Map();
  trajEvents.forEach(ev => {
    const setterIdx = getSetterFromEvent(ev);
    if (typeof setterIdx !== "number") return;
    const label =
      (analysisScope === "opponent"
        ? formatNameWithNumberFor(ev.setterName || analysisPlayers[setterIdx], analysisNumbers)
        : formatNameWithNumber(ev.setterName || analysisPlayers[setterIdx])) ||
      ev.setterName ||
      analysisPlayers[setterIdx] ||
      "Alzatrice " + (setterIdx + 1);
    setterLabels.set(setterIdx, label);
  });
  const setterOptsRaw = Array.from(setterLabels.entries()).map(([idx, label]) => ({
    value: idx,
    label
  }));
  const setterOpts = sortPlayerOptionsByNumberForScope(setterOptsRaw, analysisScope);
  const playersOptsRaw = buildUniqueOptions(trajEvents.map(ev => ev.playerIdx), {
    asNumber: true,
    labelFn: idx => {
      const name = analysisPlayers[idx];
      if (!name) return "—";
      return analysisScope === "opponent"
        ? formatNameWithNumberFor(name, analysisNumbers)
        : formatNameWithNumber(name);
    }
  });
  const playersOpts = sortPlayerOptionsByNumberForScope(playersOptsRaw, getAnalysisTeamScope());
  const setsOpts = buildUniqueOptions(trajEvents.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  const codesOpts = filterNormalEvalOptions(
    buildUniqueOptions(trajEvents.map(ev => ev.code), { labelFn: val => val })
  );
  const attackTypeOpts = buildUniqueOptions(
    attackEvents.map(ev => buildAttackTypeLabel(ev.attackType)),
    { labelFn: val => val }
  );
  const zonesOpts = buildUniqueOptions(
    trajEvents.map(ev => {
      const traj = ev.attackDirection || ev.attackTrajectory || {};
      return ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    }),
    { asNumber: true, labelFn: val => "Z" + val }
  );
  const setTypeOpts = buildUniqueOptions(
    trajEvents.map(ev =>
      normalizeSetTypeValue(ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType))
    ),
    { labelFn: val => getOptionLabel(DEFAULT_SET_TYPE_OPTIONS, val) }
  );
  const baseOpts = buildUniqueOptions(
    trajEvents.map(ev => normalizeBaseValue(ev.base)),
    { labelFn: val => getOptionLabel(DEFAULT_BASE_OPTIONS, val) }
  );
  const phaseOpts = buildUniqueOptions(trajEvents.map(ev => getEventPhaseValue(ev)), {
    labelFn: val => getOptionLabel(DEFAULT_PHASE_OPTIONS, val)
  });
  const recvEvalOpts = buildUniqueOptions(
    trajEvents.map(ev => normalizeEvalCode(ev.receiveEvaluation)),
    { labelFn: val => val }
  );
  const recvZoneOpts = buildUniqueOptions(
    trajEvents.map(ev => normalizeReceiveZone(ev.receivePosition || ev.receiveZone)),
    { asNumber: true, labelFn: val => "Z" + val }
  );

  trajectoryFilterState.players = new Set(
    [...trajectoryFilterState.players].filter(idx => playersOpts.some(p => Number(p.value) === idx))
  );
  trajectoryFilterState.setters = new Set(
    [...trajectoryFilterState.setters].filter(idx => setterOpts.some(p => Number(p.value) === idx))
  );
  trajectoryFilterState.sets = new Set(
    [...trajectoryFilterState.sets].filter(setNum => setsOpts.some(o => Number(o.value) === setNum))
  );
  trajectoryFilterState.codes = new Set(
    [...trajectoryFilterState.codes].filter(code => codesOpts.some(c => c.value === code))
  );
  trajectoryFilterState.attackTypes = new Set(
    [...trajectoryFilterState.attackTypes].filter(val => attackTypeOpts.some(o => o.value === val))
  );
  trajectoryFilterState.zones = new Set(
    [...trajectoryFilterState.zones].filter(z => zonesOpts.some(o => Number(o.value) === z))
  );
  trajectoryFilterState.setTypes = new Set(
    [...trajectoryFilterState.setTypes].filter(val => setTypeOpts.some(o => o.value === val))
  );
  trajectoryFilterState.bases = new Set(
    [...trajectoryFilterState.bases].filter(val => baseOpts.some(o => o.value === val))
  );
  trajectoryFilterState.phases = new Set(
    [...trajectoryFilterState.phases].filter(val => phaseOpts.some(o => o.value === val))
  );
  trajectoryFilterState.receiveEvaluations = new Set(
    [...trajectoryFilterState.receiveEvaluations].filter(val => recvEvalOpts.some(o => o.value === val))
  );
  trajectoryFilterState.receiveZones = new Set(
    [...trajectoryFilterState.receiveZones].filter(val => recvZoneOpts.some(o => Number(o.value) === val))
  );
  if (!PREVIOUS_SKILL_OPTIONS.some(opt => opt.value === trajectoryFilterState.prevSkill)) {
    trajectoryFilterState.prevSkill = "any";
  }

  const visibleFilters = [];
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterSetters, setterOpts, trajectoryFilterState.setters, {
      asNumber: true,
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterPlayers, playersOpts, trajectoryFilterState.players, {
      asNumber: true,
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterSets, setsOpts, trajectoryFilterState.sets, {
      asNumber: true,
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterSetTypes, setTypeOpts, trajectoryFilterState.setTypes, {
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterBases, baseOpts, trajectoryFilterState.bases, {
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterPhases, phaseOpts, trajectoryFilterState.phases, {
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterReceiveEvals, recvEvalOpts, trajectoryFilterState.receiveEvaluations, {
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterReceiveZones, recvZoneOpts, trajectoryFilterState.receiveZones, {
      asNumber: true,
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterCodes, codesOpts, trajectoryFilterState.codes, {
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterAttackTypes, attackTypeOpts, trajectoryFilterState.attackTypes, {
      onChange: handleTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elTrajFilterZones, zonesOpts, trajectoryFilterState.zones, {
      asNumber: true,
      onChange: handleTrajectoryFilterChange
    })
  );
  toggleFilterVisibility(elTrajFilterPrev, true);
  toggleFilterVisibility(elTrajFilterReset, visibleFilters.some(Boolean));
  if (elTrajFilterPrev) {
    elTrajFilterPrev.value = trajectoryFilterState.prevSkill || "any";
    if (!elTrajFilterPrev._trajPrevBound) {
      elTrajFilterPrev.addEventListener("change", handleTrajectoryFilterChange);
      elTrajFilterPrev._trajPrevBound = true;
    }
  }
  if (elTrajCourtSide) {
    const side = getAnalysisCourtSide(ensureCourtSideState("uiTrajectoryCourtSideByScope")[analysisScope]);
    renderAnalysisCourtSideRadios(elTrajCourtSide, side, () => {
      const scope = getAnalysisTeamScope();
      const nextState = ensureCourtSideState("uiTrajectoryCourtSideByScope");
      nextState[scope] = getAnalysisCourtSide(getCheckedRadioValue(elTrajCourtSide));
      saveState();
      renderTrajectoryAnalysis();
    }, "analysis-court-side");
  }
  if (elTrajFilterReset && !elTrajFilterReset._trajResetBound) {
    elTrajFilterReset.addEventListener("click", resetTrajectoryFilters);
    elTrajFilterReset._trajResetBound = true;
  }
}
function renderServeTrajectoryFilters() {
  if (!elServeTrajectoryGrid) return;
  renderAnalysisTeamFilter();
  const analysisScope = getAnalysisTeamScope();
  const events = filterEventsByAnalysisTeam();
  const serveEvents = events.filter(ev => ev && ev.skillId === "serve" && ev.serveStart && ev.serveEnd);
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  const playersOptsRaw = buildUniqueOptions(serveEvents.map(ev => ev.playerIdx), {
    asNumber: true,
    labelFn: idx => {
      const name = analysisPlayers[idx];
      if (!name) return "—";
      return analysisScope === "opponent"
        ? formatNameWithNumberFor(name, analysisNumbers)
        : formatNameWithNumber(name);
    }
  });
  const playersOpts = sortPlayerOptionsByNumberForScope(playersOptsRaw, analysisScope);
  const setsOpts = buildUniqueOptions(serveEvents.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  const codesOpts = filterNormalEvalOptions(
    buildUniqueOptions(serveEvents.map(ev => ev.code), { labelFn: val => val })
  );
  const zonesOpts = buildUniqueOptions(serveEvents.map(ev => getServeStartZone(ev)), {
    asNumber: true,
    labelFn: val => "Z" + val
  });
  const setTypeOpts = buildUniqueOptions(
    serveEvents.map(ev =>
      normalizeSetTypeValue(ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType))
    ),
    { labelFn: val => getOptionLabel(DEFAULT_SET_TYPE_OPTIONS, val) }
  );
  const baseOpts = buildUniqueOptions(
    serveEvents.map(ev => normalizeBaseValue(ev.base)),
    { labelFn: val => getOptionLabel(DEFAULT_BASE_OPTIONS, val) }
  );
  const phaseOpts = buildUniqueOptions(serveEvents.map(ev => getEventPhaseValue(ev)), {
    labelFn: val => getOptionLabel(DEFAULT_PHASE_OPTIONS, val)
  });
  const recvEvalOpts = buildUniqueOptions(
    serveEvents.map(ev => normalizeEvalCode(ev.receiveEvaluation)),
    { labelFn: val => val }
  );
  const recvZoneOpts = buildUniqueOptions(
    serveEvents.map(ev => normalizeReceiveZone(ev.receivePosition || ev.receiveZone)),
    { asNumber: true, labelFn: val => "Z" + val }
  );

  serveTrajectoryFilterState.players = new Set(
    [...serveTrajectoryFilterState.players].filter(idx => playersOpts.some(p => Number(p.value) === idx))
  );
  serveTrajectoryFilterState.sets = new Set(
    [...serveTrajectoryFilterState.sets].filter(setNum => setsOpts.some(o => Number(o.value) === setNum))
  );
  serveTrajectoryFilterState.codes = new Set(
    [...serveTrajectoryFilterState.codes].filter(code => codesOpts.some(c => c.value === code))
  );
  serveTrajectoryFilterState.zones = new Set(
    [...serveTrajectoryFilterState.zones].filter(z => zonesOpts.some(o => Number(o.value) === z))
  );
  serveTrajectoryFilterState.setTypes = new Set(
    [...serveTrajectoryFilterState.setTypes].filter(val => setTypeOpts.some(o => o.value === val))
  );
  serveTrajectoryFilterState.bases = new Set(
    [...serveTrajectoryFilterState.bases].filter(val => baseOpts.some(o => o.value === val))
  );
  serveTrajectoryFilterState.phases = new Set(
    [...serveTrajectoryFilterState.phases].filter(val => phaseOpts.some(o => o.value === val))
  );
  serveTrajectoryFilterState.receiveEvaluations = new Set(
    [...serveTrajectoryFilterState.receiveEvaluations].filter(val => recvEvalOpts.some(o => o.value === val))
  );
  serveTrajectoryFilterState.receiveZones = new Set(
    [...serveTrajectoryFilterState.receiveZones].filter(val => recvZoneOpts.some(o => Number(o.value) === val))
  );

  const visibleFilters = [];
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterPlayers, playersOpts, serveTrajectoryFilterState.players, {
      asNumber: true,
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterSets, setsOpts, serveTrajectoryFilterState.sets, {
      asNumber: true,
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterSetTypes, setTypeOpts, serveTrajectoryFilterState.setTypes, {
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterBases, baseOpts, serveTrajectoryFilterState.bases, {
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterPhases, phaseOpts, serveTrajectoryFilterState.phases, {
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterReceiveEvals, recvEvalOpts, serveTrajectoryFilterState.receiveEvaluations, {
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterReceiveZones, recvZoneOpts, serveTrajectoryFilterState.receiveZones, {
      asNumber: true,
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterCodes, codesOpts, serveTrajectoryFilterState.codes, {
      onChange: handleServeTrajectoryFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elServeTrajFilterZones, zonesOpts, serveTrajectoryFilterState.zones, {
      asNumber: true,
      onChange: handleServeTrajectoryFilterChange
    })
  );
  toggleFilterVisibility(elServeTrajFilterReset, visibleFilters.some(Boolean));
  if (elServeTrajCourtSide) {
    const side = getAnalysisCourtSide(ensureCourtSideState("uiServeTrajectoryCourtSideByScope")[analysisScope]);
    renderAnalysisCourtSideRadios(elServeTrajCourtSide, side, () => {
      const scope = getAnalysisTeamScope();
      const nextState = ensureCourtSideState("uiServeTrajectoryCourtSideByScope");
      nextState[scope] = getAnalysisCourtSide(getCheckedRadioValue(elServeTrajCourtSide));
      saveState();
      renderServeTrajectoryAnalysis();
    }, "analysis-serve-court-side");
  }
  if (elServeTrajFilterReset && !elServeTrajFilterReset._serveTrajResetBound) {
    elServeTrajFilterReset.addEventListener("click", resetServeTrajectoryFilters);
    elServeTrajFilterReset._serveTrajResetBound = true;
  }
}
