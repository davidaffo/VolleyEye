function getVideoPlayByPlayRows() {
  const ctx = eventTableContexts.video;
  return ctx && Array.isArray(ctx.rows) ? ctx.rows : [];
}
function getPlayByPlayStartIndex(rows) {
  if (!rows.length) return -1;
  const preferredKey =
    lastSelectedEventId && selectedEventIds.has(lastSelectedEventId)
      ? lastSelectedEventId
      : selectedEventIds.values().next().value;
  if (preferredKey) {
    const idx = rows.findIndex(r => r.key === preferredKey);
    if (idx !== -1) return idx;
  }
  return 0;
}
function getPlayByPlayStartTime(row, baseMs) {
  if (!row) return null;
  if (typeof row.videoTime === "number" && isFinite(row.videoTime)) return row.videoTime;
  const ev = row.ev || {};
  if (typeof ev.videoTime === "number" && isFinite(ev.videoTime)) return ev.videoTime;
  return computeEventVideoTime(ev, baseMs);
}
function getPlayByPlayDurationSeconds(ev) {
  const baseMs = ev && typeof ev.durationMs === "number" && isFinite(ev.durationMs)
    ? ev.durationMs
    : getDefaultSkillDurationMs();
  const seconds = baseMs != null ? baseMs / 1000 : 5;
  return Math.max(0.1, seconds);
}
function stopPlayByPlay() {
  if (playByPlayTimer) {
    clearInterval(playByPlayTimer);
    playByPlayTimer = null;
  }
  playByPlayState.active = false;
  playByPlayState.index = -1;
  playByPlayState.key = null;
  playByPlayState.endTime = null;
  playByPlayState.endAtMs = null;
}
function ensurePlayByPlayMonitor() {
  if (playByPlayTimer) return;
  playByPlayTimer = setInterval(() => {
    if (!state.videoPlayByPlay) {
      stopPlayByPlay();
      return;
    }
    const activeTab = document && document.body ? document.body.dataset.activeTab : "";
    if (activeTab !== "video") {
      stopPlayByPlay();
      return;
    }
    const rows = getVideoPlayByPlayRows();
    if (!rows.length || !playByPlayState.active) {
      stopPlayByPlay();
      return;
    }
    if (playByPlayState.index < 0 || playByPlayState.index >= rows.length) {
      stopPlayByPlay();
      return;
    }
    if (!isFinite(playByPlayState.endTime)) return;
    const current = getActiveVideoPlaybackSeconds();
    if (typeof current !== "number") {
      if (playByPlayState.endAtMs && Date.now() < playByPlayState.endAtMs) return;
    } else if (current + 0.03 < playByPlayState.endTime) {
      return;
    }
    const nextIndex = playByPlayState.index + 1;
    if (nextIndex >= rows.length) {
      stopPlayByPlay();
      return;
    }
    startPlayByPlayAtIndex(nextIndex);
  }, 150);
}
function startPlayByPlayFromSelection(options = {}) {
  const rows = getVideoPlayByPlayRows();
  if (!rows.length) {
    stopPlayByPlay();
    return;
  }
  const idx = getPlayByPlayStartIndex(rows);
  startPlayByPlayAtIndex(idx, options);
}
function startPlayByPlayAtIndex(idx, options = {}) {
  const rows = getVideoPlayByPlayRows();
  if (!rows.length || idx < 0 || idx >= rows.length) {
    stopPlayByPlay();
    return;
  }
  const row = rows[idx];
  playByPlayState.active = true;
  playByPlayState.index = idx;
  playByPlayState.key = row.key;
  const baseMs = eventTableContexts.video ? eventTableContexts.video.baseMs : getVideoBaseTimeMs(getVideoSkillEvents());
  const start = getPlayByPlayStartTime(row, baseMs);
  if (!isFinite(start)) {
    stopPlayByPlay();
    return;
  }
  const duration = getPlayByPlayDurationSeconds(row.ev || {});
  playByPlayState.endTime = start + duration;
  playByPlayState.endAtMs = Date.now() + duration * 1000;
  if (options.preserveSelection) {
    lastSelectedEventId = row.key;
    lastEventContextKey = "video";
    updateSelectionStyles();
  } else {
    setSelectionForContext("video", new Set([row.key]), row.key, { userAction: false });
  }
  scrollRowIntoView(row);
  const preservePlayback = options.preservePlayback !== false;
  seekVideoToTime(start, { preservePlayback });
  ensurePlayByPlayMonitor();
}
function syncPlayByPlayAfterRender() {
  if (!state.videoPlayByPlay) {
    stopPlayByPlay();
    return;
  }
  if (!playByPlayState.active) return;
  const rows = getVideoPlayByPlayRows();
  if (!rows.length) {
    stopPlayByPlay();
    return;
  }
  const idx = playByPlayState.key ? rows.findIndex(r => r.key === playByPlayState.key) : -1;
  if (idx === -1) {
    stopPlayByPlay();
    return;
  }
  playByPlayState.index = idx;
  playByPlayState.key = rows[idx].key;
}
function handleVideoSelectionChange(_rows, _ctx, opts) {
  if (!opts || !opts.userAction) return;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (state.videoPlayByPlay) {
    if (activeTab !== "video") return;
    const preserveSelection = !!opts.preserveSelection || selectedEventIds.size > 1;
    startPlayByPlayFromSelection({ preserveSelection, preservePlayback: true });
    return;
  }
  handleSeekForSelection("video", { preservePlayback: true, userAction: true });
  updateVideoAnalysisOverlay();
}
function renderVideoAnalysis() {
  if (!elVideoSkillsContainer) return;
  const videoSortState = ensureVideoAnalysisSortState();
  const skillEvents = getVideoSkillEvents();
  const baseMs = getVideoBaseTimeMs(skillEvents);
  updateVideoSyncLabel();
  if (elVideoFileLabel) {
    const label =
      (state.video && state.video.youtubeId && state.video.youtubeUrl) ||
      (state.video && state.video.fileName) ||
      "Nessun file caricato";
    elVideoFileLabel.textContent = label;
  }
  if (!skillEvents.length) {
    if (state.videoPlayByPlay) stopPlayByPlay();
    try {
      renderVideoFilters([]);
    } catch (err) {
      console.error("Video filters error", err);
    }
    elVideoSkillsContainer.innerHTML = "";
    updateVideoAnalysisOverlay();
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "Registra alcune skill per vederle qui.";
    tr.appendChild(td);
    const tbl = document.createElement("table");
    tbl.className = "video-skills-table event-edit-table";
    const tbody = document.createElement("tbody");
    tbody.appendChild(tr);
    tbl.appendChild(tbody);
    elVideoSkillsContainer.appendChild(tbl);
    updateVideoSelectionCount();
    return;
  }
  try {
    renderVideoFilters(skillEvents.map(item => item.ev));
  } catch (err) {
    console.error("Video filters error", err);
  }
  let updatedZones = false;
  skillEvents.forEach(({ ev }) => {
    const fallbackZone = getCurrentZoneForPlayer(resolvePlayerIdx(ev), null, getTeamScopeFromEvent(ev));
    if ((ev.zone === undefined || ev.zone === null || ev.zone === "") && fallbackZone) {
      ev.zone = fallbackZone;
      updatedZones = true;
    }
  });
  const filteredEvents = skillEvents
    .map(item => item.ev)
    .filter(ev => matchesVideoFilters(ev, videoFilterState));
  const sortedEvents = sortVideoEvents(filteredEvents, baseMs);
  if (!filteredEvents.length) {
    if (state.videoPlayByPlay) stopPlayByPlay();
    elVideoSkillsContainer.innerHTML = "";
    updateVideoAnalysisOverlay();
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "Nessuna skill con i filtri attivi.";
    tr.appendChild(td);
    const tbl = document.createElement("table");
    tbl.className = "video-skills-table event-edit-table";
    const tbody = document.createElement("tbody");
    tbody.appendChild(tr);
    tbl.appendChild(tbody);
    elVideoSkillsContainer.appendChild(tbl);
    updateVideoSelectionCount();
    return;
  }
  renderEventTableRows(
    elVideoSkillsContainer,
    sortedEvents,
    {
      showSeek: false,
      showVideoTime: true,
      baseMs,
      tableClass: "video-skills-table event-edit-table",
      enableSelection: true,
      contextKey: "video",
      onSelectionChange: handleVideoSelectionChange,
      sortState: videoSortState,
      onSortChange: sortKey => {
        const current = ensureVideoAnalysisSortState();
        if (current.key !== sortKey) {
          current.key = sortKey;
          current.dir = "asc";
        } else if (current.dir === "asc") {
          current.dir = "desc";
        } else if (current.dir === "desc") {
          current.key = "";
          current.dir = "";
        } else {
          current.dir = "asc";
        }
        saveState({ persistLocal: true });
        renderVideoAnalysis();
      }
    }
  );
  updateVideoSelectionCount();
  updateVideoAnalysisOverlay();
  syncPlayByPlayAfterRender();
  if (updatedZones) {
    saveState();
  }
}
function seekVideoToTime(seconds, options = {}) {
  if (!isFinite(seconds)) return;
  const preservePlayback = !!options.preservePlayback;
  const target = Math.max(0, seconds);
  updateVideoPlaybackSnapshot(target, true);
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  const preferScout = !!state.videoScoutMode && activeTab !== "video";
  const wasPlaying =
    state.video && state.video.youtubeId
      ? (preferScout ? isYoutubePlayerPlaying(ytPlayerScout, ytPlayerScoutReady) : false) ||
        isYoutubePlayerPlaying(ytPlayer, ytPlayerReady)
      : isVideoElementPlaying(preferScout ? elAnalysisVideoScout : elAnalysisVideo) ||
        isVideoElementPlaying(elAnalysisVideoScout) ||
        isVideoElementPlaying(elAnalysisVideo);
  const playbackCommand = preservePlayback ? (wasPlaying ? "play" : "none") : "play";
  if (state.video && state.video.youtubeId) {
    if (preferScout) {
      if (youtubeScoutFallback && elYoutubeFrameScout) {
        if (elYoutubeFrameScout.contentWindow) {
          try {
            elYoutubeFrameScout.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
              "*"
            );
            if (playbackCommand !== "none") {
              elYoutubeFrameScout.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                "*"
              );
            }
            return;
          } catch (_) {
            // ignore postMessage errors and fall back to src update
          }
        }
        elYoutubeFrameScout.src = buildYoutubeEmbedSrc(
          state.video.youtubeId,
          target,
          true,
          playbackCommand === "play"
        );
        return;
      }
      if (ytPlayerScout && typeof ytPlayerScout.seekTo === "function") {
        ytPlayerScout.seekTo(target, true);
        if (playbackCommand === "play" && typeof ytPlayerScout.playVideo === "function") {
          ytPlayerScout.playVideo();
        }
      } else if (elYoutubeFrameScout) {
        if (elYoutubeFrameScout.contentWindow) {
          try {
            elYoutubeFrameScout.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
              "*"
            );
            if (playbackCommand !== "none") {
              elYoutubeFrameScout.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: "playVideo", args: [] }),
                "*"
              );
            }
            return;
          } catch (_) {
            // ignore postMessage errors and fall back to src update
          }
        }
        elYoutubeFrameScout.src = buildYoutubeEmbedSrc(
          state.video.youtubeId,
          target,
          true,
          playbackCommand === "play"
        );
      }
      return;
    }
    if (youtubeFallback && elYoutubeFrame) {
      if (elYoutubeFrame.contentWindow) {
        try {
          elYoutubeFrame.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
            "*"
          );
          if (playbackCommand !== "none") {
            elYoutubeFrame.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
          }
          return;
        } catch (_) {
          // ignore postMessage errors and fall back to src update
        }
      }
      elYoutubeFrame.src = buildYoutubeEmbedSrc(
        state.video.youtubeId,
        target,
        true,
        playbackCommand === "play"
      );
      return;
    }
    if (ytPlayer && typeof ytPlayer.seekTo === "function") {
      queueYoutubeSeek(target, playbackCommand === "play");
    } else if (elYoutubeFrame) {
      if (elYoutubeFrame.contentWindow) {
        try {
          elYoutubeFrame.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
            "*"
          );
          if (playbackCommand !== "none") {
            elYoutubeFrame.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
          }
          return;
        } catch (_) {
          // ignore postMessage errors and fall back to src update
        }
      }
      elYoutubeFrame.src = buildYoutubeEmbedSrc(
        state.video.youtubeId,
        target,
        true,
        playbackCommand === "play"
      );
    }
    return;
  }
  if (preferScout && elAnalysisVideoScout) {
    try {
      const wasPaused = elAnalysisVideoScout.paused;
      elAnalysisVideoScout.currentTime = target;
      if (!preservePlayback || !wasPaused) {
        elAnalysisVideoScout.play().catch(() => {});
      }
    } catch (_) {
      // ignore errors when seeking
    }
    return;
  }
  if (!elAnalysisVideo) return;
  try {
    const wasPaused = elAnalysisVideo.paused;
    elAnalysisVideo.currentTime = target;
    if (!preservePlayback || !wasPaused) {
      elAnalysisVideo.play().catch(() => {});
    }
  } catch (_) {
    // ignore errors when seeking
  }
}
function handleVideoFileChange(file) {
  if (!file || (!elAnalysisVideo && !elAnalysisVideoScout)) return;
  clearYoutubeSource();
  try {
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
    }
  } catch (_) {
    // ignore revoke errors
  }
  const url = URL.createObjectURL(file);
  videoObjectUrl = url;
  if (elAnalysisVideo) {
    elAnalysisVideo.src = url;
  }
  if (elAnalysisVideoScout) {
    elAnalysisVideoScout.src = url;
  }
  persistLocalVideo(file);
  state.video = state.video || {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  state.video.fileName = file.name || "video";
  state.video.youtubeId = "";
  state.video.youtubeUrl = "";
  state.video.lastPlaybackSeconds = 0;
  saveState();
  renderYoutubePlayer(0);
  renderYoutubePlayerScout(0);
  renderVideoAnalysis();
}
function syncFirstSkillToVideo() {
  const skillEvents = getVideoSkillEvents();
  if (!skillEvents.length) {
    alert("Registra almeno una skill per poter sincronizzare.");
    return;
  }
  const selected = getSelectedRows("video");
  const selectedRow = selected.length ? selected[selected.length - 1] : null;
  if (!selectedRow) {
    alert("Seleziona una skill per sincronizzare.");
    return;
  }
  const baseMs = getVideoBaseTimeMs(skillEvents);
  const selectedTime = computeEventVideoTime(selectedRow.ev, baseMs);
  let currentVideoTime = getActiveVideoPlaybackSeconds();
  if (typeof currentVideoTime !== "number" || !isFinite(currentVideoTime)) {
    if (state.video && state.video.youtubeId) {
      alert("Apri e avvia il video YouTube per sincronizzare.");
      return;
    }
    currentVideoTime = 0;
  }
  const delta = currentVideoTime - selectedTime;
  const selectedKey = selectedRow.key;
  const selectedIdx = skillEvents.findIndex(({ ev }, idx) => getEventKey(ev, idx) === selectedKey);
  if (selectedIdx === -1) {
    alert("Skill selezionata non trovata.");
    return;
  }
  pushVideoUndoSnapshot();
  skillEvents.forEach(({ ev }, idx) => {
    if (!ev || idx < selectedIdx) return;
    const current = computeEventVideoTime(ev, baseMs);
    ev.videoTime = Math.max(0, current + delta);
  });
  saveState({ persistLocal: true });
  renderVideoAnalysis();
  if (typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("video_sync_used");
  }
}
