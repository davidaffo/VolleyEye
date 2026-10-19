
import { normalizePhaseValue } from "../analysis/values.js";

import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { session as browserEffectsState } from "../../app/browser-effects.js";
import { renderPlayers } from "./team-rendering.js";
import { saveState } from "../storage/save-state.js";
import { getCurrentZoneForPlayer } from "../analysis/stats-update.js";
import { scrollToActiveCourtOnMobileAlways, isDesktopCourtModalLayout, setCourtAreaLocked, setModalOpenState } from "../layout/modals.js";
import { updateCourtModalPlacement } from "../scout-ui.js";
import { getTeamOfficialMetaForScope, sanitizeOfficialString, getPlayerOfficialCodeForScope, normalizeDataVolleyEventMeta } from "../teams/player-identity.js";
import { getPlayersForScope, getPlayerNumbersForScope, getTeamNameForScope } from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { renderEventsLog, getDefaultSkillDurationMs } from "../video/video-events.js";
import { renderLiveScore, renderScoreAndRotations, addPlayerPoint } from "./live-score-and-set.js";
import { computePointsSummary } from "../analysis/scores.js";
import { renderAggregatedTable } from "../analysis/aggregated-table.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { publishSkillModalCancel, publishSkillModalChoice, publishSkillModalCodes, setSkillModalOpen } from "../scout/skill-dialog.js";
import { resetSkillSelectionForPlayer } from "./skill-selection.js";
import { getSortedPlayerEntriesForScope } from "../teams/lineup-selectors.js";
import { ensureCourtShapeFor } from "../teams/court-model.js";

import { publishAttributionView, setAttributionOpen } from "../scout/attribution-view.js";





export function formatAttackPhaseLabel(val) {
  const phase = normalizePhaseValue(val);
  if (phase === "bp") return "BP";
  if (phase === "so") return "SO";
  return "";
}

export function getNextEventId() {
  const maxId = (matchState.state.events || []).reduce((max, ev) => {
    const val = typeof ev.eventId === "number" ? ev.eventId : 0;
    return val > max ? val : max;
  }, 0);
  return maxId + 1;
}

export function ensureSkillClock() {
  matchState.state.skillClock = matchState.state.skillClock || { paused: false, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: null };
  if (typeof matchState.state.skillClock.paused !== "boolean") matchState.state.skillClock.paused = false;
  if (typeof matchState.state.skillClock.pausedAccumMs !== "number") matchState.state.skillClock.pausedAccumMs = 0;
  return matchState.state.skillClock;
}

export function getSkillClockMs() {
  ensureSkillClock();
  if (matchState.state.skillClock.paused) {
    return matchState.state.skillClock.lastEffectiveMs || 0;
  }
  return Date.now() - (matchState.state.skillClock.pausedAccumMs || 0);
}

export function pauseSkillClock() {
  ensureSkillClock();
  if (matchState.state.skillClock.paused) return;
  matchState.state.skillClock.lastEffectiveMs = getSkillClockMs();
  matchState.state.skillClock.pausedAtMs = Date.now();
  matchState.state.skillClock.paused = true;
}

export function resumeSkillClock() {
  ensureSkillClock();
  if (!matchState.state.skillClock.paused) return;
  const now = Date.now();
  const pausedAt = matchState.state.skillClock.pausedAtMs || now;
  matchState.state.skillClock.pausedAccumMs = (matchState.state.skillClock.pausedAccumMs || 0) + Math.max(0, now - pausedAt);
  matchState.state.skillClock.paused = false;
  matchState.state.skillClock.pausedAtMs = null;
  matchState.state.skillClock.lastEffectiveMs = null;
}

