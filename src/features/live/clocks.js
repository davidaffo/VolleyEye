import { session as matchState } from "../../../js/globals.js";

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

export function snapshotSkillClock() {
  ensureSkillClock();
  return {
    paused: !!matchState.state.skillClock.paused,
    pausedAtMs: matchState.state.skillClock.pausedAtMs || null,
    pausedAccumMs: matchState.state.skillClock.pausedAccumMs || 0,
    lastEffectiveMs: matchState.state.skillClock.lastEffectiveMs || null
  };
}

export function restoreSkillClock(snapshot) {
  ensureSkillClock();
  if (!snapshot) return;
  matchState.state.skillClock.paused = !!snapshot.paused;
  matchState.state.skillClock.pausedAtMs = snapshot.pausedAtMs || null;
  matchState.state.skillClock.pausedAccumMs = snapshot.pausedAccumMs || 0;
  matchState.state.skillClock.lastEffectiveMs = snapshot.lastEffectiveMs || null;
}

export function snapshotVideoClock() {
  ensureVideoClock();
  return {
    paused: !!matchState.state.videoClock.paused,
    pausedAtMs: matchState.state.videoClock.pausedAtMs || null,
    pausedAccumMs: matchState.state.videoClock.pausedAccumMs || 0,
    startMs: matchState.state.videoClock.startMs || Date.now(),
    currentSeconds: matchState.state.videoClock.currentSeconds || 0
  };
}

export function restoreVideoClock(snapshot) {
  ensureVideoClock();
  if (!snapshot) return;
  matchState.state.videoClock.paused = !!snapshot.paused;
  matchState.state.videoClock.pausedAtMs = snapshot.pausedAtMs || null;
  matchState.state.videoClock.pausedAccumMs = snapshot.pausedAccumMs || 0;
  matchState.state.videoClock.startMs = snapshot.startMs || Date.now();
  matchState.state.videoClock.currentSeconds = snapshot.currentSeconds || 0;
}
