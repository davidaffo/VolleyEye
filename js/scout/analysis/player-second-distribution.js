function syncPlayerSecondFilterState() {
  playerSecondFilterState.setTypes = new Set(getCheckedValues(elPlayerSecondFilterSetTypes));
  playerSecondFilterState.bases = new Set(getCheckedValues(elPlayerSecondFilterBases));
  playerSecondFilterState.phases = new Set(getCheckedValues(elPlayerSecondFilterPhases));
  playerSecondFilterState.receiveEvaluations = new Set(getCheckedValues(elPlayerSecondFilterReceiveEvals));
  playerSecondFilterState.receiveZones = new Set(getCheckedValues(elPlayerSecondFilterReceiveZones, { asNumber: true }));
  playerSecondFilterState.sets = new Set(getCheckedValues(elPlayerSecondFilterSets, { asNumber: true }));
  playerSecondFilterState.prevSkill = (elPlayerSecondFilterPrev && elPlayerSecondFilterPrev.value) || "any";
}
function handlePlayerSecondFilterChange() {
  syncPlayerSecondFilterState();
  renderPlayerSecondTable();
}
function resetPlayerSecondFilters() {
  playerSecondFilterState.setTypes.clear();
  playerSecondFilterState.bases.clear();
  playerSecondFilterState.phases.clear();
  playerSecondFilterState.receiveEvaluations.clear();
  playerSecondFilterState.receiveZones.clear();
  playerSecondFilterState.sets.clear();
  playerSecondFilterState.prevSkill = "any";
  if (elPlayerSecondFilterPrev) elPlayerSecondFilterPrev.value = "any";
  renderPlayerSecondFilters();
  renderPlayerSecondTable();
}
function renderPlayerSecondFilters() {
  if (!elPlayerSecondFilterSetTypes) return;
  const playerIdx = getPlayerAnalysisPlayerIdx();
  const attackEvents = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return getSetterFromEvent(ev) === playerIdx;
  });
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
  const setOpts = buildUniqueOptions(attackEvents.map(ev => normalizeSetNumber(ev.set)), {
    asNumber: true,
    labelFn: val => "Set " + val
  });

  playerSecondFilterState.setTypes = new Set(
    [...playerSecondFilterState.setTypes].filter(val => setTypeOpts.some(o => o.value === val))
  );
  playerSecondFilterState.bases = new Set(
    [...playerSecondFilterState.bases].filter(val => baseOpts.some(o => o.value === val))
  );
  playerSecondFilterState.phases = new Set(
    [...playerSecondFilterState.phases].filter(val => phaseOpts.some(o => o.value === val))
  );
  playerSecondFilterState.receiveEvaluations = new Set(
    [...playerSecondFilterState.receiveEvaluations].filter(val => recvEvalOpts.some(o => o.value === val))
  );
  playerSecondFilterState.receiveZones = new Set(
    [...playerSecondFilterState.receiveZones].filter(val => recvZoneOpts.some(o => Number(o.value) === val))
  );
  playerSecondFilterState.sets = new Set(
    [...playerSecondFilterState.sets].filter(val => setOpts.some(o => Number(o.value) === val))
  );
  if (!PREVIOUS_SKILL_OPTIONS.some(opt => opt.value === playerSecondFilterState.prevSkill)) {
    playerSecondFilterState.prevSkill = "any";
  }

  const visibleFilters = [];
  visibleFilters.push(
    renderDynamicFilter(elPlayerSecondFilterSetTypes, setTypeOpts, playerSecondFilterState.setTypes, {
      onChange: handlePlayerSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerSecondFilterBases, baseOpts, playerSecondFilterState.bases, {
      onChange: handlePlayerSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerSecondFilterPhases, phaseOpts, playerSecondFilterState.phases, {
      onChange: handlePlayerSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerSecondFilterReceiveEvals, recvEvalOpts, playerSecondFilterState.receiveEvaluations, {
      onChange: handlePlayerSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerSecondFilterReceiveZones, recvZoneOpts, playerSecondFilterState.receiveZones, {
      asNumber: true,
      onChange: handlePlayerSecondFilterChange
    })
  );
  visibleFilters.push(
    renderDynamicFilter(elPlayerSecondFilterSets, setOpts, playerSecondFilterState.sets, {
      asNumber: true,
      onChange: handlePlayerSecondFilterChange
    })
  );
  toggleFilterVisibility(elPlayerSecondFilterPrev, attackEvents.length > 0);
  toggleFilterVisibility(elPlayerSecondFilterReset, visibleFilters.some(Boolean));
  if (elPlayerSecondFilterPrev) {
    elPlayerSecondFilterPrev.value = playerSecondFilterState.prevSkill || "any";
    if (!elPlayerSecondFilterPrev._playerSecondPrevBound) {
      elPlayerSecondFilterPrev.addEventListener("change", handlePlayerSecondFilterChange);
      elPlayerSecondFilterPrev._playerSecondPrevBound = true;
    }
  }
  if (elPlayerSecondFilterReset && !elPlayerSecondFilterReset._playerSecondResetBound) {
    elPlayerSecondFilterReset.addEventListener("click", resetPlayerSecondFilters);
    elPlayerSecondFilterReset._playerSecondResetBound = true;
  }
}
function getFilteredPlayerSecondEvents() {
  const playerIdx = getPlayerAnalysisPlayerIdx();
  return getFilteredPlayerSecondEventsForPlayer(playerIdx);
}
function getFilteredPlayerSecondEventsForPlayer(playerIdx) {
  const events = getAnalysisEvents().filter(ev => {
    if (!ev || ev.skillId !== "attack") return false;
    if (playerIdx === null) return false;
    if (!matchesTeamFilter(ev, analysisTeamFilterState.teams)) return false;
    return getSetterFromEvent(ev) === playerIdx;
  });
  return events.filter(ev => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const startZone = ev.attackStartZone || traj.startZone || ev.zone || ev.playerPosition || null;
    const setNum = normalizeSetNumber(ev.set);
    if (!matchesAdvancedFilters(ev, playerSecondFilterState)) return false;
    if (playerSecondFilterState.sets.size && !playerSecondFilterState.sets.has(setNum)) return false;
    return true;
  });
}
function attachDampCountsByRotation(filteredEvents, allEvents) {
  const dampByRotation = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, all: 0 };
  (allEvents || []).forEach(ev => {
    const setType = normalizeSetTypeValue(
      ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
    );
    if (!setType || setType.toLowerCase() !== "damp") return;
    const rotation = ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    dampByRotation[rotation] += 1;
    dampByRotation.all += 1;
  });
  filteredEvents.dampCount = dampByRotation.all;
  filteredEvents.dampByRotation = dampByRotation;
  return filteredEvents;
}
function getFilteredPlayerAttacksForSecondDistribution(playerIdx = getPlayerAnalysisPlayerIdx()) {
  const all = getFilteredPlayerSecondEventsForPlayer(playerIdx);
  const filtered = all.filter(ev => {
    const setType = normalizeSetTypeValue(
      ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
    );
    return !(setType && setType.toLowerCase() === "damp");
  });
  return attachDampCountsByRotation(filtered, all);
}
function renderDistributionGrid(targetEl, events, compareEvents = null) {
  if (!targetEl) return;
  targetEl.innerHTML = "";
  const dist = computeAttackDistribution(events);
  const compareDist = Array.isArray(compareEvents) ? computeAttackDistribution(compareEvents) : null;
  targetEl.classList.add("distribution-grid", "distribution-grid-layout");
  const legend = document.createElement("div");
  legend.className = "distribution-legend";
  legend.innerHTML =
    '<span><i class="distribution-legend__volume"></i> area più servita</span>' +
    '<span><i class="distribution-legend__eff"></i> zona più efficiente</span>';
  targetEl.appendChild(legend);
  const layout = [
    { key: 4, area: "r4" },
    { key: 3, area: "r3" },
    { key: 2, area: "r2" },
    { key: 5, area: "r5" },
    { key: 6, area: "r6" },
    { key: 1, area: "r1" },
    { key: "all", area: "all" }
  ];
  const zoneOrder = [4, 3, 2, 5, 6, 1];
  layout.forEach(item => {
    const rot = item.key;
    const data =
      dist[rot] ||
      {
        zones: { 1: emptyCounts(), 2: emptyCounts(), 3: emptyCounts(), 4: emptyCounts(), 5: emptyCounts(), 6: emptyCounts() },
        total: 0
      };
    const compareData = compareDist
      ? (
          compareDist[rot] ||
          {
            zones: { 1: emptyCounts(), 2: emptyCounts(), 3: emptyCounts(), 4: emptyCounts(), 5: emptyCounts(), 6: emptyCounts() },
            total: 0
          }
        )
      : null;
    const totalAttacks = data.total || 0;
    const card = document.createElement("div");
    card.className = "distribution-card";
    card.style.gridArea = item.area;
    const titleRow = document.createElement("div");
    titleRow.className = "distribution-card__title-row";
    const title = document.createElement("h4");
    title.textContent = rot === "all" ? "Tutte le rotazioni" : "P" + rot;
    const dampCount = document.createElement("span");
    dampCount.className = "distribution-card__damp";
    dampCount.textContent = `Damp ${Number(events && events.dampByRotation && events.dampByRotation[rot]) || 0}`;
    titleRow.append(title, dampCount);
    card.appendChild(titleRow);
    const court = document.createElement("div");
    court.className = "distribution-court";
    let bestVolumeZone = null;
    let bestVolumeCount = -1;
    let bestEffZone = null;
    let bestEffValue = -Infinity;
    Object.keys(data.zones).forEach(zKey => {
      const zoneNum = parseInt(zKey, 10);
      const zoneCounts = data.zones[zoneNum] || emptyCounts();
      const total = totalFromCounts(zoneCounts);
      if (total > bestVolumeCount) {
        bestVolumeCount = total;
        bestVolumeZone = zoneNum;
      }
      const metrics = computeMetrics(zoneCounts, "attack");
      const eff = metrics.eff;
      if (eff !== null && eff > bestEffValue) {
        bestEffValue = eff;
        bestEffZone = zoneNum;
      }
    });
    zoneOrder.forEach(zoneNum => {
      const counts = data.zones[zoneNum] || emptyCounts();
      const compareCounts = compareData ? (compareData.zones[zoneNum] || emptyCounts()) : emptyCounts();
      const zoneTotal = totalFromCounts(counts);
      const compareZoneTotal = totalFromCounts(compareCounts);
      const metrics = computeMetrics(counts, "attack");
      const compareMetrics = computeMetrics(compareCounts, "attack");
      const perc = totalAttacks ? Math.round((zoneTotal / totalAttacks) * 100) : 0;
      const comparePerc = compareData && compareData.total ? Math.round((compareZoneTotal / compareData.total) * 100) : null;
      const cell = document.createElement("div");
      cell.className = "court-cell";
      if (bestVolumeZone === zoneNum && zoneTotal > 0 && totalAttacks > 0) {
        cell.classList.add("best-volume");
      }
      if (bestEffZone === zoneNum && zoneTotal > 0 && totalAttacks > 0) {
        cell.classList.add("best-eff");
      }
      const label = document.createElement("div");
      label.className = "cell-label";
      label.textContent = "Z" + zoneNum;
      const main = document.createElement("div");
      main.className = "cell-main";
      main.textContent = zoneTotal + " - " + perc + "%";
      if (comparePerc !== null && perc !== comparePerc) {
        main.classList.add("player-analysis-compare-value", perc > comparePerc ? "is-better" : "is-worse");
      }
      const sub = document.createElement("div");
      sub.className = "cell-sub";
      sub.textContent = "Eff " + (metrics.eff === null ? "-" : formatPercent(metrics.eff));
      if (compareData && metrics.eff !== null && compareMetrics.eff !== null && metrics.eff !== compareMetrics.eff) {
        sub.classList.add(
          "player-analysis-compare-value",
          metrics.eff > compareMetrics.eff ? "is-better" : "is-worse"
        );
      }
      cell.appendChild(label);
      cell.appendChild(main);
      cell.appendChild(sub);
      court.appendChild(cell);
    });
    card.appendChild(court);
    targetEl.appendChild(card);
  });
}
function renderPlayerSecondTable() {
  if (!elPlayerSecondBody) return;
  renderPlayerSecondFilters();
  renderSecondTableForPlayer(
    elPlayerSecondBody,
    elPlayerSecondDistribution,
    getPlayerAnalysisPlayerIdx(),
    document.getElementById("player-second-attack-body")
  );
}
function renderAttackOutcomesSummaryTable(targetBody, rows, {
  emptyText = "Nessun attacco trovato.",
  totalLabel = "Totale attacchi"
} = {}) {
  if (!targetBody) return;
  targetBody.innerHTML = "";
  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.textContent = emptyText;
    tr.appendChild(td);
    targetBody.appendChild(tr);
    return;
  }
  const totals = emptyCounts();
  rows.forEach(row => {
    mergeCounts(totals, row.counts);
    const metrics = computeMetrics(row.counts, "attack");
    const total = totalFromCounts(row.counts);
    const tr = document.createElement("tr");
    const cells = [
      { text: row.name },
      { text: total, className: "skill-col skill-attack" },
      { text: row.counts["#"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["+"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["!"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["-"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["="] || 0, className: "skill-col skill-attack" },
      { text: row.counts["/"] || 0, className: "skill-col skill-attack" },
      { text: metrics.pos === null ? "-" : formatPercent(metrics.pos), className: "skill-col skill-attack" },
      { text: metrics.prf === null ? "-" : formatPercent(metrics.prf), className: "skill-col skill-attack" },
      { text: metrics.eff === null ? "-" : formatPercent(metrics.eff), className: "skill-col skill-attack" }
    ];
    cells.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell.text;
      if (cell.className) td.className = cell.className;
      tr.appendChild(td);
    });
    targetBody.appendChild(tr);
  });
  const totalMetrics = computeMetrics(totals, "attack");
  const totalsRow = document.createElement("tr");
  totalsRow.className = "rotation-row total";
  const totalCells = [
    { text: totalLabel },
    { text: totalFromCounts(totals), className: "skill-col skill-attack" },
    { text: totals["#"] || 0, className: "skill-col skill-attack" },
    { text: totals["+"] || 0, className: "skill-col skill-attack" },
    { text: totals["!"] || 0, className: "skill-col skill-attack" },
    { text: totals["-"] || 0, className: "skill-col skill-attack" },
    { text: totals["="] || 0, className: "skill-col skill-attack" },
    { text: totals["/"] || 0, className: "skill-col skill-attack" },
    { text: totalMetrics.pos === null ? "-" : formatPercent(totalMetrics.pos), className: "skill-col skill-attack" },
    { text: totalMetrics.prf === null ? "-" : formatPercent(totalMetrics.prf), className: "skill-col skill-attack" },
    { text: totalMetrics.eff === null ? "-" : formatPercent(totalMetrics.eff), className: "skill-col skill-attack" }
  ];
  totalCells.forEach(cell => {
    const td = document.createElement("td");
    td.textContent = cell.text;
    if (cell.className) td.className = cell.className;
    totalsRow.appendChild(td);
  });
  targetBody.appendChild(totalsRow);
}
function renderSecondTableForPlayer(targetBody, targetDistribution, playerIdx, targetAttackBody = null, comparePlayerIdx = null) {
  if (!targetBody) return;
  targetBody.innerHTML = "";
  const attackOutcomeBody = targetAttackBody;
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const isCompareTable = !!targetBody.closest(".player-analysis-compare-subsection");
  const formatScopedPlayerName = idx => (
    analysisScope === "opponent"
      ? formatNameWithNumberFor(players[idx], numbers)
      : formatNameWithNumber(players[idx])
  );
  const getSecondMetricCompareClass = (value, metricKey) => {
    if (!isCompareTable || value === null || value === undefined) return "";
    if (metricKey === "eff") {
      if (value > 0) return "is-better";
      if (value < 0) return "is-worse";
      return "";
    }
    return value > 0 ? "is-better" : "is-worse";
  };
  const getMetricDeltaClass = (value, otherValue, better = "higher") => {
    if (!isCompareTable || value === null || value === undefined || otherValue === null || otherValue === undefined || value === otherValue) {
      return "";
    }
    const isBetter = better === "lower" ? value < otherValue : value > otherValue;
    return isBetter ? "is-better" : "is-worse";
  };
  if (playerIdx === null) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.textContent = "Seleziona una giocatrice per vedere la distribuzione.";
    tr.appendChild(td);
    targetBody.appendChild(tr);
    renderAttackOutcomesSummaryTable(attackOutcomeBody, [], {
      emptyText: "Seleziona una giocatrice per vedere gli esiti attacco dopo alzata.",
      totalLabel: "Totale attacchi"
    });
    renderDistributionGrid(targetDistribution, []);
    return;
  }
  const secondEvents = getAnalysisEvents().filter(ev =>
    ev &&
    ev.skillId === "second" &&
    matchesTeamFilter(ev, analysisTeamFilterState.teams) &&
    typeof ev.playerIdx === "number" &&
    ev.playerIdx === playerIdx
  );
  const compareSecondEvents = typeof comparePlayerIdx === "number"
    ? getAnalysisEvents().filter(ev =>
        ev &&
        ev.skillId === "second" &&
        matchesTeamFilter(ev, analysisTeamFilterState.teams) &&
        typeof ev.playerIdx === "number" &&
        ev.playerIdx === comparePlayerIdx
      )
    : [];
  const totals = emptyCounts();
  const secondCounts = emptyCounts();
  const filteredAttackEvents = getFilteredPlayerSecondEventsForPlayer(playerIdx);
  const compareAttackEvents = typeof comparePlayerIdx === "number"
    ? getFilteredPlayerSecondEventsForPlayer(comparePlayerIdx)
    : [];
  const attackRowsMap = new Map();
  filteredAttackEvents.forEach(ev => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const attackerIdx = resolvePlayerIdx(ev);
    const attackerName =
      typeof attackerIdx === "number" && players[attackerIdx]
        ? formatScopedPlayerName(attackerIdx)
        : ev.playerName || "Attaccante";
    const key = typeof attackerIdx === "number" ? `idx-${attackerIdx}` : attackerName;
    if (!attackRowsMap.has(key)) {
      attackRowsMap.set(key, { name: attackerName, counts: emptyCounts() });
    }
    const bucket = attackRowsMap.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  const compareAttackRowsMap = new Map();
  compareAttackEvents.forEach(ev => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const attackerIdx = resolvePlayerIdx(ev);
    const attackerName =
      typeof attackerIdx === "number" && players[attackerIdx]
        ? formatScopedPlayerName(attackerIdx)
        : ev.playerName || "Attaccante";
    const key = typeof attackerIdx === "number" ? `idx-${attackerIdx}` : attackerName;
    if (!compareAttackRowsMap.has(key)) {
      compareAttackRowsMap.set(key, { name: attackerName, counts: emptyCounts() });
    }
    const bucket = compareAttackRowsMap.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  const attackRows = Array.from(attackRowsMap.entries()).map(([key, value]) => ({ key, ...value })).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "it", { sensitivity: "base" })
  );
  if (attackOutcomeBody && isCompareTable) {
    attackOutcomeBody.innerHTML = "";
    if (!attackRows.length) {
      renderAttackOutcomesSummaryTable(attackOutcomeBody, [], {
        emptyText: "Nessun attacco associato alle alzate filtrate.",
        totalLabel: "Totale attacchi"
      });
    } else {
      const compareAttackTotals = emptyCounts();
      const attackTotals = emptyCounts();
      attackRows.forEach(row => {
        mergeCounts(attackTotals, row.counts);
        const compareRow = compareAttackRowsMap.get(row.key);
        const compareCounts = compareRow ? compareRow.counts : emptyCounts();
        const metrics = computeMetrics(row.counts, "attack");
        const compareMetrics = computeMetrics(compareCounts, "attack");
        const rowTotal = totalFromCounts(row.counts);
        const compareTotal = totalFromCounts(compareCounts);
        const tr = document.createElement("tr");
        [
          { text: row.name, compare: null },
          { text: rowTotal, compare: compareTotal, better: "higher" },
          { text: row.counts["#"] || 0, compare: compareCounts["#"] || 0, better: "higher" },
          { text: row.counts["+"] || 0, compare: compareCounts["+"] || 0, better: "higher" },
          { text: row.counts["!"] || 0, compare: compareCounts["!"] || 0, better: "higher" },
          { text: row.counts["-"] || 0, compare: compareCounts["-"] || 0, better: "lower" },
          { text: row.counts["="] || 0, compare: compareCounts["="] || 0, better: "lower" },
          { text: row.counts["/"] || 0, compare: compareCounts["/"] || 0, better: "lower" },
          { text: metrics.pos === null ? "-" : formatPercent(metrics.pos), compare: compareMetrics.pos, better: "higher", raw: metrics.pos },
          { text: metrics.prf === null ? "-" : formatPercent(metrics.prf), compare: compareMetrics.prf, better: "higher", raw: metrics.prf },
          { text: metrics.eff === null ? "-" : formatPercent(metrics.eff), compare: compareMetrics.eff, better: "higher", raw: metrics.eff }
        ].forEach((cell, cellIdx) => {
          const td = document.createElement("td");
          td.textContent = cell.text;
          const compareClass = getMetricDeltaClass(
            Object.prototype.hasOwnProperty.call(cell, "raw") ? cell.raw : cell.text,
            cell.compare,
            cell.better
          );
          if (compareClass) td.classList.add("player-analysis-compare-value", compareClass);
          if (cellIdx > 0) {
            td.classList.add("skill-col", "skill-attack");
          }
          tr.appendChild(td);
        });
        attackOutcomeBody.appendChild(tr);
      });
      compareAttackRowsMap.forEach(bucket => mergeCounts(compareAttackTotals, bucket.counts));
      const totalMetrics = computeMetrics(attackTotals, "attack");
      const compareTotalMetrics = computeMetrics(compareAttackTotals, "attack");
      const totalRow = document.createElement("tr");
      totalRow.className = "rotation-row total";
      [
        { text: "Totale attacchi", compare: null },
        { text: totalFromCounts(attackTotals), compare: totalFromCounts(compareAttackTotals), better: "higher" },
        { text: attackTotals["#"] || 0, compare: compareAttackTotals["#"] || 0, better: "higher" },
        { text: attackTotals["+"] || 0, compare: compareAttackTotals["+"] || 0, better: "higher" },
        { text: attackTotals["!"] || 0, compare: compareAttackTotals["!"] || 0, better: "higher" },
        { text: attackTotals["-"] || 0, compare: compareAttackTotals["-"] || 0, better: "lower" },
        { text: attackTotals["="] || 0, compare: compareAttackTotals["="] || 0, better: "lower" },
        { text: attackTotals["/"] || 0, compare: compareAttackTotals["/"] || 0, better: "lower" },
        { text: totalMetrics.pos === null ? "-" : formatPercent(totalMetrics.pos), compare: compareTotalMetrics.pos, better: "higher", raw: totalMetrics.pos },
        { text: totalMetrics.prf === null ? "-" : formatPercent(totalMetrics.prf), compare: compareTotalMetrics.prf, better: "higher", raw: totalMetrics.prf },
        { text: totalMetrics.eff === null ? "-" : formatPercent(totalMetrics.eff), compare: compareTotalMetrics.eff, better: "higher", raw: totalMetrics.eff }
      ].forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell.text;
        const compareClass = getMetricDeltaClass(
          Object.prototype.hasOwnProperty.call(cell, "raw") ? cell.raw : cell.text,
          cell.compare,
          cell.better
        );
        if (compareClass) td.classList.add("player-analysis-compare-value", compareClass);
        td.classList.add("skill-col", "skill-attack");
        totalRow.appendChild(td);
      });
      totalRow.firstChild.classList.remove("skill-col", "skill-attack");
      attackOutcomeBody.appendChild(totalRow);
    }
  } else {
    renderAttackOutcomesSummaryTable(attackOutcomeBody, attackRows, {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi"
    });
  }
  secondEvents.forEach(ev => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    secondCounts[code] = (secondCounts[code] || 0) + 1;
  });
  const compareSecondCounts = emptyCounts();
  compareSecondEvents.forEach(ev => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    compareSecondCounts[code] = (compareSecondCounts[code] || 0) + 1;
  });
  mergeCounts(totals, secondCounts);
  const total = totalFromCounts(secondCounts);
  if (!total) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.textContent = "Registra alzate per vedere il dettaglio.";
    tr.appendChild(td);
    targetBody.appendChild(tr);
    renderDistributionGrid(
      targetDistribution,
      getFilteredPlayerAttacksForSecondDistribution(playerIdx),
      typeof comparePlayerIdx === "number" ? getFilteredPlayerAttacksForSecondDistribution(comparePlayerIdx) : null
    );
    return;
  }
  const metrics = computeMetrics(secondCounts, "second");
  const compareMetrics = computeMetrics(compareSecondCounts, "second");
  const tr = document.createElement("tr");
  const cells = [
    {
      text:
        typeof playerIdx === "number" && players[playerIdx]
          ? formatScopedPlayerName(playerIdx)
          : "Alzatrice"
    },
    { text: total, className: "skill-col skill-second" },
    { text: secondCounts["#"] || 0, className: "skill-col skill-second" },
    { text: secondCounts["+"] || 0, className: "skill-col skill-second" },
    { text: secondCounts["!"] || 0, className: "skill-col skill-second" },
    { text: secondCounts["-"] || 0, className: "skill-col skill-second" },
    { text: secondCounts["="] || 0, className: "skill-col skill-second" },
    { text: secondCounts["/"] || 0, className: "skill-col skill-second" },
    {
      text: metrics.pos === null ? "-" : formatPercent(metrics.pos),
      className: "skill-col skill-second",
      compareClass: isCompareTable
        ? getMetricDeltaClass(metrics.pos, compareMetrics.pos, "higher")
        : getSecondMetricCompareClass(metrics.pos, "pos")
    },
    {
      text: metrics.prf === null ? "-" : formatPercent(metrics.prf),
      className: "skill-col skill-second",
      compareClass: isCompareTable
        ? getMetricDeltaClass(metrics.prf, compareMetrics.prf, "higher")
        : getSecondMetricCompareClass(metrics.prf, "prf")
    },
    {
      text: metrics.eff === null ? "-" : formatPercent(metrics.eff),
      className: "skill-col skill-second",
      compareClass: isCompareTable
        ? getMetricDeltaClass(metrics.eff, compareMetrics.eff, "higher")
        : getSecondMetricCompareClass(metrics.eff, "eff")
    }
  ];
  cells.forEach(cell => {
    const td = document.createElement("td");
    td.textContent = cell.text;
    if (cell.className) td.className = cell.className;
    if (cell.compareClass) td.classList.add("player-analysis-compare-value", cell.compareClass);
    tr.appendChild(td);
  });
  targetBody.appendChild(tr);
  renderDistributionGrid(
    targetDistribution,
    getFilteredPlayerAttacksForSecondDistribution(playerIdx),
    typeof comparePlayerIdx === "number" ? getFilteredPlayerAttacksForSecondDistribution(comparePlayerIdx) : null
  );
}
