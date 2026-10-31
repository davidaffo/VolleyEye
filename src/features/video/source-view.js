import { videoViewStore } from "../../state/video-view-store.mjs";
import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { formatVideoTimestamp } from "./timing.js";

export function publishReactVideoView() {
  videoViewStore.publish({
    youtubeUrl: matchState.state.video?.youtubeUrl || "",
    youtubeId: matchState.state.video?.youtubeId || "",
    localSource: workspaceLayoutState.videoObjectUrl || "",
    hasSource: !!(matchState.state.video?.youtubeId || workspaceLayoutState.videoObjectUrl),
    playByPlay: !!matchState.state.videoPlayByPlay,
  });
}

export function updateVideoSyncLabel() {
  if (!matchState.elVideoSyncLabel) return;
  const offset =
    matchState.state.video && typeof matchState.state.video.offsetSeconds === "number" ? matchState.state.video.offsetSeconds : 0;
  matchState.elVideoSyncLabel.textContent =
    offset > 0 ? "Prima skill allineata a " + formatVideoTimestamp(offset) : "La prima skill parte da 0:00";
}
