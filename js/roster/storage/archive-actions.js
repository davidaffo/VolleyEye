function getCurrentTeamPayload(name = "") {
  const safeName = (name || state.selectedTeam || (state.match && state.match.teamName) || "squadra").trim();
  const existing = safeName ? loadTeamNormalized(safeName) : null;
  const staff = existing?.staff || Object.assign({}, DEFAULT_STAFF);
  const defaultLineup = Array.isArray(existing?.defaultLineup) ? existing.defaultLineup : [];
  const detailed = Array.isArray(existing?.playersDetailed) ? existing.playersDetailed : [];
  const activePlayers = normalizePlayers(state.players || []);
  const detailedByName = new Map(detailed.filter(Boolean).map(player => [player.name, player]));
  const captainSet = new Set(state.captains || []);
  const playersDetailed = activePlayers
    .map(pName => {
      const previous = detailedByName.get(pName) || {};
      const hasCurrentNumber =
        state.playerNumbers && Object.prototype.hasOwnProperty.call(state.playerNumbers, pName);
      const firstName = String(previous.firstName || "").trim();
      const lastName = String(previous.lastName || "").trim() || (!firstName ? pName : "");
      return Object.assign({}, previous, {
        id: isValidPlayerId(previous.id) ? previous.id : generatePlayerId(),
        name: buildFullName(lastName, firstName) || pName,
        firstName,
        lastName,
        codeOfficial: typeof previous.codeOfficial === "string" ? previous.codeOfficial : "",
        number: hasCurrentNumber ? state.playerNumbers[pName] : previous.number || "",
        role: (state.liberos || []).includes(pName) ? "L" : "",
        isCaptain: captainSet.has(pName),
        out: false
      });
    })
    .concat(
      detailed
        .filter(player => player && !activePlayers.includes(player.name))
        .map(player => Object.assign({}, player, { isCaptain: false, out: true }))
    );
  enforceSingleCaptainFlag(playersDetailed, state.captains && state.captains[0]);
  const liberos = playersDetailed.filter(p => p.role === "L" && !p.out).map(p => p.name);
  const preferredLibero =
    liberos.includes(state.preferredLibero) ? state.preferredLibero : liberos[0] || "";
  const numbers = {};
  playersDetailed.forEach(p => {
    if (p.number !== undefined && p.number !== null && p.number !== "") {
      numbers[p.name] = String(p.number);
    }
  });
  const players = playersDetailed.filter(p => !p.out).map(p => p.name);
  const captains = playersDetailed.filter(p => p.isCaptain && !p.out).map(p => p.name).slice(0, 1);
  return {
    version: 3,
    name: safeName,
    staff,
    officialCode: existing?.officialCode || "",
    officialId: existing?.officialId || "",
    playersDetailed,
    players,
    liberos,
    numbers,
    captains,
    defaultLineup,
    preferredLibero
  };
}
function getCurrentOpponentPayload(name = "") {
  const safeName = (name || state.selectedOpponentTeam || state.match.opponent || "avversaria").trim();
  const existing = safeName ? loadTeamNormalized(safeName) : null;
  const players = normalizePlayers(state.opponentPlayers || []);
  const numbers = {};
  players.forEach(p => {
    const num = state.opponentPlayerNumbers && state.opponentPlayerNumbers[p];
    if (num !== undefined && num !== null && num !== "") {
      numbers[p] = String(num);
    }
  });
  const liberos = normalizePlayers(state.opponentLiberos || []).filter(n => players.includes(n));
  const preferredLibero =
    liberos.includes(state.opponentPreferredLibero) ? state.opponentPreferredLibero : liberos[0] || "";
  const captains = normalizePlayers(state.opponentCaptains || []).filter(n => players.includes(n)).slice(0, 1);
  const existingDetailed = existing?.playersDetailed || [];
  const existingMap = new Map(existingDetailed.map(p => [p.name, p]));
  const playersDetailed = players
    .map(p => {
      const prev = existingMap.get(p);
      const currentNumber = Object.prototype.hasOwnProperty.call(numbers, p)
        ? numbers[p]
        : (prev && prev.number) || "";
      const firstName = String((prev && prev.firstName) || "").trim();
      const lastName = String((prev && prev.lastName) || "").trim() || (!firstName ? p : "");
      return Object.assign({}, prev || {}, {
        id: prev && isValidPlayerId(prev.id) ? prev.id : generatePlayerId(),
        name: buildFullName(lastName, firstName) || p,
        firstName,
        lastName,
        codeOfficial: prev && typeof prev.codeOfficial === "string" ? prev.codeOfficial : "",
        number: currentNumber,
        role: liberos.includes(p) ? "L" : "",
        isCaptain: captains.includes(p),
        out: false
      });
    })
    .concat(
      existingDetailed
        .filter(player => player && !players.includes(player.name))
        .map(player => Object.assign({}, player, { isCaptain: false, out: true }))
    );
  enforceSingleCaptainFlag(playersDetailed, captains[0] || "");
  return {
    version: 3,
    name: safeName,
    staff: existing?.staff || Object.assign({}, DEFAULT_STAFF),
    officialCode: existing?.officialCode || "",
    officialId: existing?.officialId || "",
    playersDetailed,
    players,
    liberos,
    numbers,
    captains,
    defaultLineup: Array.isArray(existing?.defaultLineup) ? existing.defaultLineup : [],
    defaultRotation: existing?.defaultRotation || 1,
    preferredLibero
  };
}
function saveCurrentTeam() {
  if (!state.players || state.players.length === 0) {
    alert("Aggiungi almeno una giocatrice prima di salvare.");
    return;
  }
  let name = prompt(
    "Nome della squadra da salvare:",
    state.selectedTeam || (state.match && state.match.teamName) || ""
  );
  if (!name) return;
  name = name.trim();
  if (!name) return;
  const names = listTeamsFromStorage();
  const exists = names.includes(name);
  if (exists) {
    const ok = confirm("Esiste già una squadra con questo nome. Sovrascrivere?");
    if (!ok) return;
  }
  const payload = getCurrentTeamPayload(name);
  const compact = compactTeamPayload(payload, name);
  if (!saveTeamToStorage(name, compact)) {
    alert("Impossibile salvare la squadra. Controlla lo spazio disponibile nel browser.");
    return;
  }
  state.savedTeams = state.savedTeams || {};
  state.savedTeams[name] = compact;
  state.selectedTeam = name;
  saveState();
  renderTeamsSelect();
  alert("Squadra salvata: " + name);
}
function saveCurrentOpponentTeam() {
  if (!state.opponentPlayers || state.opponentPlayers.length === 0) {
    alert("Aggiungi almeno una giocatrice avversaria prima di salvare.");
    return;
  }
  const existing = state.selectedOpponentTeam;
  let name = existing;
  if (!name) {
    name = prompt("Nome della squadra avversaria da salvare:", state.match.opponent || "");
    if (!name) return;
    name = name.trim();
  }
  if (!name) return;
  if (name === state.selectedTeam) {
    alert("Non puoi impostare come avversaria la stessa squadra selezionata.");
    return;
  }
  const payload = getCurrentOpponentPayload(name);
  const compact = compactTeamPayload(payload, name);
  if (!saveOpponentTeamToStorage(name, compact)) {
    alert("Impossibile salvare l'avversaria. Controlla lo spazio disponibile nel browser.");
    return;
  }
  state.savedOpponentTeams = state.savedOpponentTeams || {};
  state.savedOpponentTeams[name] = compact;
  state.selectedOpponentTeam = name;
  if (!state.match.opponent) {
    state.match.opponent = name;
    applyMatchInfoToUI();
  }
  saveState();
  renderOpponentTeamsSelect();
  alert((existing ? "Avversaria sovrascritta: " : "Avversaria salvata: ") + name);
}
function deleteSelectedTeam() {
  if (!elTeamsSelect) return;
  const name = elTeamsSelect.value;
  if (!name) return;
  const ok = confirm("Eliminare la squadra \"" + name + "\"?");
  if (!ok) return;
  deleteTeamFromStorage(name);
  syncTeamsFromStorage();
  renderTeamsSelect();
  refreshTeamManagerFromSelection();
}
function duplicateSelectedTeam() {
  if (!elTeamsSelect) return;
  const name = elTeamsSelect.value;
  if (!name) {
    alert("Seleziona una squadra da duplicare.");
    return;
  }
  const team = loadTeamFromStorage(name);
  if (!team) {
    alert("Squadra non trovata o corrotta.");
    return;
  }
  let newName = prompt("Nome della nuova squadra:", name + " (copia)") || "";
  newName = newName.trim();
  if (!newName) return;
  if (newName === name) {
    alert("Scegli un nome diverso per la copia.");
    return;
  }
  const names = listTeamsFromStorage();
  if (names.includes(newName)) {
    const ok = confirm("Esiste già una squadra con questo nome. Sovrascrivere?");
    if (!ok) return;
  }
  if (!saveTeamToStorage(newName, team)) {
    alert("Impossibile creare la copia. Controlla lo spazio disponibile nel browser.");
    return;
  }
  syncTeamsFromStorage();
  renderTeamsSelect();
  alert("Copia salvata nell'archivio: " + newName);
}
function deleteSelectedOpponentTeam() {
  if (!elOpponentTeamsSelect) return;
  const name = elOpponentTeamsSelect.value;
  if (!name) return;
  const ok = confirm("Eliminare l'avversaria \"" + name + "\"?");
  if (!ok) return;
  deleteOpponentTeamFromStorage(name);
  syncOpponentTeamsFromStorage();
  renderOpponentTeamsSelect();
}
function getCurrentMatchPayload(name = "") {
  const safeName = (name || state.loadedMatchName || state.selectedMatch || state.match.opponent || "match").trim();
  const payload = buildMatchExportPayload();
  payload.name = safeName;
  return payload;
}
function saveCurrentMatch() {
  const saved = persistCurrentMatch({ allowCreate: true });
  if (saved === false) {
    alert("Impossibile salvare il match. Controlla lo spazio disponibile nel browser.");
  }
}
function applyMatchPayload(payload, opts = {}) {
  if (!payload || !payload.state) return;
  applyImportedMatch(payload.state, { silent: opts.silent });
  state.selectedMatch = opts.selectedName || payload.name || "";
  state.loadedMatchName = state.selectedMatch;
  saveState();
  renderMatchesSelect();
}
function loadSelectedMatch() {
  if (!elSavedMatchesSelect) return;
  if (!isLoadingMatch && (state.loadedMatchName || "").trim()) {
    persistCurrentMatch({ allowCreate: false });
  }
  const name = elSavedMatchesSelect.value;
  if (!name) {
    state.selectedMatch = "";
    state.loadedMatchName = "";
    resetMatchState({ skipMatchesRender: true });
    // Hard reset del set per evitare trascinamenti da match precedenti.
    state.setResults = {};
    state.setStarts = {};
    if (typeof setCurrentSet === "function") {
      setCurrentSet(1, { save: false });
    } else {
      state.currentSet = 1;
      if (typeof syncCurrentSetUI === "function") syncCurrentSetUI(1);
    }
    state.selectedMatch = generateMatchName();
    state.loadedMatchName = state.selectedMatch;
    persistCurrentMatch({ allowCreate: true });
    if (typeof syncMatchInfoInputs === "function") {
      syncMatchInfoInputs(state.match);
    }
    return;
  }
  const data =
    loadMatchFromStorage(name) ||
    (state.savedMatches && state.savedMatches[name]) ||
    null;
  if (!data) {
    alert("Match non trovato o corrotto.");
    return;
  }
  isLoadingMatch = true;
  if (typeof window !== "undefined") {
    window.isLoadingMatch = true;
  }
  try {
    applyMatchPayload(data, { selectedName: name, silent: true });
    if (typeof syncMatchInfoInputs === "function") {
      syncMatchInfoInputs(state.match);
    }
  } finally {
    isLoadingMatch = false;
    if (typeof window !== "undefined") {
      window.isLoadingMatch = false;
    }
  }
}
function pauseAndPersistCurrentMatch() {
  const currentName = (state.loadedMatchName || state.selectedMatch || "").trim();
  const hasCurrentMatch = !!currentName || (Array.isArray(state.events) && state.events.length > 0);
  if (!hasCurrentMatch) return true;
  const previousLoadedMatchName = state.loadedMatchName || "";
  const previousSelectedMatch = state.selectedMatch || "";
  const previousSavedMatches = cloneIsolationData(state.savedMatches || {});
  const previousFinished = !!state.matchFinished;
  const previousSkillClock =
    typeof snapshotSkillClock === "function" ? snapshotSkillClock() : null;
  const previousVideoClock =
    typeof snapshotVideoClock === "function" ? snapshotVideoClock() : null;
  if (typeof pauseSkillClock === "function") pauseSkillClock();
  if (typeof pauseVideoClock === "function") pauseVideoClock();
  state.matchFinished = true;
  const stored = persistCurrentMatch({ allowCreate: true });
  if (stored) return true;
  state.loadedMatchName = previousLoadedMatchName;
  state.selectedMatch = previousSelectedMatch;
  state.savedMatches = previousSavedMatches;
  state.matchFinished = previousFinished;
  if (previousSkillClock && typeof restoreSkillClock === "function") {
    restoreSkillClock(previousSkillClock);
  }
  if (previousVideoClock && typeof restoreVideoClock === "function") {
    restoreVideoClock(previousVideoClock);
  }
  if (typeof updateMatchStatusUI === "function") updateMatchStatusUI();
  return false;
}
function createNewMatchFromPrompt() {
  const currentOpponent =
    state.useOpponentTeam && state.selectedOpponentTeam
      ? state.selectedOpponentTeam
      : (state.match && state.match.opponent) || "";
  const opponentName = prompt("Avversario del nuovo match:", currentOpponent || "");
  if (opponentName === null) return false;
  const opponent = opponentName.trim();
  if (!opponent) {
    alert("Inserisci un avversario per creare il nuovo match.");
    return false;
  }
  const ok =
    !state.events || state.events.length === 0
      ? true
      : confirm("Il match attuale verrà messo in pausa e salvato in archivio. Creare il nuovo match?");
  if (!ok) return false;
  if (!isLoadingMatch && !pauseAndPersistCurrentMatch()) {
    alert("Impossibile salvare il match attuale. Il nuovo match non è stato creato.");
    return false;
  }
  const keepSelectedOpponent =
    !!state.selectedOpponentTeam &&
    state.selectedOpponentTeam.localeCompare(opponent, "it", { sensitivity: "base" }) === 0;
  state.selectedMatch = "";
  state.loadedMatchName = "";
  resetMatchState({ skipMatchesRender: true });
  if (!keepSelectedOpponent) {
    state.selectedOpponentTeam = "";
    state.useOpponentTeam = false;
    state.opponentPlayers = [];
    state.opponentPlayerNumbers = {};
    state.opponentLiberos = [];
    state.opponentCaptains = [];
    state.opponentStats = {};
    state.opponentCourt = Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
    state.opponentAutoRoleBaseCourt = [];
    state.opponentLiberoAutoMap = {};
    state.opponentPreferredLibero = "";
  }
  state.setResults = {};
  state.setStarts = {};
  if (typeof setCurrentSet === "function") {
    setCurrentSet(1, { save: false });
  } else {
    state.currentSet = 1;
    if (typeof syncCurrentSetUI === "function") syncCurrentSetUI(1);
  }
  state.match = Object.assign({}, state.match || {}, {
    opponent,
    opponentManual: opponent,
    date: (state.match && state.match.date) || getTodayIso(),
    matchType: (state.match && state.match.matchType) || "amichevole",
    teamName: state.selectedTeam || (state.match && state.match.teamName) || ""
  });
  state.selectedMatch = generateMatchName();
  state.loadedMatchName = state.selectedMatch;
  persistCurrentMatch({ allowCreate: true });
  if (typeof syncMatchInfoInputs === "function") {
    syncMatchInfoInputs(state.match);
  }
  if (typeof renderMatchSummary === "function") {
    renderMatchSummary();
  }
  return true;
}
function deleteSelectedMatch() {
  if (!elSavedMatchesSelect && !elSavedMatchesList) return;
  const name = elSavedMatchesSelect ? elSavedMatchesSelect.value : "";
  if (!name) return;
  const ok = confirm('Eliminare il match "' + name + '"?');
  if (!ok) return;
  const wasCurrent = (state.loadedMatchName || state.selectedMatch || "") === name;
  deleteMatchFromStorage(name);
  if (state.savedMatches && Object.prototype.hasOwnProperty.call(state.savedMatches, name)) {
    delete state.savedMatches[name];
  }
  syncMatchesFromStorage();
  state.selectedMatch = "";
  state.loadedMatchName = "";
  if (elSavedMatchesSelect) {
    elSavedMatchesSelect.value = "";
  }
  if (wasCurrent) {
    resetMatchState();
    return;
  }
  saveState({ persistLocal: true, skipMatchPersist: true });
  renderMatchesSelect();
}
function renameSelectedMatch() {
  // intentionally no-op: naming is automatic from match info
}
function resetMatchState(options = {}) {
  const { skipMatchesRender = false } = options || {};
  const stripReplaced = court =>
    (court || []).map(slot => ({
      main: typeof slot === "string" ? slot : (slot && slot.main) || "",
      replaced: ""
    }));
  const preservedCourt = state.court ? stripReplaced(state.court) : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedRotation = state.rotation || 1;
  const preservedServing = !!state.isServing;
  const preservedAutoRoleCourt = Array.isArray(state.autoRoleBaseCourt)
    ? stripReplaced(state.autoRoleBaseCourt)
    : [];
  const preservedPreferredLibero = state.preferredLibero || "";
  const preservedOpponentCourt = Array.isArray(state.opponentCourt)
    ? stripReplaced(state.opponentCourt)
    : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedOpponentRotation = state.opponentRotation || 1;
  if (typeof resetSetTypeState === "function") {
    resetSetTypeState();
  }
  const preservedTeamName = state.selectedTeam || (state.match && state.match.teamName) || "";
  state.match = {
    teamName: preservedTeamName,
    opponent: "",
    category: "",
    date: getTodayIso(),
    leg: "",
    matchType: "amichevole"
  };
  state.events = [];
  state.stats = {};
  const defaults = getSelectedTeamDefaultSettings();
  if (defaults && defaults.defaultLineup && defaults.defaultLineup.length > 0) {
    applyDefaultLineup(defaults.defaultLineup, defaults.defaultRotation || 1);
  } else {
    state.court = preservedCourt;
    autoRoleBaseCourt = preservedAutoRoleCourt.length ? [...preservedAutoRoleCourt] : null;
    state.autoRoleBaseCourt = preservedAutoRoleCourt;
    state.rotation = preservedRotation;
  }
  const opponentDefaults = getSelectedOpponentTeamDefaultSettings();
  if (state.useOpponentTeam && opponentDefaults && opponentDefaults.defaultLineup && opponentDefaults.defaultLineup.length > 0) {
    applyOpponentDefaultLineup(opponentDefaults.defaultLineup, opponentDefaults.defaultRotation || 1);
  } else {
    state.opponentCourt = preservedOpponentCourt;
    state.opponentRotation = preservedOpponentRotation;
  }
  state.isServing = preservedServing;
  state.currentSet = 1;
  state.setResults = {};
  state.setStarts = {};
  state.matchFinished = false;
  if (typeof syncCurrentSetUI === "function") {
    syncCurrentSetUI(1);
  }
  state.scoreOverrides = {};
  state.autoRotatePending = false;
  state.opponentAutoRotatePending = false;
  state.skillFlowOverride = null;
  state.opponentSkillFlowOverride = null;
  state.freeballPending = false;
  state.freeballPendingScope = "our";
  state.flowTeamScope = preservedServing ? "our" : "opponent";
  state.pendingServe = null;
  state.forceSkillActive = false;
  state.forceSkillScope = null;
  state.matchEndSetSnapshot = null;
  state.matchEndSetRecorded = null;
  state.liberoAutoMap = {};
  state.preferredLibero = preservedPreferredLibero;
  state.courtViewMirrored = false;
  state.skillClock = { paused: true, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: 0 };
  state.video = {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  state.videoFilterPresets = [];
  state.videoClock = {
    paused: true,
    pausedAtMs: null,
    pausedAccumMs: 0,
    startMs: Date.now(),
    currentSeconds: 0
  };
  if (typeof clearEventSelection === "function") {
    clearEventSelection({ clearContexts: true });
  }
  if (typeof clearCachedLocalVideo === "function") {
    clearCachedLocalVideo();
  }
  if (typeof ytPlayer !== "undefined" && ytPlayer && ytPlayer.stopVideo) {
    ytPlayer.stopVideo();
  }
  if (typeof elAnalysisVideo !== "undefined" && elAnalysisVideo) {
    elAnalysisVideo.pause();
    elAnalysisVideo.currentTime = 0;
  }
  if (typeof elYoutubeFrame !== "undefined" && elYoutubeFrame) {
    elYoutubeFrame.src = "";
    elYoutubeFrame.style.display = "none";
  }
  enforceAutoLiberoForState({ skipServerOnServe: true });
  initStats();
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  renderBenchChips();
  updateRotationDisplay();
  applyMatchInfoToUI();
  if (!skipMatchesRender) {
    renderMatchesSelect();
  }
}
function renameSelectedTeam() {
  if (!elTeamsSelect) return;
  const oldName = elTeamsSelect.value;
  if (!oldName) {
    alert("Seleziona una squadra da rinominare.");
    return;
  }
  const currentData = loadTeamFromStorage(oldName);
  if (!currentData) {
    alert("Squadra non trovata o corrotta.");
    return;
  }
  let newName = prompt("Nuovo nome per la squadra:", oldName) || "";
  newName = newName.trim();
  if (!newName) return;
  if (newName === oldName) return;
  const names = listTeamsFromStorage();
  const exists = names.includes(newName);
  if (exists) {
    const overwrite = confirm(
      "Esiste già una squadra con questo nome. Sovrascrivere con la squadra corrente?"
    );
    if (!overwrite) return;
  }
  if (!saveTeamToStorage(newName, currentData)) {
    alert("Impossibile rinominare la squadra: la nuova copia non è stata salvata.");
    return;
  }
  deleteTeamFromStorage(oldName);
  renameTeamReferencesAcrossSavedMatches(oldName, newName, "our");
  syncTeamsFromStorage();
  state.selectedTeam = newName;
  renderTeamsSelect();
  refreshTeamManagerFromSelection();
  alert("Squadra rinominata in \"" + newName + "\".");
}
function renameTeamReferencesInNode(node, oldName, newName, scope = "our") {
  if (!node || typeof node !== "object") return 0;
  const keyNames =
    scope === "opponent"
      ? new Set(["selectedOpponentTeam", "opponent"])
      : new Set(["selectedTeam", "teamName"]);
  let changes = 0;
  const walk = value => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    Object.keys(value).forEach(key => {
      const current = value[key];
      if (typeof current === "string" && keyNames.has(key) && current.trim() === oldName) {
        value[key] = newName;
        changes += 1;
        return;
      }
      if (current && typeof current === "object") {
        walk(current);
      }
    });
  };
  walk(node);
  return changes;
}
function renameTeamReferencesAcrossSavedMatches(oldName, newName, scope = "our") {
  if (!oldName || !newName || oldName === newName) return { matchesUpdated: 0, refsUpdated: 0 };
  const sourceMatches =
    typeof loadMatchesMapFromStorage === "function" ? loadMatchesMapFromStorage() : state.savedMatches || {};
  const matches = sourceMatches && typeof sourceMatches === "object" ? sourceMatches : {};
  let matchesUpdated = 0;
  let refsUpdated = 0;
  Object.entries(matches).forEach(([matchName, payload]) => {
    if (!payload || typeof payload !== "object") return;
    const cloned = JSON.parse(JSON.stringify(payload));
    const changed = renameTeamReferencesInNode(cloned, oldName, newName, scope);
    if (!changed) return;
    refsUpdated += changed;
    matchesUpdated += 1;
    matches[matchName] = cloned;
    if (typeof saveMatchToStorage === "function") {
      saveMatchToStorage(matchName, cloned);
    }
  });
  state.savedMatches = matches;
  if (scope === "our") {
    if ((state.selectedTeam || "").trim() === oldName) state.selectedTeam = newName;
    if (state.match && (state.match.teamName || "").trim() === oldName) {
      state.match.teamName = newName;
    }
  } else {
    if ((state.selectedOpponentTeam || "").trim() === oldName) state.selectedOpponentTeam = newName;
    if (state.match && (state.match.opponent || "").trim() === oldName) {
      state.match.opponent = newName;
    }
  }
  return { matchesUpdated, refsUpdated };
}
function renameSelectedOpponentTeam() {
  if (!elOpponentTeamsSelect) return;
  const oldName = elOpponentTeamsSelect.value;
  if (!oldName) {
    alert("Seleziona una squadra avversaria da rinominare.");
    return;
  }
  const currentData = loadOpponentTeamFromStorage(oldName);
  if (!currentData) {
    alert("Squadra avversaria non trovata o corrotta.");
    return;
  }
  let newName = prompt("Nuovo nome per l'avversaria:", oldName) || "";
  newName = newName.trim();
  if (!newName) return;
  if (newName === oldName) return;
  const names = listOpponentTeamsFromStorage();
  const exists = names.includes(newName);
  if (exists) {
    const overwrite = confirm(
      "Esiste già una squadra avversaria con questo nome. Sovrascrivere con il roster corrente?"
    );
    if (!overwrite) return;
  }
  if (!saveOpponentTeamToStorage(newName, currentData)) {
    alert("Impossibile rinominare l'avversaria: la nuova copia non è stata salvata.");
    return;
  }
  deleteOpponentTeamFromStorage(oldName);
  renameTeamReferencesAcrossSavedMatches(oldName, newName, "opponent");
  syncOpponentTeamsFromStorage();
  state.selectedOpponentTeam = newName;
  renderOpponentTeamsSelect();
  alert("Avversaria rinominata in \"" + newName + "\".");
}
async function exportCurrentTeamToFile() {
  if (!state.players || state.players.length === 0) {
    alert("Aggiungi almeno una giocatrice prima di esportare.");
    return;
  }
  const payload = compactTeamPayload(getCurrentTeamPayload());
  const opponentSlug = (payload.name || "squadra").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8;"
  });
  downloadBlob(blob, "squadra_" + (opponentSlug || "export") + ".json");
}
async function exportCurrentOpponentTeamToFile() {
  if (!state.opponentPlayers || state.opponentPlayers.length === 0) {
    alert("Aggiungi almeno una giocatrice avversaria prima di esportare.");
    return;
  }
  const payload = compactTeamPayload(getCurrentOpponentPayload());
  const slug = (payload.name || "avversaria").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, "avversaria_" + (slug || "export") + ".json");
}
function applyImportedTeamData(data) {
  const normalizedTeam = normalizeTeamPayload(data || {});
  const roster = extractRosterFromTeam(normalizedTeam);
  const players = roster.players || [];
  if (!players || players.length === 0) {
    alert("Il file non contiene giocatrici valide.");
    return;
  }
  if (state.events.length > 0) {
    alert(
      "Non puoi sostituire il roster importando un file durante lo scout. Usa Modifica rapida per aggiungere o correggere giocatrici."
    );
    return;
  }
  const defaultLineup =
    roster.defaultLineup && roster.defaultLineup.length > 0
      ? roster.defaultLineup
      : roster.playersDetailed && roster.playersDetailed.length > 0
        ? roster.playersDetailed.filter(p => !p.out).map(p => p.name)
        : players;
  const applied = updatePlayersList(players, {
    askReset: true,
    liberos: roster.liberos || [],
    playerNumbers: roster.numbers || {},
    captains: roster.captains || [],
    setDefaultLineup: true,
    defaultLineupNames: defaultLineup,
    defaultLineupRotation: roster.defaultRotation || 1,
    preferredLibero: roster.preferredLibero || ""
  });
  if (applied === false) return;
  state.selectedTeam = normalizedTeam && normalizedTeam.name ? normalizedTeam.name : "";
  if (state.selectedTeam) {
    if (!saveTeamToStorage(state.selectedTeam, normalizedTeam)) {
      state.selectedTeam = "";
      alert("Roster importato, ma non archiviato: spazio del browser insufficiente.");
    }
    syncTeamsFromStorage();
    renderTeamsSelect();
  }
  saveState();
  renderLiberoTags();
  renderOpponentLiberoTags();
  renderLiberoChipsInline();
  renderPlayers();
  renderBenchChips();
  renderLineupChips();
  alert("Squadra importata dal file.");
}
function applyImportedOpponentTeamData(data) {
  const normalizedTeam = normalizeTeamPayload(data || {});
  const roster = extractRosterFromTeam(normalizedTeam);
  const players = roster.players || [];
  if (!players || players.length === 0) {
    alert("Il file non contiene giocatrici valide.");
    return;
  }
  if (state.events.length > 0) {
    alert(
      "Non puoi sostituire il roster avversario importando un file durante lo scout. Usa Modifica rapida per aggiungere o correggere giocatrici."
    );
    return;
  }
  const applied = updateOpponentPlayersList(players, {
    liberos: roster.liberos || [],
    playerNumbers: roster.numbers || {},
    captains: roster.captains || []
  });
  if (applied === false) return;
  state.opponentPreferredLibero = roster.preferredLibero || roster.liberos?.[0] || "";
  state.selectedOpponentTeam = (normalizedTeam && normalizedTeam.name) || "";
  if (state.selectedOpponentTeam) {
    if (!saveOpponentTeamToStorage(state.selectedOpponentTeam, normalizedTeam)) {
      state.selectedOpponentTeam = "";
      alert("Roster avversario importato, ma non archiviato: spazio del browser insufficiente.");
    }
    syncOpponentTeamsFromStorage();
    renderOpponentTeamsSelect();
    if (!state.match.opponent) {
      state.match.opponent = state.selectedOpponentTeam;
      applyMatchInfoToUI();
    }
  }
  saveState();
  renderOpponentPlayersList();
  renderOpponentLiberoTags();
  alert("Squadra avversaria importata dal file.");
}
function parseDelimitedTeamText(text) {
  if (!text || typeof text !== "string") return null;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const players = [];
  const playersDetailed = [];
  const numbers = {};
  const liberos = [];
  lines.forEach(rawLine => {
    let name = "";
    let number = "";
    let liberoFlag = "";
    let lastName = "";
    let firstName = "";
    const parts = rawLine.split(/[\t;,]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const isNumberFirst = /^[0-9]{1,3}$/.test(parts[0]);
      const isNumberSecond = /^[0-9]{1,3}$/.test(parts[1]);
      if (isNumberFirst && !isNumberSecond) {
        number = parts[0];
        let tail = parts.slice(1);
        const lastPart = tail[tail.length - 1] || "";
        if (lastPart && lastPart.toLowerCase() === "l") {
          liberoFlag = lastPart;
          tail = tail.slice(0, -1);
        }
        lastName = tail[0] || "";
        firstName = tail.slice(1).join(" ").trim();
        name = buildFullName(lastName, firstName);
      } else if (isNumberSecond) {
        name = parts[0];
        lastName = name;
        number = parts[1];
        liberoFlag = parts[2] || "";
      } else {
        name = parts.join(" ").trim();
        lastName = name;
      }
    } else {
      let match = rawLine.match(/^([0-9]{1,3})\s+(.+?)(?:\s+([Ll]))?$/);
      if (match) {
        number = match[1].trim();
        name = match[2].trim();
        lastName = name;
        liberoFlag = (match[3] || "").trim();
      } else {
        match = rawLine.match(/^(.+?)\s+([0-9]{1,3})(?:\s+([Ll]))?$/);
        if (match) {
          name = match[1].trim();
          lastName = name;
          number = match[2].trim();
          liberoFlag = (match[3] || "").trim();
        }
      }
    }
    const cleanName = normalizePlayers([normalizePlayerNameCase(name)])[0];
    if (!cleanName) return;
    const cleanLastName = normalizePlayerNameCase(lastName || cleanName);
    const cleanFirstName = normalizePlayerNameCase(firstName);
    players.push(cleanName);
    playersDetailed.push({ name: cleanName, lastName: cleanLastName, firstName: cleanFirstName });
    if (number && /^[0-9]{1,3}$/.test(number)) {
      numbers[cleanName] = number;
    }
    if (liberoFlag && liberoFlag.toLowerCase() === "l") {
      liberos.push(cleanName);
    }
  });
  if (players.length === 0) return null;
  return { players, playersDetailed, numbers, liberos };
}
function readCamp3FileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
    reader.readAsArrayBuffer(file);
  });
}
