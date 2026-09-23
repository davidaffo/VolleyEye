function encodePayloadForLink(payload) {
  try {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)));
  } catch (err) {
    logError("encode-match-link", err);
    return "";
  }
}
function decodePayloadFromLink(encoded) {
  if (!encoded) return null;
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch (err) {
    logError("decode-match-link", err);
    return null;
  }
}
function applyImportedMatch(nextState, options = {}) {
  const silent = options && options.silent;
  const fallback = () => alert("File match non valido.");
  if (!nextState || !Array.isArray(nextState.players) || !Array.isArray(nextState.events)) {
    fallback();
    return;
  }
  nextState =
    typeof cloneIsolationData === "function"
      ? cloneIsolationData(nextState)
      : JSON.parse(JSON.stringify(nextState));
  const preservedPointRules = state.pointRules;
  const preservedTheme = getStoredThemePreference() || normalizeThemePreference(state.theme);
  const preservedSavedTeams = state.savedTeams || {};
  const preservedSavedOpponentTeams = state.savedOpponentTeams || {};
  const preservedSavedMatches = state.savedMatches || {};
  const preservedPlayersDb = state.playersDb || {};
  const preservedOpponentSkillConfig = state.opponentSkillConfig || {};
  resetSetTypeState();
  const merged = Object.assign({}, state, nextState);
  const normalizedPlayers = normalizePlayers(nextState.players || []);
  merged.match = nextState.match && typeof nextState.match === "object" ? nextState.match : {};
  merged.players = normalizedPlayers;
  const normalizedNumbers =
    typeof normalizeNumbersMap === "function" ? normalizeNumbersMap(nextState.playerNumbers || {}) : nextState.playerNumbers || {};
  merged.playerNumbers =
    typeof buildNumbersForNames === "function"
      ? buildNumbersForNames(normalizedPlayers, normalizedNumbers, {})
      : normalizedNumbers;
  merged.captains = normalizePlayers(Array.isArray(nextState.captains) ? nextState.captains : [])
    .filter(name => normalizedPlayers.includes(name))
    .slice(0, 1);
  merged.liberos = normalizePlayers(nextState.liberos || []).filter(name => normalizedPlayers.includes(name));
  merged.stats = nextState.stats && typeof nextState.stats === "object" ? nextState.stats : {};
  merged.opponentStats =
    nextState.opponentStats && typeof nextState.opponentStats === "object" ? nextState.opponentStats : {};
  merged.liberoAutoMap = nextState.liberoAutoMap || {};
  merged.autoLiberoBackline = nextState.autoLiberoBackline !== false;
  merged.autoLiberoRole = normalizeAutoLiberoRolePreference(
    nextState.autoLiberoRole,
    nextState.autoLiberoRoleDefaultVersion
  );
  merged.opponentAutoLiberoRole = normalizeAutoLiberoRolePreference(
    nextState.opponentAutoLiberoRole,
    nextState.autoLiberoRoleDefaultVersion
  );
  merged.autoLiberoRoleDefaultVersion = AUTO_LIBERO_ROLE_DEFAULT_VERSION;
  merged.preferredLibero = typeof nextState.preferredLibero === "string" ? nextState.preferredLibero : "";
  merged.court = Array.isArray(nextState.court)
    ? nextState.court
    : Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  merged.metricsConfig = nextState.metricsConfig || state.metricsConfig || {};
  merged.pointRules = preservedPointRules || merged.pointRules || {};
  merged.theme = preservedTheme;
  merged.savedTeams = cloneIsolationData(preservedSavedTeams);
  merged.savedOpponentTeams = cloneIsolationData(preservedSavedOpponentTeams);
  merged.savedMatches = cloneIsolationData(preservedSavedMatches);
  merged.playersDb = cloneIsolationData(preservedPlayersDb);
  merged.selectedTeam = nextState.selectedTeam || merged.match.teamName || "";
  merged.selectedOpponentTeam =
    nextState.selectedOpponentTeam || (nextState.useOpponentTeam ? merged.match.opponent || "" : "");
  if (merged.match && !merged.match.teamName && merged.selectedTeam) {
    merged.match.teamName = merged.selectedTeam;
  }
  merged.opponentPlayers = normalizePlayers(nextState.opponentPlayers || []);
  merged.opponentPlayerNumbers = nextState.opponentPlayerNumbers || {};
  merged.opponentLiberos = normalizePlayers(nextState.opponentLiberos || []);
  merged.opponentRotation = Math.min(6, Math.max(1, parseInt(nextState.opponentRotation, 10) || 1));
  merged.opponentCourt = Array.isArray(nextState.opponentCourt)
    ? nextState.opponentCourt
    : Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  merged.opponentCaptains = normalizePlayers(nextState.opponentCaptains || [])
    .filter(name => (merged.opponentPlayers || []).includes(name))
    .slice(0, 1);
  merged.rotation = Math.min(6, Math.max(1, parseInt(nextState.rotation, 10) || 1));
  merged.isServing = !!nextState.isServing;
  merged.autoRotatePending = !!nextState.autoRotatePending;
  merged.opponentAutoRotatePending = !!nextState.opponentAutoRotatePending;
  merged.currentSet = Math.min(5, Math.max(1, parseInt(nextState.currentSet, 10) || 1));
  merged.matchFinished = !!nextState.matchFinished;
  merged.skillClock = nextState.skillClock || { paused: false, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: null };
  merged.scoreOverrides = normalizeScoreOverrides(nextState.scoreOverrides || {});
  merged.setResults = nextState.setResults && typeof nextState.setResults === "object" ? nextState.setResults : {};
  merged.setStarts = nextState.setStarts && typeof nextState.setStarts === "object" ? nextState.setStarts : {};
  merged.video =
    nextState.video && typeof nextState.video === "object"
      ? nextState.video
      : { offsetSeconds: 0, fileName: "", youtubeId: "", youtubeUrl: "", lastPlaybackSeconds: 0 };
  merged.videoClock =
    nextState.videoClock && typeof nextState.videoClock === "object"
      ? nextState.videoClock
      : { paused: true, pausedAtMs: null, pausedAccumMs: 0, startMs: Date.now(), currentSeconds: 0 };
  merged.loadedMatchName = nextState.loadedMatchName || nextState.selectedMatch || "";
  merged.matchEndSetSnapshot = null;
  merged.matchEndSetRecorded = null;
  if (typeof merged.video.lastPlaybackSeconds !== "number") {
    merged.video.lastPlaybackSeconds = 0;
  }
  merged.video.youtubeId = merged.video.youtubeId || "";
  merged.video.youtubeUrl = merged.video.youtubeUrl || "";
  merged.videoFilterPresets =
    typeof normalizeVideoFilterPresets === "function"
      ? normalizeVideoFilterPresets(nextState.videoFilterPresets || [])
      : Array.isArray(nextState.videoFilterPresets)
        ? nextState.videoFilterPresets
        : [];
  merged.courtViewMirrored = !!nextState.courtViewMirrored;
  merged.courtSideSwapped = !!nextState.courtSideSwapped;
  merged.useOpponentTeam = !!nextState.useOpponentTeam;
  merged.opponentSkillConfig = cloneIsolationData(preservedOpponentSkillConfig);
  merged.freeballPending = !!nextState.freeballPending;
  merged.freeballPendingScope = nextState.freeballPendingScope === "opponent" ? "opponent" : "our";
  merged.flowTeamScope = nextState.flowTeamScope === "opponent" ? "opponent" : "our";
  // Settings and roster managers retain this object from bootstrap.
  // Replacing it leaves their writes on the previous match's state.
  Object.assign(state, merged);
  sanitizeRosterIsolation("our");
  sanitizeRosterIsolation("opponent");
  if (typeof cleanCourtPlayers === "function") {
    cleanCourtPlayers(state.court);
  }
  syncOpponentPlayerNumbers(state.opponentPlayers || [], state.opponentPlayerNumbers || {});
  cleanOpponentLiberos();
  if (typeof cleanLiberoAutoMap === "function") {
    cleanLiberoAutoMap();
  }
  cleanCourtLiberoReplacementsForScope("our");
  cleanCourtLiberoReplacementsForScope("opponent");
  syncTeamsFromStorage();
  syncOpponentTeamsFromStorage();
  if (typeof enforceAutoLiberoForState === "function") {
    enforceAutoLiberoForState({ skipServerOnServe: true });
  }
  saveState();
  applyTheme(preservedTheme);
  applyMatchInfoToUI();
  applyPlayersFromStateToTextarea();
  applyOpponentPlayersFromStateToTextarea();
  renderPlayersManagerList();
  renderOpponentLiberoTags();
  renderOpponentPlayersList();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  renderLiberoTags();
  renderMetricsConfig();
  updateRotationDisplay();
  syncCurrentSetUI(state.currentSet || 1);
  initStats();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderTeamsSelect();
  renderOpponentTeamsSelect();
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("match_imported");
  }
  if (!silent) {
    alert("Match importato correttamente.");
  }
}

