import { session as applicationState } from './lifecycle.js';
import { finishScoutWidgetDrag } from '../features/live/workspace-layout.js';
import { stopViewPublications } from './view-publication.js';
import { session as browserEffectsState } from './browser-effects.js';
import { updateVideoPlaybackSnapshot } from '../features/live/live-entry.js';
import { session as scoutUiState } from '../features/state/scout-ui.js';
import { session as matchState } from '../../js/globals.js';
import { session as workspaceLayoutState } from '../features/state/live-workspace-layout.js';
export function stop() {
  if (browserEffectsState.runtimeDisposed) return;
  updateVideoPlaybackSnapshot(undefined, true);
  finishScoutWidgetDrag(true);
  stopViewPublications();
  browserEffectsState.runtimeDisposed = true;
  applicationState.ready = false;
  applicationState.startup = undefined;
  browserEffectsState.runtimeEffectListeners
    .splice(0)
    .forEach(([target, type, listener, options]) =>
      target.removeEventListener(type, listener, options),
    );
  browserEffectsState.runtimeTimeouts.forEach(globalThis.clearTimeout);
  browserEffectsState.runtimeIntervals.forEach(globalThis.clearInterval);
  browserEffectsState.runtimeTimeouts.clear();
  browserEffectsState.runtimeIntervals.clear();
  scoutUiState.scoutGridResizeObserver?.disconnect();
  [matchState.elAnalysisVideo, matchState.elAnalysisVideoScout].forEach((video) => video?.pause());
  [workspaceLayoutState.ytPlayer, workspaceLayoutState.ytPlayerScout].forEach((player) => player?.destroy?.());
  if (workspaceLayoutState.videoObjectUrl) URL.revokeObjectURL(workspaceLayoutState.videoObjectUrl);
}
