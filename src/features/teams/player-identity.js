import { session as scoutUiState } from '../state/scout-ui.js';
import { getSelectedTeamNameForScope, getPlayersForScope, getPlayerNumbersForScope, getTeamScopeFromEvent } from './selectors.js';
import { loadTeamFromStorage, loadOpponentTeamFromStorage, extractRosterFromTeam, findPlayersDbMatchByFullName } from './storage/team-repository.js';
export function invalidateRosterIdMapsCache(scope = "") {
  if (!scope) {
    scoutUiState.rosterIdMapsCache.our = { teamName: null, playersKey: null, map: null };
    scoutUiState.rosterIdMapsCache.opponent = { teamName: null, playersKey: null, map: null };
    return;
  }
  if (!scoutUiState.rosterIdMapsCache[scope]) return;
  scoutUiState.rosterIdMapsCache[scope] = { teamName: null, playersKey: null, map: null };
}

export function sanitizeOfficialString(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || "";
}

export function normalizePlayerKey(name) {
  return String(name || "").trim().toLowerCase();
}

export function getRosterIdMapsForScope(scope) {
  const teamName = getSelectedTeamNameForScope(scope);
  if (!teamName) return null;
  const players = getPlayersForScope(scope) || [];
  const playersKey = players.join("|");
  const cache = scoutUiState.rosterIdMapsCache[scope] || {};
  if (cache.teamName === teamName && cache.playersKey === playersKey && cache.map) {
    return cache.map;
  }
  ;
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
  scoutUiState.rosterIdMapsCache[scope] = { teamName, playersKey, map };
  return map;
}

export function getTeamOfficialMetaForScope(scope) {
  const maps = getRosterIdMapsForScope(scope);
  return {
    teamCodeOfficial: maps ? maps.teamOfficialCode || "" : "",
    teamIdOfficial: maps ? maps.teamOfficialId || "" : ""
  };
}

export function getPlayerOfficialCodeForScope(scope, playerIdx, playerName) {
  const maps = getRosterIdMapsForScope(scope);
  if (!maps || !maps.nameToPlayer) return "";
  const players = getPlayersForScope(scope);
  const name = playerName || (typeof playerIdx === "number" ? players[playerIdx] : "");
  if (!name) return "";
  const player = maps.nameToPlayer.get(normalizePlayerKey(name));
  return player ? sanitizeOfficialString(player.codeOfficial) : "";
}

export function getPlayerPhotoForScope(scope, playerName) {
  const maps = getRosterIdMapsForScope(scope);
  if (!maps || !maps.nameToPlayer || !playerName) return "";
  const player = maps.nameToPlayer.get(normalizePlayerKey(playerName));
  return player && typeof player.photo === "string" ? player.photo : "";
}

export function normalizeDataVolleyEventMeta(raw) {
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

export function ensureEventDataVolleyFields(ev) {
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

export function getPlayerIdForScope(scope, playerIdx, playerName) {
  const maps = getRosterIdMapsForScope(scope);
  const players = getPlayersForScope(scope);
  const name = playerName || (typeof playerIdx === "number" ? players[playerIdx] : "");
  if (maps && name) {
    const id = maps.nameToId.get(normalizePlayerKey(name));
    if (id) return id;
  }
  if (name) {
    const entry = findPlayersDbMatchByFullName(name);
    if (entry && entry.id) return entry.id;
  }
  return null;
}

export function getPlayerIndexForId(scope, playerId) {
  if (!playerId) return null;
  const maps = getRosterIdMapsForScope(scope);
  if (!maps || !maps.idToIndex) return null;
  const idx = maps.idToIndex.get(playerId);
  return typeof idx === "number" ? idx : null;
}
