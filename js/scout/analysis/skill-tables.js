function countPointsForSkill(counts, skillId) {
  ensurePointRulesDefaults();
  const cfg = normalizePointRule(skillId, state.pointRules && state.pointRules[skillId]);
  const pointCodes = (cfg && cfg.for) || [];
  return pointCodes.reduce((sum, code) => sum + (counts[code] || 0), 0);
}
function getSkillLabel(skillId) {
  const skill = SKILLS.find(s => s.id === skillId);
  return (skill && skill.label) || skillId || "Fondamentale";
}
function getErrorTypeLabel(typeId) {
  const item = ERROR_TYPES.find(t => t.id === typeId);
  return (item && item.label) || "Generico";
}
function setSelectedErrorType(typeId, container) {
  selectedErrorType = typeId || "Generic";
  if (!container) return;
  const buttons = container.querySelectorAll("[data-error-type]");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.errorType === selectedErrorType);
  });
}
function ensurePlayerAnalysisState() {
  if (!state.uiPlayerAnalysis || typeof state.uiPlayerAnalysis !== "object") {
    state.uiPlayerAnalysis = {
      playerIdx: null,
      compareEnabled: false,
      comparePlayerIdx: null,
      showAttack: true,
      showServe: true,
      showSecond: false,
      courtSideByScope: { our: "near", opponent: "far" }
    };
  }
  const prefs = state.uiPlayerAnalysis;
  prefs.showAttack = prefs.showAttack !== false;
  prefs.showServe = prefs.showServe !== false;
  prefs.showSecond = prefs.showSecond === true;
  if (!prefs.courtSideByScope || typeof prefs.courtSideByScope !== "object") {
    const fallback = typeof prefs.courtSide === "string" ? prefs.courtSide : "near";
    prefs.courtSideByScope = { our: getAnalysisCourtSide(fallback), opponent: "far" };
  } else {
    prefs.courtSideByScope = Object.assign({ our: "near", opponent: "far" }, prefs.courtSideByScope);
    prefs.courtSideByScope.our = getAnalysisCourtSide(prefs.courtSideByScope.our);
    prefs.courtSideByScope.opponent = getAnalysisCourtSide(prefs.courtSideByScope.opponent);
  }
  if (typeof prefs.playerIdx !== "number") {
    prefs.playerIdx = null;
  }
  prefs.compareEnabled = prefs.compareEnabled === true;
  if (typeof prefs.comparePlayerIdx !== "number") {
    prefs.comparePlayerIdx = null;
  }
  return prefs;
}
function getPlayerAnalysisPlayerIdx() {
  const prefs = ensurePlayerAnalysisState();
  const players = getPlayersForScope(getAnalysisTeamScope());
  if (!players.length) {
    prefs.playerIdx = null;
    return null;
  }
  if (typeof prefs.playerIdx !== "number" || prefs.playerIdx < 0 || prefs.playerIdx >= players.length) {
    prefs.playerIdx = 0;
  }
  return prefs.playerIdx;
}
function getPlayerAnalysisCompareIdx() {
  const prefs = ensurePlayerAnalysisState();
  const players = getPlayersForScope(getAnalysisTeamScope());
  if (!prefs.compareEnabled || !players.length) {
    prefs.comparePlayerIdx = null;
    return null;
  }
  const primaryIdx = getPlayerAnalysisPlayerIdx();
  const isInvalid =
    typeof prefs.comparePlayerIdx !== "number" ||
    prefs.comparePlayerIdx < 0 ||
    prefs.comparePlayerIdx >= players.length ||
    prefs.comparePlayerIdx === primaryIdx;
  if (isInvalid) {
    const fallbackIdx = players.findIndex((_name, idx) => idx !== primaryIdx);
    prefs.comparePlayerIdx = fallbackIdx >= 0 ? fallbackIdx : null;
  }
  return prefs.comparePlayerIdx;
}
function getAggTableElements() {
  const table = elAggTableBody ? elAggTableBody.closest("table") : null;
  const thead = table ? table.querySelector("thead") : null;
  return { table, thead };
}
function ensureAggTableHeadCache(thead) {
  if (!thead || aggTableHeadCache !== null) return;
  aggTableHeadCache = thead.innerHTML;
}
function resetAggTableView() {
  aggTableView = { mode: "summary", skillId: null, playerIdx: null };
}
function getSkillIdFromHeader(th) {
  if (!th || !th.classList) return null;
  if (th.classList.contains("skill-serve")) return "serve";
  if (th.classList.contains("skill-pass")) return "pass";
  if (th.classList.contains("skill-freeball")) return "freeball";
  if (th.classList.contains("skill-attack")) return "attack";
  if (th.classList.contains("skill-block")) return "block";
  if (th.classList.contains("skill-defense")) return "defense";
  return null;
}
function renderAggDetailHeader(thead, columns) {
  if (!thead) return;
  thead.innerHTML = "";
  const tr = document.createElement("tr");
  columns.forEach((col, idx) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    if (col.className) th.className = col.className;
    if (col.onClick) {
      th.classList.add("agg-table-back");
      th.addEventListener("click", col.onClick);
    }
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}
function ensureSetStartSnapshot(setNum) {
  const targetSet = parseInt(setNum, 10) || state.currentSet || 1;
  state.setStarts = state.setStarts || {};
  if (state.setStarts[targetSet]) return;
  const ourCourt =
    typeof removeLiberosAndRestoreForScope === "function"
      ? removeLiberosAndRestoreForScope(state.court || [], "our")
      : cloneCourt(state.court || []);
  const oppCourt =
    typeof removeLiberosAndRestoreForScope === "function"
      ? removeLiberosAndRestoreForScope(state.opponentCourt || [], "opponent")
      : cloneCourt(state.opponentCourt || []);
  state.setStarts[targetSet] = {
    our: { court: cloneCourt(ourCourt || []), rotation: state.rotation || 1 },
    opponent: { court: cloneCourt(oppCourt || []), rotation: state.opponentRotation || 1 },
    swapCourt: !!state.courtSideSwapped,
    isServing: !!state.isServing
  };
}
function getPlayedSetNumbers() {
  const setNums = new Set();
  (state.events || []).forEach(ev => {
    const num = parseInt(ev && ev.set, 10);
    if (num) setNums.add(num);
  });
  return Array.from(setNums).sort((a, b) => a - b);
}
function getSetStartEntryForScope(setNum, scope) {
  const entry = state.setStarts && state.setStarts[setNum];
  if (entry) {
    const data = scope === "opponent" ? entry.opponent : entry.our;
    if (data && Array.isArray(data.court)) {
      return { court: data.court, rotation: typeof data.rotation === "number" ? data.rotation : 1 };
    }
  }
  if (setNum === 1) {
    const fallback = getDefaultSetStartForScope(scope);
    if (fallback) return fallback;
  }
  return null;
}
function makePlayerNameKey(name) {
  return String(name || "").trim().toLowerCase();
}
function buildSetStartInfoList(setNumbers, scope) {
  const substitutionsBySet = new Map();
  (setNumbers || []).forEach(num => substitutionsBySet.set(num, new Set()));
  (state.events || []).forEach(ev => {
    if (!ev || ev.actionType !== "substitution") return;
    const setNum = parseInt(ev.set, 10) || 1;
    if (!substitutionsBySet.has(setNum)) return;
    if (getTeamScopeFromEvent(ev) !== scope) return;
    const playerIn = makePlayerNameKey(ev.playerIn || "");
    if (playerIn) substitutionsBySet.get(setNum).add(playerIn);
  });
  return (setNumbers || []).map(setNum => {
    const entry = getSetStartEntryForScope(setNum, scope);
    const fullEntry = state.setStarts && state.setStarts[setNum];
    const scopeEntry = fullEntry
      ? scope === "opponent"
        ? fullEntry.opponent
        : fullEntry.our
      : null;
    const positions = new Map();
    if (entry && Array.isArray(entry.court)) {
      entry.court.forEach((slot, idx) => {
        const name = typeof slot === "string" ? slot : slot && typeof slot === "object" ? slot.main || "" : "";
        const key = makePlayerNameKey(name);
        if (!key) return;
        positions.set(key, idx + 1);
      });
    }
    const rotation = entry && typeof entry.rotation === "number" ? entry.rotation : 1;
    let setterPos = null;
    if (typeof getRoleLabelForRotation === "function") {
      for (let pos = 1; pos <= 6; pos += 1) {
        if (String(getRoleLabelForRotation(pos, rotation)).toUpperCase() === "P") {
          setterPos = pos;
          break;
        }
      }
    }
    const subsIn = new Set(substitutionsBySet.get(setNum) || []);
    if (scopeEntry && Array.isArray(scopeEntry.subsIn)) {
      scopeEntry.subsIn.forEach(key => {
        if (!key) return;
        subsIn.add(String(key));
      });
    }
    return { setNum, positions, setterPos, subsIn };
  });
}
function renderAggSummaryHeader(thead, setNumbers, options = {}) {
  if (!thead) return;
  const includeOpponentErrors = !!options.includeOpponentErrors;
  thead.innerHTML = "";
  const rowTop = document.createElement("tr");
  const rowBottom = document.createElement("tr");
  const addCell = (row, label, { colspan, rowspan, className } = {}) => {
    const th = document.createElement("th");
    th.textContent = label;
    if (colspan) th.setAttribute("colspan", colspan);
    if (rowspan) th.setAttribute("rowspan", rowspan);
    if (className) th.className = className;
    row.appendChild(th);
  };
  addCell(rowTop, "Atleta", { rowspan: 2 });
  if (setNumbers && setNumbers.length) {
    addCell(rowTop, "Formazione di partenza", { colspan: setNumbers.length });
    setNumbers.forEach(num => {
      const th = document.createElement("th");
      th.textContent = "S" + num;
      th.className = "set-start-header";
      th.dataset.setNum = String(num);
      th.addEventListener("click", () => {
        const scope =
          analysisTeamFilterState.teams && analysisTeamFilterState.teams.has("opponent")
            ? "opponent"
            : "our";
        openSetStartEditor(num, scope);
      });
      rowBottom.appendChild(th);
    });
  }
  addCell(rowTop, "Punti", { colspan: includeOpponentErrors ? 5 : 4 });
  addCell(rowTop, "Battuta", { colspan: 5, className: "skill-col skill-serve" });
  addCell(rowTop, "Ricezione", { colspan: 6, className: "skill-col skill-pass" });
  addCell(rowTop, "Freeball", { colspan: 5, className: "skill-col skill-freeball" });
  addCell(rowTop, "Attacco", { colspan: 6, className: "skill-col skill-attack" });
  addCell(rowTop, "Muro", { colspan: 2, className: "skill-col skill-block" });
  addCell(rowTop, "Difesa", { colspan: 3, className: "skill-col skill-defense" });

  addCell(rowBottom, "Fatti");
  addCell(rowBottom, "Subiti");
  addCell(rowBottom, "Δ");
  addCell(rowBottom, "Falli/Errori");
  if (includeOpponentErrors) {
    addCell(rowBottom, "Errori avv.");
  }

  addCell(rowBottom, "Tot", { className: "skill-col skill-serve" });
  addCell(rowBottom, "Err", { className: "skill-col skill-serve" });
  addCell(rowBottom, "Punti", { className: "skill-col skill-serve" });
  addCell(rowBottom, "Eff", { className: "skill-col skill-serve" });
  addCell(rowBottom, "Pos", { className: "skill-col skill-serve" });

  addCell(rowBottom, "Tot", { className: "skill-col skill-pass" });
  addCell(rowBottom, "Err", { className: "skill-col skill-pass" });
  addCell(rowBottom, "Ace", { className: "skill-col skill-pass" });
  addCell(rowBottom, "Pos", { className: "skill-col skill-pass" });
  addCell(rowBottom, "Prf", { className: "skill-col skill-pass" });
  addCell(rowBottom, "Eff", { className: "skill-col skill-pass" });

  addCell(rowBottom, "Tot", { className: "skill-col skill-freeball" });
  addCell(rowBottom, "Err", { className: "skill-col skill-freeball" });
  addCell(rowBottom, "Pos", { className: "skill-col skill-freeball" });
  addCell(rowBottom, "Prf", { className: "skill-col skill-freeball" });
  addCell(rowBottom, "Eff", { className: "skill-col skill-freeball" });

  addCell(rowBottom, "Tot", { className: "skill-col skill-attack" });
  addCell(rowBottom, "Err", { className: "skill-col skill-attack" });
  addCell(rowBottom, "Mur", { className: "skill-col skill-attack" });
  addCell(rowBottom, "Punti", { className: "skill-col skill-attack" });
  addCell(rowBottom, "% Punti", { className: "skill-col skill-attack" });
  addCell(rowBottom, "Eff", { className: "skill-col skill-attack" });

  addCell(rowBottom, "Tot", { className: "skill-col skill-block" });
  addCell(rowBottom, "Punti", { className: "skill-col skill-block" });

  addCell(rowBottom, "Tot", { className: "skill-col skill-defense" });
  addCell(rowBottom, "Err", { className: "skill-col skill-defense" });
  addCell(rowBottom, "Eff", { className: "skill-col skill-defense" });

  thead.appendChild(rowTop);
  thead.appendChild(rowBottom);
}
function buildAggBodyHeaderRows(thead) {
  if (!thead) return [];
  const rows = Array.from(thead.querySelectorAll("tr"));
  if (!rows.length) return [];
  return rows
    .map(sourceRow => {
      const cells = Array.from(sourceRow.children || []);
      if (!cells.length) return null;
      const tr = document.createElement("tr");
      tr.className = "agg-body-header";
      cells.forEach(cell => {
        const td = document.createElement("td");
        td.textContent = cell.textContent || "";
        if (cell.className) td.className = cell.className;
        if (cell.dataset) {
          Object.keys(cell.dataset).forEach(key => {
            td.dataset[key] = cell.dataset[key];
          });
        }
        const colspan = cell.getAttribute("colspan");
        if (colspan) td.setAttribute("colspan", colspan);
        const rowspan = cell.getAttribute("rowspan");
        if (rowspan) td.setAttribute("rowspan", rowspan);
        tr.appendChild(td);
      });
      return tr;
    })
    .filter(Boolean);
}
function applySkillClassToCells(cells, skillId, startIndex = 0) {
  if (!skillId) return;
  cells.forEach((td, idx) => {
    if (idx < startIndex) return;
    td.classList.add("skill-col", "skill-" + skillId);
  });
}
function getScopeFromSetHeaderTarget(target) {
  if (!target) return null;
  const row = target.closest("tr");
  if (row && row.dataset && row.dataset.teamScope) return row.dataset.teamScope;
  if (analysisTeamFilterState.teams && analysisTeamFilterState.teams.has("opponent")) return "opponent";
  return "our";
}
function bindSetStartHeaderClicks(thead) {
  if (!thead || thead._setStartBound) return;
  thead.addEventListener("click", ev => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const cell = target.closest(".set-start-header");
    if (!cell || !cell.dataset || !cell.dataset.setNum) return;
    const setNum = parseInt(cell.dataset.setNum, 10);
    if (!setNum) return;
    const scope = getScopeFromSetHeaderTarget(cell);
    openSetStartEditor(setNum, scope);
  });
  thead._setStartBound = true;
}
function bindSetStartBodyHeaderClicks() {
  if (!elAggTableBody || elAggTableBody._setStartBound) return;
  elAggTableBody.addEventListener("click", ev => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const cell = target.closest(".set-start-header");
    if (!cell || !cell.dataset || !cell.dataset.setNum) return;
    const setNum = parseInt(cell.dataset.setNum, 10);
    if (!setNum) return;
    const scope = getScopeFromSetHeaderTarget(cell);
    openSetStartEditor(setNum, scope);
  });
  elAggTableBody._setStartBound = true;
}
function bindAggSummaryInteractions(thead) {
  if (!thead) return;
  const headerRow = thead.querySelector("tr");
  if (!headerRow) return;
  const skillHeaders = headerRow.querySelectorAll("th.skill-col");
  skillHeaders.forEach(th => {
    const skillId = getSkillIdFromHeader(th);
    if (!skillId) return;
    th.classList.add("agg-skill-header");
    th.title = "Dettagli " + getSkillLabel(skillId);
    th.addEventListener("click", () => {
      aggTableView = { mode: "skill", skillId, playerIdx: null };
      renderAggregatedTable();
    });
  });
}
if (elSetStartModalClose) {
  elSetStartModalClose.addEventListener("click", closeSetStartModal);
}
if (elSetStartModalCancel) {
  elSetStartModalCancel.addEventListener("click", closeSetStartModal);
}
  if (elBtnOpenMultiscout && !elBtnOpenMultiscout._bound) {
    elBtnOpenMultiscout.addEventListener("click", () => {
      renderMultiscoutModal();
      if (elMultiscoutModal) {
        elMultiscoutModal.classList.remove("hidden");
        setModalOpenState(true, true);
      }
    });
    elBtnOpenMultiscout._bound = true;
  }