export function ensureVideoClock() {
  const offset = matchState.state.video && typeof matchState.state.video.offsetSeconds === "number" ? matchState.state.video.offsetSeconds : 0;
  matchState.state.videoClock = matchState.state.videoClock || {
    startMs: Date.now(),
    paused: false,
    pausedAtMs: null,
    pausedAccumMs: 0,
    currentSeconds: offset
  };
  if (typeof matchState.state.videoClock.paused !== "boolean") matchState.state.videoClock.paused = false;
  if (typeof matchState.state.videoClock.pausedAccumMs !== "number") matchState.state.videoClock.pausedAccumMs = 0;
  if (typeof matchState.state.videoClock.startMs !== "number") matchState.state.videoClock.startMs = Date.now();
  if (typeof matchState.state.videoClock.currentSeconds !== "number") matchState.state.videoClock.currentSeconds = offset;
  return matchState.state.videoClock;
}

export function getVideoClockSeconds() {
  ensureVideoClock();
  const offset = matchState.state.video && typeof matchState.state.video.offsetSeconds === "number" ? matchState.state.video.offsetSeconds : 0;
  if (matchState.state.videoClock.paused) {
    return matchState.state.videoClock.currentSeconds || offset;
  }
  const elapsed = Date.now() - (matchState.state.videoClock.startMs || Date.now()) - (matchState.state.videoClock.pausedAccumMs || 0);
  const seconds = Math.max(0, offset + elapsed / 1000);
  matchState.state.videoClock.currentSeconds = seconds;
  return seconds;
}

export function pauseVideoClock() {
  ensureVideoClock();
  if (matchState.state.videoClock.paused) return;
  matchState.state.videoClock.currentSeconds = getVideoClockSeconds();
  matchState.state.videoClock.pausedAtMs = Date.now();
  matchState.state.videoClock.paused = true;
}

export function resumeVideoClock() {
  ensureVideoClock();
  if (!matchState.state.videoClock.paused) return;
  const now = Date.now();
  const pausedAt = matchState.state.videoClock.pausedAtMs || now;
  matchState.state.videoClock.pausedAccumMs = (matchState.state.videoClock.pausedAccumMs || 0) + Math.max(0, now - pausedAt);
  matchState.state.videoClock.paused = false;
  matchState.state.videoClock.pausedAtMs = null;
}

export function getActiveVideoPlaybackSeconds() {
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  const preferScout = !!matchState.state.videoScoutMode && activeTab !== "video";
  if (matchState.state.video && matchState.state.video.youtubeId) {
    const scoutFirst =
      preferScout &&
      workspaceLayoutState.ytPlayerScout &&
      workspaceLayoutState.ytPlayerScoutReady &&
      typeof workspaceLayoutState.ytPlayerScout.getCurrentTime === "function";
    if (scoutFirst) {
      const t = workspaceLayoutState.ytPlayerScout.getCurrentTime();
      if (isFinite(t)) return Math.max(0, t);
    }
    if (workspaceLayoutState.ytPlayer && workspaceLayoutState.ytPlayerReady && typeof workspaceLayoutState.ytPlayer.getCurrentTime === "function") {
      const t = workspaceLayoutState.ytPlayer.getCurrentTime();
      if (isFinite(t)) return Math.max(0, t);
    }
    if (
      workspaceLayoutState.ytPlayerScout &&
      workspaceLayoutState.ytPlayerScoutReady &&
      typeof workspaceLayoutState.ytPlayerScout.getCurrentTime === "function"
    ) {
      const t = workspaceLayoutState.ytPlayerScout.getCurrentTime();
      if (isFinite(t)) return Math.max(0, t);
    }
    return null;
  }
  if (preferScout && matchState.elAnalysisVideoScout && typeof matchState.elAnalysisVideoScout.currentTime === "number") {
    return Math.max(0, matchState.elAnalysisVideoScout.currentTime || 0);
  }
  if (matchState.elAnalysisVideo && typeof matchState.elAnalysisVideo.currentTime === "number") {
    return Math.max(0, matchState.elAnalysisVideo.currentTime || 0);
  }
  if (matchState.elAnalysisVideoScout && typeof matchState.elAnalysisVideoScout.currentTime === "number") {
    return Math.max(0, matchState.elAnalysisVideoScout.currentTime || 0);
  }
  return null;
}

export function isVideoElementPlaying(videoEl) {
  return !!(videoEl && !videoEl.paused && !videoEl.ended && videoEl.readyState >= 2);
}

