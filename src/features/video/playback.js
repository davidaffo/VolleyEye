import { downloadBlob } from "../../../js/globals.js";
import { sanitizeVideoOutputBase, stripFileExtension } from "./export-model.js";
import { getPlayByPlayStartTime, getPlayByPlayDurationSeconds } from "./playback-model.js";
import { getVideoPlayByPlayRows, getPlayByPlayStartIndex, getVideoMobileCurrentRow, getSelectedRows } from "../events/selection-model.js";
import { session } from "../state/video-playback.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { setModalOpenState } from "../layout/modals.js";
import { ensureVideoAnalysisSortState, sortVideoEvents } from "./sort-model.js";
import { getTeamScopeFromEvent } from "../teams/selectors.js";
import { computeEventVideoTime } from "./timing.js";
import { updateVideoSyncLabel, publishReactVideoView } from "./source-view.js";
import { clearYoutubeSource, renderYoutubePlayer, renderYoutubePlayerScout } from "./youtube-player.js";
import { persistLocalVideoReference } from "./local-file-storage.js";
import { pushVideoUndoSnapshot } from "./undo-model.js";
import { getVideoBaseTimeMs, getVideoSkillEvents } from "./event-model.js";
import { resolvePlayerIdx } from "../events/player-links.js";
import { updateSelectionStyles, updateVideoSelectionCount } from "../events/selection-view.js";
import { setSelectionForContext, scrollRowIntoView, handleSeekForSelection } from "../events/selection-commands.js";
import { publishReactVideoOverlay, publishReactVideoMobileReview } from "./view.js";
import { getEventKey } from "../../domain/event-key.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { session as browserEffectsState } from "../../app/browser-effects.js";
import { session as matchState } from "../../../js/globals.js";
import { getActiveVideoPlaybackSeconds, seekVideoToTime } from "./media-state.js";
import { countActiveVideoFilters, snapshotVideoFilters } from "../analysis/video-filter-model.js";
import { matchesVideoFilters } from "../analysis/filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { mobileVideoSourceStore } from "../../state/roster-import-store.mjs";
import { renderVideoFilters } from "../analysis/video-filters.js";
import { publishReactEventTable } from "../events/table-view.js";
import { getBaseZoneForPlayer } from "../teams/court-model.js";
import { saveState } from "../storage/save-state.js";

const playbackState = session;

export function stopPlayByPlay() {
  if (workspaceLayoutState.playByPlayTimer) {
    browserEffectsState.clearInterval(workspaceLayoutState.playByPlayTimer);
    workspaceLayoutState.playByPlayTimer = null;
  }
  workspaceLayoutState.playByPlayState.active = false;
  workspaceLayoutState.playByPlayState.index = -1;
  workspaceLayoutState.playByPlayState.key = null;
  workspaceLayoutState.playByPlayState.endTime = null;
  workspaceLayoutState.playByPlayState.endAtMs = null;
}

export function ensurePlayByPlayMonitor() {
  if (workspaceLayoutState.playByPlayTimer) return;
  workspaceLayoutState.playByPlayTimer = browserEffectsState.setInterval(() => {
    if (!matchState.state.videoPlayByPlay) {
      stopPlayByPlay();
      return;
    }
    const activeTab = document && document.body ? document.body.dataset.activeTab : "";
    if (activeTab !== "video") {
      stopPlayByPlay();
      return;
    }
    const rows = getVideoPlayByPlayRows();
    if (!rows.length || !workspaceLayoutState.playByPlayState.active) {
      stopPlayByPlay();
      return;
    }
    if (workspaceLayoutState.playByPlayState.index < 0 || workspaceLayoutState.playByPlayState.index >= rows.length) {
      stopPlayByPlay();
      return;
    }
    if (!isFinite(workspaceLayoutState.playByPlayState.endTime)) return;
    const current = getActiveVideoPlaybackSeconds();
    if (typeof current !== "number") {
      if (workspaceLayoutState.playByPlayState.endAtMs && Date.now() < workspaceLayoutState.playByPlayState.endAtMs) return;
    } else if (current + 0.03 < workspaceLayoutState.playByPlayState.endTime) {
      return;
    }
    const nextIndex = workspaceLayoutState.playByPlayState.index + 1;
    if (nextIndex >= rows.length) {
      stopPlayByPlay();
      return;
    }
    startPlayByPlayAtIndex(nextIndex);
  }, 150);
}

