import { captureScoutActionSnapshot, attachScoutActionSnapshot } from "./history-model.js";
import { session as matchState } from "../../../js/globals.js";
import { getCurrentZoneForPlayer } from "../teams/court-state-model.js";
import { getTeamOfficialMetaForScope, sanitizeOfficialString, getPlayerOfficialCodeForScope, normalizeDataVolleyEventMeta } from "../teams/player-identity.js";
import { getPlayersForScope, getPlayerNumbersForScope, getTeamNameForScope } from "../teams/selectors.js";
import { getDefaultSkillDurationMs } from "../video/playback-model.js";
import { computePointsSummary } from "../analysis/scores.js";
import { ensureSkillClock, getSkillClockMs, ensureVideoClock, getVideoClockSeconds } from "../live/clocks.js";
import { getActiveVideoPlaybackSeconds } from "../video/media-state.js";
import { clearReceiveContext } from "../live/flow-model.js";
import { ensureSetStartSnapshot } from "../analysis/player-model.js";

export function getNextEventId() {
  const maxId = (matchState.state.events || []).reduce((max, ev) => {
    const val = typeof ev.eventId === "number" ? ev.eventId : 0;
    return val > max ? val : max;
  }, 0);
  return maxId + 1;
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
    prevSetResults: base.prevSetResults || null,
    nextSetResults: base.nextSetResults || null,
    prevSetStarts: base.prevSetStarts || null,
    nextSetStarts: base.nextSetStarts || null,
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

export function recordSetAction(actionType, payload) {
  ensureSetStartSnapshot(matchState.state.currentSet || 1);
  const code = payload && payload.code ? payload.code : actionType;
  const event = buildBaseEventPayload(
    Object.assign({}, payload, {
      skillId: "manual",
      code,
      actionType
    })
  );
  clearReceiveContext();
  if (actionType === "timeout") attachScoutActionSnapshot(event, captureScoutActionSnapshot());
  matchState.state.events.push(event);
  return event;
}
