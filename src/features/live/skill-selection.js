import { getLineupModalPlayers, getLineupModalNumbers } from "../teams/lineup-selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayersForScope, makePlayerKey, isPlayerKeyInScope, isFarSideForScope, getOppositeScope } from "../teams/selectors.js";
import { getServeDisplayCourt } from "../teams/serve-court.js";
import { session as matchState } from "../../../js/globals.js";
import { setTeamPreferredLibero, setTeamLiberoAutoMap } from "../teams/roster-data.js";
import { enforceAutoLiberoForScope } from "../teams/court/court-engine.js";

import { publishLineupView } from "./lineup-view.js";
import { loadTeamFromStorage, extractRosterFromTeam } from "../teams/storage/team-repository.js";
import { renderLineupModal, assignPlayerToLineup } from "./lineup-editor.js";
import { trajectoryModalStore } from "../../state/roster-import-store.mjs";
import { listenRuntime, unlistenRuntime } from "../../app/browser-effects.js";
import { setSelectedSkillForScope } from "./game-flow.js";
import { getServerPlayerForScope } from "./flow-model.js";
import { closeSkillModal, isErrorPickModeForScope, stopErrorPickMode, getActiveVideoPlaybackSeconds } from "./live-entry.js";
import { getCurrentZoneForPlayer } from "../analysis/stats-update.js";
import { openAttackTrajectoryModal } from "./trajectories.js";
import { saveState } from "../storage/save-state.js";
import { renderOpponentPlayers, renderPlayers } from "./team-rendering.js";
import { renderOpponentLiberoChipsInline, updateOpponentRotationDisplay, renderLineupChips, renderLiberoChipsInline, updateRotationDisplay } from "../teams/court/court-ui-bootstrap.js";









export function setLineupModalPreferredLibero(name) {
  const next = name || "";
  setTeamPreferredLibero(scoutUiState.lineupModalScope, next);
  setTeamLiberoAutoMap(scoutUiState.lineupModalScope, {});
  enforceAutoLiberoForScope(scoutUiState.lineupModalScope, { skipServerOnServe: true });
}





export function updateLineupModalControls() {

 publishLineupView(); return;
}

export function applyDefaultLineupToModal() {
  const teamName = scoutUiState.lineupModalScope === "opponent" ? matchState.state.selectedOpponentTeam || "" : matchState.state.selectedTeam || "";
  if (!teamName) {
    alert("Seleziona prima una squadra.");
    return;
  }
  ;
  const team = loadTeamFromStorage(teamName);
  if (!team) {
    alert("Squadra non trovata o corrotta.");
    return;
  }
  const roster = extractRosterFromTeam(team);
  const fallback = roster.playersDetailed && roster.playersDetailed.length > 0
    ? roster.playersDetailed.filter(p => !p.out && p.role !== "L").map(p => p.name)
    : roster.players || [];
  const names =
    roster.defaultLineup && roster.defaultLineup.length > 0 ? roster.defaultLineup : fallback;
  scoutUiState.lineupModalCourt = Array.from({ length: 6 }, (_, idx) => ({ main: names[idx] || "", replaced: "" }));
  scoutUiState.lineupModalDefaultRotation = roster.defaultRotation || 1;
  renderLineupModal();
}

export function applyNumberToLineupSlot(slotIdx, rawValue) {
  const value = (rawValue || "").trim();
  if (!value) return false;
  const players = getLineupModalPlayers();
  const numbers = getLineupModalNumbers();
  const matchName = players.find(name => numbers[name] === value);
  if (!matchName) return false;
  assignPlayerToLineup(matchName, slotIdx);
  return true;
}

export function exitLineupNumberMode() {
  scoutUiState.lineupNumberMode = false;
  renderLineupModal();
}









export function setServeTypeSelection(type) {
  const t = (type || "").toUpperCase();
  const normalized = t === "F" || t === "S" ? t : "JF";
  scoutUiState.serveTrajectoryType = normalized;
  if (!scoutUiState.elServeTypeButtons) return;
  trajectoryModalStore.publish({serveType:normalized});return;
  
}

