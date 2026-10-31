import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { relocateVideoScoutContainer } from "../live/workspace-layout.js";
import { session as matchState } from "../../../js/globals.js";
import { saveState } from "../storage/save-state.js";
import { startPlayByPlayFromSelection, stopPlayByPlay, focusFirstFilteredVideoEventMobile, closeVideoMobileFilters } from "./playback.js";
import { publishReactVideoView } from "./source-view.js";
import { publishReactVideoOverlay } from "./view.js";
import { openLocalVideoPicker } from "./video-sources.js";
import { workspaceStore } from "../../state/workspace-store.mjs";
import { renderEventsLog } from "../events/log-view.js";

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

export function updateVideoScoutModeLayout() {
  if (!matchState.elVideoScoutContainer) return;
  const useScout = !!matchState.state.videoScoutMode;
  workspaceStore.publish({ videoVisible: useScout });
  if (typeof matchState.elVideoScoutControls !== "undefined" && matchState.elVideoScoutControls) {
    matchState.elVideoScoutControls.classList.toggle("hidden", !useScout);
  }
  relocateVideoScoutContainer();
  renderEventsLog({ suppressScroll: true });
  if (!useScout) {
    if (matchState.elAnalysisVideoScout) {
      matchState.elAnalysisVideoScout.pause();
    }
    if (workspaceLayoutState.ytPlayerScout && typeof workspaceLayoutState.ytPlayerScout.pauseVideo === "function") {
      workspaceLayoutState.ytPlayerScout.pauseVideo();
    }
  }
}
