function setAutoRolePositioning(enabled) {
  const next = !!enabled;
  const prev = !!state.autoRolePositioning;
  state.autoRolePositioning = next;
  if (!next && prev) {
    const restored = restoreAutoRoleBaseCourt();
    const restoredOpp = restoreOpponentAutoRoleBaseCourt();
    saveState();
    if (restored) {
      renderPlayers();
      renderBenchChips();
      renderLiberoChipsInline();
      renderLineupChips();
      updateRotationDisplay();
    } else if (typeof renderPlayers === "function") {
      renderPlayers();
    }
    if (!restoredOpp && typeof renderOpponentPlayers === "function") {
      renderOpponentPlayers();
    }
    return;
  }
  if (next && !prev) {
    cacheAutoRoleBaseCourt();
    cacheOpponentAutoRoleBaseCourt();
    applyAutoRolePositioning();
    saveState();
    return;
  }
  saveState();
  if (typeof renderPlayers === "function") {
    renderPlayers();
  }
}
function setAutoRoleP1American(enabled) {
  state.autoRoleP1American = !!enabled;
  saveState();
  if (state.autoRolePositioning && typeof applyAutoRolePositioning === "function") {
    applyAutoRolePositioning();
  }
  syncAutoRoleP1AmericanToggle();
}
function setIsServing(flag) {
  state.isServing = !!flag;
  saveState();
}
function setAutoLiberoBackline(enabled) {
  state.autoLiberoBackline = !!enabled;
  if (!enabled) {
    state.autoLiberoRole = "";
  }
  enforceAutoLiberoForState({ skipServerOnServe: true });
  saveState();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
}
function setAutoLiberoRole(role) {
  if (typeof role !== "string") return;
  const sanitized = AUTO_LIBERO_ROLE_OPTIONS.includes(role) ? role : "";
  state.autoLiberoRole = sanitized;
  state.autoLiberoBackline = sanitized !== "" ? true : state.autoLiberoBackline;
  // Cambiando ruolo, azzera i vecchi abbinamenti per forzare la nuova sostituzione
  state.liberoAutoMap = {};
  if (Object.prototype.hasOwnProperty.call(state, "autoLiberoMap")) {
    state.autoLiberoMap = {};
  }
  enforceAutoLiberoForState({ skipServerOnServe: true });
  saveState();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
}
function getLastEventForScope(scope = "our") {
  const list = Array.isArray(state.events) ? state.events : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i];
    if (!ev || !ev.skillId) continue;
    if (ev.skillId === "manual") {
      const dir = typeof getPointDirection === "function" ? getPointDirection(ev) : null;
      if (dir) {
        const evScope =
          typeof getTeamScopeFromEvent === "function"
            ? getTeamScopeFromEvent(ev)
            : ev.team === "opponent"
              ? "opponent"
              : "our";
        if (scope === "opponent") {
          if (evScope === "opponent") return ev;
        } else if (evScope !== "opponent") {
          return ev;
        }
      }
      continue;
    }
    const evScope =
      typeof getTeamScopeFromEvent === "function"
        ? getTeamScopeFromEvent(ev)
        : ev.team === "opponent"
          ? "opponent"
          : "our";
    if (scope === "opponent") {
      if (evScope === "opponent") return ev;
    } else if (evScope !== "opponent") {
      return ev;
    }
  }
  return null;
}
function getCurrentPhase(scope = "our") {
  const last = getLastEventForScope(scope);
  const isServing = scope === "opponent" ? !state.isServing : state.isServing;
  if (last && last.skillId) {
    if (["pass", "second", "attack", "block", "defense"].includes(last.skillId)) {
      return "attack";
    }
    const dir = typeof getPointDirection === "function" ? getPointDirection(last) : null;
    if (dir === "against") return "receive";
    if (dir === "for" && isServing) return "attack";
  }
  return isServing ? "attack" : "receive";
}
function handlePlayerNumberChange(name, value) {
  if (!name) return;
  const clean = (value || "").trim();
  if (clean && !/^[0-9]{1,3}$/.test(clean)) {
    alert("Inserisci un numero di 1-3 cifre.");
    renderPlayersManagerList();
    return;
  }
  const dup = Object.entries(state.playerNumbers || {}).find(
    ([otherName, num]) => otherName !== name && num && num === clean
  );
  if (dup) {
    alert("Numero già assegnato a " + dup[0]);
    renderPlayersManagerList();
    return;
  }
  state.playerNumbers = state.playerNumbers || {};
  state.playerNumbers[name] = clean;
  saveState();
  renderPlayersManagerList();
  renderPlayers();
  renderBenchChips();
  renderLineupChips();
  renderAggregatedTable();
  renderEventsLog();
}
function playersChanged(nextPlayers) {
  const normalizedNext = normalizePlayers(nextPlayers);
  const normalizedCurrent = normalizePlayers(state.players || []);
  if (normalizedNext.length !== normalizedCurrent.length) return true;
  return normalizedNext.some((name, idx) => name !== normalizedCurrent[idx]);
}
function ensureCourtShape() {
  state.court = ensureCourtShapeFor(state.court);
}
function ensureCourtShapeFor(court) {
  if (lineupCore && typeof lineupCore.ensureCourtShapeFor === "function") {
    return lineupCore.ensureCourtShapeFor(court);
  }
  if (!Array.isArray(court) || court.length !== 6) {
    return Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  }
  return court.map(slot => ({
    main: (slot && slot.main) || "",
    replaced: (slot && slot.replaced) || ""
  }));
}
function cloneCourtLineup(lineup = state.court) {
  if (lineupCore && typeof lineupCore.cloneCourtLineup === "function") {
    return lineupCore.cloneCourtLineup(lineup);
  }
  ensureCourtShape();
  return (lineup || []).map(slot => ({
    main: (slot && slot.main) || "",
    replaced: (slot && slot.replaced) || ""
  }));
}
function cacheAutoRoleBaseCourt() {
  updateAutoRoleBaseCourtCache(state.court);
}
function cacheOpponentAutoRoleBaseCourt() {
  updateOpponentAutoRoleBaseCourtCache(state.opponentCourt || []);
}
function restoreAutoRoleBaseCourt() {
  if (!autoRoleBaseCourt || autoRoleBaseCourt.length !== 6) {
    if (state.autoRoleBaseCourt && state.autoRoleBaseCourt.length === 6) {
      autoRoleBaseCourt = cloneCourtLineup(state.autoRoleBaseCourt);
    }
  }
  if (!autoRoleBaseCourt || autoRoleBaseCourt.length !== 6) return false;
  const restored = cloneCourtLineup(autoRoleBaseCourt);
  state.court = restored;
  updateAutoRoleBaseCourtCache(restored);
  resetAutoRoleCache();
  return true;
}
function restoreOpponentAutoRoleBaseCourt() {
  if (!opponentAutoRoleBaseCourt || opponentAutoRoleBaseCourt.length !== 6) {
    if (state.opponentAutoRoleBaseCourt && state.opponentAutoRoleBaseCourt.length === 6) {
      opponentAutoRoleBaseCourt = cloneCourtLineup(state.opponentAutoRoleBaseCourt);
    }
  }
  if (!opponentAutoRoleBaseCourt || opponentAutoRoleBaseCourt.length !== 6) return false;
  const restored = cloneCourtLineup(opponentAutoRoleBaseCourt);
  state.opponentCourt = restored;
  updateOpponentAutoRoleBaseCourtCache(restored);
  return true;
}
function cleanCourtPlayers(target = state.court) {
  ensureCourtShape();
  const valid = new Set(state.players || []);
  state.captains = (state.captains || []).filter(name => valid.has(name)).slice(0, 1);
  const cleaned = ensureCourtShapeFor(target).map(slot => {
    const main = valid.has(slot.main) ? slot.main : "";
    const replaced = slot.replaced && valid.has(slot.replaced) ? slot.replaced : "";
    return { main, replaced };
  });
  if (target === state.court) {
    state.court = cleaned;
  } else {
    cleaned.forEach((slot, idx) => (target[idx] = slot));
  }
  cleanLiberos();
  ensureMetricsConfigDefaults();
  return cleaned;
}
function registerLiberoPair(replacedName, liberoName) {
  registerLiberoPairForScope(replacedName, liberoName, "our");
}
function registerLiberoPairForScope(replacedName, liberoName, scope = "our") {
  if (!replacedName || !liberoName) return;
  if (!isLiberoForScope(liberoName, scope)) return;
  const map = Object.assign({}, getTeamLiberoAutoMap(scope));
  map[replacedName] = liberoName;
  setTeamLiberoAutoMap(scope, map);
  if (!getTeamPreferredLibero(scope)) {
    setTeamPreferredLibero(scope, liberoName);
  }
}
function removeLiberosAndRestore(baseCourt) {
  return removeLiberosAndRestoreForScope(baseCourt, "our");
}
function removeLiberosAndRestoreForScope(baseCourt, scope = "our") {
  const shaped = ensureCourtShapeFor(baseCourt).map(slot => Object.assign({}, slot));
  shaped.forEach((slot, idx) => {
    if (isLiberoForScope(slot.main, scope)) {
      if (slot.replaced) {
        shaped[idx] = { main: slot.replaced, replaced: "" };
      } else {
        shaped[idx] = { main: "", replaced: "" };
      }
    } else if (slot.replaced) {
      shaped[idx] = { main: slot.main || "", replaced: "" };
    }
  });
  return shaped;
}
function roleToAutoCategory(roleLabel = "") {
  const r = (roleLabel || "").toUpperCase();
  if (r.startsWith("P")) return "P";
  if (r.startsWith("O")) return "O";
  if (r.startsWith("C")) return "C";
  if (r.startsWith("S")) return "S";
  return "";
}
function swapPreferredLibero() {
  swapPreferredLiberoForScope("our");
}
function swapPreferredLiberoForScope(scope = "our") {
  const players = getTeamPlayers(scope);
  const libs = getTeamLiberos(scope).filter(n => players.includes(n));
  if (libs.length < 2) return;
  const preferred = getTeamPreferredLibero(scope);
  const current = libs.includes(preferred) ? preferred : libs[0];
  const next = libs[(libs.indexOf(current) + 1) % libs.length];
  setTeamPreferredLibero(scope, next);
  setTeamLiberoAutoMap(scope, {});
  enforceAutoLiberoForScope(scope, { skipServerOnServe: true });
  saveState();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  if (typeof renderOpponentPlayers === "function") {
    renderOpponentPlayers();
  }
}
function restorePlayerFromLibero(posIdx) {
  restorePlayerFromLiberoForScope(posIdx, "our");
}
function restorePlayerFromLiberoForScope(posIdx, scope = "our") {
  const court = getTeamCourt(scope);
  const shaped = ensureCourtShapeFor(court);
  const idx = typeof posIdx === "number" ? posIdx : parseInt(posIdx, 10);
  if (isNaN(idx) || idx < 0 || idx >= shaped.length) return;
  const slot = shaped[idx] || { main: "", replaced: "" };
  if (!isLiberoForScope(slot.main, scope) || !slot.replaced) return;
  shaped[idx] = { main: slot.replaced, replaced: "" };
  setTeamCourt(scope, shaped);
  setTeamLiberoAutoMap(scope, {});
  const liberos = getTeamLiberos(scope);
  const currentPreferred = getTeamPreferredLibero(scope);
  const nextPreferred =
    currentPreferred && liberos.includes(currentPreferred) ? currentPreferred : liberos[0] || "";
  setTeamPreferredLibero(scope, nextPreferred);
  if (scope === "our" && state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(state.court);
    resetAutoRoleCache();
  }
  saveState();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  if (typeof renderOpponentPlayers === "function") {
    renderOpponentPlayers();
  }
}
function applyAutoLiberoSubstitutionToCourt(baseCourt, options = {}) {
  return applyAutoLiberoSubstitutionToCourtForScope(baseCourt, "our", options);
}
function applyAutoLiberoSubstitutionToCourtForScope(baseCourt, scope = "our", options = {}) {
  const { skipServerOnServe = true } = options;
  if (!getTeamAutoLiberoBackline(scope)) return cloneCourtLineup(baseCourt);
  const autoRole = getTeamAutoLiberoRole(scope);
  if (!autoRole) return cloneCourtLineup(baseCourt);
  cleanLiberoAutoMapForScope(scope);
  const libSet = new Set(getTeamLiberos(scope));
  if (libSet.size === 0) return cloneCourtLineup(baseCourt);
  const liberoList = getTeamLiberos(scope).filter(n => libSet.has(n));
  const mapping = getTeamLiberoAutoMap(scope) || {};
  const shaped = removeLiberosAndRestoreForScope(baseCourt, scope).map(slot => Object.assign({}, slot));
  const preferred = getTeamPreferredLibero(scope);
  let primaryLibero = preferred && libSet.has(preferred) ? preferred : null;
  // normalizza eventuali doppi liberi già presenti
  for (let i = 0; i < shaped.length; i++) {
    const slot = shaped[i];
    if (libSet.has(slot.main)) {
      if (!primaryLibero) {
        primaryLibero = slot.main;
        if (slot.replaced) {
          registerLiberoPairForScope(slot.replaced, slot.main, scope);
        }
      } else {
        // secondo libero: rimuovilo e rimetti la titolare se nota
        if (slot.replaced) {
          shaped[i] = { main: slot.replaced, replaced: "" };
        } else {
          shaped[i] = { main: "", replaced: "" };
        }
      }
    }
  }
  if (!primaryLibero) {
    primaryLibero = liberoList[0] || null;
    setTeamPreferredLibero(scope, primaryLibero || "");
  }
  if (!primaryLibero) return shaped;
  const selCat = (autoRole || "").toUpperCase();
  const rotation = getTeamRotation(scope);
  const isServing = scope === "opponent" ? !state.isServing : !!state.isServing;
  let targetIdx = -1;
  BACK_ROW_INDEXES.forEach(idx => {
    if (targetIdx !== -1) return;
    if (skipServerOnServe && isServing && idx === 0) return;
    const roleHere = roleToAutoCategory(getRoleLabelForRotation(idx + 1, rotation)); // usa il ruolo corrente (ruotato)
    if (selCat === roleHere && !isLiberoForScope(shaped[idx].main, scope)) {
      targetIdx = idx;
    }
  });
  if (targetIdx === -1) return shaped;
  const slot = shaped[targetIdx] || { main: "", replaced: "" };
  const liberoName =
    (mapping[slot.main] && libSet.has(mapping[slot.main]) && mapping[slot.main]) || primaryLibero;
  if (!liberoName) return shaped;
  shaped[targetIdx] = { main: liberoName, replaced: slot.main || "" };
  registerLiberoPairForScope(slot.main || "", liberoName, scope);
  setTeamPreferredLibero(scope, liberoName);
  return shaped;
}
function enforceAutoLiberoForState(options = {}) {
  enforceAutoLiberoForScope("our", options);
}
function enforceAutoLiberoForScope(scope = "our", options = {}) {
  if (!getTeamAutoLiberoBackline(scope)) return;
  if (scope === "our") {
    ensureCourtShape();
  }
  let base;
  if (scope === "our") {
    base =
      state.autoRolePositioning && autoRoleBaseCourt && autoRoleBaseCourt.length === 6
        ? cloneCourtLineup(autoRoleBaseCourt)
        : cloneCourtLineup(state.court);
  } else {
    base = cloneCourtLineup(getTeamCourt(scope));
  }
  base = removeLiberosAndRestoreForScope(base, scope);
  const adjusted = applyAutoLiberoSubstitutionToCourtForScope(base, scope, options);
  setTeamCourt(scope, cloneCourtLineup(adjusted));
  if (scope === "our" && state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(cloneCourtLineup(adjusted));
    resetAutoRoleCache();
  }
}
function isLibero(name) {
  if (!name) return false;
  return isLiberoForScope(name, "our");
}
function isLiberoForScope(name, scope = "our") {
  if (!name) return false;
  return getTeamLiberos(scope).includes(name);
}
function canPlaceInSlot(name, posIdx, showAlert = true) {
  if (!name) return true;
  ensureCourtShape();
  const targetSlot = state.court[posIdx] || { main: "", replaced: "" };
  // Se esiste un libero in campo che sostituisce questa giocatrice, può rientrare solo lì (ma sempre consentito su quello slot)
  const libSlotIdx = (state.court || []).findIndex(
    slot => isLibero(slot.main) && slot.replaced === name
  );
  if (libSlotIdx !== -1) {
    if (libSlotIdx !== posIdx) {
      if (showAlert) alert("Questa giocatrice può rientrare solo nello slot del libero che la sta sostituendo.");
      return false;
    }
    return true;
  }
  if (isLibero(name) && FRONT_ROW_INDEXES.has(posIdx)) {
    if (showAlert) alert("Non puoi mettere il libero in prima linea.");
    return false;
  }
  if (isLibero(name)) {
    const anotherLiberoIdx = (state.court || []).findIndex(
      slot => slot.main && slot.main !== name && isLibero(slot.main)
    );
    if (anotherLiberoIdx !== -1 && anotherLiberoIdx !== posIdx) {
      if (showAlert) alert("Puoi avere solo un libero in campo alla volta.");
      return false;
    }
  }
  const lockedMap = getLockedMap();
  // se la giocatrice è proprio quella sostituita dal libero in questo slot, consentiamo il rientro qui
  if (lockedMap[name] !== undefined && lockedMap[name] !== posIdx && targetSlot.replaced !== name) {
    if (showAlert) alert("Questa giocatrice può rientrare solo nella sua posizione (sostituita dal libero).");
    return false;
  }
  return true;
}
function getLockedMapForScope(scope = "our") {
  const map = {};
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  court.forEach((slot, idx) => {
    if (slot.replaced && isLiberoForScope(slot.main, scope)) {
      map[slot.replaced] = idx;
    }
  });
  return map;
}
function getUsedNamesForScope(scope = "our") {
  const used = new Set();
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  court.forEach(slot => {
    if (slot.main) used.add(slot.main);
  });
  return used;
}
function getReplacedByLiberosForScope(scope = "our") {
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const libSet = new Set(getTeamLiberos(scope));
  const list = [];
  court.forEach(slot => {
    if (slot.main && libSet.has(slot.main) && slot.replaced) {
      list.push(slot.replaced);
    }
  });
  return list;
}
function canPlaceInSlotForScope(name, posIdx, showAlert = true, scope = "our") {
  if (!name) return true;
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const targetSlot = court[posIdx] || { main: "", replaced: "" };
  const libSlotIdx = court.findIndex(slot => isLiberoForScope(slot.main, scope) && slot.replaced === name);
  if (libSlotIdx !== -1) {
    if (libSlotIdx !== posIdx) {
      if (showAlert) alert("Questa giocatrice può rientrare solo nello slot del libero che la sta sostituendo.");
      return false;
    }
    return true;
  }
  if (isLiberoForScope(name, scope) && FRONT_ROW_INDEXES.has(posIdx)) {
    if (showAlert) alert("Non puoi mettere il libero in prima linea.");
    return false;
  }
  if (isLiberoForScope(name, scope)) {
    const anotherLiberoIdx = court.findIndex(
      slot => slot.main && slot.main !== name && isLiberoForScope(slot.main, scope)
    );
    if (anotherLiberoIdx !== -1 && anotherLiberoIdx !== posIdx) {
      if (showAlert) alert("Puoi avere solo un libero in campo alla volta.");
      return false;
    }
  }
  const lockedMap = getLockedMapForScope(scope);
  if (lockedMap[name] !== undefined && lockedMap[name] !== posIdx && targetSlot.replaced !== name) {
    if (showAlert) alert("Questa giocatrice può rientrare solo nella sua posizione (sostituita dal libero).");
    return false;
  }
  return true;
}
function reserveNamesInCourt(name, court = state.court) {
  if (lineupCore && typeof lineupCore.reserveNamesInCourt === "function") {
    const next = lineupCore.reserveNamesInCourt(name, court);
    if (court === state.court) {
      state.court = next;
    } else {
      next.forEach((slot, idx) => (court[idx] = slot));
    }
    return next;
  }
  return court.map(slot => {
    const cleaned = Object.assign({}, slot);
    if (cleaned.main === name) cleaned.main = "";
    if (cleaned.replaced === name) cleaned.replaced = "";
    return cleaned;
  });
}
function resetAutoRoleCache() {
  autoRolePhaseApplied = "";
  autoRoleRotationApplied = null;
  autoRoleRenderedCourt = null;
}
function updateAutoRoleBaseCourtCache(base) {
  const shaped = cloneCourtLineup(base);
  autoRoleBaseCourt = shaped;
  state.autoRoleBaseCourt = shaped;
}
function updateOpponentAutoRoleBaseCourtCache(base) {
  const shaped = cloneCourtLineup(base);
  opponentAutoRoleBaseCourt = shaped;
  state.opponentAutoRoleBaseCourt = shaped;
}
function sanitizeAutoRoleBaseCourtForScope(scope = "our") {
  const isOpponent = scope === "opponent";
  const valid = new Set(isOpponent ? state.opponentPlayers || [] : state.players || []);
  const cached = isOpponent ? opponentAutoRoleBaseCourt : autoRoleBaseCourt;
  const stateCached = isOpponent ? state.opponentAutoRoleBaseCourt : state.autoRoleBaseCourt;
  const source =
    Array.isArray(cached) && cached.length === 6
      ? cached
      : Array.isArray(stateCached) && stateCached.length === 6
        ? stateCached
        : null;
  if (!source) return false;
  const shaped = ensureCourtShapeFor(source);
  const hasInvalid = shaped.some(slot => {
    const main = (slot && slot.main) || "";
    const replaced = (slot && slot.replaced) || "";
    return (main && !valid.has(main)) || (replaced && !valid.has(replaced));
  });
  if (!hasInvalid) return false;
  const fallback = ensureCourtShapeFor(isOpponent ? state.opponentCourt || [] : state.court || []);
  if (isOpponent) {
    updateOpponentAutoRoleBaseCourtCache(fallback);
  } else {
    updateAutoRoleBaseCourtCache(fallback);
    resetAutoRoleCache();
  }
  return true;
}
function commitCourtChange(baseCourt, options = {}) {
  const { clean = true } = options;
  if (clean) cleanCourtPlayers(baseCourt);
  resetAutoRoleCache();
  if (state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(baseCourt);
    state.court = ensureCourtShapeFor(baseCourt); // manteniamo il lineup base aggiornato
    enforceAutoLiberoForState({ skipServerOnServe: true });
    applyAutoRolePositioning();
    return;
  }
  state.court = ensureCourtShapeFor(baseCourt);
  enforceAutoLiberoForState({ skipServerOnServe: true });
  saveState();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
}
function commitCourtChangeForScope(baseCourt, scope = "our") {
  if (scope === "our") {
    commitCourtChange(baseCourt);
    return;
  }
  state.opponentCourt = ensureCourtShapeFor(baseCourt);
  if (state.autoRolePositioning) {
    updateOpponentAutoRoleBaseCourtCache(state.opponentCourt);
  }
  if (typeof enforceAutoLiberoForScope === "function") {
    enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
  }
  saveState();
  renderOpponentPlayers();
  renderOpponentLiberoChipsInline();
  updateOpponentRotationDisplay();
}
function setCourtPlayer(posIdx, target, playerName) {
  ensureCourtShape();
  const baseCourt = ensureCourtShapeFor(state.court); // opera sempre sul lineup visibile
  const name = (playerName || "").trim();
  if (!name) return;
  if (!canPlaceInSlot(name, posIdx, true)) return;
  const slotState = state.court[posIdx] || { main: "", replaced: "" };
  const slotBase = baseCourt[posIdx] || slotState;
  const isLiberoHere = isLibero(slotState.main) || isLibero(slotBase.main);
  const replacedName = slotState.replaced || slotBase.replaced || "";
  const prevMain = slotBase.main || "";
  const benchPlayers = new Set(getBenchPlayers());
  const shouldRecordSub =
    prevMain &&
    prevMain !== name &&
    !isLibero(prevMain) &&
    !isLibero(name) &&
    benchPlayers.has(name);
  // Caso speciale: rientro titolare al posto del libero che la sostituisce
  if (isLiberoHere && replacedName === name && !isLibero(name)) {
    const next = cloneCourtLineup(baseCourt);
    next[posIdx] = { main: name, replaced: "" };
    commitCourtChange(next);
    return;
  }
  let nextCourt = null;
  if (lineupCore && typeof lineupCore.setPlayerOnCourt === "function") {
    nextCourt = lineupCore.setPlayerOnCourt({
      court: baseCourt,
      posIdx,
      playerName: name,
      liberos: state.liberos || []
    });
  } else {
    const reserved = reserveNamesInCourt(name, baseCourt);
    reserved.forEach((slot, idx) => (baseCourt[idx] = slot));
    const slot = baseCourt[posIdx] || { main: "", replaced: "" };
    const prevMain = slot.main;
    const updated = Object.assign({}, slot);
    updated.main = name;
    const isIncomingLibero = (state.liberos || []).includes(name);
    const prevWasLibero = (state.liberos || []).includes(prevMain);
    if (isIncomingLibero) {
      if (prevWasLibero) {
        // mantieni l'aggancio alla titolare originale se stai sostituendo un libero con un altro libero
        updated.replaced = slot.replaced || "";
      } else {
        updated.replaced = prevMain || slot.replaced || "";
      }
      if (updated.replaced) {
        registerLiberoPair(updated.replaced, name);
      }
    } else {
      updated.replaced = "";
    }
    releaseReplaced(name, posIdx, baseCourt);
    baseCourt[posIdx] = updated;
    nextCourt = baseCourt;
  }
  const placedSlot = nextCourt && nextCourt[posIdx];
  if (placedSlot && isLibero(placedSlot.main) && placedSlot.replaced) {
    registerLiberoPair(placedSlot.replaced, placedSlot.main);
    state.preferredLibero = placedSlot.main;
    const roleCat = roleToAutoCategory(getRoleLabel(posIdx + 1)); // ruolo corrente della posizione
    if (roleCat) {
      state.autoLiberoRole = roleCat;
      state.autoLiberoBackline = true;
    }
  }
  commitCourtChange(nextCourt);
  if (shouldRecordSub && typeof recordSubstitutionEvent === "function") {
    recordSubstitutionEvent({ playerIn: name, playerOut: prevMain });
  }
}
function swapCourtPlayers(fromIdx, toIdx) {
  ensureCourtShape();
  const baseCourt =
    state.autoRolePositioning && autoRoleBaseCourt
      ? ensureCourtShapeFor(autoRoleBaseCourt)
      : ensureCourtShapeFor(state.court);
  if (fromIdx === toIdx) return;
  const fromSlot = baseCourt[fromIdx] || { main: "", replaced: "" };
  const toSlot = baseCourt[toIdx] || { main: "", replaced: "" };
  const fromName = fromSlot.main;
  if (!fromName) return;
  const toName = toSlot.main;
  if (isLibero(fromName) && FRONT_ROW_INDEXES.has(toIdx)) {
    alert("Non puoi spostare il libero in prima linea.");
    return;
  }
  if (isLibero(toName) && FRONT_ROW_INDEXES.has(fromIdx)) {
    alert("Non puoi spostare il libero in prima linea.");
    return;
  }
  let nextCourt = null;
  if (lineupCore && typeof lineupCore.swapCourtSlots === "function") {
    nextCourt = lineupCore.swapCourtSlots({ court: baseCourt, fromIdx, toIdx });
  } else {
    const cloned = cloneCourtLineup(baseCourt);
    cloned[toIdx] = fromSlot;
    cloned[fromIdx] = toSlot;
    nextCourt = cloned;
  }
  commitCourtChange(nextCourt);
}
function setCourtPlayerForScope(posIdx, target, playerName, scope = "our") {
  if (scope === "our") {
    setCourtPlayer(posIdx, target, playerName);
    return;
  }
  const baseCourt = ensureCourtShapeFor(getTeamCourt(scope));
  const name = (playerName || "").trim();
  if (!name) return;
  if (!canPlaceInSlotForScope(name, posIdx, true, scope)) return;
  const slotState = baseCourt[posIdx] || { main: "", replaced: "" };
  const isLiberoHere = isLiberoForScope(slotState.main, scope);
  const replacedName = slotState.replaced || "";
  if (isLiberoHere && replacedName === name && !isLiberoForScope(name, scope)) {
    const next = cloneCourtLineup(baseCourt);
    next[posIdx] = { main: name, replaced: "" };
    commitCourtChangeForScope(next, scope);
    return;
  }
  let nextCourt = null;
  const liberos = getTeamLiberos(scope);
  if (lineupCore && typeof lineupCore.setPlayerOnCourt === "function") {
    nextCourt = lineupCore.setPlayerOnCourt({
      court: baseCourt,
      posIdx,
      playerName: name,
      liberos
    });
  } else {
    const reserved = reserveNamesInCourt(name, baseCourt);
    reserved.forEach((slot, idx) => (baseCourt[idx] = slot));
    const slot = baseCourt[posIdx] || { main: "", replaced: "" };
    const prevMain = slot.main;
    const updated = Object.assign({}, slot);
    updated.main = name;
    const isIncomingLibero = liberos.includes(name);
    const prevWasLibero = liberos.includes(prevMain);
    if (isIncomingLibero) {
      if (prevWasLibero) {
        updated.replaced = slot.replaced || "";
      } else {
        updated.replaced = prevMain || slot.replaced || "";
      }
      if (updated.replaced) {
        registerLiberoPairForScope(updated.replaced, name, scope);
      }
    } else {
      updated.replaced = "";
    }
    releaseReplaced(name, posIdx, baseCourt);
    baseCourt[posIdx] = updated;
    nextCourt = baseCourt;
  }
  commitCourtChangeForScope(nextCourt, scope);
}
function clearCourtAssignment(posIdx, target) {
  ensureCourtShape();
  const baseCourt =
    state.autoRolePositioning && autoRoleBaseCourt
      ? ensureCourtShapeFor(autoRoleBaseCourt)
      : ensureCourtShapeFor(state.court);
  const slot = baseCourt[posIdx];
  if (!slot) return;
  let nextCourt = null;
  if (lineupCore && typeof lineupCore.clearCourtSlot === "function") {
    nextCourt = lineupCore.clearCourtSlot({ court: baseCourt, posIdx, liberos: state.liberos || [] });
  } else {
    const updated = Object.assign({}, slot);
    if ((state.liberos || []).includes(slot.main) && slot.replaced) {
      updated.main = slot.replaced;
      updated.replaced = "";
    } else {
      updated.main = "";
      updated.replaced = "";
    }
    const cloned = cloneCourtLineup(baseCourt);
    cloned[posIdx] = updated;
    nextCourt = cloned;
  }
  commitCourtChange(nextCourt);
}
function initStats() {
  state.stats = {};
  state.players.forEach((_, idx) => {
    state.stats[idx] = {};
    SKILLS.forEach(skill => {
      state.stats[idx][skill.id] = {
        "#": 0,
        "+": 0,
        "!": 0,
        "-": 0,
        "=": 0,
        "/": 0
      };
    });
  });
}
function syncCurrentSetUI(value) {
  const setValue = String(value || 1);
  if (elCurrentSet) {
    elCurrentSet.value = setValue;
  }
  if (typeof document !== "undefined") {
    const label = "Set " + setValue;
    const display = document.getElementById("current-set-display");
    if (display) display.textContent = label;
  }
}
const matchSettings = (typeof window !== "undefined" &&
  window.VolleyEye &&
  window.VolleyEye.matchSettings &&
  typeof window.VolleyEye.matchSettings.createMatchSettings === "function" &&
  window.VolleyEye.matchSettings.createMatchSettings({
    state,
    getTodayIso,
    ensureMatchDefaults,
    // Defined in court-ui-bootstrap, loaded later in the classic-script chain.
    setCurrentSet: (...args) => setCurrentSet(...args),
    syncCurrentSetUI,
    saveState,
    elOpponent,
    elCategory,
    elDate,
    elMatchType,
    elLeg,
    elCurrentSet,
    elPlayersInput,
    elOpponentPlayersInput
  })) || {
  applyMatchInfoToUI: () => {},
  saveMatchInfoFromUI: () => {},
  applyPlayersFromStateToTextarea: () => {},
  applyOpponentPlayersFromStateToTextarea: () => {}
};
const {
  applyMatchInfoToUI,
  saveMatchInfoFromUI,
  applyPlayersFromStateToTextarea,
  applyOpponentPlayersFromStateToTextarea
} = matchSettings;
const opponentSettings =
  (typeof window !== "undefined" &&
    window.VolleyEye &&
    window.VolleyEye.opponentSettings &&
    typeof window.VolleyEye.opponentSettings.createOpponentSettings === "function" &&
    window.VolleyEye.opponentSettings.createOpponentSettings({
      state,
      saveState,
      normalizePlayers,
      parseDelimitedTeamText: (...args) => parseDelimitedTeamText(...args),
      buildNumbersForNames,
      syncOpponentPlayerNumbers,
      renderOpponentPlayersList,
      renderOpponentLiberoTags: (...args) => renderOpponentLiberoTags(...args),
      applyOpponentPlayersFromStateToTextarea,
      onRenameReferences: replaceOpponentPlayerNameEverywhere,
      elNewOpponentPlayerInput,
      elOpponentPlayersInput
    })) || {
    updateOpponentPlayersList: () => {},
    addOpponentPlayer: () => {},
    addOpponentPlayerFromInput: () => {},
    applyOpponentPlayersFromTextarea: () => {},
    clearOpponentPlayers: () => {},
    handleOpponentNumberChange: () => {},
    renameOpponentPlayerAtIndex: () => {},
    removeOpponentPlayerAtIndex: () => {},
    toggleOpponentLibero: () => {},
    setOpponentCaptain: () => {}
  };
