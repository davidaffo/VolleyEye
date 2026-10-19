import { publishReactVideoView } from "./source-view.js";
import { videoViewStore } from "../../state/video-view-store.mjs";
import { session as matchState } from "../../../js/globals.js";

import { getVideoOverlayEvent, buildVideoOverlayLinesForEvent, updateVideoAnalysisOverlay } from "./video-events.js";
import { saveState } from "../storage/save-state.js";
import { startPlayByPlayFromSelection, stopPlayByPlay, focusFirstFilteredVideoEventMobile, closeVideoMobileFilters } from "./playback.js";
import { openLocalVideoPicker } from "./video-sources.js";



export function publishReactVideoMobileReview(rows, row, index, filterCount) {
  videoViewStore.publish({
    filterCount,
    resultCount: rows.length,
    previousDisabled: !row || index <= 0,
    nextDisabled: !row || index >= rows.length - 1,
  });
}

export function publishReactVideoOverlay() {
  const visible =
    !!matchState.state.videoPlayByPlay && document.body?.dataset.activeTab === "video";
  const event = visible ? getVideoOverlayEvent() : null;
  const overlay = event ? buildVideoOverlayLinesForEvent(event)[0] || "" : "";
  videoViewStore.publish({ overlay, overlayVisible: !!overlay });
}

export function changeReactVideoPlayByPlay(enabled) {
  matchState.state.videoPlayByPlay = !!enabled;
  saveState();
  if (enabled) {
    if (document.body?.dataset.activeTab === "video")
      startPlayByPlayFromSelection({ preservePlayback: true });
  } else stopPlayByPlay();
  publishReactVideoView();
  updateVideoAnalysisOverlay();
}

export function applyReactVideoMobileFilters() {
  focusFirstFilteredVideoEventMobile({ userAction: true });
  closeVideoMobileFilters();
}

export function openReactVideoPicker(scout) {
  return openLocalVideoPicker(scout ? matchState.elVideoFileInputScout : matchState.elVideoFileInput);
}
