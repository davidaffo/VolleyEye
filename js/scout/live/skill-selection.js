function getLineupModalPlayers() {
  return lineupModalScope === "opponent" ? state.opponentPlayers || [] : state.players || [];
}
function getLineupModalLiberos() {
  return lineupModalScope === "opponent" ? state.opponentLiberos || [] : state.liberos || [];
}
function getLineupModalNumbers() {
  return lineupModalScope === "opponent" ? state.opponentPlayerNumbers || {} : state.playerNumbers || {};
}
function getLineupModalPreferredLibero() {
  if (typeof getTeamPreferredLibero === "function") {
    return getTeamPreferredLibero(lineupModalScope);
  }
  return lineupModalScope === "opponent" ? state.opponentPreferredLibero || "" : state.preferredLibero || "";
}
function setLineupModalPreferredLibero(name) {
  const next = name || "";
  if (typeof setTeamPreferredLibero === "function") {
    setTeamPreferredLibero(lineupModalScope, next);
  } else if (lineupModalScope === "opponent") {
    state.opponentPreferredLibero = next;
  } else {
    state.preferredLibero = next;
  }
  if (typeof setTeamLiberoAutoMap === "function") {
    setTeamLiberoAutoMap(lineupModalScope, {});
  }
  if (typeof enforceAutoLiberoForScope === "function") {
    enforceAutoLiberoForScope(lineupModalScope, { skipServerOnServe: true });
  }
}
function syncLineupPreferredLiberoSelect() {
  if (!elLineupPreferredLibero) return;
  const liberos = getLineupModalLiberos();
  const numbers = getLineupModalNumbers();
  const preferred = getLineupModalPreferredLibero();
  const ordered = typeof sortNamesByNumber === "function" ? sortNamesByNumber(liberos, numbers) : liberos.slice();
  elLineupPreferredLibero.innerHTML = "";
  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "-";
  elLineupPreferredLibero.appendChild(emptyOpt);
  ordered.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent =
      lineupModalScope === "opponent"
        ? formatNameWithNumberFor(name, numbers)
        : formatNameWithNumber(name);
    elLineupPreferredLibero.appendChild(opt);
  });
  elLineupPreferredLibero.value = preferred && ordered.includes(preferred) ? preferred : "";
  elLineupPreferredLibero.disabled = ordered.length === 0;
  if (!elLineupPreferredLibero._preferredBound) {
    elLineupPreferredLibero.addEventListener("change", () => {
      const next = elLineupPreferredLibero.value || "";
      setLineupModalPreferredLibero(next);
      saveState();
      if (lineupModalScope === "opponent") {
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
      if (typeof renderLiberoChipsInline === "function") {
        renderLiberoChipsInline();
      }
      if (typeof renderOpponentLiberoChipsInline === "function") {
        renderOpponentLiberoChipsInline();
      }
    });
    elLineupPreferredLibero._preferredBound = true;
  }
}
function formatLineupModalName(name, options = {}) {
  return formatNameWithNumber(name, options);
}
function getBenchForLineupWithRoster(court, rosterNames, liberos, numbersMap) {
  const libSet = new Set(liberos || []);
  const used = new Set();
  getCourtShape(court).forEach(slot => {
    const name = slot.main || "";
    if (name) used.add(name);
  });
  const bench = (rosterNames || []).filter(name => name && !libSet.has(name) && !used.has(name));
  if (typeof sortNamesByNumber === "function") {
    return sortNamesByNumber(bench, numbersMap || {});
  }
  return bench;
}
function updateLineupModalControls() {
  const isNextSet = lineupModalContext === "next-set";
  const isSetStartEdit = lineupModalContext === "set-start";
    if (elLineupModalSaveOverride) {
      elLineupModalSaveOverride.classList.remove("hidden");
      elLineupModalSaveOverride.textContent = isNextSet ? "Salva formazione" : "Metti in campo (Override)";
    }
  if (elLineupModalSaveSubstitution) {
    elLineupModalSaveSubstitution.classList.toggle("hidden", isNextSet);
  }
  if (elLineupModalTitle) {
    elLineupModalTitle.textContent =
      lineupModalScope === "opponent" ? "Imposta formazione avversaria" : "Imposta formazione";
  }
  if (elLineupModalToggleNumbers) {
    elLineupModalToggleNumbers.textContent = lineupNumberMode ? "Esci modalità numeri" : "Modalità numeri";
  }
}
function applyDefaultLineupToModal() {
  const teamName = lineupModalScope === "opponent" ? state.selectedOpponentTeam || "" : state.selectedTeam || "";
  if (!teamName) {
    alert("Seleziona prima una squadra.");
    return;
  }
  if (typeof loadTeamFromStorage !== "function" || typeof extractRosterFromTeam !== "function") {
    alert("Funzioni squadra non disponibili.");
    return;
  }
  const team = loadTeamFromStorage(teamName);
  if (!team) {
    alert("Squadra non trovata o corrotta.");
    return;
  }
  const roster = extractRosterFromTeam(team);
  const fallback = roster.playersDetailed && roster.playersDetailed.length > 0
    ? roster.playersDetailed.filter(p => !p.out).map(p => p.name)
    : roster.players || [];
  const names =
    roster.defaultLineup && roster.defaultLineup.length > 0 ? roster.defaultLineup : fallback;
  lineupModalCourt = Array.from({ length: 6 }, (_, idx) => ({ main: names[idx] || "", replaced: "" }));
  lineupModalDefaultRotation = roster.defaultRotation || 1;
  renderLineupModal();
}
function applyNumberToLineupSlot(slotIdx, rawValue) {
  const value = (rawValue || "").trim();
  if (!value) return false;
  const players = getLineupModalPlayers();
  const numbers = getLineupModalNumbers();
  const matchName = players.find(name => numbers[name] === value);
  if (!matchName) return false;
  assignPlayerToLineup(matchName, slotIdx);
  return true;
}
function focusLineupNumberInput(slotIdx) {
  const input = elLineupModalCourt
    ? elLineupModalCourt.querySelector(`.lineup-number-input[data-slot-index="${slotIdx}"]`)
    : null;
  if (input) {
    input.focus();
    input.select();
  }
}
function exitLineupNumberMode() {
  lineupNumberMode = false;
  renderLineupModal();
}
function getSortedPlayerEntries() {
  const players = state.players || [];
  const numbers = state.playerNumbers || {};
  const names = typeof sortNamesByNumber === "function" ? sortNamesByNumber(players, numbers) : players.slice();
  const idxMap = new Map(players.map((name, idx) => [name, idx]));
  return names
    .map(name => ({ name, idx: idxMap.get(name) }))
    .filter(entry => typeof entry.idx === "number");
}
function getSortedPlayerEntriesForScope(scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const names = typeof sortNamesByNumber === "function" ? sortNamesByNumber(players, numbers) : players.slice();
  const idxMap = new Map(players.map((name, idx) => [name, idx]));
  return names
    .map(name => ({ name, idx: idxMap.get(name) }))
    .filter(entry => typeof entry.idx === "number");
}
function sortPlayerOptionsByNumber(options) {
  const players = state.players || [];
  const numbers = state.playerNumbers || {};
  const getNum = idx => {
    const name = players[idx];
    if (!name) return null;
    const raw = numbers[name];
    const parsed = raw !== undefined && raw !== null && raw !== "" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  return options.slice().sort((a, b) => {
    const idxA = Number(a.value);
    const idxB = Number(b.value);
    const numA = getNum(idxA);
    const numB = getNum(idxB);
    if (numA === null && numB === null) {
      return String(a.label || "").localeCompare(String(b.label || ""), "it", { sensitivity: "base" });
    }
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return String(a.label || "").localeCompare(String(b.label || ""), "it", { sensitivity: "base" });
  });
}
function sortPlayerOptionsByNumberForScope(options, scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const getNum = idx => {
    const name = players[idx];
    if (!name) return null;
    const raw = numbers[name];
    const parsed = raw !== undefined && raw !== null && raw !== "" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  return options.slice().sort((a, b) => {
    const idxA = Number(a.value);
    const idxB = Number(b.value);
    const numA = getNum(idxA);
    const numB = getNum(idxB);
    if (numA === null && numB === null) {
      return String(a.label || "").localeCompare(String(b.label || ""), "it", { sensitivity: "base" });
    }
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return String(a.label || "").localeCompare(String(b.label || ""), "it", { sensitivity: "base" });
  });
}
function sortPlayerIndexesByNumber(indices) {
  const players = state.players || [];
  const numbers = state.playerNumbers || {};
  const getNum = idx => {
    const name = players[idx];
    if (!name) return null;
    const raw = numbers[name];
    const parsed = raw !== undefined && raw !== null && raw !== "" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  return indices.slice().sort((a, b) => {
    const numA = getNum(a);
    const numB = getNum(b);
    if (numA === null && numB === null) return a - b;
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return a - b;
  });
}
function sortPlayerIndexesByNumberForScope(indices, scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const getNum = idx => {
    const name = players[idx];
    if (!name) return null;
    const raw = numbers[name];
    const parsed = raw !== undefined && raw !== null && raw !== "" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  return indices.slice().sort((a, b) => {
    const numA = getNum(a);
    const numB = getNum(b);
    if (numA === null && numB === null) return a - b;
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return a - b;
  });
}
function setServeTypeSelection(type) {
  const t = (type || "").toUpperCase();
  const normalized = t === "F" || t === "S" ? t : "JF";
  serveTrajectoryType = normalized;
  if (!elServeTypeButtons) return;
  const btns = elServeTypeButtons.querySelectorAll("[data-serve-type]");
  btns.forEach(btn => {
    const isActive = (btn.dataset.serveType || "").toUpperCase() === normalized;
    btn.classList.toggle("active", isActive);
  });
}
if (elServeTypeButtons) {
  elServeTypeButtons.addEventListener("click", e => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const type = (target.dataset.serveType || "").toUpperCase();
    if (!type) return;
    setServeTypeSelection(type);
  });
  setServeTypeSelection("JF");
}
function bindServeTypeInlineListener(playerIdx, onSelect, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  serveTypeSelectHandlers[key] = onSelect;
  if (serveTypeInlineHandler) return;
  serveTypeInlineHandler = e => {
    const key = (e.key || "").toUpperCase();
    if (key !== "F" && key !== "J" && key !== "S") return;
    const activePlayer =
      serveTypeInlinePlayer !== null ? serveTypeInlinePlayer : serveTypeFocusPlayer;
    if (activePlayer === null || activePlayer === undefined) return;
    const handler = serveTypeSelectHandlers[activePlayer];
    if (typeof handler === "function") {
      handler(key === "J" ? "JF" : key);
    }
  };
  window.addEventListener("keydown", serveTypeInlineHandler);
}
function setServeTypeFocusPlayer(playerIdx, scope = "our") {
  serveTypeFocusPlayer = makePlayerKey(scope, playerIdx);
}
function removeServeTypeInlineKeyListener() {
  if (serveTypeInlineHandler) {
    window.removeEventListener("keydown", serveTypeInlineHandler);
    serveTypeInlineHandler = null;
  }
}
function clearServeTypeInlineListener() {
  removeServeTypeInlineKeyListener();
  serveTypeInlinePlayer = null;
  serveTypeFocusPlayer = null;
  Object.keys(serveTypeSelectHandlers).forEach(key => {
    delete serveTypeSelectHandlers[key];
  });
}
function clearAttackSelection(playerIdx = null, scope = "our") {
  if (playerIdx === null || playerIdx === undefined) {
    attackInlinePlayer = null;
    Object.keys(attackMetaByPlayer).forEach(key => {
      delete attackMetaByPlayer[key];
    });
    return;
  }
  const key = makePlayerKey(scope, playerIdx);
  delete attackMetaByPlayer[key];
  if (attackInlinePlayer === key) {
    attackInlinePlayer = null;
  }
}
function resetSkillSelectionForPlayer(playerIdx, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  delete serveMetaByPlayer[key];
  delete blockConfirmByPlayer[key];
  if (serveTypeInlinePlayer === key || serveTypeFocusPlayer === key) {
    clearServeTypeInlineListener();
  }
  clearAttackSelection(playerIdx, scope);
  setSelectedSkillForScope(scope, playerIdx, null);
}
function cancelPartialSkillFlowForScope(scope = "our") {
  const targetScope = scope || "our";
  const prefix = targetScope + ":";
  const playerIdxs = new Set();
  const collectFromKey = key => {
    if (!key || !key.startsWith(prefix)) return;
    const idx = parseInt(key.slice(prefix.length), 10);
    if (!Number.isNaN(idx)) playerIdxs.add(idx);
  };
  [selectedSkillPerPlayer, serveMetaByPlayer, attackMetaByPlayer, blockConfirmByPlayer, serveTypeSelectHandlers]
    .forEach(mapObj => {
      Object.keys(mapObj || {}).forEach(collectFromKey);
    });
  [attackInlinePlayer, serveTypeInlinePlayer, serveTypeFocusPlayer, blockInlinePlayer].forEach(collectFromKey);
  if (
    activeSkillModalContext &&
    activeSkillModalContext.scope === targetScope &&
    typeof activeSkillModalContext.playerIdx === "number"
  ) {
    playerIdxs.add(activeSkillModalContext.playerIdx);
  }
  playerIdxs.forEach(playerIdx => resetSkillSelectionForPlayer(playerIdx, targetScope));
  if (activeSkillModalContext && activeSkillModalContext.scope === targetScope) {
    closeSkillModal();
  }
  if (isErrorPickModeForScope(targetScope)) {
    stopErrorPickMode({ render: false });
  }
}
function shouldPromptAttackSetType(scope = "our") {
  const enabled =
    scope === "opponent" ? state.opponentSetTypePromptEnabled : state.setTypePromptEnabled;
  return !!enabled;
}
function applyAttackTrajectoryToEvent(event, payload) {
  if (!payload || !event) return;
  event.attackStart = payload.start || event.attackStart || null;
  event.attackEnd = payload.end || event.attackEnd || null;
  event.attackStartZone = payload.startZone || event.attackStartZone || null;
  event.attackEndZone = payload.endZone || event.attackEndZone || null;
  event.attackDirection = payload;
  event.attackTrajectory = payload;
  if (!event.originZone) {
    event.originZone = event.attackStartZone || event.originZone || null;
  }
  if (event.attackStartZone) {
    event.zone = event.attackStartZone;
    event.playerPosition = event.attackStartZone;
  }
}
async function startAttackSelection(playerIdx, setTypeChoice, onDone, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  if (
    attackInlinePlayer !== null &&
    attackInlinePlayer !== key &&
    isPlayerKeyInScope(attackInlinePlayer, scope)
  ) {
    return;
  }
  attackInlinePlayer = key;
  const meta = { setType: setTypeChoice || null, playerIdx, scope };
  if (state.videoScoutMode) {
    const videoTime = getActiveVideoPlaybackSeconds();
    if (typeof videoTime === "number") meta.videoTime = videoTime;
  }
  const trajectoryEnabled =
    scope === "opponent" ? state.opponentAttackTrajectoryEnabled : state.attackTrajectoryEnabled;
  if (trajectoryEnabled) {
    const baseZone = getCurrentZoneForPlayer(playerIdx, "attack", scope);
    const forceFar = isFarSideForScope(scope);
    const coords = await openAttackTrajectoryModal({
      baseZone: baseZone || null,
      setType: setTypeChoice || null,
      forceFar,
      scope
    });
    if (coords) {
      meta.trajectory = coords;
      meta.trajectorySkipped = false;
    } else {
      meta.trajectorySkipped = true;
    }
  }
  attackMetaByPlayer[key] = meta;
  if (state.useOpponentTeam && state.predictiveSkillFlow) {
    if (scope === "opponent") {
      state.opponentSkillFlowOverride = "attack";
    } else {
      state.skillFlowOverride = "attack";
    }
  }
  if (typeof onDone === "function") {
    onDone();
  }
}
function getServeBaseZoneForPlayer(playerIdx, scope = "our") {
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players || !players[playerIdx]) return null;
  const name = players[playerIdx];
  const baseCourt = getServeDisplayCourt(scope);
  if (!baseCourt || !baseCourt.length) return null;
  const slotIdx = baseCourt.findIndex(slot => slot && slot.main === name);
  return slotIdx === -1 ? null : slotIdx + 1;
}
function maybeRotateServeToZoneOne(playerIdx, scope = "our") {
  // disabilitato: la battuta è consentita solo alla giocatrice in zona 1
}
async function startServeTypeSelection(playerIdx, type, onDone, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  if (serveTypeInlinePlayer !== null && serveTypeInlinePlayer !== key) return;
  serveTypeInlinePlayer = key;
  setServeTypeFocusPlayer(playerIdx, scope);
  removeServeTypeInlineKeyListener();
  const zone = getServeBaseZoneForPlayer(playerIdx, scope);
  if (zone !== 1) {
    serveTypeInlinePlayer = null;
    return;
  }
  const meta = { serveType: type };
  const serveTrajEnabled =
    scope === "opponent" ? state.opponentServeTrajectoryEnabled : state.serveTrajectoryEnabled;
  if (serveTrajEnabled) {
    const forceFar = isFarSideForScope(scope);
    const traj = await collectServeTrajectory(Object.assign({}, meta, { forceFar, scope }));
    meta.serveType = traj.serveType || type;
    meta.serveStart = traj.serveStart || null;
    meta.serveEnd = traj.serveEnd || null;
    if (typeof traj.videoTime === "number") {
      meta.videoTime = traj.videoTime;
    }
  } else if (state.videoScoutMode) {
    const videoTime = getActiveVideoPlaybackSeconds();
    if (typeof videoTime === "number") meta.videoTime = videoTime;
  }
  const shouldQueueServe = state.useOpponentTeam && state.predictiveSkillFlow;
  if (shouldQueueServe) {
    const players = getPlayersForScope(scope);
    const fallbackServer = getServerPlayerForScope(scope);
    state.pendingServe = {
      scope,
      playerIdx,
      playerName: players[playerIdx] || (fallbackServer && fallbackServer.name) || null,
      meta
    };
    clearServeTypeInlineListener();
    if (state.forceSkillActive && state.forceSkillScope === scope) {
      state.forceSkillActive = false;
      state.forceSkillScope = null;
      if (scope === "opponent") {
        state.opponentSkillFlowOverride = null;
      } else {
        state.skillFlowOverride = null;
      }
    }
    state.flowTeamScope = getOppositeScope(scope);
    setSelectedSkillForScope(scope, playerIdx, null);
    delete serveMetaByPlayer[key];
  } else {
    serveMetaByPlayer[key] = meta;
  }
  if (typeof onDone === "function") {
    onDone();
  }
}
async function collectServeTrajectory(prefill = {}) {
  const startRes = await openAttackTrajectoryModal({
    mode: "serve-start",
    start: prefill.serveStart || null,
    serveType: prefill.serveType || null,
    forceFar: prefill.forceFar,
    scope: prefill.scope
  });
  const serveType = (startRes && startRes.serveType) || prefill.serveType || "JF";
  const serveStart = startRes && startRes.point ? startRes.point : prefill.serveStart || null;
  const endRes = await openAttackTrajectoryModal({
    mode: "serve-end",
    end: prefill.serveEnd || null,
    forceFar: prefill.forceFar,
    scope: prefill.scope
  });
  const serveEnd = endRes && endRes.point ? endRes.point : prefill.serveEnd || null;
  let videoTime = null;
  if (state.videoScoutMode && endRes && endRes.point) {
    const activeVideoTime = getActiveVideoPlaybackSeconds();
    if (typeof activeVideoTime === "number") {
      videoTime = activeVideoTime;
    }
  }
  return { serveType, serveStart, serveEnd, videoTime };
}
