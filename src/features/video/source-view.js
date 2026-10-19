import { videoViewStore } from '../../state/video-view-store.mjs';
import { session as matchState } from '../../../js/globals.js';
import { session as workspaceLayoutState } from '../state/live-workspace-layout.js';

export function publishReactVideoView() {
  videoViewStore.publish({
    youtubeUrl: matchState.state.video?.youtubeUrl || "",
    youtubeId: matchState.state.video?.youtubeId || "",
    localSource: workspaceLayoutState.videoObjectUrl || "",
    hasSource: !!(matchState.state.video?.youtubeId || workspaceLayoutState.videoObjectUrl),
    playByPlay: !!matchState.state.videoPlayByPlay,
  });
}
