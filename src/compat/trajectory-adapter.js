function publishReactAttackSummary(target, events, compareEvents = null) {
  if (!target) return;

  const list = Array.isArray(events)
    ? events.filter((ev) => ev && ev.skillId === "attack")
    : [];
  const compareList = Array.isArray(compareEvents)
    ? compareEvents.filter((ev) => ev && ev.skillId === "attack")
    : null;
  const rows = [];
  let footerRows = [];
  const publish = () =>
    analysisTableStore.publish(target.id, {
      rows,
      footerRows,
      emptyText: rows.length ? "" : "Nessun attacco per i filtri selezionati.",
    });
  if (!list.length) {
    publish();
    return;
  }
  const counts = emptyCounts();
  const byType = {};
  const compareCounts = emptyCounts();
  const compareByType = {};
  list.forEach((ev) => {
    const code = normalizeEvalCode(ev.code || ev.evaluation);
    if (code) counts[code] = (counts[code] || 0) + 1;
    const key = buildAttackTypeLabel(ev.attackType);
    if (!byType[key]) byType[key] = emptyCounts();
    if (code) byType[key][code] = (byType[key][code] || 0) + 1;
  });
  if (compareList) {
    compareList.forEach((ev) => {
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
    if (
      !compareList ||
      value === null ||
      otherValue === null ||
      value === otherValue
    )
      return "";
    const isBetter =
      better === "lower" ? value < otherValue : value > otherValue;
    return isBetter ? "is-better" : "is-worse";
  };
  Object.keys(byType)
    .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))
    .forEach((type) => {
      const rowCounts = normalizeCounts(byType[type]);
      const rowTotal = totalFromCounts(rowCounts);
      const rowPoints = countPointsForSkill(rowCounts, "attack");
      const rowMetrics = computeMetrics(rowCounts, "attack");
      const compareRowCounts = normalizeCounts(compareByType[type]);
      const compareRowTotal = totalFromCounts(compareRowCounts);
      const compareRowPoints = countPointsForSkill(compareRowCounts, "attack");
      const compareRowMetrics = computeMetrics(compareRowCounts, "attack");
      const cells = [
        { text: type, compare: null, better: "neutral" },
        { text: rowTotal, compare: compareRowTotal, better: "neutral" },
        {
          text: rowCounts["="] || 0,
          compare: compareRowCounts["="] || 0,
          better: "lower",
        },
        {
          text: rowCounts["/"] || 0,
          compare: compareRowCounts["/"] || 0,
          better: "lower",
        },
        {
          text: rowPoints || 0,
          compare: compareRowPoints || 0,
          better: "higher",
        },
        {
          text: formatPercentValue(rowPoints || 0, rowTotal),
          compare: compareRowTotal
            ? (compareRowPoints || 0) / compareRowTotal
            : null,
          better: "higher",
          raw: rowTotal ? (rowPoints || 0) / rowTotal : null,
        },
        {
          text: rowMetrics.eff === null ? "-" : formatPercent(rowMetrics.eff),
          compare: compareRowMetrics.eff,
          better: "higher",
          raw: rowMetrics.eff,
        },
      ].map((cell) => ({
        ...cell,
        className: buildAttackCompareClass(
          Object.prototype.hasOwnProperty.call(cell, "raw")
            ? cell.raw
            : cell.text,
          cell.compare,
          cell.better,
        ),
      }));
      rows.push({ cells });
    });
  const totalCells = [
    { text: "Totale", compare: null, better: "neutral" },
    { text: total, compare: compareTotal, better: "neutral" },
    {
      text: counts["="] || 0,
      compare: compareCounts["="] || 0,
      better: "lower",
    },
    {
      text: counts["/"] || 0,
      compare: compareCounts["/"] || 0,
      better: "lower",
    },
    {
      text: pointCount || 0,
      compare: comparePointCount || 0,
      better: "higher",
    },
    {
      text: formatPercentValue(pointCount || 0, total),
      compare: compareTotal ? (comparePointCount || 0) / compareTotal : null,
      better: "higher",
      raw: total ? (pointCount || 0) / total : null,
    },
    {
      text: metrics.eff === null ? "-" : formatPercent(metrics.eff),
      compare: compareMetrics.eff,
      better: "higher",
      raw: metrics.eff,
    },
  ].map((cell) => ({
    ...cell,
    className: buildAttackCompareClass(
      Object.prototype.hasOwnProperty.call(cell, "raw") ? cell.raw : cell.text,
      cell.compare,
      cell.better,
    ),
  }));
  footerRows = [{ className: "attack-analysis-total-row", cells: totalCells }];
  publish();
}

