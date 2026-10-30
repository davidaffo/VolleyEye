import { session as matchState } from "../../../js/globals.js";
import { saveState } from "../storage/save-state.js";
import {
  startPlayByPlayFromSelection,
  stopPlayByPlay,
  focusFirstFilteredVideoEventMobile,
  closeVideoMobileFilters,
} from "./playback.js";
import { publishReactVideoView } from "./source-view.js";
import { publishReactVideoOverlay } from "./view.js";
import { openLocalVideoPicker } from "./video-sources.js";

export function changeReactVideoPlayByPlay(enabled) {
  matchState.state.videoPlayByPlay = !!enabled;
  saveState();
  if (enabled) {
    if (document.body?.dataset.activeTab === "video")
      startPlayByPlayFromSelection({ preservePlayback: true });
  } else stopPlayByPlay();
  publishReactVideoView();
  publishReactVideoOverlay();
}

export function applyReactVideoMobileFilters() {
  focusFirstFilteredVideoEventMobile({ userAction: true });
  closeVideoMobileFilters();
}

export function openReactVideoPicker(scout) {
  return openLocalVideoPicker(
    scout ? matchState.elVideoFileInputScout : matchState.elVideoFileInput,
  );
}