export function isYoutubePlayerPlaying(player, readyFlag) {
  if (!readyFlag || !player || typeof player.getPlayerState !== "function") return false;
  try {
    return player.getPlayerState() === 1;
  } catch (_) {
    return false;
  }
}

export function isVideoPlaybackActive() {
  if (matchState.state.video && matchState.state.video.youtubeId) {
    if (isYoutubePlayerPlaying(workspaceLayoutState.ytPlayerScout, workspaceLayoutState.ytPlayerScoutReady)) return true;
    if (isYoutubePlayerPlaying(workspaceLayoutState.ytPlayer, workspaceLayoutState.ytPlayerReady)) return true;
    return false;
  }
  return isVideoElementPlaying(matchState.elAnalysisVideoScout) || isVideoElementPlaying(matchState.elAnalysisVideo);
}

export function scheduleVideoSafeRender(task) {
  if (typeof task !== "function") return;
  if (!matchState.state.videoScoutMode || !isVideoPlaybackActive()) {
    task();
    return;
  }
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(task, { timeout: 200 });
    return;
  }
  browserEffectsState.setTimeout(task, 60);
}

export function scheduleRenderPlayers() {
  scheduleVideoSafeRender(renderPlayers);
}

export function schedulePostEventUpdates({
  suppressScroll = false,
  includeAggregates = true,
  append = true,
  playerIdx = null,
  skillId = null,
  persistLocal = false,
  scope = "our"
} = {}) {
  scheduleVideoSafeRender(() => {
    saveState({ persistLocal });
    renderPlayers();
    scrollToActiveCourtOnMobileAlways();
    renderEventsLog({ suppressScroll, append });
    if (includeAggregates) {
      renderLiveScore();
      renderScoreAndRotations(computePointsSummary());
      renderAggregatedTable();
      renderVideoAnalysis();
      renderTrajectoryAnalysis();
      renderServeTrajectoryAnalysis();
    }
  });
}

export function updateVideoPlaybackSnapshot(forcedSeconds = null, force = false) {
  if (typeof window !== "undefined" && window.__appResetInProgress) return;
  if (!matchState.state.video) return;
  const now = Date.now();
  if (!force && now - workspaceLayoutState.lastVideoSnapshotMs < 1500) return;
  const playback =
    typeof forcedSeconds === "number" && isFinite(forcedSeconds)
      ? forcedSeconds
      : getActiveVideoPlaybackSeconds();
  if (typeof playback !== "number" || !isFinite(playback)) return;
  workspaceLayoutState.lastVideoSnapshotMs = now;
  matchState.state.video.lastPlaybackSeconds = Math.max(0, playback);
  saveState({ persistLocal: true });
}

export function startVideoPlaybackSnapshotTimer() {
  if (workspaceLayoutState.videoSnapshotTimer) return;
  workspaceLayoutState.videoSnapshotTimer = browserEffectsState.setInterval(() => {
    if (!matchState.state.video || !matchState.state.video.youtubeId) return;
    updateVideoPlaybackSnapshot();
  }, 2000);
}

export function getEventVideoSeconds(baseVideoTime = null) {
  if (typeof baseVideoTime === "number") return Math.max(0, baseVideoTime);
  if (matchState.state.videoScoutMode) {
    const playback = getActiveVideoPlaybackSeconds();
    if (typeof playback === "number") return Math.max(0, playback);
  }
  if (!matchState.state.events || matchState.state.events.length === 0) {
    ensureVideoClock();
    if (
      matchState.state.videoClock.paused &&
      (matchState.state.videoClock.currentSeconds || 0) === 0 &&
      matchState.state.videoClock.pausedAccumMs === 0
    ) {
      matchState.state.videoClock.startMs = Date.now();
      matchState.state.videoClock.currentSeconds = 0;
      matchState.state.videoClock.paused = false;
      matchState.state.videoClock.pausedAtMs = null;
    }
    return 0;
  }
  return getVideoClockSeconds();
}