if (elMultiscoutClose && !elMultiscoutClose._bound) {
  elMultiscoutClose.addEventListener("click", () => {
    if (elMultiscoutModal) elMultiscoutModal.classList.add("hidden");
    setModalOpenState(false, true);
  });
  elMultiscoutClose._bound = true;
}
if (elMultiscoutCancel && !elMultiscoutCancel._bound) {
  elMultiscoutCancel.addEventListener("click", () => {
    if (elMultiscoutModal) elMultiscoutModal.classList.add("hidden");
    setModalOpenState(false, true);
  });
  elMultiscoutCancel._bound = true;
}
if (elMultiscoutModal && !elMultiscoutModal._backdropBound) {
  const backdrop = elMultiscoutModal.querySelector("[data-close-multiscout]");
  if (backdrop) {
    backdrop.addEventListener("click", () => {
      elMultiscoutModal.classList.add("hidden");
      setModalOpenState(false, true);
    });
  }
  elMultiscoutModal._backdropBound = true;
}
function renderAggSkillDetailTable(summaryAll) {
  const { thead } = getAggTableElements();
  if (!elAggTableBody || !thead) return;
  const skillId = aggTableView.skillId;
  const skillLabel = getSkillLabel(skillId);
  const skillHeaderClass = "skill-col skill-" + skillId;
  const analysisScope = getAnalysisTeamScope();
  const analysisEvents = getAnalysisEvents();
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  renderAggDetailHeader(thead, [
    {
      label: "Atleta · " + skillLabel + " <- Tabellino",
      onClick: () => {
        resetAggTableView();
        renderAggregatedTable();
      }
    },
    { label: "Tot", className: skillHeaderClass },
    { label: "#", className: skillHeaderClass },
    { label: "+", className: skillHeaderClass },
    { label: "!", className: skillHeaderClass },
    { label: "-", className: skillHeaderClass },
    { label: "=", className: skillHeaderClass },
    { label: "/", className: skillHeaderClass },
    { label: "Pos", className: skillHeaderClass },
    { label: "Prf", className: skillHeaderClass },
    { label: "Eff", className: skillHeaderClass }
  ]);
  elAggTableBody.innerHTML = "";
  if (!analysisPlayers || analysisPlayers.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.textContent = "Aggiungi giocatrici per vedere il dettaglio " + skillLabel + ".";
    tr.appendChild(td);
    elAggTableBody.appendChild(tr);
    renderScoreAndRotations(summaryAll, analysisScope, { events: analysisEvents });
    renderSecondTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    return;
  }
  const totals = emptyCounts();
  const buildRow = (label, counts, playerIdx, isTotal = false) => {
    const metrics = computeMetrics(counts, skillId);
    const row = document.createElement("tr");
    if (isTotal) row.className = "rotation-row total";
    const cells = [
      label,
      metrics.total,
      counts["#"] || 0,
      counts["+"] || 0,
      counts["!"] || 0,
      counts["-"] || 0,
      counts["="] || 0,
      counts["/"] || 0,
      metrics.pos === null ? "-" : formatPercent(metrics.pos),
      metrics.prf === null ? "-" : formatPercent(metrics.prf),
      metrics.eff === null ? "-" : formatPercent(metrics.eff)
    ];
    const tdList = [];
    cells.forEach((text, idx) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (idx === 0 && !isTotal) {
        td.classList.add("agg-player-cell");
        td.addEventListener("click", () => {
          const prefs = ensurePlayerAnalysisState();
          prefs.playerIdx = playerIdx;
          saveState();
          setActiveAggTab("player");
          renderPlayerAnalysis();
        });
      }
      tdList.push(td);
      row.appendChild(td);
    });
    applySkillClassToCells(tdList, skillId, 0);
    elAggTableBody.appendChild(row);
  };
  const sortedEntries =
    analysisScope === "opponent"
      ? getSortedPlayerEntriesForScope(analysisScope)
      : getSortedPlayerEntries();
  sortedEntries.forEach(({ name, idx }) => {
    const counts = getAggSkillCounts(skillId, idx);
    mergeCounts(totals, counts);
    const label =
      analysisScope === "opponent"
        ? formatNameWithNumberFor(name, analysisNumbers)
        : formatNameWithNumber(name);
    buildRow(label, counts, idx, false);
  });
  buildRow("Totale squadra", totals, null, true);
  renderAggSkillDetailChartPanel(skillId);
  renderScoreAndRotations(summaryAll, analysisScope, { events: analysisEvents });
  renderSecondTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}
