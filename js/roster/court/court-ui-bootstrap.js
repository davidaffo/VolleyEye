function updatePlayersList(newPlayers, options = {}) {
  const {
    askReset = true,
    liberos = null,
    playerNumbers = null,
    captains = null,
    setDefaultLineup = false,
    defaultLineupNames = null,
    defaultLineupRotation = null,
    preserveCourt = false,
    preferredLibero = null,
    preserveFlowState = false
  } = options;
  const normalized = normalizePlayers(newPlayers);
  const changed = playersChanged(normalized);
  if (changed && askReset && hasMatchDataForReset()) {
    alert(
      "Il roster non può essere sostituito durante lo scout. Usa Modifica rapida per aggiungere o correggere giocatrici."
    );
    return false;
  }
  const providedNumbers = playerNumbers && typeof playerNumbers === "object" ? playerNumbers : null;
  const providedLiberos = Array.isArray(liberos) ? liberos : null;
  const candidateCaptains = Array.isArray(captains) ? captains : state.captains || [];
  const normalizedCaptains = normalizePlayers(candidateCaptains).filter(name => normalized.includes(name));
  const chosenCaptain = normalizedCaptains[0] || "";
  const nextCaptains = chosenCaptain ? [chosenCaptain] : [];
  const nextNumbers = buildNumbersForNames(normalized, providedNumbers || state.playerNumbers || {});
  const nextLiberos = (providedLiberos || state.liberos || []).filter(name => normalized.includes(name));
  const preferred =
    typeof preferredLibero === "string" && preferredLibero && nextLiberos.includes(preferredLibero)
      ? preferredLibero
      : nextLiberos.includes(state.preferredLibero)
        ? state.preferredLibero
        : nextLiberos[0] || "";
  const lineupNames =
    Array.isArray(defaultLineupNames) && defaultLineupNames.length > 0
      ? normalizePlayers(defaultLineupNames).filter(name => normalized.includes(name))
      : normalized;

  if (!changed) {
    state.playerNumbers = nextNumbers;
    state.liberos = nextLiberos;
    state.captains = nextCaptains;
    setTeamPreferredLibero("our", preferred);
    if (setDefaultLineup) {
      applyDefaultLineup(lineupNames, defaultLineupRotation);
    }
    sanitizeRosterIsolation("our");
    saveState();
    applyPlayersFromStateToTextarea();
    renderPlayersManagerList();
  } else {
    if (!preserveFlowState && typeof resetSetTypeState === "function") {
      resetSetTypeState();
    }
    state.players = normalized;
    state.playerNumbers = nextNumbers;
    if (!preserveCourt) {
      ensureCourtShape();
      state.court = Array.from({ length: 6 }, () => ({ main: "" }));
      state.rotation = 1;
    } else {
      ensureCourtShape();
      cleanCourtPlayers();
    }
    state.liberos = nextLiberos;
    state.captains = nextCaptains;
    setTeamPreferredLibero("our", preferred);
    if (setDefaultLineup) {
      applyDefaultLineup(lineupNames, defaultLineupRotation);
    }
    state.autoRoleBaseCourt = null;
    autoRoleBaseCourt = null;
    resetAutoRoleCache();
    ensureMetricsConfigDefaults();
    state.savedTeams = state.savedTeams || {};
    sanitizeRosterIsolation("our");
    saveState();
    applyPlayersFromStateToTextarea();
    renderPlayersManagerList();
  }

  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  renderLiberoTags();
  renderMetricsConfig();
  renderTeamsSelect();
  updateRotationDisplay();
  renderEventsLog();
  renderAggregatedTable();
  return true;
}
function addPlayerFromInput() {
  if (!elNewPlayerInput) return;
  const rawName = elNewPlayerInput.value.trim();
  const normalizedName = normalizePlayers([rawName])[0];
  if (!normalizedName) {
    alert("Inserisci un nome per aggiungere una giocatrice.");
    return;
  }
  const exists = (state.players || []).some(
    p => p.toLowerCase() === normalizedName.toLowerCase()
  );
  if (exists) {
    alert("Questa giocatrice è già presente nella lista.");
    return;
  }
  const nextNumbers = Object.assign({}, state.playerNumbers || {});
  nextNumbers[normalizedName] = "";
  updatePlayersList([normalizedName, ...(state.players || [])], {
    askReset: true,
    playerNumbers: nextNumbers
  });
  elNewPlayerInput.value = "";
  elNewPlayerInput.focus();
}
function removePlayerAtIndex(idx) {
  if (!state.players || !state.players[idx]) return;
  const name = state.players[idx] || "questa giocatrice";
  const ok = confirm("Eliminare " + name + "?");
  if (!ok) return;
  const newList = state.players.filter((_, i) => i !== idx);
  updatePlayersList(newList, { askReset: true });
}
function handleBenchDragStart(e) {
  const target = e.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const name = target.dataset.playerName;
  if (!name || !e.dataTransfer) return;
  const scope = target.dataset.teamScope || "our";
  if (!isLiberoForScope(name, scope)) return;
  draggedPlayerName = name;
  draggedFromPos = null;
  dragSourceType = "bench";
  draggedScope = scope;
  e.dataTransfer.setData("text/plain", name);
  e.dataTransfer.effectAllowed = "move";
  if (activeDropChip) {
    activeDropChip.classList.remove("drop-over");
    activeDropChip = null;
  }
}
function handleBenchDragEnd() {
  resetDragState();
}
function handleLiberoReplacedDragStart(e, name) {
  if (!name || !e.dataTransfer) return;
  draggedPlayerName = name;
  draggedFromPos = null;
  dragSourceType = "libero-return";
  e.dataTransfer.setData("text/plain", name);
  e.dataTransfer.effectAllowed = "move";
  if (activeDropChip) {
    activeDropChip.classList.remove("drop-over");
    activeDropChip = null;
  }
}
function handleBenchDropZoneOver(e) {
  if (dragSourceType !== "court" || draggedFromPos === null) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  if (elBenchChips) elBenchChips.classList.add("bench-drop-over");
}
function handleBenchDropZoneLeave() {
  if (elBenchChips) elBenchChips.classList.remove("bench-drop-over");
}
function handleBenchDropZoneDrop(e) {
  e.preventDefault();
  if (dragSourceType === "court" && draggedFromPos !== null) {
    clearCourtAssignment(draggedFromPos, "main");
  }
  handleBenchDropZoneLeave();
  resetDragState();
}
function ensureBenchTouchListeners() {
  if (benchTouchListenersAttached) return;
  document.addEventListener("touchmove", handleBenchTouchMove, { passive: false });
  document.addEventListener("touchend", handleBenchTouchEnd, { passive: false });
  document.addEventListener("touchcancel", handleBenchTouchCancel, { passive: false });
  document.addEventListener("pointermove", handleBenchPointerMove, { passive: false });
  document.addEventListener("pointerup", handleBenchPointerUp, { passive: false });
  document.addEventListener("pointercancel", handleBenchPointerCancel, { passive: false });
  benchTouchListenersAttached = true;
}
function createBenchTouchGhost(text, x, y) {
  if (touchBenchGhost && touchBenchGhost.parentNode) {
    touchBenchGhost.parentNode.removeChild(touchBenchGhost);
  }
  const ghost = document.createElement("div");
  ghost.className = "touch-drag-ghost";
  ghost.textContent = text;
  ghost.style.left = x + "px";
  ghost.style.top = y + "px";
  document.body.appendChild(ghost);
  touchBenchGhost = ghost;
}
function moveBenchTouchGhost(x, y) {
  if (!touchBenchGhost) return;
  touchBenchGhost.style.left = x + "px";
  touchBenchGhost.style.top = y + "px";
}
function clearBenchTouch() {
  const prev = document.querySelector(".court-card.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (touchBenchGhost && touchBenchGhost.parentNode) {
    touchBenchGhost.parentNode.removeChild(touchBenchGhost);
  }
  touchBenchGhost = null;
  touchBenchName = "";
  touchBenchOverPos = -1;
  touchBenchPointerId = null;
  document.body.style.overflow = "";
}
function updateBenchTouchOver(x, y) {
  const elAt = document.elementFromPoint(x, y);
  const card = elAt && elAt.closest(".court-card");
  const prev = document.querySelector(".court-card.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (!card || !card.dataset.posIndex || (card.dataset.teamScope || "our") !== touchBenchScope) {
    touchBenchOverPos = -1;
    return;
  }
  const posIdx = parseInt(card.dataset.posIndex, 10);
  if (isNaN(posIdx) || !canPlaceInSlotForScope(touchBenchName, posIdx, false, touchBenchScope)) {
    touchBenchOverPos = -1;
    return;
  }
  touchBenchOverPos = posIdx;
  card.classList.add("drop-over");
}
function handleBenchTouchStart(e, name, scope = "our") {
  const t = e.touches && e.touches[0];
  if (!t) return;
  ensureBenchTouchListeners();
  touchBenchName = name;
  touchBenchScope = scope || "our";
  touchBenchStart = { x: t.clientX, y: t.clientY };
  const label =
    touchBenchScope === "opponent"
      ? formatNameWithNumberFor(name, state.opponentPlayerNumbers || {})
      : formatNameWithNumber(name);
  createBenchTouchGhost(label, t.clientX, t.clientY);
  updateBenchTouchOver(t.clientX, t.clientY);
  document.body.style.overflow = "hidden";
  e.stopPropagation();
  e.preventDefault();
}
function handleBenchTouchMove(e) {
  if (!touchBenchName) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  moveBenchTouchGhost(t.clientX, t.clientY);
  updateBenchTouchOver(t.clientX, t.clientY);
  e.stopPropagation();
  e.preventDefault();
}
function handleBenchTouchEnd(e) {
  if (!touchBenchName) return;
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  const endX = t ? t.clientX : touchBenchStart.x;
  const endY = t ? t.clientY : touchBenchStart.y;
  const dist = Math.hypot(endX - touchBenchStart.x, endY - touchBenchStart.y);
  if (dist < 8) {
    handleBenchClickForScope(touchBenchName, touchBenchScope);
    clearBenchTouch();
    return;
  }
  if (touchBenchOverPos >= 0 && canPlaceInSlotForScope(touchBenchName, touchBenchOverPos, true, touchBenchScope)) {
    setCourtPlayerForScope(touchBenchOverPos, "main", touchBenchName, touchBenchScope);
  }
  e.stopPropagation();
  clearBenchTouch();
}
function handleBenchTouchCancel() {
  clearBenchTouch();
}
function handleBenchPointerDown(e, name, scope = "our") {
  if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
  ensureBenchTouchListeners();
  touchBenchPointerId = e.pointerId;
  touchBenchName = name;
  touchBenchScope = scope || "our";
  touchBenchStart = { x: e.clientX, y: e.clientY };
  const label =
    touchBenchScope === "opponent"
      ? formatNameWithNumberFor(name, state.opponentPlayerNumbers || {})
      : formatNameWithNumber(name);
  createBenchTouchGhost(label, e.clientX, e.clientY);
  updateBenchTouchOver(e.clientX, e.clientY);
  document.body.style.overflow = "hidden";
  if (e.target && typeof e.target.setPointerCapture === "function") {
    e.target.setPointerCapture(e.pointerId);
  }
  e.stopPropagation();
  e.preventDefault();
}
function handleBenchPointerMove(e) {
  if (touchBenchPointerId === null || e.pointerId !== touchBenchPointerId) return;
  if (!touchBenchName) return;
  moveBenchTouchGhost(e.clientX, e.clientY);
  updateBenchTouchOver(e.clientX, e.clientY);
  e.stopPropagation();
  e.preventDefault();
}
function handleBenchPointerUp(e) {
  if (touchBenchPointerId === null || e.pointerId !== touchBenchPointerId) return;
  if (e.target && typeof e.target.releasePointerCapture === "function") {
    e.target.releasePointerCapture(e.pointerId);
  }
  handleBenchPointerDrop(e);
}
function handleBenchPointerCancel(e) {
  if (touchBenchPointerId === null || e.pointerId !== touchBenchPointerId) return;
  if (e.target && typeof e.target.releasePointerCapture === "function") {
    e.target.releasePointerCapture(e.pointerId);
  }
  clearBenchTouch();
  touchBenchPointerId = null;
}
function handleBenchPointerDrop(e) {
  if (!touchBenchName) {
    clearBenchTouch();
    touchBenchPointerId = null;
    return;
  }
  const dist = Math.hypot(e.clientX - touchBenchStart.x, e.clientY - touchBenchStart.y);
  if (dist < 8) {
    handleBenchClickForScope(touchBenchName, touchBenchScope);
  } else if (
    touchBenchOverPos >= 0 &&
    canPlaceInSlotForScope(touchBenchName, touchBenchOverPos, true, touchBenchScope)
  ) {
    setCourtPlayerForScope(touchBenchOverPos, "main", touchBenchName, touchBenchScope);
  }
  e.stopPropagation();
  e.preventDefault();
  clearBenchTouch();
  touchBenchPointerId = null;
}
function handleCourtDragStart(e, posIdx) {
  const slot = state.court[posIdx] || { main: "" };
  if (!slot.main || !e.dataTransfer) return;
  draggedPlayerName = slot.main;
  draggedFromPos = posIdx;
  dragSourceType = "court";
  e.dataTransfer.setData("text/plain", slot.main);
  e.dataTransfer.effectAllowed = "move";
  if (activeDropChip) {
    activeDropChip.classList.remove("drop-over");
    activeDropChip = null;
  }
}
function handleCourtDragEnd() {
  resetDragState();
}
function handlePositionDragOver(e, card) {
  const name =
    (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggedPlayerName;
  if (!name) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (activeDropChip && activeDropChip !== card) {
    activeDropChip.classList.remove("drop-over");
  }
  activeDropChip = card;
  card.classList.add("drop-over");
}
function handlePositionDragLeave(card) {
  card.classList.remove("drop-over");
  if (activeDropChip === card) {
    activeDropChip = null;
  }
}
function handlePositionDrop(e, card) {
  e.preventDefault();
  const name =
    (e.dataTransfer && e.dataTransfer.getData("text/plain")) || draggedPlayerName;
  const posIdx = parseInt(card.dataset.posIndex, 10);
  const target = card.dataset.dropTarget || "main";
  const scope = card.dataset.teamScope || draggedScope || "our";
  card.classList.remove("drop-over");
  if (!name || isNaN(posIdx)) {
    resetDragState();
    return;
  }
  const court = scope === "opponent" ? state.opponentCourt || [] : state.court || [];
  const targetSlot = court[posIdx] || { main: "", replaced: "" };
  if (isLiberoForScope(targetSlot.main, scope) && targetSlot.replaced === name) {
    setCourtPlayerForScope(posIdx, target, name, scope);
    resetDragState();
    return;
  }
  if (dragSourceType === "court" && draggedFromPos !== null) {
    if (!isLibero(name)) {
      resetDragState();
      return;
    }
    if (draggedFromPos === posIdx) {
      resetDragState();
      return;
    }
    if (!canPlaceInSlotForScope(name, posIdx, true, scope)) {
      resetDragState();
      return;
    }
    const baseCourt = ensureCourtShapeFor(court);
    const originSlot = baseCourt[draggedFromPos] || { main: "", replaced: "" };
    if (originSlot.main === name) {
      baseCourt[draggedFromPos] = originSlot.replaced
        ? { main: originSlot.replaced, replaced: "" }
        : { main: "", replaced: "" };
    }
    let nextCourt = null;
    if (lineupCore && typeof lineupCore.setPlayerOnCourt === "function") {
      nextCourt = lineupCore.setPlayerOnCourt({
        court: baseCourt,
        posIdx,
        playerName: name,
        liberos: getTeamLiberos(scope)
      });
    } else {
      const reserved = reserveNamesInCourt(name, baseCourt);
      const slot = reserved[posIdx] || { main: "", replaced: "" };
      const prevMain = slot.main;
      const updated = Object.assign({}, slot, { main: name });
      const prevWasLibero = isLiberoForScope(prevMain, scope);
      updated.replaced = prevWasLibero ? slot.replaced || "" : prevMain || slot.replaced || "";
      releaseReplaced(name, posIdx, reserved);
      reserved[posIdx] = updated;
      nextCourt = reserved;
    }
    commitCourtChangeForScope(nextCourt, scope);
    resetDragState();
    return;
  }
  if (dragSourceType === "libero-return") {
    setCourtPlayerForScope(posIdx, target, name, scope);
    resetDragState();
    return;
  }
  if (!isLiberoForScope(name, scope)) {
    resetDragState();
    return;
  }
  setCourtPlayerForScope(posIdx, target, name, scope);
  resetDragState();
}
function handleBenchClick(name) {
  handleBenchClickForScope(name, "our");
}
function handleBenchClickForScope(name, scope = "our") {
  if (!isLiberoForScope(name, scope)) return;
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const lockedMap = getLockedMapForScope(scope);
  const targetPos =
    lockedMap[name] !== undefined
      ? lockedMap[name]
      : court.findIndex(slot => !slot.main);
  if (targetPos === -1 || targetPos === undefined) {
    alert("Trascina la riserva sulla posizione da sostituire.");
    return;
  }
  setCourtPlayerForScope(targetPos, "main", name, scope);
}
function getUsedNames() {
  ensureCourtShape();
  const used = new Set();
  state.court.forEach(slot => {
    if (slot.main) used.add(slot.main);
  });
  return used;
}
function getBenchPlayers() {
  const used = getUsedNames();
  const libSet = new Set(state.liberos || []);
  const replaced = new Set(getReplacedByLiberos());
  const names = (state.players || []).filter(name => {
    if (used.has(name)) return false; // già in campo
    if (libSet.has(name)) return false; // i liberi stanno nella colonna dedicata
    // se è la titolare sostituita dal libero, deve comparire
    if (replaced.has(name)) return true;
    return true;
  });
  return sortNamesByNumber(names, state.playerNumbers || {});
}
function getBenchLiberos() {
  const used = getUsedNames();
  const libSet = new Set(state.liberos || []);
  const replaced = new Set(getReplacedByLiberos());
  const names = [];
  (state.players || []).forEach(name => {
    if (libSet.has(name) && (!used.has(name) || replaced.has(name))) {
      names.push(name);
    }
  });
  replaced.forEach(name => {
    if (!used.has(name)) names.push(name);
  });
  return orderLiberosByPreference(Array.from(new Set(names)), "our", state.playerNumbers || {});
}
function orderLiberosByPreference(names, scope = "our", numbersMap = {}) {
  const list = typeof sortNamesByNumber === "function" ? sortNamesByNumber(names, numbersMap) : names.slice();
  const preferred = getTeamPreferredLibero(scope);
  if (preferred && list.includes(preferred)) {
    return [preferred].concat(list.filter(n => n !== preferred));
  }
  return list;
}
function getReplacedByLiberos() {
  ensureCourtShape();
  const list = [];
  state.court.forEach(slot => {
    if (slot.main && (state.liberos || []).includes(slot.main) && slot.replaced) {
      list.push(slot.replaced);
    }
  });
  return list;
}
function cleanLiberos() {
  const valid = new Set(state.players || []);
  state.liberos = (state.liberos || []).filter(n => valid.has(n));
  cleanLiberoAutoMap();
}
function cleanLiberoAutoMap() {
  cleanLiberoAutoMapForScope("our");
}
function cleanLiberoAutoMapForScope(scope = "our") {
  const validPlayers = new Set(getTeamPlayers(scope));
  const libSet = new Set(getTeamLiberos(scope));
  const map = getTeamLiberoAutoMap(scope) || {};
  const cleaned = {};
  Object.entries(map).forEach(([replaced, libero]) => {
    if (validPlayers.has(replaced) && libSet.has(libero)) {
      cleaned[replaced] = libero;
    }
  });
  setTeamLiberoAutoMap(scope, cleaned);
}
function toggleLibero(name) {
  if (!name) return;
  const set = new Set(state.liberos || []);
  if (set.has(name)) {
    set.delete(name);
  } else {
    set.add(name);
  }
  state.liberos = Array.from(set);
  if (state.preferredLibero && !state.liberos.includes(state.preferredLibero)) {
    state.preferredLibero = state.liberos[0] || "";
  }
  if (!state.preferredLibero && state.liberos.length > 0) {
    state.preferredLibero = state.liberos[0];
  }
  saveState();
  renderBenchChips();
  renderLiberoTags();
  renderLiberoChipsInline();
  renderPlayers();
}
function getLockedMap() {
  const map = {};
  state.court.forEach((slot, idx) => {
    if (slot.replaced && (state.liberos || []).includes(slot.main)) {
      map[slot.replaced] = idx;
    }
  });
  return map;
}
function releaseReplaced(name, keepIdx, court = state.court) {
  if (lineupCore && typeof lineupCore.releaseReplacedFromCourt === "function") {
    const updated = lineupCore.releaseReplacedFromCourt(court, name, keepIdx);
    if (court === state.court) {
      state.court = updated;
    } else {
      updated.forEach((slot, idx) => (court[idx] = slot));
    }
    return;
  }
  const shaped = ensureCourtShapeFor(court);
  const updated = shaped.map((slot, idx) => {
    if (idx === keepIdx) return slot;
    if (slot.replaced === name) {
      return Object.assign({}, slot, { replaced: "" });
    }
    return slot;
  });
  if (court === state.court) {
    state.court = updated;
  } else {
    updated.forEach((slot, idx) => (court[idx] = slot));
  }
}
function renderBenchChips() {
  ensureBenchDropZone();
  if (!elBenchChips) return;
  elBenchChips.innerHTML = "";
  const bench = getBenchPlayers();
  const lockedMap = getLockedMap();
  renderChipList(elBenchChips, bench, lockedMap, {
    highlightLibero: true,
    isLiberoColumn: false,
    emptyText: "Nessuna riserva disponibile.",
    replacedSet: new Set(getReplacedByLiberos())
  });
  if (typeof isErrorPickModeForScope === "function" && isErrorPickModeForScope("our")) {
    const teamErrorBtn = document.createElement("button");
    teamErrorBtn.type = "button";
    teamErrorBtn.className = "error-choice-btn danger bench-team-error-btn";
    teamErrorBtn.textContent = "Errore squadra";
    teamErrorBtn.addEventListener("click", () => {
      const errorType =
        typeof selectedErrorType !== "undefined" && selectedErrorType ? selectedErrorType : null;
      if (typeof handleTeamError === "function") {
        handleTeamError(errorType, "our");
      }
      if (typeof stopErrorPickMode === "function") {
        stopErrorPickMode();
      }
    });
    elBenchChips.prepend(teamErrorBtn);
  }
}
function ensureBenchDropZone() {
  if (!elBenchChips || benchDropZoneInitialized) return;
  elBenchChips.addEventListener("dragenter", handleBenchDropZoneOver, true);
  elBenchChips.addEventListener("dragover", handleBenchDropZoneOver, true);
  elBenchChips.addEventListener("dragleave", handleBenchDropZoneLeave, true);
  elBenchChips.addEventListener("drop", handleBenchDropZoneDrop, true);
  benchDropZoneInitialized = true;
}
function renderLiberoChipsInline() {
  if (!elLiberoTagsInline) return;
  elLiberoTagsInline.innerHTML = "";
  const liberos = getBenchLiberos();
  const lockedMap = getLockedMap();
  renderChipList(elLiberoTagsInline, liberos, lockedMap, {
    isLiberoColumn: true,
    emptyText: "Nessun libero disponibile.",
    replacedSet: new Set(getReplacedByLiberos())
  });
  renderOpponentLiberoChipsInline();
}
function renderOpponentBenchChips() {
  const container = document.getElementById("bench-chips-opp");
  if (!container) return;
  container.innerHTML = "";
  if (!state.useOpponentTeam) return;
  const names = getBenchForLineupWithRoster(
    state.opponentCourt || [], state.opponentPlayers || [],
    state.opponentLiberos || [], state.opponentPlayerNumbers || {}
  );
  if (!names.length) {
    const empty = document.createElement("span");
    empty.className = "bench-empty";
    empty.textContent = "Nessuna riserva disponibile.";
    container.appendChild(empty);
  }
  names.forEach(name => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "bench-chip";
    chip.dataset.playerName = name;
    chip.dataset.teamScope = "opponent";
    chip.textContent = formatNameWithNumberFor(name, state.opponentPlayerNumbers || {}, {
      scope: "opponent",
      captainSet: new Set((state.opponentCaptains || []).map(n => n.toLowerCase()))
    });
    chip.title = "Imposta formazione avversaria";
    chip.addEventListener("click", () => openMobileLineupModal("opponent"));
    container.appendChild(chip);
  });
}
function renderOpponentLiberoChipsInline() {
  if (!elLiberoTagsInlineOpp) return;
  if (typeof ensureOpponentLiberosFromTeam === "function") {
    ensureOpponentLiberosFromTeam();
  }
  elLiberoTagsInlineOpp.innerHTML = "";
  const libSet = new Set(state.opponentLiberos || []);
  const ordered = sortNamesByNumber(state.opponentPlayers || [], state.opponentPlayerNumbers || {});
  const names = orderLiberosByPreference(
    ordered.filter(name => libSet.has(name)),
    "opponent",
    state.opponentPlayerNumbers || {}
  );
  if (names.length === 0) {
    const span = document.createElement("span");
    span.className = "bench-empty";
    span.textContent = "Nessun libero disponibile.";
    elLiberoTagsInlineOpp.appendChild(span);
    return;
  }
  const used = getUsedNamesForScope("opponent");
  names.forEach(name => {
    const chip = document.createElement("div");
    const isUsed = used.has(name);
    chip.className = "bench-chip libero-flag" + (isUsed ? " bench-locked" : "");
    chip.dataset.playerName = name;
    chip.dataset.teamScope = "opponent";
    const label = document.createElement("span");
    label.textContent = formatNameWithNumberFor(name, state.opponentPlayerNumbers || {}, {
      captainSet: new Set((state.opponentCaptains || []).map(n => n.toLowerCase()))
    }) + (isUsed ? " (in campo)" : "");
    chip.appendChild(label);
    if (!isUsed) {
      chip.draggable = true;
      chip.addEventListener("dragstart", handleBenchDragStart);
      chip.addEventListener("dragend", handleBenchDragEnd);
      chip.addEventListener("click", () => handleBenchClickForScope(name, "opponent"));
      chip.addEventListener("pointerdown", ev => handleBenchPointerDown(ev, name, "opponent"));
      chip.addEventListener("touchstart", ev => handleBenchTouchStart(ev, name, "opponent"), { passive: false });
      chip.addEventListener("touchmove", handleBenchTouchMove, { passive: false });
      chip.addEventListener("touchend", handleBenchTouchEnd, { passive: false });
      chip.addEventListener("touchcancel", handleBenchTouchCancel, { passive: false });
    } else {
      chip.setAttribute("aria-disabled", "true");
    }
    elLiberoTagsInlineOpp.appendChild(chip);
  });
}
function renderLineupChips() {
  if (!elLineupChips) return;
  elLineupChips.innerHTML = "";
  ensureCourtShape();
  const renderOrder = [3, 2, 1, 4, 5, 0];
  renderOrder.forEach(idx => {
    const meta = POSITIONS_META[idx];
    const slot = state.court[idx] || { main: "" };
    const chip = document.createElement("div");
    chip.className = "lineup-chip";
    const roleSpan = document.createElement("span");
    roleSpan.className = "chip-role";
    roleSpan.textContent = "Pos " + (idx + 1) + " · " + getRoleLabel(idx + 1);
    const nameSpan = document.createElement("span");
    nameSpan.className = "chip-name";
    const active = slot.main;
    nameSpan.textContent = active ? formatNameWithNumber(active) : "—";
    if (!active) chip.classList.add("chip-empty");
    chip.appendChild(roleSpan);
    chip.appendChild(nameSpan);
    elLineupChips.appendChild(chip);
  });
}
function updateRotationDisplay() {
  const rotationLabel = rot => "P" + String(parseInt(rot, 10) || 1);
  if (elRotationIndicator) {
    elRotationIndicator.textContent = rotationLabel(state.rotation || 1);
  }
  if (elRotationSelect) {
    elRotationSelect.value = String(state.rotation || 1);
  }
  syncAutoRotateToggle();
  syncAutoRoleToggle();
  syncAutoRoleP1AmericanToggle();
  syncPredictiveSkillToggle();
  if (typeof syncAttackTrajectoryToggle === "function") {
    syncAttackTrajectoryToggle();
  }
}
function getRoleLabel(index) {
  return getRoleLabelForRotation(index, state.rotation || 1);
}
function getRoleLabelForRotation(index, rotation = 1) {
  const offset = (rotation || 1) - 1; // numero rotazioni effettuate
  const roles = BASE_ROLES;
  const idx0 = ((index - 1) % 6 + 6) % 6; // 0-based
  return roles[(idx0 - offset + 6) % 6] || roles[idx0] || "";
}
function syncAutoRotateToggle() {
  if (elAutoRotateToggle) {
    elAutoRotateToggle.checked = !!state.autoRotate;
  }
}
function setAutoRotateEnabled(enabled) {
  state.autoRotate = !!enabled;
  if (!state.autoRotate) {
    state.autoRotatePending = false;
  }
  saveState();
  syncAutoRotateToggle();
}
function syncAutoRoleToggle() {
  if (elAutoRoleToggle) {
    elAutoRoleToggle.checked = !!state.autoRolePositioning;
  }
}
function syncPredictiveSkillToggle() {
  if (elPredictiveSkillToggle) {
    elPredictiveSkillToggle.checked = !!state.predictiveSkillFlow;
  }
}
function syncAttackTrajectoryToggle() {
  if (elAttackTrajectoryToggle) {
    elAttackTrajectoryToggle.checked = !!state.attackTrajectoryEnabled;
  }
  if (elAttackTrajectoryToggleOpp) {
    elAttackTrajectoryToggleOpp.checked = !!state.attackTrajectoryEnabled;
  }
}
function syncSkillFlowButtons() {
  const containers = [elSkillFlowButtons, elSkillFlowButtonsOpp].filter(Boolean);
  if (containers.length === 0) return;
  if (typeof normalizeMetricConfig !== "function") return;
  ensureMetricsConfigDefaults();
  containers.forEach(container => {
    Array.from(container.querySelectorAll("[data-force-skill]")).forEach(btn => {
      const skillId = btn.dataset.forceSkill;
      if (!skillId) return;
      const cfg =
        (state.metricsConfig && normalizeMetricConfig(skillId, state.metricsConfig[skillId])) || null;
      const enabled = cfg ? cfg.enabled !== false : true;
      btn.style.display = enabled ? "" : "none";
    });
  });
}
function forceNextSkill(skillId) {
  if (!skillId) return;
  state.predictiveSkillFlow = true;
  state.skillFlowOverride = skillId;
  syncPredictiveSkillToggle();
  saveState();
  renderPlayers();
  if (typeof updateNextSkillIndicator === "function") {
    updateNextSkillIndicator(skillId);
  }
}
function syncAutoRoleP1AmericanToggle() {
  if (elAutoRoleP1AmericanToggle) {
    elAutoRoleP1AmericanToggle.checked = !!state.autoRoleP1American;
  }
  if (elAutoRoleP1AmericanToggleOpp) {
    elAutoRoleP1AmericanToggleOpp.checked = !!state.autoRoleP1American;
  }
}
function setCurrentSet(value, options = {}) {
  const setNum = Math.min(5, Math.max(1, parseInt(value, 10) || 1));
  state.currentSet = setNum;
  syncCurrentSetUI(setNum);
  if (options.save !== false) {
    saveState();
  }
  renderLiveScore();
}
function setRotation(value) {
  const rot = Math.min(6, Math.max(1, parseInt(value, 10) || 1));
  state.rotation = rot;
  saveState();
  updateRotationDisplay();
  renderPlayers();
  renderLineupChips();
  if (state.autoRolePositioning && typeof applyAutoRolePositioning === "function") {
    applyAutoRolePositioning();
  }
}
function updateOpponentRotationDisplay() {
  if (typeof elRotationSelectOpp !== "undefined" && elRotationSelectOpp) {
    elRotationSelectOpp.value = String(state.opponentRotation || 1);
  }
}
function setOpponentRotation(value) {
  const rot = Math.min(6, Math.max(1, parseInt(value, 10) || 1));
  state.opponentRotation = rot;
  saveState();
  updateOpponentRotationDisplay();
  if (typeof renderOpponentPlayers === "function") {
    renderOpponentPlayers({ animate: true });
  }
}
function rotateOpponentCourt(direction = "cw") {
  const baseCourt =
    state.autoRolePositioning && opponentAutoRoleBaseCourt
      ? ensureCourtShapeFor(opponentAutoRoleBaseCourt)
      : ensureCourtShapeFor(state.opponentCourt);
  let rotated = [];
  const rot = state.opponentRotation || 1;
  if (direction === "ccw") {
    rotated = [baseCourt[1], baseCourt[2], baseCourt[3], baseCourt[4], baseCourt[5], baseCourt[0]];
    state.opponentRotation = rot === 1 ? 6 : rot - 1;
  } else {
    rotated = [baseCourt[5], baseCourt[0], baseCourt[1], baseCourt[2], baseCourt[3], baseCourt[4]];
    state.opponentRotation = ((rot % 6) || 0) + 1;
  }
  const rotatedClean = rotated.map(slot => Object.assign({}, slot));
  const rotatedBase = rotatedClean.map((slot, idx) => {
    if (isLiberoForScope(slot.main, "opponent") && FRONT_ROW_INDEXES.has(idx)) {
      return { main: slot.replaced || "", replaced: "" };
    }
    return slot;
  });
  const withLibero = applyAutoLiberoSubstitutionToCourtForScope(rotatedBase, "opponent", {
    skipServerOnServe: true
  });
  setTeamCourt("opponent", withLibero);
  saveState();
  updateOpponentRotationDisplay();
  if (typeof renderOpponentPlayers === "function") {
    renderOpponentPlayers({ animate: true });
  }
}
function captureRects(selector, keyBuilder) {
  const map = new Map();
  document.querySelectorAll(selector).forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const key = keyBuilder(node);
    if (!key) return;
    map.set(key, node.getBoundingClientRect());
  });
  return map;
}
function animateFlip(prevRects, selector, keyBuilder) {
  if (!prevRects || prevRects.size === 0) return;
  const nodes = document.querySelectorAll(selector);
  nodes.forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const key = keyBuilder(node);
    if (!key || !prevRects.has(key)) return;
    const prev = prevRects.get(key);
    const next = node.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    node.style.transition = "none";
    node.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      node.style.transition = "transform 360ms ease, opacity 360ms ease";
      node.style.transform = "translate(0px, 0px)";
    });
  });
}
function applyAutoRolePositioning() {
  if (!state.autoRolePositioning) return;
  ensureCourtShape();
  if (typeof sanitizeAutoRoleBaseCourtForScope === "function") {
    sanitizeAutoRoleBaseCourtForScope("our");
  }
  enforceAutoLiberoForState({ skipServerOnServe: true });
  const phase = getCurrentPhase("our");
  const rot = state.rotation || 1;
  if (autoRolePhaseApplied === phase && autoRoleRotationApplied === rot) return;
  if (!autoRoleBaseCourt) {
    if (state.autoRoleBaseCourt && state.autoRoleBaseCourt.length === 6) {
      autoRoleBaseCourt = cloneCourtLineup(state.autoRoleBaseCourt);
    } else {
      updateAutoRoleBaseCourtCache(state.court);
    }
  }
  const baseLineup =
    autoRoleBaseCourt && autoRoleBaseCourt.length === 6
      ? cloneCourtLineup(autoRoleBaseCourt)
      : ensureCourtShapeFor(state.court);
  const permuted = applyPhasePermutation({
    lineup: baseLineup,
    rotation: rot,
    phase,
    isServing: state.isServing,
    liberos: state.liberos || [],
    autoRoleP1American: !!state.autoRoleP1American
  });
  autoRoleRenderedCourt = permuted; // overlay per la vista, non alteriamo il base
  autoRolePhaseApplied = phase;
  autoRoleRotationApplied = rot;
  saveState();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
}
function rotateCourt(direction) {
  const prevCourtRects = captureRects(".court-card", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.posIndex || "";
    return name || "pos-" + pos;
  });
  const prevMiniRects = captureRects(".mini-slot", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.slotIndex || "";
    return name || "mini-" + pos;
  });
  ensureCourtShape();
  const court =
    state.autoRolePositioning && autoRoleBaseCourt
      ? ensureCourtShapeFor(autoRoleBaseCourt)
      : ensureCourtShapeFor(state.court);
  let rotated = [];
  if (direction === "cw") {
    rotated = [court[5], court[0], court[1], court[2], court[3], court[4]];
    state.rotation = ((state.rotation || 1) % 6) + 1;
  } else {
    rotated = [court[1], court[2], court[3], court[4], court[5], court[0]];
    state.rotation = state.rotation === 1 ? 6 : state.rotation - 1;
  }
  const rotatedClean = rotated.map(slot => Object.assign({}, slot));
  const rotatedBase = rotatedClean.map((slot, idx) => {
    if ((state.liberos || []).includes(slot.main) && FRONT_ROW_INDEXES.has(idx)) {
      return { main: slot.replaced || "" , replaced: "" };
    }
    return slot;
  });
  const withLibero = applyAutoLiberoSubstitutionToCourt(rotatedBase, { skipServerOnServe: true });
  // Aggiorna sempre il lineup base ruotato
  state.court = withLibero;
  if (state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(withLibero);
    resetAutoRoleCache();
    applyAutoRolePositioning();
  } else {
    state.court = withLibero;
    resetAutoRoleCache();
  }
  saveState();
  renderPlayers();
  renderLineupChips();
  renderBenchChips();
  updateRotationDisplay();
  animateFlip(prevCourtRects, ".court-card", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.posIndex || "";
    return name || "pos-" + pos;
  });
  animateFlip(prevMiniRects, ".mini-slot", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.slotIndex || "";
    return name || "mini-" + pos;
  });
}
function openSettingsModal() {
  if (!elSettingsModal) return;
  elSettingsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setGlobalModalState(true);
}
function closeSettingsModal() {
  if (!elSettingsModal) return;
  elSettingsModal.classList.add("hidden");
  document.body.style.overflow = "";
  setGlobalModalState(false);
}
function resetDragState() {
  draggedPlayerName = "";
  draggedFromPos = null;
  dragSourceType = "";
  draggedScope = "our";
  handleBenchDropZoneLeave();
  if (activeDropChip) {
    activeDropChip.classList.remove("drop-over");
    activeDropChip = null;
  }
}
