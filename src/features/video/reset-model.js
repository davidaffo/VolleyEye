import { session as matchState } from "../../../js/globals.js";

export function resetMatchVideoState() {
  matchState.state.video = { offsetSeconds: 0, fileName: "", youtubeId: "", youtubeUrl: "", lastPlaybackSeconds: 0 };
  matchState.state.videoFilterPresets = [];
  matchState.state.videoClock = { paused: true, pausedAtMs: null, pausedAccumMs: 0, startMs: Date.now(), currentSeconds: 0 };
}
