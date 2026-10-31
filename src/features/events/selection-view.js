import { eventTableStore } from "../../state/event-table-store.mjs";
import { pruneEventSelection } from "./selection-model.js";
import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { videoViewStore } from "../../state/video-view-store.mjs";

export function clearEventSelection({ clearContexts = true } = {}) {
  scoutUiState.selectedEventIds.clear();
  scoutUiState.lastSelectedEventId = null;
  scoutUiState.lastEventContextKey = null;
  if (clearContexts) {
    Object.keys(scoutUiState.eventTableContexts).forEach(key => {
      delete scoutUiState.eventTableContexts[key];
    });
  }
  updateSelectionStyles();
}

export function updateSelectionStyles() {
  pruneEventSelection();
  eventTableStore.select([...scoutUiState.selectedEventIds]);
  updateVideoSelectionCount();
}

export function updateVideoSelectionCount() {
  if (!matchState.elVideoSelectionCount) return;
  const ctx = scoutUiState.eventTableContexts.video;
  const count = ctx && ctx.rows ? ctx.rows.filter(r => scoutUiState.selectedEventIds.has(r.key)).length : 0;
   videoViewStore.publish({ selectionCount: count }); return;

}

export function removeEventTableContext(key) {
  if (!key) return;
  delete scoutUiState.eventTableContexts[key];
  updateSelectionStyles();
}