export function buildBaseEventPayload(base) {
  ensureSkillClock();
  if (
    (!matchState.state.events || matchState.state.events.length === 0) &&
    matchState.state.skillClock &&
    matchState.state.skillClock.pausedAccumMs === 0 &&
    !matchState.state.skillClock.pausedAtMs &&
    !matchState.state.skillClock.lastEffectiveMs
  ) {
    matchState.state.skillClock.pausedAccumMs = Date.now();
    matchState.state.skillClock.paused = false;
    matchState.state.skillClock.pausedAtMs = null;
    matchState.state.skillClock.lastEffectiveMs = 0;
  }
  ensureVideoClock();
  if (
    (!matchState.state.events || matchState.state.events.length === 0) &&
    matchState.state.videoClock &&
    matchState.state.videoClock.paused &&
    matchState.state.videoClock.pausedAccumMs === 0 &&
    !matchState.state.videoClock.pausedAtMs &&
    (matchState.state.videoClock.currentSeconds || 0) === 0
  ) {
    const offset = matchState.state.video && typeof matchState.state.video.offsetSeconds === "number" ? matchState.state.video.offsetSeconds : 0;
    matchState.state.videoClock.startMs = Date.now();
    matchState.state.videoClock.currentSeconds = Math.max(0, offset);
    matchState.state.videoClock.paused = false;
    matchState.state.videoClock.pausedAtMs = null;
  }
  const now = new Date();
  const nowIso = now.toISOString();
  const clockMs = getSkillClockMs();
  let videoSeconds = getEventVideoSeconds(base && base.videoTime);
  if (
    (!matchState.state.events || matchState.state.events.length === 0) &&
    !matchState.state.videoScoutMode &&
    !(base && typeof base.videoTime === "number")
  ) {
    ensureVideoClock();
    matchState.state.videoClock.startMs = Date.now();
    matchState.state.videoClock.pausedAccumMs = 0;
    matchState.state.videoClock.paused = false;
    matchState.state.videoClock.pausedAtMs = null;
    matchState.state.videoClock.currentSeconds = 0;
    videoSeconds = 0;
  }
  const teamScope = (base && (base.teamScope || base.team)) || "our";
  const teamMeta = getTeamOfficialMetaForScope(teamScope);
  const playerNumberAtEvent =
    typeof base.playerNumberAtEvent === "string"
      ? base.playerNumberAtEvent
      : (() => {
          const playerName =
            base.playerName ||
            (typeof base.playerIdx === "number" ? getPlayersForScope(teamScope)[base.playerIdx] : "") ||
            "";
          const numbers = getPlayerNumbersForScope(teamScope);
          return playerName && numbers[playerName] !== undefined && numbers[playerName] !== null
            ? String(numbers[playerName])
            : "";
        })();
  const rotationValue = teamScope === "opponent" ? matchState.state.opponentRotation : matchState.state.rotation;
  const rotation = Math.min(6, Math.max(1, parseInt(rotationValue, 10) || 1));
  const scoreSnapshot = computePointsSummary(matchState.state.currentSet || 1);
  const zone =
    typeof base.playerIdx === "number"
      ? getCurrentZoneForPlayer(base.playerIdx, base.skillId, teamScope)
      : null;
  const lastEvent = matchState.state.events && matchState.state.events.length > 0 ? matchState.state.events[matchState.state.events.length - 1] : null;
  const lastEventTime = lastEvent ? lastEvent.t : null;
  const durationMs = getDefaultSkillDurationMs();
  return {
    eventId: getNextEventId(),
    t: nowIso,
    durationMs: durationMs,
    clockMs,
    set: matchState.state.currentSet,
    rotation,
    courtSideSwapped: !!matchState.state.courtSideSwapped,
    playerIdx: base.playerIdx,
    playerId: base.playerId || null,
    playerCodeOfficial: sanitizeOfficialString(base.playerCodeOfficial) || getPlayerOfficialCodeForScope(teamScope, base.playerIdx, base.playerName),
    playerNumberAtEvent,
    playerName:
      base.playerName ||
      (typeof base.playerIdx === "number"
        ? getPlayersForScope(teamScope)[base.playerIdx]
        : base.playerName) ||
      null,
    zone,
    originZone: zone,
    skillId: base.skillId,
    code: base.code,
    pointDirection: base.pointDirection || null,
    value: base.value,
    autoRotationDirection: null,
    autoRotateNext: null,
    setterPosition: rotation,
    opponentSetterPosition:
      teamScope === "opponent"
        ? Math.min(6, Math.max(1, parseInt(matchState.state.rotation, 10) || 1))
        : Math.min(6, Math.max(1, parseInt(matchState.state.opponentRotation, 10) || 1)),
    playerPosition: zone,
    receivePosition: null,
    base: base.base || null,
    setType: base.setType || null,
    combination: base.combination || null,
    serveStart: null,
    serveEnd: null,
    serveType: null,
    receiveEvaluation: null,
    attackEvaluation: null,
    attackBp: null,
    attackType: null,
    attackStartZone: null,
    attackEndZone: null,
    attackStart: null,
    attackEnd: null,
    attackDirection: null,
    blockNumber: null,
    errorType: base.errorType || null,
    playerIn: base.playerIn || null,
    playerOut: base.playerOut || null,
    relatedEvents: base.relatedEvents || [],
    team: teamScope === "opponent" ? "opponent" : "our",
    teamName: getTeamNameForScope(teamScope),
    teamCodeOfficial: sanitizeOfficialString(base.teamCodeOfficial) || teamMeta.teamCodeOfficial || "",
    teamIdOfficial: sanitizeOfficialString(base.teamIdOfficial) || teamMeta.teamIdOfficial || "",
    homeScore: scoreSnapshot.totalFor || 0,
    visitorScore: scoreSnapshot.totalAgainst || 0,
    actionType: base.actionType || null,
    prevSet: base.prevSet || null,
    nextSet: base.nextSet || null,
    prevMatchFinished: base.prevMatchFinished || null,
    nextMatchFinished: base.nextMatchFinished || null,
    prevClock: base.prevClock || null,
    nextClock: base.nextClock || null,
    prevVideoClock: base.prevVideoClock || null,
    nextVideoClock: base.nextVideoClock || null,
    videoTime: videoSeconds,
    dv: normalizeDataVolleyEventMeta(base.dv)
  };
}

