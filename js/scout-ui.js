function getEnabledSkills() {
  return SKILLS.filter(skill => {
    const cfg = state.metricsConfig[skill.id];
    return !cfg || cfg.enabled !== false;
  });
}
const APP_RESET_SIGNAL_KEY = "volleyScoutResetSignal";
const APP_RESET_CHANNEL = "volleyeye-reset";
let resetSyncChannel = null;
let lastHandledResetSignal = "";
function navigateToResetBootstrap() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("reset_app") === "1") return;
  url.searchParams.set("reset_app", "1");
  window.location.replace(url.toString());
}
function handleIncomingResetSignal(signalId = "") {
  if (typeof window === "undefined") return;
  const normalized = String(signalId || "").trim();
  if (!normalized || normalized === lastHandledResetSignal) return;
  lastHandledResetSignal = normalized;
  window.__appResetInProgress = true;
  window.__recentAppResetAt = Date.now();
  navigateToResetBootstrap();
}
function broadcastResetSignal(signalId) {
  if (typeof window === "undefined") return;
  const payload = {
    id: String(signalId || Date.now()),
    at: new Date().toISOString()
  };
  try {
    localStorage.setItem(APP_RESET_SIGNAL_KEY, JSON.stringify(payload));
  } catch (_) {
    // ignore
  }
  try {
    if (!resetSyncChannel && "BroadcastChannel" in window) {
      resetSyncChannel = new BroadcastChannel(APP_RESET_CHANNEL);
    }
    if (resetSyncChannel) {
      resetSyncChannel.postMessage(payload);
    }
  } catch (_) {
    // ignore
  }
}
function initCrossTabResetSync() {
  if (typeof window === "undefined" || window.__resetSyncInitialized) return;
  window.__resetSyncInitialized = true;
  window.addEventListener("storage", event => {
    if (!event || event.key !== APP_RESET_SIGNAL_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue);
      handleIncomingResetSignal(payload && payload.id);
    } catch (_) {
      // ignore
    }
  });
  try {
    if ("BroadcastChannel" in window) {
      resetSyncChannel = new BroadcastChannel(APP_RESET_CHANNEL);
      resetSyncChannel.addEventListener("message", event => {
        const payload = event && event.data;
        handleIncomingResetSignal(payload && payload.id);
      });
    }
  } catch (_) {
    // ignore
  }
}
function isSkillEnabled(skillId) {
  if (!skillId) return false;
  const cfg = state.metricsConfig && state.metricsConfig[skillId];
  return !cfg || cfg.enabled !== false;
}
function getTeamScopeFromEvent(ev) {
  return ev && ev.team === "opponent" ? "opponent" : "our";
}
function getOppositeScope(scope) {
  return scope === "opponent" ? "our" : "opponent";
}
function isFarSideForScope(scope) {
  const swapped = !!state.courtSideSwapped;
  return scope === "our" ? swapped : !swapped;
}
function isFarSideForScopeAtSwap(scope, swapped) {
  return scope === "our" ? swapped : !swapped;
}
function isServingForScope(scope) {
  return scope === "opponent" ? !state.isServing : !!state.isServing;
}
function hasPendingServeSelectionForScope(scope = "our") {
  return Object.keys(selectedSkillPerPlayer || {}).some(key => {
    if (!key.startsWith(scope + ":")) return false;
    return selectedSkillPerPlayer[key] === "serve";
  });
}
function getServeDisplayCourt(scope = "our") {
  let baseCourt = scope === "opponent" ? state.opponentCourt : state.court;
  if (state.autoRolePositioning && !hasPendingServeSelectionForScope(scope)) {
    if (scope === "opponent") {
      if (state.opponentAutoRoleBaseCourt && state.opponentAutoRoleBaseCourt.length === 6) {
        baseCourt = state.opponentAutoRoleBaseCourt;
      }
    } else if (autoRoleBaseCourt) {
      baseCourt = autoRoleBaseCourt;
    }
  }
  if (!Array.isArray(baseCourt) || baseCourt.length === 0) return [];
  const shaped = typeof ensureCourtShapeFor === "function" ? ensureCourtShapeFor(baseCourt) : getCourtShape(baseCourt);
  if (isServingForScope(scope) && typeof removeLiberosAndRestoreForScope === "function") {
    return removeLiberosAndRestoreForScope(shaped, scope);
  }
  return shaped;
}
function getTeamNameForScope(scope) {
  if (scope === "opponent") {
    const matchName = (state.match && state.match.opponent) || "";
    return matchName || "Avversaria";
  }
  return (state.match && state.match.teamName) || state.selectedTeam || "Squadra";
}
function getSelectedTeamNameForScope(scope) {
  if (scope === "opponent") {
    return state.useOpponentTeam ? (state.selectedOpponentTeam || "").trim() : "";
  }
  return ((state.match && state.match.teamName) || state.selectedTeam || "").trim();
}
function getPlayersForScope(scope) {
  return scope === "opponent" ? state.opponentPlayers || [] : state.players || [];
}
function getPlayerNumbersForScope(scope) {
  return scope === "opponent" ? state.opponentPlayerNumbers || {} : state.playerNumbers || {};
}
function getLiberosForScope(scope) {
  return scope === "opponent" ? state.opponentLiberos || [] : state.liberos || [];
}
function getCaptainsForScope(scope) {
  return scope === "opponent" ? state.opponentCaptains || [] : state.captains || [];
}
const rosterIdMapsCache = {
  our: { teamName: null, playersKey: null, map: null },
  opponent: { teamName: null, playersKey: null, map: null }
};
function invalidateRosterIdMapsCache(scope = "") {
  if (!scope) {
    rosterIdMapsCache.our = { teamName: null, playersKey: null, map: null };
    rosterIdMapsCache.opponent = { teamName: null, playersKey: null, map: null };
    return;
  }
  if (!rosterIdMapsCache[scope]) return;
  rosterIdMapsCache[scope] = { teamName: null, playersKey: null, map: null };
}
if (typeof window !== "undefined") {
}
function sanitizeOfficialString(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || "";
}
function normalizePlayerKey(name) {
  return String(name || "").trim().toLowerCase();
}
function getRosterIdMapsForScope(scope) {
  const teamName = getSelectedTeamNameForScope(scope);
  if (!teamName) return null;
  const players = getPlayersForScope(scope) || [];
  const playersKey = players.join("|");
  const cache = rosterIdMapsCache[scope] || {};
  if (cache.teamName === teamName && cache.playersKey === playersKey && cache.map) {
    return cache.map;
  }
  if (typeof extractRosterFromTeam !== "function") return null;
  const loadTeam = scope === "opponent" ? loadOpponentTeamFromStorage : loadTeamFromStorage;
  if (typeof loadTeam !== "function") return null;
  const team = loadTeam(teamName);
  if (!team) return null;
  const roster = extractRosterFromTeam(team);
  const detailed = Array.isArray(roster.playersDetailed) ? roster.playersDetailed : [];
  const nameToId = new Map();
  const idToName = new Map();
  const nameToPlayer = new Map();
  detailed.forEach(player => {
    const id = player && (player.id || player.playerId);
    const name = player && player.name;
    if (!id || !name) return;
    nameToId.set(normalizePlayerKey(name), id);
    idToName.set(id, name);
    nameToPlayer.set(normalizePlayerKey(name), player);
  });
  const idToIndex = new Map();
  players.forEach((name, idx) => {
    const id = nameToId.get(normalizePlayerKey(name));
    if (id) idToIndex.set(id, idx);
  });
  const map = {
    nameToId,
    idToName,
    idToIndex,
    nameToPlayer,
    teamOfficialCode: sanitizeOfficialString(roster.officialCode),
    teamOfficialId: sanitizeOfficialString(roster.officialId)
  };
  rosterIdMapsCache[scope] = { teamName, playersKey, map };
  return map;
}
function getTeamOfficialMetaForScope(scope) {
  const maps = getRosterIdMapsForScope(scope);
  return {
    teamCodeOfficial: maps ? maps.teamOfficialCode || "" : "",
    teamIdOfficial: maps ? maps.teamOfficialId || "" : ""
  };
}
function getPlayerOfficialCodeForScope(scope, playerIdx, playerName) {
  const maps = getRosterIdMapsForScope(scope);
  if (!maps || !maps.nameToPlayer) return "";
  const players = getPlayersForScope(scope);
  const name = playerName || (typeof playerIdx === "number" ? players[playerIdx] : "");
  if (!name) return "";
  const player = maps.nameToPlayer.get(normalizePlayerKey(name));
  return player ? sanitizeOfficialString(player.codeOfficial) : "";
}
function getPlayerPhotoForScope(scope, playerName) {
  const maps = getRosterIdMapsForScope(scope);
  if (!maps || !maps.nameToPlayer || !playerName) return "";
  const player = maps.nameToPlayer.get(normalizePlayerKey(playerName));
  return player && typeof player.photo === "string" ? player.photo : "";
}
function normalizeDataVolleyEventMeta(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const numPlayersNumeric = Number(src.numPlayersNumeric);
  return {
    skillType: sanitizeOfficialString(src.skillType),
    attackCode: sanitizeOfficialString(src.attackCode),
    setCode: sanitizeOfficialString(src.setCode),
    setType: sanitizeOfficialString(src.setType),
    skillSubtype: sanitizeOfficialString(src.skillSubtype),
    specialCode: sanitizeOfficialString(src.specialCode),
    startZone: sanitizeOfficialString(src.startZone),
    endZone: sanitizeOfficialString(src.endZone),
    endSubzone: sanitizeOfficialString(src.endSubzone),
    endCone: sanitizeOfficialString(src.endCone),
    numPlayersNumeric: Number.isFinite(numPlayersNumeric) ? numPlayersNumeric : null,
    rallyEndReason: sanitizeOfficialString(src.rallyEndReason),
    rawCode: typeof src.rawCode === "string" ? src.rawCode.trim() : "",
    rawCodeSignature: typeof src.rawCodeSignature === "string" ? src.rawCodeSignature : ""
  };
}
function ensureEventDataVolleyFields(ev) {
  if (!ev || typeof ev !== "object") return;
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const name =
    (typeof ev.playerName === "string" && ev.playerName) ||
    (typeof ev.playerIdx === "number" && players[ev.playerIdx]) ||
    "";
  if (ev.playerNumberAtEvent === undefined || ev.playerNumberAtEvent === null || ev.playerNumberAtEvent === "") {
    ev.playerNumberAtEvent = name && numbers[name] !== undefined && numbers[name] !== null ? String(numbers[name]) : "";
  }
  if (ev.teamCodeOfficial === undefined || ev.teamCodeOfficial === null) {
    ev.teamCodeOfficial = "";
  }
  if (ev.teamIdOfficial === undefined || ev.teamIdOfficial === null) {
    ev.teamIdOfficial = "";
  }
  if (!ev.teamCodeOfficial || !ev.teamIdOfficial) {
    const teamMeta = getTeamOfficialMetaForScope(scope);
    if (!ev.teamCodeOfficial) ev.teamCodeOfficial = teamMeta.teamCodeOfficial || "";
    if (!ev.teamIdOfficial) ev.teamIdOfficial = teamMeta.teamIdOfficial || "";
  }
  if (ev.playerCodeOfficial === undefined || ev.playerCodeOfficial === null) {
    ev.playerCodeOfficial = "";
  }
  if (!ev.playerCodeOfficial) {
    ev.playerCodeOfficial = getPlayerOfficialCodeForScope(scope, ev.playerIdx, name);
  }
  ev.dv = normalizeDataVolleyEventMeta(ev.dv);
}
function getPlayerIdForScope(scope, playerIdx, playerName) {
  const maps = getRosterIdMapsForScope(scope);
  const players = getPlayersForScope(scope);
  const name = playerName || (typeof playerIdx === "number" ? players[playerIdx] : "");
  if (maps && name) {
    const id = maps.nameToId.get(normalizePlayerKey(name));
    if (id) return id;
  }
  if (typeof findPlayersDbMatchByFullName === "function" && name) {
    const entry = findPlayersDbMatchByFullName(name);
    if (entry && entry.id) return entry.id;
  }
  return null;
}
function getPlayerIndexForId(scope, playerId) {
  if (!playerId) return null;
  const maps = getRosterIdMapsForScope(scope);
  if (!maps || !maps.idToIndex) return null;
  const idx = maps.idToIndex.get(playerId);
  return typeof idx === "number" ? idx : null;
}
function buildPayloadRosterNameToIdMap(payload, scope) {
  if (!payload || !payload.state || typeof extractRosterFromTeam !== "function") return null;
  const teamName =
    scope === "opponent"
      ? (payload.state.selectedOpponentTeam || "").trim()
      : (payload.state.selectedTeam || "").trim();
  if (!teamName) return null;
  const mapSource =
    scope === "opponent"
      ? payload.state.savedOpponentTeams || payload.state.savedTeams
      : payload.state.savedTeams;
  const team = mapSource && mapSource[teamName] ? mapSource[teamName] : null;
  if (!team) return null;
  const roster = extractRosterFromTeam(team);
  const detailed = Array.isArray(roster.playersDetailed) ? roster.playersDetailed : [];
  const nameToId = new Map();
  detailed.forEach(player => {
    const id = player && (player.id || player.playerId);
    const name = player && player.name;
    if (!id || !name) return;
    nameToId.set(normalizePlayerKey(name), id);
  });
  return nameToId;
}
function backfillPlayerIdsInPayload(payload) {
  if (!payload || !payload.state || !Array.isArray(payload.state.events)) return 0;
  const rosterOur = Array.isArray(payload.state.players) ? payload.state.players : [];
  const rosterOpp = Array.isArray(payload.state.opponentPlayers) ? payload.state.opponentPlayers : [];
  const mapOur = buildPayloadRosterNameToIdMap(payload, "our");
  const mapOpp = buildPayloadRosterNameToIdMap(payload, "opponent");
  let updated = 0;
  payload.state.events.forEach(ev => {
    if (!ev || ev.playerId) return;
    const scope = getTeamScopeFromEvent(ev);
    const roster = scope === "opponent" ? rosterOpp : rosterOur;
    let name = ev.playerName;
    if (!name && typeof ev.playerIdx === "number" && roster[ev.playerIdx]) {
      name = roster[ev.playerIdx];
      ev.playerName = name;
    }
    if (!name) return;
    const map = scope === "opponent" ? mapOpp : mapOur;
    if (!map) return;
    const id = map.get(normalizePlayerKey(name));
    if (id) {
      ev.playerId = id;
      updated += 1;
    }
  });
  return updated;
}
function backfillPlayerIdsInSavedMatches() {
  const saved = state.savedMatches || {};
  let updatedMatches = 0;
  let updatedEvents = 0;
  Object.entries(saved).forEach(([name, payload]) => {
    const count = backfillPlayerIdsInPayload(payload);
    if (count > 0) {
      updatedMatches += 1;
      updatedEvents += count;
      if (typeof saveMatchToStorage === "function") {
        saveMatchToStorage(name, payload);
      }
      saved[name] = payload;
      if (name === state.selectedMatch) {
        state.events = cloneIsolationData(payload.state.events || state.events || []);
        syncEventPlayerLinks(state.events || []);
      }
    }
  });
  state.savedMatches = saved;
  if (updatedMatches > 0) {
    saveState();
  }
  alert(
    updatedMatches > 0
      ? `Aggiornati ${updatedEvents} eventi in ${updatedMatches} match.`
      : "Nessun match da aggiornare."
  );
}
function getEnabledSkillsForScope(scope) {
  if (scope === "opponent" && state.useOpponentTeam) {
    const cfg = state.opponentSkillConfig || {};
    return SKILLS.filter(skill => cfg[skill.id] !== false);
  }
  return getEnabledSkills();
}
function isSkillEnabledForScope(skillId, scope) {
  if (!skillId) return false;
  if (scope === "opponent" && state.useOpponentTeam) {
    const cfg = state.opponentSkillConfig || {};
    return cfg[skillId] !== false;
  }
  return isSkillEnabled(skillId);
}
function makePlayerKey(scope, playerIdx) {
  return (scope || "our") + ":" + playerIdx;
}
function isPlayerKeyInScope(key, scope) {
  if (!key || !scope) return false;
  return key.startsWith(scope + ":");
}
const selectedSkillPerPlayer = {};
const serveMetaByPlayer = {};
const attackMetaByPlayer = {};
const blockConfirmByPlayer = {};
const serveTypeSelectHandlers = {};
let blockInlinePlayer = null;
const selectedEventIds = new Set();
let lastSelectedEventId = null;
const eventTableContexts = {};
let lastEventContextKey = null;
let lastReceiveContext = { our: null, opponent: null };
let lastLogRenderedKey = null;
let aggTableView = { mode: "summary", skillId: null, playerIdx: null };
let lastUseOpponentTeamState = null;
let aggTableHeadCache = null;
let analysisStatsCache = null;
let analysisStatsScope = "our";
let analysisEventsCache = null;
let analysisEventsCacheKey = "";
let analysisEventsCacheRevision = 0;
let setTrendSelectionKey = "";
let serveTrajectoryScope = null;
const VIDEO_LAYOUT_DEFAULTS = {
  analysisHeight: 320,
  scoutHeight: 320
};
const VIDEO_LAYOUT_LIMITS = {
  analysisHeight: { min: 220, max: 1200 },
  scoutHeight: { min: 200, max: 1200 }
};
const SCOUT_COLUMN_FIXED_LEFT = 280;
const SCOUT_COLUMN_DEFAULTS = { right: 380 };
const SCOUT_COLUMN_LIMITS = { center: 300, right: 240 };
let activeVideoResizeSession = null;
let activeScoutColumnResizeSession = null;
let scoutGridResizeObserver = null;
function applyTopBarVisibility() {
  const hidden = !!state.uiTopBarHidden;
  document.body.classList.toggle("top-bar-hidden", hidden);
  if (elBtnToggleTopbar) {
    elBtnToggleTopbar.textContent = hidden ? "▾" : "▴";
    elBtnToggleTopbar.title = hidden ? "Mostra barra" : "Nascondi barra";
    elBtnToggleTopbar.setAttribute("aria-label", hidden ? "Mostra barra" : "Nascondi barra");
    elBtnToggleTopbar.setAttribute("aria-pressed", hidden ? "true" : "false");
  }
}
function ensureVideoLayoutState() {
  const current = state.uiVideoLayout && typeof state.uiVideoLayout === "object" ? state.uiVideoLayout : {};
  state.uiVideoLayout = {
    analysisHeight:
      Number.isFinite(current.analysisHeight) && current.analysisHeight > 0
        ? current.analysisHeight
        : Number.isFinite(current.analysisWidth) && current.analysisWidth > 0
          ? current.analysisWidth
          : VIDEO_LAYOUT_DEFAULTS.analysisHeight,
    scoutHeight:
      Number.isFinite(current.scoutHeight) && current.scoutHeight > 0
        ? current.scoutHeight
        : Number.isFinite(current.scoutWidth) && current.scoutWidth > 0
          ? current.scoutWidth
          : VIDEO_LAYOUT_DEFAULTS.scoutHeight
  };
  return state.uiVideoLayout;
}
function ensureVideoAnalysisSortState() {
  const current =
    state.uiVideoAnalysisSort && typeof state.uiVideoAnalysisSort === "object" ? state.uiVideoAnalysisSort : {};
  state.uiVideoAnalysisSort = {
    key: typeof current.key === "string" ? current.key : "",
    dir: current.dir === "asc" || current.dir === "desc" ? current.dir : ""
  };
  return state.uiVideoAnalysisSort;
}
function clampVideoLayoutSize(kind, size) {
  const limits = VIDEO_LAYOUT_LIMITS[kind] || VIDEO_LAYOUT_LIMITS.analysisHeight;
  const viewportMax = Math.max(limits.min, window.innerHeight - 140);
  const hardMax = Math.max(limits.min, Math.min(limits.max, viewportMax));
  return Math.max(limits.min, Math.min(hardMax, Math.round(size)));
}
function applyVideoLayoutWidths() {
  ensureVideoLayoutState();
  const root = document.documentElement;
  root.style.setProperty(
    "--video-panel-height",
    `${clampVideoLayoutSize("analysisHeight", state.uiVideoLayout.analysisHeight)}px`
  );
  root.style.setProperty(
    "--video-scout-height",
    `${clampVideoLayoutSize("scoutHeight", state.uiVideoLayout.scoutHeight)}px`
  );
}
function setVideoLayoutWidth(kind, width, persist = true) {
  ensureVideoLayoutState();
  state.uiVideoLayout[kind] = clampVideoLayoutSize(kind, width);
  applyVideoLayoutWidths();
  if (persist) {
    saveState({ persistLocal: true });
  }
}
function stopVideoResizeDrag() {
  if (!activeVideoResizeSession) return;
  document.body.classList.remove("video-panel-resizing");
  window.removeEventListener("pointermove", activeVideoResizeSession.onMove);
  window.removeEventListener("pointerup", activeVideoResizeSession.onUp);
  window.removeEventListener("pointercancel", activeVideoResizeSession.onUp);
  const { kind, currentSize } = activeVideoResizeSession;
  activeVideoResizeSession = null;
  setVideoLayoutWidth(kind, currentSize, true);
}
function startVideoResizeDrag(event, kind) {
  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (event.cancelable) event.preventDefault();
  ensureVideoLayoutState();
  const startY = event.clientY;
  const startSize = clampVideoLayoutSize(kind, state.uiVideoLayout[kind]);
  const onMove = moveEvent => {
    const delta = moveEvent.clientY - startY;
    const nextSize = clampVideoLayoutSize(kind, startSize + delta);
    if (!activeVideoResizeSession) return;
    activeVideoResizeSession.currentSize = nextSize;
    state.uiVideoLayout[kind] = nextSize;
    applyVideoLayoutWidths();
  };
  const onUp = () => stopVideoResizeDrag();
  activeVideoResizeSession = {
    kind,
    currentSize: startSize,
    onMove,
    onUp
  };
  document.body.classList.add("video-panel-resizing");
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
function bindVideoResizeHandle(handle, kind) {
  if (!handle || handle.dataset.resizeBound === "true") return;
  handle.dataset.resizeBound = "true";
  handle.addEventListener("pointerdown", event => startVideoResizeDrag(event, kind));
  handle.addEventListener("dblclick", event => {
    if (event.cancelable) event.preventDefault();
    setVideoLayoutWidth(kind, VIDEO_LAYOUT_DEFAULTS[kind], true);
  });
}
function ensureScoutColumnState() {
  const current = state.uiScoutColumns && typeof state.uiScoutColumns === "object"
    ? state.uiScoutColumns
    : {};
  const hasLegacyLeftWidth = Object.prototype.hasOwnProperty.call(current, "left");
  const savedRight = Number(current.right);
  current.right = hasLegacyLeftWidth && savedRight === 300
    ? SCOUT_COLUMN_DEFAULTS.right
    : Number.isFinite(savedRight) && savedRight > 0
      ? savedRight
      : SCOUT_COLUMN_DEFAULTS.right;
  delete current.left;
  state.uiScoutColumns = current;
  return current;
}
function getScoutColumnAvailableWidth() {
  if (!elScoutGrid) return 0;
  const styles = window.getComputedStyle(elScoutGrid);
  const gap = parseFloat(styles.columnGap) || 0;
  const handlesWidth = [elScoutResizeRight]
    .reduce((total, handle) => total + (handle ? handle.offsetWidth : 0), 0);
  return Math.max(0, elScoutGrid.clientWidth - handlesWidth - gap * 3);
}
function resolveScoutColumnWidths() {
  const current = ensureScoutColumnState();
  const available = getScoutColumnAvailableWidth();
  const maxRight = Math.max(
    SCOUT_COLUMN_LIMITS.right,
    available - SCOUT_COLUMN_FIXED_LEFT - SCOUT_COLUMN_LIMITS.center
  );
  const right = Math.min(
    maxRight,
    Math.max(SCOUT_COLUMN_LIMITS.right, Math.round(current.right))
  );
  return { left: SCOUT_COLUMN_FIXED_LEFT, right };
}
function applyScoutColumnLayout() {
  if (
    !elScoutGrid ||
    elScoutGrid.clientWidth <= 0 ||
    window.matchMedia("(max-width: 900px)").matches
  ) return;
  const widths = resolveScoutColumnWidths();
  elScoutGrid.style.setProperty("--scout-right-width", `${widths.right}px`);
  if (elScoutResizeRight) elScoutResizeRight.setAttribute("aria-valuenow", String(widths.right));
}
function setScoutColumnWidth(side, width, persist = true) {
  if (side !== "right") return;
  const current = ensureScoutColumnState();
  current.right = Math.max(SCOUT_COLUMN_LIMITS.right, Math.round(width));
  const resolved = resolveScoutColumnWidths();
  current.right = resolved.right;
  applyScoutColumnLayout();
  if (persist) saveState({ persistLocal: true });
}
function stopScoutColumnResize() {
  if (!activeScoutColumnResizeSession) return;
  const { side, currentWidth, onMove, onUp } = activeScoutColumnResizeSession;
  activeScoutColumnResizeSession = null;
  document.body.classList.remove("scout-columns-resizing");
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onUp);
  setScoutColumnWidth(side, currentWidth, true);
}
function startScoutColumnResize(event, side) {
  if (side !== "right") return;
  if (window.matchMedia("(max-width: 900px)").matches) return;
  if (event.cancelable) event.preventDefault();
  const startX = event.clientX;
  const startWidth = resolveScoutColumnWidths(side)[side];
  const onMove = moveEvent => {
    if (!activeScoutColumnResizeSession) return;
    const delta = moveEvent.clientX - startX;
    const nextWidth = startWidth + (side === "left" ? delta : -delta);
    activeScoutColumnResizeSession.currentWidth = nextWidth;
    setScoutColumnWidth(side, nextWidth, false);
  };
  const onUp = () => stopScoutColumnResize();
  activeScoutColumnResizeSession = { side, currentWidth: startWidth, onMove, onUp };
  document.body.classList.add("scout-columns-resizing");
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
function bindScoutColumnResizeHandle(handle, side) {
  if (!handle || handle.dataset.resizeBound === "true") return;
  handle.dataset.resizeBound = "true";
  handle.addEventListener("pointerdown", event => startScoutColumnResize(event, side));
  handle.addEventListener("dblclick", event => {
    if (event.cancelable) event.preventDefault();
    state.uiScoutColumns = { ...SCOUT_COLUMN_DEFAULTS };
    applyScoutColumnLayout();
    saveState({ persistLocal: true });
  });
  handle.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const delta = side === "left" ? direction * 16 : direction * -16;
    setScoutColumnWidth(side, ensureScoutColumnState()[side] + delta, true);
  });
}
function bindScoutColumnResize() {
  bindScoutColumnResizeHandle(elScoutResizeRight, "right");
  if (!scoutGridResizeObserver && elScoutGrid && typeof ResizeObserver === "function") {
    scoutGridResizeObserver = new ResizeObserver(() => applyScoutColumnLayout());
    scoutGridResizeObserver.observe(elScoutGrid);
  }
  if (elScoutGrid && elScoutGrid.dataset.windowResizeBound !== "true") {
    elScoutGrid.dataset.windowResizeBound = "true";
    window.addEventListener("resize", () => applyScoutColumnLayout());
  }
}
function getAttackMetaForPlayer(scope, playerIdx) {
  const scopedKey = scope + ":" + playerIdx;
  if (attackMetaByPlayer[scopedKey]) return attackMetaByPlayer[scopedKey];
  const fallbackKey = makePlayerKey(scope, playerIdx);
  const direct = attackMetaByPlayer[fallbackKey];
  if (direct && direct.playerIdx === playerIdx && direct.scope === scope) return direct;
  const keys = Object.keys(attackMetaByPlayer);
  for (let i = 0; i < keys.length; i += 1) {
    const meta = attackMetaByPlayer[keys[i]];
    if (meta && meta.playerIdx === playerIdx && meta.scope === scope) return meta;
  }
  return null;
}
function getActiveAttackKeyForScope(scope) {
  if (attackInlinePlayer && isPlayerKeyInScope(attackInlinePlayer, scope)) {
    return attackInlinePlayer;
  }
  const keys = Object.keys(attackMetaByPlayer);
  for (let i = 0; i < keys.length; i += 1) {
    const meta = attackMetaByPlayer[keys[i]];
    if (!meta || meta.scope !== scope) continue;
    if (typeof meta.playerIdx !== "number") continue;
    return keys[i];
  }
  return null;
}
const ERROR_TYPES = [
  { id: "Double", label: "Doppia" },
  { id: "Carry", label: "Accompagnata" },
  { id: "Position", label: "Posizione" },
  { id: "Invasion", label: "Invasione" },
  { id: "Invasion_Back", label: "Invasione di seconda linea" },
  { id: "Reconstruction", label: "Ricostruzione" },
  { id: "Generic", label: "Generico" },
  { id: "Red_Card", label: "Cartellino Rosso" }
];
let selectedErrorType = "Generic";
let errorModalPrefillPlayer = null;
let errorPickModeState = null;
let pointPickModeState = null;
const elAttackTrajectoryModal = document.getElementById("attack-trajectory-modal");
const elAttackTrajectoryCanvas = document.getElementById("attack-trajectory-canvas");
const elAttackTrajectoryImage = document.getElementById("attack-trajectory-image");
const elAttackTrajectoryInstructions = document.getElementById("attack-trajectory-instructions");
const elAttackTrajectoryNetpoints = document.getElementById("attack-trajectory-netpoints");
const elAttackTrajectoryClose = document.getElementById("attack-trajectory-close");
const elAttackTrajectoryCloseBtn = document.getElementById("attack-trajectory-close-btn");
const elLineupModal = document.getElementById("lineup-modal");
const elLineupModalCourt = document.getElementById("lineup-modal-court");
const elLineupModalBench = document.getElementById("lineup-modal-bench");
const elLineupModalClose = document.getElementById("lineup-modal-close");
const elLineupModalCancel = document.getElementById("lineup-modal-cancel");
const elLineupModalSaveOverride = document.getElementById("lineup-modal-save-override");
const elLineupModalSaveSubstitution = document.getElementById("lineup-modal-save-substitution");
const elLineupModalTitle = document.getElementById("lineup-modal-title");
const elLineupModalApplyDefault = document.getElementById("lineup-modal-apply-default");
const elLineupModalToggleNumbers = document.getElementById("lineup-modal-toggle-numbers");
const elLineupPreferredLibero = document.getElementById("lineup-preferred-libero");
const elLogServeTrajectory = document.getElementById("log-serve-trajectory");
const elLogServeCardOur = document.getElementById("log-serve-card-our");
const elLogServeCardOpp = document.getElementById("log-serve-card-opp");
const elServeTrajectoryLogToggleInline = document.getElementById("serve-trajectory-log-toggle-inline");
const elServeTrajectoryLogToggleInlineOpp = document.getElementById("serve-trajectory-log-toggle-inline-opp");
const elFloatingServeErrorBtn = document.getElementById("floating-serve-error-btn");
const elLiveSetScore = document.getElementById("live-set-score");
const elAggSetScore = document.getElementById("agg-set-score");
const elNextSetInline = document.getElementById("next-set-inline");
const elNextSetClose = document.getElementById("next-set-close");
const elNextSetLineups = document.getElementById("next-set-lineups");
const elNextSetBlockOur = document.getElementById("next-set-block-our");
const elNextSetBlockOpp = document.getElementById("next-set-block-opp");
const elNextSetTeamOur = document.getElementById("next-set-team-our");
const elNextSetTeamOpp = document.getElementById("next-set-team-opp");
const elNextSetCourtOur = document.getElementById("next-set-court-our");
const elNextSetCourtOpp = document.getElementById("next-set-court-opp");
const elNextSetBenchOur = document.getElementById("next-set-bench-our");
const elNextSetBenchOpp = document.getElementById("next-set-bench-opp");
const elNextSetDefaultOur = document.getElementById("next-set-default-our");
const elNextSetDefaultOpp = document.getElementById("next-set-default-opp");
const elNextSetRotateCwOur = document.getElementById("next-set-rotate-cw-our");
const elNextSetRotateCcwOur = document.getElementById("next-set-rotate-ccw-our");
const elNextSetRotateCwOpp = document.getElementById("next-set-rotate-cw-opp");
const elNextSetRotateCcwOpp = document.getElementById("next-set-rotate-ccw-opp");
const elNextSetRotationSelectOur = document.getElementById("next-set-rotation-select-our");
const elNextSetRotationSelectOpp = document.getElementById("next-set-rotation-select-opp");
const elNextSetPreferredLiberoOur = document.getElementById("next-set-preferred-libero-our");
const elNextSetPreferredLiberoOpp = document.getElementById("next-set-preferred-libero-opp");
const elNextSetSwapRow = document.getElementById("next-set-swap-row");
const elNextSetSides = document.getElementById("next-set-sides");
const elNextSetSideOur = document.getElementById("next-set-side-our");
const elNextSetSideOpp = document.getElementById("next-set-side-opp");
const elNextSetSideOurLabel = document.getElementById("next-set-side-our-label");
const elNextSetSideOppLabel = document.getElementById("next-set-side-opp-label");
const elNextSetSwapCourt = document.getElementById("next-set-swap-court");
const elNextSetServeOur = document.getElementById("next-set-serve-our");
const elNextSetServeOpp = document.getElementById("next-set-serve-opp");
const elNextSetServeOurLabel = document.getElementById("next-set-serve-our-label");
const elNextSetServeOppLabel = document.getElementById("next-set-serve-opp-label");
const elNextSetStart = document.getElementById("next-set-start");
const elNextSetCancel = document.getElementById("next-set-cancel");
const elUseOpponentTeamToggle = document.getElementById("use-opponent-team-toggle");
const elOpponentTeamSettings = document.getElementById("opponent-team-settings");
const elOpponentSkillServe = document.getElementById("opponent-skill-serve");
const elOpponentSkillPass = document.getElementById("opponent-skill-pass");
const elOpponentSkillFreeball = document.getElementById("opponent-skill-freeball");
const elOpponentSkillSecond = document.getElementById("opponent-skill-second");
const elOpponentSkillAttack = document.getElementById("opponent-skill-attack");
const elOpponentSkillDefense = document.getElementById("opponent-skill-defense");
const elOpponentSkillBlock = document.getElementById("opponent-skill-block");
const elAnalysisFilterTeams = document.getElementById("analysis-filter-teams");
const elAnalysisFilterSets = document.getElementById("analysis-filter-sets");
const elAnalysisFilterMatches = document.getElementById("analysis-filter-matches");
const elAnalysisScoreSummary = document.getElementById("analysis-score-summary");
const elSetTrendGrid = document.getElementById("set-trend-grid");
const elSetTrendDetail = document.getElementById("set-trend-detail");
const elAnalysisPlayByPlaySet = document.getElementById("analysis-play-by-play-set");
const elAnalysisPlayByPlay = document.getElementById("analysis-play-by-play");
const elAnalysisPlayByPlaySummary = document.getElementById("analysis-play-by-play-summary");
const elBtnOpenMultiscout = document.getElementById("btn-open-multiscout");
const elMultiscoutModal = document.getElementById("multiscout-modal");
const elMultiscoutList = document.getElementById("multiscout-list");
const elMultiscoutSubtitle = document.getElementById("multiscout-subtitle");
const elMultiscoutClose = document.getElementById("multiscout-close");
const elMultiscoutCancel = document.getElementById("multiscout-cancel");
const elMultiscoutTeamSelect = document.getElementById("multiscout-team-select");
const elMultiscoutReset = document.getElementById("multiscout-reset");
const elAggSummaryExtraBody = document.getElementById("agg-summary-extra-body");
const elVideoFilterTeams = document.getElementById("video-filter-teams");
const elVideoFilterPresetName = document.getElementById("video-filter-preset-name");
const elVideoFilterPresetSave = document.getElementById("video-filter-preset-save");
const elVideoFilterPresetsList = document.getElementById("video-filter-presets-list");
const elBtnFixVideoScore = document.getElementById("btn-fix-video-score");
const elBtnVideoAddEvent = document.getElementById("btn-video-add-event");
const elVideoAnalysisResizeHandle = document.getElementById("video-analysis-resize-handle");
const elVideoScoutResizeHandle = document.getElementById("video-scout-resize-handle");
const elScoutGrid = document.querySelector(".scout-grid");
const elScoutResizeRight = document.getElementById("scout-resize-right");
const elVideoScoreModal = document.getElementById("video-score-modal");
const elVideoScoreClose = document.getElementById("video-score-close");
const elVideoScoreCancel = document.getElementById("video-score-cancel");
const elVideoScoreApply = document.getElementById("video-score-apply");
const elVideoScoreHome = document.getElementById("video-score-home");
const elVideoScoreAway = document.getElementById("video-score-away");
const elVideoScoreBackdrop = document.querySelector("#video-score-modal .skill-modal__backdrop");
const elVideoOverlay = document.getElementById("video-analysis-overlay");
const elVideoOverlaySet = document.getElementById("video-overlay-set");
const elVideoOverlayPlayer = document.getElementById("video-overlay-player");
const elVideoOverlaySkill = document.getElementById("video-overlay-skill");
const elVideoOverlayRotation = document.getElementById("video-overlay-rotation");
const elPlayersDbModal = document.getElementById("players-db-modal");
const elPlayersDbBody = document.getElementById("players-db-body");
const elPlayersDbCount = document.getElementById("players-db-count");
const elPlayersDbClose = document.getElementById("players-db-close");
const elPlayersDbClean = document.getElementById("btn-clean-players-db");
const elPlayersDbMergePrimary = document.getElementById("players-db-merge-primary");
const elPlayersDbMergeSecondary = document.getElementById("players-db-merge-secondary");
const elBtnMergePlayers = document.getElementById("btn-merge-players");
const elPlayerAnalysisHero = document.getElementById("player-analysis-hero");
const elDebugModal = document.getElementById("debug-modal");
const elDebugModalClose = document.getElementById("debug-modal-close");
const elBtnOpenDebugModal = document.getElementById("btn-open-debug-modal");
const elBtnForceSyncLog = document.getElementById("btn-force-sync-log");
const elBtnBackfillPlayerIds = document.getElementById("btn-backfill-player-ids");
const elBtnToggleTopbar = document.getElementById("btn-toggle-topbar");
const elTeamsManagerModal = document.getElementById("teams-manager-modal");
const elTeamsManagerList = document.getElementById("teams-manager-list");
const elTeamsManagerClose = document.getElementById("teams-manager-close");
const elTeamsManagerOpenTeam = document.getElementById("teams-manager-open-team");
const elTeamsManagerDelete = document.getElementById("teams-manager-delete");
const elTeamsManagerDuplicate = document.getElementById("teams-manager-duplicate");
const elTeamsManagerExport = document.getElementById("teams-manager-export");
const elTeamsManagerImport = document.getElementById("teams-manager-import");
const elTeamsManagerFileInput = document.getElementById("teams-manager-file-input");
const elTeamsManagerOpenPlayersDb = document.getElementById("teams-manager-open-players-db");
const elSetStartModal = document.getElementById("set-start-modal");
const elSetStartModalTitle = document.getElementById("set-start-modal-title");
const elSetStartModalBody = document.getElementById("set-start-modal-body");
const elSetStartModalClose = document.getElementById("set-start-modal-close");
const elSetStartModalCancel = document.getElementById("set-start-modal-cancel");
const elSetStartModalSave = document.getElementById("set-start-modal-save");
let teamsManagerSelectedName = "";
const courtModalElements = [];
let courtOverlayEl = null;
courtModalElements.push(elSkillModal, elLineupModal, elErrorModal, elPointModal, elAttackTrajectoryModal);
const elServeTypeButtons = document.getElementById("serve-type-buttons");
const SERVE_START_IMG_NEAR = "images/trajectory/service_start_near.png";
const SERVE_START_IMG_FAR = "images/trajectory/service_start_far.png";
const SERVE_END_IMG_NEAR = "images/trajectory/service_end_near.png";
const SERVE_END_IMG_FAR = "images/trajectory/service_end_far.png";
const NORMAL_EVAL_CODES = new Set(["#", "+", "!", "-", "=", "/"]);
const TRAJECTORY_IMG_NEAR = "images/trajectory/attack_empty_near.png";
const TRAJECTORY_IMG_FAR = "images/trajectory/attack_empty_far.png";
const TRAJECTORY_NET_POINTS = [
  // Calcolati dai pixel delle immagini (intersezioni linee bianche su 1080px)
  { id: "5", label: "5", x: 120 / 1080 },
  { id: "7-9", label: "7-9", x: 330 / 1080 },
  { id: "3", label: "3", x: 540 / 1080 },
  { id: "4", label: "4", x: 749.5 / 1080 },
  { id: "6-F", label: "6-F", x: 959 / 1080 }
];
let trajectoryBaseZone = null;
function getTrajectoryImageForZone(zone, isFarSide) {
  if (!zone) return isFarSide ? TRAJECTORY_IMG_FAR : TRAJECTORY_IMG_NEAR;
  if (!isFarSide) {
    if (zone === 4 || zone === 3 || zone === 2) {
      return `images/trajectory/attack_${zone}_near.png`;
    }
    return TRAJECTORY_IMG_NEAR;
  }
  if (zone === 4 || zone === 5) return "images/trajectory/attack_4_far.png";
  if (zone === 3 || zone === 6) return "images/trajectory/attack_3_far.png";
  if (zone === 2 || zone === 1) return "images/trajectory/attack_2_far.png";
  return TRAJECTORY_IMG_FAR;
}
function resolveExportAssetPath(path) {
  if (!path) return path;
  if (typeof window === "undefined") return path;
  const map = window.__analysisAssetMap;
  return map && map[path] ? map[path] : path;
}
let trajectoryStart = null;
let trajectoryEnd = null;
let trajectoryResolver = null;
let trajectoryDragging = false;
let trajectoryNetPointId = null;
let trajectorySetType = null;
let trajectoryMode = "attack";
let attackTrajectoryForcePopup = false;
let trajectoryMirror = false;
let trajectoryForceFar = false;
let trajectoryEscapeHandler = null;
const attackTrajectoryCourtSizingEls = {
  content: null,
  body: null,
  stage: null
};
function setAttackTrajectoryCourtSizing(isCourt) {
  if (!attackTrajectoryCourtSizingEls.content) {
    attackTrajectoryCourtSizingEls.content = elAttackTrajectoryModal?.querySelector(".attack-trajectory-content") || null;
    attackTrajectoryCourtSizingEls.body = elAttackTrajectoryModal?.querySelector(".attack-trajectory-body") || null;
    attackTrajectoryCourtSizingEls.stage = elAttackTrajectoryModal?.querySelector(".attack-trajectory-stage") || null;
  }
  const { content, body, stage } = attackTrajectoryCourtSizingEls;
  if (isCourt) {
    if (content) {
      content.style.width = "100%";
      content.style.height = "100%";
      content.style.maxHeight = "100%";
      content.style.minHeight = "0";
      content.style.display = "grid";
      content.style.gridTemplateRows = "1fr auto";
      content.style.overflow = "hidden";
    }
    if (body) {
      body.style.flex = "1 1 auto";
      body.style.height = "100%";
      body.style.minHeight = "0";
    }
    if (stage) {
      stage.style.flex = "1 1 auto";
      stage.style.height = "100%";
      stage.style.minHeight = "0";
      stage.style.maxHeight = "100%";
    }
  } else {
    if (content) {
      content.style.width = "";
      content.style.height = "";
      content.style.maxHeight = "";
      content.style.minHeight = "";
      content.style.display = "";
      content.style.gridTemplateRows = "";
      content.style.overflow = "";
    }
    if (body) {
      body.style.flex = "";
      body.style.height = "";
      body.style.minHeight = "";
    }
    if (stage) {
      stage.style.flex = "";
      stage.style.height = "";
      stage.style.minHeight = "";
      stage.style.maxHeight = "";
    }
  }
}
let serveTrajectoryType = "JF";
let serveTypeKeyHandler = null;
let lineupModalCourt = [];
let lineupDragName = "";
let lineupSelectedName = "";
let lineupTouchActive = false;
let lineupTouchName = "";
let lineupTouchFromIdx = null;
let lineupTouchOverIdx = null;
let lineupTouchContext = "";
let lineupTouchScope = "our";
let lineupTouchStart = { x: 0, y: 0 };
let lineupTouchListenersAttached = false;
let lineupTouchGhost = null;
let lineupNumberMode = false;
let lineupModalScope = "our";
let lineupDragFromIdx = null;
let lineupModalDefaultRotation = null;
let lineupModalContext = "match";
let setStartEditSetNum = null;
let setStartModalSetNum = null;
let setStartModalScope = "our";
let setStartDraft = null;
let suppressClickUntil = 0;
let nextSetDraft = null;
let nextSetModalOpen = false;
let nextSetDragName = "";
let nextSetDragFromIdx = null;
let nextSetDragScope = null;
let serveTypeInlineHandler = null;
let serveTypeInlinePlayer = null;
let serveTypeFocusPlayer = null;
let attackInlinePlayer = null;
let queuedSetTypeChoice = null;
let activeSkillModalContext = null;
let currentEditControl = null;
let currentEditCell = null;
let lockedCourtAreaHeight = null;
let lastMobileScrollY = null;
let mobileBodyLock = null;
let globalModalScrim = null;
let pendingMobileActiveScroll = false;
function isDesktopCourtModalLayout() {
  if (state.forceMobileLayout) return false;
  if (document.body && document.body.classList.contains("force-mobile")) return false;
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return false;
  return true;
}
function updateCourtModalPlacement() {
  const playersArea = document.querySelector("#court-area") || document.querySelector(".players-area");
  const useCourt = isDesktopCourtModalLayout();
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.toggle("desktop-court-modal", useCourt);
  }
  if (!playersArea) return;
  if (useCourt) {
    if (!courtOverlayEl) {
      courtOverlayEl = document.createElement("div");
      courtOverlayEl.id = "court-overlay";
      playersArea.appendChild(courtOverlayEl);
    } else if (courtOverlayEl.parentElement !== playersArea) {
      playersArea.appendChild(courtOverlayEl);
    }
  }
  courtModalElements.forEach(modal => {
    if (!modal) return;
    if (!modal.__originalParent) {
      modal.__originalParent = modal.parentElement || document.body;
    }
    if (modal.classList.contains("force-popup")) {
      if (modal.__originalParent && modal.parentElement !== modal.__originalParent) {
        modal.__originalParent.appendChild(modal);
      }
      modal.classList.remove("court-modal");
      modal.style.position = "";
      modal.style.inset = "";
      modal.style.width = "";
      modal.style.height = "";
      modal.style.padding = "";
      modal.style.overflow = "";
      return;
    }
    if (useCourt) {
      if (courtOverlayEl && modal.parentElement !== courtOverlayEl) {
        courtOverlayEl.appendChild(modal);
      }
      modal.classList.add("court-modal");
      modal.style.position = "absolute";
      modal.style.inset = "0";
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.padding = "0";
      modal.style.overflow = "hidden";
    } else {
      if (modal.__originalParent && modal.parentElement !== modal.__originalParent) {
        modal.__originalParent.appendChild(modal);
      }
      modal.classList.remove("court-modal");
      modal.style.position = "";
      modal.style.inset = "";
      modal.style.width = "";
      modal.style.height = "";
      modal.style.padding = "";
      modal.style.overflow = "";
    }
  });
}
function restoreModalToPopup(modal) {
  if (!modal) return;
  if (!modal.__originalParent) {
    modal.__originalParent = modal.parentElement || document.body;
  }
  if (modal.__originalParent && modal.parentElement !== modal.__originalParent) {
    modal.__originalParent.appendChild(modal);
  }
  modal.classList.remove("court-modal");
  modal.style.position = "";
  modal.style.inset = "";
  modal.style.width = "";
  modal.style.height = "";
  modal.style.padding = "";
  modal.style.overflow = "";
}
function ensureGlobalModalScrim() {
  if (globalModalScrim || typeof document === "undefined" || !document.body) return;
  globalModalScrim = document.createElement("div");
  globalModalScrim.id = "global-modal-scrim";
  globalModalScrim.setAttribute("aria-hidden", "true");
  document.body.appendChild(globalModalScrim);
}
function setCourtAreaLocked(isLocked) {
  const courtArea = document.querySelector("#court-area") || document.querySelector(".players-area");
  if (!courtArea) return;
  if (isLocked) {
    if (lockedCourtAreaHeight === null) {
      const playerEl = courtArea.querySelector("#players-container");
      const actionsEls = Array.from(courtArea.querySelectorAll(".court-actions-bar"));
      const gapValue = window.getComputedStyle(courtArea).gap || "0px";
      const gap = parseFloat(gapValue) || 0;
      const getOuterHeight = el => {
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        const marginTop = parseFloat(styles.marginTop) || 0;
        const marginBottom = parseFloat(styles.marginBottom) || 0;
        return rect.height + marginTop + marginBottom;
      };
      if (playerEl && actionsEls.length) {
        const actionsHeight = actionsEls.reduce((sum, el) => sum + getOuterHeight(el), 0);
        const itemsCount = (playerEl ? 1 : 0) + actionsEls.length;
        const gapCount = Math.max(0, itemsCount - 1);
        lockedCourtAreaHeight = Math.ceil(getOuterHeight(playerEl) + actionsHeight + gap * gapCount);
      } else {
        lockedCourtAreaHeight = courtArea.offsetHeight || null;
      }
    }
    if (lockedCourtAreaHeight) {
      courtArea.style.height = `${lockedCourtAreaHeight}px`;
      courtArea.style.minHeight = `${lockedCourtAreaHeight}px`;
      courtArea.style.maxHeight = `${lockedCourtAreaHeight}px`;
    }
  } else {
    courtArea.style.height = "";
    courtArea.style.minHeight = "";
    courtArea.style.maxHeight = "";
    lockedCourtAreaHeight = null;
  }
}
function setModalOpenState(isOpen, forcePopup = false) {
  const useCourt = isDesktopCourtModalLayout() && !forcePopup;
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.toggle("modal-open", isOpen);
    document.body.classList.toggle("desktop-court-modal-open", isOpen && useCourt);
  }
  setCourtAreaLocked(isOpen && useCourt);
  const isMobileModal = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  if (isOpen) {
    ensureGlobalModalScrim();
    if (isMobileModal) {
      lastMobileScrollY = window.scrollY || 0;
      if (!mobileBodyLock) {
        mobileBodyLock = {
          position: document.body.style.position,
          top: document.body.style.top,
          left: document.body.style.left,
          right: document.body.style.right,
          width: document.body.style.width
        };
        document.body.style.position = "fixed";
        document.body.style.top = `-${lastMobileScrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
      }
    }
    if (!isMobileModal) {
      document.body.style.overflow = "hidden";
    }
  } else {
    if (!isMobileModal) {
      document.body.style.overflow = "";
    }
    if (isMobileModal) {
      if (mobileBodyLock) {
        document.body.style.position = mobileBodyLock.position;
        document.body.style.top = mobileBodyLock.top;
        document.body.style.left = mobileBodyLock.left;
        document.body.style.right = mobileBodyLock.right;
        document.body.style.width = mobileBodyLock.width;
        mobileBodyLock = null;
      }
      if (lastMobileScrollY !== null) {
        window.scrollTo({ top: lastMobileScrollY, behavior: "auto" });
      }
      pendingMobileActiveScroll = true;
      maybeScrollToActiveCourtOnMobile();
      lastMobileScrollY = null;
    }
  }
}
function setGlobalModalState(isOpen, options = {}) {
  const forcePopup = typeof options === "boolean" ? options : !!options.forcePopup;
  setModalOpenState(isOpen, forcePopup);
}
if (typeof window !== "undefined") {
}
function getActiveCourtContainerForScroll() {
  const activeScope = getMobileActiveScope() || "our";
  return activeScope === "opponent"
    ? document.getElementById("opponent-players-container")
    : document.getElementById("players-container");
}
function isElementInViewport(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 0 && rect.top < viewHeight;
}
function isElementVisible(el) {
  if (!el) return false;
  if (el.classList && el.classList.contains("hidden")) return false;
  return !!(el.offsetParent || el.getClientRects().length);
}
function maybeScrollToActiveCourtOnMobile() {
  if (!pendingMobileActiveScroll) return;
  pendingMobileActiveScroll = false;
  const isCompactMobile = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  if (!isCompactMobile) return;
  const target = getActiveCourtContainerForScroll();
  if (!target || !isElementVisible(target)) {
    pendingMobileActiveScroll = true;
    return;
  }
  if (isElementInViewport(target)) {
    pendingMobileActiveScroll = false;
    return;
  }
  pendingMobileActiveScroll = false;
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}
function scrollToActiveCourtOnMobileAlways(tries = 3) {
  const isCompactMobile = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  if (!isCompactMobile) return;
  const target = getActiveCourtContainerForScroll();
  if (!target) return;
  if (!isElementVisible(target)) {
    if (tries > 0) {
      setTimeout(() => {
        scrollToActiveCourtOnMobileAlways(tries - 1);
      }, 60);
    }
    return;
  }
  requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
