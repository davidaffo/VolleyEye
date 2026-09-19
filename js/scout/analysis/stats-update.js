function emptyCounts() {
  return { "#": 0, "+": 0, "!": 0, "-": 0, "=": 0, "/": 0 };
}
function totalFromCounts(counts) {
  const safeCounts = normalizeCounts(counts);
  return RESULT_CODES.reduce((sum, code) => sum + (safeCounts[code] || 0), 0);
}
function mergeCounts(target, source) {
  const safeTarget = target || emptyCounts();
  const safeSource = normalizeCounts(source);
  RESULT_CODES.forEach(code => {
    safeTarget[code] = (safeTarget[code] || 0) + (safeSource[code] || 0);
  });
  return safeTarget;
}
function getCurrentZoneForPlayer(playerIdx, forSkillId = null, scope = "our") {
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players || !players[playerIdx]) return null;
  const name = players[playerIdx];
  const getZoneFromCourt = court => {
    if (!court || !Array.isArray(court)) return null;
    const slotIdx = court.findIndex(
      slot => slot && (slot.main === name || slot.replaced === name)
    );
    if (slotIdx === -1) return null;
    return slotIdx + 1;
  };
  if (state.autoRolePositioning && forSkillId) {
    const displayCourt = getAutoRoleDisplayCourt(forSkillId, scope);
    const displayIdx = displayCourt.findIndex(
      item => item && item.slot && (item.slot.main === name || item.slot.replaced === name)
    );
    if (displayIdx !== -1) return displayIdx + 1;
  }
  const baseCourt = scope === "opponent" ? state.opponentCourt : state.court;
  return getZoneFromCourt(baseCourt);
}
function normalizeCounts(raw) {
  return Object.assign(emptyCounts(), raw || {});
}
function formatPercentValue(numerator, denominator) {
  if (!denominator) return "-";
  return formatPercent((numerator / denominator) * 100);
}
function formatPercent(x) {
  if (x === null || x === undefined || isNaN(x)) return "-";
  return x.toFixed(0) + "%";
}
function updateSkillStatsUI(playerIdx, skillId) {
  if (!elPlayersContainer) return;
  const row = elPlayersContainer.querySelector(
    '.skill-row[data-player-idx="' +
      playerIdx +
      '"][data-skill-id="' +
      skillId +
      '"]'
  );
  if (!row) return;
  const counts =
    (state.stats[playerIdx] && state.stats[playerIdx][skillId]) || {
      "#": 0,
      "+": 0,
      "!": 0,
      "-": 0,
      "=": 0,
      "/": 0
    };
  const metrics = computeMetrics(counts, skillId);
  const countsSpan = row.querySelector(".skill-counts");
  if (countsSpan) {
    countsSpan.textContent =
      "#:" +
      counts["#"] +
      " +:" +
      counts["+"] +
      " !:" +
      counts["!"] +
      " -:" +
      counts["-"] +
      " =:" +
      counts["="] +
      " /:" +
      counts["/"];
  }
  const statsDiv = row.querySelector(".skill-stats");
  if (!statsDiv) return;
  let text = "Tot: " + metrics.total;
  if (metrics.prf !== null) {
    text += " | Prf: " + formatPercent(metrics.prf);
  }
  if (metrics.pos !== null) {
    text += " | Pos: " + formatPercent(metrics.pos);
  }
  if (metrics.eff !== null) {
    text += " | Eff: " + formatPercent(metrics.eff);
  }
  statsDiv.textContent = text;
}
function recalcAllStatsAndUpdateUI() {
  analysisEventsCache = null;
  analysisEventsCacheKey = "";
  analysisEventsCacheRevision += 1;
  invalidateSkillChartCaches();
  initStats();
  state.events.forEach(ev => {
    const idx = ev.playerIdx;
    if (ev && ev.team === "opponent") {
      return;
    }
    if (ev.skillId === "manual" || ev.actionType === "timeout" || ev.actionType === "substitution") {
      return;
    }
    if (idx === null || idx === undefined || idx < 0 || !state.players[idx]) {
      return;
    }
    if (!state.stats[idx]) {
      state.stats[idx] = {};
    }
    if (!state.stats[idx][ev.skillId]) {
      state.stats[idx][ev.skillId] = {
        "#": 0,
        "+": 0,
        "!": 0,
        "-": 0,
        "=": 0,
        "/": 0
      };
    }
    state.stats[idx][ev.skillId][ev.code] =
      (state.stats[idx][ev.skillId][ev.code] || 0) + 1;
  });
  state.players.forEach((_, idx) => {
    SKILLS.forEach(skill => {
      updateSkillStatsUI(idx, skill.id);
    });
  });
  renderLiveScore();
  renderAggregatedTable();
  if (activeAggTab === "player") {
    renderPlayerAnalysis();
  }
  renderVideoAnalysis();
}
