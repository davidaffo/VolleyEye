import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";

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

