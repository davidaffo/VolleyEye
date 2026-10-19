import { session } from "../state/io-match-io.js";
import { ensureMatchDefaults } from "../teams/match-details.js";
import { AUTO_LIBERO_ROLE_DEFAULT_VERSION } from "../../../js/globals.js";
import { logError, session as matchState } from "../../../js/globals.js";
import { cloneIsolationData } from "../../domain/snapshots.js";
import { getStoredThemePreference, sanitizeRosterIsolation, applyTheme } from "../teams/core/state-store.js";
import { saveState } from "../storage/save-state.js";
import { normalizeThemePreference, normalizeVideoFilterPresets } from "../storage/ui-preferences.js";
import { normalizeAutoLiberoRolePreference } from "../teams/preferences.js";
import { buildMatchDisplayName } from "../teams/match-details.js";
import { resetSetTypeState } from "../live/game-flow.js";
import { normalizePlayers, normalizeNumbersMap } from "../../domain/player-names.js";
import { buildNumbersForNames, syncOpponentPlayerNumbers, cleanOpponentLiberos } from "../teams/roster-data.js";
import { normalizeScoreOverrides } from "../settings/rules.js";
import { persistCurrentMatch } from "../storage/match-persistence.js";
import { updateMatchButtonsState } from "../teams/settings/scouting-config.js";
import { buildDvwScoreOverrides } from "./datavolley-match-import.js";
import { resetAnalysisForMatch } from "../analysis/analysis-filters.js";
import { cleanCourtPlayers, enforceAutoLiberoForState, renderPlayersManagerList, renderOpponentPlayersList, syncCurrentSetUI, initStats, updateOpponentAutoRoleBaseCourtCache } from "../teams/court/court-engine.js";
import { cleanLiberoAutoMap, renderLiberoChipsInline, renderLineupChips, updateRotationDisplay } from "../teams/court/court-ui-bootstrap.js";
import { cleanCourtLiberoReplacementsForScope } from "../video/event-editor.js";
import { syncTeamsFromStorage, syncOpponentTeamsFromStorage, loadTeamFromStorage, loadPlayersDbFromStorage, savePlayersDbToStorage, loadTeamsMapFromStorage, deleteTeamFromStorage, saveTeamToStorage } from "../teams/storage/team-repository.js";
import { renderOpponentLiberoTags, renderLiberoTags } from "../teams/imports/camp3-import.js";
import { renderPlayers } from "../live/team-rendering.js";
import { renderMetricsConfig } from "../teams/settings/metrics-editor.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderEventsLog } from "../video/video-events.js";
import { renderTeamsSelect, renderOpponentTeamsSelect, renderMatchesSelect, renderMatchesList } from "../teams/storage/match-repository.js";
import { loadMatchFromStorage, deleteMatchFromStorage, syncMatchesFromStorage, saveMatchToStorage } from "../storage/match-repository.js";
import { resetMatchState } from "../teams/storage/archive-actions.js";
import { getCurrentMatchPayload } from "../teams/current-payload.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { demoActionStore, demoWelcomeStore } from "../../state/roster-import-store.mjs";
import { setGlobalModalState } from "../layout/modals.js";
import { session as persistentStorageState } from "../state/storage-persistent-storage.js";



const matchIoState = session;

export function decodePayloadFromLink(encoded) {
  if (!encoded) return null;
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch (err) {
    logError("decode-match-link", err);
    return null;
  }
}

