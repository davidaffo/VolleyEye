import { computeEventVideoTime } from "./timing.js";

export function getDefaultSkillDurationMs() {
  return 5000;
}

export function getPlayByPlayStartTime(row, baseMs) {
  if (!row) return null;
  if (typeof row.videoTime === "number" && isFinite(row.videoTime))
    return row.videoTime;
  const ev = row.ev || {};
  if (typeof ev.videoTime === "number" && isFinite(ev.videoTime))
    return ev.videoTime;
  return computeEventVideoTime(ev, baseMs);
}

export function getPlayByPlayDurationSeconds(ev) {
  const baseMs =
    ev && typeof ev.durationMs === "number" && isFinite(ev.durationMs)
      ? ev.durationMs
      : getDefaultSkillDurationMs();
  const seconds = baseMs != null ? baseMs / 1000 : 5;
  return Math.max(0.1, seconds);
}
