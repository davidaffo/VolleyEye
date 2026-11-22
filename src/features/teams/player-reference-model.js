import { session as matchState } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { normalizePlayers } from "../../domain/player-names.js";
import { ensureCourtShape } from "./court-state-model.js";
import { ensureCourtShapeFor } from "./court-model.js";
import { getTeamScopeFromEvent } from "./selectors.js";
import {
  getCurrentTeamPayload,
  getCurrentOpponentPayload,
} from "./current-payload.js";

const referenceFields = {
  our: {
    court: "court",
    players: "players",
    numbers: "playerNumbers",
    liberos: "liberos",
    captains: "captains",
    liberoMap: "liberoAutoMap",
    baseCourt: "autoRoleBaseCourt",
  },
  opponent: {
    court: "opponentCourt",
    players: "opponentPlayers",
    numbers: "opponentPlayerNumbers",
    liberos: "opponentLiberos",
    captains: "opponentCaptains",
    liberoMap: "opponentLiberoAutoMap",
    baseCourt: "opponentAutoRoleBaseCourt",
  },
};

export function replaceTeamPlayerNameReferences(
  scope,
  oldName,
  newName,
  idx,
  playerId = "",
) {
  renamePlayerInScoutUndoStates(oldName, newName, scope);
  const preferredKey = scope === "opponent" ? "opponentPreferredLibero" : "preferredLibero";
  if (matchState.state[preferredKey] === oldName) matchState.state[preferredKey] = newName;
  const fields = referenceFields[scope];
  if (scope === "our") ensureCourtShape();
  else
    matchState.state.opponentCourt = ensureCourtShapeFor(
      matchState.state.opponentCourt,
    );
  matchState.state[fields.court] = matchState.state[fields.court].map(
    (slot) => {
      const updated = { ...slot };
      if (updated.main === oldName) updated.main = newName;
      if (updated.replaced === oldName) updated.replaced = newName;
      return updated;
    },
  );
  for (const key of [fields.liberos, fields.captains]) {
    matchState.state[key] = (matchState.state[key] || []).map((name) =>
      name === oldName ? newName : name,
    );
  }
  if (scope === "opponent" || matchState.state[fields.liberoMap]) {
    const nextMap = {};
    for (const [replaced, libero] of Object.entries(
      matchState.state[fields.liberoMap] || {},
    )) {
      nextMap[replaced === oldName ? newName : replaced] =
        libero === oldName ? newName : libero;
    }
    matchState.state[fields.liberoMap] = nextMap;
  }
  (matchState.state.events || []).forEach((event) => {
    if (getTeamScopeFromEvent(event) !== scope) return;
    if (
      (scope === "opponent" && playerId && event.playerId === playerId) ||
      event.playerIdx === idx ||
      event.playerName === oldName
    ) {
      event.playerName = newName;
    }
    if (event.playerIn === oldName) event.playerIn = newName;
    if (event.playerOut === oldName) event.playerOut = newName;
  });
  for (const start of Object.values(matchState.state.setStarts || {})) {
    if (start && start[scope])
      start[scope].court = replacePlayerNameInLineup(
        start[scope].court,
        oldName,
        newName,
      );
  }
}

export function replacePlayerNameInLineup(lineup, oldName, newName) {
  if (!Array.isArray(lineup)) return lineup;
  return lineup.map((slot) => ({
    main: slot && slot.main === oldName ? newName : (slot && slot.main) || "",
    replaced:
      slot && slot.replaced === oldName
        ? newName
        : (slot && slot.replaced) || "",
  }));
}

