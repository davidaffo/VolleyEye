
import { formatVideoTimestamp, parseYoutubeId } from "./timing.js";

import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { saveState } from "../storage/save-state.js";
import { renderVideoAnalysis, closeVideoMobileSourceModal, updateVideoMobileSourceButton, handleVideoFileChange } from "./playback.js";
import { session as playbackState } from "../state/video-playback.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderEventsLog } from "./video-events.js";
import { renderServeTrajectoryAnalysis, renderTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { renderPlayers } from "../live/team-rendering.js";

export function buildYoutubeEmbedSrc(id, startSeconds = 0, enableApi = false, autoplay = false) {
  const start = Math.max(0, Math.floor(startSeconds));
  const origin =
    window.location && window.location.origin && window.location.origin.startsWith("http")
      ? "&origin=" + encodeURIComponent(window.location.origin)
      : "";
  const apiParam = enableApi ? "1" : "0";
  const autoplayParam = autoplay ? "&autoplay=1" : "";
  return (
    "https://www.youtube.com/embed/" +
    encodeURIComponent(String(id || "")) +
    "?enablejsapi=" +
    apiParam +
    "&rel=0&playsinline=1&start=" +
    start +
    origin +
    autoplayParam
  );
}

export function loadYoutubeApi() {
  if (window.YT && typeof window.YT.Player === "function") {
    return Promise.resolve();
  }
  if (workspaceLayoutState.ytApiPromise) return workspaceLayoutState.ytApiPromise;
  workspaceLayoutState.ytApiPromise = new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onload = () => {
      if (window.YT && typeof window.YT.Player === "function") {
        resolve();
      }
    };
    script.onerror = () => {
      workspaceLayoutState.ytApiPromise = null;
      resolve();
    };
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
    document.body.appendChild(script);
  });
  return workspaceLayoutState.ytApiPromise;
}

export function applyPendingYoutubeSeek() {
  if (!workspaceLayoutState.pendingYoutubeSeek || !workspaceLayoutState.ytPlayerReady || !workspaceLayoutState.ytPlayer || typeof workspaceLayoutState.ytPlayer.seekTo !== "function") {
    return;
  }
  const { time, autoplay } = workspaceLayoutState.pendingYoutubeSeek;
  workspaceLayoutState.ytPlayer.seekTo(Math.max(0, time), true);
  if (autoplay && typeof workspaceLayoutState.ytPlayer.playVideo === "function") {
    workspaceLayoutState.ytPlayer.playVideo();
  }
  workspaceLayoutState.pendingYoutubeSeek = null;
}

export function queueYoutubeSeek(time, autoplay = true) {
  workspaceLayoutState.pendingYoutubeSeek = { time, autoplay };
  applyPendingYoutubeSeek();
}

export async function renderYoutubePlayer(startSeconds = 0) {
  const id = matchState.state.video && matchState.state.video.youtubeId;
  const hasYoutube = !!id;

  if (!matchState.elYoutubeFrame) return;
  matchState.elYoutubeFrame.style.display = hasYoutube ? "block" : "none";
  matchState.elYoutubeFrame.classList.toggle("active", hasYoutube);
  // se stiamo servendo da file:// o senza origin valido, forziamo il fallback embed per evitare errori 153
  const isFileOrigin = window.location && window.location.protocol === "file:";
  if (!hasYoutube) {
    if (workspaceLayoutState.ytPlayer && workspaceLayoutState.ytPlayer.stopVideo) {
      workspaceLayoutState.ytPlayer.stopVideo();
    }
    matchState.elYoutubeFrame.src = "";
    workspaceLayoutState.ytPlayerReady = false;
    workspaceLayoutState.currentYoutubeId = "";
    workspaceLayoutState.pendingYoutubeSeek = null;
    return;
  }
  const start = Math.max(0, startSeconds || 0);
  workspaceLayoutState.currentYoutubeId = id;
  workspaceLayoutState.youtubeFallback = isFileOrigin;
  if (workspaceLayoutState.youtubeFallback) {
    matchState.elYoutubeFrame.src = buildYoutubeEmbedSrc(id, start, true);
    return;
  }
  try {
    await loadYoutubeApi();
    if (workspaceLayoutState.ytPlayer) {
      workspaceLayoutState.ytPlayer.loadVideoById(id, start);
      workspaceLayoutState.ytPlayerReady = true;
      applyPendingYoutubeSeek();
      return;
    }
    workspaceLayoutState.ytPlayer = new YT.Player("youtube-frame", {
      videoId: id,
      host: "https://www.youtube.com",
      playerVars: {
        start: start,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin
      },
      events: {
        onReady: () => {
          workspaceLayoutState.ytPlayerReady = true;
          applyPendingYoutubeSeek();
          if (start && !workspaceLayoutState.pendingYoutubeSeek) {
            workspaceLayoutState.ytPlayer.seekTo(start, true);
          }
        },
        onError: () => {
          workspaceLayoutState.ytPlayerReady = false;
          workspaceLayoutState.youtubeFallback = true;
          workspaceLayoutState.ytPlayer = null;
          workspaceLayoutState.pendingYoutubeSeek = null;
          if (matchState.elYoutubeFrame) {
            matchState.elYoutubeFrame.src = buildYoutubeEmbedSrc(id, start, true);
          }
        }
      }
    });
  } catch (_) {
    workspaceLayoutState.youtubeFallback = true;
    workspaceLayoutState.pendingYoutubeSeek = null;
    matchState.elYoutubeFrame.src = buildYoutubeEmbedSrc(id, start, true);
  }
}

