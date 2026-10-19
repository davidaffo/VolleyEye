import { session as matchState } from '../../../js/globals.js';
import { session as rosterLineupState } from '../state/roster-lineup.js';
import { session as playerModelState } from '../state/teams-core-player-model.js';
import { loadTeamFromStorage, loadOpponentTeamFromStorage } from './storage/team-repository.js';
import { buildFullName, normalizePlayers } from '../../domain/player-names.js';
export function getStructuredPlayerNameParts(fullName = "", scope = "") {
  const wanted = String(fullName || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!wanted) return null;
  const candidates = [];
  if (rosterLineupState.teamManagerState && Array.isArray(rosterLineupState.teamManagerState.players)) {
    candidates.push(...rosterLineupState.teamManagerState.players);
  }
  const scopes = scope ? [scope] : ["our", "opponent"];
  scopes.forEach(targetScope => {
    const teamName = targetScope === "opponent"
      ? (matchState.state.selectedOpponentTeam || "").trim()
      : ((matchState.state.selectedTeam || (matchState.state.match && matchState.state.match.teamName)) || "").trim();
    if (!teamName) return;
    const loader = targetScope === "opponent" ? loadOpponentTeamFromStorage : loadTeamFromStorage;
    if (typeof loader !== "function") return;
    const payload = loader(teamName);
    if (payload && Array.isArray(payload.playersDetailed)) {
      candidates.push(...payload.playersDetailed);
    }
  });
  if (matchState.state.playersDb && typeof matchState.state.playersDb === "object") {
    candidates.push(...Object.values(matchState.state.playersDb));
  }
  const player = candidates.find(entry => {
    if (!entry || typeof entry !== "object") return false;
    const canonical = buildFullName(entry.lastName, entry.firstName) || String(entry.name || "").trim();
    return canonical.replace(/\s+/g, " ").toLowerCase() === wanted;
  });
  if (!player) return null;
  const lastName = String(player.lastName || "").trim();
  const firstName = String(player.firstName || "").trim();
  if (!lastName && !firstName) return null;
  return { lastName, firstName };
}

export function formatStructuredPlayerName(fullName = "", scope = "") {
  const raw = String(fullName || "").trim();
  if (!raw) return "";
  const parts = getStructuredPlayerNameParts(raw, scope);
  if (!parts) return raw;
  const initial = parts.firstName ? parts.firstName[0].toUpperCase() + "." : "";
  return [parts.lastName, initial].filter(Boolean).join(" ").trim() || raw;
}

export function getPlayerNumber(name) {
  if (!name || !matchState.state.playerNumbers) return "";
  return matchState.state.playerNumbers[name] || "";
}

export function getTeamPlayers(scope = "our") {
  return scope === "opponent" ? matchState.state.opponentPlayers || [] : matchState.state.players || [];
}

export function getTeamNumbers(scope = "our") {
  return scope === "opponent" ? matchState.state.opponentPlayerNumbers || {} : matchState.state.playerNumbers || {};
}

export function getTeamLiberos(scope = "our") {
  return scope === "opponent" ? matchState.state.opponentLiberos || [] : matchState.state.liberos || [];
}

export function getTeamCourt(scope = "our") {
  return scope === "opponent" ? matchState.state.opponentCourt || [] : matchState.state.court || [];
}

export function getTeamRotation(scope = "our") {
  return scope === "opponent" ? matchState.state.opponentRotation || 1 : matchState.state.rotation || 1;
}

export function setTeamAutoLiberoRole(scope = "our", role = "") {
  if (scope === "opponent") {
    matchState.state.opponentAutoLiberoRole = role || "";
  } else {
    matchState.state.autoLiberoRole = role || "";
  }
}

export function getTeamAutoLiberoBackline(scope = "our") {
  return scope === "opponent" ? !!matchState.state.opponentAutoLiberoBackline : !!matchState.state.autoLiberoBackline;
}

export function setTeamAutoLiberoBackline(scope = "our", enabled = false) {
  if (scope === "opponent") {
    matchState.state.opponentAutoLiberoBackline = !!enabled;
  } else {
    matchState.state.autoLiberoBackline = !!enabled;
  }
}

export function getTeamLiberoAutoMap(scope = "our") {
  return scope === "opponent" ? matchState.state.opponentLiberoAutoMap || {} : matchState.state.liberoAutoMap || {};
}