export function startPlayByPlayFromSelection(options = {}) {
  const rows = getVideoPlayByPlayRows();
  if (!rows.length) {
    stopPlayByPlay();
    return;
  }
  const idx = getPlayByPlayStartIndex(rows);
  startPlayByPlayAtIndex(idx, options);
}

export function startPlayByPlayAtIndex(idx, options = {}) {
  const rows = getVideoPlayByPlayRows();
  if (!rows.length || idx < 0 || idx >= rows.length) {
    stopPlayByPlay();
    return;
  }
  const row = rows[idx];
  workspaceLayoutState.playByPlayState.active = true;
  workspaceLayoutState.playByPlayState.index = idx;
  workspaceLayoutState.playByPlayState.key = row.key;
  const baseMs = scoutUiState.eventTableContexts.video ? scoutUiState.eventTableContexts.video.baseMs : getVideoBaseTimeMs(getVideoSkillEvents());
  const start = getPlayByPlayStartTime(row, baseMs);
  if (!isFinite(start)) {
    stopPlayByPlay();
    return;
  }
  const duration = getPlayByPlayDurationSeconds(row.ev || {});
  workspaceLayoutState.playByPlayState.endTime = start + duration;
  workspaceLayoutState.playByPlayState.endAtMs = Date.now() + duration * 1000;
  if (options.preserveSelection) {
    scoutUiState.lastSelectedEventId = row.key;
    scoutUiState.lastEventContextKey = "video";
    updateSelectionStyles();
  } else {
    setSelectionForContext("video", new Set([row.key]), row.key, { userAction: false });
  }
  scrollRowIntoView(row);
  const preservePlayback = options.preservePlayback !== false;
  seekVideoToTime(start, { preservePlayback });
  ensurePlayByPlayMonitor();
}

export function syncPlayByPlayAfterRender() {
  if (!matchState.state.videoPlayByPlay) {
    stopPlayByPlay();
    return;
  }
  if (!workspaceLayoutState.playByPlayState.active) return;
  const rows = getVideoPlayByPlayRows();
  if (!rows.length) {
    stopPlayByPlay();
    return;
  }
  const idx = workspaceLayoutState.playByPlayState.key ? rows.findIndex(r => r.key === workspaceLayoutState.playByPlayState.key) : -1;
  if (idx === -1) {
    stopPlayByPlay();
    return;
  }
  workspaceLayoutState.playByPlayState.index = idx;
  workspaceLayoutState.playByPlayState.key = rows[idx].key;
}

export function handleVideoSelectionChange(_rows, _ctx, opts) {
  renderVideoMobileReview();
  if (!opts || !opts.userAction) return;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (matchState.state.videoPlayByPlay) {
    if (activeTab !== "video") return;
    const preserveSelection = !!opts.preserveSelection || scoutUiState.selectedEventIds.size > 1;
    startPlayByPlayFromSelection({ preserveSelection, preservePlayback: true });
    return;
  }
  handleSeekForSelection("video", { preservePlayback: true, userAction: true });
  publishReactVideoOverlay();
}

export function renderVideoMobileReview() {
  scheduleVideoMobileSourcePrompt();
  const { rows, row, index } = getVideoMobileCurrentRow();
  const filterCount = countActiveVideoFilters(snapshotVideoFilters());

    publishReactVideoMobileReview(rows, row, index, filterCount);
    return;

}

export function selectVideoMobileEvent(delta) {
  const { rows, index } = getVideoMobileCurrentRow();
  if (!rows.length) return;
  const hasSelection = rows.some(row => scoutUiState.selectedEventIds.has(row.key));
  const requestedIndex = hasSelection ? index + delta : delta < 0 ? rows.length - 1 : 0;
  const targetIndex = Math.min(rows.length - 1, Math.max(0, requestedIndex));
  const target = rows[targetIndex];
  setSelectionForContext("video", new Set([target.key]), target.key, { userAction: true });
  renderVideoMobileReview();
}