const {
  updateOpponentPlayersList,
  addOpponentPlayer,
  addOpponentPlayerFromInput,
  applyOpponentPlayersFromTextarea,
  clearOpponentPlayers,
  handleOpponentNumberChange,
  renameOpponentPlayerAtIndex,
  removeOpponentPlayerAtIndex,
  toggleOpponentLibero,
  setOpponentCaptain
} = opponentSettings;
function toggleOpponentLiberoAndRefresh(name, active) {
  toggleOpponentLibero(name, active);
  if (typeof enforceAutoLiberoForScope === "function") {
    enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
  }
  if (typeof renderOpponentPlayers === "function") {
    renderOpponentPlayers();
  }
  renderOpponentLiberoChipsInline();
}
function renderPlayersManagerList() {
  if (!elPlayersList || !window.VolleyEye || !window.VolleyEye.teamUi) return;
  const numbersMap = state.playerNumbers || {};
  const list = state.players || [];
  const noNumber = list.filter(name => getPlayerNumberValue(name, numbersMap) === null);
  const withNumber = list.filter(name => getPlayerNumberValue(name, numbersMap) !== null);
  const ordered = noNumber.concat(sortNamesByNumber(withNumber, numbersMap));
  const idxMap = new Map((state.players || []).map((name, idx) => [name, idx]));
  window.VolleyEye.teamUi.renderTeamPills({
    container: elPlayersList,
    players: ordered,
    numbers: state.playerNumbers || {},
    emptyMessage: "Nessuna giocatrice aggiunta.",
    fallbackNumber: (idx, name) => getPlayerNumber(name) || idx + 1,
    onRename: (idx, newName) => {
      const name = ordered[idx];
      const actualIdx = idxMap.get(name);
      if (typeof actualIdx !== "number") return;
      renamePlayerAtIndex(actualIdx, newName);
    },
    onNumberChange: handlePlayerNumberChange,
    onRemove: idx => {
      const name = ordered[idx];
      const actualIdx = idxMap.get(name);
      if (typeof actualIdx !== "number") return;
      removePlayerAtIndex(actualIdx);
    }
  });
  renderLiberoTags();
}
function renderOpponentPlayersList() {
  if (!elOpponentPlayersList || !window.VolleyEye || !window.VolleyEye.teamUi) return;
  const numbersMap = state.opponentPlayerNumbers || {};
  const list = state.opponentPlayers || [];
  const noNumber = list.filter(name => getPlayerNumberValue(name, numbersMap) === null);
  const withNumber = list.filter(name => getPlayerNumberValue(name, numbersMap) !== null);
  const ordered = noNumber.concat(sortNamesByNumber(withNumber, numbersMap));
  const idxMap = new Map((state.opponentPlayers || []).map((name, idx) => [name, idx]));
  window.VolleyEye.teamUi.renderTeamPills({
    container: elOpponentPlayersList,
    players: ordered,
    numbers: state.opponentPlayerNumbers || {},
    emptyMessage: "Nessuna giocatrice avversaria aggiunta.",
    fallbackNumber: (idx, name) =>
      (state.opponentPlayerNumbers && state.opponentPlayerNumbers[name]) || idx + 1,
    showLiberoToggle: true,
    showCaptainToggle: true,
    liberoSet: new Set(state.opponentLiberos || []),
    captainSet: new Set(state.opponentCaptains || []),
    onRename: (idx, newName) => {
      const name = ordered[idx];
      const actualIdx = idxMap.get(name);
      if (typeof actualIdx !== "number") return;
      renameOpponentPlayerAtIndex(actualIdx, newName);
    },
    onNumberChange: handleOpponentNumberChange,
    onRemove: idx => {
      const name = ordered[idx];
      const actualIdx = idxMap.get(name);
      if (typeof actualIdx !== "number") return;
      removeOpponentPlayerAtIndex(actualIdx);
    },
    onToggleLibero: toggleOpponentLiberoAndRefresh,
    onToggleCaptain: (name, active) => setOpponentCaptain(active ? name : "")
  });
  renderOpponentLiberoTags();
}
