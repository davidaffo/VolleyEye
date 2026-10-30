
import { cleanOpponentLiberos } from "../roster-data.js";
import { normalizePlayers } from "../../../domain/player-names.js";

import { session } from "../../state/teams-core-player-model.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { session as matchState } from "../../../../js/globals.js";
import { loadOpponentTeamFromStorage, extractRosterFromTeam } from "../storage/team-repository.js";
import { session as courtEngineState, renderPlayersManagerList } from "../court/court-engine.js";
import {ensureCourtShape,updateAutoRoleBaseCourtCache,resetAutoRoleCache} from "../court-state-model.js";
import { ensureCourtShapeFor } from "../court-model.js";
import { getTeamScopeFromEvent } from "../selectors.js";
import { getCurrentTeamPayload, getCurrentOpponentPayload } from "../current-payload.js";
import { updatePlayersList, renderLiberoChipsInline, updateOpponentRotationDisplay } from "../court/court-ui-bootstrap.js";
import { renderPlayers } from "../../live/team-rendering.js";
import { publishTeamEditorMode } from "../editor-view.js";
import { saveState } from "../../storage/save-state.js";

import { renderLiberoTags } from "../imports/camp3-import.js";
import { renderAggregatedTable } from "../../analysis/aggregated-table.js";
import { renderEventsLog } from "../../video/video-events.js";



const playerModelState = session;















export function replacePlayerNameEverywhere(oldName, newName, idx) {
  ensureCourtShape();
  matchState.state.court = matchState.state.court.map(slot => {
    const updated = Object.assign({}, slot);
    if (updated.main === oldName) updated.main = newName;
    if (updated.replaced === oldName) updated.replaced = newName;
    return updated;
  });
  matchState.state.liberos = (matchState.state.liberos || []).map(n => (n === oldName ? newName : n));
  matchState.state.captains = (matchState.state.captains || []).map(n => (n === oldName ? newName : n));
  if (matchState.state.liberoAutoMap) {
    const updatedMap = {};
    Object.entries(matchState.state.liberoAutoMap).forEach(([replaced, libero]) => {
      const nextReplaced = replaced === oldName ? newName : replaced;
      const nextLibero = libero === oldName ? newName : libero;
      updatedMap[nextReplaced] = nextLibero;
    });
    matchState.state.liberoAutoMap = updatedMap;
  }
  (matchState.state.events || []).forEach(ev => {
    const scope =
      (getTeamScopeFromEvent(ev));
    if (scope !== "our") return;
    if (ev.playerIdx === idx || ev.playerName === oldName) {
      ev.playerName = newName;
    }
    if (ev.playerIn === oldName) ev.playerIn = newName;
    if (ev.playerOut === oldName) ev.playerOut = newName;
  });
  Object.values(matchState.state.setStarts || {}).forEach(setStart => {
    if (setStart && setStart.our) {
      setStart.our.court = replacePlayerNameInLineup(setStart.our.court, oldName, newName);
    }
  });
}

export function replacePlayerNameInLineup(lineup, oldName, newName) {
  if (!Array.isArray(lineup)) return lineup;
  return lineup.map(slot => ({
    main: slot && slot.main === oldName ? newName : (slot && slot.main) || "",
    replaced: slot && slot.replaced === oldName ? newName : (slot && slot.replaced) || ""
  }));
}

export function renamePlayerAcrossCurrentMatchById(playerId, nextNameRaw, oldNameHint = "") {
  const normalized = normalizePlayers([nextNameRaw])[0];
  if (!normalized) return false;
  const currentPayload = getCurrentTeamPayload();
  const detailed = Array.isArray(currentPayload.playersDetailed) ? currentPayload.playersDetailed : [];
  const previous = detailed.find(player => player && player.id === playerId && !player.out);
  const oldName = (previous && previous.name) || oldNameHint;
  if (!oldName) return false;
  if (oldName === normalized) return false;
  const idx = (matchState.state.players || []).findIndex(name => name === oldName);
  if (idx === -1) return false;
  matchState.state.players[idx] = normalized;
  matchState.state.playerNumbers = matchState.state.playerNumbers || {};
  const oldNumber = matchState.state.playerNumbers[oldName];
  delete matchState.state.playerNumbers[oldName];
  if (oldNumber !== undefined) {
    matchState.state.playerNumbers[normalized] = oldNumber;
  }
  replacePlayerNameEverywhere(oldName, normalized, idx);
  matchState.state.autoRoleBaseCourt = replacePlayerNameInLineup(matchState.state.autoRoleBaseCourt, oldName, normalized);
  rosterLineupState.autoRoleBaseCourt = replacePlayerNameInLineup(rosterLineupState.autoRoleBaseCourt, oldName, normalized);
  if (
    matchState.state.pendingServe &&
    matchState.state.pendingServe.scope === "our" &&
    (matchState.state.pendingServe.playerId === playerId || matchState.state.pendingServe.playerName === oldName)
  ) {
    matchState.state.pendingServe.playerName = normalized;
  }
  return true;
}

