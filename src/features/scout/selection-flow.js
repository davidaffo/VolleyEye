import { getServeBaseZoneForPlayer } from "./selection-state.js";
import { setServeTypeFocusPlayer, removeServeTypeInlineKeyListener, clearServeTypeInlineListener } from "./serve-keyboard.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getPlayersForScope, makePlayerKey, isPlayerKeyInScope, isFarSideForScope, getOppositeScope } from "../teams/selectors.js";
import { session as matchState } from "../../../js/globals.js";
import { getCurrentZoneForPlayer } from "../teams/court-state-model.js";
import { setSelectedSkillForScope, getServerPlayerForScope } from "../live/flow-model.js";
import { getActiveVideoPlaybackSeconds } from "../video/media-state.js";
import { openAttackTrajectoryModal } from "./trajectory-dialog.js";

export async function startAttackSelection(playerIdx, setTypeChoice, onDone, scope = "our") {
  const flowVersion = scoutUiState.partialSkillFlowVersions[scope];
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
    if (flowVersion !== scoutUiState.partialSkillFlowVersions[scope]) return;
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
  const flowVersion = scoutUiState.partialSkillFlowVersions[scope];
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
    if (flowVersion !== scoutUiState.partialSkillFlowVersions[scope]) return;
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
  const flowVersion = scoutUiState.partialSkillFlowVersions[prefill.scope || "our"];
  const startRes = await openAttackTrajectoryModal({
    mode: "serve-start",
    start: prefill.serveStart || null,
    serveType: prefill.serveType || null,
    forceFar: prefill.forceFar,
    scope: prefill.scope
  });
  if (flowVersion !== scoutUiState.partialSkillFlowVersions[prefill.scope || "our"]) return null;
  const serveType = (startRes && startRes.serveType) || prefill.serveType || "JF";
  const serveStart = startRes && startRes.point ? startRes.point : prefill.serveStart || null;
  const endRes = await openAttackTrajectoryModal({
    mode: "serve-end",
    end: prefill.serveEnd || null,
    forceFar: prefill.forceFar,
    scope: prefill.scope
  });
  if (flowVersion !== scoutUiState.partialSkillFlowVersions[prefill.scope || "our"]) return null;
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