export async function renderYoutubePlayerScout(startSeconds = 0) {
  const id = matchState.state.video && matchState.state.video.youtubeId;
  const hasYoutube = !!id;

  if (!matchState.elYoutubeFrameScout) return;
  matchState.elYoutubeFrameScout.style.display = hasYoutube ? "block" : "none";
  matchState.elYoutubeFrameScout.classList.toggle("active", hasYoutube);
  const isFileOrigin = window.location && window.location.protocol === "file:";
  if (!hasYoutube) {
    if (workspaceLayoutState.ytPlayerScout && workspaceLayoutState.ytPlayerScout.stopVideo) {
      workspaceLayoutState.ytPlayerScout.stopVideo();
    }
    matchState.elYoutubeFrameScout.src = "";
    workspaceLayoutState.ytPlayerScoutReady = false;
    workspaceLayoutState.currentYoutubeIdScout = "";
    return;
  }
  const start = Math.max(0, startSeconds || 0);
  workspaceLayoutState.currentYoutubeIdScout = id;
  workspaceLayoutState.youtubeScoutFallback = isFileOrigin;
  if (workspaceLayoutState.youtubeScoutFallback) {
    matchState.elYoutubeFrameScout.src = buildYoutubeEmbedSrc(id, start, true);
    return;
  }
  try {
    await loadYoutubeApi();
    if (workspaceLayoutState.ytPlayerScout) {
      workspaceLayoutState.ytPlayerScout.loadVideoById(id, start);
      workspaceLayoutState.ytPlayerScoutReady = true;
      return;
    }
    workspaceLayoutState.ytPlayerScout = new YT.Player("youtube-frame-scout", {
      videoId: id,
      host: "https://www.youtube.com",
      playerVars: {
        start: start,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin
      },
      events: {
        onReady: () => {
          workspaceLayoutState.ytPlayerScoutReady = true;
          if (start) {
            workspaceLayoutState.ytPlayerScout.seekTo(start, true);
          }
        },
        onError: () => {
          workspaceLayoutState.ytPlayerScoutReady = false;
          workspaceLayoutState.youtubeScoutFallback = true;
          workspaceLayoutState.ytPlayerScout = null;
          if (matchState.elYoutubeFrameScout) {
            matchState.elYoutubeFrameScout.src = buildYoutubeEmbedSrc(id, start, true);
          }
        }
      }
    });
  } catch (_) {
    workspaceLayoutState.youtubeScoutFallback = true;
    matchState.elYoutubeFrameScout.src = buildYoutubeEmbedSrc(id, start, true);
  }
}

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