export function replaceOpponentPlayerNameEverywhere(oldName, newName, idx, playerId = "") {
  matchState.state.opponentCourt = ensureCourtShapeFor(matchState.state.opponentCourt).map(slot => {
    const updated = Object.assign({}, slot);
    if (updated.main === oldName) updated.main = newName;
    if (updated.replaced === oldName) updated.replaced = newName;
    return updated;
  });
  matchState.state.opponentLiberos = (matchState.state.opponentLiberos || []).map(name => (name === oldName ? newName : name));
  matchState.state.opponentCaptains = (matchState.state.opponentCaptains || []).map(name => (name === oldName ? newName : name));
  const nextMap = {};
  Object.entries(matchState.state.opponentLiberoAutoMap || {}).forEach(([replaced, libero]) => {
    nextMap[replaced === oldName ? newName : replaced] = libero === oldName ? newName : libero;
  });
  matchState.state.opponentLiberoAutoMap = nextMap;
  (matchState.state.events || []).forEach(event => {
    const scope = (getTeamScopeFromEvent(event));
    if (scope !== "opponent") return;
    if ((playerId && event.playerId === playerId) || event.playerIdx === idx || event.playerName === oldName) {
      event.playerName = newName;
    }
    if (event.playerIn === oldName) event.playerIn = newName;
    if (event.playerOut === oldName) event.playerOut = newName;
  });
  Object.values(matchState.state.setStarts || {}).forEach(setStart => {
    if (setStart && setStart.opponent) {
      setStart.opponent.court = replacePlayerNameInLineup(setStart.opponent.court, oldName, newName);
    }
  });
}

export function renameOpponentPlayerAcrossCurrentMatchById(playerId, nextNameRaw, oldNameHint = "") {
  const normalized = normalizePlayers([nextNameRaw])[0];
  if (!normalized) return false;
  const currentPayload = getCurrentOpponentPayload();
  const detailed = Array.isArray(currentPayload.playersDetailed) ? currentPayload.playersDetailed : [];
  const previous = detailed.find(player => player && player.id === playerId && !player.out);
  const oldName = (previous && previous.name) || oldNameHint;
  if (!oldName || oldName === normalized) return false;
  const idx = (matchState.state.opponentPlayers || []).findIndex(name => name === oldName);
  if (idx === -1) return false;
  matchState.state.opponentPlayers[idx] = normalized;
  matchState.state.opponentPlayerNumbers = matchState.state.opponentPlayerNumbers || {};
  const oldNumber = matchState.state.opponentPlayerNumbers[oldName];
  delete matchState.state.opponentPlayerNumbers[oldName];
  if (oldNumber !== undefined) matchState.state.opponentPlayerNumbers[normalized] = oldNumber;
  replaceOpponentPlayerNameEverywhere(oldName, normalized, idx, playerId);
  matchState.state.opponentAutoRoleBaseCourt = replacePlayerNameInLineup(
    matchState.state.opponentAutoRoleBaseCourt,
    oldName,
    normalized
  );
  rosterLineupState.opponentAutoRoleBaseCourt = replacePlayerNameInLineup(rosterLineupState.opponentAutoRoleBaseCourt, oldName, normalized);
  return true;
}

function getLiveRosterChange(currentPayload, payload) {
  const activePlayers = source => Array.isArray(source.playersDetailed)
    ? source.playersDetailed.filter(player => player && !player.out) : [];
  const currentDetailed = activePlayers(currentPayload), nextDetailed = activePlayers(payload);
  const currentIds = new Set(currentDetailed.map(player => player.id).filter(Boolean));
  const nextIds = new Set(nextDetailed.map(player => player.id).filter(Boolean));
  const hasStableIdOverlap = currentDetailed.some(player => player.id && nextIds.has(player.id));
  const removed = hasStableIdOverlap ? currentDetailed.filter(player => player.id && !nextIds.has(player.id))
    : currentDetailed.slice(nextDetailed.length);
  return { currentDetailed, nextDetailed, currentIds, hasStableIdOverlap, removed };
}

function applyLiveRosterNames({ currentDetailed, nextDetailed, currentIds, hasStableIdOverlap }, rename) {
  const nextPlayer = (player, index) => hasStableIdOverlap
    ? nextDetailed.find(entry => entry.id === player.id) : nextDetailed[index];
  currentDetailed.forEach((player, index) => {
    const next = nextPlayer(player, index);
    if (next && next.name && next.name !== player.name) rename(player.id, next.name, player.name);
  });
  const orderedNames = currentDetailed.map((player, index) => {
    const next = nextPlayer(player, index);
    return next && next.name ? next.name : player.name;
  });
  const addedNames = (hasStableIdOverlap ? nextDetailed.filter(player => player.id && !currentIds.has(player.id))
    : nextDetailed.slice(currentDetailed.length)).map(player => player.name).filter(Boolean);
  return orderedNames.concat(addedNames);
}