export function bindServeTypeInlineListener(playerIdx, onSelect, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  scoutUiState.serveTypeSelectHandlers[key] = onSelect;
  if (scoutUiState.serveTypeInlineHandler) return;
  scoutUiState.serveTypeInlineHandler = e => {
    const key = (e.key || "").toUpperCase();
    if (key !== "F" && key !== "J" && key !== "S") return;
    const activePlayer =
      scoutUiState.serveTypeInlinePlayer !== null ? scoutUiState.serveTypeInlinePlayer : scoutUiState.serveTypeFocusPlayer;
    if (activePlayer === null || activePlayer === undefined) return;
    const handler = scoutUiState.serveTypeSelectHandlers[activePlayer];
    if (typeof handler === "function") {
      handler(key === "J" ? "JF" : key);
    }
  };
  listenRuntime(window, "keydown", scoutUiState.serveTypeInlineHandler);
}

export function setServeTypeFocusPlayer(playerIdx, scope = "our") {
  scoutUiState.serveTypeFocusPlayer = makePlayerKey(scope, playerIdx);
}

export function removeServeTypeInlineKeyListener() {
  if (scoutUiState.serveTypeInlineHandler) {
    unlistenRuntime(window, "keydown", scoutUiState.serveTypeInlineHandler);
    scoutUiState.serveTypeInlineHandler = null;
  }
}

export function clearServeTypeInlineListener() {
  removeServeTypeInlineKeyListener();
  scoutUiState.serveTypeInlinePlayer = null;
  scoutUiState.serveTypeFocusPlayer = null;
  Object.keys(scoutUiState.serveTypeSelectHandlers).forEach(key => {
    delete scoutUiState.serveTypeSelectHandlers[key];
  });
}

export function clearAttackSelection(playerIdx = null, scope = "our") {
  if (playerIdx === null || playerIdx === undefined) {
    scoutUiState.attackInlinePlayer = null;
    Object.keys(scoutUiState.attackMetaByPlayer).forEach(key => {
      delete scoutUiState.attackMetaByPlayer[key];
    });
    return;
  }
  const key = makePlayerKey(scope, playerIdx);
  delete scoutUiState.attackMetaByPlayer[key];
  if (scoutUiState.attackInlinePlayer === key) {
    scoutUiState.attackInlinePlayer = null;
  }
}

export function resetSkillSelectionForPlayer(playerIdx, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  delete scoutUiState.serveMetaByPlayer[key];
  delete scoutUiState.blockConfirmByPlayer[key];
  if (scoutUiState.serveTypeInlinePlayer === key || scoutUiState.serveTypeFocusPlayer === key) {
    clearServeTypeInlineListener();
  }
  clearAttackSelection(playerIdx, scope);
  setSelectedSkillForScope(scope, playerIdx, null);
}

export function cancelPartialSkillFlowForScope(scope = "our") {
  const targetScope = scope || "our";
  const prefix = targetScope + ":";
  const playerIdxs = new Set();
  const collectFromKey = key => {
    if (!key || !key.startsWith(prefix)) return;
    const idx = parseInt(key.slice(prefix.length), 10);
    if (!Number.isNaN(idx)) playerIdxs.add(idx);
  };
  [scoutUiState.selectedSkillPerPlayer, scoutUiState.serveMetaByPlayer, scoutUiState.attackMetaByPlayer, scoutUiState.blockConfirmByPlayer, scoutUiState.serveTypeSelectHandlers]
    .forEach(mapObj => {
      Object.keys(mapObj || {}).forEach(collectFromKey);
    });
  [scoutUiState.attackInlinePlayer, scoutUiState.serveTypeInlinePlayer, scoutUiState.serveTypeFocusPlayer, scoutUiState.blockInlinePlayer].forEach(collectFromKey);
  if (
    scoutUiState.activeSkillModalContext &&
    scoutUiState.activeSkillModalContext.scope === targetScope &&
    typeof scoutUiState.activeSkillModalContext.playerIdx === "number"
  ) {
    playerIdxs.add(scoutUiState.activeSkillModalContext.playerIdx);
  }
  playerIdxs.forEach(playerIdx => resetSkillSelectionForPlayer(playerIdx, targetScope));
  if (scoutUiState.activeSkillModalContext && scoutUiState.activeSkillModalContext.scope === targetScope) {
    closeSkillModal();
  }
  if (isErrorPickModeForScope(targetScope)) {
    stopErrorPickMode({ render: false });
  }
}

