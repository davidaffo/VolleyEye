import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { session as browserEffectsState } from "../../app/browser-effects.js";
import { saveState } from "../storage/save-state.js";
import { buildYoutubeEmbedSrc, queueYoutubeSeek } from "./youtube-player.js";

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

export function seekVideoToTime(seconds, options = {}) {
  if (!isFinite(seconds)) return;
  const preservePlayback = !!options.preservePlayback;
  const target = Math.max(0, seconds);
  updateVideoPlaybackSnapshot(target, true);
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  const preferScout = !!matchState.state.videoScoutMode && activeTab !== "video";
  const wasPlaying =
    matchState.state.video && matchState.state.video.youtubeId
      ? (preferScout ? isYoutubePlayerPlaying(workspaceLayoutState.ytPlayerScout, workspaceLayoutState.ytPlayerScoutReady) : false) ||
        isYoutubePlayerPlaying(workspaceLayoutState.ytPlayer, workspaceLayoutState.ytPlayerReady)
      : isVideoElementPlaying(preferScout ? matchState.elAnalysisVideoScout : matchState.elAnalysisVideo) ||
        isVideoElementPlaying(matchState.elAnalysisVideoScout) ||
        isVideoElementPlaying(matchState.elAnalysisVideo);
  const playbackCommand = preservePlayback ? (wasPlaying ? "play" : "none") : "play";
  if (matchState.state.video && matchState.state.video.youtubeId) {
    if (preferScout) {
      if (workspaceLayoutState.youtubeScoutFallback && matchState.elYoutubeFrameScout) {
        if (matchState.elYoutubeFrameScout.contentWindow) {
          try {
            matchState.elYoutubeFrameScout.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
              "*"
            );
            if (playbackCommand !== "none") {
              matchState.elYoutubeFrameScout.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                "*"
              );
            }
            return;
          } catch (_) {
            // ignore postMessage errors and fall back to src update
          }
        }
        matchState.elYoutubeFrameScout.src = buildYoutubeEmbedSrc(
          matchState.state.video.youtubeId,
          target,
          true,
          playbackCommand === "play"
        );
        return;
      }
      if (workspaceLayoutState.ytPlayerScout && typeof workspaceLayoutState.ytPlayerScout.seekTo === "function") {
        workspaceLayoutState.ytPlayerScout.seekTo(target, true);
        if (playbackCommand === "play" && typeof workspaceLayoutState.ytPlayerScout.playVideo === "function") {
          workspaceLayoutState.ytPlayerScout.playVideo();
        }
      } else if (matchState.elYoutubeFrameScout) {
        if (matchState.elYoutubeFrameScout.contentWindow) {
          try {
            matchState.elYoutubeFrameScout.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
              "*"
            );
            if (playbackCommand !== "none") {
              matchState.elYoutubeFrameScout.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                "*"
              );
            }
            return;
          } catch (_) {
            // ignore postMessage errors and fall back to src update
          }
        }
        matchState.elYoutubeFrameScout.src = buildYoutubeEmbedSrc(
          matchState.state.video.youtubeId,
          target,
          true,
          playbackCommand === "play"
        );
      }
      return;
    }
    if (workspaceLayoutState.youtubeFallback && matchState.elYoutubeFrame) {
      if (matchState.elYoutubeFrame.contentWindow) {
        try {
          matchState.elYoutubeFrame.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
            "*"
          );
          if (playbackCommand !== "none") {
            matchState.elYoutubeFrame.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
          }
          return;
        } catch (_) {
          // ignore postMessage errors and fall back to src update
        }
      }
      matchState.elYoutubeFrame.src = buildYoutubeEmbedSrc(
        matchState.state.video.youtubeId,
        target,
        true,
        playbackCommand === "play"
      );
      return;
    }
    if (workspaceLayoutState.ytPlayer && typeof workspaceLayoutState.ytPlayer.seekTo === "function") {
      queueYoutubeSeek(target, playbackCommand === "play");
    } else if (matchState.elYoutubeFrame) {
      if (matchState.elYoutubeFrame.contentWindow) {
        try {
          matchState.elYoutubeFrame.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
            "*"
          );
          if (playbackCommand !== "none") {
            matchState.elYoutubeFrame.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
          }
          return;
        } catch (_) {
          // ignore postMessage errors and fall back to src update
        }
      }
      matchState.elYoutubeFrame.src = buildYoutubeEmbedSrc(
        matchState.state.video.youtubeId,
        target,
        true,
        playbackCommand === "play"
      );
    }
    return;
  }
  if (preferScout && matchState.elAnalysisVideoScout) {
    try {
      const wasPaused = matchState.elAnalysisVideoScout.paused;
      matchState.elAnalysisVideoScout.currentTime = target;
      if (!preservePlayback || !wasPaused) {
        matchState.elAnalysisVideoScout.play().catch(() => {});
      }
    } catch (_) {
      // ignore errors when seeking
    }
    return;
  }
  if (!matchState.elAnalysisVideo) return;
  try {
    const wasPaused = matchState.elAnalysisVideo.paused;
    matchState.elAnalysisVideo.currentTime = target;
    if (!preservePlayback || !wasPaused) {
      matchState.elAnalysisVideo.play().catch(() => {});
    }
  } catch (_) {
    // ignore errors when seeking
  }
}
