function syncSecondFilterState() {
  const els = getSecondFilterElements();
  if (!els) return;
  secondFilterState.setters = new Set(getCheckedValues(els.setters, { asNumber: true }));
  secondFilterState.players = new Set(getCheckedValues(els.players, { asNumber: true }));
  secondFilterState.codes = new Set(getCheckedValues(els.codes));
  secondFilterState.zones = new Set(getCheckedValues(els.zones, { asNumber: true }));
  secondFilterState.setTypes = new Set(getCheckedValues(els.setTypes));
  secondFilterState.bases = new Set(getCheckedValues(els.bases));
  secondFilterState.phases = new Set(getCheckedValues(els.phases));
  secondFilterState.receiveEvaluations = new Set(getCheckedValues(els.receiveEvals));
  secondFilterState.receiveZones = new Set(getCheckedValues(els.receiveZones, { asNumber: true }));
  secondFilterState.sets = new Set(getCheckedValues(els.sets, { asNumber: true }));
  secondFilterState.prevSkill = (els.prev && els.prev.value) || "any";
}
function handleSecondFilterChange() {
  syncSecondFilterState();
  renderSecondTable();
}
function resetSecondFilters() {
  secondFilterState.setters.clear();
  secondFilterState.players.clear();
  secondFilterState.codes.clear();
  secondFilterState.zones.clear();
  secondFilterState.setTypes.clear();
  secondFilterState.bases.clear();
  secondFilterState.phases.clear();
  secondFilterState.receiveEvaluations.clear();
  secondFilterState.receiveZones.clear();
  secondFilterState.sets.clear();
  secondFilterState.prevSkill = "any";
  const els = getSecondFilterElements();
  if (els && els.prev) els.prev.value = "any";
  renderSecondFilters();
  renderSecondTable();
}
function renderSecondFilters() {
  const els = getSecondFilterElements();
  if (!els) return;
  renderAnalysisTeamFilter();
  const events = filterEventsByAnalysisTeam();
  const attackEvents = events.filter(ev => ev && ev.skillId === "attack");
  const analysisScope = getAnalysisTeamScope();
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  const setterLabels = new Map();
  attackEvents.forEach(ev => {
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
  const playersOptsRaw = buildUniqueOptions(attackEvents.map(ev => ev.playerIdx), {
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
  const setOpts = buildUniqueOptions(attackEvents.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });
  const codesOpts = filterNormalEvalOptions(
    buildUniqueOptions(attackEvents.map(ev => ev.code), { labelFn: val => val })
  );
  const zonesOpts = buildUniqueOptions(
    attackEvents.map(ev => {
      const traj = ev.attackDirection || ev.attackTrajectory || {};
      return ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    }),
    { asNumber: true, labelFn: val => "Z" + val }
  );
  const setTypeOpts = buildUniqueOptions(
    attackEvents.map(ev =>
      normalizeSetTypeValue(ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType))
    ),
    { labelFn: val => getOptionLabel(DEFAULT_SET_TYPE_OPTIONS, val) }
  );
  const baseOpts = buildUniqueOptions(
    attackEvents.map(ev => normalizeBaseValue(ev.base)),
    { labelFn: val => getOptionLabel(DEFAULT_BASE_OPTIONS, val) }
  );
  const phaseOpts = buildUniqueOptions(attackEvents.map(ev => getEventPhaseValue(ev)), {
    labelFn: val => getOptionLabel(DEFAULT_PHASE_OPTIONS, val)
  });
  const recvEvalOpts = buildUniqueOptions(
    attackEvents.map(ev => normalizeEvalCode(ev.receiveEvaluation)),
    { labelFn: val => val }
  );
  const recvZoneOpts = buildUniqueOptions(
    attackEvents.map(ev => normalizeReceiveZone(ev.receivePosition || ev.receiveZone)),
    { asNumber: true, labelFn: val => "Z" + val }
  );

  secondFilterState.setters = new Set(
    [...secondFilterState.setters].filter(idx => setterOpts.some(p => Number(p.value) === idx))
  );
  secondFilterState.players = new Set(
    [...secondFilterState.players].filter(idx => playersOpts.some(p => Number(p.value) === idx))
  );
  secondFilterState.codes = new Set(
    [...secondFilterState.codes].filter(val => codesOpts.some(o => o.value === val))
  );
  secondFilterState.zones = new Set(
    [...secondFilterState.zones].filter(val => zonesOpts.some(o => Number(o.value) === val))
  );
  secondFilterState.setTypes = new Set(
    [...secondFilterState.setTypes].filter(val => setTypeOpts.some(o => o.value === val))
  );
  secondFilterState.bases = new Set([...secondFilterState.bases].filter(val => baseOpts.some(o => o.value === val)));
  secondFilterState.phases = new Set([...secondFilterState.phases].filter(val => phaseOpts.some(o => o.value === val)));
  secondFilterState.receiveEvaluations = new Set(
    [...secondFilterState.receiveEvaluations].filter(val => recvEvalOpts.some(o => o.value === val))
  );
  secondFilterState.receiveZones = new Set(
    [...secondFilterState.receiveZones].filter(val => recvZoneOpts.some(o => Number(o.value) === val))
  );
  secondFilterState.sets = new Set([...secondFilterState.sets].filter(val => setOpts.some(o => Number(o.value) === val)));
  if (!PREVIOUS_SKILL_OPTIONS.some(opt => opt.value === secondFilterState.prevSkill)) {
    secondFilterState.prevSkill = "any";
  }

  const visibleFilters = [];
  visibleFilters.push(
    renderDynamicFilter(els.setters, setterOpts, secondFilterState.setters, {
      asNumber: true,
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.players, playersOpts, secondFilterState.players, {
      asNumber: true,
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.sets, setOpts, secondFilterState.sets, {
      asNumber: true,
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.setTypes, setTypeOpts, secondFilterState.setTypes, {
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.bases, baseOpts, secondFilterState.bases, {
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.phases, phaseOpts, secondFilterState.phases, {
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.receiveEvals, recvEvalOpts, secondFilterState.receiveEvaluations, {
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.receiveZones, recvZoneOpts, secondFilterState.receiveZones, {
      asNumber: true,
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.codes, codesOpts, secondFilterState.codes, {
      onChange: handleSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(els.zones, zonesOpts, secondFilterState.zones, {
      asNumber: true,
      onChange: handleSecondFilterChange
    })
  );
  toggleFilterVisibility(els.prev, attackEvents.length > 0);
  toggleFilterVisibility(els.reset, visibleFilters.some(Boolean));
  if (els.prev) {
    els.prev.value = secondFilterState.prevSkill || "any";
    if (!els.prev._secondPrevBound) {
      els.prev.addEventListener("change", handleSecondFilterChange);
      els.prev._secondPrevBound = true;
    }
  }
  if (els.reset && !els.reset._secondResetBound) {
    els.reset.addEventListener("click", resetSecondFilters);
    els.reset._secondResetBound = true;
  }
}
function getFilteredSecondEvents() {
  const events = getAnalysisEvents().filter(ev => ev && ev.skillId === "attack");
  return events.filter(ev => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const startZone = ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    if (!matchesAdvancedFilters(ev, secondFilterState, { includeSetter: true })) return false;
    if (secondFilterState.setters.size) {
      const setterIdx = getSetterFromEvent(ev);
      if (setterIdx === null || !secondFilterState.setters.has(setterIdx)) return false;
    }
    if (secondFilterState.players.size && !secondFilterState.players.has(ev.playerIdx)) return false;
    if (secondFilterState.sets.size && !secondFilterState.sets.has(ev.set)) return false;
    if (secondFilterState.codes.size && !secondFilterState.codes.has(ev.code)) return false;
    if (secondFilterState.zones.size && !secondFilterState.zones.has(startZone)) return false;
    return true;
  });
}
function getFilteredAttacksForSecondDistribution() {
  return getFilteredSecondEvents().filter(ev => {
    const setType = normalizeSetTypeValue(
      ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
    );
    return !(setType && setType.toLowerCase() === "damp");
  });
}
function renderSecondTable() {
  if (!elAggSecondBody) return;
  elAggSecondBody.innerHTML = "";
  const aggSecondAttackBody = document.getElementById("agg-second-attack-body");
  renderSecondFilters();
  const analysisScope = getAnalysisTeamScope();
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  if (!analysisPlayers || analysisPlayers.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.textContent = "Aggiungi giocatrici per vedere il riepilogo.";
    tr.appendChild(td);
    elAggSecondBody.appendChild(tr);
    renderAttackOutcomesSummaryTable(aggSecondAttackBody, [], {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi"
    });
    renderSecondDistribution();
    return;
  }
  const totals = emptyCounts();
  const rows = [];
  const countsByPlayer = new Map();
  const secondEvents = getAnalysisEvents().filter(
    ev => ev && ev.skillId === "second" && matchesTeamFilter(ev, analysisTeamFilterState.teams)
  );
  secondEvents.forEach(ev => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const playerIdx = typeof ev.playerIdx === "number" ? ev.playerIdx : null;
    const key = playerIdx !== null ? "idx-" + playerIdx : ev.playerName || String(ev.playerIdx || "");
    if (!countsByPlayer.has(key)) {
      const name = playerIdx !== null && analysisPlayers[playerIdx]
        ? analysisScope === "opponent"
          ? formatNameWithNumberFor(analysisPlayers[playerIdx], analysisNumbers)
          : formatNameWithNumber(analysisPlayers[playerIdx])
        : ev.playerName || "Alzatrice";
      countsByPlayer.set(key, { name, counts: emptyCounts() });
    }
    const bucket = countsByPlayer.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  countsByPlayer.forEach(bucket => {
    mergeCounts(totals, bucket.counts);
    rows.push({
      name: bucket.name,
      counts: bucket.counts,
      total: totalFromCounts(bucket.counts),
      metrics: computeMetrics(bucket.counts, "second")
    });
  });
  const attackRowsMap = new Map();
  getFilteredSecondEvents().forEach(ev => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const setterIdx = getSetterFromEvent(ev);
    const setterName =
      typeof setterIdx === "number" && analysisPlayers[setterIdx]
        ? (analysisScope === "opponent"
            ? formatNameWithNumberFor(analysisPlayers[setterIdx], analysisNumbers)
            : formatNameWithNumber(analysisPlayers[setterIdx]))
        : ev.setterName || "Alzatrice";
    const key = typeof setterIdx === "number" ? `idx-${setterIdx}` : setterName;
    if (!attackRowsMap.has(key)) {
      attackRowsMap.set(key, { name: setterName, counts: emptyCounts() });
    }
    const bucket = attackRowsMap.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  const attackRows = Array.from(attackRowsMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.textContent = "Registra alzate per vedere il dettaglio.";
    tr.appendChild(td);
    elAggSecondBody.appendChild(tr);
    renderAttackOutcomesSummaryTable(aggSecondAttackBody, attackRows, {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi"
    });
    renderSecondDistribution();
    return;
  }
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  rows.forEach(row => {
    const tr = document.createElement("tr");
    const cells = [
      { text: row.name },
      { text: row.total, className: "skill-col skill-second" },
      { text: row.counts["#"] || 0, className: "skill-col skill-second" },
      { text: row.counts["+"] || 0, className: "skill-col skill-second" },
      { text: row.counts["!"] || 0, className: "skill-col skill-second" },
      { text: row.counts["-"] || 0, className: "skill-col skill-second" },
      { text: row.counts["="] || 0, className: "skill-col skill-second" },
      { text: row.counts["/"] || 0, className: "skill-col skill-second" },
      { text: row.metrics.pos === null ? "-" : formatPercent(row.metrics.pos), className: "skill-col skill-second" },
      { text: row.metrics.prf === null ? "-" : formatPercent(row.metrics.prf), className: "skill-col skill-second" },
      { text: row.metrics.eff === null ? "-" : formatPercent(row.metrics.eff), className: "skill-col skill-second" }
    ];
    cells.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell.text;
      if (cell.className) td.className = cell.className;
      tr.appendChild(td);
    });
    elAggSecondBody.appendChild(tr);
  });
  const totalMetrics = computeMetrics(totals, "second");
  const totalsRow = document.createElement("tr");
  totalsRow.className = "rotation-row total";
  const totalCells = [
    { text: "Totale alzate" },
    { text: totalFromCounts(totals), className: "skill-col skill-second" },
    { text: totals["#"] || 0, className: "skill-col skill-second" },
    { text: totals["+"] || 0, className: "skill-col skill-second" },
    { text: totals["!"] || 0, className: "skill-col skill-second" },
    { text: totals["-"] || 0, className: "skill-col skill-second" },
    { text: totals["="] || 0, className: "skill-col skill-second" },
    { text: totals["/"] || 0, className: "skill-col skill-second" },
    { text: totalMetrics.pos === null ? "-" : formatPercent(totalMetrics.pos), className: "skill-col skill-second" },
    { text: totalMetrics.prf === null ? "-" : formatPercent(totalMetrics.prf), className: "skill-col skill-second" },
    { text: totalMetrics.eff === null ? "-" : formatPercent(totalMetrics.eff), className: "skill-col skill-second" }
  ];
  totalCells.forEach(cell => {
    const td = document.createElement("td");
    td.textContent = cell.text;
    if (cell.className) td.className = cell.className;
    totalsRow.appendChild(td);
  });
  elAggSecondBody.appendChild(totalsRow);
  renderAttackOutcomesSummaryTable(aggSecondAttackBody, attackRows, {
    emptyText: "Nessun attacco associato alle alzate filtrate.",
    totalLabel: "Totale attacchi"
  });
  renderSecondDistribution();
}
function computeAttackDistribution(events = state.events || []) {
  const rotations = {};
  const ensureRot = rot => {
    if (!rotations[rot]) {
      rotations[rot] = {
        zones: {
          1: emptyCounts(),
          2: emptyCounts(),
          3: emptyCounts(),
          4: emptyCounts(),
          5: emptyCounts(),
          6: emptyCounts()
        },
        total: 0
      };
    }
  };
  for (let r = 1; r <= 6; r++) ensureRot(r);
  ensureRot("all");
  (events || []).forEach(ev => {
    if (!ev || ev.skillId !== "attack") return;
    let zone = ev.zone;
    if (zone === undefined || zone === null) {
      zone = getCurrentZoneForPlayer(ev.playerIdx, null, getTeamScopeFromEvent(ev));
    }
    if (!zone || zone < 1 || zone > 6) return;
    const rot = ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    ensureRot(rot);
    ensureRot("all");
    [rot, "all"].forEach(key => {
      const bucket = rotations[key];
      bucket.total += 1;
      bucket.zones[zone][ev.code] = (bucket.zones[zone][ev.code] || 0) + 1;
    });
  });
  return rotations;
}
function renderSecondDistribution() {
  if (!elSecondDistribution) return;
  renderDistributionGrid(elSecondDistribution, getFilteredAttacksForSecondDistribution());
}