function renderAggPlayerDetailTable(summaryAll) {
  const { thead } = getAggTableElements();
  if (!elAggTableBody || !thead) return;
  const playerIdx = aggTableView.playerIdx;
  const playerLabel = getAggSkillPlayerLabel(playerIdx);
  const analysisScope = getAnalysisTeamScope();
  const analysisEvents = getAnalysisEvents();
  const analysisPlayers = getPlayersForScope(analysisScope);
  renderAggDetailHeader(thead, [
    {
      label: "Fondamentale · " + playerLabel + " <- Tabellino",
      onClick: () => {
        resetAggTableView();
        renderAggregatedTable();
      }
    },
    { label: "Tot" },
    { label: "#" },
    { label: "+" },
    { label: "!" },
    { label: "-" },
    { label: "=" },
    { label: "/" },
    { label: "Pos" },
    { label: "Prf" },
    { label: "Eff" }
  ]);
  elAggTableBody.innerHTML = "";
  if (!analysisPlayers || analysisPlayers.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 11;
    td.textContent = "Aggiungi giocatrici per vedere il dettaglio.";
    tr.appendChild(td);
    elAggTableBody.appendChild(tr);
    renderScoreAndRotations(summaryAll, analysisScope, { events: analysisEvents });
    renderSecondTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    return;
  }
  const skillOrder = ["serve", "pass", "freeball", "attack", "block", "defense"];
  skillOrder.forEach(skillId => {
    const counts = getAggSkillCounts(skillId, playerIdx);
    const metrics = computeMetrics(counts, skillId);
    const row = document.createElement("tr");
    const cells = [
      getSkillLabel(skillId),
      metrics.total,
      counts["#"] || 0,
      counts["+"] || 0,
      counts["!"] || 0,
      counts["-"] || 0,
      counts["="] || 0,
      counts["/"] || 0,
      metrics.pos === null ? "-" : formatPercent(metrics.pos),
      metrics.prf === null ? "-" : formatPercent(metrics.prf),
      metrics.eff === null ? "-" : formatPercent(metrics.eff)
    ];
    const tdList = [];
    cells.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      tdList.push(td);
      row.appendChild(td);
    });
    applySkillClassToCells(tdList, skillId, 0);
    elAggTableBody.appendChild(row);
  });
  renderScoreAndRotations(summaryAll, analysisScope, { events: analysisEvents });
  renderSecondTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}