export function setTeamLiberoAutoMap(scope = "our", map = {}) {
  if (scope === "opponent") {
    matchState.state.opponentLiberoAutoMap = map || {};
  } else {
    matchState.state.liberoAutoMap = map || {};
  }
}

export function getTeamPreferredLibero(scope = "our") {
  return scope === "opponent" ? matchState.state.opponentPreferredLibero || "" : matchState.state.preferredLibero || "";
}

export function setTeamPreferredLibero(scope = "our", name = "") {
  if (scope === "opponent") {
    matchState.state.opponentPreferredLibero = name || "";
  } else {
    matchState.state.preferredLibero = name || "";
  }
}

export function getPlayerNumberValue(name, numbersMap = matchState.state.playerNumbers || {}) {
  const raw = numbersMap && numbersMap[name];
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortNamesByNumber(names = [], numbersMap = matchState.state.playerNumbers || {}) {
  const list = Array.isArray(names) ? names.slice() : [];
  list.sort((a, b) => {
    const numA = getPlayerNumberValue(a, numbersMap);
    const numB = getPlayerNumberValue(b, numbersMap);
    if (numA === null && numB === null) {
      return a.localeCompare(b, "it", { sensitivity: "base" });
    }
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b, "it", { sensitivity: "base" });
  });
  return list;
}

export function isCaptain(name) {
  if (!name) return false;
  const caps = matchState.state.captains || [];
  return caps.some(c => c.toLowerCase() === name.toLowerCase());
}

export function formatNameWithNumber(name, options = {}) {
  const num = getPlayerNumber(name);
  const compactCourt = !!options.compactCourt;
  let baseName = formatStructuredPlayerName(name, "our");
  if (compactCourt) {
    baseName = baseName || name || "";
  }
  const base = num ? num + " - " + baseName : baseName;
  const includeCaptain = options.includeCaptain !== false;
  if (includeCaptain && isCaptain(name)) {
    return base + " (K)";
  }
  return base;
}

export function formatNameWithNumberFor(name, numbersMap = {}, options = {}) {
  if (!name) return "";
  const raw = numbersMap && numbersMap[name];
  const num = raw !== undefined && raw !== null && raw !== "" ? String(raw) : "";
  const scope = options.scope || (numbersMap === matchState.state.opponentPlayerNumbers ? "opponent" : "our");
  let baseName = formatStructuredPlayerName(name, scope);
  if (options.compactCourt) {
    baseName = baseName || name || "";
  }
  const base = num ? num + " - " + baseName : baseName;
  if (options.captainSet && options.captainSet.has(name.toLowerCase())) {
    return base + " (K)";
  }
  return base;
}

export function getShortSkill(id) {
  if (!id) return "";
  return playerModelState.SKILL_SHORT_LABELS[id] || id.slice(0, 2).toUpperCase();
}

export function buildNumbersForNames(names, provided = {}, previous = matchState.state.playerNumbers || {}) {
  const valid = value => {
    const clean = (value || "").trim();
    return clean && /^[0-9]{1,3}$/.test(clean) ? clean : "";
  };
  const hasExplicitEmpty = (obj, key) =>
    obj && Object.prototype.hasOwnProperty.call(obj, key) && String(obj[key]).trim() === "";
  const prev = previous || {};
  const used = new Set();
  const numbers = {};
  names.forEach(name => {
    if (hasExplicitEmpty(provided, name)) {
      numbers[name] = "";
      return;
    }
    const candidates = [valid(provided[name]), valid(prev[name])].filter(Boolean);
    let chosen = "";
    for (const candidate of candidates) {
      if (!used.has(candidate)) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) {
      let candidate = 1;
      while (used.has(String(candidate))) candidate++;
      chosen = String(candidate);
    }
    numbers[name] = chosen;
    used.add(chosen);
  });
  return numbers;
}

export function syncPlayerNumbers(names) {
  matchState.state.playerNumbers = buildNumbersForNames(names, {});
}

export function syncOpponentPlayerNumbers(names, provided = {}) {
  const numbers = buildNumbersForNames(names, provided, matchState.state.opponentPlayerNumbers || {});
  matchState.state.opponentPlayerNumbers = numbers;
  return numbers;
}

export function cleanOpponentLiberos() {
  const set = new Set(matchState.state.opponentPlayers || []);
  matchState.state.opponentLiberos = normalizePlayers(matchState.state.opponentLiberos || []).filter(name => set.has(name));
}