function buildReactTrajectoryLegend(variant) {
  return (
    variant === "serve"
      ? [
          ["#", "# · Ace"],
          ["+", "+, !, / · Positivo"],
          ["-", "− · Negativo"],
          ["=", "= · Errore"],
        ]
      : [
          ["#", "# · Punto"],
          ["+", "+, ! · Positivo"],
          ["-", "− · Negativo"],
          ["=", "=, / · Errore o muro subito"],
        ]
  ).map(([code, label]) => ({
    label,
    color: getTrajectoryColorForCode(code, variant),
  }));
}
function paintReactAttackTrajectory(canvas, zone, events, far, onImagesLoad) {
  const img = getTrajectoryBg(zone, far, onImagesLoad),
    ratio =
      img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.65,
    width = canvas.parentElement?.clientWidth || img?.naturalWidth || 320,
    height = Math.max(120, Math.round(width * ratio || width * 0.65));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (img?.complete && img.naturalWidth)
    ctx.drawImage(img, 0, 0, width, height);
  events.forEach((ev) => {
    const traj = ev.attackDirection || ev.attackTrajectory || {},
      startRaw = traj.start || ev.attackStart,
      endRaw = traj.end || ev.attackEnd,
      start = far && startRaw ? mirrorTrajectoryPoint(startRaw) : startRaw,
      end = far && endRaw ? mirrorTrajectoryPoint(endRaw) : endRaw;
    if (!start || !end) return;
    ctx.strokeStyle = getTrajectoryColorForCode(ev.code, "attack");
    ctx.lineWidth = TRAJECTORY_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(clamp01Val(start.x) * width, clamp01Val(start.y) * height);
    ctx.lineTo(clamp01Val(end.x) * width, clamp01Val(end.y) * height);
    ctx.stroke();
  });
}
function publishReactAttackGrid(target, events, far) {
  const grouped = {};
  events.forEach((ev) => {
    const trajectory = ev.attackDirection || ev.attackTrajectory || {},
      zone =
        ev.attackStartZone ||
        trajectory.startZone ||
        ev.zone ||
        ev.playerPosition ||
        null;
    if (zone) (grouped[zone] ??= []).push(ev);
  });
  analysisTableStore.publish(target.id, {
    far,
    legend: buildReactTrajectoryLegend("attack"),
    cards: [4, 3, 2, 5, 6, 1].map((zone) => {
      const list = grouped[zone] || [];
      return {
        key: zone,
        zone,
        title: "Zona " + zone,
        empty: !list.length,
        paint: (canvas, visual, redraw) =>
          paintReactAttackTrajectory(canvas, zone, list, far, redraw),
      };
    }),
  });
}
function publishReactGlobalAttackGrid() {
  renderTrajectoryFilters();
  renderAttackMetricsSummary(
    elTrajectoryAttackSummary,
    getFilteredAttackSummaryEvents(),
  );
  const scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensureCourtSideState("uiTrajectoryCourtSideByScope")[scope],
      ) === "far";
  publishReactAttackGrid(elTrajectoryGrid, getFilteredTrajectoryEvents(), far);
}
function publishReactPlayerAttackGrid(target, index) {
  const scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensurePlayerAnalysisState().courtSideByScope[scope],
      ) === "far";
  publishReactAttackGrid(
    target,
    getFilteredPlayerTrajectoryEventsForPlayer(index),
    far,
  );
}
function buildReactServeTrajectoryCard(index, events, scope, far) {
  const players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    title =
      (scope === "opponent"
        ? formatNameWithNumberFor(players[index], numbers)
        : formatNameWithNumber(players[index])) ||
      players[index] ||
      "—";
  return {
    key: index,
    playerIdx: index,
    title,
    empty: !events.length,
    paint: (canvas, visual, redraw) =>
      drawServeTrajectoryCanvas(canvas, visual, events, {
        scope,
        isFarServe: far,
        onImagesLoad: redraw,
      }),
  };
}
function publishReactGlobalServeGrid() {
  renderServeTrajectoryFilters();
  const events = getFilteredServeTrajectoryEvents(),
    scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensureCourtSideState("uiServeTrajectoryCourtSideByScope")[scope],
      ) === "far",
    selected = serveTrajectoryFilterState.players.size
      ? [...serveTrajectoryFilterState.players]
      : [...new Set(events.map((ev) => ev.playerIdx))].filter(
          (index) => typeof index === "number",
        ),
    indices = selected.length
      ? sortPlayerIndexesByNumberForScope(selected, scope)
      : [],
    grouped = {};
  events.forEach((ev) => {
    if (typeof ev.playerIdx === "number")
      (grouped[ev.playerIdx] ??= []).push(ev);
  });
  analysisTableStore.publish(elServeTrajectoryGrid.id, {
    legend: buildReactTrajectoryLegend("serve"),
    cards: indices.map((index) => {
      let list = grouped[index] || [];
      const last = list.length ? list[list.length - 1] : null,
        swap =
          last && typeof last.courtSideSwapped === "boolean"
            ? last.courtSideSwapped
            : null;
      if (swap !== null)
        list = list.filter((ev) => ev && ev.courtSideSwapped === swap);
      return buildReactServeTrajectoryCard(index, list, scope, far);
    }),
  });
}
function publishReactPlayerServeGrid(target, index) {
  const scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensurePlayerAnalysisState().courtSideByScope[scope],
      ) === "far";
  analysisTableStore.publish(target.id, {
    legend: index === null ? [] : buildReactTrajectoryLegend("serve"),
    cards:
      index === null
        ? []
        : [
            buildReactServeTrajectoryCard(
              index,
              getFilteredPlayerServeTrajectoryEventsForPlayer(index),
              scope,
              far,
            ),
          ],
  });
}