export function clearYoutubeSource() {
  if (!matchState.state.video) return;
  matchState.state.video.youtubeId = "";
  matchState.state.video.youtubeUrl = "";
  matchState.state.video.lastPlaybackSeconds = 0;

  if (workspaceLayoutState.ytPlayer && workspaceLayoutState.ytPlayer.stopVideo) {
    workspaceLayoutState.ytPlayer.stopVideo();
  }
  workspaceLayoutState.ytPlayer = null;
  workspaceLayoutState.ytPlayerReady = false;
  workspaceLayoutState.youtubeFallback = false;
  workspaceLayoutState.pendingYoutubeSeek = null;
  if (matchState.elYoutubeFrame) {
    matchState.elYoutubeFrame.src = "";
    matchState.elYoutubeFrame.style.display = "none";
  }
  workspaceLayoutState.currentYoutubeId = "";
  if (workspaceLayoutState.ytPlayerScout && workspaceLayoutState.ytPlayerScout.stopVideo) {
    workspaceLayoutState.ytPlayerScout.stopVideo();
  }
  workspaceLayoutState.ytPlayerScout = null;
  workspaceLayoutState.ytPlayerScoutReady = false;
  workspaceLayoutState.youtubeScoutFallback = false;
  if (matchState.elYoutubeFrameScout) {
    matchState.elYoutubeFrameScout.src = "";
    matchState.elYoutubeFrameScout.style.display = "none";
  }
  workspaceLayoutState.currentYoutubeIdScout = "";
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

export async function clearCachedLocalVideo() {
  try {
    await clearStoredLocalVideoReference();
  } catch (_) {
    // ignore storage errors
  }
}

export function openVideoDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexedDB-unavailable"));
      return;
    }
    const request = indexedDB.open(teamManagementState.LOCAL_VIDEO_DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(teamManagementState.LOCAL_VIDEO_STORE)) {
        db.createObjectStore(teamManagementState.LOCAL_VIDEO_STORE);
      } else {
        request.transaction.objectStore(teamManagementState.LOCAL_VIDEO_STORE).clear();
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexedDB-open-failed"));
  });
}

export async function saveVideoFileHandleToDb(handle) {
  if (!handle) return;
  try {
    const db = await openVideoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(teamManagementState.LOCAL_VIDEO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexedDB-write-failed"));
      const store = tx.objectStore(teamManagementState.LOCAL_VIDEO_STORE);
      store.put(handle, teamManagementState.LOCAL_VIDEO_HANDLE_KEY);
    });
    db.close();
  } catch (_) {
    // ignore indexedDB errors
  }
}

export async function loadVideoFileHandleFromDb() {
  try {
    const db = await openVideoDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(teamManagementState.LOCAL_VIDEO_STORE, "readonly");
      const req = tx.objectStore(teamManagementState.LOCAL_VIDEO_STORE).get(teamManagementState.LOCAL_VIDEO_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("indexedDB-read-failed"));
    });
    db.close();
    return handle || null;
  } catch (_) {
    return null;
  }
}

export async function clearStoredLocalVideoReference() {
  try {
    const db = await openVideoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(teamManagementState.LOCAL_VIDEO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexedDB-clear-failed"));
      const store = tx.objectStore(teamManagementState.LOCAL_VIDEO_STORE);
      store.delete(teamManagementState.LOCAL_VIDEO_HANDLE_KEY);
    });
    db.close();
  } catch (_) {
    // ignore indexedDB errors
  }
}

export async function persistLocalVideoReference(handle = null) {
  await clearStoredLocalVideoReference();
  if (handle) await saveVideoFileHandleToDb(handle);
}

export async function getFileFromStoredVideoHandle({ requestPermission = false } = {}) {
  const handle = await loadVideoFileHandleFromDb();
  if (!handle || typeof handle.getFile !== "function") return null;
  let permission = "granted";
  if (typeof handle.queryPermission === "function") {
    permission = await handle.queryPermission({ mode: "read" });
  }
  if (permission !== "granted" && requestPermission && typeof handle.requestPermission === "function") {
    permission = await handle.requestPermission({ mode: "read" });
  }
  if (permission !== "granted") return null;
  const file = await handle.getFile();
  return { file, handle };
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

export function updateVideoSyncLabel() {
  if (!matchState.elVideoSyncLabel) return;
  const offset =
    matchState.state.video && typeof matchState.state.video.offsetSeconds === "number" ? matchState.state.video.offsetSeconds : 0;
  matchState.elVideoSyncLabel.textContent =
    offset > 0 ? "Prima skill allineata a " + formatVideoTimestamp(offset) : "La prima skill parte da 0:00";
}

export function shouldTrackVideoUndo() {
  return document && document.body && document.body.dataset.activeTab === "video";
}

export function pushVideoUndoSnapshot(force = false) {
  if ((!force && !shouldTrackVideoUndo()) || (!force && workspaceLayoutState.bulkEditActive)) return;
  const snapshot = {
    events: JSON.parse(JSON.stringify(matchState.state.events || [])),
    video: Object.assign({}, matchState.state.video || {})
  };
  workspaceLayoutState.videoUndoStack.push(snapshot);
  if (workspaceLayoutState.videoUndoStack.length > workspaceLayoutState.VIDEO_UNDO_LIMIT) {
    workspaceLayoutState.videoUndoStack.shift();
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
