import { parseYoutubeId } from "./timing.js";
import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { saveState } from "../storage/save-state.js";
import { renderVideoAnalysis, closeVideoMobileSourceModal, updateVideoMobileSourceButton, handleVideoFileChange } from "./playback.js";
import { session as playbackState } from "../state/video-playback.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderEventsLog } from "../events/log-view.js";
import { renderServeTrajectoryAnalysis, renderTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { renderPlayers } from "../live/team-rendering.js";
import { clearCachedLocalVideo, getFileFromStoredVideoHandle } from "./local-file-storage.js";
import { renderYoutubePlayer, renderYoutubePlayerScout, clearYoutubeSource } from "./youtube-player.js";

export function handleYoutubeUrlLoad(url) {
  const id = parseYoutubeId(url);
  if (!id) {
    alert("Inserisci un link YouTube valido.");
    return;
  }
  if (workspaceLayoutState.videoObjectUrl) {
    try {
      URL.revokeObjectURL(workspaceLayoutState.videoObjectUrl);
    } catch (_) {
      // ignore
    }
    workspaceLayoutState.videoObjectUrl = "";
  }
  workspaceLayoutState.videoLocalFile = null;
  clearCachedLocalVideo();
  if (matchState.elAnalysisVideo) {
    matchState.elAnalysisVideo.pause();

  }
  if (matchState.elAnalysisVideoScout) {
    matchState.elAnalysisVideoScout.pause();

  }
  matchState.state.video = matchState.state.video || {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  matchState.state.video.youtubeId = id;
  matchState.state.video.youtubeUrl = url.trim();
  matchState.state.video.fileName = "YouTube: " + matchState.state.video.youtubeUrl;
  matchState.state.video.lastPlaybackSeconds = 0;

  saveState();
  renderYoutubePlayer(0);
  renderYoutubePlayerScout(0);
  renderVideoAnalysis();
  playbackState.videoMobileSourcePromptDismissed = false;
  closeVideoMobileSourceModal({ dismiss: false });
  updateVideoMobileSourceButton();
}


export function clearLoadedVideo() {
  const hasVideo =
    (matchState.state.video && (matchState.state.video.youtubeId || matchState.state.video.youtubeUrl || matchState.state.video.fileName)) ||
    workspaceLayoutState.videoObjectUrl ||
    (matchState.elAnalysisVideo && matchState.elAnalysisVideo.getAttribute("src")) ||
    (matchState.elAnalysisVideoScout && matchState.elAnalysisVideoScout.getAttribute("src"));
  if (!hasVideo) {
    alert("Nessun video da rimuovere.");
    return;
  }
  if (workspaceLayoutState.videoObjectUrl) {
    try {
      URL.revokeObjectURL(workspaceLayoutState.videoObjectUrl);
    } catch (_) {
      // ignore
    }
    workspaceLayoutState.videoObjectUrl = "";
  }
  workspaceLayoutState.videoLocalFile = null;
  clearCachedLocalVideo();
  clearYoutubeSource();
  if (matchState.elAnalysisVideo) {
    matchState.elAnalysisVideo.pause();

  }
  if (matchState.elAnalysisVideoScout) {
    matchState.elAnalysisVideoScout.pause();

  }
  matchState.state.video = matchState.state.video || {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  matchState.state.video.offsetSeconds = 0;
  matchState.state.video.fileName = "";
  matchState.state.video.youtubeId = "";
  matchState.state.video.youtubeUrl = "";
  matchState.state.video.lastPlaybackSeconds = 0;
  matchState.state.videoClock = {
    paused: true,
    pausedAtMs: null,
    pausedAccumMs: 0,
    startMs: Date.now(),
    currentSeconds: 0
  };
  if (matchState.elVideoFileInput) matchState.elVideoFileInput.value = "";
  if (matchState.elVideoFileInputScout) matchState.elVideoFileInputScout.value = "";

  saveState();
  renderVideoAnalysis();
}








export async function restoreCachedLocalVideo(options = {}) {
  if (!matchState.elAnalysisVideo && !matchState.elAnalysisVideoScout) return;
  if (matchState.state.video && matchState.state.video.youtubeId) return;
  try {
    const stored = await getFileFromStoredVideoHandle(options);
    if (!stored) return false;
    handleVideoFileChange(stored.file, { fileHandle: stored.handle, restoring: true });
    return true;
  } catch (_) {
    return false;
  }
}

export async function openLocalVideoPicker(inputEl) {
  if (typeof window.showOpenFilePicker !== "function") {
    if (inputEl) inputEl.click();
    return;
  }
  if (!workspaceLayoutState.videoObjectUrl && matchState.state.video && matchState.state.video.fileName) {
    const restored = await restoreCachedLocalVideo({ requestPermission: true });
    if (restored) return;
  }
  try {
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "Video",
          accept: { "video/*": [".mp4", ".webm", ".mov", ".mkv", ".m4v"] }
        }
      ]
    });
    const handle = handles && handles[0];
    if (!handle) return;
    const file = await handle.getFile();
    handleVideoFileChange(file, { fileHandle: handle });
  } catch (error) {
    if (!error || error.name !== "AbortError") console.error("Video picker error", error);
  }
}





export function undoLastVideoEdit() {
  const snapshot = workspaceLayoutState.videoUndoStack.pop();
  if (!snapshot) {
    alert("Non ci sono modifiche video da annullare.");
    return;
  }
  matchState.state.events = Array.isArray(snapshot.events) ? snapshot.events : [];
  matchState.state.video = Object.assign({}, matchState.state.video || {}, snapshot.video || {});
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog({ suppressScroll: true });
  renderServeTrajectoryAnalysis();
  renderTrajectoryAnalysis();
  renderPlayers();
}

export function restoreYoutubeFromState() {
  if (!matchState.state.video || !matchState.state.video.youtubeId) return;
  if (matchState.state.video.youtubeUrl) {

  }
  const start =
    typeof matchState.state.video.lastPlaybackSeconds === "number" && isFinite(matchState.state.video.lastPlaybackSeconds)
      ? matchState.state.video.lastPlaybackSeconds
      : matchState.state.video.offsetSeconds || 0;
  renderYoutubePlayer(start);
  renderYoutubePlayerScout(start);
  renderVideoAnalysis();
}
