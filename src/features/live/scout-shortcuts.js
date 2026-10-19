import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { session as liveScoreAndSetState } from "../state/live-live-score-and-set.js";
import { getSelectedVideoAttackEvents, applyAttackFieldToEvents } from "./team-management.js";
import { publishReactSetTypeShortcuts } from "../archive/database-controls.js";
import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { saveState } from "../storage/save-state.js";
import { renderPlayers } from "./team-rendering.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { isYoutubePlayerPlaying } from "./live-entry.js";
import { updateSetTypeVisibility } from "./game-flow.js";
import { getPredictedSkillId } from "./flow-model.js";
import { listenRuntime } from "../../app/browser-effects.js";



export function formatSetTypeLabelWithShortcut(value, label) {
  const key = normalizeSetTypeValue(value);
  const shortcut = key ? liveScoreAndSetState.SET_TYPE_SHORTCUTS[key.toLowerCase()] : null;
  const base = label || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "");
  return shortcut ? `${base} (${shortcut})` : base;
}

export function renderSetTypeShortcuts() { publishReactSetTypeShortcuts(); }

export function setNextSetType(val) {
  const normalized = normalizeSetTypeValue(val) || "";
  if (!normalized) {
    scoutUiState.queuedSetTypeChoice = null;
  }
  matchState.state.nextSetType = normalized;
  saveState();
  renderSetTypeShortcuts();
  // Aggiorna subito le card/skill aperte per mostrare il nuovo tipo alzata
  renderPlayers();
}

export function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (!tag) return false;
  const editable = el.isContentEditable;
  if (editable) return true;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}

export function getActiveVideoElement() {
  if (rosterLineupState.activeTab === "video") return matchState.elAnalysisVideo || null;
  if (rosterLineupState.activeTab === "scout" && matchState.state.videoScoutMode) return matchState.elAnalysisVideoScout || null;
  return null;
}

export function getActiveYoutubeController() {
  if (!matchState.state.video || !matchState.state.video.youtubeId) return null;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  const preferScout = !!matchState.state.videoScoutMode && activeTab !== "video";
  if (preferScout && workspaceLayoutState.ytPlayerScout && workspaceLayoutState.ytPlayerScoutReady) {
    return { player: workspaceLayoutState.ytPlayerScout, ready: workspaceLayoutState.ytPlayerScoutReady };
  }
  if (workspaceLayoutState.ytPlayer && workspaceLayoutState.ytPlayerReady) {
    return { player: workspaceLayoutState.ytPlayer, ready: workspaceLayoutState.ytPlayerReady };
  }
  return null;
}

export function toggleYoutubePlayback() {
  const ctrl = getActiveYoutubeController();
  if (!ctrl || !ctrl.player) return false;
  const playing = isYoutubePlayerPlaying(ctrl.player, ctrl.ready);
  if (playing && typeof ctrl.player.pauseVideo === "function") {
    ctrl.player.pauseVideo();
    return true;
  }
  if (!playing && typeof ctrl.player.playVideo === "function") {
    ctrl.player.playVideo();
    return true;
  }
  return false;
}

