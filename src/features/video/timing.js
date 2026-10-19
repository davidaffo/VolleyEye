import { session as matchState } from '../../../js/globals.js';

export function computeEventVideoTime(ev, baseMs) {
  if (ev && typeof ev.videoTime === "number") {
    return Math.max(0, ev.videoTime);
  }
  const offset =
    matchState.state.video && typeof matchState.state.video.offsetSeconds === "number" ? matchState.state.video.offsetSeconds : 0;
  if (!ev) return Math.max(0, offset);
  const base = typeof baseMs === "number" ? baseMs : null;
  if (!base) return Math.max(0, offset);
  const evMs = new Date(ev.t).getTime();
  const delta = isNaN(evMs) ? 0 : (evMs - base) / 1000;
  if (!isFinite(delta)) return Math.max(0, offset);
  return Math.max(0, offset + delta);
}

export function formatVideoTimestamp(seconds) {
  if (!isFinite(seconds)) return "00:00:00";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}

export function parseYoutubeId(url) {
  if (!url) return "";
  try {
    const u = new URL(url.trim());
    if (!["http:", "https:"].includes(u.protocol)) return "";
    const host = u.hostname.toLowerCase();
    let id = "";
    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      id = u.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      id = u.searchParams.get("v") || "";
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
  } catch (_) {
    return "";
  }
}
