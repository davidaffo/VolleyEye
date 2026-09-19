function getVideoSkillEvents() {
  syncEventPlayerLinks(state.events || []);
  return (state.events || [])
    .map((ev, idx) => ({ ev, idx }))
    .filter(item => item.ev && item.ev.skillId);
}
function getVideoBaseTimeMs(eventsList) {
  const list = eventsList || getVideoSkillEvents();
  if (!list.length) return null;
  const baseMs = new Date(list[0].ev.t).getTime();
  return isNaN(baseMs) ? null : baseMs;
}
function computeEventVideoTime(ev, baseMs) {
  if (ev && typeof ev.videoTime === "number") {
    return Math.max(0, ev.videoTime);
  }
  const offset =
    state.video && typeof state.video.offsetSeconds === "number" ? state.video.offsetSeconds : 0;
  if (!ev) return Math.max(0, offset);
  const base = typeof baseMs === "number" ? baseMs : null;
  if (!base) return Math.max(0, offset);
  const evMs = new Date(ev.t).getTime();
  const delta = isNaN(evMs) ? 0 : (evMs - base) / 1000;
  if (!isFinite(delta)) return Math.max(0, offset);
  return Math.max(0, offset + delta);
}
function formatVideoTimestamp(seconds) {
  if (!isFinite(seconds)) return "00:00:00";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}
