function publishReactSecondTable() {
  const viewRows = [];
  const publish = () =>
    analysisTableStore.publish(elAggSecondBody.id, { rows: viewRows });
  if (!elAggSecondBody) return;

  const aggSecondAttackBody = document.getElementById("agg-second-attack-body");
  renderSecondFilters();
  const analysisScope = getAnalysisTeamScope();
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  if (!analysisPlayers || analysisPlayers.length === 0) {
    viewRows.push({
      cells: [
        { text: "Aggiungi giocatrici per vedere il riepilogo.", colspan: 11 },
      ],
    });
    publish();
    renderAttackOutcomesSummaryTable(aggSecondAttackBody, [], {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi",
    });
    renderSecondDistribution();
    return;
  }
  const totals = emptyCounts();
  const rows = [];
  const countsByPlayer = new Map();
  const secondEvents = getAnalysisEvents().filter(
    (ev) =>
      ev &&
      ev.skillId === "second" &&
      matchesTeamFilter(ev, analysisTeamFilterState.teams),
  );
  secondEvents.forEach((ev) => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const playerIdx = typeof ev.playerIdx === "number" ? ev.playerIdx : null;
    const key =
      playerIdx !== null
        ? "idx-" + playerIdx
        : ev.playerName || String(ev.playerIdx || "");
    if (!countsByPlayer.has(key)) {
      const name =
        playerIdx !== null && analysisPlayers[playerIdx]
          ? analysisScope === "opponent"
            ? formatNameWithNumberFor(
                analysisPlayers[playerIdx],
                analysisNumbers,
              )
            : formatNameWithNumber(analysisPlayers[playerIdx])
          : ev.playerName || "Alzatrice";
      countsByPlayer.set(key, { name, counts: emptyCounts() });
    }
    const bucket = countsByPlayer.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  countsByPlayer.forEach((bucket) => {
    mergeCounts(totals, bucket.counts);
    rows.push({
      name: bucket.name,
      counts: bucket.counts,
      total: totalFromCounts(bucket.counts),
      metrics: computeMetrics(bucket.counts, "second"),
    });
  });
  const attackRowsMap = new Map();
  getFilteredSecondEvents().forEach((ev) => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const setterIdx = getSetterFromEvent(ev);
    const setterName =
      typeof setterIdx === "number" && analysisPlayers[setterIdx]
        ? analysisScope === "opponent"
          ? formatNameWithNumberFor(analysisPlayers[setterIdx], analysisNumbers)
          : formatNameWithNumber(analysisPlayers[setterIdx])
        : ev.setterName || "Alzatrice";
    const key = typeof setterIdx === "number" ? `idx-${setterIdx}` : setterName;
    if (!attackRowsMap.has(key)) {
      attackRowsMap.set(key, { name: setterName, counts: emptyCounts() });
    }
    const bucket = attackRowsMap.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  const attackRows = Array.from(attackRowsMap.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );
  if (rows.length === 0) {
    viewRows.push({
      cells: [
        { text: "Registra alzate per vedere il dettaglio.", colspan: 11 },
      ],
    });
    publish();
    renderAttackOutcomesSummaryTable(aggSecondAttackBody, attackRows, {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi",
    });
    renderSecondDistribution();
    return;
  }
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  rows.forEach((row) => {
    const cells = [
      { text: row.name },
      { text: row.total, className: "skill-col skill-second" },
      { text: row.counts["#"] || 0, className: "skill-col skill-second" },
      { text: row.counts["+"] || 0, className: "skill-col skill-second" },
      { text: row.counts["!"] || 0, className: "skill-col skill-second" },
      { text: row.counts["-"] || 0, className: "skill-col skill-second" },
      { text: row.counts["="] || 0, className: "skill-col skill-second" },
      { text: row.counts["/"] || 0, className: "skill-col skill-second" },
      {
        text: row.metrics.pos === null ? "-" : formatPercent(row.metrics.pos),
        className: "skill-col skill-second",
      },
      {
        text: row.metrics.prf === null ? "-" : formatPercent(row.metrics.prf),
        className: "skill-col skill-second",
      },
      {
        text: row.metrics.eff === null ? "-" : formatPercent(row.metrics.eff),
        className: "skill-col skill-second",
      },
    ];
    viewRows.push({ cells });
  });
  const totalMetrics = computeMetrics(totals, "second");

  const totalCells = [
    { text: "Totale alzate" },
    { text: totalFromCounts(totals), className: "skill-col skill-second" },
    { text: totals["#"] || 0, className: "skill-col skill-second" },
    { text: totals["+"] || 0, className: "skill-col skill-second" },
    { text: totals["!"] || 0, className: "skill-col skill-second" },
    { text: totals["-"] || 0, className: "skill-col skill-second" },
    { text: totals["="] || 0, className: "skill-col skill-second" },
    { text: totals["/"] || 0, className: "skill-col skill-second" },
    {
      text: totalMetrics.pos === null ? "-" : formatPercent(totalMetrics.pos),
      className: "skill-col skill-second",
    },
    {
      text: totalMetrics.prf === null ? "-" : formatPercent(totalMetrics.prf),
      className: "skill-col skill-second",
    },
    {
      text: totalMetrics.eff === null ? "-" : formatPercent(totalMetrics.eff),
      className: "skill-col skill-second",
    },
  ];
  viewRows.push({ className: "rotation-row total", cells: totalCells });
  publish();
  renderAttackOutcomesSummaryTable(aggSecondAttackBody, attackRows, {
    emptyText: "Nessun attacco associato alle alzate filtrate.",
    totalLabel: "Totale attacchi",
  });
  renderSecondDistribution();
}

function publishReactAttackOutcomes(
  targetBody,
  rows,
  {
    emptyText = "Nessun attacco trovato.",
    totalLabel = "Totale attacchi",
  } = {},
) {
  if (!targetBody) return;
  const viewRows = [];
  const publish = () =>
    analysisTableStore.publish(targetBody.id, { rows: viewRows });
  if (!rows || rows.length === 0) {
    viewRows.push({ cells: [{ text: emptyText, colspan: 11 }] });
    publish();
    return;
  }
  const totals = emptyCounts();
  rows.forEach((row) => {
    mergeCounts(totals, row.counts);
    const metrics = computeMetrics(row.counts, "attack");
    const total = totalFromCounts(row.counts);

    const cells = [
      { text: row.name },
      { text: total, className: "skill-col skill-attack" },
      { text: row.counts["#"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["+"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["!"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["-"] || 0, className: "skill-col skill-attack" },
      { text: row.counts["="] || 0, className: "skill-col skill-attack" },
      { text: row.counts["/"] || 0, className: "skill-col skill-attack" },
      {
        text: metrics.pos === null ? "-" : formatPercent(metrics.pos),
        className: "skill-col skill-attack",
      },
      {
        text: metrics.prf === null ? "-" : formatPercent(metrics.prf),
        className: "skill-col skill-attack",
      },
      {
        text: metrics.eff === null ? "-" : formatPercent(metrics.eff),
        className: "skill-col skill-attack",
      },
    ];
    viewRows.push({ cells });
  });
  const totalMetrics = computeMetrics(totals, "attack");

  const totalCells = [
    { text: totalLabel },
    { text: totalFromCounts(totals), className: "skill-col skill-attack" },
    { text: totals["#"] || 0, className: "skill-col skill-attack" },
    { text: totals["+"] || 0, className: "skill-col skill-attack" },
    { text: totals["!"] || 0, className: "skill-col skill-attack" },
    { text: totals["-"] || 0, className: "skill-col skill-attack" },
    { text: totals["="] || 0, className: "skill-col skill-attack" },
    { text: totals["/"] || 0, className: "skill-col skill-attack" },
    {
      text: totalMetrics.pos === null ? "-" : formatPercent(totalMetrics.pos),
      className: "skill-col skill-attack",
    },
    {
      text: totalMetrics.prf === null ? "-" : formatPercent(totalMetrics.prf),
      className: "skill-col skill-attack",
    },
    {
      text: totalMetrics.eff === null ? "-" : formatPercent(totalMetrics.eff),
      className: "skill-col skill-attack",
    },
  ];
  viewRows.push({ className: "rotation-row total", cells: totalCells });
  publish();
}

function publishReactPlayerSecondTable(
  targetBody,
  targetDistribution,
  playerIdx,
  targetAttackBody = null,
  comparePlayerIdx = null,
) {
  if (!targetBody) return;
  const viewRows = [];
  const publish = () =>
    analysisTableStore.publish(targetBody.id, { rows: viewRows });
  const attackOutcomeBody = targetAttackBody;
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const isCompareTable = !!targetBody.closest(
    ".player-analysis-compare-subsection",
  );
  const formatScopedPlayerName = (idx) =>
    analysisScope === "opponent"
      ? formatNameWithNumberFor(players[idx], numbers)
      : formatNameWithNumber(players[idx]);
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
    if (
      !isCompareTable ||
      value === null ||
      value === undefined ||
      otherValue === null ||
      otherValue === undefined ||
      value === otherValue
    ) {
      return "";
    }
    const isBetter =
      better === "lower" ? value < otherValue : value > otherValue;
    return isBetter ? "is-better" : "is-worse";
  };
  if (playerIdx === null) {
    viewRows.push({
      cells: [
        {
          text: "Seleziona una giocatrice per vedere la distribuzione.",
          colspan: 11,
        },
      ],
    });
    publish();
    renderAttackOutcomesSummaryTable(attackOutcomeBody, [], {
      emptyText:
        "Seleziona una giocatrice per vedere gli esiti attacco dopo alzata.",
      totalLabel: "Totale attacchi",
    });
    renderDistributionGrid(targetDistribution, []);
    return;
  }
  const secondEvents = getAnalysisEvents().filter(
    (ev) =>
      ev &&
      ev.skillId === "second" &&
      matchesTeamFilter(ev, analysisTeamFilterState.teams) &&
      typeof ev.playerIdx === "number" &&
      ev.playerIdx === playerIdx,
  );
  const compareSecondEvents =
    typeof comparePlayerIdx === "number"
      ? getAnalysisEvents().filter(
          (ev) =>
            ev &&
            ev.skillId === "second" &&
            matchesTeamFilter(ev, analysisTeamFilterState.teams) &&
            typeof ev.playerIdx === "number" &&
            ev.playerIdx === comparePlayerIdx,
        )
      : [];
  const totals = emptyCounts();
  const secondCounts = emptyCounts();
  const filteredAttackEvents =
    getFilteredPlayerSecondEventsForPlayer(playerIdx);
  const compareAttackEvents =
    typeof comparePlayerIdx === "number"
      ? getFilteredPlayerSecondEventsForPlayer(comparePlayerIdx)
      : [];
  const attackRowsMap = new Map();
  filteredAttackEvents.forEach((ev) => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const attackerIdx = resolvePlayerIdx(ev);
    const attackerName =
      typeof attackerIdx === "number" && players[attackerIdx]
        ? formatScopedPlayerName(attackerIdx)
        : ev.playerName || "Attaccante";
    const key =
      typeof attackerIdx === "number" ? `idx-${attackerIdx}` : attackerName;
    if (!attackRowsMap.has(key)) {
      attackRowsMap.set(key, { name: attackerName, counts: emptyCounts() });
    }
    const bucket = attackRowsMap.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  const compareAttackRowsMap = new Map();
  compareAttackEvents.forEach((ev) => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    const attackerIdx = resolvePlayerIdx(ev);
    const attackerName =
      typeof attackerIdx === "number" && players[attackerIdx]
        ? formatScopedPlayerName(attackerIdx)
        : ev.playerName || "Attaccante";
    const key =
      typeof attackerIdx === "number" ? `idx-${attackerIdx}` : attackerName;
    if (!compareAttackRowsMap.has(key)) {
      compareAttackRowsMap.set(key, {
        name: attackerName,
        counts: emptyCounts(),
      });
    }
    const bucket = compareAttackRowsMap.get(key);
    bucket.counts[code] = (bucket.counts[code] || 0) + 1;
  });
  const attackRows = Array.from(attackRowsMap.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "it", { sensitivity: "base" }),
    );
  if (attackOutcomeBody && isCompareTable) {
    const attackViewRows = [];
    if (!attackRows.length) {
      renderAttackOutcomesSummaryTable(attackOutcomeBody, [], {
        emptyText: "Nessun attacco associato alle alzate filtrate.",
        totalLabel: "Totale attacchi",
      });
    } else {
      const compareAttackTotals = emptyCounts();
      const attackTotals = emptyCounts();
      attackRows.forEach((row) => {
        mergeCounts(attackTotals, row.counts);
        const compareRow = compareAttackRowsMap.get(row.key);
        const compareCounts = compareRow ? compareRow.counts : emptyCounts();
        const metrics = computeMetrics(row.counts, "attack");
        const compareMetrics = computeMetrics(compareCounts, "attack");
        const rowTotal = totalFromCounts(row.counts);
        const compareTotal = totalFromCounts(compareCounts);
        const cells = [
          { text: row.name, compare: null },
          { text: rowTotal, compare: compareTotal, better: "higher" },
          {
            text: row.counts["#"] || 0,
            compare: compareCounts["#"] || 0,
            better: "higher",
          },
          {
            text: row.counts["+"] || 0,
            compare: compareCounts["+"] || 0,
            better: "higher",
          },
          {
            text: row.counts["!"] || 0,
            compare: compareCounts["!"] || 0,
            better: "higher",
          },
          {
            text: row.counts["-"] || 0,
            compare: compareCounts["-"] || 0,
            better: "lower",
          },
          {
            text: row.counts["="] || 0,
            compare: compareCounts["="] || 0,
            better: "lower",
          },
          {
            text: row.counts["/"] || 0,
            compare: compareCounts["/"] || 0,
            better: "lower",
          },
          {
            text: metrics.pos === null ? "-" : formatPercent(metrics.pos),
            compare: compareMetrics.pos,
            better: "higher",
            raw: metrics.pos,
          },
          {
            text: metrics.prf === null ? "-" : formatPercent(metrics.prf),
            compare: compareMetrics.prf,
            better: "higher",
            raw: metrics.prf,
          },
          {
            text: metrics.eff === null ? "-" : formatPercent(metrics.eff),
            compare: compareMetrics.eff,
            better: "higher",
            raw: metrics.eff,
          },
        ].map((cell, cellIdx) => {
          const compareClass = getMetricDeltaClass(
            Object.prototype.hasOwnProperty.call(cell, "raw")
              ? cell.raw
              : cell.text,
            cell.compare,
            cell.better,
          );
          return {
            ...cell,
            className:
              (compareClass
                ? "player-analysis-compare-value " + compareClass + " "
                : "") + (cellIdx > 0 ? "skill-col skill-attack" : ""),
          };
        });
        attackViewRows.push({ cells });
      });
      compareAttackRowsMap.forEach((bucket) =>
        mergeCounts(compareAttackTotals, bucket.counts),
      );
      const totalMetrics = computeMetrics(attackTotals, "attack");
      const compareTotalMetrics = computeMetrics(compareAttackTotals, "attack");
      const totalCells = [
        { text: "Totale attacchi", compare: null },
        {
          text: totalFromCounts(attackTotals),
          compare: totalFromCounts(compareAttackTotals),
          better: "higher",
        },
        {
          text: attackTotals["#"] || 0,
          compare: compareAttackTotals["#"] || 0,
          better: "higher",
        },
        {
          text: attackTotals["+"] || 0,
          compare: compareAttackTotals["+"] || 0,
          better: "higher",
        },
        {
          text: attackTotals["!"] || 0,
          compare: compareAttackTotals["!"] || 0,
          better: "higher",
        },
        {
          text: attackTotals["-"] || 0,
          compare: compareAttackTotals["-"] || 0,
          better: "lower",
        },
        {
          text: attackTotals["="] || 0,
          compare: compareAttackTotals["="] || 0,
          better: "lower",
        },
        {
          text: attackTotals["/"] || 0,
          compare: compareAttackTotals["/"] || 0,
          better: "lower",
        },
        {
          text:
            totalMetrics.pos === null ? "-" : formatPercent(totalMetrics.pos),
          compare: compareTotalMetrics.pos,
          better: "higher",
          raw: totalMetrics.pos,
        },
        {
          text:
            totalMetrics.prf === null ? "-" : formatPercent(totalMetrics.prf),
          compare: compareTotalMetrics.prf,
          better: "higher",
          raw: totalMetrics.prf,
        },
        {
          text:
            totalMetrics.eff === null ? "-" : formatPercent(totalMetrics.eff),
          compare: compareTotalMetrics.eff,
          better: "higher",
          raw: totalMetrics.eff,
        },
      ].map((cell, index) => {
        const compareClass = getMetricDeltaClass(
          Object.prototype.hasOwnProperty.call(cell, "raw")
            ? cell.raw
            : cell.text,
          cell.compare,
          cell.better,
        );
        return {
          ...cell,
          className:
            (compareClass
              ? "player-analysis-compare-value " + compareClass + " "
              : "") + (index > 0 ? "skill-col skill-attack" : ""),
        };
      });
      attackViewRows.push({
        className: "rotation-row total",
        cells: totalCells,
      });
      analysisTableStore.publish(attackOutcomeBody.id, {
        rows: attackViewRows,
      });
    }
  } else {
    renderAttackOutcomesSummaryTable(attackOutcomeBody, attackRows, {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi",
    });
  }
  secondEvents.forEach((ev) => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    secondCounts[code] = (secondCounts[code] || 0) + 1;
  });
  const compareSecondCounts = emptyCounts();
  compareSecondEvents.forEach((ev) => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (!code) return;
    compareSecondCounts[code] = (compareSecondCounts[code] || 0) + 1;
  });
  mergeCounts(totals, secondCounts);
  const total = totalFromCounts(secondCounts);
  if (!total) {
    viewRows.push({
      cells: [
        { text: "Registra alzate per vedere il dettaglio.", colspan: 11 },
      ],
    });
    publish();
    renderDistributionGrid(
      targetDistribution,
      getFilteredPlayerAttacksForSecondDistribution(playerIdx),
      typeof comparePlayerIdx === "number"
        ? getFilteredPlayerAttacksForSecondDistribution(comparePlayerIdx)
        : null,
    );
    return;
  }
  const metrics = computeMetrics(secondCounts, "second");
  const compareMetrics = computeMetrics(compareSecondCounts, "second");

  const cells = [
    {
      text:
        typeof playerIdx === "number" && players[playerIdx]
          ? formatScopedPlayerName(playerIdx)
          : "Alzatrice",
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
        : getSecondMetricCompareClass(metrics.pos, "pos"),
    },
    {
      text: metrics.prf === null ? "-" : formatPercent(metrics.prf),
      className: "skill-col skill-second",
      compareClass: isCompareTable
        ? getMetricDeltaClass(metrics.prf, compareMetrics.prf, "higher")
        : getSecondMetricCompareClass(metrics.prf, "prf"),
    },
    {
      text: metrics.eff === null ? "-" : formatPercent(metrics.eff),
      className: "skill-col skill-second",
      compareClass: isCompareTable
        ? getMetricDeltaClass(metrics.eff, compareMetrics.eff, "higher")
        : getSecondMetricCompareClass(metrics.eff, "eff"),
    },
  ];
  viewRows.push({
    cells: cells.map((cell) => ({
      ...cell,
      className:
        (cell.className || "") +
        (cell.compareClass
          ? " player-analysis-compare-value " + cell.compareClass
          : ""),
    })),
  });
  publish();
  renderDistributionGrid(
    targetDistribution,
    getFilteredPlayerAttacksForSecondDistribution(playerIdx),
    typeof comparePlayerIdx === "number"
      ? getFilteredPlayerAttacksForSecondDistribution(comparePlayerIdx)
      : null,
  );
}

function publishReactDistributionGrid(target, events, compareEvents = null) {
  const dist = computeAttackDistribution(events),
    compare = Array.isArray(compareEvents)
      ? computeAttackDistribution(compareEvents)
      : null;
  const layout = [
    { key: 4, area: "r4" },
    { key: 3, area: "r3" },
    { key: 2, area: "r2" },
    { key: 5, area: "r5" },
    { key: 6, area: "r6" },
    { key: 1, area: "r1" },
    { key: "all", area: "all" },
  ];
  const cards = layout.map((item) => {
    const data = dist[item.key] || { zones: {}, total: 0 },
      other = compare ? compare[item.key] || { zones: {}, total: 0 } : null,
      total = data.total || 0;
    let bestVolumeZone = null,
      bestVolumeCount = -1,
      bestEffZone = null,
      bestEff = -Infinity;
    Object.keys(data.zones).forEach((key) => {
      const zone = Number(key),
        counts = data.zones[zone] || emptyCounts(),
        count = totalFromCounts(counts),
        eff = computeMetrics(counts, "attack").eff;
      if (count > bestVolumeCount) {
        bestVolumeCount = count;
        bestVolumeZone = zone;
      }
      if (eff !== null && eff > bestEff) {
        bestEff = eff;
        bestEffZone = zone;
      }
    });
    return {
      key: item.key,
      area: item.area,
      title: item.key === "all" ? "Tutte le rotazioni" : "P" + item.key,
      damp: Number(events?.dampByRotation?.[item.key]) || 0,
      zones: [4, 3, 2, 5, 6, 1].map((zone) => {
        const counts = data.zones[zone] || emptyCounts(),
          otherCounts = other
            ? other.zones[zone] || emptyCounts()
            : emptyCounts(),
          count = totalFromCounts(counts),
          otherCount = totalFromCounts(otherCounts),
          metrics = computeMetrics(counts, "attack"),
          otherMetrics = computeMetrics(otherCounts, "attack"),
          percent = total ? Math.round((count / total) * 100) : 0,
          otherPercent =
            other && other.total
              ? Math.round((otherCount / other.total) * 100)
              : null;
        return {
          zone,
          count,
          percent,
          eff: metrics.eff === null ? "-" : formatPercent(metrics.eff),
          className:
            "court-cell" +
            (bestVolumeZone === zone && count > 0 && total > 0
              ? " best-volume"
              : "") +
            (bestEffZone === zone && count > 0 && total > 0 ? " best-eff" : ""),
          mainClass:
            otherPercent !== null && percent !== otherPercent
              ? " player-analysis-compare-value " +
                (percent > otherPercent ? "is-better" : "is-worse")
              : "",
          subClass:
            other &&
            metrics.eff !== null &&
            otherMetrics.eff !== null &&
            metrics.eff !== otherMetrics.eff
              ? " player-analysis-compare-value " +
                (metrics.eff > otherMetrics.eff ? "is-better" : "is-worse")
              : "",
        };
      }),
    };
  });
  analysisTableStore.publish(target.id, { cards });
}