const DEFAULT_DEMO_MATCH_URL = "./match_demo.json";
const DEFAULT_DEMO_MATCH_NAME = "Match demo - Aurora Volley - Riviera Volley";
const DEFAULT_DEMO_TEAM_NAMES = ["Aurora Volley Demo", "Riviera Volley Demo"];
const DEFAULT_DEMO_PREFERENCE_KEY = "volleyeye-default-demo-preference";

function getDefaultDemoPreference() {
  try {
    return localStorage.getItem(DEFAULT_DEMO_PREFERENCE_KEY) || "";
  } catch (_) {
    return "";
  }
}
function setDefaultDemoPreference(value) {
  try {
    localStorage.setItem(DEFAULT_DEMO_PREFERENCE_KEY, value);
  } catch (_) {
    // La preferenza non è essenziale per la cancellazione corrente.
  }
}
function clearActiveDefaultDemoMatch() {
  const currentName = String(state.loadedMatchName || state.selectedMatch || "").trim();
  if (currentName !== DEFAULT_DEMO_MATCH_NAME) return false;
  const emptyCourt = () => Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  state.selectedMatch = "";
  state.loadedMatchName = "";
  state.selectedTeam = "";
  state.players = [];
  state.playerNumbers = {};
  state.liberos = [];
  state.captains = [];
  state.stats = {};
  state.court = emptyCourt();
  state.autoRoleBaseCourt = [];
  state.liberoAutoMap = {};
  state.preferredLibero = "";
  state.selectedOpponentTeam = "";
  state.useOpponentTeam = false;
  state.opponentPlayers = [];
  state.opponentPlayerNumbers = {};
  state.opponentLiberos = [];
  state.opponentCaptains = [];
  state.opponentStats = {};
  state.opponentCourt = emptyCourt();
  state.opponentAutoRoleBaseCourt = [];
  state.opponentLiberoAutoMap = {};
  state.opponentPreferredLibero = "";
  state.match = {};
  if (typeof updateOpponentAutoRoleBaseCourtCache === "function") {
    updateOpponentAutoRoleBaseCourtCache(state.opponentCourt);
  }
  resetMatchState({ skipMatchesRender: true });
  return true;
}
function hasDefaultDemoData() {
  const hasDemoMatch =
    typeof loadMatchFromStorage === "function" && !!loadMatchFromStorage(DEFAULT_DEMO_MATCH_NAME);
  const hasDemoTeam = DEFAULT_DEMO_TEAM_NAMES.some(name =>
    typeof loadTeamFromStorage === "function" && !!loadTeamFromStorage(name)
  );
  return hasDemoMatch || hasDemoTeam;
}
function updateDefaultDemoDeleteButtonVisibility() {
  if (!elBtnDeleteDemoData) return;
  const visible = getDefaultDemoPreference() !== "removed" && hasDefaultDemoData();
  elBtnDeleteDemoData.classList.toggle("hidden", !visible);
  elBtnDeleteDemoData.disabled = !visible;
}
function removeDefaultDemoPlayersFromDatabase(demoTeams) {
  if (typeof loadPlayersDbFromStorage !== "function" || typeof savePlayersDbToStorage !== "function") return;
  const candidateIds = new Set();
  demoTeams.forEach(team => {
    (team && Array.isArray(team.playersDetailed) ? team.playersDetailed : []).forEach(player => {
      if (player && player.id) candidateIds.add(player.id);
    });
  });
  const remainingIds = new Set();
  const remainingTeams = typeof loadTeamsMapFromStorage === "function" ? loadTeamsMapFromStorage() : {};
  Object.values(remainingTeams || {}).forEach(team => {
    (team && Array.isArray(team.playersDetailed) ? team.playersDetailed : []).forEach(player => {
      if (player && player.id) remainingIds.add(player.id);
    });
  });
  const playersDb = loadPlayersDbFromStorage();
  candidateIds.forEach(id => {
    if (!remainingIds.has(id)) delete playersDb[id];
  });
  savePlayersDbToStorage(playersDb);
  state.playersDb = cloneIsolationData(playersDb);
}
function removeDefaultDemoData({ askConfirmation = true, showResult = true } = {}) {
  if (
    askConfirmation &&
    !confirm("Eliminare il match demo, le squadre demo e le relative giocatrici non usate da altre squadre?")
  ) {
    return false;
  }
  const demoTeams = DEFAULT_DEMO_TEAM_NAMES
    .map(name => (typeof loadTeamFromStorage === "function" ? loadTeamFromStorage(name) : null))
    .filter(Boolean);
  if (typeof deleteMatchFromStorage === "function") deleteMatchFromStorage(DEFAULT_DEMO_MATCH_NAME);
  DEFAULT_DEMO_TEAM_NAMES.forEach(name => {
    if (typeof deleteTeamFromStorage === "function") deleteTeamFromStorage(name);
  });
  if (state.savedMatches) delete state.savedMatches[DEFAULT_DEMO_MATCH_NAME];
  if (state.savedTeams) DEFAULT_DEMO_TEAM_NAMES.forEach(name => delete state.savedTeams[name]);
  if (state.savedOpponentTeams) DEFAULT_DEMO_TEAM_NAMES.forEach(name => delete state.savedOpponentTeams[name]);
  removeDefaultDemoPlayersFromDatabase(demoTeams);
  const clearedActiveDemo = clearActiveDefaultDemoMatch();
  setDefaultDemoPreference("removed");
  if (typeof syncTeamsFromStorage === "function") syncTeamsFromStorage();
  if (typeof syncOpponentTeamsFromStorage === "function") syncOpponentTeamsFromStorage();
  if (typeof syncMatchesFromStorage === "function") syncMatchesFromStorage();
  saveState({ persistLocal: true, skipMatchPersist: true });
  renderTeamsSelect();
  renderOpponentTeamsSelect();
  renderMatchesSelect();
  updateDefaultDemoDeleteButtonVisibility();
  if (clearedActiveDemo) {
    applyPlayersFromStateToTextarea();
    applyOpponentPlayersFromStateToTextarea();
    renderPlayers();
    renderBenchChips();
    renderLineupChips();
  }
  if (showResult) alert("Dati demo eliminati.");
  return true;
}

