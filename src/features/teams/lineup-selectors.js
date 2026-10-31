import { session as matchState } from '../../../js/globals.js';
import { session as scoutUiState } from '../state/scout-ui.js';
import { getPlayerNumbersForScope, getPlayersForScope } from './selectors.js';
import { formatNameWithNumberFor, getTeamPreferredLibero, sortNamesByNumber } from './roster-data.js';
import { getCourtShape } from './court-model.js';

export function getLineupModalPlayers() {
  return scoutUiState.lineupModalScope === "opponent" ? matchState.state.opponentPlayers || [] : matchState.state.players || [];
}

export function getLineupModalLiberos() {
  return scoutUiState.lineupModalScope === "opponent" ? matchState.state.opponentLiberos || [] : matchState.state.liberos || [];
}

export function getLineupModalNumbers() {
  return scoutUiState.lineupModalScope === "opponent" ? matchState.state.opponentPlayerNumbers || {} : matchState.state.playerNumbers || {};
}

export function getLineupModalPreferredLibero() {
  return getTeamPreferredLibero(scoutUiState.lineupModalScope);
  return scoutUiState.lineupModalScope === "opponent" ? matchState.state.opponentPreferredLibero || "" : matchState.state.preferredLibero || "";
}

export function formatLineupModalName(name, options = {}) {
  const scope = options.scope === "opponent" || options.scope === "our" ? options.scope : scoutUiState.lineupModalScope;
  const numbersMap = getPlayerNumbersForScope(scope);
  const captains = scope === "opponent" ? matchState.state.opponentCaptains || [] : matchState.state.captains || [];
  const captainSet = options.includeCaptain === false ? null : new Set(captains.map(captain => captain.toLowerCase()));
  return formatNameWithNumberFor(
    name,
    numbersMap,
    Object.assign({}, options, { scope, captainSet })
  );
}

export function getBenchForLineupWithRoster(court, rosterNames, liberos, numbersMap) {
  const libSet = new Set(liberos || []);
  const used = new Set();
  getCourtShape(court).forEach(slot => {
    const name = slot.main || "";
    if (name) used.add(name);
    if (slot.replaced && !libSet.has(name)) used.add(slot.replaced);
  });
  const bench = (rosterNames || []).filter(name => name && !libSet.has(name) && !used.has(name));
  return sortNamesByNumber(bench, numbersMap || {});
  return bench;
}

export function getSortedPlayerEntries() {
  const players = matchState.state.players || [];
  const numbers = matchState.state.playerNumbers || {};
  const names = (sortNamesByNumber(players, numbers));
  const idxMap = new Map(players.map((name, idx) => [name, idx]));
  return names
    .map(name => ({ name, idx: idxMap.get(name) }))
    .filter(entry => typeof entry.idx === "number");
}

export function getSortedPlayerEntriesForScope(scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const names = (sortNamesByNumber(players, numbers));
  const idxMap = new Map(players.map((name, idx) => [name, idx]));
  return names
    .map(name => ({ name, idx: idxMap.get(name) }))
    .filter(entry => typeof entry.idx === "number");
}

export function sortPlayerOptionsByNumberForScope(options, scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const getNum = idx => {
    const name = players[idx];
    if (!name) return null;
    const raw = numbers[name];
    const parsed = raw !== undefined && raw !== null && raw !== "" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  return options.slice().sort((a, b) => {
    const idxA = Number(a.value);
    const idxB = Number(b.value);
    const numA = getNum(idxA);
    const numB = getNum(idxB);
    if (numA === null && numB === null) {
      return String(a.label || "").localeCompare(String(b.label || ""), "it", { sensitivity: "base" });
    }
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return String(a.label || "").localeCompare(String(b.label || ""), "it", { sensitivity: "base" });
  });
}

export function sortPlayerIndexesByNumberForScope(indices, scope) {
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  const getNum = idx => {
    const name = players[idx];
    if (!name) return null;
    const raw = numbers[name];
    const parsed = raw !== undefined && raw !== null && raw !== "" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  return indices.slice().sort((a, b) => {
    const numA = getNum(a);
    const numB = getNum(b);
    if (numA === null && numB === null) return a - b;
    if (numA === null) return 1;
    if (numB === null) return -1;
    if (numA !== numB) return numA - numB;
    return a - b;
  });
}