export function renameTeamPlayerAcrossCurrentMatchById(
  scope,
  playerId,
  nextNameRaw,
  oldNameHint = "",
) {
  const normalized = normalizePlayers([nextNameRaw])[0];
  if (!normalized) return false;
  const currentPayload =
    scope === "opponent"
      ? getCurrentOpponentPayload()
      : getCurrentTeamPayload();
  const detailed = Array.isArray(currentPayload.playersDetailed)
    ? currentPayload.playersDetailed
    : [];
  const previous = detailed.find(
    (player) => player && player.id === playerId && !player.out,
  );
  const oldName = (previous && previous.name) || oldNameHint;
  if (!oldName || oldName === normalized) return false;
  const fields = referenceFields[scope];
  const idx = (matchState.state[fields.players] || []).findIndex(
    (name) => name === oldName,
  );
  if (idx === -1) return false;
  matchState.state[fields.players][idx] = normalized;
  const numbers = (matchState.state[fields.numbers] =
    matchState.state[fields.numbers] || {});
  const oldNumber = numbers[oldName];
  delete numbers[oldName];
  if (oldNumber !== undefined) numbers[normalized] = oldNumber;
  replaceTeamPlayerNameReferences(scope, oldName, normalized, idx, playerId);
  matchState.state[fields.baseCourt] = replacePlayerNameInLineup(
    matchState.state[fields.baseCourt],
    oldName,
    normalized,
  );
  if (scope === "opponent") {
    rosterLineupState.opponentAutoRoleBaseCourt = replacePlayerNameInLineup(
      rosterLineupState.opponentAutoRoleBaseCourt,
      oldName,
      normalized,
    );
  } else {
    rosterLineupState.autoRoleBaseCourt = replacePlayerNameInLineup(
      rosterLineupState.autoRoleBaseCourt,
      oldName,
      normalized,
    );
    if (
      matchState.state.pendingServe?.scope === "our" &&
      (matchState.state.pendingServe.playerId === playerId ||
        matchState.state.pendingServe.playerName === oldName)
    ) {
      matchState.state.pendingServe.playerName = normalized;
    }
  }
  return true;
}

export function getLiveRosterChange(currentPayload, payload) {
  const activePlayers = (source) =>
    Array.isArray(source.playersDetailed)
      ? source.playersDetailed.filter((player) => player && !player.out)
      : [];
  const currentDetailed = activePlayers(currentPayload),
    nextDetailed = activePlayers(payload);
  const currentIds = new Set(
    currentDetailed.map((player) => player.id).filter(Boolean),
  );
  const nextIds = new Set(
    nextDetailed.map((player) => player.id).filter(Boolean),
  );
  const hasStableIdOverlap = currentDetailed.some(
    (player) => player.id && nextIds.has(player.id),
  );
  const removed = hasStableIdOverlap
    ? currentDetailed.filter((player) => player.id && !nextIds.has(player.id))
    : currentDetailed.slice(nextDetailed.length);
  return {
    currentDetailed,
    nextDetailed,
    currentIds,
    hasStableIdOverlap,
    removed,
  };
}

export function applyLiveRosterNames(
  { currentDetailed, nextDetailed, currentIds, hasStableIdOverlap },
  rename,
  { removeMissing = false } = {},
) {
  const nextPlayer = (player, index) =>
    hasStableIdOverlap
      ? nextDetailed.find((entry) => entry.id === player.id)
      : nextDetailed[index];
  currentDetailed.forEach((player, index) => {
    const next = nextPlayer(player, index);
    if (next && next.name && next.name !== player.name)
      rename(player.id, next.name, player.name);
  });
  const orderedNames = currentDetailed.map((player, index) => {
    const next = nextPlayer(player, index);
    if (!next && removeMissing) return null;
    return next && next.name ? next.name : player.name;
  }).filter(Boolean);
  const addedNames = (
    hasStableIdOverlap
      ? nextDetailed.filter((player) => player.id && !currentIds.has(player.id))
      : nextDetailed.slice(currentDetailed.length)
  )
    .map((player) => player.name)
    .filter(Boolean);
  return orderedNames.concat(addedNames);
}

export function hasLivePlayerReferences(player, scope, currentPlayers = []) {
  const index = currentPlayers.indexOf(player.name);
  const sameName = value => typeof value === "string" && value.trim().toLowerCase() === String(player.name || "").trim().toLowerCase();
  return (matchState.state.events || []).some(event => {
    if (!event || getTeamScopeFromEvent(event) !== scope) return false;
    return (player.id && event.playerId === player.id) ||
      sameName(event.playerName) || sameName(event.setterName) ||
      sameName(event.playerIn) || sameName(event.playerOut) ||
      (index >= 0 && (event.playerIdx === index || event.setterIdx === index));
  }) || (matchState.state.pendingServe?.scope === scope &&
    ((player.id && matchState.state.pendingServe.playerId === player.id) || sameName(matchState.state.pendingServe.playerName) ||
      (index >= 0 && matchState.state.pendingServe.playerIdx === index)));
}

