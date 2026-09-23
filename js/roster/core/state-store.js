function getTodayIso() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
function formatUsDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { timeZone: "UTC" });
}
function ensureMatchDefaults() {
  state.match = state.match || {};
  if (!state.match.date) {
    state.match.date = getTodayIso();
  }
  if (!state.match.matchType) {
    state.match.matchType = "amichevole";
  }
  if (typeof state.match.leg !== "string") {
    state.match.leg = "";
  }
}
function buildMatchDisplayName(matchObj) {
  const m = matchObj || state.match || {};
  const dateIso = m.date || getTodayIso();
  const datePart = formatUsDate(dateIso);
  const teamName = (m.teamName || "").trim();
  const typeLabels = {
    amichevole: "Amichevole",
    campionato: "Campionato",
    torneo: "Torneo",
    playoff: "Playoff",
    playout: "Playout",
    coppa: "Coppa"
  };
  const legLabels = {
    andata: "Andata",
    ritorno: "Ritorno",
    "gara-1": "Gara 1",
    "gara-2": "Gara 2",
    "gara-3": "Gara 3"
  };
  const parts = [
    datePart || getTodayIso(),
    teamName || "Squadra",
    m.opponent || "Match",
    m.category || "",
    typeLabels[m.matchType] || m.matchType || "",
    legLabels[m.leg] || m.leg || ""
  ].filter(Boolean);
  return parts.join(" - ") || "Match";
}

const THEME_PREFERENCE_KEY = "volleyeye-theme-preference";

function normalizeThemePreference(theme) {
  return ["auto", "light", "dark"].includes(theme) ? theme : "auto";
}

function getStoredThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
    return ["auto", "light", "dark"].includes(stored) ? stored : "";
  } catch (_) {
    return "";
  }
}

function setStoredThemePreference(theme) {
  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, normalizeThemePreference(theme));
  } catch (_) {
    // Il tema resta comunque applicato per la sessione corrente.
  }
}

