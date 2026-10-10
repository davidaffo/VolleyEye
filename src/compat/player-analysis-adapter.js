function buildReactPlayerAnalysisSnapshots() {
  const idx = getPlayerAnalysisPlayerIdx();
  const compareIdx = getPlayerAnalysisCompareIdx();
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const prefs = ensurePlayerAnalysisState();
  const filteredEvents = filterEventsByAnalysisTeam().filter((ev) =>
    matchesSummarySetFilter(ev),
  );
  const statsByPlayer = computeStatsByPlayerForEvents(filteredEvents, players);
  if (idx === null || !players || !players[idx]) {
    return { primary: null, compare: null };
  }
  const playerPoints = computePlayerPointsMap(filteredEvents, analysisScope);
  const playerErrors = computePlayerErrorsMap(filteredEvents);
  const playerPassAces = computePlayerPassAceMap(filteredEvents, analysisScope);
  const buildPlayerSnapshot = (playerIdx) => {
    const name = players[playerIdx];
    const serveCounts = normalizeCounts(
      statsByPlayer[playerIdx] && statsByPlayer[playerIdx].serve,
    );
    const passCounts = normalizeCounts(
      statsByPlayer[playerIdx] && statsByPlayer[playerIdx].pass,
    );
    const freeballCounts = normalizeCounts(
      statsByPlayer[playerIdx] && statsByPlayer[playerIdx].freeball,
    );
    const attackCounts = normalizeCounts(
      statsByPlayer[playerIdx] && statsByPlayer[playerIdx].attack,
    );
    const blockCounts = normalizeCounts(
      statsByPlayer[playerIdx] && statsByPlayer[playerIdx].block,
    );
    const defenseCounts = normalizeCounts(
      statsByPlayer[playerIdx] && statsByPlayer[playerIdx].defense,
    );
    const serveMetrics = computeMetrics(serveCounts, "serve");
    const passMetrics = computeMetrics(passCounts, "pass");
    const freeballMetrics = computeMetrics(freeballCounts, "freeball");
    const attackMetrics = computeMetrics(attackCounts, "attack");
    const defenseMetrics = computeMetrics(defenseCounts, "defense");
    const points = playerPoints[playerIdx] || { for: 0, against: 0 };
    const personalErrors = playerErrors[playerIdx] || 0;
    const passAces = playerPassAces[playerIdx] || 0;
    const attackTotal = totalFromCounts(attackCounts);
    const servePointCount = countPointsForSkill(serveCounts, "serve");
    const attackPointCount = countPointsForSkill(attackCounts, "attack");
    const blockPointCount = countPointsForSkill(blockCounts, "block");
    return {
      playerIdx,
      photo: getPlayerPhotoForScope(analysisScope, name),
      name:
        analysisScope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name),
      metrics: [
        {
          title: "Punti",
          entries: [
            {
              label: "Fatti",
              text: String(points.for || 0),
              value: points.for || 0,
              better: "higher",
            },
            {
              label: "Subiti",
              text: String(points.against || 0),
              value: points.against || 0,
              better: "lower",
            },
            {
              label: "Delta",
              text: formatDelta((points.for || 0) - (points.against || 0)),
              value: (points.for || 0) - (points.against || 0),
              better: "higher",
            },
            {
              label: "Falli/Errori",
              text: String(personalErrors || 0),
              value: personalErrors || 0,
              better: "lower",
            },
          ],
        },
        {
          title: "Battuta",
          entries: [
            {
              label: "Tot",
              text: String(totalFromCounts(serveCounts)),
              value: totalFromCounts(serveCounts),
              better: "neutral",
            },
            {
              label: "Err",
              text: String(serveCounts["="] || 0),
              value: serveCounts["="] || 0,
              better: "lower",
            },
            {
              label: "Punti",
              text: String(servePointCount || 0),
              value: servePointCount || 0,
              better: "higher",
            },
            {
              label: "Eff",
              text:
                serveMetrics.eff === null
                  ? "-"
                  : formatPercent(serveMetrics.eff),
              value: serveMetrics.eff,
              better: "higher",
            },
            {
              label: "Pos",
              text:
                serveMetrics.pos === null
                  ? "-"
                  : formatPercent(serveMetrics.pos),
              value: serveMetrics.pos,
              better: "higher",
            },
          ],
        },
        {
          title: "Ricezione",
          entries: [
            {
              label: "Tot",
              text: String(totalFromCounts(passCounts)),
              value: totalFromCounts(passCounts),
              better: "neutral",
            },
            {
              label: "Err",
              text: String(passMetrics.negativeCount || 0),
              value: passMetrics.negativeCount || 0,
              better: "lower",
            },
            {
              label: "Ace",
              text: String(passAces || 0),
              value: passAces || 0,
              better: "lower",
            },
            {
              label: "Pos",
              text:
                passMetrics.pos === null ? "-" : formatPercent(passMetrics.pos),
              value: passMetrics.pos,
              better: "higher",
            },
            {
              label: "Prf",
              text:
                passMetrics.prf === null ? "-" : formatPercent(passMetrics.prf),
              value: passMetrics.prf,
              better: "higher",
            },
            {
              label: "Eff",
              text:
                passMetrics.eff === null ? "-" : formatPercent(passMetrics.eff),
              value: passMetrics.eff,
              better: "higher",
            },
          ],
        },
        {
          title: "Freeball",
          entries: [
            {
              label: "Tot",
              text: String(totalFromCounts(freeballCounts)),
              value: totalFromCounts(freeballCounts),
              better: "neutral",
            },
            {
              label: "Err",
              text: String(freeballMetrics.negativeCount || 0),
              value: freeballMetrics.negativeCount || 0,
              better: "lower",
            },
            {
              label: "Pos",
              text:
                freeballMetrics.pos === null
                  ? "-"
                  : formatPercent(freeballMetrics.pos),
              value: freeballMetrics.pos,
              better: "higher",
            },
            {
              label: "Prf",
              text:
                freeballMetrics.prf === null
                  ? "-"
                  : formatPercent(freeballMetrics.prf),
              value: freeballMetrics.prf,
              better: "higher",
            },
            {
              label: "Eff",
              text:
                freeballMetrics.eff === null
                  ? "-"
                  : formatPercent(freeballMetrics.eff),
              value: freeballMetrics.eff,
              better: "higher",
            },
          ],
        },
        {
          title: "Attacco",
          entries: [
            {
              label: "Tot",
              text: String(attackTotal),
              value: attackTotal,
              better: "neutral",
            },
            {
              label: "Err",
              text: String(attackCounts["="] || 0),
              value: attackCounts["="] || 0,
              better: "lower",
            },
            {
              label: "Mur",
              text: String(attackCounts["/"] || 0),
              value: attackCounts["/"] || 0,
              better: "lower",
            },
            {
              label: "Punti",
              text: String(attackPointCount || 0),
              value: attackPointCount || 0,
              better: "higher",
            },
            {
              label: "% Punti",
              text: formatPercentValue(attackPointCount || 0, attackTotal),
              value:
                attackTotal > 0 ? (attackPointCount || 0) / attackTotal : null,
              better: "higher",
            },
            {
              label: "Eff",
              text:
                attackMetrics.eff === null
                  ? "-"
                  : formatPercent(attackMetrics.eff),
              value: attackMetrics.eff,
              better: "higher",
            },
          ],
        },
        {
          title: "Muro",
          entries: [
            {
              label: "Tot",
              text: String(totalFromCounts(blockCounts)),
              value: totalFromCounts(blockCounts),
              better: "neutral",
            },
            {
              label: "Punti",
              text: String(blockPointCount || 0),
              value: blockPointCount || 0,
              better: "higher",
            },
          ],
        },
        {
          title: "Difesa",
          entries: [
            {
              label: "Tot",
              text: String(totalFromCounts(defenseCounts)),
              value: totalFromCounts(defenseCounts),
              better: "neutral",
            },
            {
              label: "Err",
              text: String(defenseMetrics.negativeCount || 0),
              value: defenseMetrics.negativeCount || 0,
              better: "lower",
            },
            {
              label: "Eff",
              text:
                defenseMetrics.eff === null
                  ? "-"
                  : formatPercent(defenseMetrics.eff),
              value: defenseMetrics.eff,
              better: "higher",
            },
          ],
        },
      ],
    };
  };
  return {
    primary: buildPlayerSnapshot(idx),
    compare:
      prefs.compareEnabled && compareIdx !== null && players[compareIdx]
        ? buildPlayerSnapshot(compareIdx)
        : null,
  };
}

