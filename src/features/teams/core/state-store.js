

import { normalizeThemePreference, normalizeVideoFilterPresets, getSnapshotTimestamp } from "../../storage/ui-preferences.js";
import { ensureMatchDefaults } from "../match-details.js";
import { cloneIsolationData } from "../../../domain/snapshots.js";
import { normalizeAutoLiberoRolePreference } from "../preferences.js";

import { session } from "../../state/teams-core-state-store.js";
import { THEME_TEXT, AUTO_LIBERO_ROLE_DEFAULT_VERSION, STORAGE_KEY, session as matchState, logError } from "../../../../js/globals.js";

import { publishRuntimeView } from "../../core/runtime-view.js";
import { isolation } from "../../../domain/isolation.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { normalizePlayers, normalizeNumbersMap } from "../../../domain/player-names.js";
import { buildNumbersForNames, syncPlayerNumbers, syncOpponentPlayerNumbers, cleanOpponentLiberos } from "../roster-data.js";
import { ensureCourtShape, cleanCourtPlayers, sanitizeAutoRoleBaseCourtForScope, enforceAutoLiberoForState, cleanLiberos } from "../court-state-model.js";
import { ensureCourtShapeFor, cloneCourtLineup } from "../court-model.js";
import { loadPlayersDbFromStorage, rebuildPlayersDbFromTeams, savePlayersDbToStorage, extractRosterFromTeam, migrateTeamsToPersistent, migrateOpponentTeamsToPersistent, syncTeamsFromStorage, syncOpponentTeamsFromStorage } from "../storage/team-repository.js";
import { normalizeScoreOverrides, ensureMetricsConfigDefaults, ensurePointRulesDefaults, ensureOpponentSkillConfigDefaults } from "../../settings/rules.js";
import { readStateFromIndexedDb } from "../../storage/state-db.js";


import { syncMatchesFromStorage } from "../../storage/match-repository.js";
import { resetAnalysisForMatch } from "../../analysis/reset-model.js";




const stateStoreState = session;











export function getStoredThemePreference() {
  try {
    const stored = localStorage.getItem(stateStoreState.THEME_PREFERENCE_KEY);
    return stored ? normalizeThemePreference(stored) : "";
  } catch (_) {
    return "";
  }
}

export function setStoredThemePreference(theme) {
  try {
    localStorage.setItem(stateStoreState.THEME_PREFERENCE_KEY, normalizeThemePreference(theme));
  } catch (_) {
    // Il tema resta comunque applicato per la sessione corrente.
  }
}

export function applyTheme(theme, options = {}) {
  const preference = normalizeThemePreference(theme);
  const persistPreference = options.persistPreference !== false;
  const resolvedTheme = preference;
  document.body.dataset.theme = resolvedTheme;
  document.body.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolvedTheme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = resolvedTheme === "light" ? "#f1f5f9" : "#111111";
  matchState.state.theme = preference;
  if (persistPreference) setStoredThemePreference(preference);
  const textColor = (THEME_TEXT && THEME_TEXT[resolvedTheme]) || "#ffffff";
  document.documentElement.style.setProperty("--text-color", textColor);

  publishRuntimeView();
}







export function sanitizeRosterIsolation(scope = "our") {
  if (
    typeof window !== "undefined" &&
    isolation &&
    typeof isolation.sanitizeRosterScope === "function"
  ) {
    isolation.sanitizeRosterScope(matchState.state, scope);
  }
}

