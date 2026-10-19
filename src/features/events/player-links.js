import { getTeamScopeFromEvent, getPlayersForScope } from '../teams/selectors.js';
import { getPlayerIndexForId, ensureEventDataVolleyFields, getRosterIdMapsForScope, normalizePlayerKey } from '../teams/player-identity.js';
export function resolvePlayerIdx(ev) {
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  const idxById = getPlayerIndexForId(scope, ev.playerId);
  if (typeof idxById === "number" && players[idxById]) {
    return idxById;
  }
  if (typeof ev.playerIdx === "number" && players[ev.playerIdx]) {
    return ev.playerIdx;
  }
  return players.findIndex(name => name === ev.playerName);
}

export function syncEventPlayerLink(ev) {
  if (!ev) return;
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  if (!Array.isArray(players) || players.length === 0) {
    ensureEventDataVolleyFields(ev);
    return;
  }
  const idxById = getPlayerIndexForId(scope, ev.playerId);
  if (typeof idxById === "number" && players[idxById]) {
    ev.playerIdx = idxById;
    ev.playerName = players[idxById];
    ensureEventDataVolleyFields(ev);
    return;
  }
  const rawName = ev.playerName != null ? String(ev.playerName).trim() : "";
  if (rawName) {
    let idx = players.indexOf(rawName);
    if (idx === -1) {
      const lower = rawName.toLowerCase();
      idx = players.findIndex(p => String(p || "").trim().toLowerCase() === lower);
    }
    if (idx !== -1) {
      ev.playerIdx = idx;
      if (players[idx] && players[idx] !== ev.playerName) {
        ev.playerName = players[idx];
      }
      if (!ev.playerId) {
        const maps = getRosterIdMapsForScope(scope);
        if (maps && maps.nameToId) {
          ev.playerId = maps.nameToId.get(normalizePlayerKey(ev.playerName)) || null;
        }
      }
      ensureEventDataVolleyFields(ev);
      return;
    }
  }
  if (typeof ev.playerIdx === "number" && players[ev.playerIdx]) {
    ev.playerName = players[ev.playerIdx];
    if (!ev.playerId) {
      const maps = getRosterIdMapsForScope(scope);
      if (maps && maps.nameToId) {
        ev.playerId = maps.nameToId.get(normalizePlayerKey(ev.playerName)) || null;
      }
    }
  }
  ensureEventDataVolleyFields(ev);
}

export function syncEventPlayerLinks(events) {
  (events || []).forEach(syncEventPlayerLink);
}