export function setSkillModalCancelVisibility(visible) {
  if (!matchState.elSkillModalCancel) return;
  publishSkillModalCancel(visible);
}

export function renderSkillChoice(playerIdx, playerName, scope = "our") {
  if (matchState.state.matchFinished) {
    alert("Partita in pausa. Riprendi per continuare lo scout.");
    return;
  }
  if (!matchState.elSkillModalBody) return;

 publishSkillModalChoice(playerIdx, playerName, scope); return;
}

export function renderSkillCodes(playerIdx, playerName, skillId, scope = "our") {
  if (!matchState.elSkillModalBody) return;

 publishSkillModalCodes(playerIdx, playerName, skillId, scope); return;
}

export function openSkillModal(playerIdx, playerName, scope = "our") {
  if (!matchState.elSkillModal || !matchState.elSkillModalBody) return;
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const players = getPlayersForScope(scope);
  if (isNaN(idx) || !players[idx]) return;
  renderSkillChoice(idx, playerName, scope);
  setSkillModalOpen(true);
  setModalOpenState(true);
}

export function openSkillCodesModal(playerIdx, playerName, skillId, scope = "our") {
  if (!matchState.elSkillModal || !matchState.elSkillModalBody) return;
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const players = getPlayersForScope(scope);
  if (isNaN(idx) || !players[idx]) return;
  if (!skillId) return;
  renderSkillCodes(idx, playerName, skillId, scope);
  setSkillModalOpen(true);
  setModalOpenState(true);
}

export function cancelSkillModalFlow() {
  if (!scoutUiState.activeSkillModalContext) return;
  const { playerIdx, playerName, scope } = scoutUiState.activeSkillModalContext;
  resetSkillSelectionForPlayer(playerIdx, scope);
  renderSkillChoice(playerIdx, playerName, scope);
}

