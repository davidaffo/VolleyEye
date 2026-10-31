import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";

export function shouldTrackVideoUndo() {
  return document && document.body && document.body.dataset.activeTab === "video";
}

export function pushVideoUndoSnapshot(force = false) {
  if ((!force && !shouldTrackVideoUndo()) || (!force && workspaceLayoutState.bulkEditActive)) return;
  const snapshot = {
    events: JSON.parse(JSON.stringify(matchState.state.events || [])),
    video: Object.assign({}, matchState.state.video || {})
  };
  workspaceLayoutState.videoUndoStack.push(snapshot);
  if (workspaceLayoutState.videoUndoStack.length > workspaceLayoutState.VIDEO_UNDO_LIMIT) {
    workspaceLayoutState.videoUndoStack.shift();
  }
}