export function applyImportedMatch(nextState, options = {}) {
  const silent = options && options.silent;
  const fallback = () => alert("File match non valido.");
  if (!nextState || !Array.isArray(nextState.players) || !Array.isArray(nextState.events)) {
    fallback();
    return;
  }
  nextState =
    (cloneIsolationData(nextState));
  const preservedPointRules = matchState.state.pointRules;
  const preservedTheme = getStoredThemePreference() || normalizeThemePreference(matchState.state.theme);
  const preservedSavedTeams = matchState.state.savedTeams || {};
  const preservedSavedOpponentTeams = matchState.state.savedOpponentTeams || {};
  const preservedSavedMatches = matchState.state.savedMatches || {};
  const preservedPlayersDb = matchState.state.playersDb || {};
  const preservedOpponentSkillConfig = matchState.state.opponentSkillConfig || {};
  resetSetTypeState();
  const merged = Object.assign({}, matchState.state, nextState);
  const normalizedPlayers = normalizePlayers(nextState.players || []);
  merged.match = nextState.match && typeof nextState.match === "object" ? nextState.match : {};
  merged.players = normalizedPlayers;
  const normalizedNumbers =
    (normalizeNumbersMap(nextState.playerNumbers || {}));
  merged.playerNumbers =
    (buildNumbersForNames(normalizedPlayers, normalizedNumbers, {}));
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
  merged.metricsConfig = nextState.metricsConfig || matchState.state.metricsConfig || {};
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
  const suppliedScoreOverrides = normalizeScoreOverrides(nextState.scoreOverrides || {});
  merged.scoreOverrides = Object.keys(suppliedScoreOverrides).length
    ? suppliedScoreOverrides
    : (normalizeScoreOverrides(buildDvwScoreOverrides(nextState.events || [], null, nextState.setResults || {})));
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
    (normalizeVideoFilterPresets(nextState.videoFilterPresets || []));
  merged.courtViewMirrored = !!nextState.courtViewMirrored;
  merged.courtSideSwapped = !!nextState.courtSideSwapped;
  merged.useOpponentTeam = !!nextState.useOpponentTeam;
  merged.opponentSkillConfig = cloneIsolationData(preservedOpponentSkillConfig);
  merged.freeballPending = !!nextState.freeballPending;
  merged.freeballPendingScope = nextState.freeballPendingScope === "opponent" ? "opponent" : "our";
  merged.flowTeamScope = nextState.flowTeamScope === "opponent" ? "opponent" : "our";
  // Settings and roster managers retain this object from bootstrap.
  // Replacing it leaves their writes on the previous match's state.
  Object.assign(matchState.state, merged);
  matchState.state.uiAnalysisExtraMatchesByScope = cloneIsolationData(nextState.uiAnalysisExtraMatchesByScope || { our: [], opponent: [] });
  resetAnalysisForMatch();
  sanitizeRosterIsolation("our");
  sanitizeRosterIsolation("opponent");
  cleanCourtPlayers(matchState.state.court);
  syncOpponentPlayerNumbers(matchState.state.opponentPlayers || [], matchState.state.opponentPlayerNumbers || {});
  cleanOpponentLiberos();
  cleanLiberoAutoMap();
  cleanCourtLiberoReplacementsForScope("our");
  cleanCourtLiberoReplacementsForScope("opponent");
  syncTeamsFromStorage();
  syncOpponentTeamsFromStorage();
  enforceAutoLiberoForState({ skipServerOnServe: true });
  saveState();
  applyTheme(preservedTheme);
  ensureMatchDefaults();
  renderPlayersManagerList();
  renderOpponentLiberoTags();
  renderOpponentPlayersList();
  renderPlayers();
  renderLiberoChipsInline();
  renderLineupChips();
  renderLiberoTags();
  renderMetricsConfig();
  updateRotationDisplay();
  syncCurrentSetUI(matchState.state.currentSet || 1);
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

export function getDefaultDemoPreference() {
  try {
    return localStorage.getItem(matchIoState.DEFAULT_DEMO_PREFERENCE_KEY) || "";
  } catch (_) {
    return "";
  }
}

export function setDefaultDemoPreference(value) {
  try {
    localStorage.setItem(matchIoState.DEFAULT_DEMO_PREFERENCE_KEY, value);
  } catch (_) {
    // La preferenza non è essenziale per la cancellazione corrente.
  }
}

export function clearActiveDefaultDemoMatch() {
  const currentName = String(matchState.state.loadedMatchName || matchState.state.selectedMatch || "").trim();
  if (currentName !== matchIoState.DEFAULT_DEMO_MATCH_NAME) return false;
  const emptyCourt = () => Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  matchState.state.selectedMatch = "";
  matchState.state.loadedMatchName = "";
  matchState.state.selectedTeam = "";
  matchState.state.players = [];
  matchState.state.playerNumbers = {};
  matchState.state.liberos = [];
  matchState.state.captains = [];
  matchState.state.stats = {};
  matchState.state.court = emptyCourt();
  matchState.state.autoRoleBaseCourt = [];
  matchState.state.liberoAutoMap = {};
  matchState.state.preferredLibero = "";
  matchState.state.selectedOpponentTeam = "";
  matchState.state.useOpponentTeam = false;
  matchState.state.opponentPlayers = [];
  matchState.state.opponentPlayerNumbers = {};
  matchState.state.opponentLiberos = [];
  matchState.state.opponentCaptains = [];
  matchState.state.opponentStats = {};
  matchState.state.opponentCourt = emptyCourt();
  matchState.state.opponentAutoRoleBaseCourt = [];
  matchState.state.opponentLiberoAutoMap = {};
  matchState.state.opponentPreferredLibero = "";
  matchState.state.match = {};
  updateOpponentAutoRoleBaseCourtCache(matchState.state.opponentCourt);
  resetMatchState({ skipMatchesRender: true });
  return true;
}

export function hasDefaultDemoData() {
  const hasDemoMatch =
    !!loadMatchFromStorage(matchIoState.DEFAULT_DEMO_MATCH_NAME);
  const hasDemoTeam = matchIoState.DEFAULT_DEMO_TEAM_NAMES.some(name =>
    !!loadTeamFromStorage(name)
  );
  return hasDemoMatch || hasDemoTeam;
}

export function updateDefaultDemoDeleteButtonVisibility() {
  if (!rosterLineupState.elBtnDeleteDemoData) return;
  const visible = getDefaultDemoPreference() !== "removed" && hasDefaultDemoData();
   demoActionStore.publish({ visible }); return; 
  
}

export function removeDefaultDemoPlayersFromDatabase(demoTeams) {
  ;
  const candidateIds = new Set();
  demoTeams.forEach(team => {
    (team && Array.isArray(team.playersDetailed) ? team.playersDetailed : []).forEach(player => {
      if (player && player.id) candidateIds.add(player.id);
    });
  });
  const remainingIds = new Set();
  const remainingTeams = (loadTeamsMapFromStorage());
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
  matchState.state.playersDb = cloneIsolationData(playersDb);
}

export function removeDefaultDemoData({ askConfirmation = true, showResult = true } = {}) {
  if (
    askConfirmation &&
    !confirm("Eliminare il match demo, le squadre demo e le relative giocatrici non usate da altre squadre?")
  ) {
    return false;
  }
  const demoTeams = matchIoState.DEFAULT_DEMO_TEAM_NAMES
    .map(name => ((loadTeamFromStorage(name))))
    .filter(Boolean);
  deleteMatchFromStorage(matchIoState.DEFAULT_DEMO_MATCH_NAME);
  matchIoState.DEFAULT_DEMO_TEAM_NAMES.forEach(name => {
    deleteTeamFromStorage(name);
  });
  if (matchState.state.savedMatches) delete matchState.state.savedMatches[matchIoState.DEFAULT_DEMO_MATCH_NAME];
  if (matchState.state.savedTeams) matchIoState.DEFAULT_DEMO_TEAM_NAMES.forEach(name => delete matchState.state.savedTeams[name]);
  if (matchState.state.savedOpponentTeams) matchIoState.DEFAULT_DEMO_TEAM_NAMES.forEach(name => delete matchState.state.savedOpponentTeams[name]);
  removeDefaultDemoPlayersFromDatabase(demoTeams);
  const clearedActiveDemo = clearActiveDefaultDemoMatch();
  setDefaultDemoPreference("removed");
  syncTeamsFromStorage();
  syncOpponentTeamsFromStorage();
  syncMatchesFromStorage();
  saveState({ persistLocal: true, skipMatchPersist: true });
  renderTeamsSelect();
  renderOpponentTeamsSelect();
  renderMatchesSelect();
  updateDefaultDemoDeleteButtonVisibility();
  if (clearedActiveDemo) {
    renderPlayers();
    renderLineupChips();
  }
  if (showResult) alert("Dati demo eliminati.");
  return true;
}

export async function loadDefaultDemoMatch() {
  try {
    const response = await fetch(matchIoState.DEFAULT_DEMO_MATCH_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!payload || !payload.state) {
      throw new Error("Payload demo non valido");
    }
    const demoTeams = payload.state.savedTeams || {};
    for (const teamName of matchIoState.DEFAULT_DEMO_TEAM_NAMES) {
      const teamPayload = demoTeams[teamName];
      if (!teamPayload) {
        throw new Error(`Squadra demo mancante: ${teamName}`);
      }
      if (!saveTeamToStorage(teamName, teamPayload)) {
        throw new Error(`Impossibile archiviare la squadra demo: ${teamName}`);
      }
    }
    applyImportedMatch(payload.state, { silent: true });
    matchState.state.selectedMatch = matchIoState.DEFAULT_DEMO_MATCH_NAME;
    matchState.state.loadedMatchName = matchIoState.DEFAULT_DEMO_MATCH_NAME;
    const savedPayload = getCurrentMatchPayload(matchIoState.DEFAULT_DEMO_MATCH_NAME);
    matchState.state.savedMatches = matchState.state.savedMatches || {};
    matchState.state.savedMatches[matchIoState.DEFAULT_DEMO_MATCH_NAME] = cloneIsolationData(savedPayload);
    saveMatchToStorage(matchIoState.DEFAULT_DEMO_MATCH_NAME, savedPayload);
    persistCurrentMatch({ allowCreate: false });
    syncMatchesFromStorage();
    saveState({ persistLocal: true });
    return true;
  } catch (error) {
    logError("Error loading default demo match", error);
    return false;
  }
}

export function askDefaultDemoChoice() {return new Promise(resolve => { demoWelcomeStore.publish({open:true, choose(choice){ demoWelcomeStore.publish({open:false, choose:null});setGlobalModalState(false);resolve(choice); }});setGlobalModalState(true, {forcePopup:true}); });}

export async function showDefaultDemoWelcomePopup() {
  const choice = await askDefaultDemoChoice();
  if (choice === "remove") {
    removeDefaultDemoData({ askConfirmation: false, showResult: false });
    return;
  }
  setDefaultDemoPreference("keep");
}

export async function applyImportedDatabase(nextState) {
  if (!nextState || !nextState.state) {
    alert("File database non valido.");
    return false;
  }
  const imported =
    (cloneIsolationData(nextState.state));
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
    matchState.state.playersDb = cloneIsolationData(imported.playersDb);
    if (!savePlayersDbToStorage(matchState.state.playersDb)) failedWrites.push("archivio giocatrici");
  }
  if (imported.savedMatches && typeof imported.savedMatches === "object") {
    Object.entries(imported.savedMatches).forEach(([name, data]) => {
      if (!saveMatchToStorage(name, data)) failedWrites.push(`partita \"${name}\"`);
    });
    syncMatchesFromStorage();
    matchState.state.selectedMatch = imported.selectedMatch || "";
    matchState.state.loadedMatchName = imported.loadedMatchName || imported.selectedMatch || "";
    renderMatchesSelect();
  }
  syncOpponentTeamsFromStorage();
  matchState.state.selectedOpponentTeam = imported.selectedOpponentTeam || "";
  renderOpponentTeamsSelect();
  saveState({ persistLocal: true, skipMatchPersist: true });
  try {
    await persistentStorageState.archiveStorage.flush();
  } catch (error) {
    failedWrites.push("archivio IndexedDB: " + error.message);
  }
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

export function buildUniqueImportedMatchName(baseName = "") {
  const fallbackBase =
    (buildMatchDisplayName(matchState.state.match || {})) ||
    "Match importato";
  const rawBase = String(baseName || fallbackBase || "Match importato").trim() || "Match importato";
  const existingInMemory = matchState.state.savedMatches || {};
  const exists = name => {
    const key = String(name || "").trim();
    if (!key) return false;
    if (Object.prototype.hasOwnProperty.call(existingInMemory, key)) return true;
    return (!!loadMatchFromStorage(key));
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

export async function importMatchStateAsNew(nextState, options = {}) {
  if (!nextState || !Array.isArray(nextState.players) || !Array.isArray(nextState.events)) {
    throw new Error("Invalid imported match payload");
  }
  const baseName = String(options.baseName || "").trim() ||
    ((buildMatchDisplayName(nextState.match || {}))) ||
    "Match importato";
  const uniqueName = buildUniqueImportedMatchName(baseName);
  const payload = {
    app: "volleyeye", version: 1, name: uniqueName,
    exportedAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(nextState))
  };
  if (!await saveMatchToStorage(uniqueName, payload, { throwOnError: true, waitForCommit: true })) {
    throw new Error("Impossibile salvare la partita importata nell'archivio.");
  }
  matchState.state.savedMatches = matchState.state.savedMatches || {};
  matchState.state.savedMatches[uniqueName] = payload;
  renderMatchesSelect();
  if (!matchState.state.uiMatchSessionActive) {
    matchState.state.selectedMatch = uniqueName;
    if (rosterLineupState.elSavedMatchesSelect) rosterLineupState.elSavedMatchesSelect.value = uniqueName;
    renderMatchesList(Object.keys(matchState.state.savedMatches), uniqueName);
    updateMatchButtonsState();
  }
  saveState({ persistLocal: true, skipMatchPersist: true });
  if (!options.silent) alert(`Partita importata nell'archivio come "${uniqueName}". Premi “Entra nella partita” per aprirla.`);
  return { ok: true, name: uniqueName };
}
