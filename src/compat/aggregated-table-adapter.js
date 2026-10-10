function openReactAggregatedSkill(skillId, scope, chooseTeam = false) {
  if (chooseTeam) analysisTeamFilterState.teams = new Set([scope]);
  aggTableView = { mode: "skill", skillId, playerIdx: null };
  renderAggregatedTable();
}
function openReactAggregatedPlayer(index, scope, chooseTeam = false) {
  if (chooseTeam) analysisTeamFilterState.teams = new Set([scope]);
  ensurePlayerAnalysisState().playerIdx = index;
  saveState();
  setActiveAggTab("player");
  renderPlayerAnalysis();
}
function buildReactAggregatedHeaders(sets, includeErrors) {
  const top = [{ text: "Atleta", rowspan: 2 }],
    bottom = [];
  if (sets.length) {
    top.push({ text: "Formazione di partenza", colspan: sets.length });
    sets.forEach((setNum) =>
      bottom.push({
        text: "S" + setNum,
        className: "set-start-header",
        setNum,
        onClick: () =>
          openSetStartEditor(
            setNum,
            analysisTeamFilterState.teams?.has("opponent") ? "opponent" : "our",
          ),
      }),
    );
  }
  top.push({ text: "Punti", colspan: includeErrors ? 5 : 4 });
  bottom.push(
    ...[
      "Fatti",
      "Subiti",
      "Δ",
      "Falli/Errori",
      ...(includeErrors ? ["Errori avv."] : []),
    ].map((text) => ({ text })),
  );
  [
    {
      id: "serve",
      label: "Battuta",
      columns: ["Tot", "Err", "Punti", "Eff", "Pos"],
    },
    {
      id: "pass",
      label: "Ricezione",
      columns: ["Tot", "Err", "Ace", "Pos", "Prf", "Eff"],
    },
    {
      id: "freeball",
      label: "Freeball",
      columns: ["Tot", "Err", "Pos", "Prf", "Eff"],
    },
    {
      id: "attack",
      label: "Attacco",
      columns: ["Tot", "Err", "Mur", "Punti", "% Punti", "Eff"],
    },
    { id: "block", label: "Muro", columns: ["Tot", "Punti"] },
    { id: "defense", label: "Difesa", columns: ["Tot", "Err", "Eff"] },
  ].forEach((skill) => {
    const className = "skill-col skill-" + skill.id;
    top.push({
      text: skill.label,
      colspan: skill.columns.length,
      className: className + " agg-skill-header",
      skillId: skill.id,
      title: "Dettagli " + getSkillLabel(skill.id),
      onClick: () => openReactAggregatedSkill(skill.id),
    });
    bottom.push(...skill.columns.map((text) => ({ text, className })));
  });
  return [top, bottom];
}
function renderReactAggregatedDependents(summary, scope, events) {
  renderScoreAndRotations(summary, scope, { events });
  renderSecondTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}