export function applyStateSnapshot(parsed, options = {}) {
  if (!parsed || typeof parsed !== "object") return false;
  parsed = cloneIsolationData(parsed);
  const { skipStorageSync = false } = options;
  const asRecord = value =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const globalThemePreference = getStoredThemePreference();
  matchState.state = Object.assign(matchState.state, parsed);
  matchState.state.match = asRecord(parsed.match);
  matchState.state.theme = globalThemePreference || normalizeThemePreference(parsed.theme);
  matchState.state.players = normalizePlayers(parsed.players || matchState.state.players || []);
  const normalizedNumbers = normalizeNumbersMap(parsed.playerNumbers || matchState.state.playerNumbers || {});
  matchState.state.playerNumbers =
    (buildNumbersForNames(matchState.state.players, normalizedNumbers, matchState.state.playerNumbers || {}));
  matchState.state.captains = normalizePlayers(Array.isArray(parsed.captains) ? parsed.captains : []).slice(0, 1);
  ensureCourtShape();
  cleanCourtPlayers();
  matchState.state.captains = (matchState.state.captains || []).filter(name => (matchState.state.players || []).includes(name)).slice(0, 1);
  matchState.state.autoRolePositioning = parsed.autoRolePositioning !== false;
  matchState.state.isServing = !!parsed.isServing;
  matchState.state.autoRotatePending = !!parsed.autoRotatePending;
  matchState.state.opponentAutoRotatePending = !!parsed.opponentAutoRotatePending;
  matchState.state.currentSet = Math.min(5, Math.max(1, parseInt(parsed.currentSet, 10) || 1));
  matchState.state.rotation = Math.min(6, Math.max(1, parseInt(parsed.rotation, 10) || 1));
  matchState.state.events = Array.isArray(parsed.events) ? parsed.events : [];
  matchState.state.stats = asRecord(parsed.stats);
  matchState.state.setResults = asRecord(parsed.setResults);
  matchState.state.setStarts = asRecord(parsed.setStarts);
  matchState.state.matchFinished = !!parsed.matchFinished;
  matchState.state.attackTrajectoryEnabled = parsed.attackTrajectoryEnabled !== false;
  matchState.state.attackTrajectorySimplified = parsed.attackTrajectorySimplified !== false;
  matchState.state.serveTrajectoryEnabled = parsed.serveTrajectoryEnabled !== false;
  matchState.state.setTypePromptEnabled = parsed.setTypePromptEnabled !== false;
  matchState.state.showServeTrajectoryLogOur = parsed.showServeTrajectoryLogOur !== false;
  matchState.state.showServeTrajectoryLogOpp = parsed.showServeTrajectoryLogOpp !== false;
  matchState.state.useOpponentTeam = !!parsed.useOpponentTeam;
  matchState.state.videoScoutMode = !!parsed.videoScoutMode;
  matchState.state.videoPlayByPlay = !!parsed.videoPlayByPlay;
  matchState.state.defaultSetType = parsed.defaultSetType || "";
  matchState.state.nextSetType = parsed.nextSetType || "";
  matchState.state.videoFilterPresets = normalizeVideoFilterPresets(parsed.videoFilterPresets || matchState.state.videoFilterPresets || []);
  matchState.state.uiPlayerAnalysis = Object.assign({}, matchState.state.uiPlayerAnalysis || {}, asRecord(parsed.uiPlayerAnalysis));
  matchState.state.uiVideoLayout = Object.assign({}, matchState.state.uiVideoLayout || {}, asRecord(parsed.uiVideoLayout));
  matchState.state.uiScoutColumns = Object.assign({}, matchState.state.uiScoutColumns || {}, asRecord(parsed.uiScoutColumns));
  matchState.state.uiScoutWidgetLayout = parsed.uiScoutWidgetLayout || null;
  matchState.state.uiVideoAnalysisSort = Object.assign({}, matchState.state.uiVideoAnalysisSort || {}, asRecord(parsed.uiVideoAnalysisSort));
  matchState.state.uiMatchSessionActive = parsed.uiMatchSessionActive === true;
  matchState.state.uiActiveTab = typeof parsed.uiActiveTab === "string" ? parsed.uiActiveTab : "match";
  matchState.state.uiTopBarHidden = !!parsed.uiTopBarHidden;
  matchState.state.forceMobileLayout = !!parsed.forceMobileLayout;
  matchState.state.liberos = Array.isArray(parsed.liberos)
    ? normalizePlayers(parsed.liberos).filter(name => (matchState.state.players || []).includes(name))
    : [];
  matchState.state.liberoAutoMap = asRecord(parsed.liberoAutoMap);
  matchState.state.savedTeams = asRecord(parsed.savedTeams);
  matchState.state.savedOpponentTeams = Object.keys(asRecord(parsed.savedOpponentTeams)).length
    ? asRecord(parsed.savedOpponentTeams)
    : cloneIsolationData(matchState.state.savedTeams);
  matchState.state.savedMatches = asRecord(parsed.savedMatches);
  matchState.state.playersDb = loadPlayersDbFromStorage();
  if (!matchState.state.playersDb || Object.keys(matchState.state.playersDb).length === 0) {
    const rebuilt = rebuildPlayersDbFromTeams(matchState.state.savedTeams || {});
    matchState.state.playersDb = rebuilt;
    savePlayersDbToStorage(rebuilt);
  }
  matchState.state.scoreOverrides = normalizeScoreOverrides(parsed.scoreOverrides);
  matchState.state.selectedTeam = typeof parsed.selectedTeam === "string" ? parsed.selectedTeam : "";
  matchState.state.selectedOpponentTeam = typeof parsed.selectedOpponentTeam === "string" ? parsed.selectedOpponentTeam : "";
  matchState.state.opponentPlayers = normalizePlayers(parsed.opponentPlayers || matchState.state.opponentPlayers || []);
  matchState.state.opponentPlayerNumbers = asRecord(parsed.opponentPlayerNumbers);
  matchState.state.opponentStats = asRecord(parsed.opponentStats);
  matchState.state.opponentLiberos = Array.isArray(parsed.opponentLiberos) ? normalizePlayers(parsed.opponentLiberos) : [];
  matchState.state.opponentCaptains = normalizePlayers(
    Array.isArray(parsed.opponentCaptains) ? parsed.opponentCaptains : []
  ).slice(0, 1);
  matchState.state.opponentCourt = Array.isArray(parsed.opponentCourt) ? ensureCourtShapeFor(parsed.opponentCourt) : matchState.state.opponentCourt || [];
  matchState.state.opponentRotation = Math.min(6, Math.max(1, parseInt(parsed.opponentRotation, 10) || 1));
  matchState.state.opponentCourtViewMirrored = !!parsed.opponentCourtViewMirrored;
  matchState.state.opponentAutoRoleP1American = !!parsed.opponentAutoRoleP1American;
  matchState.state.opponentAttackTrajectoryEnabled = parsed.opponentAttackTrajectoryEnabled !== false;
  matchState.state.opponentServeTrajectoryEnabled = parsed.opponentServeTrajectoryEnabled !== false;
  matchState.state.opponentSetTypePromptEnabled = parsed.opponentSetTypePromptEnabled !== false;
  matchState.state.opponentAutoLiberoBackline = parsed.opponentAutoLiberoBackline !== false;
  matchState.state.opponentAutoLiberoRole = normalizeAutoLiberoRolePreference(
    parsed.opponentAutoLiberoRole,
    parsed.autoLiberoRoleDefaultVersion
  );
  matchState.state.opponentLiberoAutoMap = asRecord(parsed.opponentLiberoAutoMap);
  matchState.state.opponentPreferredLibero = typeof parsed.opponentPreferredLibero === "string" ? parsed.opponentPreferredLibero : "";
  matchState.state.opponentSkillFlowOverride = parsed.opponentSkillFlowOverride || null;
  matchState.state.selectedMatch = typeof parsed.selectedMatch === "string" ? parsed.selectedMatch : "";
  matchState.state.loadedMatchName =
    typeof parsed.loadedMatchName === "string" ? parsed.loadedMatchName : matchState.state.selectedMatch;
  if ((!matchState.state.captains || matchState.state.captains.length === 0) && matchState.state.selectedTeam && matchState.state.savedTeams) {
    const selectedTeamData = matchState.state.savedTeams[matchState.state.selectedTeam];
    if (selectedTeamData) {
      const roster = extractRosterFromTeam(selectedTeamData);
      matchState.state.captains = normalizePlayers(roster.captains || []).filter(name =>
        (matchState.state.players || []).includes(name)
      ).slice(0, 1);
    }
  }
  matchState.state.opponentCaptains = (matchState.state.opponentCaptains || [])
    .filter(name => (matchState.state.opponentPlayers || []).includes(name))
    .slice(0, 1);
  matchState.state.metricsConfig = asRecord(parsed.metricsConfig);
  const existingVideo = matchState.state.video || null;
  const parsedVideo = asRecord(parsed.video);
  const hasExistingVideo =
    !!existingVideo &&
    (existingVideo.youtubeId || existingVideo.youtubeUrl || existingVideo.fileName);
  const hasParsedVideo =
    !!parsedVideo && (parsedVideo.youtubeId || parsedVideo.youtubeUrl || parsedVideo.fileName);
  if (parsedVideo && !hasParsedVideo && hasExistingVideo) {
    matchState.state.video = existingVideo;
  } else {
    matchState.state.video =
      parsedVideo ||
      existingVideo || {
        offsetSeconds: 0,
        fileName: "",
        youtubeId: "",
        youtubeUrl: "",
        lastPlaybackSeconds: 0
      };
    if (
      parsedVideo &&
      existingVideo &&
      !parsedVideo.lastPlaybackSeconds &&
      existingVideo.lastPlaybackSeconds
    ) {
      matchState.state.video.lastPlaybackSeconds = existingVideo.lastPlaybackSeconds;
    }
  }
  if (typeof matchState.state.video.offsetSeconds !== "number") {
    matchState.state.video.offsetSeconds = 0;
  }
  matchState.state.video.fileName = matchState.state.video.fileName || "";
  matchState.state.video.youtubeId = matchState.state.video.youtubeId || "";
  matchState.state.video.youtubeUrl = matchState.state.video.youtubeUrl || "";
  if (typeof matchState.state.video.lastPlaybackSeconds !== "number") {
    matchState.state.video.lastPlaybackSeconds = 0;
  }
  matchState.state.autoRotate = parsed.autoRotate !== false;
  matchState.state.autoLiberoBackline = parsed.autoLiberoBackline !== false;
  matchState.state.autoLiberoRole = normalizeAutoLiberoRolePreference(
    parsed.autoLiberoRole,
    parsed.autoLiberoRoleDefaultVersion
  );
  matchState.state.autoLiberoRoleDefaultVersion = AUTO_LIBERO_ROLE_DEFAULT_VERSION;
  matchState.state.preferredLibero = typeof parsed.preferredLibero === "string" ? parsed.preferredLibero : "";
  matchState.state.autoRoleP1American = !!parsed.autoRoleP1American;
  matchState.state.courtViewMirrored = !!parsed.courtViewMirrored;
  matchState.state.courtSideSwapped = !!parsed.courtSideSwapped;
  matchState.state.courtViewMirrored = !!matchState.state.courtSideSwapped;
  matchState.state.opponentCourtViewMirrored = !matchState.state.courtSideSwapped;
  matchState.state.predictiveSkillFlow = parsed.predictiveSkillFlow !== false;
  matchState.state.freeballPending = !!parsed.freeballPending;
  matchState.state.freeballPendingScope = parsed.freeballPendingScope || matchState.state.freeballPendingScope || "our";
  matchState.state.flowTeamScope = parsed.flowTeamScope || matchState.state.flowTeamScope || "our";
  matchState.state.opponentSkillConfig = Object.keys(asRecord(parsed.opponentSkillConfig)).length
    ? asRecord(parsed.opponentSkillConfig)
    : matchState.state.opponentSkillConfig || {};
  matchState.state.autoRoleBaseCourt = Array.isArray(parsed.autoRoleBaseCourt) ? ensureCourtShapeFor(parsed.autoRoleBaseCourt) : [];
  matchState.state.opponentAutoRoleBaseCourt = Array.isArray(parsed.opponentAutoRoleBaseCourt)
    ? ensureCourtShapeFor(parsed.opponentAutoRoleBaseCourt)
    : [];
  matchState.state.skillClock = parsed.skillClock || { paused: false, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: null };
  rosterLineupState.autoRoleBaseCourt =
    matchState.state.autoRoleBaseCourt && matchState.state.autoRoleBaseCourt.length === 6
      ? cloneCourtLineup(matchState.state.autoRoleBaseCourt)
      : null;
  rosterLineupState.opponentAutoRoleBaseCourt =
    matchState.state.opponentAutoRoleBaseCourt && matchState.state.opponentAutoRoleBaseCourt.length === 6
      ? cloneCourtLineup(matchState.state.opponentAutoRoleBaseCourt)
      : null;
  sanitizeAutoRoleBaseCourtForScope("our");
  sanitizeAutoRoleBaseCourtForScope("opponent");
  matchState.state.pointRules = Object.keys(asRecord(parsed.pointRules)).length
    ? asRecord(parsed.pointRules)
    : matchState.state.pointRules || {};
  ensureMatchDefaults();
  syncPlayerNumbers(matchState.state.players || []);
  syncOpponentPlayerNumbers(matchState.state.opponentPlayers || [], matchState.state.opponentPlayerNumbers || {});
  cleanOpponentLiberos();
  cleanLiberos();
  sanitizeRosterIsolation("our");
  sanitizeRosterIsolation("opponent");
  ensureMetricsConfigDefaults();
  ensurePointRulesDefaults();
  ensureOpponentSkillConfigDefaults();
  if (!skipStorageSync) {
    migrateTeamsToPersistent();
    migrateOpponentTeamsToPersistent();
    syncTeamsFromStorage();
    syncOpponentTeamsFromStorage();
    syncMatchesFromStorage();
  }
  enforceAutoLiberoForState({ skipServerOnServe: true });
  resetAnalysisForMatch();
  return true;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.__uiOnly) return false;
    return applyStateSnapshot(parsed, { skipStorageSync: true });
  } catch (e) {
    logError("Error loading state", e);
  }
  return false;
}







export async function loadStateFromIndexedDb() {
  try {
    const indexed = await readStateFromIndexedDb();
    let local = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      local = raw ? JSON.parse(raw) : null;
    } catch (_) {
      local = null;
    }
    const indexedTs = getSnapshotTimestamp(indexed);
    const localTs = getSnapshotTimestamp(local);
    const parsed = local && !local.__uiOnly && localTs > indexedTs ? local : indexed;
    if (parsed && local && local.__uiOnly && localTs >= indexedTs) Object.assign(parsed, local);
    if (!parsed) return false;
    return applyStateSnapshot(parsed, { skipStorageSync: true });
  } catch (e) {
    logError("Error loading state from indexeddb", e);
  }
  return false;
}


