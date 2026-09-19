function renderAggregatedTable() {
  if (!elAggTableBody) return;
  const { table, thead } = getAggTableElements();
  ensureAggTableHeadCache(thead);
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
  const summaryColCount = 32 + (includeOpponentErrorsCol ? 1 : 0) + playedSets.length;
  const showBothTeams =
    state.useOpponentTeam &&
    analysisTeamFilterState.teams.size === 0 &&
    aggTableView.mode === "summary";
  if (table) {
    table.classList.toggle("agg-table--double", showBothTeams);
    const freeballVisible = showBothTeams
      ? isSkillEnabledForScope("freeball", "our") || isSkillEnabledForScope("freeball", "opponent")
      : isSkillEnabledForScope("freeball", analysisScope);
    table.classList.toggle("agg-table--hide-freeball", !freeballVisible);
  }
  const summaryAll = computePointsSummary(null, { teamScope: analysisScope, events: analysisEvents });
  if (isAggSubtabVisible("skill-charts")) {
    renderAnalysisSkillChartsPanel();
  }
  if (aggTableView.mode === "skill" && aggTableView.skillId) {
    renderAggSkillDetailTable(summaryAll);
    return;
  }
  if (aggTableView.mode === "player" && aggTableView.playerIdx !== null) {
    renderAggPlayerDetailTable(summaryAll);
    if (elAggSummaryExtraBody) elAggSummaryExtraBody.innerHTML = "";
    return;
  }
  if (thead) {
    renderAggSummaryHeader(thead, playedSets, { includeOpponentErrors: includeOpponentErrorsCol });
    bindSetStartHeaderClicks(thead);
    aggTableHeadCache = thead.innerHTML;
  }
  elAggTableBody.innerHTML = "";
  bindSetStartBodyHeaderClicks();
  const computeTeamTotalsForEvents = (events, scope) => {
    const totalsBySkill = {
      serve: emptyCounts(),
      pass: emptyCounts(),
      freeball: emptyCounts(),
      attack: emptyCounts(),
      block: emptyCounts(),
      defense: emptyCounts()
    };
    let teamErrors = 0;
    (events || []).forEach(ev => {
      if (!ev || ev.skillId === "manual" || ev.actionType === "timeout" || ev.actionType === "substitution") {
        if (ev && ev.skillId === "manual" && ev.code === "team-error") {
          const val = getEventPointValue(ev);
          teamErrors += Math.max(0, val);
        }
        return;
      }
      if (!isSkillEnabledForScope(ev.skillId, getTeamScopeFromEvent(ev))) return;
      const bucket = totalsBySkill[ev.skillId];
      if (!bucket || !ev.code) return;
      bucket[ev.code] = (bucket[ev.code] || 0) + 1;
    });
    const playerPoints = computePlayerPointsMap(events, scope);
    const playerErrors = computePlayerErrorsMap(events);
    let totalFor = 0;
    let totalAgainst = 0;
    Object.values(playerPoints || {}).forEach(points => {
      totalFor += points.for || 0;
      totalAgainst += points.against || 0;
    });
    let totalErrors = 0;
    Object.values(playerErrors || {}).forEach(val => {
      totalErrors += val || 0;
    });
    totalErrors += teamErrors;
    return { totalsBySkill, totalFor, totalAgainst, totalErrors };
  };
  const renderSummaryExtraTable = (scopes) => {
    if (!elAggSummaryExtraBody) return;
    elAggSummaryExtraBody.innerHTML = "";
    const buildRow = (cells, { isHeader = false } = {}) => {
      const tr = document.createElement("tr");
      cells.forEach(cell => {
        const el = document.createElement(isHeader ? "th" : "td");
        el.textContent = cell.text;
        if (cell.colspan) el.setAttribute("colspan", cell.colspan);
        if (cell.className) el.className = cell.className;
        tr.appendChild(el);
      });
      elAggSummaryExtraBody.appendChild(tr);
    };
    const positiveReceiveCodes = new Set(["#", "+"]);
    const tableScopes = Array.isArray(scopes) && scopes.length ? scopes : [];
    tableScopes.forEach((scope, idx) => {
      const scopeEvents = analysisEvents.filter(
        ev => matchesTeamFilter(ev, new Set([scope])) && matchesSummarySetFilter(ev)
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
          { text: "Attacchi su ricezione non positiva", colspan: 6 }
        ],
        { isHeader: true }
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
          { text: "" }
        ],
        { isHeader: true }
      );
      const receiveEvents = scopeEvents.filter(ev => ev && ev.skillId === "pass");
      const receiveCount = receiveEvents.length;
      const sideoutAttacks = scopeEvents.filter(ev => {
        if (!ev || ev.skillId !== "attack") return false;
        if (ev.attackBp === false) return true;
        if (ev.attackBp == null && ev.receiveEvaluation) return true;
        return false;
      });
      const cpPoints = sideoutAttacks.filter(ev => ev.code === "#").length;
      const posReceiveAttacks = sideoutAttacks.filter(ev => positiveReceiveCodes.has(ev.receiveEvaluation));
      const nonPosReceiveAttacks = sideoutAttacks.filter(
        ev => !positiveReceiveCodes.has(ev.receiveEvaluation)
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
        { text: "-" }
      ]);
      buildRow([{ text: "", colspan: 14 }]);
      buildRow(
        [
          { text: "Break Point", colspan: 3 },
          { text: "Contrattacchi", colspan: 5 },
          { text: "Differenza rotazione", colspan: 6 }
        ],
        { isHeader: true }
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
          { text: "6" }
        ],
        { isHeader: true }
      );
      const serveEvents = scopeEvents.filter(ev => ev && ev.skillId === "serve");
      const serveCount = serveEvents.length;
      const bpPointEvents = scopeEvents.filter(ev => {
        if (!ev) return false;
        const direction = getPointDirectionFor(scope, ev);
        if (direction !== "for") return false;
        if (ev.skillId === "serve" || ev.skillId === "block") return true;
        return ev.skillId === "attack" && ev.attackBp === true;
      });
      const bpPoints = bpPointEvents.reduce((sum, ev) => sum + getEventPointValue(ev), 0);
      const counterAttacks = scopeEvents.filter(ev => ev && ev.skillId === "attack" && ev.attackBp === true);
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
          className: "rotation-delta-cell " + (rotationDeltas[0] > 0 ? "pos" : rotationDeltas[0] < 0 ? "neg" : "zero")
        },
        {
          text: rotationDeltas[1] || 0,
          className: "rotation-delta-cell " + (rotationDeltas[1] > 0 ? "pos" : rotationDeltas[1] < 0 ? "neg" : "zero")
        },
        {
          text: rotationDeltas[2] || 0,
          className: "rotation-delta-cell " + (rotationDeltas[2] > 0 ? "pos" : rotationDeltas[2] < 0 ? "neg" : "zero")
        },
        {
          text: rotationDeltas[3] || 0,
          className: "rotation-delta-cell " + (rotationDeltas[3] > 0 ? "pos" : rotationDeltas[3] < 0 ? "neg" : "zero")
        },
        {
          text: rotationDeltas[4] || 0,
          className: "rotation-delta-cell " + (rotationDeltas[4] > 0 ? "pos" : rotationDeltas[4] < 0 ? "neg" : "zero")
        },
        {
          text: rotationDeltas[5] || 0,
          className: "rotation-delta-cell " + (rotationDeltas[5] > 0 ? "pos" : rotationDeltas[5] < 0 ? "neg" : "zero")
        }
      ]);
    });
  };
  const renderAggSummaryForScope = (scope, { showHeader = false } = {}) => {
    const analysisPlayers = getPlayersForScope(scope);
    const analysisNumbers = getPlayerNumbersForScope(scope);
    const filteredEvents = analysisEvents.filter(ev => matchesTeamFilter(ev, new Set([scope])));
    const summaryEvents = filteredEvents.filter(ev => matchesSummarySetFilter(ev));
    if (showHeader) {
      const headerRow = document.createElement("tr");
      headerRow.className = "rotation-row total";
      const headerCell = document.createElement("td");
      headerCell.colSpan = summaryColCount;
      headerCell.textContent = getTeamNameForScope(scope);
      headerRow.appendChild(headerCell);
      elAggTableBody.appendChild(headerRow);
      const columnsRows = buildAggBodyHeaderRows(thead);
      columnsRows.forEach(row => {
        row.dataset.teamScope = scope;
        elAggTableBody.appendChild(row);
        const skillHeaders = row.querySelectorAll(".skill-col");
        skillHeaders.forEach(cell => {
          const skillId = getSkillIdFromHeader(cell);
          if (!skillId) return;
          cell.classList.add("agg-skill-header");
          cell.title = "Dettagli " + getSkillLabel(skillId);
          cell.addEventListener("click", () => {
            if (showBothTeams) {
              analysisTeamFilterState.teams = new Set([scope]);
            }
            aggTableView = { mode: "skill", skillId, playerIdx: null };
            renderAggregatedTable();
          });
        });
      });
    }
    if (!analysisPlayers || analysisPlayers.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = summaryColCount;
      td.textContent = "Aggiungi giocatrici per vedere il riepilogo.";
      tr.appendChild(td);
      elAggTableBody.appendChild(tr);
      return;
    }
    const statsByPlayer = {};
    summaryEvents.forEach(ev => {
      if (!ev || ev.skillId === "manual" || ev.actionType === "timeout" || ev.actionType === "substitution") {
        return;
      }
      if (!isSkillEnabledForScope(ev.skillId, getTeamScopeFromEvent(ev))) return;
      if (typeof ev.playerIdx !== "number" || !analysisPlayers[ev.playerIdx]) return;
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
          "/": 0
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
    const playerOpponentErrors = includeOpponentErrorsCol ? computeOpponentErrorsMap(summaryEvents) : {};
    const playerPassAces = computePlayerPassAceMap(summaryEvents, scope);
    const totalsBySkill = {
      serve: emptyCounts(),
      pass: emptyCounts(),
      attack: emptyCounts(),
      block: emptyCounts(),
      defense: emptyCounts()
    };
    let totalErrors = 0;
    let totalPassAces = 0;
    const sortedEntries =
      scope === "opponent" ? getSortedPlayerEntriesForScope(scope) : getSortedPlayerEntries();
    const startInfoList = buildSetStartInfoList(playedSets, scope);
    sortedEntries.forEach(({ name, idx }) => {
      const serveCounts = normalizeCounts(statsByPlayer[idx] && statsByPlayer[idx].serve);
      const passCounts = normalizeCounts(statsByPlayer[idx] && statsByPlayer[idx].pass);
      const freeballCounts = normalizeCounts(statsByPlayer[idx] && statsByPlayer[idx].freeball);
      const attackCounts = normalizeCounts(statsByPlayer[idx] && statsByPlayer[idx].attack);
      const blockCounts = normalizeCounts(statsByPlayer[idx] && statsByPlayer[idx].block);
      const defenseCounts = normalizeCounts(statsByPlayer[idx] && statsByPlayer[idx].defense);

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
      const opponentErrors = includeOpponentErrorsCol ? playerOpponentErrors[idx] || 0 : 0;
      const passAces = playerPassAces[idx] || 0;
      totalErrors += personalErrors;
      totalPassAces += passAces;
      const attackTotal = totalFromCounts(attackCounts);
      const servePointCount = countPointsForSkill(serveCounts, "serve");
      const attackPointCount = countPointsForSkill(attackCounts, "attack");
      const blockPointCount = countPointsForSkill(blockCounts, "block");
      const row = document.createElement("tr");
      const startCells = startInfoList.map(info => {
        const key = makePlayerNameKey(name);
        const pos = info.positions ? info.positions.get(key) : null;
        const hasPos = !!pos;
        const isSubIn = !hasPos && info.subsIn && info.subsIn.has(key);
        const text = hasPos ? String(pos) : isSubIn ? "in" : "-";
        return {
          text,
          isSetter: hasPos && info.setterPos === pos,
          isStarter: hasPos
        };
      });
      const cells = [
        {
          text:
            scope === "opponent"
              ? formatNameWithNumberFor(name, analysisNumbers)
              : formatNameWithNumber(name),
          isPlayer: true,
          playerIdx: idx
        },
        ...startCells,
        { text: points.for || 0 },
        { text: points.against || 0 },
        { text: formatDelta((points.for || 0) - (points.against || 0)) },
        { text: personalErrors || 0 },
        ...(includeOpponentErrorsCol ? [{ text: opponentErrors > 0 ? opponentErrors : "-" }] : []),

        { text: totalFromCounts(serveCounts), className: "skill-col skill-serve" },
        { text: serveCounts["="] || 0, className: "skill-col skill-serve" },
        { text: servePointCount || 0, className: "skill-col skill-serve" },
        { text: serveMetrics.eff === null ? "-" : formatPercent(serveMetrics.eff), className: "skill-col skill-serve" },
        { text: serveMetrics.pos === null ? "-" : formatPercent(serveMetrics.pos), className: "skill-col skill-serve" },

        { text: totalFromCounts(passCounts), className: "skill-col skill-pass" },
        { text: passMetrics.negativeCount || 0, className: "skill-col skill-pass" },
        { text: passAces || 0, className: "skill-col skill-pass" },
        { text: passMetrics.pos === null ? "-" : formatPercent(passMetrics.pos), className: "skill-col skill-pass" },
        { text: passMetrics.prf === null ? "-" : formatPercent(passMetrics.prf), className: "skill-col skill-pass" },
        { text: passMetrics.eff === null ? "-" : formatPercent(passMetrics.eff), className: "skill-col skill-pass" },

        { text: totalFromCounts(freeballCounts), className: "skill-col skill-freeball" },
        { text: freeballMetrics.negativeCount || 0, className: "skill-col skill-freeball" },
        { text: freeballMetrics.pos === null ? "-" : formatPercent(freeballMetrics.pos), className: "skill-col skill-freeball" },
        { text: freeballMetrics.prf === null ? "-" : formatPercent(freeballMetrics.prf), className: "skill-col skill-freeball" },
        { text: freeballMetrics.eff === null ? "-" : formatPercent(freeballMetrics.eff), className: "skill-col skill-freeball" },

        { text: attackTotal, className: "skill-col skill-attack" },
        { text: attackCounts["="] || 0, className: "skill-col skill-attack" },
        { text: attackCounts["/"] || 0, className: "skill-col skill-attack" },
        { text: attackPointCount || 0, className: "skill-col skill-attack" },
        { text: formatPercentValue(attackPointCount || 0, attackTotal), className: "skill-col skill-attack" },
        { text: attackMetrics.eff === null ? "-" : formatPercent(attackMetrics.eff), className: "skill-col skill-attack" },

        { text: totalFromCounts(blockCounts), className: "skill-col skill-block" },
        { text: blockPointCount || 0, className: "skill-col skill-block" },

        { text: totalFromCounts(defenseCounts), className: "skill-col skill-defense" },
        { text: defenseMetrics.negativeCount || 0, className: "skill-col skill-defense" },
        { text: defenseMetrics.eff === null ? "-" : formatPercent(defenseMetrics.eff), className: "skill-col skill-defense" }
      ];
      cells.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell.text;
        if (cell.isStarter) td.classList.add("formation-starter-cell");
        if (cell.isSetter) td.classList.add("formation-setter-cell");
        if (cell.className) td.className = cell.className;
        if (cell.isPlayer) {
          td.classList.add("agg-player-cell");
          td.title = "Dettagli giocatrice";
          td.addEventListener("click", () => {
            if (showBothTeams) {
              analysisTeamFilterState.teams = new Set([scope]);
            }
            const prefs = ensurePlayerAnalysisState();
            prefs.playerIdx = cell.playerIdx;
            saveState();
            setActiveAggTab("player");
            renderPlayerAnalysis();
          });
        }
        row.appendChild(td);
      });
      elAggTableBody.appendChild(row);
    });
    const teamTotals = computeTeamTotalsForEvents(summaryEvents, scope);
    const teamOpponentErrors = includeOpponentErrorsCol ? computeOpponentErrorsTotal(summaryEvents) : 0;
    const serveTotalsMetrics = computeMetrics(totalsBySkill.serve, "serve");
    const passTotalsMetrics = computeMetrics(totalsBySkill.pass, "pass");
    const freeballTotalsMetrics = computeMetrics(totalsBySkill.freeball, "freeball");
    const attackTotalsMetrics = computeMetrics(totalsBySkill.attack, "attack");
    const blockTotalsMetrics = computeMetrics(totalsBySkill.block, "block");
    const defenseTotalsMetrics = computeMetrics(totalsBySkill.defense, "defense");
    const teamAttackTotal = totalFromCounts(totalsBySkill.attack);
    const teamServePointCount = countPointsForSkill(totalsBySkill.serve, "serve");
    const teamAttackPointCount = countPointsForSkill(totalsBySkill.attack, "attack");
    const teamBlockPointCount = countPointsForSkill(totalsBySkill.block, "block");
    const totalsRow = document.createElement("tr");
    totalsRow.className = "rotation-row total";
    const startTotalsCells = playedSets.map(() => ({ text: "-" }));
    const totalCells = [
      { text: "Totale squadra" },
      ...startTotalsCells,
      { text: teamTotals.totalFor || 0 },
      { text: teamTotals.totalAgainst || 0 },
      { text: formatDelta((teamTotals.totalFor || 0) - (teamTotals.totalAgainst || 0)) },
      { text: teamTotals.totalErrors || 0 },
      ...(includeOpponentErrorsCol ? [{ text: teamOpponentErrors || 0 }] : []),

      { text: totalFromCounts(totalsBySkill.serve), className: "skill-col skill-serve" },
      { text: totalsBySkill.serve["="] || 0, className: "skill-col skill-serve" },
      { text: teamServePointCount || 0, className: "skill-col skill-serve" },
      { text: serveTotalsMetrics.eff === null ? "-" : formatPercent(serveTotalsMetrics.eff), className: "skill-col skill-serve" },
      { text: serveTotalsMetrics.pos === null ? "-" : formatPercent(serveTotalsMetrics.pos), className: "skill-col skill-serve" },

      { text: totalFromCounts(totalsBySkill.pass), className: "skill-col skill-pass" },
      { text: passTotalsMetrics.negativeCount || 0, className: "skill-col skill-pass" },
      { text: totalPassAces || 0, className: "skill-col skill-pass" },
      { text: passTotalsMetrics.pos === null ? "-" : formatPercent(passTotalsMetrics.pos), className: "skill-col skill-pass" },
      { text: passTotalsMetrics.prf === null ? "-" : formatPercent(passTotalsMetrics.prf), className: "skill-col skill-pass" },
      { text: passTotalsMetrics.eff === null ? "-" : formatPercent(passTotalsMetrics.eff), className: "skill-col skill-pass" },

      { text: totalFromCounts(totalsBySkill.freeball), className: "skill-col skill-freeball" },
      { text: freeballTotalsMetrics.negativeCount || 0, className: "skill-col skill-freeball" },
      { text: freeballTotalsMetrics.pos === null ? "-" : formatPercent(freeballTotalsMetrics.pos), className: "skill-col skill-freeball" },
      { text: freeballTotalsMetrics.prf === null ? "-" : formatPercent(freeballTotalsMetrics.prf), className: "skill-col skill-freeball" },
      { text: freeballTotalsMetrics.eff === null ? "-" : formatPercent(freeballTotalsMetrics.eff), className: "skill-col skill-freeball" },

      { text: teamAttackTotal, className: "skill-col skill-attack" },
      { text: totalsBySkill.attack["="] || 0, className: "skill-col skill-attack" },
      { text: totalsBySkill.attack["/"] || 0, className: "skill-col skill-attack" },
      { text: teamAttackPointCount || 0, className: "skill-col skill-attack" },
      { text: formatPercentValue(teamAttackPointCount || 0, teamAttackTotal), className: "skill-col skill-attack" },
      { text: attackTotalsMetrics.eff === null ? "-" : formatPercent(attackTotalsMetrics.eff), className: "skill-col skill-attack" },

      { text: totalFromCounts(totalsBySkill.block), className: "skill-col skill-block" },
      { text: teamBlockPointCount || 0, className: "skill-col skill-block" },

      { text: totalFromCounts(totalsBySkill.defense), className: "skill-col skill-defense" },
      { text: defenseTotalsMetrics.negativeCount || 0, className: "skill-col skill-defense" },
      { text: defenseTotalsMetrics.eff === null ? "-" : formatPercent(defenseTotalsMetrics.eff), className: "skill-col skill-defense" }
    ];
    totalCells.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell.text;
      if (cell.className) td.className = cell.className;
      totalsRow.appendChild(td);
    });
    elAggTableBody.appendChild(totalsRow);
    playedSets.forEach(setNum => {
      const setEvents = summaryEvents.filter(ev => normalizeSetNumber(ev.set) === setNum);
      const setTotals = computeTeamTotalsForEvents(setEvents, scope);
      const setOpponentErrors = includeOpponentErrorsCol ? computeOpponentErrorsTotal(setEvents) : 0;
      const setServeMetrics = computeMetrics(setTotals.totalsBySkill.serve, "serve");
      const setPassMetrics = computeMetrics(setTotals.totalsBySkill.pass, "pass");
      const setFreeballMetrics = computeMetrics(setTotals.totalsBySkill.freeball, "freeball");
      const setAttackMetrics = computeMetrics(setTotals.totalsBySkill.attack, "attack");
      const setDefenseMetrics = computeMetrics(setTotals.totalsBySkill.defense, "defense");
      const setAttackTotal = totalFromCounts(setTotals.totalsBySkill.attack);
      const setServePointCount = countPointsForSkill(setTotals.totalsBySkill.serve, "serve");
      const setAttackPointCount = countPointsForSkill(setTotals.totalsBySkill.attack, "attack");
      const setBlockPointCount = countPointsForSkill(setTotals.totalsBySkill.block, "block");
      const setRow = document.createElement("tr");
      const setPassAcesMap = computePlayerPassAceMap(setEvents, scope);
      let setPassAces = 0;
      Object.values(setPassAcesMap || {}).forEach(val => {
        setPassAces += val || 0;
      });
      setRow.className = "rotation-row";
      const setStartCells = playedSets.map(() => ({ text: "-" }));
      const setCells = [
        { text: "Set " + setNum },
        ...setStartCells,
        { text: setTotals.totalFor || 0 },
        { text: setTotals.totalAgainst || 0 },
        { text: formatDelta((setTotals.totalFor || 0) - (setTotals.totalAgainst || 0)) },
        { text: setTotals.totalErrors || 0 },
        ...(includeOpponentErrorsCol ? [{ text: setOpponentErrors || 0 }] : []),

        { text: totalFromCounts(setTotals.totalsBySkill.serve), className: "skill-col skill-serve" },
        { text: setTotals.totalsBySkill.serve["="] || 0, className: "skill-col skill-serve" },
        { text: setServePointCount || 0, className: "skill-col skill-serve" },
        { text: setServeMetrics.eff === null ? "-" : formatPercent(setServeMetrics.eff), className: "skill-col skill-serve" },
        { text: setServeMetrics.pos === null ? "-" : formatPercent(setServeMetrics.pos), className: "skill-col skill-serve" },

        { text: totalFromCounts(setTotals.totalsBySkill.pass), className: "skill-col skill-pass" },
        { text: setPassMetrics.negativeCount || 0, className: "skill-col skill-pass" },
        { text: setPassAces || 0, className: "skill-col skill-pass" },
        { text: setPassMetrics.pos === null ? "-" : formatPercent(setPassMetrics.pos), className: "skill-col skill-pass" },
        { text: setPassMetrics.prf === null ? "-" : formatPercent(setPassMetrics.prf), className: "skill-col skill-pass" },
        { text: setPassMetrics.eff === null ? "-" : formatPercent(setPassMetrics.eff), className: "skill-col skill-pass" },

        { text: totalFromCounts(setTotals.totalsBySkill.freeball), className: "skill-col skill-freeball" },
        { text: setFreeballMetrics.negativeCount || 0, className: "skill-col skill-freeball" },
        { text: setFreeballMetrics.pos === null ? "-" : formatPercent(setFreeballMetrics.pos), className: "skill-col skill-freeball" },
        { text: setFreeballMetrics.prf === null ? "-" : formatPercent(setFreeballMetrics.prf), className: "skill-col skill-freeball" },
        { text: setFreeballMetrics.eff === null ? "-" : formatPercent(setFreeballMetrics.eff), className: "skill-col skill-freeball" },

        { text: setAttackTotal, className: "skill-col skill-attack" },
        { text: setTotals.totalsBySkill.attack["="] || 0, className: "skill-col skill-attack" },
        { text: setTotals.totalsBySkill.attack["/"] || 0, className: "skill-col skill-attack" },
        { text: setAttackPointCount || 0, className: "skill-col skill-attack" },
        { text: formatPercentValue(setAttackPointCount || 0, setAttackTotal), className: "skill-col skill-attack" },
        { text: setAttackMetrics.eff === null ? "-" : formatPercent(setAttackMetrics.eff), className: "skill-col skill-attack" },

        { text: totalFromCounts(setTotals.totalsBySkill.block), className: "skill-col skill-block" },
        { text: setBlockPointCount || 0, className: "skill-col skill-block" },

        { text: totalFromCounts(setTotals.totalsBySkill.defense), className: "skill-col skill-defense" },
        { text: setDefenseMetrics.negativeCount || 0, className: "skill-col skill-defense" },
        { text: setDefenseMetrics.eff === null ? "-" : formatPercent(setDefenseMetrics.eff), className: "skill-col skill-defense" }
      ];
      setCells.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell.text;
        if (cell.className) td.className = cell.className;
        setRow.appendChild(td);
      });
      elAggTableBody.appendChild(setRow);
    });
  };
  if (showBothTeams) {
    renderAggSummaryForScope("our", { showHeader: true });
    renderAggSummaryForScope("opponent", { showHeader: true });
    renderSummaryExtraTable(["our", "opponent"]);
    renderScoreAndRotations(summaryAll, "our", { events: analysisEvents });
    renderSecondTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    bindAggSummaryInteractions(thead);
    applyAggColumnsVisibility();
    return;
  }
  const analysisPlayers = getPlayersForScope(analysisScope);
  if (!analysisPlayers || analysisPlayers.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = summaryColCount;
    td.textContent = "Aggiungi giocatrici per vedere il riepilogo.";
    tr.appendChild(td);
    elAggTableBody.appendChild(tr);
    renderScoreAndRotations(summaryAll, analysisScope, { events: analysisEvents });
    renderSecondTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    applyAggColumnsVisibility();
    return;
  }
  renderAggSummaryForScope(analysisScope);
  renderSummaryExtraTable([analysisScope]);
  renderScoreAndRotations(summaryAll, analysisScope, { events: analysisEvents });
  renderSecondTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  bindAggSummaryInteractions(thead);
  applyAggColumnsVisibility();
}