function buildReactAggregatedDetail(headers, rows, summary) {
  const skillId = aggTableView.skillId,
    playerIdx = aggTableView.playerIdx,
    scope = getAnalysisTeamScope(),
    events = getAnalysisEvents(),
    players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    isSkill = aggTableView.mode === "skill",
    className = isSkill ? "skill-col skill-" + skillId : "";
  headers.push([
    {
      text:
        (isSkill
          ? "Atleta · " + getSkillLabel(skillId)
          : "Fondamentale · " + getAggSkillPlayerLabel(playerIdx)) +
        " <- Tabellino",
      className: "agg-table-back",
      onClick: () => {
        resetAggTableView();
        renderAggregatedTable();
      },
    },
    ...["Tot", "#", "+", "!", "-", "=", "/", "Pos", "Prf", "Eff"].map(
      (text) => ({ text, className }),
    ),
  ]);
  if (!players?.length) {
    rows.push({
      cells: [
        {
          text:
            "Aggiungi giocatrici per vedere il dettaglio" +
            (isSkill ? " " + getSkillLabel(skillId) : "") +
            ".",
          colspan: 11,
        },
      ],
    });
    return [];
  }
  const add = (label, counts, id, index, total = false) => {
    const metrics = computeMetrics(counts, id),
      texts = [
        label,
        metrics.total,
        ...["#", "+", "!", "-", "=", "/"].map((code) => counts[code] || 0),
        ...["pos", "prf", "eff"].map((key) =>
          metrics[key] === null ? "-" : formatPercent(metrics[key]),
        ),
      ];
    rows.push({
      className: total ? "rotation-row total" : "",
      cells: texts.map((text, cellIndex) => ({
        text,
        className:
          "skill-col skill-" +
          id +
          (isSkill && cellIndex === 0 && !total ? " agg-player-cell" : ""),
        onClick:
          isSkill && cellIndex === 0 && !total
            ? () => openReactAggregatedPlayer(index, scope)
            : undefined,
      })),
    });
  };
  if (isSkill) {
    const totals = emptyCounts(),
      entries =
        scope === "opponent"
          ? getSortedPlayerEntriesForScope(scope)
          : getSortedPlayerEntries();
    entries.forEach(({ name, idx }) => {
      const counts = getAggSkillCounts(skillId, idx);
      mergeCounts(totals, counts);
      add(
        scope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name),
        counts,
        skillId,
        idx,
      );
    });
    add("Totale squadra", totals, skillId, null, true);
    const bySet = new Map(
      getSummarySetNumbers().map((set) => [set, emptyCounts()]),
    );
    events.forEach((ev) => {
      if (
        !ev ||
        ev.skillId !== skillId ||
        !ev.code ||
        ev.actionType === "timeout" ||
        ev.actionType === "substitution" ||
        getTeamScopeFromEvent(ev) !== scope ||
        !isSkillEnabledForScope(skillId, scope)
      )
        return;
      const counts = bySet.get(normalizeSetNumber(ev.set));
      if (counts) counts[ev.code] = (counts[ev.code] || 0) + 1;
    });
    bySet.forEach((counts, set) =>
      add("Set " + set, counts, skillId, null, true),
    );
    if (deferSkillChartRenderWhilePaused())
      return aggregatedTableStore.getSnapshot().charts || [];
    skillChartToneColorCache = null;
    const chartEvents = buildAnalysisSkillChartEvents({
      scope,
      skillId,
      playerIdx: null,
    });
    return SKILL_CHART_METRICS.map((meta) =>
      buildReactSkillChartModel({
        title: `${getSkillLabel(skillId)} · ${meta.label}`,
        subtitle: `${chartEvents.length} eventi`,
        events: chartEvents,
        skillId,
        metricId: meta.id,
        seriesCacheKey: `analysis-summary-skill|${getSkillChartFiltersCacheToken(scope)}|skill:${skillId}|metric:${meta.id}`,
      }),
    );
  } else
    ["serve", "pass", "freeball", "attack", "block", "defense"].forEach((id) =>
      add(getSkillLabel(id), getAggSkillCounts(id, playerIdx), id, playerIdx),
    );
  return [];
}
function publishReactAggregatedTable() {
  const rows = [],
    extraRows = [];
  let headers = [],
    charts = [],
    tableClass = "agg-table";
  const finish = () =>
    aggregatedTableStore.publish({
      headers,
      rows,
      extraRows,
      charts,
      tableClass,
      hiddenSkills: SKILLS.filter(
        (skill) => state.metricsConfig?.[skill.id]?.enabled === false,
      ).map((skill) => skill.id),
    });
  if (!elAggTableBody) return;
  const { table, thead } = getAggTableElements();

  renderAnalysisTeamFilter();
  renderAnalysisSummarySetFilter();
  if (isAggSubtabVisible("set-trend")) {
    renderSetTrendAnalysis();
  }
  if (isAggSubtabVisible("play-by-play")) {
    renderPlayByPlayAnalysis();
  }
  if (isAggSubtabVisible("match-sheet")) {
    renderMatchSheetAnalysis();
  }
  const analysisScope = getAnalysisTeamScope();
  const analysisEvents = getAnalysisEvents();
  const playedSets = getSummarySetNumbers();
  const includeOpponentErrorsCol = !state.useOpponentTeam;
  const summaryColCount =
    32 + (includeOpponentErrorsCol ? 1 : 0) + playedSets.length;
  const showBothTeams =
    state.useOpponentTeam &&
    analysisTeamFilterState.teams.size === 0 &&
    aggTableView.mode === "summary";
  if (table) {
    if (showBothTeams) tableClass += " agg-table--double";
    const freeballVisible = showBothTeams
      ? isSkillEnabledForScope("freeball", "our") ||
        isSkillEnabledForScope("freeball", "opponent")
      : isSkillEnabledForScope("freeball", analysisScope);
    if (!freeballVisible) tableClass += " agg-table--hide-freeball";
  }
  const summaryAll = computePointsSummary(null, {
    teamScope: analysisScope,
    events: analysisEvents,
  });
  if (isAggSubtabVisible("skill-charts")) {
    renderAnalysisSkillChartsPanel();
  }
  if (aggTableView.mode !== "summary") {
    charts = buildReactAggregatedDetail(headers, rows, summaryAll);
    finish();
    renderReactAggregatedDependents(summaryAll, analysisScope, analysisEvents);
    return;
  }
  headers = buildReactAggregatedHeaders(playedSets, includeOpponentErrorsCol);
  const computeTeamTotalsForEvents = (events, scope) => {
    const totalsBySkill = {
      serve: emptyCounts(),
      pass: emptyCounts(),
      freeball: emptyCounts(),
      attack: emptyCounts(),
      block: emptyCounts(),
      defense: emptyCounts(),
    };
    let teamErrors = 0;
    (events || []).forEach((ev) => {
      if (
        !ev ||
        ev.skillId === "manual" ||
        ev.actionType === "timeout" ||
        ev.actionType === "substitution"
      ) {
        if (ev && ev.skillId === "manual" && ev.code === "team-error") {
          const val = getEventPointValue(ev);
          teamErrors += Math.max(0, val);
        }
        return;
      }
      if (!isSkillEnabledForScope(ev.skillId, getTeamScopeFromEvent(ev)))
        return;
      const bucket = totalsBySkill[ev.skillId];
      if (!bucket || !ev.code) return;
      bucket[ev.code] = (bucket[ev.code] || 0) + 1;
    });
    const playerPoints = computePlayerPointsMap(events, scope);
    const playerErrors = computePlayerErrorsMap(events);
    let totalFor = 0;
    let totalAgainst = 0;
    Object.values(playerPoints || {}).forEach((points) => {
      totalFor += points.for || 0;
      totalAgainst += points.against || 0;
    });
    let totalErrors = 0;
    Object.values(playerErrors || {}).forEach((val) => {
      totalErrors += val || 0;
    });
    totalErrors += teamErrors;
    return { totalsBySkill, totalFor, totalAgainst, totalErrors };
  };
  const renderSummaryExtraTable = (scopes) => {
    if (!elAggSummaryExtraBody) return;

    const buildRow = (cells, { isHeader = false } = {}) => {
      extraRows.push({
        cells: cells.map((cell) => ({ ...cell, tag: isHeader ? "th" : "td" })),
      });
    };
    const positiveReceiveCodes = new Set(["#", "+"]);
    const tableScopes = Array.isArray(scopes) && scopes.length ? scopes : [];
    tableScopes.forEach((scope, idx) => {
      const scopeEvents = analysisEvents.filter(
        (ev) =>
          matchesTeamFilter(ev, new Set([scope])) &&
          matchesSummarySetFilter(ev),
      );
      const teamName = getTeamNameForScope(scope);
      if (idx > 0) {
        buildRow([{ text: "", colspan: 14 }]);
      }
      buildRow([{ text: teamName, colspan: 14 }], { isHeader: true });
      buildRow(
        [
          { text: "Cambio palla", colspan: 3 },
          { text: "Attacchi su ricezione positiva", colspan: 5 },
          { text: "Attacchi su ricezione non positiva", colspan: 6 },
        ],
        { isHeader: true },
      );
      buildRow(
        [
          { text: "Ricezione" },
          { text: "CP punti" },
          { text: "%" },
          { text: "Err" },
          { text: "Mur" },
          { text: "Pt" },
          { text: "Pt%" },
          { text: "Tot" },
          { text: "Err" },
          { text: "Mur" },
          { text: "Pt" },
          { text: "Pt%" },
          { text: "Tot" },
          { text: "" },
        ],
        { isHeader: true },
      );
      const receiveEvents = scopeEvents.filter(
        (ev) => ev && ev.skillId === "pass",
      );
      const receiveCount = receiveEvents.length;
      const sideoutAttacks = scopeEvents.filter((ev) => {
        if (!ev || ev.skillId !== "attack") return false;
        if (ev.attackBp === false) return true;
        if (ev.attackBp == null && ev.receiveEvaluation) return true;
        return false;
      });
      const cpPoints = sideoutAttacks.filter((ev) => ev.code === "#").length;
      const posReceiveAttacks = sideoutAttacks.filter((ev) =>
        positiveReceiveCodes.has(ev.receiveEvaluation),
      );
      const nonPosReceiveAttacks = sideoutAttacks.filter(
        (ev) => !positiveReceiveCodes.has(ev.receiveEvaluation),
      );
      const posSummary = computeAttackSplitSummary(posReceiveAttacks);
      const nonPosSummary = computeAttackSplitSummary(nonPosReceiveAttacks);
      buildRow([
        { text: receiveCount },
        { text: cpPoints },
        { text: formatPercentValueSafe(cpPoints, receiveCount) },
        { text: posSummary.err },
        { text: posSummary.mur },
        { text: posSummary.pt },
        { text: formatPercentValueSafe(posSummary.pt, posSummary.tot) },
        { text: posSummary.tot },
        { text: nonPosSummary.err },
        { text: nonPosSummary.mur },
        { text: nonPosSummary.pt },
        { text: formatPercentValueSafe(nonPosSummary.pt, nonPosSummary.tot) },
        { text: nonPosSummary.tot },
        { text: "-" },
      ]);
      buildRow([{ text: "", colspan: 14 }]);
      buildRow(
        [
          { text: "Break Point", colspan: 3 },
          { text: "Contrattacchi", colspan: 5 },
          { text: "Differenza rotazione", colspan: 6 },
        ],
        { isHeader: true },
      );
      buildRow(
        [
          { text: "Battuta" },
          { text: "BP punti" },
          { text: "%" },
          { text: "Err" },
          { text: "Mur" },
          { text: "Pt" },
          { text: "Pt%" },
          { text: "Tot" },
          { text: "1" },
          { text: "2" },
          { text: "3" },
          { text: "4" },
          { text: "5" },
          { text: "6" },
        ],
        { isHeader: true },
      );
      const serveEvents = scopeEvents.filter(
        (ev) => ev && ev.skillId === "serve",
      );
      const serveCount = serveEvents.length;
      const bpPointEvents = scopeEvents.filter((ev) => {
        if (!ev) return false;
        const direction = getPointDirectionFor(scope, ev);
        if (direction !== "for") return false;
        if (ev.skillId === "serve" || ev.skillId === "block") return true;
        return ev.skillId === "attack" && ev.attackBp === true;
      });
      const bpPoints = bpPointEvents.reduce(
        (sum, ev) => sum + getEventPointValue(ev),
        0,
      );
      const counterAttacks = scopeEvents.filter(
        (ev) => ev && ev.skillId === "attack" && ev.attackBp === true,
      );
      const counterSummary = computeAttackSplitSummary(counterAttacks);
      const rotationDeltas = computeRotationDeltasForEvents(scopeEvents, scope);
      buildRow([
        { text: serveCount },
        { text: bpPoints },
        { text: formatPercentValueSafe(bpPoints, serveCount) },
        { text: counterSummary.err },
        { text: counterSummary.mur },
        { text: counterSummary.pt },
        { text: formatPercentValueSafe(counterSummary.pt, counterSummary.tot) },
        { text: counterSummary.tot },
        {
          text: rotationDeltas[0] || 0,
          className:
            "rotation-delta-cell " +
            (rotationDeltas[0] > 0
              ? "pos"
              : rotationDeltas[0] < 0
                ? "neg"
                : "zero"),
        },
        {
          text: rotationDeltas[1] || 0,
          className:
            "rotation-delta-cell " +
            (rotationDeltas[1] > 0
              ? "pos"
              : rotationDeltas[1] < 0
                ? "neg"
                : "zero"),
        },
        {
          text: rotationDeltas[2] || 0,
          className:
            "rotation-delta-cell " +
            (rotationDeltas[2] > 0
              ? "pos"
              : rotationDeltas[2] < 0
                ? "neg"
                : "zero"),
        },
        {
          text: rotationDeltas[3] || 0,
          className:
            "rotation-delta-cell " +
            (rotationDeltas[3] > 0
              ? "pos"
              : rotationDeltas[3] < 0
                ? "neg"
                : "zero"),
        },
        {
          text: rotationDeltas[4] || 0,
          className:
            "rotation-delta-cell " +
            (rotationDeltas[4] > 0
              ? "pos"
              : rotationDeltas[4] < 0
                ? "neg"
                : "zero"),
        },
        {
          text: rotationDeltas[5] || 0,
          className:
            "rotation-delta-cell " +
            (rotationDeltas[5] > 0
              ? "pos"
              : rotationDeltas[5] < 0
                ? "neg"
                : "zero"),
        },
      ]);
    });
  };
  const renderAggSummaryForScope = (scope, { showHeader = false } = {}) => {
    const analysisPlayers = getPlayersForScope(scope);
    const analysisNumbers = getPlayerNumbersForScope(scope);
    const filteredEvents = analysisEvents.filter((ev) =>
      matchesTeamFilter(ev, new Set([scope])),
    );
    const summaryEvents = filteredEvents.filter((ev) =>
      matchesSummarySetFilter(ev),
    );
    if (showHeader) {
      rows.push({
        className: "rotation-row total",
        cells: [{ text: getTeamNameForScope(scope), colspan: summaryColCount }],
      });
      headers.forEach((header) =>
        rows.push({
          className: "agg-body-header",
          scope,
          cells: header.map((cell) => ({
            ...cell,
            tag: "td",
            className: cell.skillId
              ? cell.className + " agg-skill-header"
              : cell.className,
            onClick: cell.skillId
              ? () =>
                  openReactAggregatedSkill(cell.skillId, scope, showBothTeams)
              : cell.setNum
                ? () => openSetStartEditor(cell.setNum, scope)
                : undefined,
          })),
        }),
      );
    }
    if (!analysisPlayers || analysisPlayers.length === 0) {
      rows.push({
        cells: [
          {
            text: "Aggiungi giocatrici per vedere il riepilogo.",
            colspan: summaryColCount,
          },
        ],
      });
      return;
    }
    const statsByPlayer = {};
    summaryEvents.forEach((ev) => {
      if (
        !ev ||
        ev.skillId === "manual" ||
        ev.actionType === "timeout" ||
        ev.actionType === "substitution"
      ) {
        return;
      }
      if (!isSkillEnabledForScope(ev.skillId, getTeamScopeFromEvent(ev)))
        return;
      if (typeof ev.playerIdx !== "number" || !analysisPlayers[ev.playerIdx])
        return;
      if (!statsByPlayer[ev.playerIdx]) {
        statsByPlayer[ev.playerIdx] = {};
      }
      if (!statsByPlayer[ev.playerIdx][ev.skillId]) {
        statsByPlayer[ev.playerIdx][ev.skillId] = {
          "#": 0,
          "+": 0,
          "!": 0,
          "-": 0,
          "=": 0,
          "/": 0,
        };
      }
      statsByPlayer[ev.playerIdx][ev.skillId][ev.code] =
        (statsByPlayer[ev.playerIdx][ev.skillId][ev.code] || 0) + 1;
    });
    if (!showBothTeams) {
      analysisStatsCache = statsByPlayer;
      analysisStatsScope = scope;
    }
    const playerPoints = computePlayerPointsMap(summaryEvents, scope);
    const playerErrors = computePlayerErrorsMap(summaryEvents);
    const playerOpponentErrors = includeOpponentErrorsCol
      ? computeOpponentErrorsMap(summaryEvents)
      : {};
    const playerPassAces = computePlayerPassAceMap(summaryEvents, scope);
    const totalsBySkill = {
      serve: emptyCounts(),
      pass: emptyCounts(),
      attack: emptyCounts(),
      block: emptyCounts(),
      defense: emptyCounts(),
    };
    let totalErrors = 0;
    let totalPassAces = 0;
    const sortedEntries =
      scope === "opponent"
        ? getSortedPlayerEntriesForScope(scope)
        : getSortedPlayerEntries();
    const startInfoList = buildSetStartInfoList(playedSets, scope);
    sortedEntries.forEach(({ name, idx }) => {
      const serveCounts = normalizeCounts(
        statsByPlayer[idx] && statsByPlayer[idx].serve,
      );
      const passCounts = normalizeCounts(
        statsByPlayer[idx] && statsByPlayer[idx].pass,
      );
      const freeballCounts = normalizeCounts(
        statsByPlayer[idx] && statsByPlayer[idx].freeball,
      );
      const attackCounts = normalizeCounts(
        statsByPlayer[idx] && statsByPlayer[idx].attack,
      );
      const blockCounts = normalizeCounts(
        statsByPlayer[idx] && statsByPlayer[idx].block,
      );
      const defenseCounts = normalizeCounts(
        statsByPlayer[idx] && statsByPlayer[idx].defense,
      );

      const serveMetrics = computeMetrics(serveCounts, "serve");
      const passMetrics = computeMetrics(passCounts, "pass");
      const freeballMetrics = computeMetrics(freeballCounts, "freeball");
      const attackMetrics = computeMetrics(attackCounts, "attack");
      const defenseMetrics = computeMetrics(defenseCounts, "defense");

      mergeCounts(totalsBySkill.serve, serveCounts);
      mergeCounts(totalsBySkill.pass, passCounts);
      mergeCounts(totalsBySkill.freeball, freeballCounts);
      mergeCounts(totalsBySkill.attack, attackCounts);
      mergeCounts(totalsBySkill.block, blockCounts);
      mergeCounts(totalsBySkill.defense, defenseCounts);

      const points = playerPoints[idx] || { for: 0, against: 0 };
      const personalErrors = playerErrors[idx] || 0;
      const opponentErrors = includeOpponentErrorsCol
        ? playerOpponentErrors[idx] || 0
        : 0;
      const passAces = playerPassAces[idx] || 0;
      totalErrors += personalErrors;
      totalPassAces += passAces;
      const attackTotal = totalFromCounts(attackCounts);
      const servePointCount = countPointsForSkill(serveCounts, "serve");
      const attackPointCount = countPointsForSkill(attackCounts, "attack");
      const blockPointCount = countPointsForSkill(blockCounts, "block");

      const startCells = startInfoList.map((info) => {
        const key = makePlayerNameKey(name);
        const pos = info.positions ? info.positions.get(key) : null;
        const hasPos = !!pos;
        const isSubIn = !hasPos && info.subsIn && info.subsIn.has(key);
        const text = hasPos ? String(pos) : isSubIn ? "in" : "-";
        return {
          text,
          isSetter: hasPos && info.setterPos === pos,
          isStarter: hasPos,
        };
      });
      const cells = [
        {
          text:
            scope === "opponent"
              ? formatNameWithNumberFor(name, analysisNumbers)
              : formatNameWithNumber(name),
          isPlayer: true,
          playerIdx: idx,
        },
        ...startCells,
        { text: points.for || 0 },
        { text: points.against || 0 },
        { text: formatDelta((points.for || 0) - (points.against || 0)) },
        { text: personalErrors || 0 },
        ...(includeOpponentErrorsCol
          ? [{ text: opponentErrors > 0 ? opponentErrors : "-" }]
          : []),

        {
          text: totalFromCounts(serveCounts),
          className: "skill-col skill-serve",
        },
        { text: serveCounts["="] || 0, className: "skill-col skill-serve" },
        { text: servePointCount || 0, className: "skill-col skill-serve" },
        {
          text:
            serveMetrics.eff === null ? "-" : formatPercent(serveMetrics.eff),
          className: "skill-col skill-serve",
        },
        {
          text:
            serveMetrics.pos === null ? "-" : formatPercent(serveMetrics.pos),
          className: "skill-col skill-serve",
        },

        {
          text: totalFromCounts(passCounts),
          className: "skill-col skill-pass",
        },
        {
          text: passMetrics.negativeCount || 0,
          className: "skill-col skill-pass",
        },
        { text: passAces || 0, className: "skill-col skill-pass" },
        {
          text: passMetrics.pos === null ? "-" : formatPercent(passMetrics.pos),
          className: "skill-col skill-pass",
        },
        {
          text: passMetrics.prf === null ? "-" : formatPercent(passMetrics.prf),
          className: "skill-col skill-pass",
        },
        {
          text: passMetrics.eff === null ? "-" : formatPercent(passMetrics.eff),
          className: "skill-col skill-pass",
        },

        {
          text: totalFromCounts(freeballCounts),
          className: "skill-col skill-freeball",
        },
        {
          text: freeballMetrics.negativeCount || 0,
          className: "skill-col skill-freeball",
        },
        {
          text:
            freeballMetrics.pos === null
              ? "-"
              : formatPercent(freeballMetrics.pos),
          className: "skill-col skill-freeball",
        },
        {
          text:
            freeballMetrics.prf === null
              ? "-"
              : formatPercent(freeballMetrics.prf),
          className: "skill-col skill-freeball",
        },
        {
          text:
            freeballMetrics.eff === null
              ? "-"
              : formatPercent(freeballMetrics.eff),
          className: "skill-col skill-freeball",
        },

        { text: attackTotal, className: "skill-col skill-attack" },
        { text: attackCounts["="] || 0, className: "skill-col skill-attack" },
        { text: attackCounts["/"] || 0, className: "skill-col skill-attack" },
        { text: attackPointCount || 0, className: "skill-col skill-attack" },
        {
          text: formatPercentValue(attackPointCount || 0, attackTotal),
          className: "skill-col skill-attack",
        },
        {
          text:
            attackMetrics.eff === null ? "-" : formatPercent(attackMetrics.eff),
          className: "skill-col skill-attack",
        },

        {
          text: totalFromCounts(blockCounts),
          className: "skill-col skill-block",
        },
        { text: blockPointCount || 0, className: "skill-col skill-block" },

        {
          text: totalFromCounts(defenseCounts),
          className: "skill-col skill-defense",
        },
        {
          text: defenseMetrics.negativeCount || 0,
          className: "skill-col skill-defense",
        },
        {
          text:
            defenseMetrics.eff === null
              ? "-"
              : formatPercent(defenseMetrics.eff),
          className: "skill-col skill-defense",
        },
      ];
      rows.push({
        cells: cells.map((cell) => ({
          ...cell,
          className:
            cell.className ||
            (cell.isStarter ? "formation-starter-cell " : "") +
              (cell.isSetter ? "formation-setter-cell " : "") +
              (cell.isPlayer ? "agg-player-cell" : ""),
          title: cell.isPlayer ? "Dettagli giocatrice" : undefined,
          onClick: cell.isPlayer
            ? () =>
                openReactAggregatedPlayer(cell.playerIdx, scope, showBothTeams)
            : undefined,
        })),
      });
    });
    const teamTotals = computeTeamTotalsForEvents(summaryEvents, scope);
    const teamOpponentErrors = includeOpponentErrorsCol
      ? computeOpponentErrorsTotal(summaryEvents)
      : 0;
    const serveTotalsMetrics = computeMetrics(totalsBySkill.serve, "serve");
    const passTotalsMetrics = computeMetrics(totalsBySkill.pass, "pass");
    const freeballTotalsMetrics = computeMetrics(
      totalsBySkill.freeball,
      "freeball",
    );
    const attackTotalsMetrics = computeMetrics(totalsBySkill.attack, "attack");
    const blockTotalsMetrics = computeMetrics(totalsBySkill.block, "block");
    const defenseTotalsMetrics = computeMetrics(
      totalsBySkill.defense,
      "defense",
    );
    const teamAttackTotal = totalFromCounts(totalsBySkill.attack);
    const teamServePointCount = countPointsForSkill(
      totalsBySkill.serve,
      "serve",
    );
    const teamAttackPointCount = countPointsForSkill(
      totalsBySkill.attack,
      "attack",
    );
    const teamBlockPointCount = countPointsForSkill(
      totalsBySkill.block,
      "block",
    );

    const startTotalsCells = playedSets.map(() => ({ text: "-" }));
    const totalCells = [
      { text: "Totale squadra" },
      ...startTotalsCells,
      { text: teamTotals.totalFor || 0 },
      { text: teamTotals.totalAgainst || 0 },
      {
        text: formatDelta(
          (teamTotals.totalFor || 0) - (teamTotals.totalAgainst || 0),
        ),
      },
      { text: teamTotals.totalErrors || 0 },
      ...(includeOpponentErrorsCol ? [{ text: teamOpponentErrors || 0 }] : []),

      {
        text: totalFromCounts(totalsBySkill.serve),
        className: "skill-col skill-serve",
      },
      {
        text: totalsBySkill.serve["="] || 0,
        className: "skill-col skill-serve",
      },
      { text: teamServePointCount || 0, className: "skill-col skill-serve" },
      {
        text:
          serveTotalsMetrics.eff === null
            ? "-"
            : formatPercent(serveTotalsMetrics.eff),
        className: "skill-col skill-serve",
      },
      {
        text:
          serveTotalsMetrics.pos === null
            ? "-"
            : formatPercent(serveTotalsMetrics.pos),
        className: "skill-col skill-serve",
      },

      {
        text: totalFromCounts(totalsBySkill.pass),
        className: "skill-col skill-pass",
      },
      {
        text: passTotalsMetrics.negativeCount || 0,
        className: "skill-col skill-pass",
      },
      { text: totalPassAces || 0, className: "skill-col skill-pass" },
      {
        text:
          passTotalsMetrics.pos === null
            ? "-"
            : formatPercent(passTotalsMetrics.pos),
        className: "skill-col skill-pass",
      },
      {
        text:
          passTotalsMetrics.prf === null
            ? "-"
            : formatPercent(passTotalsMetrics.prf),
        className: "skill-col skill-pass",
      },
      {
        text:
          passTotalsMetrics.eff === null
            ? "-"
            : formatPercent(passTotalsMetrics.eff),
        className: "skill-col skill-pass",
      },

      {
        text: totalFromCounts(totalsBySkill.freeball),
        className: "skill-col skill-freeball",
      },
      {
        text: freeballTotalsMetrics.negativeCount || 0,
        className: "skill-col skill-freeball",
      },
      {
        text:
          freeballTotalsMetrics.pos === null
            ? "-"
            : formatPercent(freeballTotalsMetrics.pos),
        className: "skill-col skill-freeball",
      },
      {
        text:
          freeballTotalsMetrics.prf === null
            ? "-"
            : formatPercent(freeballTotalsMetrics.prf),
        className: "skill-col skill-freeball",
      },
      {
        text:
          freeballTotalsMetrics.eff === null
            ? "-"
            : formatPercent(freeballTotalsMetrics.eff),
        className: "skill-col skill-freeball",
      },

      { text: teamAttackTotal, className: "skill-col skill-attack" },
      {
        text: totalsBySkill.attack["="] || 0,
        className: "skill-col skill-attack",
      },
      {
        text: totalsBySkill.attack["/"] || 0,
        className: "skill-col skill-attack",
      },
      { text: teamAttackPointCount || 0, className: "skill-col skill-attack" },
      {
        text: formatPercentValue(teamAttackPointCount || 0, teamAttackTotal),
        className: "skill-col skill-attack",
      },
      {
        text:
          attackTotalsMetrics.eff === null
            ? "-"
            : formatPercent(attackTotalsMetrics.eff),
        className: "skill-col skill-attack",
      },

      {
        text: totalFromCounts(totalsBySkill.block),
        className: "skill-col skill-block",
      },
      { text: teamBlockPointCount || 0, className: "skill-col skill-block" },

      {
        text: totalFromCounts(totalsBySkill.defense),
        className: "skill-col skill-defense",
      },
      {
        text: defenseTotalsMetrics.negativeCount || 0,
        className: "skill-col skill-defense",
      },
      {
        text:
          defenseTotalsMetrics.eff === null
            ? "-"
            : formatPercent(defenseTotalsMetrics.eff),
        className: "skill-col skill-defense",
      },
    ];
    rows.push({ className: "rotation-row total", cells: totalCells });
    playedSets.forEach((setNum) => {
      const setEvents = summaryEvents.filter(
        (ev) => normalizeSetNumber(ev.set) === setNum,
      );
      const setTotals = computeTeamTotalsForEvents(setEvents, scope);
      const setOpponentErrors = includeOpponentErrorsCol
        ? computeOpponentErrorsTotal(setEvents)
        : 0;
      const setServeMetrics = computeMetrics(
        setTotals.totalsBySkill.serve,
        "serve",
      );
      const setPassMetrics = computeMetrics(
        setTotals.totalsBySkill.pass,
        "pass",
      );
      const setFreeballMetrics = computeMetrics(
        setTotals.totalsBySkill.freeball,
        "freeball",
      );
      const setAttackMetrics = computeMetrics(
        setTotals.totalsBySkill.attack,
        "attack",
      );
      const setDefenseMetrics = computeMetrics(
        setTotals.totalsBySkill.defense,
        "defense",
      );
      const setAttackTotal = totalFromCounts(setTotals.totalsBySkill.attack);
      const setServePointCount = countPointsForSkill(
        setTotals.totalsBySkill.serve,
        "serve",
      );
      const setAttackPointCount = countPointsForSkill(
        setTotals.totalsBySkill.attack,
        "attack",
      );
      const setBlockPointCount = countPointsForSkill(
        setTotals.totalsBySkill.block,
        "block",
      );

      const setPassAcesMap = computePlayerPassAceMap(setEvents, scope);
      let setPassAces = 0;
      Object.values(setPassAcesMap || {}).forEach((val) => {
        setPassAces += val || 0;
      });

      const setStartCells = playedSets.map(() => ({ text: "-" }));
      const setCells = [
        { text: "Set " + setNum },
        ...setStartCells,
        { text: setTotals.totalFor || 0 },
        { text: setTotals.totalAgainst || 0 },
        {
          text: formatDelta(
            (setTotals.totalFor || 0) - (setTotals.totalAgainst || 0),
          ),
        },
        { text: setTotals.totalErrors || 0 },
        ...(includeOpponentErrorsCol ? [{ text: setOpponentErrors || 0 }] : []),

        {
          text: totalFromCounts(setTotals.totalsBySkill.serve),
          className: "skill-col skill-serve",
        },
        {
          text: setTotals.totalsBySkill.serve["="] || 0,
          className: "skill-col skill-serve",
        },
        { text: setServePointCount || 0, className: "skill-col skill-serve" },
        {
          text:
            setServeMetrics.eff === null
              ? "-"
              : formatPercent(setServeMetrics.eff),
          className: "skill-col skill-serve",
        },
        {
          text:
            setServeMetrics.pos === null
              ? "-"
              : formatPercent(setServeMetrics.pos),
          className: "skill-col skill-serve",
        },

        {
          text: totalFromCounts(setTotals.totalsBySkill.pass),
          className: "skill-col skill-pass",
        },
        {
          text: setPassMetrics.negativeCount || 0,
          className: "skill-col skill-pass",
        },
        { text: setPassAces || 0, className: "skill-col skill-pass" },
        {
          text:
            setPassMetrics.pos === null
              ? "-"
              : formatPercent(setPassMetrics.pos),
          className: "skill-col skill-pass",
        },
        {
          text:
            setPassMetrics.prf === null
              ? "-"
              : formatPercent(setPassMetrics.prf),
          className: "skill-col skill-pass",
        },
        {
          text:
            setPassMetrics.eff === null
              ? "-"
              : formatPercent(setPassMetrics.eff),
          className: "skill-col skill-pass",
        },

        {
          text: totalFromCounts(setTotals.totalsBySkill.freeball),
          className: "skill-col skill-freeball",
        },
        {
          text: setFreeballMetrics.negativeCount || 0,
          className: "skill-col skill-freeball",
        },
        {
          text:
            setFreeballMetrics.pos === null
              ? "-"
              : formatPercent(setFreeballMetrics.pos),
          className: "skill-col skill-freeball",
        },
        {
          text:
            setFreeballMetrics.prf === null
              ? "-"
              : formatPercent(setFreeballMetrics.prf),
          className: "skill-col skill-freeball",
        },
        {
          text:
            setFreeballMetrics.eff === null
              ? "-"
              : formatPercent(setFreeballMetrics.eff),
          className: "skill-col skill-freeball",
        },

        { text: setAttackTotal, className: "skill-col skill-attack" },
        {
          text: setTotals.totalsBySkill.attack["="] || 0,
          className: "skill-col skill-attack",
        },
        {
          text: setTotals.totalsBySkill.attack["/"] || 0,
          className: "skill-col skill-attack",
        },
        { text: setAttackPointCount || 0, className: "skill-col skill-attack" },
        {
          text: formatPercentValue(setAttackPointCount || 0, setAttackTotal),
          className: "skill-col skill-attack",
        },
        {
          text:
            setAttackMetrics.eff === null
              ? "-"
              : formatPercent(setAttackMetrics.eff),
          className: "skill-col skill-attack",
        },

        {
          text: totalFromCounts(setTotals.totalsBySkill.block),
          className: "skill-col skill-block",
        },
        { text: setBlockPointCount || 0, className: "skill-col skill-block" },

        {
          text: totalFromCounts(setTotals.totalsBySkill.defense),
          className: "skill-col skill-defense",
        },
        {
          text: setDefenseMetrics.negativeCount || 0,
          className: "skill-col skill-defense",
        },
        {
          text:
            setDefenseMetrics.eff === null
              ? "-"
              : formatPercent(setDefenseMetrics.eff),
          className: "skill-col skill-defense",
        },
      ];
      rows.push({ className: "rotation-row", cells: setCells });
    });
  };
  if (showBothTeams) {
    renderAggSummaryForScope("our", { showHeader: true });
    renderAggSummaryForScope("opponent", { showHeader: true });
    renderSummaryExtraTable(["our", "opponent"]);
    finish();
    renderScoreAndRotations(summaryAll, "our", { events: analysisEvents });
    renderSecondTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();

    return;
  }
  const analysisPlayers = getPlayersForScope(analysisScope);
  if (!analysisPlayers || analysisPlayers.length === 0) {
    rows.push({
      cells: [
        {
          text: "Aggiungi giocatrici per vedere il riepilogo.",
          colspan: summaryColCount,
        },
      ],
    });
    finish();
    renderScoreAndRotations(summaryAll, analysisScope, {
      events: analysisEvents,
    });
    renderSecondTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();

    return;
  }
  renderAggSummaryForScope(analysisScope);
  renderSummaryExtraTable([analysisScope]);
  finish();
  renderScoreAndRotations(summaryAll, analysisScope, {
    events: analysisEvents,
  });
  renderSecondTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}
