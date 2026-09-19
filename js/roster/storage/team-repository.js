function getTeamStorageKey(name) {
  return TEAM_PREFIX + name;
}
function listTeamsFromStorage() {
  const names = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(TEAM_PREFIX)) {
        names.push(key.slice(TEAM_PREFIX.length));
      }
    }
  } catch (e) {
    logError("Error listing teams", e);
  }
  return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
function loadPlayersDbFromStorage() {
  try {
    const raw = localStorage.getItem(PLAYER_PREFIX);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    logError("Error loading players db", e);
    return {};
  }
}
function savePlayersDbToStorage(db) {
  try {
    localStorage.setItem(PLAYER_PREFIX, JSON.stringify(db || {}));
    return true;
  } catch (e) {
    logError("Error saving players db", e);
    return false;
  }
}
function buildPlayersDbEntry(player, existing = {}) {
  const firstName = player.firstName || existing.firstName || "";
  const lastName = player.lastName || existing.lastName || "";
  const name = buildFullName(lastName, firstName) || player.name || existing.name || "";
  return {
    id: player.id,
    firstName,
    lastName,
    name,
    photo: typeof player.photo === "string" ? player.photo : existing.photo || ""
  };
}
function isTemplatePlayerName(name) {
  if (!name || typeof TEMPLATE_TEAM === "undefined" || !TEMPLATE_TEAM.players) return false;
  const clean = String(name).trim().toLowerCase();
  return TEMPLATE_TEAM.players.some(templateName => templateName.toLowerCase() === clean);
}
function findPlayersDbMatchByName(firstName, lastName, currentId = "") {
  const cleanFirst = (firstName || "").trim().toLowerCase();
  const cleanLast = (lastName || "").trim().toLowerCase();
  if (!cleanFirst || !cleanLast) return null;
  const db = state.playersDb || {};
  const entries = Object.values(db);
  for (const entry of entries) {
    if (!entry || !entry.id || entry.id === currentId) continue;
    if (entry.name && isTemplatePlayerName(entry.name)) continue;
    const entryFirst = (entry.firstName || "").trim().toLowerCase();
    const entryLast = (entry.lastName || "").trim().toLowerCase();
    if (entryFirst === cleanFirst && entryLast === cleanLast) {
      return entry;
    }
  }
  return null;
}
function findPlayersDbMatchByFullName(name, currentId = "") {
  const cleanName = (name || "").trim().toLowerCase();
  if (!cleanName) return null;
  const db = state.playersDb || {};
  const entries = Object.values(db);
  for (const entry of entries) {
    if (!entry || !entry.id || entry.id === currentId) continue;
    if (entry.name && isTemplatePlayerName(entry.name)) continue;
    const entryName = (entry.name || buildFullName(entry.lastName, entry.firstName) || "")
      .trim()
      .toLowerCase();
    if (entryName === cleanName) {
      return entry;
    }
  }
  return null;
}
function rebuildPlayersDbFromTeams(teamsMap = {}) {
  const db = {};
  Object.values(teamsMap || {}).forEach(team => {
    const normalized = normalizeTeamPayload(team);
    if (!normalized || !Array.isArray(normalized.playersDetailed)) return;
    normalized.playersDetailed.forEach(player => {
      if (!player.id) return;
      if (isTemplatePlayerName(player.name)) return;
      db[player.id] = buildPlayersDbEntry(player, db[player.id] || {});
    });
  });
  return db;
}
function syncPlayersDbFromTeam(team) {
  const normalized = normalizeTeamPayload(team);
  if (!normalized || !Array.isArray(normalized.playersDetailed)) return;
  const db = Object.assign({}, state.playersDb || {}, loadPlayersDbFromStorage());
  normalized.playersDetailed.forEach(player => {
    if (!player.id) return;
    if (isTemplatePlayerName(player.name)) return;
    db[player.id] = buildPlayersDbEntry(player, db[player.id] || {});
  });
  state.playersDb = db;
  savePlayersDbToStorage(db);
}
function loadTeamFromStorage(name) {
  if (!name) return null;
  try {
    const raw = localStorage.getItem(getTeamStorageKey(name));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    logError("Error loading team " + name, e);
    return null;
  }
}
function generatePlayerId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (e) {
    /* noop */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, chr => {
    const rand = Math.floor(Math.random() * 16);
    const value = chr === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
function buildTemplatePlayersDetailed() {
  return (TEMPLATE_TEAM && Array.isArray(TEMPLATE_TEAM.players) ? TEMPLATE_TEAM.players : []).map((name, idx) => {
    return {
      id: typeof generatePlayerId === "function" ? generatePlayerId() : idx + "_" + name,
      name,
      firstName: "",
      lastName: name,
      number: String(idx + 1),
      role: TEMPLATE_TEAM.liberos.includes(name) ? "L" : "",
      isCaptain: idx === 0,
      out: false
    };
  });
}
function isValidPlayerId(id) {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
function normalizeTeamPayload(raw, fallbackName = "") {
  if (!raw) return null;
  const name = raw.name || fallbackName || "";
  const staff = raw.staff || Object.assign({}, DEFAULT_STAFF);
  const officialCode = typeof raw.officialCode === "string" ? raw.officialCode.trim() : "";
  const officialId = typeof raw.officialId === "string" ? raw.officialId.trim() : "";
  const makeId = () => generatePlayerId();
  const rawDefaultLineup = Array.isArray(raw.defaultLineup) ? normalizePlayers(raw.defaultLineup) : [];
  const rawDefaultRotation = parseInt(raw.defaultRotation, 10);
  const defaultRotation =
    Number.isFinite(rawDefaultRotation) && rawDefaultRotation >= 1 && rawDefaultRotation <= 6
      ? rawDefaultRotation
      : 1;
  const rawPreferredLibero = typeof raw.preferredLibero === "string" ? raw.preferredLibero : "";
  if (raw.version === 3 && Array.isArray(raw.playersDetailed)) {
    const seenNames = new Set();
    const seenIds = new Set();
    const rawLiberoKeys = new Set(
      normalizePlayers(Array.isArray(raw.liberos) ? raw.liberos : []).map(name => name.toLowerCase())
    );
    const playersDetailed = enforceSingleCaptainFlag(
      raw.playersDetailed.map(p => {
        p = p && typeof p === "object" ? p : {};
        const firstName = String(p.firstName || "").trim().replace(/\s+/g, " ");
        const lastName = String(p.lastName || "").trim().replace(/\s+/g, " ");
        const cleanName = buildFullName(lastName, firstName);
        const candidateId = p.playerId || p.id || "";
        const playerId = isValidPlayerId(candidateId) ? candidateId : makeId();
        return {
          id: playerId,
          name: cleanName,
          firstName,
          lastName,
          codeOfficial: typeof p.codeOfficial === "string" ? p.codeOfficial.trim() : "",
          photo: typeof p.photo === "string" ? p.photo : "",
          number: p.number || "",
          role: p.role === "L" || rawLiberoKeys.has(cleanName.toLowerCase()) ? "L" : "",
          isCaptain: !!p.isCaptain,
          out: !!p.out
        };
      }).filter(player => {
        const nameKey = player.name.toLowerCase();
        if (!nameKey || seenNames.has(nameKey)) return false;
        while (seenIds.has(player.id)) player.id = makeId();
        seenNames.add(nameKey);
        seenIds.add(player.id);
        return true;
      }),
      (Array.isArray(raw.captains) && raw.captains[0]) || ""
    );
    const numbers = {};
    const detailedNamesByKey = new Map(playersDetailed.map(player => [player.name.toLowerCase(), player.name]));
    Object.entries(raw.numbers || {}).forEach(([player, number]) => {
      const canonical = detailedNamesByKey.get(String(player || "").trim().toLowerCase());
      if (canonical) numbers[canonical] = number;
    });
    playersDetailed.forEach(player => {
      if (player.name && player.number !== undefined && player.number !== null && player.number !== "") {
        numbers[player.name] = String(player.number);
      }
    });
    const canonicalNames = new Map(playersDetailed.map(player => [player.name.toLowerCase(), player.name]));
    const canonicalizeNames = values =>
      normalizePlayers(values || [])
        .map(value => canonicalNames.get(value.toLowerCase()) || "")
        .filter(Boolean);
    const liberos = canonicalizeNames(
      Array.isArray(raw.liberos)
        ? raw.liberos
        : playersDetailed.filter(p => p.role === "L" && !p.out).map(p => p.name)
    );
    const captains = playersDetailed.filter(p => p.isCaptain && !p.out).map(p => p.name).slice(0, 1);
    const activeNames = new Set(playersDetailed.filter(player => !player.out).map(player => player.name));
    const defaultLineup = canonicalizeNames(rawDefaultLineup).filter(name => activeNames.has(name));
    const preferredCanonical = canonicalNames.get(rawPreferredLibero.toLowerCase()) || "";
    const preferredLibero = liberos.includes(preferredCanonical) ? preferredCanonical : liberos[0] || "";
    return {
      version: 3,
      name,
      staff,
      officialCode,
      officialId,
      playersDetailed,
      liberos,
      numbers,
      players: raw.players || playersDetailed.map(p => p.name),
      captains,
      defaultLineup,
      defaultRotation,
      preferredLibero
    };
  }
  return null;
}
function loadTeamNormalized(name) {
  const raw = loadTeamFromStorage(name);
  return normalizeTeamPayload(raw, name);
}
function compactTeamPayload(data, fallbackName = "") {
  const normalized = normalizeTeamPayload(data, fallbackName);
  if (!normalized) return null;
  const playersDetailed =
    normalized.playersDetailed && normalized.playersDetailed.length > 0
      ? normalized.playersDetailed.map(p => {
          return {
            id: p.id || generatePlayerId(),
            firstName: String(p.firstName || "").trim(),
            lastName: String(p.lastName || "").trim(),
            codeOfficial: p.codeOfficial || "",
            photo: typeof p.photo === "string" ? p.photo : "",
            number: p.number || "",
            role: p.role === "L" ? "L" : "",
            isCaptain: !!p.isCaptain,
            out: !!p.out
          };
        })
      : [];
  return {
    version: 3,
    name: normalized.name || fallbackName,
    staff: normalized.staff || Object.assign({}, DEFAULT_STAFF),
    officialCode: normalized.officialCode || "",
    officialId: normalized.officialId || "",
    playersDetailed,
    defaultLineup: Array.isArray(normalized.defaultLineup) ? normalized.defaultLineup.slice(0, 6) : [],
    defaultRotation: normalized.defaultRotation || 1,
    preferredLibero: normalized.preferredLibero || ""
  };
}
function saveTeamToStorage(name, data) {
  if (!name) return false;
  try {
    const compact = compactTeamPayload(data, name);
    if (!compact) return false;
    localStorage.setItem(getTeamStorageKey(name), JSON.stringify(compact));
    syncPlayersDbFromTeam(compact);
    return true;
  } catch (e) {
    logError("Error saving team " + name, e);
    return false;
  }
}
function deleteTeamFromStorage(name) {
  if (!name) return;
  try {
    localStorage.removeItem(getTeamStorageKey(name));
  } catch (e) {
    logError("Error deleting team " + name, e);
  }
}
function loadTeamsMapFromStorage() {
  const map = {};
  listTeamsFromStorage().forEach(name => {
    const data = loadTeamFromStorage(name);
    if (data) map[name] = data;
  });
  return map;
}
function migrateTeamsToPersistent() {
  if (!state.savedTeams || Object.keys(state.savedTeams).length === 0) return;
  Object.entries(state.savedTeams).forEach(([name, data]) => {
    if (!localStorage.getItem(getTeamStorageKey(name))) {
      saveTeamToStorage(name, data);
    }
  });
}
function syncTeamsFromStorage() {
  const teams = loadTeamsMapFromStorage();
  state.savedTeams = cloneIsolationData(teams);
  state.savedOpponentTeams = cloneIsolationData(teams);
}
function migrateOpponentTeamsIntoTeams() {
  const opponentNames = listOpponentTeamsFromStorage();
  opponentNames.forEach(name => {
    const data = loadOpponentTeamFromStorage(name);
    if (data && !localStorage.getItem(getTeamStorageKey(name))) {
      saveTeamToStorage(name, data);
    }
  });
}
function extractRosterFromTeam(team) {
  const normalized = normalizeTeamPayload(team);
  if (!normalized)
    return { players: [], liberos: [], numbers: {}, staff: DEFAULT_STAFF, playersDetailed: [], captains: [] };
  const captainCandidates = []
    .concat(Array.isArray(normalized.captains) ? normalized.captains : [])
    .concat(
      (normalized.playersDetailed || [])
        .filter(p => p.isCaptain && !p.out)
        .map(p => p.name)
    );
  const captains = normalizePlayers(captainCandidates).filter(name =>
    (normalized.playersDetailed || []).some(p => p.name === name && !p.out)
  ).slice(0, 1);
  const preferredLibero = normalized.preferredLibero || "";
  return {
    players: (normalized.playersDetailed || []).filter(p => !p.out).map(p => p.name),
    liberos:
      normalized.liberos && normalized.liberos.length > 0
        ? normalized.liberos
        : (normalized.playersDetailed || []).filter(p => p.role === "L" && !p.out).map(p => p.name),
    numbers: normalized.numbers || {},
    staff: normalized.staff || DEFAULT_STAFF,
    playersDetailed: normalized.playersDetailed || [],
    captains,
    defaultLineup: Array.isArray(normalized.defaultLineup) ? normalized.defaultLineup : [],
    defaultRotation: normalized.defaultRotation || 1,
    preferredLibero
  };
}
function getSelectedTeamDefaultSettings() {
  const name = state.selectedTeam || "";
  if (!name) return null;
  const team = loadTeamFromStorage(name);
  if (!team) return null;
  const roster = extractRosterFromTeam(team);
  const fallback =
    roster.playersDetailed && roster.playersDetailed.length > 0
      ? roster.playersDetailed.filter(p => !p.out).map(p => p.name)
      : roster.players || [];
  const defaultLineup =
    roster.defaultLineup && roster.defaultLineup.length > 0 ? roster.defaultLineup : fallback;
  const defaultRotation = roster.defaultRotation || 1;
  return { defaultLineup, defaultRotation };
}
function getSelectedOpponentTeamDefaultSettings() {
  const name = state.selectedOpponentTeam || "";
  if (!name) return null;
  const team = loadOpponentTeamFromStorage(name);
  if (!team) return null;
  const roster = extractRosterFromTeam(team);
  const fallback =
    roster.playersDetailed && roster.playersDetailed.length > 0
      ? roster.playersDetailed.filter(p => !p.out).map(p => p.name)
      : roster.players || [];
  const defaultLineup =
    roster.defaultLineup && roster.defaultLineup.length > 0 ? roster.defaultLineup : fallback;
  const defaultRotation = roster.defaultRotation || 1;
  return { defaultLineup, defaultRotation };
}
function getOpponentTeamStorageKey(name) {
  return OPPONENT_TEAM_PREFIX + name;
}
function listOpponentTeamsFromStorage() {
  // use the same pool as main teams
  return listTeamsFromStorage();
}
function loadOpponentTeamFromStorage(name) {
  return loadTeamFromStorage(name);
}
function saveOpponentTeamToStorage(name, data) {
  return saveTeamToStorage(name, data);
}
function deleteOpponentTeamFromStorage(name) {
  if (!name) return;
  try {
    localStorage.removeItem(getTeamStorageKey(name));
  } catch (e) {
    logError("Error deleting opponent team " + name, e);
  }
}
function loadOpponentTeamsMapFromStorage() {
  return loadTeamsMapFromStorage();
}
function migrateOpponentTeamsToPersistent() {
  // legacy: copy opponent-prefixed teams into main pool
  migrateOpponentTeamsIntoTeams();
  state.savedOpponentTeams = cloneIsolationData(state.savedTeams || {});
}
function syncOpponentTeamsFromStorage() {
  const teams = loadOpponentTeamsMapFromStorage();
  state.savedOpponentTeams = cloneIsolationData(teams);
  state.savedTeams = cloneIsolationData(teams);
}