function publishReactLogServeTrajectories() {
  const serving =
      getServingScopeForLogTrajectory() || getActiveServeSelectionScope(),
    allowOur = !!state.showServeTrajectoryLogOur,
    allowOpp = !!state.showServeTrajectoryLogOpp;
  if (elServeTrajectoryLogToggleInline)
    elServeTrajectoryLogToggleInline.checked = allowOur;
  if (elServeTrajectoryLogToggleInlineOpp)
    elServeTrajectoryLogToggleInlineOpp.checked = allowOpp;
  const cards = ["our", "opponent"].map((scope) => {
    const visible =
      serving === scope &&
      (scope === "our" ? allowOur : state.useOpponentTeam && allowOpp);
    if (!visible)
      return { key: scope, scope, visible: false, empty: true, title: "—" };
    const { events, serverName } = getServeTrajectoryEventsForServer(scope),
      formatted = serverName
        ? scope === "our"
          ? formatNameWithNumber(serverName)
          : formatNameWithNumberFor(serverName, getPlayerNumbersForScope(scope))
        : "—",
      stats = getServeStatsForServer(scope, serverName);
    return {
      key: scope,
      scope,
      visible: true,
      empty: !events.length,
      title: `Battuta · ${formatted}`,
      stats: stats
        ? [
            { label: "Tot", value: stats.total },
            { label: "#", value: stats.ace },
            { label: "=", value: stats.error },
            { label: "Pos", value: stats.pos },
            { label: "Eff", value: stats.eff },
          ]
        : null,
      paint: (canvas, visual, redraw) =>
        drawServeTrajectoryCanvas(canvas, visual, events, {
          scope,
          isFarServe: isFarSideForScope(scope),
          onImagesLoad: redraw,
        }),
    };
  });
  analysisTableStore.publish(elLogServeTrajectory.id, {
    visible: !!serving,
    cards,
    legend: cards.some((card) => card.visible)
      ? buildReactTrajectoryLegend("serve")
      : [],
  });
}
