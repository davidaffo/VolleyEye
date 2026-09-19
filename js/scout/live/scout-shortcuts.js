function normalizeSetTypeValue(val) {
  if (!val) return null;
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") {
    if (val.set_type) return String(val.set_type).trim();
    if (val.setType) return String(val.setType).trim();
    if (val.type) return String(val.type).trim();
  }
  return String(val).trim();
}
function formatSetTypeLabelWithShortcut(value, label) {
  const key = normalizeSetTypeValue(value);
  const shortcut = key ? SET_TYPE_SHORTCUTS[key.toLowerCase()] : null;
  const base = label || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "");
  return shortcut ? `${base} (${shortcut})` : base;
}
function renderSetTypeShortcuts() {
  const current = normalizeSetTypeValue(state.nextSetType) || "—";
  if (elSetTypeCurrent) {
    elSetTypeCurrent.textContent = current;
  }
  if (!elSetTypeShortcuts) return;
  elSetTypeShortcuts.querySelectorAll("[data-settype]").forEach(btn => {
    const value = btn.dataset.settype || "";
    const option = DEFAULT_SET_TYPE_OPTIONS.find(opt => opt.value === value);
    const label = option ? option.label : btn.textContent || value;
    btn.textContent = formatSetTypeLabelWithShortcut(value, label);
  });
  elSetTypeShortcuts.querySelectorAll("[data-clear-settype]").forEach(btn => {
    btn.textContent = "Nessuna (N)";
  });
  elSetTypeShortcuts.querySelectorAll("[data-settype]").forEach(btn => {
    const active = normalizeSetTypeValue(btn.dataset.settype) === normalizeSetTypeValue(state.nextSetType);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}
function setNextSetType(val) {
  const normalized = normalizeSetTypeValue(val) || "";
  if (!normalized) {
    queuedSetTypeChoice = null;
  }
  state.nextSetType = normalized;
  saveState();
  renderSetTypeShortcuts();
  // Aggiorna subito le card/skill aperte per mostrare il nuovo tipo alzata
  renderPlayers();
}
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (!tag) return false;
  const editable = el.isContentEditable;
  if (editable) return true;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}
function getActiveVideoElement() {
  if (activeTab === "video") return elAnalysisVideo || null;
  if (activeTab === "scout" && state.videoScoutMode) return elAnalysisVideoScout || null;
  return null;
}
function getActiveYoutubeController() {
  if (!state.video || !state.video.youtubeId) return null;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  const preferScout = !!state.videoScoutMode && activeTab !== "video";
  if (preferScout && ytPlayerScout && ytPlayerScoutReady) {
    return { player: ytPlayerScout, ready: ytPlayerScoutReady };
  }
  if (ytPlayer && ytPlayerReady) {
    return { player: ytPlayer, ready: ytPlayerReady };
  }
  return null;
}
function toggleYoutubePlayback() {
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
function handleVideoShortcut(e) {
  if (e.defaultPrevented) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (isTypingTarget(e.target)) return;
  if (elSkillModal && !elSkillModal.classList.contains("hidden")) return;
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
function stepActiveVideoByFrame(direction) {
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
function syncMatchInfoInputs(match) {
  if (!match) return;
  const opponent = document.getElementById("match-opponent");
  const category = document.getElementById("match-category");
  const date = document.getElementById("match-date");
  const matchType = document.getElementById("match-type");
  const leg = document.getElementById("match-leg");
  if (opponent) opponent.value = match.opponent || "";
  if (category) category.value = match.category || "";
  if (date) date.value = match.date || "";
  if (matchType) matchType.value = match.matchType || "amichevole";
  if (leg) leg.value = match.leg || "";
}
function getMatchInfoFromInputs() {
  const opponent = document.getElementById("match-opponent");
  const category = document.getElementById("match-category");
  const date = document.getElementById("match-date");
  const matchType = document.getElementById("match-type");
  const leg = document.getElementById("match-leg");
  return {
    opponent: (opponent && opponent.value ? opponent.value.trim() : "") || "",
    category: (category && category.value ? category.value.trim() : "") || "",
    date: (date && date.value) || "",
    matchType: (matchType && matchType.value) || "amichevole",
    leg: (leg && leg.value) || ""
  };
}
function handleSetTypeHotkeys(e) {
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
  queuedSetTypeChoice = choice;
  setNextSetType(choice);
}
function initSetTypeShortcuts() {
  renderSetTypeShortcuts();
  updateSetTypeVisibility(getPredictedSkillId());
  if (!elSetTypeShortcuts) return;
  elSetTypeShortcuts.addEventListener("click", e => {
    const btn = e.target.closest("[data-settype],[data-clear-settype]");
    if (!btn) return;
    if (btn.hasAttribute("data-clear-settype")) {
      setNextSetType("");
      return;
    }
    queuedSetTypeChoice = btn.dataset.settype || "";
    setNextSetType(btn.dataset.settype || "");
  });
  document.addEventListener("keydown", handleSetTypeHotkeys);
}