export function shouldPromptAttackSetType(scope = "our") {
  const enabled =
    scope === "opponent" ? matchState.state.opponentSetTypePromptEnabled : matchState.state.setTypePromptEnabled;
  return !!enabled;
}

export function applyAttackTrajectoryToEvent(event, payload) {
  if (!payload || !event) return;
  event.attackStart = payload.start || event.attackStart || null;
  event.attackEnd = payload.end || event.attackEnd || null;
  event.attackStartZone = payload.startZone || event.attackStartZone || null;
  event.attackEndZone = payload.endZone || event.attackEndZone || null;
  event.attackDirection = payload;
  event.attackTrajectory = payload;
  if (!event.originZone) {
    event.originZone = event.attackStartZone || event.originZone || null;
  }
  if (event.attackStartZone) {
    event.zone = event.attackStartZone;
    event.playerPosition = event.attackStartZone;
  }
}

export async function startAttackSelection(playerIdx, setTypeChoice, onDone, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  if (
    scoutUiState.attackInlinePlayer !== null &&
    scoutUiState.attackInlinePlayer !== key &&
    isPlayerKeyInScope(scoutUiState.attackInlinePlayer, scope)
  ) {
    return;
  }
  scoutUiState.attackInlinePlayer = key;
  const meta = { setType: setTypeChoice || null, playerIdx, scope };
  if (matchState.state.videoScoutMode) {
    const videoTime = getActiveVideoPlaybackSeconds();
    if (typeof videoTime === "number") meta.videoTime = videoTime;
  }
  const trajectoryEnabled =
    scope === "opponent" ? matchState.state.opponentAttackTrajectoryEnabled : matchState.state.attackTrajectoryEnabled;
  if (trajectoryEnabled) {
    const baseZone = getCurrentZoneForPlayer(playerIdx, "attack", scope);
    const forceFar = isFarSideForScope(scope);
    const coords = await openAttackTrajectoryModal({
      baseZone: baseZone || null,
      setType: setTypeChoice || null,
      forceFar,
      scope
    });
    if (coords) {
      meta.trajectory = coords;
      meta.trajectorySkipped = false;
    } else {
      meta.trajectorySkipped = true;
    }
  }
  scoutUiState.attackMetaByPlayer[key] = meta;
  if (matchState.state.useOpponentTeam && matchState.state.predictiveSkillFlow) {
    if (scope === "opponent") {
      matchState.state.opponentSkillFlowOverride = "attack";
    } else {
      matchState.state.skillFlowOverride = "attack";
    }
  }
  if (typeof onDone === "function") {
    onDone();
  }
}

export function getServeBaseZoneForPlayer(playerIdx, scope = "our") {
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players || !players[playerIdx]) return null;
  const name = players[playerIdx];
  const baseCourt = getServeDisplayCourt(scope);
  if (!baseCourt || !baseCourt.length) return null;
  const slotIdx = baseCourt.findIndex(slot => slot && slot.main === name);
  return slotIdx === -1 ? null : slotIdx + 1;
}