export function remapLiveRosterReferences(scope, oldNames, nextNames, removed) {
  const removedNames = new Set(removed.map(player => player.name));
  const remap = index => typeof index === "number" && oldNames[index] ? Math.max(-1, nextNames.indexOf(oldNames[index])) : index;
  const cleanCourt = court => Array.isArray(court) ? court.map(slot => ({ ...slot,
    main: removedNames.has(slot?.main) ? "" : slot?.main || "",
    replaced: removedNames.has(slot?.replaced) ? "" : slot?.replaced || "" })) : court;
  const courtKey = scope === "opponent" ? "opponentCourt" : "court";
  const baseKey = scope === "opponent" ? "opponentAutoRoleBaseCourt" : "autoRoleBaseCourt";
  const mapKey = scope === "opponent" ? "opponentLiberoAutoMap" : "liberoAutoMap";
  const preferredKey = scope === "opponent" ? "opponentPreferredLibero" : "preferredLibero";
  const cleanSnapshot = before => {
    if (!before) return;
    for (const key of [courtKey, baseKey]) if (Array.isArray(before[key])) before[key] = cleanCourt(before[key]);
    if (before[mapKey]) before[mapKey] = Object.fromEntries(Object.entries(before[mapKey]).filter(([name, libero]) => !removedNames.has(name) && !removedNames.has(libero)));
    if (removedNames.has(before[preferredKey])) before[preferredKey] = "";
    if (before.pendingServe?.scope === scope) {
      if (removedNames.has(before.pendingServe.playerName)) before.pendingServe = null;
      else if (typeof before.pendingServe.playerIdx === "number") {
        const index = remap(before.pendingServe.playerIdx);
        before.pendingServe.playerIdx = index < 0 ? null : index;
      }
    }
    for (const start of Object.values(before.setStarts || {})) if (start?.[scope]?.court) start[scope].court = cleanCourt(start[scope].court);
  };
  for (const event of matchState.state.events || []) {
    if (!event) continue;
    if (getTeamScopeFromEvent(event) === scope) {
      for (const key of ["playerIdx", "setterIdx"]) if (typeof event[key] === "number") {
        const next = remap(event[key]);
        event[key] = next < 0 ? null : next;
      }
    }
    cleanSnapshot((event.undoState || event.__undoSnapshot)?.before);
    for (const starts of [event.prevSetStarts, event.nextSetStarts]) {
      for (const start of Object.values(starts || {})) if (start?.[scope]?.court) start[scope].court = cleanCourt(start[scope].court);
    }
  }
  const pending = matchState.state.pendingServe;
  if (pending?.scope === scope && typeof pending.playerIdx === "number") pending.playerIdx = remap(pending.playerIdx);
}

export function getRemovedLiveTeamPlayers(
  payload,
  scope = "our",
  currentPayloadOverride = null,
) {
  const currentPayload =
    currentPayloadOverride ||
    (scope === "opponent"
      ? getCurrentOpponentPayload()
      : getCurrentTeamPayload());
  return getLiveRosterChange(currentPayload, payload).removed;
}

export function renamePlayerInScoutUndoStates(oldName, newName, scope = "our") {
  const opponent = scope === "opponent";
  const courtKeys = opponent ? ["opponentCourt", "opponentAutoRoleBaseCourt"] : ["court", "autoRoleBaseCourt"];
  const mapKey = opponent ? "opponentLiberoAutoMap" : "liberoAutoMap";
  const preferredKey = opponent ? "opponentPreferredLibero" : "preferredLibero";
  const renameStarts = starts => Object.values(starts || {}).forEach(start => {
    const side = start && start[opponent ? "opponent" : "our"];
    if (side) side.court = replacePlayerNameInLineup(side.court, oldName, newName);
  });
  (matchState.state.events || []).forEach(event => {
    if (!event) return;
    const receipt = event.undoState || event.__undoSnapshot;
    const before = receipt && receipt.before;
    if (before) {
      courtKeys.forEach(key => {
        if (Array.isArray(before[key])) before[key] = replacePlayerNameInLineup(before[key], oldName, newName);
      });
      if (before[mapKey]) before[mapKey] = Object.fromEntries(Object.entries(before[mapKey]).map(([replaced, libero]) => [
        replaced === oldName ? newName : replaced, libero === oldName ? newName : libero
      ]));
      if (before[preferredKey] === oldName) before[preferredKey] = newName;
      if (before.pendingServe && before.pendingServe.scope === scope && before.pendingServe.playerName === oldName) {
        before.pendingServe.playerName = newName;
      }
      renameStarts(before.setStarts);
    }
    renameStarts(event.prevSetStarts);
    renameStarts(event.nextSetStarts);
  });
}
