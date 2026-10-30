import { resetSkillSelectionForPlayer, getServeBaseZoneForPlayer } from "../scout/selection-state.js";
import { setServeTypeFocusPlayer, removeServeTypeInlineKeyListener, clearServeTypeInlineListener } from "../scout/serve-keyboard.js";
import { getLineupModalPlayers, getLineupModalNumbers } from "../teams/lineup-selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayersForScope, makePlayerKey, isPlayerKeyInScope, isFarSideForScope, getOppositeScope } from "../teams/selectors.js";
import { session as matchState } from "../../../js/globals.js";
import { setTeamPreferredLibero, setTeamLiberoAutoMap } from "../teams/roster-data.js";
import { enforceAutoLiberoForScope, getCurrentZoneForPlayer } from "../teams/court-state-model.js";
import { publishLineupView } from "./lineup-view.js";
import { loadTeamFromStorage, extractRosterFromTeam } from "../teams/storage/team-repository.js";
import { renderLineupModal, assignPlayerToLineup } from "./lineup-editor.js";
import { trajectoryModalStore } from "../../state/roster-import-store.mjs";
import { setSelectedSkillForScope, getServerPlayerForScope } from "./flow-model.js";
import { closeSkillModal, stopErrorPickMode, getActiveVideoPlaybackSeconds } from "./live-entry.js";
import { isErrorPickModeForScope } from "../scout/pick-model.js";
import { openAttackTrajectoryModal } from "./trajectories.js";
import { saveState } from "../storage/save-state.js";
import { renderOpponentPlayers, renderPlayers } from "./team-rendering.js";
import { renderOpponentLiberoChipsInline, updateOpponentRotationDisplay, renderLiberoChipsInline, updateRotationDisplay } from "../teams/court/court-ui-bootstrap.js";

export function setLineupModalPreferredLibero(name) {
  const next = name || "";
  setTeamPreferredLibero(scoutUiState.lineupModalScope, next);
  setTeamLiberoAutoMap(scoutUiState.lineupModalScope, {});
  enforceAutoLiberoForScope(scoutUiState.lineupModalScope, { skipServerOnServe: true });
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

        renderLiberoChipsInline();
        updateRotationDisplay();
      }
      renderLiberoChipsInline();
      renderOpponentLiberoChipsInline();
  publishLineupView();
}