export function handleVideoShortcut(e) {
  if (e.defaultPrevented) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (isTypingTarget(e.target)) return;
  if (matchState.elSkillModal && !matchState.elSkillModal.classList.contains("hidden")) return;
  const video = getActiveVideoElement();
  const ytCtrl = getActiveYoutubeController();
  if (!video && !ytCtrl) return;
  const duration = video && Number.isFinite(video.duration) ? video.duration : null;
  const clampTime = next => {
    if (duration == null) return Math.max(0, next);
    return Math.max(0, Math.min(duration, next));
  };
  const seekBy = delta => {
    if (ytCtrl && ytCtrl.player && typeof ytCtrl.player.getCurrentTime === "function") {
      const wasPlaying = isYoutubePlayerPlaying(ytCtrl.player, ytCtrl.ready);
      const current = ytCtrl.player.getCurrentTime();
      if (!isFinite(current)) return;
      ytCtrl.player.seekTo(Math.max(0, current + delta), true);
      if (wasPlaying && typeof ytCtrl.player.playVideo === "function") {
        ytCtrl.player.playVideo();
      }
      return;
    }
    if (!video) return;
    const wasPaused = video.paused;
    video.currentTime = clampTime(video.currentTime + delta);
    if (!wasPaused) {
      video.play().catch(() => {});
    }
  };
  if (e.code === "Space") {
    e.preventDefault();
    if (ytCtrl && toggleYoutubePlayback()) return;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    return;
  }
  if (e.shiftKey && e.key === "ArrowRight") {
    e.preventDefault();
    seekBy(1 / 30);
    return;
  }
  if (e.shiftKey && e.key === "ArrowLeft") {
    e.preventDefault();
    seekBy(-1 / 30);
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    seekBy(3);
    return;
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    seekBy(-3);
    return;
  }
}

export function stepActiveVideoByFrame(direction) {
  const delta = (direction || 0) * (1 / 30);
  if (!delta) return;
  const video = getActiveVideoElement();
  const ytCtrl = getActiveYoutubeController();
  if (!video && !ytCtrl) return;
  if (ytCtrl && ytCtrl.player && typeof ytCtrl.player.getCurrentTime === "function") {
    const wasPlaying = isYoutubePlayerPlaying(ytCtrl.player, ytCtrl.ready);
    const current = ytCtrl.player.getCurrentTime();
    if (!isFinite(current)) return;
    ytCtrl.player.seekTo(Math.max(0, current + delta), true);
    if (wasPlaying && typeof ytCtrl.player.playVideo === "function") {
      ytCtrl.player.playVideo();
    }
    return;
  }
  if (!video) return;
  const duration = Number.isFinite(video.duration) ? video.duration : null;
  const clampTime = next => {
    if (duration == null) return Math.max(0, next);
    return Math.max(0, Math.min(duration, next));
  };
  const wasPaused = video.paused;
  video.currentTime = clampTime(video.currentTime + delta);
  if (!wasPaused) {
    video.play().catch(() => {});
  }
}

export function syncMatchInfoInputs(match) {
  if (!match) return;
  const opponent = document.getElementById("match-opponent");
  const category = document.getElementById("match-category");
  const date = document.getElementById("match-date");
  const matchType = document.getElementById("match-type");
  const leg = document.getElementById("match-leg");
  if (opponent) opponent.value = match.opponent || "";

}

export function handleSetTypeHotkeys(e) {
  if (e.defaultPrevented) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (isTypingTarget(e.target)) return;
  const isVideoTab = document && document.body && document.body.dataset.activeTab === "video";
  if (isVideoTab && (e.key === "q" || e.key === "Q" || e.key === "w" || e.key === "W")) {
    return;
  }
  if (e.key === "Escape") {
    setNextSetType("");
    e.preventDefault();
    return;
  }
  const keyMap = {
    m: "mezza",
    M: "mezza",
    s: "super",
    S: "super",
    q: "quick",
    Q: "quick",
    v: "veloce",
    V: "veloce",
    f: "fast",
    F: "fast",
    d: "Damp",
    D: "Damp",
    h: "alta",
    H: "alta"
  };
  const choice = keyMap[e.key];
  if (!choice) return;
  const videoAttackEvents = getSelectedVideoAttackEvents();
  if (videoAttackEvents.length) {
    e.preventDefault();
    applyAttackFieldToEvents(videoAttackEvents, ev => {
      ev.setType = choice;
    });
    return;
  }
  if (isVideoTab) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  scoutUiState.queuedSetTypeChoice = choice;
  setNextSetType(choice);
}

export function initSetTypeShortcuts() {
  renderSetTypeShortcuts();
  updateSetTypeVisibility(getPredictedSkillId());
  listenRuntime(document, "keydown", handleSetTypeHotkeys);
}