function applyTheme(theme, options = {}) {
  const preference = normalizeThemePreference(theme);
  const persistPreference = options.persistPreference !== false;
  const followsDevice = preference === "auto";
  const devicePrefersLight =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolvedTheme = followsDevice ? (devicePrefersLight ? "light" : "dark") : preference;
  document.body.dataset.theme = resolvedTheme;
  document.body.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolvedTheme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = resolvedTheme === "light" ? "#f1f5f9" : "#111111";
  state.theme = preference;
  if (persistPreference) setStoredThemePreference(preference);
  const textColor = (THEME_TEXT && THEME_TEXT[resolvedTheme]) || "#ffffff";
  document.documentElement.style.setProperty("--text-color", textColor);
  elThemeToggles.forEach(button => {
    const isActive = button.dataset.themeChoice === preference;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}
const SKILL_COLUMN_MAP = {
  serve: [4, 5, 6, 7, 8],
  pass: [9, 10, 11, 12, 13],
  attack: [14, 15, 16, 17, 18, 19],
  block: [20, 21],
  defense: [22, 23, 24],
  second: []
};
function normalizeVideoFilterPresets(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry, idx) => {
      if (!entry || typeof entry !== "object") return null;
      const id = String(entry.id || ("preset_" + idx + "_" + Date.now()));
      const name = String(entry.name || "").trim() || ("Preset " + (idx + 1));
      const filters = entry.filters && typeof entry.filters === "object" ? entry.filters : {};
      return { id, name, filters };
    })
    .filter(Boolean);
}
function cloneIsolationData(value) {
  if (
    typeof window !== "undefined" &&
    window.VolleyEye &&
    window.VolleyEye.stateIsolation &&
    typeof window.VolleyEye.stateIsolation.cloneData === "function"
  ) {
    return window.VolleyEye.stateIsolation.cloneData(value);
  }
  return value === undefined || value === null ? value : JSON.parse(JSON.stringify(value));
}
function normalizeAutoLiberoRolePreference(value, defaultVersion = 0) {
  const isLegacyDefault = Number(defaultVersion || 0) < AUTO_LIBERO_ROLE_DEFAULT_VERSION;
  if (typeof value !== "string" || (isLegacyDefault && value === "")) {
    return "C";
  }
  return AUTO_LIBERO_ROLE_OPTIONS.includes(value) ? value : "C";
}
function sanitizeRosterIsolation(scope = "our") {
  if (
    typeof window !== "undefined" &&
    window.VolleyEye &&
    window.VolleyEye.stateIsolation &&
    typeof window.VolleyEye.stateIsolation.sanitizeRosterScope === "function"
  ) {
    window.VolleyEye.stateIsolation.sanitizeRosterScope(state, scope);
  }
}
function applyStateSnapshot(parsed, options = {}) {
  if (!parsed || typeof parsed !== "object") return false;
  parsed = cloneIsolationData(parsed);
  const { skipStorageSync = false } = options;
  const asRecord = value =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const globalThemePreference = getStoredThemePreference();
  state = Object.assign(state, parsed);
  state.match = asRecord(parsed.match);
  state.theme = globalThemePreference || normalizeThemePreference(parsed.theme);
  state.players = normalizePlayers(parsed.players || state.players || []);
  const normalizedNumbers = normalizeNumbersMap(parsed.playerNumbers || state.playerNumbers || {});
  state.playerNumbers =
    typeof buildNumbersForNames === "function"
      ? buildNumbersForNames(state.players, normalizedNumbers, state.playerNumbers || {})
      : normalizedNumbers;
  state.captains = normalizePlayers(Array.isArray(parsed.captains) ? parsed.captains : []).slice(0, 1);
  ensureCourtShape();
  cleanCourtPlayers();
  state.captains = (state.captains || []).filter(name => (state.players || []).includes(name)).slice(0, 1);
  state.autoRolePositioning = parsed.autoRolePositioning !== false;
  state.isServing = !!parsed.isServing;
  state.autoRotatePending = !!parsed.autoRotatePending;
  state.opponentAutoRotatePending = !!parsed.opponentAutoRotatePending;
  state.currentSet = Math.min(5, Math.max(1, parseInt(parsed.currentSet, 10) || 1));
  state.rotation = Math.min(6, Math.max(1, parseInt(parsed.rotation, 10) || 1));
  state.events = Array.isArray(parsed.events) ? parsed.events : [];
  state.stats = asRecord(parsed.stats);
  state.setResults = asRecord(parsed.setResults);
  state.setStarts = asRecord(parsed.setStarts);
  state.matchFinished = !!parsed.matchFinished;
  state.attackTrajectoryEnabled = parsed.attackTrajectoryEnabled !== false;
  state.attackTrajectorySimplified = parsed.attackTrajectorySimplified !== false;
  state.serveTrajectoryEnabled = parsed.serveTrajectoryEnabled !== false;
  state.setTypePromptEnabled = parsed.setTypePromptEnabled !== false;
  state.showServeTrajectoryLogOur = parsed.showServeTrajectoryLogOur !== false;
  state.showServeTrajectoryLogOpp = parsed.showServeTrajectoryLogOpp !== false;
  state.useOpponentTeam = !!parsed.useOpponentTeam;
  state.videoScoutMode = !!parsed.videoScoutMode;
  state.videoPlayByPlay = !!parsed.videoPlayByPlay;
  state.defaultSetType = parsed.defaultSetType || "";
  state.nextSetType = parsed.nextSetType || "";
  state.videoFilterPresets = normalizeVideoFilterPresets(parsed.videoFilterPresets || state.videoFilterPresets || []);
  state.uiPlayerAnalysis = Object.assign({}, state.uiPlayerAnalysis || {}, asRecord(parsed.uiPlayerAnalysis));
  state.uiVideoLayout = Object.assign({}, state.uiVideoLayout || {}, asRecord(parsed.uiVideoLayout));
  state.uiScoutColumns = Object.assign({}, state.uiScoutColumns || {}, asRecord(parsed.uiScoutColumns));
  state.uiScoutWidgetLayout = parsed.uiScoutWidgetLayout || null;
  state.uiVideoAnalysisSort = Object.assign({}, state.uiVideoAnalysisSort || {}, asRecord(parsed.uiVideoAnalysisSort));
  state.uiMatchSessionActive = parsed.uiMatchSessionActive === true;
  state.uiActiveTab = typeof parsed.uiActiveTab === "string" ? parsed.uiActiveTab : "match";
  state.uiTopBarHidden = !!parsed.uiTopBarHidden;
  state.forceMobileLayout = !!parsed.forceMobileLayout;
  state.liberos = Array.isArray(parsed.liberos)
    ? normalizePlayers(parsed.liberos).filter(name => (state.players || []).includes(name))
    : [];
  state.liberoAutoMap = asRecord(parsed.liberoAutoMap);
  state.savedTeams = asRecord(parsed.savedTeams);
  state.savedOpponentTeams = Object.keys(asRecord(parsed.savedOpponentTeams)).length
    ? asRecord(parsed.savedOpponentTeams)
    : cloneIsolationData(state.savedTeams);
  state.savedMatches = asRecord(parsed.savedMatches);
  state.playersDb = loadPlayersDbFromStorage();
  if (!state.playersDb || Object.keys(state.playersDb).length === 0) {
    const rebuilt = rebuildPlayersDbFromTeams(state.savedTeams || {});
    state.playersDb = rebuilt;
    savePlayersDbToStorage(rebuilt);
  }
  state.scoreOverrides = normalizeScoreOverrides(parsed.scoreOverrides);
  state.selectedTeam = typeof parsed.selectedTeam === "string" ? parsed.selectedTeam : "";
  state.selectedOpponentTeam = typeof parsed.selectedOpponentTeam === "string" ? parsed.selectedOpponentTeam : "";
  state.opponentPlayers = normalizePlayers(parsed.opponentPlayers || state.opponentPlayers || []);
  state.opponentPlayerNumbers = asRecord(parsed.opponentPlayerNumbers);
  state.opponentStats = asRecord(parsed.opponentStats);
  state.opponentLiberos = Array.isArray(parsed.opponentLiberos) ? normalizePlayers(parsed.opponentLiberos) : [];
  state.opponentCaptains = normalizePlayers(
    Array.isArray(parsed.opponentCaptains) ? parsed.opponentCaptains : []
  ).slice(0, 1);
  state.opponentCourt = Array.isArray(parsed.opponentCourt) ? ensureCourtShapeFor(parsed.opponentCourt) : state.opponentCourt || [];
  state.opponentRotation = Math.min(6, Math.max(1, parseInt(parsed.opponentRotation, 10) || 1));
  state.opponentCourtViewMirrored = !!parsed.opponentCourtViewMirrored;
  state.opponentAutoRoleP1American = !!parsed.opponentAutoRoleP1American;
  state.opponentAttackTrajectoryEnabled = parsed.opponentAttackTrajectoryEnabled !== false;
  state.opponentServeTrajectoryEnabled = parsed.opponentServeTrajectoryEnabled !== false;
  state.opponentSetTypePromptEnabled = parsed.opponentSetTypePromptEnabled !== false;
  state.opponentAutoLiberoBackline = parsed.opponentAutoLiberoBackline !== false;
  state.opponentAutoLiberoRole = normalizeAutoLiberoRolePreference(
    parsed.opponentAutoLiberoRole,
    parsed.autoLiberoRoleDefaultVersion
  );
  state.opponentLiberoAutoMap = asRecord(parsed.opponentLiberoAutoMap);
  state.opponentPreferredLibero = typeof parsed.opponentPreferredLibero === "string" ? parsed.opponentPreferredLibero : "";
  state.opponentSkillFlowOverride = parsed.opponentSkillFlowOverride || null;
  state.selectedMatch = typeof parsed.selectedMatch === "string" ? parsed.selectedMatch : "";
  state.loadedMatchName =
    typeof parsed.loadedMatchName === "string" ? parsed.loadedMatchName : state.selectedMatch;
  if ((!state.captains || state.captains.length === 0) && state.selectedTeam && state.savedTeams) {
    const selectedTeamData = state.savedTeams[state.selectedTeam];
    if (selectedTeamData) {
      const roster = extractRosterFromTeam(selectedTeamData);
      state.captains = normalizePlayers(roster.captains || []).filter(name =>
        (state.players || []).includes(name)
      ).slice(0, 1);
    }
  }
  state.opponentCaptains = (state.opponentCaptains || [])
    .filter(name => (state.opponentPlayers || []).includes(name))
    .slice(0, 1);
  state.metricsConfig = asRecord(parsed.metricsConfig);
  const existingVideo = state.video || null;
  const parsedVideo = asRecord(parsed.video);
  const hasExistingVideo =
    !!existingVideo &&
    (existingVideo.youtubeId || existingVideo.youtubeUrl || existingVideo.fileName);
  const hasParsedVideo =
    !!parsedVideo && (parsedVideo.youtubeId || parsedVideo.youtubeUrl || parsedVideo.fileName);
  if (parsedVideo && !hasParsedVideo && hasExistingVideo) {
    state.video = existingVideo;
  } else {
    state.video =
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
      state.video.lastPlaybackSeconds = existingVideo.lastPlaybackSeconds;
    }
  }
  if (typeof state.video.offsetSeconds !== "number") {
    state.video.offsetSeconds = 0;
  }
  state.video.fileName = state.video.fileName || "";
  state.video.youtubeId = state.video.youtubeId || "";
  state.video.youtubeUrl = state.video.youtubeUrl || "";
  if (typeof state.video.lastPlaybackSeconds !== "number") {
    state.video.lastPlaybackSeconds = 0;
  }
  state.autoRotate = parsed.autoRotate !== false;
  state.autoLiberoBackline = parsed.autoLiberoBackline !== false;
  state.autoLiberoRole = normalizeAutoLiberoRolePreference(
    parsed.autoLiberoRole,
    parsed.autoLiberoRoleDefaultVersion
  );
  state.autoLiberoRoleDefaultVersion = AUTO_LIBERO_ROLE_DEFAULT_VERSION;
  state.preferredLibero = typeof parsed.preferredLibero === "string" ? parsed.preferredLibero : "";
  state.autoRoleP1American = !!parsed.autoRoleP1American;
  state.courtViewMirrored = !!parsed.courtViewMirrored;
  state.courtSideSwapped = !!parsed.courtSideSwapped;
  state.courtViewMirrored = !!state.courtSideSwapped;
  state.opponentCourtViewMirrored = !state.courtSideSwapped;
  state.predictiveSkillFlow = parsed.predictiveSkillFlow !== false;
  state.freeballPending = !!parsed.freeballPending;
  state.freeballPendingScope = parsed.freeballPendingScope || state.freeballPendingScope || "our";
  state.flowTeamScope = parsed.flowTeamScope || state.flowTeamScope || "our";
  state.opponentSkillConfig = Object.keys(asRecord(parsed.opponentSkillConfig)).length
    ? asRecord(parsed.opponentSkillConfig)
    : state.opponentSkillConfig || {};
  state.autoRoleBaseCourt = Array.isArray(parsed.autoRoleBaseCourt) ? ensureCourtShapeFor(parsed.autoRoleBaseCourt) : [];
  state.opponentAutoRoleBaseCourt = Array.isArray(parsed.opponentAutoRoleBaseCourt)
    ? ensureCourtShapeFor(parsed.opponentAutoRoleBaseCourt)
    : [];
  state.skillClock = parsed.skillClock || { paused: false, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: null };
  autoRoleBaseCourt =
    state.autoRoleBaseCourt && state.autoRoleBaseCourt.length === 6
      ? cloneCourtLineup(state.autoRoleBaseCourt)
      : null;
  opponentAutoRoleBaseCourt =
    state.opponentAutoRoleBaseCourt && state.opponentAutoRoleBaseCourt.length === 6
      ? cloneCourtLineup(state.opponentAutoRoleBaseCourt)
      : null;
  sanitizeAutoRoleBaseCourtForScope("our");
  sanitizeAutoRoleBaseCourtForScope("opponent");
  state.pointRules = Object.keys(asRecord(parsed.pointRules)).length
    ? asRecord(parsed.pointRules)
    : state.pointRules || {};
  ensureMatchDefaults();
  syncPlayerNumbers(state.players || []);
  syncOpponentPlayerNumbers(state.opponentPlayers || [], state.opponentPlayerNumbers || {});
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
  return true;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return applyStateSnapshot(parsed, { skipStorageSync: true });
  } catch (e) {
    logError("Error loading state", e);
  }
  return false;
}
function getSnapshotTimestamp(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  const ts = Number(snapshot.lastSavedAt || 0);
  return Number.isFinite(ts) ? ts : 0;
}
function buildCompactLocalStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const selectedMatch = snapshot.selectedMatch || "";
  const currentMatchPayload =
    selectedMatch && typeof getCurrentMatchPayload === "function"
      ? getCurrentMatchPayload(selectedMatch)
      : null;
  const compact = {
    __compactLocalSnapshot: true,
    lastSavedAt: Number(snapshot.lastSavedAt || Date.now()) || Date.now(),
    theme: snapshot.theme || "auto",
    match: snapshot.match || {},
    selectedMatch: snapshot.selectedMatch || "",
    selectedTeam: snapshot.selectedTeam || "",
    selectedOpponentTeam: snapshot.selectedOpponentTeam || "",
    loadedMatchName: snapshot.loadedMatchName || snapshot.selectedMatch || "",
    currentSet: snapshot.currentSet || 1,
    rotation: snapshot.rotation || 1,
    opponentRotation: snapshot.opponentRotation || 1,
    courtSideSwapped: !!snapshot.courtSideSwapped,
    useOpponentTeam: !!snapshot.useOpponentTeam,
    matchFinished: !!snapshot.matchFinished,
    autoRolePositioning: snapshot.autoRolePositioning !== false,
    uiActiveTab: snapshot.uiActiveTab || "match",
    uiMatchSessionActive: snapshot.uiMatchSessionActive === true,
    uiAggTab: snapshot.uiAggTab || "summary",
    uiTopBarHidden: !!snapshot.uiTopBarHidden,
    forceMobileLayout: !!snapshot.forceMobileLayout,
    uiScoutColumns: {
      left: Number(snapshot.uiScoutColumns && snapshot.uiScoutColumns.left) || 280,
      right: Number(snapshot.uiScoutColumns && snapshot.uiScoutColumns.right) || 380
    },
    uiScoutWidgetLayout: snapshot.uiScoutWidgetLayout || null,
    uiPlayerAnalysis: snapshot.uiPlayerAnalysis || null,
    uiVideoLayout: snapshot.uiVideoLayout || null,
    uiVideoAnalysisSort: snapshot.uiVideoAnalysisSort || null,
    video: snapshot.video || { offsetSeconds: 0, fileName: "", youtubeId: "", youtubeUrl: "", lastPlaybackSeconds: 0 },
    players: Array.isArray(snapshot.players) ? snapshot.players : [],
    playerNumbers: snapshot.playerNumbers || {},
    liberos: Array.isArray(snapshot.liberos) ? snapshot.liberos : [],
    liberoAutoMap: snapshot.liberoAutoMap || {},
    autoLiberoBackline: snapshot.autoLiberoBackline !== false,
    autoLiberoRole: normalizeAutoLiberoRolePreference(snapshot.autoLiberoRole, snapshot.autoLiberoRoleDefaultVersion),
    autoLiberoRoleDefaultVersion: AUTO_LIBERO_ROLE_DEFAULT_VERSION,
    preferredLibero: snapshot.preferredLibero || "",
    captains: Array.isArray(snapshot.captains) ? snapshot.captains.slice(0, 1) : [],
    opponentPlayers: Array.isArray(snapshot.opponentPlayers) ? snapshot.opponentPlayers : [],
    opponentPlayerNumbers: snapshot.opponentPlayerNumbers || {},
    opponentLiberos: Array.isArray(snapshot.opponentLiberos) ? snapshot.opponentLiberos : [],
    opponentLiberoAutoMap: snapshot.opponentLiberoAutoMap || {},
    opponentAutoLiberoBackline: snapshot.opponentAutoLiberoBackline !== false,
    opponentAutoLiberoRole: normalizeAutoLiberoRolePreference(snapshot.opponentAutoLiberoRole, snapshot.autoLiberoRoleDefaultVersion),
    opponentPreferredLibero: snapshot.opponentPreferredLibero || "",
    opponentCaptains: Array.isArray(snapshot.opponentCaptains) ? snapshot.opponentCaptains.slice(0, 1) : [],
    events: Array.isArray(snapshot.events) ? snapshot.events : [],
    stats: snapshot.stats || {},
    opponentStats: snapshot.opponentStats || {},
    court: Array.isArray(snapshot.court) ? snapshot.court : [],
    opponentCourt: Array.isArray(snapshot.opponentCourt) ? snapshot.opponentCourt : [],
    autoRoleBaseCourt: Array.isArray(snapshot.autoRoleBaseCourt) ? snapshot.autoRoleBaseCourt : [],
    opponentAutoRoleBaseCourt: Array.isArray(snapshot.opponentAutoRoleBaseCourt) ? snapshot.opponentAutoRoleBaseCourt : [],
    autoRoleP1American: !!snapshot.autoRoleP1American,
    opponentAutoRoleP1American: !!snapshot.opponentAutoRoleP1American,
    isServing: !!snapshot.isServing,
    autoRotate: snapshot.autoRotate !== false,
    autoRotatePending: !!snapshot.autoRotatePending,
    opponentAutoRotatePending: !!snapshot.opponentAutoRotatePending,
    predictiveSkillFlow: snapshot.predictiveSkillFlow !== false,
    attackTrajectoryEnabled: snapshot.attackTrajectoryEnabled !== false,
    attackTrajectorySimplified: snapshot.attackTrajectorySimplified !== false,
    serveTrajectoryEnabled: snapshot.serveTrajectoryEnabled !== false,
    opponentAttackTrajectoryEnabled: snapshot.opponentAttackTrajectoryEnabled !== false,
    opponentServeTrajectoryEnabled: snapshot.opponentServeTrajectoryEnabled !== false,
    setTypePromptEnabled: snapshot.setTypePromptEnabled !== false,
    opponentSetTypePromptEnabled: snapshot.opponentSetTypePromptEnabled !== false,
    showServeTrajectoryLogOur: snapshot.showServeTrajectoryLogOur !== false,
    showServeTrajectoryLogOpp: snapshot.showServeTrajectoryLogOpp !== false,
    videoScoutMode: !!snapshot.videoScoutMode,
    videoPlayByPlay: !!snapshot.videoPlayByPlay,
    defaultSetType: snapshot.defaultSetType || "",
    nextSetType: snapshot.nextSetType || "",
    videoFilterPresets: snapshot.videoFilterPresets || [],
    skillFlowOverride: snapshot.skillFlowOverride || null,
    opponentSkillFlowOverride: snapshot.opponentSkillFlowOverride || null,
    flowTeamScope: snapshot.flowTeamScope || "our",
    forceSkillActive: !!snapshot.forceSkillActive,
    forceSkillScope: snapshot.forceSkillScope || null,
    pendingServe: snapshot.pendingServe || null,
    freeballPending: !!snapshot.freeballPending,
    freeballPendingScope: snapshot.freeballPendingScope || "our",
    opponentSkillConfig: snapshot.opponentSkillConfig || {},
    skillClock: snapshot.skillClock || null,
    metricsConfig: snapshot.metricsConfig || {},
    pointRules: snapshot.pointRules || {},
    savedTeams: snapshot.savedTeams || {},
    savedOpponentTeams: snapshot.savedOpponentTeams || snapshot.savedTeams || {},
    savedMatches:
      currentMatchPayload && selectedMatch
        ? { [selectedMatch]: currentMatchPayload }
        : {},
    scoreOverrides: snapshot.scoreOverrides || {},
    setResults: snapshot.setResults || {},
    setStarts: snapshot.setStarts || {}
  };
  return cloneIsolationData(compact);
}
async function loadStateFromIndexedDb() {
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
    const parsed = localTs > indexedTs ? local : indexed;
    if (!parsed) return false;
    return applyStateSnapshot(parsed, { skipStorageSync: true });
  } catch (e) {
    logError("Error loading state from indexeddb", e);
  }
  return false;
}
function saveState(options = {}) {
  const { persistLocal = false, skipMatchPersist = false } = options || {};
  try {
    if (typeof window !== "undefined") {
      const resetCooldownActive =
        Number.isFinite(window.__recentAppResetAt) &&
        Date.now() - window.__recentAppResetAt < 5000;
      if (window.__appResetInProgress || resetCooldownActive) {
        if (resetCooldownActive) {
          window.__resetWriteLog = window.__resetWriteLog || [];
          window.__resetWriteLog.push({
            kind: "saveState-blocked",
            at: new Date().toISOString(),
            persistLocal: !!persistLocal,
            skipMatchPersist: !!skipMatchPersist,
            selectedMatch: state && state.selectedMatch,
            loadedMatchName: state && state.loadedMatchName,
            stack: new Error().stack
          });
        }
        return;
      }
    }
    state.lastSavedAt = Date.now();
    if (persistLocal) {
      syncTeamsFromStorage();
      syncOpponentTeamsFromStorage();
      syncMatchesFromStorage();
    }
    const snapshot = buildCompactLocalStateSnapshot(state) || state;
    writeStateToIndexedDb(snapshot);
    // La copia compatta entra in localStorage e deve essere sincrona: affidarsi
    // soltanto alla scrittura asincrona su IndexedDB perde le ultime modifiche
    // quando l'utente ricarica subito la pagina.
    {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (localErr) {
        const compact = snapshot;
        let compactSaved = false;
        try {
          if (compact) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
            compactSaved = true;
          }
        } catch (_) {
          // ignore secondary local storage failure
        }
        if (!compactSaved) {
          throw localErr;
        }
      }
    }
    const loading =
      typeof window !== "undefined" && typeof window.isLoadingMatch !== "undefined"
        ? !!window.isLoadingMatch
        : isLoadingMatch;
    if (!loading && !skipMatchPersist) {
      persistCurrentMatch({ allowCreate: false });
    }
  } catch (e) {
    logError("Error saving state", e);
  }
}