function parseYoutubeId(url) {
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
function buildYoutubeEmbedSrc(id, startSeconds = 0, enableApi = false, autoplay = false) {
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
function loadYoutubeApi() {
  if (window.YT && typeof window.YT.Player === "function") {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onload = () => {
      if (window.YT && typeof window.YT.Player === "function") {
        resolve();
      }
    };
    script.onerror = () => {
      ytApiPromise = null;
      resolve();
    };
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
    document.body.appendChild(script);
  });
  return ytApiPromise;
}
function applyPendingYoutubeSeek() {
  if (!pendingYoutubeSeek || !ytPlayerReady || !ytPlayer || typeof ytPlayer.seekTo !== "function") {
    return;
  }
  const { time, autoplay } = pendingYoutubeSeek;
  ytPlayer.seekTo(Math.max(0, time), true);
  if (autoplay && typeof ytPlayer.playVideo === "function") {
    ytPlayer.playVideo();
  }
  pendingYoutubeSeek = null;
}
function queueYoutubeSeek(time, autoplay = true) {
  pendingYoutubeSeek = { time, autoplay };
  applyPendingYoutubeSeek();
}
async function renderYoutubePlayer(startSeconds = 0) {
  const id = state.video && state.video.youtubeId;
  const hasYoutube = !!id;
  if (elAnalysisVideo) {
    elAnalysisVideo.style.display = hasYoutube ? "none" : "block";
  }
  if (!elYoutubeFrame) return;
  elYoutubeFrame.style.display = hasYoutube ? "block" : "none";
  elYoutubeFrame.classList.toggle("active", hasYoutube);
  // se stiamo servendo da file:// o senza origin valido, forziamo il fallback embed per evitare errori 153
  const isFileOrigin = window.location && window.location.protocol === "file:";
  if (!hasYoutube) {
    if (ytPlayer && ytPlayer.stopVideo) {
      ytPlayer.stopVideo();
    }
    elYoutubeFrame.src = "";
    ytPlayerReady = false;
    currentYoutubeId = "";
    pendingYoutubeSeek = null;
    return;
  }
  const start = Math.max(0, startSeconds || 0);
  currentYoutubeId = id;
  youtubeFallback = isFileOrigin;
  if (youtubeFallback) {
    elYoutubeFrame.src = buildYoutubeEmbedSrc(id, start, true);
    return;
  }
  try {
    await loadYoutubeApi();
    if (ytPlayer) {
      ytPlayer.loadVideoById(id, start);
      ytPlayerReady = true;
      applyPendingYoutubeSeek();
      return;
    }
    ytPlayer = new YT.Player("youtube-frame", {
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
          ytPlayerReady = true;
          applyPendingYoutubeSeek();
          if (start && !pendingYoutubeSeek) {
            ytPlayer.seekTo(start, true);
          }
        },
        onError: () => {
          ytPlayerReady = false;
          youtubeFallback = true;
          ytPlayer = null;
          pendingYoutubeSeek = null;
          if (elYoutubeFrame) {
            elYoutubeFrame.src = buildYoutubeEmbedSrc(id, start, true);
          }
        }
      }
    });
  } catch (_) {
    youtubeFallback = true;
    pendingYoutubeSeek = null;
    elYoutubeFrame.src = buildYoutubeEmbedSrc(id, start, true);
  }
}
async function renderYoutubePlayerScout(startSeconds = 0) {
  const id = state.video && state.video.youtubeId;
  const hasYoutube = !!id;
  if (elAnalysisVideoScout) {
    elAnalysisVideoScout.style.display = hasYoutube ? "none" : "block";
  }
  if (!elYoutubeFrameScout) return;
  elYoutubeFrameScout.style.display = hasYoutube ? "block" : "none";
  elYoutubeFrameScout.classList.toggle("active", hasYoutube);
  const isFileOrigin = window.location && window.location.protocol === "file:";
  if (!hasYoutube) {
    if (ytPlayerScout && ytPlayerScout.stopVideo) {
      ytPlayerScout.stopVideo();
    }
    elYoutubeFrameScout.src = "";
    ytPlayerScoutReady = false;
    currentYoutubeIdScout = "";
    return;
  }
  const start = Math.max(0, startSeconds || 0);
  currentYoutubeIdScout = id;
  youtubeScoutFallback = isFileOrigin;
  if (youtubeScoutFallback) {
    elYoutubeFrameScout.src = buildYoutubeEmbedSrc(id, start, true);
    return;
  }
  try {
    await loadYoutubeApi();
    if (ytPlayerScout) {
      ytPlayerScout.loadVideoById(id, start);
      ytPlayerScoutReady = true;
      return;
    }
    ytPlayerScout = new YT.Player("youtube-frame-scout", {
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
          ytPlayerScoutReady = true;
          if (start) {
            ytPlayerScout.seekTo(start, true);
          }
        },
        onError: () => {
          ytPlayerScoutReady = false;
          youtubeScoutFallback = true;
          ytPlayerScout = null;
          if (elYoutubeFrameScout) {
            elYoutubeFrameScout.src = buildYoutubeEmbedSrc(id, start, true);
          }
        }
      }
    });
  } catch (_) {
    youtubeScoutFallback = true;
    elYoutubeFrameScout.src = buildYoutubeEmbedSrc(id, start, true);
  }
}
function syncYoutubeUrlInputs(value) {
  const url = value || "";
  if (elYoutubeUrlInput && elYoutubeUrlInput.value !== url) {
    elYoutubeUrlInput.value = url;
  }
  if (elYoutubeUrlInputScout && elYoutubeUrlInputScout.value !== url) {
    elYoutubeUrlInputScout.value = url;
  }
}
function handleYoutubeUrlLoad(url) {
  const id = parseYoutubeId(url);
  if (!id) {
    alert("Inserisci un link YouTube valido.");
    return;
  }
  if (videoObjectUrl) {
    try {
      URL.revokeObjectURL(videoObjectUrl);
    } catch (_) {
      // ignore
    }
    videoObjectUrl = "";
  }
  clearCachedLocalVideo();
  if (elAnalysisVideo) {
    elAnalysisVideo.pause();
    elAnalysisVideo.removeAttribute("src");
    elAnalysisVideo.load();
  }
  if (elAnalysisVideoScout) {
    elAnalysisVideoScout.pause();
    elAnalysisVideoScout.removeAttribute("src");
    elAnalysisVideoScout.load();
  }
  state.video = state.video || {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  state.video.youtubeId = id;
  state.video.youtubeUrl = url.trim();
  state.video.fileName = "YouTube: " + state.video.youtubeUrl;
  state.video.lastPlaybackSeconds = 0;
  syncYoutubeUrlInputs(state.video.youtubeUrl);
  saveState();
  renderYoutubePlayer(0);
  renderYoutubePlayerScout(0);
  renderVideoAnalysis();
}
function clearYoutubeSource() {
  if (!state.video) return;
  state.video.youtubeId = "";
  state.video.youtubeUrl = "";
  state.video.lastPlaybackSeconds = 0;
  syncYoutubeUrlInputs("");
  if (ytPlayer && ytPlayer.stopVideo) {
    ytPlayer.stopVideo();
  }
  ytPlayer = null;
  ytPlayerReady = false;
  youtubeFallback = false;
  pendingYoutubeSeek = null;
  if (elYoutubeFrame) {
    elYoutubeFrame.src = "";
    elYoutubeFrame.style.display = "none";
  }
  currentYoutubeId = "";
  if (ytPlayerScout && ytPlayerScout.stopVideo) {
    ytPlayerScout.stopVideo();
  }
  ytPlayerScout = null;
  ytPlayerScoutReady = false;
  youtubeScoutFallback = false;
  if (elYoutubeFrameScout) {
    elYoutubeFrameScout.src = "";
    elYoutubeFrameScout.style.display = "none";
  }
  currentYoutubeIdScout = "";
}
function clearLoadedVideo() {
  const hasVideo =
    (state.video && (state.video.youtubeId || state.video.youtubeUrl || state.video.fileName)) ||
    videoObjectUrl ||
    (elAnalysisVideo && elAnalysisVideo.getAttribute("src")) ||
    (elAnalysisVideoScout && elAnalysisVideoScout.getAttribute("src"));
  if (!hasVideo) {
    alert("Nessun video da rimuovere.");
    return;
  }
  if (videoObjectUrl) {
    try {
      URL.revokeObjectURL(videoObjectUrl);
    } catch (_) {
      // ignore
    }
    videoObjectUrl = "";
  }
  clearCachedLocalVideo();
  clearYoutubeSource();
  if (elAnalysisVideo) {
    elAnalysisVideo.pause();
    elAnalysisVideo.removeAttribute("src");
    elAnalysisVideo.load();
  }
  if (elAnalysisVideoScout) {
    elAnalysisVideoScout.pause();
    elAnalysisVideoScout.removeAttribute("src");
    elAnalysisVideoScout.load();
  }
  state.video = state.video || {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  state.video.offsetSeconds = 0;
  state.video.fileName = "";
  state.video.youtubeId = "";
  state.video.youtubeUrl = "";
  state.video.lastPlaybackSeconds = 0;
  state.videoClock = {
    paused: true,
    pausedAtMs: null,
    pausedAccumMs: 0,
    startMs: Date.now(),
    currentSeconds: 0
  };
  if (elVideoFileInput) elVideoFileInput.value = "";
  if (elVideoFileInputScout) elVideoFileInputScout.value = "";
  syncYoutubeUrlInputs("");
  saveState();
  renderVideoAnalysis();
}
async function clearCachedLocalVideo() {
  try {
    if ("caches" in window) {
      const cache = await caches.open(LOCAL_VIDEO_CACHE);
      await cache.delete(LOCAL_VIDEO_REQUEST);
    }
    await clearVideoBlobFromDb();
  } catch (_) {
    // ignore cache errors
  }
}
function openVideoDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexedDB-unavailable"));
      return;
    }
    const request = indexedDB.open(LOCAL_VIDEO_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_VIDEO_STORE)) {
        db.createObjectStore(LOCAL_VIDEO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexedDB-open-failed"));
  });
}
async function saveVideoBlobToDb(file) {
  if (!file) return;
  try {
    const db = await openVideoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(LOCAL_VIDEO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexedDB-write-failed"));
      tx.objectStore(LOCAL_VIDEO_STORE).put(file, "current");
    });
    db.close();
  } catch (_) {
    // ignore indexedDB errors
  }
}
async function loadVideoBlobFromDb() {
  try {
    const db = await openVideoDb();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(LOCAL_VIDEO_STORE, "readonly");
      const req = tx.objectStore(LOCAL_VIDEO_STORE).get("current");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("indexedDB-read-failed"));
    });
    db.close();
    return blob || null;
  } catch (_) {
    return null;
  }
}
async function clearVideoBlobFromDb() {
  try {
    const db = await openVideoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(LOCAL_VIDEO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexedDB-clear-failed"));
      tx.objectStore(LOCAL_VIDEO_STORE).delete("current");
    });
    db.close();
  } catch (_) {
    // ignore indexedDB errors
  }
}
async function persistLocalVideo(file) {
  if (!file) return;
  try {
    // Non persistere più il blob completo del video: occupa troppo storage.
    // Manteniamo solo la sessione corrente via objectURL.
    await clearCachedLocalVideo();
  } catch (_) {
    // ignore cache errors
  }
}
async function restoreCachedLocalVideo() {
  if (!elAnalysisVideo && !elAnalysisVideoScout) return;
  if (state.video && state.video.youtubeId) return;
  try {
    // Pulizia di eventuale storage legacy (vecchie versioni che salvavano i blob).
    await clearCachedLocalVideo();
  } catch (_) {
    // ignore cache errors
  }
}
function restoreYoutubeFromState() {
  if (!state.video || !state.video.youtubeId) return;
  if (state.video.youtubeUrl) {
    syncYoutubeUrlInputs(state.video.youtubeUrl);
  }
  const start =
    typeof state.video.lastPlaybackSeconds === "number" && isFinite(state.video.lastPlaybackSeconds)
      ? state.video.lastPlaybackSeconds
      : state.video.offsetSeconds || 0;
  renderYoutubePlayer(start);
  renderYoutubePlayerScout(start);
  renderVideoAnalysis();
}
function updateVideoSyncLabel() {
  if (!elVideoSyncLabel) return;
  const offset =
    state.video && typeof state.video.offsetSeconds === "number" ? state.video.offsetSeconds : 0;
  elVideoSyncLabel.textContent =
    offset > 0 ? "Prima skill allineata a " + formatVideoTimestamp(offset) : "La prima skill parte da 0:00";
}
function shouldTrackVideoUndo() {
  return document && document.body && document.body.dataset.activeTab === "video";
}
function pushVideoUndoSnapshot(force = false) {
  if ((!force && !shouldTrackVideoUndo()) || (!force && bulkEditActive)) return;
  const snapshot = {
    events: JSON.parse(JSON.stringify(state.events || [])),
    video: Object.assign({}, state.video || {})
  };
  videoUndoStack.push(snapshot);
  if (videoUndoStack.length > VIDEO_UNDO_LIMIT) {
    videoUndoStack.shift();
  }
}
function markVideoUndoCapture(el) {
  if (!el || !el.dataset) return;
  if (el.dataset.undoCaptured === "true") return;
  pushVideoUndoSnapshot();
  el.dataset.undoCaptured = "true";
}
function undoLastVideoEdit() {
  const snapshot = videoUndoStack.pop();
  if (!snapshot) {
    alert("Non ci sono modifiche video da annullare.");
    return;
  }
  state.events = Array.isArray(snapshot.events) ? snapshot.events : [];
  state.video = Object.assign({}, state.video || {}, snapshot.video || {});
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog({ suppressScroll: true });
  renderServeTrajectoryAnalysis();
  renderTrajectoryAnalysis();
  renderPlayers();
}
function resolvePlayerIdx(ev) {
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  const idxById = getPlayerIndexForId(scope, ev.playerId);
  if (typeof idxById === "number" && players[idxById]) {
    return idxById;
  }
  if (typeof ev.playerIdx === "number" && players[ev.playerIdx]) {
    return ev.playerIdx;
  }
  return players.findIndex(name => name === ev.playerName);
}
function syncEventPlayerLink(ev) {
  if (!ev) return;
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  if (!Array.isArray(players) || players.length === 0) {
    ensureEventDataVolleyFields(ev);
    return;
  }
  const idxById = getPlayerIndexForId(scope, ev.playerId);
  if (typeof idxById === "number" && players[idxById]) {
    ev.playerIdx = idxById;
    ev.playerName = players[idxById];
    ensureEventDataVolleyFields(ev);
    return;
  }
  const rawName = ev.playerName != null ? String(ev.playerName).trim() : "";
  if (rawName) {
    let idx = players.indexOf(rawName);
    if (idx === -1) {
      const lower = rawName.toLowerCase();
      idx = players.findIndex(p => String(p || "").trim().toLowerCase() === lower);
    }
    if (idx !== -1) {
      ev.playerIdx = idx;
      if (players[idx] && players[idx] !== ev.playerName) {
        ev.playerName = players[idx];
      }
      if (!ev.playerId) {
        const maps = getRosterIdMapsForScope(scope);
        if (maps && maps.nameToId) {
          ev.playerId = maps.nameToId.get(normalizePlayerKey(ev.playerName)) || null;
        }
      }
      ensureEventDataVolleyFields(ev);
      return;
    }
  }
  if (typeof ev.playerIdx === "number" && players[ev.playerIdx]) {
    ev.playerName = players[ev.playerIdx];
    if (!ev.playerId) {
      const maps = getRosterIdMapsForScope(scope);
      if (maps && maps.nameToId) {
        ev.playerId = maps.nameToId.get(normalizePlayerKey(ev.playerName)) || null;
      }
    }
  }
  ensureEventDataVolleyFields(ev);
}
function syncEventPlayerLinks(events) {
  (events || []).forEach(syncEventPlayerLink);
}
