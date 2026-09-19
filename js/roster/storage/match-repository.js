function getMatchStorageKey(name) {
  return MATCH_PREFIX + name;
}
function listMatchesFromStorage() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(MATCH_PREFIX))
    .map(k => k.replace(MATCH_PREFIX, ""));
}
function loadMatchFromStorage(name) {
  if (!name) return null;
  try {
    const raw = localStorage.getItem(getMatchStorageKey(name));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    logError("Error loading match " + name, e);
    return null;
  }
}
function getMatchPayloadTimestamp(payload) {
  if (!payload || typeof payload !== "object") return 0;
  const stateTs = Number(payload.state && payload.state.lastSavedAt);
  if (Number.isFinite(stateTs) && stateTs > 0) return stateTs;
  const savedAt = Date.parse(payload.savedAt || payload.exportedAt || "");
  return Number.isFinite(savedAt) ? savedAt : 0;
}
function saveMatchToStorage(name, data) {
  if (!name) return;
  try {
    if (typeof window !== "undefined") {
      const resetCooldownActive =
        Number.isFinite(window.__recentAppResetAt) &&
        Date.now() - window.__recentAppResetAt < 5000;
      if (window.__appResetInProgress || resetCooldownActive) {
        window.__resetWriteLog = window.__resetWriteLog || [];
        window.__resetWriteLog.push({
          kind: "saveMatchToStorage-blocked",
          at: new Date().toISOString(),
          name,
          selectedMatch: state && state.selectedMatch,
          loadedMatchName: state && state.loadedMatchName,
          stack: new Error().stack
        });
        return false;
      }
    }
    if (typeof window !== "undefined" && window.__debugMatchWrites) {
      console.group("[saveMatchToStorage]", name);
      console.log("payload.name", data && data.name);
      console.log("payload.exportedAt", data && data.exportedAt);
      console.log("selectedMatch", state && state.selectedMatch);
      console.log("loadedMatchName", state && state.loadedMatchName);
      console.trace();
      console.groupEnd();
    }
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("debug_matches") === "1") {
          console.groupCollapsed("[match-save]", name);
          console.log("storageKey", getMatchStorageKey(name));
          console.log("payload", data);
          console.trace();
          console.groupEnd();
        }
      } catch (_) {
        // ignore debug tracing failures
      }
    }
    localStorage.setItem(getMatchStorageKey(name), JSON.stringify(data));
    return true;
  } catch (e) {
    const isQuota =
      e &&
      (e.name === "QuotaExceededError" ||
        e.code === 22 ||
        e.code === 1014);
    if (!isQuota) {
      logError("Error saving match " + name, e);
    }
    return false;
  }
}
function deleteMatchFromStorage(name) {
  if (!name) return;
  try {
    localStorage.removeItem(getMatchStorageKey(name));
  } catch (e) {
    logError("Error deleting match " + name, e);
  }
}
function loadMatchesMapFromStorage() {
  const map = {};
  listMatchesFromStorage().forEach(name => {
    const data = loadMatchFromStorage(name);
    if (!data) return;
    map[name] = data;
  });
  return map;
}
function migrateMatchesToPersistent(options = {}) {
  const { onlyIfStorageEmpty = false } = options || {};
  if (!state.savedMatches || Object.keys(state.savedMatches).length === 0) return;
  if (onlyIfStorageEmpty && listMatchesFromStorage().length > 0) return;
  Object.entries(state.savedMatches).forEach(([name, data]) => {
    if (!localStorage.getItem(getMatchStorageKey(name))) {
      saveMatchToStorage(name, data);
    }
  });
}
function syncMatchesFromStorage() {
  const storedMatches = loadMatchesMapFromStorage();
  // Mantieni i match presenti nello snapshot quando lo storage dedicato non è
  // ancora disponibile (ad esempio al primo avvio dopo il caricamento demo).
  state.savedMatches =
    Object.keys(storedMatches).length > 0
      ? storedMatches
      : state.savedMatches && typeof state.savedMatches === "object"
        ? cloneIsolationData(state.savedMatches)
        : {};
  const names = Object.keys(state.savedMatches || {});
  if (state.selectedMatch && !names.includes(state.selectedMatch)) {
    state.selectedMatch = "";
  }
  if (state.loadedMatchName && !names.includes(state.loadedMatchName)) {
    state.loadedMatchName = "";
  }
}
function getMatchArchiveLabel(name, payload, allNames = []) {
  const displayName =
    payload && payload.state && payload.state.match
      ? buildMatchDisplayName(payload.state.match)
      : name;
  const duplicateNames = allNames.filter(otherName => {
    const otherPayload = state.savedMatches && state.savedMatches[otherName];
    const otherDisplayName =
      otherPayload && otherPayload.state && otherPayload.state.match
        ? buildMatchDisplayName(otherPayload.state.match)
        : otherName;
    return otherDisplayName === displayName;
  });
  if (duplicateNames.length < 2) return displayName || name;
  return `${displayName || name} (${duplicateNames.indexOf(name) + 1})`;
}
function getArchivedTeamNames() {
  syncTeamsFromStorage();
  return Object.keys(state.savedTeams || {});
}
function buildArchivedTeamOptions(names, unavailableName = "") {
  return names.map(name => ({
    value: name,
    label: name === unavailableName ? `${name} (squadra principale)` : name,
    disabled: name === unavailableName
  }));
}
function renderArchivedTeamsSelect(select, options = {}) {
  const names = getArchivedTeamNames();
  const teamOptions = buildArchivedTeamOptions(names, options.unavailableName || "");
  const requestedName = options.selectedName || "";
  const selectedName = teamOptions.some(option => option.value === requestedName && !option.disabled)
    ? requestedName
    : "";
  select.innerHTML = "";
  if (names.length === 0) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = options.emptyLabel;
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    select.disabled = true;
    return names;
  }
  select.disabled = false;
  if (!selectedName) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = options.placeholderLabel;
    placeholder.selected = true;
    select.appendChild(placeholder);
  }
  teamOptions.forEach(teamOption => {
    const option = document.createElement("option");
    option.value = teamOption.value;
    option.textContent = teamOption.label;
    option.disabled = teamOption.disabled;
    select.appendChild(option);
  });
  select.value = selectedName;
  return names;
}
function renderTeamsSelect() {
  if (!elTeamsSelect) return;
  const prev = (state.match && state.match.teamName) || elTeamsSelect.value || state.selectedTeam || "";
  const names = renderArchivedTeamsSelect(elTeamsSelect, {
    selectedName: prev,
    emptyLabel: "Nessuna squadra salvata",
    placeholderLabel: "Seleziona squadra"
  });
  const emptyHint = document.getElementById("teams-empty-hint");
  if (emptyHint) {
    emptyHint.classList.toggle("hidden", names.length > 0);
  }
  updateTeamButtonsState();
}
function renderOpponentTeamsSelect() {
  if (!elOpponentTeamsSelect) return;
  const previousSelection = elOpponentTeamsSelect.value || state.selectedOpponentTeam || "";
  const selectedName = previousSelection === state.selectedTeam ? "" : previousSelection;
  renderArchivedTeamsSelect(elOpponentTeamsSelect, {
    selectedName,
    emptyLabel: "Nessuna squadra salvata",
    placeholderLabel: "Seleziona avversaria",
    unavailableName: state.selectedTeam || ""
  });
  updateOpponentTeamButtonsState();
}
function hasMatchDataForReset() {
  return Array.isArray(state.events) && state.events.length > 0;
}
function restoreMatchInfoAfterReset(preserved) {
  if (!preserved) return;
  state.match = state.match || {};
  state.match.category = preserved.category || "";
  state.match.date = preserved.date || (typeof getTodayIso === "function" ? getTodayIso() : "");
  state.match.matchType = preserved.matchType || "amichevole";
  state.match.leg = preserved.leg || "";
  state.match.teamName = preserved.teamName || state.selectedTeam || "";
  if (state.useOpponentTeam && state.selectedOpponentTeam) {
    state.match.opponent = state.selectedOpponentTeam;
  } else {
    state.match.opponent = preserved.opponent || "";
  }
  state.match.opponentManual =
    preserved.opponentManual ||
    (state.useOpponentTeam ? preserved.opponentManual || "" : state.match.opponent || "");
  if (typeof applyMatchInfoToUI === "function") {
    applyMatchInfoToUI();
  }
  renderMatchSummary();
  saveState();
}
function renderMatchesSelect() {
  if (!elSavedMatchesSelect) return;
  syncMatchesFromStorage();
  const names = Object.keys(state.savedMatches || {});
  const prev = elSavedMatchesSelect.value || state.selectedMatch || "";
  elSavedMatchesSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Nuovo match (vuoto)";
  elSavedMatchesSelect.appendChild(placeholder);
  names.forEach(name => {
    const payload = state.savedMatches && state.savedMatches[name];
    const label = getMatchArchiveLabel(name, payload, names);
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = label || name;
    elSavedMatchesSelect.appendChild(opt);
  });
  if (prev && names.includes(prev)) {
    elSavedMatchesSelect.value = prev;
    state.selectedMatch = prev;
  } else {
    elSavedMatchesSelect.value = "";
    state.selectedMatch = "";
  }
  renderMatchesList(names, elSavedMatchesSelect.value || "");
  applyMatchRequirementLock();
  renderMatchSummary();
  updateMatchButtonsState();
}
function renderMatchesList(names, selected) {
  if (!elSavedMatchesList) return;
  elSavedMatchesList.innerHTML = "";
  if (!names || names.length === 0) {
    const empty = document.createElement("div");
    empty.className = "match-list-empty";
    empty.textContent = "Nessun match salvato.";
    elSavedMatchesList.appendChild(empty);
    return;
  }
  names.forEach(name => {
    const payload = state.savedMatches && state.savedMatches[name];
    const label = getMatchArchiveLabel(name, payload, names);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "match-list-item match-list-open" + (name === selected ? " active" : "");
    btn.dataset.matchName = name;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", name === selected ? "true" : "false");
    btn.textContent = label || name;
    elSavedMatchesList.appendChild(btn);
  });
}
function renderMatchSummary() {
  if (!elMatchSummary) return;
  const label = buildMatchDisplayName(state.match);
  elMatchSummary.textContent = label || "—";
}