export function getRemovedLiveTeamPlayers(payload, scope = "our", currentPayloadOverride = null) {
  const currentPayload =
    currentPayloadOverride ||
    (scope === "opponent" ? getCurrentOpponentPayload() : getCurrentTeamPayload());
  return getLiveRosterChange(currentPayload, payload).removed;
}

export function applyLiveTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentTeamPayload();
  const change = getLiveRosterChange(currentPayload, payload);
  if (!matchState.state.matchFinished && change.removed.length > 0) {
    alert("Durante la partita non puoi rimuovere giocatrici dal roster rapido.");
    return false;
  }
  const nextNames = applyLiveRosterNames(change, renamePlayerAcrossCurrentMatchById);
  updatePlayersList(nextNames, {
    askReset: false,
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    preserveCourt: true,
    preferredLibero: payload.preferredLibero || "",
    preserveFlowState: true
  });
  return true;
}

export function applyLiveOpponentTeamManagerPayload(payload, currentPayloadOverride = null) {
  const currentPayload = currentPayloadOverride || getCurrentOpponentPayload();
  const change = getLiveRosterChange(currentPayload, payload);
  const nextNames = applyLiveRosterNames(change, renameOpponentPlayerAcrossCurrentMatchById);
  const applied = courtEngineState.updateOpponentPlayersList(nextNames, {
    liberos: payload.liberos,
    playerNumbers: payload.numbers,
    captains: payload.captains,
    allowDuringMatch: true
  });
  if (applied === false) return false;
  matchState.state.opponentPreferredLibero = payload.preferredLibero || "";
  renderPlayers();
  return true;
}

export function syncTeamManagerModeUI() {

 publishTeamEditorMode(); return;
}

export function renamePlayerAtIndex(idx, nextNameRaw) {
  if (!matchState.state.players || !matchState.state.players[idx]) return;
  const normalized = normalizePlayers([nextNameRaw])[0];
  if (!normalized) {
    alert("Inserisci un nome valido.");
    renderPlayersManagerList();
    return;
  }
  const duplicate = matchState.state.players.some(
    (p, i) => i !== idx && p.toLowerCase() === normalized.toLowerCase()
  );
  if (duplicate) {
    alert("Nome già presente nella lista.");
    renderPlayersManagerList();
    return;
  }
  const oldName = matchState.state.players[idx];
  if (oldName === normalized) return;
  matchState.state.players[idx] = normalized;
  matchState.state.playerNumbers = matchState.state.playerNumbers || {};
  const oldNumber = matchState.state.playerNumbers[oldName];
  delete matchState.state.playerNumbers[oldName];
  if (oldNumber) {
    matchState.state.playerNumbers[normalized] = oldNumber;
  }
  replacePlayerNameEverywhere(oldName, normalized, idx);
  saveState();
  renderPlayersManagerList();
  renderPlayers();
  renderLiberoChipsInline();

  renderLiberoTags();
  renderAggregatedTable();
  renderEventsLog();
}



















































export function ensureOpponentLiberosFromTeam() {
  if (Array.isArray(matchState.state.opponentLiberos)) return;
  const selected = matchState.state.selectedOpponentTeam || "";
  if (!selected) return;
  const team = loadOpponentTeamFromStorage(selected);
  if (!team) return;
  const roster = extractRosterFromTeam(team);
  if (!roster || !roster.liberos || roster.liberos.length === 0) return;
  const validPlayers = new Set(matchState.state.opponentPlayers || roster.players || []);
  matchState.state.opponentLiberos = normalizePlayers(roster.liberos).filter(name => validPlayers.has(name));
  cleanOpponentLiberos();
  saveState();
}

export function applyDefaultLineup(names = [], rotation = 1) {
  ensureCourtShape();
  const valid = new Set(matchState.state.players || []);
  const lineup = Array.isArray(names) ? names.filter(name => name && valid.has(name)) : [];
  matchState.state.court = Array.from({ length: 6 }, (_, idx) => ({ main: lineup[idx] || "" }));
  const rot = Number.isFinite(rotation) ? rotation : parseInt(rotation, 10) || 1;
  matchState.state.rotation = Math.min(6, Math.max(1, rot));
  rosterLineupState.autoRoleBaseCourt = null;
  matchState.state.autoRoleBaseCourt = null;
  resetAutoRoleCache();
}

export function applyOpponentDefaultLineup(names = [], rotation = 1) {
  rosterLineupState.opponentAutoRoleBaseCourt = null;
  matchState.state.opponentAutoRoleBaseCourt = null;
  matchState.state.opponentLiberoAutoMap = {};
  const valid = new Set(matchState.state.opponentPlayers || []);
  const lineup = Array.isArray(names) ? names.filter(name => name && valid.has(name)) : [];
  matchState.state.opponentCourt = Array.from({ length: 6 }, (_, idx) => ({ main: lineup[idx] || "" }));
  const rot = Number.isFinite(rotation) ? rotation : parseInt(rotation, 10) || 1;
  matchState.state.opponentRotation = Math.min(6, Math.max(1, rot));
  updateOpponentRotationDisplay();
  if (matchState.state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(matchState.state.opponentCourt, "opponent");
  }
}