export function focusFirstFilteredVideoEventMobile(options = {}) {
  if (!isVideoMobileViewport()) return;
  if (!document.body || document.body.dataset.activeTab !== "video") return;
  const ctx = scoutUiState.eventTableContexts.video;
  const rows = ctx && Array.isArray(ctx.rows) ? ctx.rows : [];
  if (!rows.length) return;
  const first = rows[0];
  const userAction = !!options.userAction;
  stopPlayByPlay();
  setSelectionForContext("video", new Set([first.key]), first.key, { userAction });
  if (!userAction) {
    const baseMs = ctx ? ctx.baseMs : getVideoBaseTimeMs(getVideoSkillEvents());
    const time = typeof first.videoTime === "number"
      ? first.videoTime
      : computeEventVideoTime(first.ev || {}, baseMs);
    if (isFinite(time)) seekVideoToTime(time, { preservePlayback: true });
  }
  renderVideoMobileReview();
}

export function openVideoMobileFilters() {
  document.body.classList.add("video-mobile-filters-open");
}

export function closeVideoMobileFilters() {
  document.body.classList.remove("video-mobile-filters-open");
}

export function hasPlayableVideoSource() {
  if (matchState.state.video && matchState.state.video.youtubeId) return true;
  if (typeof workspaceLayoutState.videoObjectUrl === "string" && workspaceLayoutState.videoObjectUrl) return true;
  return [matchState.elAnalysisVideo, matchState.elAnalysisVideoScout].filter(Boolean).some(video => {
    return !!(video.currentSrc || video.getAttribute("src"));
  });
}

export function isVideoMobileViewport() {
  return !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 700px)").matches;
}

export function updateVideoMobileSourceButton() {
  if (!matchState.elVideoMobileSourceOpen) return;

 publishReactVideoView(); return;
}

export function openVideoMobileSourceModal(options = {}) {
  if (!matchState.elVideoMobileSourceModal || !isVideoMobileViewport()) return;
  if (options.automatic && playbackState.videoMobileSourcePromptDismissed) return;
  mobileVideoSourceStore.publish({open:true,url:matchState.state.video?.youtubeUrl||""});setModalOpenState(true,true);return;

}

export function closeVideoMobileSourceModal(options = {}) {
  if (!matchState.elVideoMobileSourceModal) return;
  if (options.dismiss !== false) playbackState.videoMobileSourcePromptDismissed = true;
  mobileVideoSourceStore.publish({open:false});
  setModalOpenState(false, true);
}

export function maybeOpenVideoMobileSourceModal() {
  playbackState.videoMobileSourcePromptTimer = null;
  if (!isVideoMobileViewport()) return;
  if (!document.body || document.body.dataset.activeTab !== "video") return;
  updateVideoMobileSourceButton();
  if (hasPlayableVideoSource() || playbackState.videoMobileSourcePromptDismissed) return;
  if (matchState.elVideoMobileSourceModal && !matchState.elVideoMobileSourceModal.classList.contains("hidden")) return;
  openVideoMobileSourceModal({ automatic: true });
}

export function scheduleVideoMobileSourcePrompt() {
  updateVideoMobileSourceButton();
  if (playbackState.videoMobileSourcePromptTimer) return;
  playbackState.videoMobileSourcePromptTimer = browserEffectsState.setTimeout(maybeOpenVideoMobileSourceModal, 500);
}

