import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { clearEventSelection } from "../events/selection-view.js";
import { clearCachedLocalVideo } from "./local-file-storage.js";

export function resetMatchVideoPlayback({ includeScout = false } = {}) {
  clearEventSelection({ clearContexts: true });
  clearCachedLocalVideo();
  stopYoutube(workspaceLayoutState.ytPlayer);
  if (includeScout) stopYoutube(workspaceLayoutState.ytPlayerScout);
  resetLocalVideo(matchState.elAnalysisVideo);
  if (includeScout) resetLocalVideo(matchState.elAnalysisVideoScout);
  resetYoutubeFrame(matchState.elYoutubeFrame);
  if (includeScout) resetYoutubeFrame(matchState.elYoutubeFrameScout);
}
function stopYoutube(player) {
  if (player && player.stopVideo) player.stopVideo();
}
function resetLocalVideo(video) {
  if (!video) return;
  video.pause();
  video.currentTime = 0;
}
function resetYoutubeFrame(frame) {
  if (!frame) return;
  frame.src = "";
  frame.style.display = "none";
}