async function loadDefaultDemoMatch() {
  try {
    const response = await fetch(DEFAULT_DEMO_MATCH_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!payload || !payload.state) {
      throw new Error("Payload demo non valido");
    }
    const demoTeams = payload.state.savedTeams || {};
    for (const teamName of DEFAULT_DEMO_TEAM_NAMES) {
      const teamPayload = demoTeams[teamName];
      if (!teamPayload) {
        throw new Error(`Squadra demo mancante: ${teamName}`);
      }
      if (!saveTeamToStorage(teamName, teamPayload)) {
        throw new Error(`Impossibile archiviare la squadra demo: ${teamName}`);
      }
    }
    applyImportedMatch(payload.state, { silent: true });
    state.selectedMatch = DEFAULT_DEMO_MATCH_NAME;
    state.loadedMatchName = DEFAULT_DEMO_MATCH_NAME;
    const savedPayload = getCurrentMatchPayload(DEFAULT_DEMO_MATCH_NAME);
    state.savedMatches = state.savedMatches || {};
    state.savedMatches[DEFAULT_DEMO_MATCH_NAME] = cloneIsolationData(savedPayload);
    if (typeof saveMatchToStorage === "function") {
      saveMatchToStorage(DEFAULT_DEMO_MATCH_NAME, savedPayload);
    }
    if (typeof persistCurrentMatch === "function") {
      persistCurrentMatch({ allowCreate: false });
    }
    if (typeof syncMatchesFromStorage === "function") {
      syncMatchesFromStorage();
    }
    saveState({ persistLocal: true });
    return true;
  } catch (error) {
    logError("Error loading default demo match", error);
    return false;
  }
}
function askDefaultDemoChoice() {
  return new Promise(resolve => {
    const modal = document.createElement("div");
    modal.className = "skill-modal force-popup";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML =
      '<div class="skill-modal__backdrop"></div>' +
      '<div class="skill-modal__content">' +
        '<div class="skill-modal__head"><h3>Squadre demo</h3></div>' +
        '<div class="skill-modal__body">' +
          '<p>VolleyEye ha caricato un match e due squadre dimostrative. Vuoi conservarli per provare il programma?</p>' +
          '<p class="section-note">I nomi sono inventati. Se scegli di non usarli, tutti i dati demo verranno eliminati.</p>' +
          '<div class="controls-row">' +
            '<button type="button" data-demo-choice="keep">Usa le demo</button>' +
            '<button type="button" class="danger" data-demo-choice="remove">Non usare ed elimina</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    const finish = choice => {
      modal.remove();
      setGlobalModalState(false);
      resolve(choice);
    };
    modal.querySelector('[data-demo-choice="keep"]').addEventListener("click", () => finish("keep"));
    modal.querySelector('[data-demo-choice="remove"]').addEventListener("click", () => finish("remove"));
    document.body.appendChild(modal);
    setGlobalModalState(true, { forcePopup: true });
  });
}
async function showDefaultDemoWelcomePopup() {
  const choice = await askDefaultDemoChoice();
  if (choice === "remove") {
    removeDefaultDemoData({ askConfirmation: false, showResult: false });
    return;
  }
  setDefaultDemoPreference("keep");
}
function applyImportedDatabase(nextState) {
  if (!nextState || !nextState.state) {
    alert("File database non valido.");
    return false;
  }
  const imported =
    typeof cloneIsolationData === "function"
      ? cloneIsolationData(nextState.state)
      : JSON.parse(JSON.stringify(nextState.state));
  if (!Array.isArray(imported.players) || !Array.isArray(imported.events)) {
    alert("File database non valido: mancano roster o cronologia del match.");
    return false;
  }
  applyImportedMatch(imported, { silent: true });
  const failedWrites = [];
  const importedTeams = imported.savedTeams || imported.savedOpponentTeams || {};
  if (importedTeams && typeof importedTeams === "object") {
    Object.entries(importedTeams).forEach(([name, data]) => {
      if (!saveTeamToStorage(name, data)) failedWrites.push(`squadra \"${name}\"`);
    });
    syncTeamsFromStorage();
  }
  if (imported.playersDb && typeof imported.playersDb === "object") {
    state.playersDb = cloneIsolationData(imported.playersDb);
    if (typeof savePlayersDbToStorage === "function") {
      if (!savePlayersDbToStorage(state.playersDb)) failedWrites.push("archivio giocatrici");
    }
  }
  if (imported.savedMatches && typeof imported.savedMatches === "object") {
    Object.entries(imported.savedMatches).forEach(([name, data]) => {
      if (!saveMatchToStorage(name, data)) failedWrites.push(`partita \"${name}\"`);
    });
    syncMatchesFromStorage();
    state.selectedMatch = imported.selectedMatch || "";
    state.loadedMatchName = imported.loadedMatchName || imported.selectedMatch || "";
    renderMatchesSelect();
  }
  syncOpponentTeamsFromStorage();
  state.selectedOpponentTeam = imported.selectedOpponentTeam || "";
  renderOpponentTeamsSelect();
  saveState({ persistLocal: true, skipMatchPersist: true });
  if (failedWrites.length > 0) {
    alert(
      "Database importato solo in parte. Non è stato possibile salvare: " +
        failedWrites.slice(0, 5).join(", ") +
        (failedWrites.length > 5 ? ` e altri ${failedWrites.length - 5} elementi.` : ".")
    );
    return false;
  }
  alert("Database importato correttamente.");
  return true;
}
function buildUniqueImportedMatchName(baseName = "") {
  const fallbackBase =
    (typeof buildMatchDisplayName === "function" && buildMatchDisplayName(state.match || {})) ||
    "Match importato";
  const rawBase = String(baseName || fallbackBase || "Match importato").trim() || "Match importato";
  const existingInMemory = state.savedMatches || {};
  const exists = name => {
    const key = String(name || "").trim();
    if (!key) return false;
    if (Object.prototype.hasOwnProperty.call(existingInMemory, key)) return true;
    return typeof loadMatchFromStorage === "function" ? !!loadMatchFromStorage(key) : false;
  };
  if (!exists(rawBase)) return rawBase;
  let idx = 2;
  while (idx < 10000) {
    const candidate = `${rawBase} (import ${idx})`;
    if (!exists(candidate)) return candidate;
    idx += 1;
  }
  return `${rawBase} (import ${Date.now()})`;
}
function importMatchStateAsNew(nextState, options = {}) {
  if (!nextState || !Array.isArray(nextState.players) || !Array.isArray(nextState.events)) {
    throw new Error("Invalid imported match payload");
  }
  const silent = !!(options && options.silent);
  const explicitBaseName = options && typeof options.baseName === "string" ? options.baseName : "";
  const importedBaseName =
    explicitBaseName.trim() ||
    (typeof buildMatchDisplayName === "function" ? buildMatchDisplayName((nextState && nextState.match) || {}) : "") ||
    "Match importato";
  const uniqueName = buildUniqueImportedMatchName(importedBaseName);
  isLoadingMatch = true;
  if (typeof window !== "undefined") {
    window.isLoadingMatch = true;
  }
  try {
    applyImportedMatch(nextState, { silent: true });
    state.selectedMatch = uniqueName;
    state.loadedMatchName = uniqueName;
    if (typeof persistCurrentMatch === "function") {
      persistCurrentMatch({ allowCreate: true });
    }
    if (typeof saveState === "function") {
      saveState({ persistLocal: true, skipMatchPersist: true });
    }
    if (typeof renderMatchesSelect === "function") {
      renderMatchesSelect();
    }
    if (!silent) {
      alert(`Match importato correttamente come "${uniqueName}".`);
    }
    return { ok: true, name: uniqueName };
  } finally {
    isLoadingMatch = false;
    if (typeof window !== "undefined") {
      window.isLoadingMatch = false;
    }
  }
}