export async function startServeTypeSelection(playerIdx, type, onDone, scope = "our") {
  const key = makePlayerKey(scope, playerIdx);
  if (scoutUiState.serveTypeInlinePlayer !== null && scoutUiState.serveTypeInlinePlayer !== key) return;
  scoutUiState.serveTypeInlinePlayer = key;
  setServeTypeFocusPlayer(playerIdx, scope);
  removeServeTypeInlineKeyListener();
  const zone = getServeBaseZoneForPlayer(playerIdx, scope);
  if (zone !== 1) {
    scoutUiState.serveTypeInlinePlayer = null;
    return;
  }
  const meta = { serveType: type };
  const serveTrajEnabled =
    scope === "opponent" ? matchState.state.opponentServeTrajectoryEnabled : matchState.state.serveTrajectoryEnabled;
  if (serveTrajEnabled) {
    const forceFar = isFarSideForScope(scope);
    const traj = await collectServeTrajectory(Object.assign({}, meta, { forceFar, scope }));
    meta.serveType = traj.serveType || type;
    meta.serveStart = traj.serveStart || null;
    meta.serveEnd = traj.serveEnd || null;
    if (typeof traj.videoTime === "number") {
      meta.videoTime = traj.videoTime;
    }
  } else if (matchState.state.videoScoutMode) {
    const videoTime = getActiveVideoPlaybackSeconds();
    if (typeof videoTime === "number") meta.videoTime = videoTime;
  }
  const shouldQueueServe = matchState.state.useOpponentTeam && matchState.state.predictiveSkillFlow;
  if (shouldQueueServe) {
    const players = getPlayersForScope(scope);
    const fallbackServer = getServerPlayerForScope(scope);
    matchState.state.pendingServe = {
      scope,
      playerIdx,
      playerName: players[playerIdx] || (fallbackServer && fallbackServer.name) || null,
      meta
    };
    clearServeTypeInlineListener();
    if (matchState.state.forceSkillActive && matchState.state.forceSkillScope === scope) {
      matchState.state.forceSkillActive = false;
      matchState.state.forceSkillScope = null;
      if (scope === "opponent") {
        matchState.state.opponentSkillFlowOverride = null;
      } else {
        matchState.state.skillFlowOverride = null;
      }
    }
    matchState.state.flowTeamScope = getOppositeScope(scope);
    setSelectedSkillForScope(scope, playerIdx, null);
    delete scoutUiState.serveMetaByPlayer[key];
  } else {
    scoutUiState.serveMetaByPlayer[key] = meta;
  }
  if (typeof onDone === "function") {
    onDone();
  }
}

export async function collectServeTrajectory(prefill = {}) {
  const startRes = await openAttackTrajectoryModal({
    mode: "serve-start",
    start: prefill.serveStart || null,
    serveType: prefill.serveType || null,
    forceFar: prefill.forceFar,
    scope: prefill.scope
  });
  const serveType = (startRes && startRes.serveType) || prefill.serveType || "JF";
  const serveStart = startRes && startRes.point ? startRes.point : prefill.serveStart || null;
  const endRes = await openAttackTrajectoryModal({
    mode: "serve-end",
    end: prefill.serveEnd || null,
    forceFar: prefill.forceFar,
    scope: prefill.scope
  });
  const serveEnd = endRes && endRes.point ? endRes.point : prefill.serveEnd || null;
  let videoTime = null;
  if (matchState.state.videoScoutMode && endRes && endRes.point) {
    const activeVideoTime = getActiveVideoPlaybackSeconds();
    if (typeof activeVideoTime === "number") {
      videoTime = activeVideoTime;
    }
  }
  return { serveType, serveStart, serveEnd, videoTime };
}

export function changeLineupPreferredLibero(next) {
      next = next || "";
      setLineupModalPreferredLibero(next);
      saveState();
      if (scoutUiState.lineupModalScope === "opponent") {
        renderOpponentPlayers();
        renderOpponentLiberoChipsInline();
        updateOpponentRotationDisplay();
      } else {
        renderPlayers();
        renderLineupChips();
        renderLiberoChipsInline();
        updateRotationDisplay();
      }
      renderLiberoChipsInline();
      renderOpponentLiberoChipsInline();
  publishLineupView();
}