function changeReactPlayerAnalysis(field, value) {
  const prefs = ensurePlayerAnalysisState();
  if (field === "playerIdx" || field === "comparePlayerIdx") {
    const index = parseInt(value, 10);
    prefs[field] = isNaN(index) ? null : index;
    if (
      field === "playerIdx" &&
      prefs.compareEnabled &&
      prefs.comparePlayerIdx === prefs.playerIdx
    )
      prefs.comparePlayerIdx = null;
  } else if (field === "compareEnabled") {
    prefs.compareEnabled = !!value;
    if (prefs.compareEnabled) getPlayerAnalysisCompareIdx();
    else prefs.comparePlayerIdx = null;
  } else if (["showAttack", "showServe", "showSecond"].includes(field))
    prefs[field] = !!value;
  saveState();
  renderPlayerAnalysis();
}
function publishReactPlayerAnalysis() {
  renderAnalysisTeamFilter();
  const prefs = ensurePlayerAnalysisState(),
    scope = getAnalysisTeamScope(),
    players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    entries = (
      scope === "opponent"
        ? getSortedPlayerEntriesForScope(scope)
        : getSortedPlayerEntries()
    ).map(({ name, idx }) => ({
      idx,
      label:
        (scope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name)) ||
        name ||
        "Giocatrice " + (idx + 1),
    })),
    idx = getPlayerAnalysisPlayerIdx(),
    compareIdx = getPlayerAnalysisCompareIdx(),
    snapshots = buildReactPlayerAnalysisSnapshots();
  if (elPlayerAnalysisCourtSide)
    renderAnalysisCourtSideRadios(
      elPlayerAnalysisCourtSide,
      getAnalysisCourtSide(prefs.courtSideByScope[scope]),
      () => {
        prefs.courtSideByScope[getAnalysisTeamScope()] = getAnalysisCourtSide(
          getCheckedRadioValue(elPlayerAnalysisCourtSide),
        );
        saveState();
        renderPlayerAnalysis();
      },
      "analysis-player-court-side",
    );
  playerAnalysisStore.publish({
    ...snapshots,
    entries,
    compareEntries: entries.filter((entry) => entry.idx !== idx),
    preferences: { ...prefs },
    playerIdx: idx === null ? "" : String(idx),
    compareIdx: compareIdx === null ? "" : String(compareIdx),
    scope,
  });
  if (elPlayerAnalysisCompareFilter)
    elPlayerAnalysisCompareFilter.classList.toggle(
      "hidden",
      !prefs.compareEnabled || players.length < 2,
    );
  if (elPlayerAnalysisTableWrap)
    elPlayerAnalysisTableWrap.classList.toggle("hidden", !!snapshots.compare);
  document
    .querySelector(".player-analysis-columns")
    ?.classList.toggle("hidden", !!snapshots.compare);
  document
    .querySelector(".player-skill-charts-panel")
    ?.classList.toggle("hidden", !!snapshots.compare);
  updatePlayerAnalysisVisibility();
  if (snapshots.compare) return;
  renderPlayerAnalysisSkillCharts();
  if (prefs.showAttack) renderPlayerTrajectoryAnalysis();
  if (prefs.showServe) renderPlayerServeTrajectoryAnalysis();
  if (prefs.showSecond) renderPlayerSecondTable();
}
function refreshReactCompareSections(index, other, nodes) {
  if (nodes.attackSummary)
    publishReactAttackSummary(
      nodes.attackSummary,
      getFilteredPlayerAttackSummaryEventsForPlayer(index),
      getFilteredPlayerAttackSummaryEventsForPlayer(other),
    );
  if (nodes.attackGrid) publishReactPlayerAttackGrid(nodes.attackGrid, index);
  if (nodes.serveGrid) publishReactPlayerServeGrid(nodes.serveGrid, index);
  if (nodes.secondBody)
    publishReactPlayerSecondTable(
      nodes.secondBody,
      nodes.distribution,
      index,
      nodes.attackBody,
      other,
    );
  if (nodes.charts) {
    skillChartToneColorCache = null;
    const scope = getAnalysisTeamScope(),
      players = getPlayersForScope(scope),
      numbers = getPlayerNumbersForScope(scope),
      metricId = ensureSkillChartsUiState().playerMetric || "eff",
      label =
        scope === "opponent"
          ? formatNameWithNumberFor(players[index], numbers)
          : formatNameWithNumber(players[index]),
      base = `analysis-player|${getSkillChartFiltersCacheToken(scope)}|player:${index}|metric:${metricId}`;
    analysisTableStore.publish(nodes.charts.id, {
      charts: SKILLS.map((skill) => {
        const events = buildAnalysisSkillChartEvents({
          scope,
          skillId: skill.id,
          playerIdx: index,
        });
        return buildReactSkillChartModel({
          title: getSkillLabel(skill.id),
          subtitle: `${label} · ${events.length} eventi`,
          events,
          skillId: skill.id,
          metricId,
          seriesCacheKey: `${base}|${skill.id}`,
        });
      }),
    });
  }
}
