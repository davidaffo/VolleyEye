function isBackRowZone(z) {
  return z === 5 || z === 6 || z === 1;
}
function clamp01(n) {
  if (n == null || isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
function getCourtShape(court) {
  if (typeof ensureCourtShapeFor === "function") return ensureCourtShapeFor(court);
  const shaped = Array.isArray(court) ? court : [];
  return Array.from({ length: 6 }, (_, idx) => {
    const slot = shaped[idx] || {};
    return { main: slot.main || "", replaced: slot.replaced || "" };
  });
}
function cloneCourt(court) {
  if (typeof cloneCourtLineup === "function") return cloneCourtLineup(court);
  return getCourtShape(court).map(slot => ({ main: slot.main, replaced: slot.replaced }));
}
function buildCourtFromNames(names = []) {
  return Array.from({ length: 6 }, (_, idx) => ({ main: names[idx] || "", replaced: "" }));
}
function cloneSetMap(map) {
  return JSON.parse(JSON.stringify(map || {}));
}
function getNextSetEntry(scope) {
  if (!nextSetDraft) return null;
  return scope === "opponent" ? nextSetDraft.opponent : nextSetDraft.our;
}
function updateNextSetEntry(scope, entry) {
  if (!nextSetDraft || !entry) return;
  if (scope === "opponent") {
    nextSetDraft.opponent = entry;
  } else {
    nextSetDraft.our = entry;
  }
}
function setNextSetPlayer(scope, posIdx, name) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const liberos = getLiberosForScope(scope);
  const core = window.VolleyEye && window.VolleyEye.lineup;
  let nextCourt = [];
  if (core && typeof core.setPlayerOnCourt === "function") {
    nextCourt = core.setPlayerOnCourt({
      court: entry.court || [],
      posIdx,
      playerName: name,
      liberos
    });
  } else {
    nextCourt = getCourtShape(entry.court || []).map((slot, idx) => {
      const updated = Object.assign({}, slot);
      if (updated.main === name) updated.main = "";
      if (updated.replaced === name) updated.replaced = "";
      if (idx === posIdx) updated.main = name;
      return updated;
    });
  }
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}
function swapNextSetSlots(scope, fromIdx, toIdx) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const core = window.VolleyEye && window.VolleyEye.lineup;
  let nextCourt = [];
  if (core && typeof core.swapCourtSlots === "function") {
    nextCourt = core.swapCourtSlots({
      court: entry.court || [],
      fromIdx,
      toIdx
    });
  } else {
    nextCourt = getCourtShape(entry.court || []);
    const tmp = nextCourt[fromIdx];
    nextCourt[fromIdx] = nextCourt[toIdx];
    nextCourt[toIdx] = tmp;
  }
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}
function clearNextSetSlot(scope, posIdx) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const nextCourt = getCourtShape(entry.court || []).map((slot, idx) => {
    if (idx !== posIdx) return slot;
    return { main: "", replaced: "" };
  });
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}
function renderNextSetLineup(scope, courtEl, benchEl) {
  if (!courtEl || !benchEl) return;
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  courtEl.innerHTML = "";
  const court = getCourtShape(entry.court || []);
  const numbersMap = getPlayerNumbersForScope(scope);
  const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  court.forEach((slot, idx) => {
    const card = document.createElement("div");
    card.className = "lineup-slot pos-" + (idx + 1) + (!slot.main ? " empty" : "");
    card.style.gridArea = "pos" + (idx + 1);
    card.dataset.pos = "P" + (idx + 1);
    card.dataset.posIndex = String(idx);
    card.dataset.lineupContext = "next-set";
    if (slot.main) {
      card.draggable = true;
      card.addEventListener("dragstart", e => {
        nextSetDragName = slot.main;
        nextSetDragFromIdx = idx;
        nextSetDragScope = scope;
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", slot.main);
          e.dataTransfer.effectAllowed = "move";
        }
      });
      card.addEventListener("dragend", () => {
        nextSetDragName = "";
        nextSetDragFromIdx = null;
        nextSetDragScope = null;
      });
    }
    card.addEventListener("dragover", e => {
      e.preventDefault();
      card.classList.add("drop-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drop-over"));
    card.addEventListener("drop", e => {
      e.preventDefault();
      card.classList.remove("drop-over");
      const name = (e.dataTransfer && e.dataTransfer.getData("text/plain")) || nextSetDragName || "";
      if (!name) return;
      if (nextSetDragScope && nextSetDragScope !== scope) return;
      if (typeof nextSetDragFromIdx === "number" && nextSetDragFromIdx !== idx) {
        swapNextSetSlots(scope, nextSetDragFromIdx, idx);
      } else {
        setNextSetPlayer(scope, idx, name);
      }
      nextSetDragFromIdx = null;
      nextSetDragName = "";
      nextSetDragScope = null;
      renderNextSetLineups();
    });
    card.addEventListener("click", () => {
      if (slot.main) {
        clearNextSetSlot(scope, idx);
        renderNextSetLineups();
      }
    });
    if (slot.main) {
      card.addEventListener(
        "touchstart",
        e => {
          handleLineupTouchStart(e, slot.main, idx, "next-set", scope);
        },
        { passive: false }
      );
    }
    const body = document.createElement("div");
    body.className = "slot-body";
    const nameLabel = document.createElement("div");
    nameLabel.className = "slot-name";
    nameLabel.textContent = slot.main ? formatLineupModalName(slot.main, { compactCourt: true }) : "Trascina qui";
    body.appendChild(nameLabel);
    card.appendChild(body);
    courtEl.appendChild(card);
  });
  const benchNames = getBenchForLineupWithRoster(
    court,
    getPlayersForScope(scope),
    getLiberosForScope(scope),
    numbersMap
  );
  benchEl.innerHTML = "";
  if (benchNames.length === 0) {
    const empty = document.createElement("div");
    empty.className = "bench-empty";
    empty.textContent = "Nessuna riserva disponibile.";
    benchEl.appendChild(empty);
  } else {
    benchNames.forEach(name => {
      const chip = document.createElement("div");
      chip.className = "lineup-chip";
      chip.draggable = true;
      chip.dataset.playerName = name;
      chip.dataset.lineupContext = "next-set";
      chip.addEventListener("dragstart", e => {
        nextSetDragName = name;
        nextSetDragFromIdx = null;
        nextSetDragScope = scope;
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", name);
          e.dataTransfer.effectAllowed = "move";
        }
      });
      chip.addEventListener("dragend", () => {
        nextSetDragName = "";
        nextSetDragFromIdx = null;
        nextSetDragScope = null;
      });
      chip.addEventListener("click", () => {
        const nextEmpty = court.findIndex(slot => !slot.main);
        const targetIdx = nextEmpty !== -1 ? nextEmpty : 0;
        setNextSetPlayer(scope, targetIdx, name);
        renderNextSetLineups();
      });
      chip.addEventListener(
        "touchstart",
        e => {
          if (!isCoarse) return;
          handleLineupTouchStart(e, name, null, "next-set", scope);
        },
        { passive: false }
      );
      const span = document.createElement("span");
      span.textContent = formatLineupModalName(name, { compactCourt: true });
      chip.appendChild(span);
      benchEl.appendChild(chip);
    });
  }
}
function renderNextSetLineups() {
  if (!nextSetDraft) return;
  updateNextSetRotationUI();
  renderNextSetLineup("opponent", elNextSetCourtOpp, elNextSetBenchOpp);
  renderNextSetLineup("our", elNextSetCourtOur, elNextSetBenchOur);
  updateNextSetDefaultButtons();
  syncNextSetPreferredLiberoSelects();
}
function syncNextSetPreferredLiberoSelects() {
  const applyPreferredLiberoSelection = (scope, next) => {
    if (typeof setTeamPreferredLibero === "function") {
      setTeamPreferredLibero(scope, next);
    } else if (scope === "opponent") {
      state.opponentPreferredLibero = next;
    } else {
      state.preferredLibero = next;
    }
    if (typeof setTeamLiberoAutoMap === "function") {
      setTeamLiberoAutoMap(scope, {});
    }
    if (typeof enforceAutoLiberoForScope === "function") {
      enforceAutoLiberoForScope(scope, { skipServerOnServe: true });
    }
    saveState();
    if (scope === "opponent") {
      if (typeof renderOpponentPlayers === "function") renderOpponentPlayers();
      if (typeof renderOpponentLiberoChipsInline === "function") renderOpponentLiberoChipsInline();
      if (typeof updateOpponentRotationDisplay === "function") updateOpponentRotationDisplay();
    } else {
      if (typeof renderPlayers === "function") renderPlayers();
      if (typeof renderBenchChips === "function") renderBenchChips();
      if (typeof renderLineupChips === "function") renderLineupChips();
      if (typeof renderLiberoChipsInline === "function") renderLiberoChipsInline();
      if (typeof updateRotationDisplay === "function") updateRotationDisplay();
    }
  };
  const syncForScope = scope => {
    const select = scope === "opponent" ? elNextSetPreferredLiberoOpp : elNextSetPreferredLiberoOur;
    if (!select) return;
    const liberos = getLiberosForScope(scope);
    const numbers = getPlayerNumbersForScope(scope);
    const ordered = typeof sortNamesByNumber === "function" ? sortNamesByNumber(liberos, numbers) : liberos.slice();
    select.innerHTML = "";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-";
    select.appendChild(emptyOpt);
    ordered.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent =
        scope === "opponent" ? formatNameWithNumberFor(name, numbers) : formatNameWithNumber(name);
      select.appendChild(opt);
    });
    const preferred =
      typeof getTeamPreferredLibero === "function"
        ? getTeamPreferredLibero(scope)
        : scope === "opponent"
          ? state.opponentPreferredLibero || ""
          : state.preferredLibero || "";
    select.value = preferred && ordered.includes(preferred) ? preferred : "";
    select.disabled = ordered.length === 0;
    if (!select._preferredBound) {
      select.addEventListener("change", () => {
        const next = select.value || "";
        applyPreferredLiberoSelection(scope, next);
      });
      select._preferredBound = true;
    }
  };
  syncForScope("our");
  syncForScope("opponent");
}
function updateNextSetDefaultButtons() {
  if (elNextSetDefaultOur) {
    const defaults = getRawDefaultStartForScope("our");
    const hasLineup = !!defaults;
    elNextSetDefaultOur.disabled = !hasLineup;
  }
  if (elNextSetDefaultOpp) {
    const defaults = getRawDefaultStartForScope("opponent");
    const hasLineup = !!defaults;
    elNextSetDefaultOpp.disabled = !hasLineup;
  }
}
function updateNextSetRotationUI() {
  if (!nextSetDraft) return;
  if (elNextSetRotationSelectOur) {
    elNextSetRotationSelectOur.value = String(nextSetDraft.our && nextSetDraft.our.rotation ? nextSetDraft.our.rotation : 1);
  }
  if (elNextSetRotationSelectOpp) {
    elNextSetRotationSelectOpp.value = String(
      nextSetDraft.opponent && nextSetDraft.opponent.rotation ? nextSetDraft.opponent.rotation : 1
    );
  }
}
function setNextSetRotation(scope, value) {
  if (!nextSetDraft) return;
  const rotation = Math.min(6, Math.max(1, parseInt(value, 10) || 1));
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  updateNextSetEntry(scope, Object.assign({}, entry, { rotation }));
  updateNextSetRotationUI();
}
function rotateNextSetCourt(scope, direction) {
  if (!nextSetDraft) return;
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const court = getCourtShape(entry.court || []);
  let rotated = [];
  if (direction === "cw") {
    rotated = [court[5], court[0], court[1], court[2], court[3], court[4]];
  } else {
    rotated = [court[1], court[2], court[3], court[4], court[5], court[0]];
  }
  const currentRotation = entry.rotation || 1;
  const rotation = direction === "cw" ? ((currentRotation % 6) + 1) : (currentRotation === 1 ? 6 : currentRotation - 1);
  updateNextSetEntry(scope, Object.assign({}, entry, { court: rotated, rotation }));
  renderNextSetLineups();
}
function getDefaultSetStartForScope(scope = "our") {
  const defaultGetter =
    scope === "opponent" ? getSelectedOpponentTeamDefaultSettings : getSelectedTeamDefaultSettings;
  const defaults = typeof defaultGetter === "function" ? defaultGetter() : null;
  const players = getPlayersForScope(scope);
  const lineup = defaults && defaults.defaultLineup ? defaults.defaultLineup : players;
  const rotation = defaults && defaults.defaultRotation ? defaults.defaultRotation : 1;
  return {
    court: buildCourtFromNames(lineup),
    rotation: rotation
  };
}
function getRawDefaultStartForScope(scope = "our") {
  if (typeof loadTeamFromStorage !== "function" || typeof extractRosterFromTeam !== "function") return null;
  const teamName = scope === "opponent" ? state.selectedOpponentTeam || "" : state.selectedTeam || "";
  if (!teamName) return null;
  const team = scope === "opponent" ? loadOpponentTeamFromStorage(teamName) : loadTeamFromStorage(teamName);
  if (!team) return null;
  const roster = extractRosterFromTeam(team);
  const lineup = Array.isArray(roster.defaultLineup) ? roster.defaultLineup : [];
  const hasLineup = lineup.some(name => (name || "").trim());
  if (!hasLineup) return null;
  const rotation = roster.defaultRotation || 1;
  return { court: buildCourtFromNames(lineup), rotation };
}
function getPreviousSetStart(scope, setNum) {
  if (!state.setStarts || setNum <= 1) return null;
  const prev = state.setStarts[setNum - 1];
  if (!prev) return null;
  const entry = scope === "opponent" ? prev.opponent : prev.our;
  if (!entry) return null;
  return {
    court: cloneCourt(entry.court || []),
    rotation: typeof entry.rotation === "number" ? entry.rotation : 1
  };
}
function computeSetWinner(setNum) {
  if (!setNum) return null;
  const summary = computePointsSummary(setNum, { teamScope: "our" });
  if (!summary) return null;
  if (summary.totalFor === summary.totalAgainst) return null;
  return summary.totalFor > summary.totalAgainst ? "our" : "opponent";
}
function computeSetWinScore() {
  const results = state.setResults || {};
  let totalFor = 0;
  let totalAgainst = 0;
  Object.keys(results).forEach(key => {
    const winner = results[key];
    if (winner === "our") totalFor += 1;
    if (winner === "opponent") totalAgainst += 1;
  });
  return { for: totalFor, against: totalAgainst };
}
function updateSetScoreDisplays() {
  const score = computeSetWinScore();
  const label = score.for + " - " + score.against;
  if (elLiveSetScore) elLiveSetScore.textContent = label;
  if (elAggSetScore) elAggSetScore.textContent = label;
}
function getDerivedServeForSetStart(setNum) {
  const targetSet = Math.min(5, Math.max(1, parseInt(setNum, 10) || 1));
  const setStarts = state.setStarts || {};
  const existing = setStarts[targetSet];
  if (existing && typeof existing.isServing === "boolean") {
    return !!existing.isServing;
  }
  for (let prevSet = targetSet - 1; prevSet >= 1; prevSet -= 1) {
    const prevEntry = setStarts[prevSet];
    if (prevEntry && typeof prevEntry.isServing === "boolean") {
      const distance = targetSet - prevSet;
      return distance % 2 === 0 ? !!prevEntry.isServing : !prevEntry.isServing;
    }
  }
  return targetSet <= 1 ? !!state.isServing : !state.isServing;
}
function buildNextSetDraft(setNum) {
  const nextSet = Math.min(5, Math.max(1, setNum || 1));
  const useDefaults = nextSet === 1;
  const defaultsOur = useDefaults ? getDefaultSetStartForScope("our") : null;
  const defaultsOpp = useDefaults ? getDefaultSetStartForScope("opponent") : null;
  const savedStart = state.setStarts && state.setStarts[nextSet] ? state.setStarts[nextSet] : null;
  const savedOur = savedStart && savedStart.our ? savedStart.our : null;
  const savedOpp = savedStart && savedStart.opponent ? savedStart.opponent : null;
  const baseOurCourt =
    savedOur && savedOur.court
      ? cloneCourt(savedOur.court)
      : defaultsOur && defaultsOur.court
      ? cloneCourt(defaultsOur.court)
      : typeof removeLiberosAndRestoreForScope === "function"
        ? removeLiberosAndRestoreForScope(state.court || [], "our")
        : cloneCourt(state.court || []);
  const baseOppCourt =
    savedOpp && savedOpp.court
      ? cloneCourt(savedOpp.court)
      : defaultsOpp && defaultsOpp.court
      ? cloneCourt(defaultsOpp.court)
      : typeof removeLiberosAndRestoreForScope === "function"
        ? removeLiberosAndRestoreForScope(state.opponentCourt || [], "opponent")
        : cloneCourt(state.opponentCourt || []);
  const our = {
    court: cloneCourt(baseOurCourt),
    rotation:
      savedOur && typeof savedOur.rotation === "number"
        ? savedOur.rotation
        : defaultsOur && defaultsOur.rotation
          ? defaultsOur.rotation
          : state.rotation || 1
  };
  const opponent = {
    court: cloneCourt(baseOppCourt),
    rotation:
      savedOpp && typeof savedOpp.rotation === "number"
        ? savedOpp.rotation
        : defaultsOpp && defaultsOpp.rotation
          ? defaultsOpp.rotation
          : state.opponentRotation || 1
  };
  const serveDefault = getDerivedServeForSetStart(nextSet);
  return {
    setNum: nextSet,
    our,
    opponent,
    swapCourt: savedStart ? !!savedStart.swapCourt : nextSet > 1 ? !state.courtSideSwapped : false,
    isServing: serveDefault
  };
}
function openNextSetLineupModal(scope = "our") {
  if (!nextSetDraft) return;
  lineupModalContext = "next-set";
  lineupModalScope = scope === "opponent" ? "opponent" : "our";
  const entry = lineupModalScope === "opponent" ? nextSetDraft.opponent : nextSetDraft.our;
  lineupModalCourt = cloneCourt((entry && entry.court) || []);
  lineupModalDefaultRotation = entry && typeof entry.rotation === "number" ? entry.rotation : null;
  lineupDragName = "";
  lineupSelectedName = "";
  lineupNumberMode = false;
  renderLineupModal();
  updateLineupModalControls();
  if (elLineupModal) {
    if (isDesktopCourtModalLayout()) {
      setCourtAreaLocked(true);
    }
    updateCourtModalPlacement();
    elLineupModal.classList.remove("hidden");
    setModalOpenState(true);
  }
}
function openNextSetModal(setNum) {
  if (!elNextSetInline) return;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (activeTab !== "scout") return;
  nextSetDraft = buildNextSetDraft(setNum);
  if (elNextSetServeOurLabel) {
    elNextSetServeOurLabel.textContent = getTeamNameForScope("our");
  }
  if (elNextSetServeOppLabel) {
    elNextSetServeOppLabel.textContent = getTeamNameForScope("opponent");
  }
  if (elNextSetSideOurLabel) {
    elNextSetSideOurLabel.textContent = getTeamNameForScope("our");
  }
  if (elNextSetSideOppLabel) {
    elNextSetSideOppLabel.textContent = getTeamNameForScope("opponent");
  }
  if (elNextSetTeamOur) {
    elNextSetTeamOur.textContent = getTeamNameForScope("our");
  }
  if (elNextSetTeamOpp) {
    elNextSetTeamOpp.textContent = getTeamNameForScope("opponent");
  }
  if (elNextSetSwapCourt) {
    elNextSetSwapCourt.checked = !!nextSetDraft.swapCourt;
    elNextSetSwapCourt.disabled = false;
  }
  if (elNextSetServeOur) elNextSetServeOur.checked = !!nextSetDraft.isServing;
  if (elNextSetServeOpp) elNextSetServeOpp.checked = !nextSetDraft.isServing;
  if (elNextSetLineups) {
    elNextSetLineups.classList.toggle("next-set-lineups--double", !!state.useOpponentTeam);
  }
  if (elNextSetBlockOpp) {
    elNextSetBlockOpp.classList.toggle("hidden", !state.useOpponentTeam);
  }
  const isFirstSet = nextSetDraft.setNum === 1;
  if (elNextSetSwapRow) elNextSetSwapRow.classList.toggle("hidden", isFirstSet);
  if (elNextSetSides) elNextSetSides.classList.toggle("hidden", !isFirstSet);
  if (elNextSetSideOur) elNextSetSideOur.checked = !nextSetDraft.swapCourt;
  if (elNextSetSideOpp) elNextSetSideOpp.checked = !!nextSetDraft.swapCourt;
  if (elNextSetCancel) elNextSetCancel.classList.toggle("hidden", isFirstSet);
  if (elNextSetClose) elNextSetClose.classList.toggle("hidden", isFirstSet);
  const title = document.getElementById("next-set-title");
  if (title) title.textContent = "Preparazione set " + nextSetDraft.setNum;
  elNextSetInline.classList.remove("hidden");
  elNextSetInline.setAttribute("aria-hidden", "false");
  nextSetModalOpen = true;
  setScoutControlsDisabled(true);
  const courtArea = document.getElementById("court-area");
  if (courtArea) {
    courtArea.classList.add("court-area--next-set");
  }
  renderNextSetLineups();
  syncNextSetPreferredLiberoSelects();
}
function closeNextSetModal({ force = false } = {}) {
  if (!elNextSetInline) return;
  if (!force && nextSetDraft && nextSetDraft.setNum === 1) return;
  elNextSetInline.classList.add("hidden");
  elNextSetInline.setAttribute("aria-hidden", "true");
  nextSetDraft = null;
  nextSetModalOpen = false;
  setScoutControlsDisabled(!!state.matchFinished);
  nextSetDragName = "";
  nextSetDragFromIdx = null;
  nextSetDragScope = null;
  const courtArea = document.getElementById("court-area");
  if (courtArea) {
    courtArea.classList.remove("court-area--next-set");
  }
}
function applyNextSetDraft() {
  if (!nextSetDraft) return;
  const prevSet = state.currentSet || 1;
  const nextSet = nextSetDraft.setNum || prevSet;
  const prevSetResults = cloneSetMap(state.setResults);
  const prevSetStarts = cloneSetMap(state.setStarts);
  const nextSetResults = cloneSetMap(prevSetResults);
  if (nextSet > 1 && !nextSetResults[prevSet]) {
    const winner = computeSetWinner(prevSet);
    if (winner) nextSetResults[prevSet] = winner;
  }
  const nextSetStarts = cloneSetMap(prevSetStarts);
  const ourRotation =
    typeof nextSetDraft.our.rotation === "number"
      ? nextSetDraft.our.rotation
      : state.rotation || 1;
  const oppRotation =
    typeof nextSetDraft.opponent.rotation === "number"
      ? nextSetDraft.opponent.rotation
      : state.opponentRotation || 1;
  nextSetStarts[nextSet] = {
    our: { court: cloneCourt(nextSetDraft.our.court || []), rotation: ourRotation },
    opponent: { court: cloneCourt(nextSetDraft.opponent.court || []), rotation: oppRotation },
    swapCourt: !!nextSetDraft.swapCourt,
    isServing: !!nextSetDraft.isServing
  };
  state.setResults = nextSetResults;
  state.setStarts = nextSetStarts;
  state.courtSideSwapped = !!nextSetDraft.swapCourt;
  syncCourtSideLayout();
  if (typeof commitCourtChange === "function") {
    commitCourtChange(cloneCourt(nextSetDraft.our.court || []), { clean: true });
  } else {
    state.court = cloneCourt(nextSetDraft.our.court || []);
  }
  if (typeof commitCourtChangeForScope === "function") {
    commitCourtChangeForScope(cloneCourt(nextSetDraft.opponent.court || []), "opponent");
  } else {
    state.opponentCourt = cloneCourt(nextSetDraft.opponent.court || []);
  }
  if (typeof setRotation === "function") {
    setRotation(ourRotation);
  } else {
    state.rotation = ourRotation;
  }
  if (typeof setOpponentRotation === "function") {
    setOpponentRotation(oppRotation);
  } else {
    state.opponentRotation = oppRotation;
  }
  if (typeof setIsServing === "function") {
    setIsServing(!!nextSetDraft.isServing);
  } else {
    state.isServing = !!nextSetDraft.isServing;
  }
  state.flowTeamScope = state.isServing ? "our" : "opponent";
  state.pendingServe = null;
  state.forceSkillActive = false;
  state.forceSkillScope = null;
  state.skillFlowOverride = null;
  state.opponentSkillFlowOverride = null;
  if (typeof cancelPartialSkillFlowForScope === "function") {
    cancelPartialSkillFlowForScope("our");
    cancelPartialSkillFlowForScope("opponent");
  }
  if (typeof enforceAutoLiberoForState === "function") {
    enforceAutoLiberoForState({ skipServerOnServe: true });
    if (state.useOpponentTeam && typeof enforceAutoLiberoForScope === "function") {
      enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
    }
  }
  if (nextSet !== prevSet) {
    applySetChange(nextSet, {
      prevSet,
      nextSet,
      prevFinished: !!state.matchFinished,
      nextFinished: false,
      actionType: "set-change",
      prevSetResults,
      nextSetResults,
      prevSetStarts,
      nextSetStarts
    });
  } else {
    state.matchFinished = false;
    saveState({ persistLocal: true });
    renderEventsLog();
    renderLiveScore();
    updateMatchStatusUI();
  }
  renderPlayers();
  renderBenchChips();
  renderLineupChips();
  renderOpponentPlayers();
  updateSetScoreDisplays();
  closeNextSetModal({ force: true });
}
function shouldOpenNextSetModal() {
  const hasEvents = state.events && state.events.length > 0;
  const currentSet = state.currentSet || 1;
  const hasStart = state.setStarts && state.setStarts[currentSet];
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  return activeTab === "scout" && !hasEvents && !hasStart;
}