function getAggSkillCounts(skillId, playerIdx) {
  if (!skillId) return emptyCounts();
  const statsSource =
    analysisStatsCache && analysisStatsScope === getAnalysisTeamScope()
      ? analysisStatsCache
      : state.stats || [];
  if (playerIdx === "team") {
    const totals = emptyCounts();
    Object.values(statsSource || []).forEach(playerStats => {
      const counts = normalizeCounts(playerStats && playerStats[skillId]);
      mergeCounts(totals, counts);
    });
    return totals;
  }
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  if (isNaN(idx) || !statsSource || !statsSource[idx]) return emptyCounts();
  return normalizeCounts(statsSource[idx][skillId]);
}
function getAggSkillPlayerLabel(playerIdx) {
  if (playerIdx === "team") return "Totale squadra";
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const scope = getAnalysisTeamScope();
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  if (isNaN(idx) || !players || !players[idx]) return "Giocatrice";
  return scope === "opponent"
    ? formatNameWithNumberFor(players[idx], numbers)
    : formatNameWithNumber(players[idx]);
}
function renderPlayerAnalysisControls() {
  if (!elPlayerAnalysisSelect) return;
  const prefs = ensurePlayerAnalysisState();
  renderAnalysisTeamFilter();
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const entries =
    analysisScope === "opponent"
      ? getSortedPlayerEntriesForScope(analysisScope)
      : getSortedPlayerEntries();
  elPlayerAnalysisSelect.innerHTML = "";
  if (!players.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nessuna giocatrice";
    elPlayerAnalysisSelect.appendChild(opt);
    elPlayerAnalysisSelect.disabled = true;
  } else {
    entries.forEach(({ name, idx }) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent =
        analysisScope === "opponent"
          ? formatNameWithNumberFor(name, numbers) || name || "Giocatrice " + (idx + 1)
          : formatNameWithNumber(name) || name || "Giocatrice " + (idx + 1);
      elPlayerAnalysisSelect.appendChild(opt);
    });
    elPlayerAnalysisSelect.disabled = false;
    const selectedIdx = getPlayerAnalysisPlayerIdx();
    if (selectedIdx !== null) {
      elPlayerAnalysisSelect.value = String(selectedIdx);
    } else {
      const firstEntry = entries[0];
      elPlayerAnalysisSelect.value = firstEntry ? String(firstEntry.idx) : "0";
    }
  }
  if (!elPlayerAnalysisSelect._playerAnalysisBound) {
    elPlayerAnalysisSelect.addEventListener("change", () => {
      const idx = parseInt(elPlayerAnalysisSelect.value, 10);
      prefs.playerIdx = isNaN(idx) ? null : idx;
      if (prefs.compareEnabled && prefs.comparePlayerIdx === prefs.playerIdx) {
        prefs.comparePlayerIdx = null;
      }
      saveState();
      renderPlayerAnalysis();
    });
    elPlayerAnalysisSelect._playerAnalysisBound = true;
  }
  if (elPlayerAnalysisCompareEnabled) {
    elPlayerAnalysisCompareEnabled.checked = !!prefs.compareEnabled;
    if (!elPlayerAnalysisCompareEnabled._bound) {
      elPlayerAnalysisCompareEnabled.addEventListener("change", () => {
        prefs.compareEnabled = !!elPlayerAnalysisCompareEnabled.checked;
        if (prefs.compareEnabled) {
          getPlayerAnalysisCompareIdx();
        } else {
          prefs.comparePlayerIdx = null;
        }
        saveState();
        renderPlayerAnalysis();
      });
      elPlayerAnalysisCompareEnabled._bound = true;
    }
  }
  if (elPlayerAnalysisCompareFilter) {
    elPlayerAnalysisCompareFilter.classList.toggle("hidden", !prefs.compareEnabled || players.length < 2);
  }
  if (elPlayerAnalysisCompareSelect) {
    elPlayerAnalysisCompareSelect.innerHTML = "";
    const primaryIdx = getPlayerAnalysisPlayerIdx();
    const compareEntries = entries.filter(entry => entry.idx !== primaryIdx);
    if (!prefs.compareEnabled || compareEntries.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = compareEntries.length === 0 ? "Nessuna altra giocatrice" : "Confronto disattivato";
      elPlayerAnalysisCompareSelect.appendChild(opt);
      elPlayerAnalysisCompareSelect.disabled = true;
    } else {
      compareEntries.forEach(({ name, idx }) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent =
          analysisScope === "opponent"
            ? formatNameWithNumberFor(name, numbers) || name || "Giocatrice " + (idx + 1)
            : formatNameWithNumber(name) || name || "Giocatrice " + (idx + 1);
        elPlayerAnalysisCompareSelect.appendChild(opt);
      });
      elPlayerAnalysisCompareSelect.disabled = false;
      const compareIdx = getPlayerAnalysisCompareIdx();
      elPlayerAnalysisCompareSelect.value =
        compareIdx !== null ? String(compareIdx) : (compareEntries[0] ? String(compareEntries[0].idx) : "");
    }
    if (!elPlayerAnalysisCompareSelect._bound) {
      elPlayerAnalysisCompareSelect.addEventListener("change", () => {
        const idx = parseInt(elPlayerAnalysisCompareSelect.value, 10);
        prefs.comparePlayerIdx = isNaN(idx) ? null : idx;
        saveState();
        renderPlayerAnalysis();
      });
      elPlayerAnalysisCompareSelect._bound = true;
    }
  }
  if (elPlayerAnalysisCourtSide) {
    const scopeSide = getAnalysisCourtSide(prefs.courtSideByScope[analysisScope]);
    renderAnalysisCourtSideRadios(elPlayerAnalysisCourtSide, scopeSide, () => {
      const scope = getAnalysisTeamScope();
      prefs.courtSideByScope[scope] = getAnalysisCourtSide(getCheckedRadioValue(elPlayerAnalysisCourtSide));
      saveState();
      renderPlayerAnalysis();
    }, "analysis-player-court-side");
  }
  if (elPlayerAnalysisShowAttack) {
    elPlayerAnalysisShowAttack.checked = !!prefs.showAttack;
    if (!elPlayerAnalysisShowAttack._bound) {
      elPlayerAnalysisShowAttack.addEventListener("change", () => {
        prefs.showAttack = !!elPlayerAnalysisShowAttack.checked;
        saveState();
        renderPlayerAnalysis();
      });
      elPlayerAnalysisShowAttack._bound = true;
    }
  }
  if (elPlayerAnalysisShowServe) {
    elPlayerAnalysisShowServe.checked = !!prefs.showServe;
    if (!elPlayerAnalysisShowServe._bound) {
      elPlayerAnalysisShowServe.addEventListener("change", () => {
        prefs.showServe = !!elPlayerAnalysisShowServe.checked;
        saveState();
        renderPlayerAnalysis();
      });
      elPlayerAnalysisShowServe._bound = true;
    }
  }
  if (elPlayerAnalysisShowSecond) {
    elPlayerAnalysisShowSecond.checked = !!prefs.showSecond;
    if (!elPlayerAnalysisShowSecond._bound) {
      elPlayerAnalysisShowSecond.addEventListener("change", () => {
        prefs.showSecond = !!elPlayerAnalysisShowSecond.checked;
        saveState();
        renderPlayerAnalysis();
      });
      elPlayerAnalysisShowSecond._bound = true;
    }
  }
}
function renderPlayerAnalysisTable() {
  if (!elPlayerAnalysisBody) return;
  elPlayerAnalysisBody.innerHTML = "";
  const idx = getPlayerAnalysisPlayerIdx();
  const compareIdx = getPlayerAnalysisCompareIdx();
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const prefs = ensurePlayerAnalysisState();
  const filteredEvents = filterEventsByAnalysisTeam().filter(ev => matchesSummarySetFilter(ev));
  const statsByPlayer = computeStatsByPlayerForEvents(filteredEvents, players);
  if (idx === null || !players || !players[idx]) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 32;
    td.textContent = "Seleziona una giocatrice per vedere il tabellino.";
    tr.appendChild(td);
    elPlayerAnalysisBody.appendChild(tr);
    return;
  }
  const playerPoints = computePlayerPointsMap(filteredEvents, analysisScope);
  const playerErrors = computePlayerErrorsMap(filteredEvents);
  const playerPassAces = computePlayerPassAceMap(filteredEvents, analysisScope);
  const buildPlayerSnapshot = playerIdx => {
    const name = players[playerIdx];
    const serveCounts = normalizeCounts(statsByPlayer[playerIdx] && statsByPlayer[playerIdx].serve);
    const passCounts = normalizeCounts(statsByPlayer[playerIdx] && statsByPlayer[playerIdx].pass);
    const freeballCounts = normalizeCounts(statsByPlayer[playerIdx] && statsByPlayer[playerIdx].freeball);
    const attackCounts = normalizeCounts(statsByPlayer[playerIdx] && statsByPlayer[playerIdx].attack);
    const blockCounts = normalizeCounts(statsByPlayer[playerIdx] && statsByPlayer[playerIdx].block);
    const defenseCounts = normalizeCounts(statsByPlayer[playerIdx] && statsByPlayer[playerIdx].defense);
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
            { label: "Fatti", text: String(points.for || 0), value: points.for || 0, better: "higher" },
            { label: "Subiti", text: String(points.against || 0), value: points.against || 0, better: "lower" },
            {
              label: "Delta",
              text: formatDelta((points.for || 0) - (points.against || 0)),
              value: (points.for || 0) - (points.against || 0),
              better: "higher"
            },
            { label: "Falli/Errori", text: String(personalErrors || 0), value: personalErrors || 0, better: "lower" }
          ]
        },
        {
          title: "Battuta",
          entries: [
            { label: "Tot", text: String(totalFromCounts(serveCounts)), value: totalFromCounts(serveCounts), better: "neutral" },
            { label: "Err", text: String(serveCounts["="] || 0), value: serveCounts["="] || 0, better: "lower" },
            { label: "Punti", text: String(servePointCount || 0), value: servePointCount || 0, better: "higher" },
            { label: "Eff", text: serveMetrics.eff === null ? "-" : formatPercent(serveMetrics.eff), value: serveMetrics.eff, better: "higher" },
            { label: "Pos", text: serveMetrics.pos === null ? "-" : formatPercent(serveMetrics.pos), value: serveMetrics.pos, better: "higher" }
          ]
        },
        {
          title: "Ricezione",
          entries: [
            { label: "Tot", text: String(totalFromCounts(passCounts)), value: totalFromCounts(passCounts), better: "neutral" },
            { label: "Err", text: String(passMetrics.negativeCount || 0), value: passMetrics.negativeCount || 0, better: "lower" },
            { label: "Ace", text: String(passAces || 0), value: passAces || 0, better: "lower" },
            { label: "Pos", text: passMetrics.pos === null ? "-" : formatPercent(passMetrics.pos), value: passMetrics.pos, better: "higher" },
            { label: "Prf", text: passMetrics.prf === null ? "-" : formatPercent(passMetrics.prf), value: passMetrics.prf, better: "higher" },
            { label: "Eff", text: passMetrics.eff === null ? "-" : formatPercent(passMetrics.eff), value: passMetrics.eff, better: "higher" }
          ]
        },
        {
          title: "Freeball",
          entries: [
            { label: "Tot", text: String(totalFromCounts(freeballCounts)), value: totalFromCounts(freeballCounts), better: "neutral" },
            { label: "Err", text: String(freeballMetrics.negativeCount || 0), value: freeballMetrics.negativeCount || 0, better: "lower" },
            { label: "Pos", text: freeballMetrics.pos === null ? "-" : formatPercent(freeballMetrics.pos), value: freeballMetrics.pos, better: "higher" },
            { label: "Prf", text: freeballMetrics.prf === null ? "-" : formatPercent(freeballMetrics.prf), value: freeballMetrics.prf, better: "higher" },
            { label: "Eff", text: freeballMetrics.eff === null ? "-" : formatPercent(freeballMetrics.eff), value: freeballMetrics.eff, better: "higher" }
          ]
        },
        {
          title: "Attacco",
          entries: [
            { label: "Tot", text: String(attackTotal), value: attackTotal, better: "neutral" },
            { label: "Err", text: String(attackCounts["="] || 0), value: attackCounts["="] || 0, better: "lower" },
            { label: "Mur", text: String(attackCounts["/"] || 0), value: attackCounts["/"] || 0, better: "lower" },
            { label: "Punti", text: String(attackPointCount || 0), value: attackPointCount || 0, better: "higher" },
            {
              label: "% Punti",
              text: formatPercentValue(attackPointCount || 0, attackTotal),
              value: attackTotal > 0 ? (attackPointCount || 0) / attackTotal : null,
              better: "higher"
            },
            { label: "Eff", text: attackMetrics.eff === null ? "-" : formatPercent(attackMetrics.eff), value: attackMetrics.eff, better: "higher" }
          ]
        },
        {
          title: "Muro",
          entries: [
            { label: "Tot", text: String(totalFromCounts(blockCounts)), value: totalFromCounts(blockCounts), better: "neutral" },
            { label: "Punti", text: String(blockPointCount || 0), value: blockPointCount || 0, better: "higher" }
          ]
        },
        {
          title: "Difesa",
          entries: [
            { label: "Tot", text: String(totalFromCounts(defenseCounts)), value: totalFromCounts(defenseCounts), better: "neutral" },
            { label: "Err", text: String(defenseMetrics.negativeCount || 0), value: defenseMetrics.negativeCount || 0, better: "lower" },
            { label: "Eff", text: defenseMetrics.eff === null ? "-" : formatPercent(defenseMetrics.eff), value: defenseMetrics.eff, better: "higher" }
          ]
        }
      ]
    };
  };
  const buildPlayerRow = snapshot => {
    const row = document.createElement("tr");
    if (prefs.compareEnabled) {
      row.classList.add("player-analysis-compare-row");
      if (snapshot.playerIdx === idx) row.classList.add("is-primary");
      if (snapshot.playerIdx === compareIdx) row.classList.add("is-compare");
    }
    const flattenedEntries = snapshot.metrics.flatMap(section => section.entries);
    const cells = [{ text: snapshot.name }]
      .concat(flattenedEntries.slice(0, 4).map(entry => ({ text: entry.text })))
      .concat(flattenedEntries.slice(4, 9).map(entry => ({ text: entry.text, className: "skill-col skill-serve" })))
      .concat(flattenedEntries.slice(9, 15).map(entry => ({ text: entry.text, className: "skill-col skill-pass" })))
      .concat(flattenedEntries.slice(15, 20).map(entry => ({ text: entry.text, className: "skill-col skill-freeball" })))
      .concat(flattenedEntries.slice(20, 26).map(entry => ({ text: entry.text, className: "skill-col skill-attack" })))
      .concat(flattenedEntries.slice(26, 28).map(entry => ({ text: entry.text, className: "skill-col skill-block" })))
      .concat(flattenedEntries.slice(28).map(entry => ({ text: entry.text, className: "skill-col skill-defense" })));
    cells.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell.text;
      if (cell.className) td.className = cell.className;
      row.appendChild(td);
    });
    return row;
  };
  const primarySnapshot = buildPlayerSnapshot(idx);
  const compareSnapshot = prefs.compareEnabled && compareIdx !== null && players[compareIdx]
    ? buildPlayerSnapshot(compareIdx)
    : null;
  const buildCompareExtraSections = (snapshot, otherSnapshot = null) => {
    const wrap = document.createElement("div");
    wrap.className = "player-analysis-compare-sections";
    if (prefs.showAttack) {
      const section = document.createElement("section");
      section.className = "player-analysis-compare-subsection";
      const title = document.createElement("h4");
      title.textContent = "Attacco";
      const summary = document.createElement("div");
      summary.className = "attack-analysis-summary";
      const grid = buildPlayerTrajectoryGridSkeleton();
      section.appendChild(title);
      section.appendChild(summary);
      section.appendChild(grid);
      renderAttackMetricsSummary(
        summary,
        getFilteredPlayerAttackSummaryEventsForPlayer(snapshot.playerIdx),
        otherSnapshot ? getFilteredPlayerAttackSummaryEventsForPlayer(otherSnapshot.playerIdx) : null
      );
      renderAttackTrajectoryGridForPlayer(grid, snapshot.playerIdx);
      wrap.appendChild(section);
    }
    if (prefs.showServe) {
      const section = document.createElement("section");
      section.className = "player-analysis-compare-subsection";
      const title = document.createElement("h4");
      title.textContent = "Traiettorie battuta";
      const grid = document.createElement("div");
      grid.className = "trajectory-grid serve-trajectory-grid";
      section.appendChild(title);
      section.appendChild(grid);
      renderServeTrajectoryGridForPlayer(grid, snapshot.playerIdx);
      wrap.appendChild(section);
    }
    if (prefs.showSecond) {
      const section = document.createElement("section");
      section.className = "player-analysis-compare-subsection";
      const title = document.createElement("h4");
      title.textContent = "Distribuzione alzate";
      const dist = document.createElement("div");
      dist.className = "distribution-grid";
      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrapper";
      const table = document.createElement("table");
      table.className = "agg-table";
      table.innerHTML =
        '<thead><tr><th>Alzate</th><th class="skill-col skill-second">Tot</th><th class="skill-col skill-second">#</th><th class="skill-col skill-second">+</th><th class="skill-col skill-second">!</th><th class="skill-col skill-second">-</th><th class="skill-col skill-second">=</th><th class="skill-col skill-second">/</th><th class="skill-col skill-second">Pos</th><th class="skill-col skill-second">Prf</th><th class="skill-col skill-second">Eff</th></tr></thead>';
      const body = document.createElement("tbody");
      table.appendChild(body);
      tableWrap.appendChild(table);
      const attackTableWrap = document.createElement("div");
      attackTableWrap.className = "table-wrapper";
      const attackTable = document.createElement("table");
      attackTable.className = "agg-table";
      attackTable.innerHTML =
        '<thead><tr><th>Attacchi dopo alzata</th><th class="skill-col skill-attack">Tot</th><th class="skill-col skill-attack">#</th><th class="skill-col skill-attack">+</th><th class="skill-col skill-attack">!</th><th class="skill-col skill-attack">-</th><th class="skill-col skill-attack">=</th><th class="skill-col skill-attack">/</th><th class="skill-col skill-attack">Pos</th><th class="skill-col skill-attack">Prf</th><th class="skill-col skill-attack">Eff</th></tr></thead>';
      const attackBody = document.createElement("tbody");
      attackTable.appendChild(attackBody);
      attackTableWrap.appendChild(attackTable);
      section.appendChild(title);
      section.appendChild(dist);
      section.appendChild(tableWrap);
      section.appendChild(attackTableWrap);
      renderSecondTableForPlayer(body, dist, snapshot.playerIdx, attackBody, otherSnapshot ? otherSnapshot.playerIdx : null);
      wrap.appendChild(section);
    }
    const chartsSection = document.createElement("section");
    chartsSection.className = "player-analysis-compare-subsection";
    const chartsTitle = document.createElement("h4");
    chartsTitle.textContent = "Grafici skill";
    const chartsGrid = document.createElement("div");
    chartsGrid.className = "analysis-skill-chart-grid player-analysis-skill-chart-grid";
    chartsSection.appendChild(chartsTitle);
    chartsSection.appendChild(chartsGrid);
    renderSkillChartsForPlayer(chartsGrid, snapshot.playerIdx);
    wrap.appendChild(chartsSection);
    return wrap;
  };
  const renderCompareCard = (snapshot, otherSnapshot, cardClass) => {
    const card = document.createElement("div");
    card.className = `player-analysis-compare-card ${cardClass}`;
    card.appendChild(createPlayerAnalysisIdentity(snapshot.name, snapshot.photo, { compact: true }));
    const table = document.createElement("table");
    table.className = "player-analysis-compare-table";
    snapshot.metrics.forEach((section, sectionIdx) => {
      const sectionRow = document.createElement("tr");
      const skillClassMap = {
        Punti: "skill-points",
        Battuta: "skill-serve",
        Ricezione: "skill-pass",
        Freeball: "skill-freeball",
        Attacco: "skill-attack",
        Muro: "skill-block",
        Difesa: "skill-defense"
      };
      sectionRow.className = `player-analysis-compare-section-row ${skillClassMap[section.title] || ""}`.trim();
      const sectionHead = document.createElement("th");
      sectionHead.colSpan = 2;
      sectionHead.textContent = section.title;
      sectionRow.appendChild(sectionHead);
      table.appendChild(sectionRow);
      section.entries.forEach((entry, entryIdx) => {
        const tr = document.createElement("tr");
        const labelTd = document.createElement("td");
        labelTd.textContent = entry.label;
        const valueTd = document.createElement("td");
        valueTd.textContent = entry.text;
        valueTd.className = "player-analysis-compare-value is-neutral";
        const otherEntry =
          otherSnapshot && otherSnapshot.metrics[sectionIdx] && otherSnapshot.metrics[sectionIdx].entries[entryIdx]
            ? otherSnapshot.metrics[sectionIdx].entries[entryIdx]
            : null;
        if (
          otherEntry &&
          entry.better !== "neutral" &&
          entry.value !== null &&
          otherEntry.value !== null &&
          entry.value !== otherEntry.value
        ) {
          const isBetter =
            entry.better === "lower" ? entry.value < otherEntry.value : entry.value > otherEntry.value;
          valueTd.classList.remove("is-neutral");
          valueTd.classList.add(isBetter ? "is-better" : "is-worse");
        }
        tr.appendChild(labelTd);
        tr.appendChild(valueTd);
        table.appendChild(tr);
      });
    });
    card.appendChild(table);
    card.appendChild(buildCompareExtraSections(snapshot, otherSnapshot));
    return card;
  };
  if (elPlayerAnalysisTableWrap) {
    elPlayerAnalysisTableWrap.classList.toggle("hidden", !!compareSnapshot);
  }
  const columnsWrap = document.querySelector(".player-analysis-columns");
  const chartsPanel = document.querySelector(".player-skill-charts-panel");
  if (columnsWrap) columnsWrap.classList.toggle("hidden", !!compareSnapshot);
  if (chartsPanel) chartsPanel.classList.toggle("hidden", !!compareSnapshot);
  if (elPlayerAnalysisCompareView) {
    elPlayerAnalysisCompareView.innerHTML = "";
    elPlayerAnalysisCompareView.classList.toggle("hidden", !compareSnapshot);
    if (compareSnapshot) {
      const layout = document.createElement("div");
      layout.className = "player-analysis-compare-layout";
      layout.appendChild(renderCompareCard(primarySnapshot, compareSnapshot, "is-primary"));
      layout.appendChild(renderCompareCard(compareSnapshot, primarySnapshot, "is-compare"));
      elPlayerAnalysisCompareView.appendChild(layout);
    }
  }
  if (!compareSnapshot) {
    elPlayerAnalysisBody.appendChild(buildPlayerRow(primarySnapshot));
  } else {
    elPlayerAnalysisBody.appendChild(buildPlayerRow(primarySnapshot));
    elPlayerAnalysisBody.appendChild(buildPlayerRow(compareSnapshot));
  }
}
function updatePlayerAnalysisVisibility() {
  const prefs = ensurePlayerAnalysisState();
  if (elPlayerAnalysisAttack) {
    elPlayerAnalysisAttack.classList.toggle("hidden", !prefs.showAttack);
  }
  if (elPlayerAnalysisServe) {
    elPlayerAnalysisServe.classList.toggle("hidden", !prefs.showServe);
  }
  if (elPlayerAnalysisSecond) {
    elPlayerAnalysisSecond.classList.toggle("hidden", !prefs.showSecond);
  }
}
function createPlayerAnalysisIdentity(displayName, photo, options = {}) {
  const identity = document.createElement("div");
  identity.className = "player-analysis-identity" + (options.compact ? " is-compact" : "");
  if (photo) {
    const avatar = document.createElement("img");
    avatar.className = "player-analysis-identity__avatar";
    avatar.src = photo;
    avatar.alt = `Foto di ${displayName}`;
    identity.appendChild(avatar);
  }
  const text = document.createElement("div");
  text.className = "player-analysis-identity__text";
  if (options.badge) {
    const badge = document.createElement("div");
    badge.className = "player-analysis-hero-card__badge";
    badge.textContent = options.badge;
    text.appendChild(badge);
  }
  const title = document.createElement("h3");
  title.className = "player-analysis-hero-card__title";
  title.textContent = displayName;
  text.appendChild(title);
  identity.appendChild(text);
  return identity;
}
function renderPlayerAnalysisHero() {
  if (!elPlayerAnalysisHero) return;
  const analysisScope = getAnalysisTeamScope();
  const idx = getPlayerAnalysisPlayerIdx();
  const compareIdx = getPlayerAnalysisCompareIdx();
  const prefs = ensurePlayerAnalysisState();
  const players = getPlayersForScope(analysisScope);
  if (prefs.compareEnabled && compareIdx !== null) {
    elPlayerAnalysisHero.classList.add("hidden");
    elPlayerAnalysisHero.innerHTML = "";
    return;
  }
  if (idx === null || !players || !players[idx]) {
    elPlayerAnalysisHero.classList.add("hidden");
    elPlayerAnalysisHero.innerHTML = "";
    return;
  }
  const name = players[idx];
  const numbers = getPlayerNumbersForScope(analysisScope);
  const photo = getPlayerPhotoForScope(analysisScope, name);
  const displayName =
    analysisScope === "opponent"
      ? formatNameWithNumberFor(name, numbers)
      : formatNameWithNumber(name);
  const sideLabel = analysisScope === "opponent" ? "Squadra avversaria" : "La tua squadra";
  elPlayerAnalysisHero.classList.remove("hidden");
  elPlayerAnalysisHero.innerHTML = "";
  const card = document.createElement("div");
  card.className = "player-analysis-hero-card" + (photo ? " has-photo" : "");
  card.appendChild(createPlayerAnalysisIdentity(displayName, photo, { badge: sideLabel }));
  elPlayerAnalysisHero.appendChild(card);
}
function renderPlayerAnalysis() {
  if (!elPlayerAnalysisBody) return;
  renderPlayerAnalysisControls();
  renderPlayerAnalysisTable();
  renderPlayerAnalysisHero();
  updatePlayerAnalysisVisibility();
  const prefs = ensurePlayerAnalysisState();
  if (prefs.compareEnabled && getPlayerAnalysisCompareIdx() !== null) {
    return;
  }
  renderPlayerAnalysisSkillCharts();
  if (prefs.showAttack) {
    renderPlayerTrajectoryAnalysis();
  }
  if (prefs.showServe) {
    renderPlayerServeTrajectoryAnalysis();
  }
  if (prefs.showSecond) {
    renderPlayerSecondTable();
  }
}
function renderAggSkillModal(skillId, playerIdx) {
  if (!elAggSkillModalBody) return;
  ensureAnalysisStatsCache();
  const skillLabel = getSkillLabel(skillId);
  const playerLabel = getAggSkillPlayerLabel(playerIdx);
  if (elAggSkillModalTitle) {
    elAggSkillModalTitle.textContent = skillLabel + " · " + playerLabel;
  }
  const counts = getAggSkillCounts(skillId, playerIdx);
  const metrics = computeMetrics(counts, skillId);
  elAggSkillModalBody.innerHTML = "";
  const summary = document.createElement("div");
  summary.className = "agg-skill-summary";
  const summaryItems = [
    { label: "Totale", value: metrics.total },
    { label: "Positivi", value: metrics.positiveCount },
    { label: "Negativi", value: metrics.negativeCount }
  ];
  if (metrics.prf !== null) {
    summaryItems.push({ label: "Prf", value: formatPercent(metrics.prf) });
  }
  if (metrics.pos !== null) {
    summaryItems.push({ label: "Pos", value: formatPercent(metrics.pos) });
  }
  if (metrics.eff !== null) {
    summaryItems.push({ label: "Eff", value: formatPercent(metrics.eff) });
  }
  summaryItems.forEach(item => {
    const card = document.createElement("div");
    card.className = "agg-skill-summary-card";
    const label = document.createElement("div");
    label.className = "agg-skill-summary-label";
    label.textContent = item.label;
    const value = document.createElement("div");
    value.className = "agg-skill-summary-value";
    value.textContent = item.value;
    card.appendChild(label);
    card.appendChild(value);
    summary.appendChild(card);
  });
  elAggSkillModalBody.appendChild(summary);
  const codesTable = document.createElement("table");
  codesTable.className = "agg-skill-codes";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Codice", "Tot", "%"].forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  codesTable.appendChild(thead);
  const tbody = document.createElement("tbody");
  const codes = (state.metricsConfig[skillId]?.activeCodes || RESULT_CODES).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  const ordered = codes.filter(c => c !== "/" && c !== "=").concat("/", "=");
  ordered.forEach(code => {
    const tr = document.createElement("tr");
    const count = counts[code] || 0;
    const cells = [code, count, formatPercentValue(count, metrics.total)];
    cells.forEach(text => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  codesTable.appendChild(tbody);
  elAggSkillModalBody.appendChild(codesTable);
  appendAggSkillModalChart(skillId, playerIdx);
}
function openAggSkillModal(skillId, playerIdx) {
  if (!elAggSkillModal || !elAggSkillModalBody) return;
  renderAggSkillModal(skillId, playerIdx);
  elAggSkillModal.classList.remove("hidden");
  setModalOpenState(true);
}
function closeAggSkillModal() {
  if (!elAggSkillModal) return;
  elAggSkillModal.classList.add("hidden");
  setModalOpenState(false);
}