export function renderVideoAnalysis() {
  const videoSortState = ensureVideoAnalysisSortState();
  const skillEvents = getVideoSkillEvents();
  const baseMs = getVideoBaseTimeMs(skillEvents);
  updateVideoSyncLabel();
  if (!skillEvents.length) {
    if (matchState.state.videoPlayByPlay) stopPlayByPlay();
    try {
      renderVideoFilters([]);
    } catch (err) {
      console.error("Video filters error", err);
    }

      publishReactEventTable("video-skills-container",[],{contextKey:"video",tableClass:"video-skills-table event-edit-table",empty:"Registra alcune skill per vederle qui."});publishReactVideoOverlay();updateVideoSelectionCount();renderVideoMobileReview();return;

}
  try {
    renderVideoFilters(skillEvents.map(item => item.ev));
  } catch (err) {
    console.error("Video filters error", err);
  }
  let updatedZones = false;
  skillEvents.forEach(({ ev }) => {
    const fallbackZone = getBaseZoneForPlayer(resolvePlayerIdx(ev), getTeamScopeFromEvent(ev));
    if ((ev.zone === undefined || ev.zone === null || ev.zone === "") && fallbackZone) {
      ev.zone = fallbackZone;
      updatedZones = true;
    }
  });
  const filteredEvents = skillEvents
    .map(item => item.ev)
    .filter(ev => matchesVideoFilters(ev, analysisFiltersState.videoFilterState));
  const sortedEvents = sortVideoEvents(filteredEvents, baseMs);
  if (!filteredEvents.length) {
    if (matchState.state.videoPlayByPlay) stopPlayByPlay();

      publishReactEventTable("video-skills-container",[],{contextKey:"video",tableClass:"video-skills-table event-edit-table",empty:"Nessuna skill con i filtri attivi."});publishReactVideoOverlay();updateVideoSelectionCount();renderVideoMobileReview();return;

}
  publishReactEventTable(
    "video-skills-container",
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
  publishReactVideoOverlay();
  renderVideoMobileReview();
  syncPlayByPlayAfterRender();
  if (updatedZones) {
    saveState();
  }
}


export function handleVideoFileChange(file, options = {}) {
  if (!file || (!matchState.elAnalysisVideo && !matchState.elAnalysisVideoScout)) return;
  const { fileHandle = null, restoring = false } = options || {};
  clearYoutubeSource();
  try {
    if (workspaceLayoutState.videoObjectUrl) {
      URL.revokeObjectURL(workspaceLayoutState.videoObjectUrl);
    }
  } catch (_) {
    // ignore revoke errors
  }
  const url = URL.createObjectURL(file);
  workspaceLayoutState.videoObjectUrl = url;
  workspaceLayoutState.videoLocalFile = file;

  if (!restoring) persistLocalVideoReference(fileHandle);
  matchState.state.video = matchState.state.video || {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  matchState.state.video.fileName = file.name || "video";
  matchState.state.video.youtubeId = "";
  matchState.state.video.youtubeUrl = "";
  if (!restoring) matchState.state.video.lastPlaybackSeconds = 0;
  matchState.state.video.fileReferenceMode = fileHandle ? "handle" : "manual";
  if (restoring) {
    const seconds = Number(matchState.state.video.lastPlaybackSeconds);
    [matchState.elAnalysisVideo, matchState.elAnalysisVideoScout].filter(Boolean).forEach(video => {
      const restoreTime = () => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        try {
          video.currentTime = seconds;
        } catch (_) {
          // ignore seek errors until metadata is ready
        }
      };
      if (video.readyState >= 1) restoreTime();
      else video.addEventListener("loadedmetadata", restoreTime, { once: true });
    });
  }
  saveState();
  renderYoutubePlayer(0);
  renderYoutubePlayerScout(0);
  renderVideoAnalysis();
  playbackState.videoMobileSourcePromptDismissed = false;
  closeVideoMobileSourceModal({ dismiss: false });
  updateVideoMobileSourceButton();
}

export function syncFirstSkillToVideo() {
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
    if (matchState.state.video && matchState.state.video.youtubeId) {
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

export async function saveCurrentVideoFrame() {
  if (matchState.state.video && matchState.state.video.youtubeId) {
    alert("Per salvare un fotogramma carica il file video locale. Il player YouTube non consente di estrarre immagini dal browser.");
    return;
  }
  const video = matchState.elAnalysisVideo;
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight || video.seeking) {
    alert("Carica un video locale e attendi che il fotogramma sia visibile prima di salvarlo.");
    return;
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base = sanitizeVideoOutputBase(stripFileExtension(matchState.state.video && matchState.state.video.fileName)) || "video";
    const timestamp = video.currentTime.toFixed(3).replace(".", "-");
    const fileName = `${base}_fotogramma_${timestamp}s.jpg`;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("frame-export-failed");
    downloadBlob(blob, fileName);
  } catch (_) {
    alert("Impossibile salvare il fotogramma. Riprova caricando il file video locale.");
  }
}