export function closeSkillModal() {
  if (!matchState.elSkillModal) return;
  setSkillModalOpen(false);
  setModalOpenState(false);
  scoutUiState.activeSkillModalContext = null;
  setSkillModalCancelVisibility(false);
}

export function isErrorPickModeForScope(scope) {
  return !!(scoutUiState.errorPickModeState && scoutUiState.errorPickModeState.scope === scope);
}

export function isPointPickModeForScope(scope) {
  return !!(scoutUiState.pointPickModeState && scoutUiState.pointPickModeState.scope === scope);
}

export function stopErrorPickMode(options = {}) {
  if (!scoutUiState.errorPickModeState) return;
  scoutUiState.errorPickModeState = null;
  if (options && options.render === false) return;
  renderPlayers();
}

export function stopPointPickMode(options = {}) {
  if (!scoutUiState.pointPickModeState) return;
  scoutUiState.pointPickModeState = null;
  if (options && options.render === false) return;
  renderPlayers();
}

export function startErrorPickMode(scope = "our") {
  const players = getPlayersForScope(scope);
  if (!players || players.length === 0) {
    openErrorModal({ scope });
    return;
  }
  stopPointPickMode({ render: false });
  closeSkillModal();
  closePointModal();
  closeErrorModal();
  scoutUiState.errorPickModeState = { scope };
  renderPlayers();
}

export function startPointPickMode(scope = "our") {
  const players = getPlayersForScope(scope);
  if (!players || players.length === 0) {
    openPointModal();
    return;
  }
  stopErrorPickMode({ render: false });
  closeSkillModal();
  closeErrorModal();
  closePointModal();
  scoutUiState.pointPickModeState = { scope };
  renderPlayers();
}

export function openErrorModalForPickedPlayer(scope, playerIdx, playerName) {
  stopErrorPickMode({ render: false });
  openErrorModal({
    scope,
    playerIdx,
    playerName,
    fromPicker: true
  });
}

export function applyPointForPickedPlayer(scope, playerIdx, playerName) {
  addPlayerPoint(playerIdx, playerName, scope);
  stopPointPickMode();
}

export function getBenchEntriesForScope(scope) {
  const players = getPlayersForScope(scope) || [];
  if (!players.length) return [];
  const courtSource = scope === "opponent" ? matchState.state.opponentCourt || [] : matchState.state.court || [];
  const court =
    (ensureCourtShapeFor(courtSource));
  const inCourt = new Set();
  court.forEach(slot => {
    const name = slot && slot.main ? slot.main : "";
    if (name) inCourt.add(name);
  });
  const entries = getSortedPlayerEntriesForScope(scope);
  return entries.filter(entry => entry && entry.name && !inCourt.has(entry.name));
}

export function renderErrorModal() {
  if (!matchState.elErrorModalBody) return;

 publishAttributionView("error"); return;
}

export function renderPointModal() {
  if (!matchState.elPointModalBody) return;

 publishAttributionView("point"); return;
}

export function openErrorModal(prefill = null) {
  if (!matchState.elErrorModal) return;
  stopErrorPickMode({ render: false });
  scoutUiState.errorModalPrefillPlayer = prefill;
  renderErrorModal();
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  setAttributionOpen("error", true);
  setModalOpenState(true);
}

export function closeErrorModal() {
  if (!matchState.elErrorModal) return;
  setAttributionOpen("error", false);
  scoutUiState.errorModalPrefillPlayer = null;
  setModalOpenState(false);
}

export function openPointModal() {
  if (!matchState.elPointModal) return;
  renderPointModal();
  if (isDesktopCourtModalLayout()) {
    setCourtAreaLocked(true);
  }
  updateCourtModalPlacement();
  setAttributionOpen("point", true);
  setModalOpenState(true);
}

export function closePointModal() {
  if (!matchState.elPointModal) return;
  setAttributionOpen("point", false);
  setModalOpenState(false);
}

