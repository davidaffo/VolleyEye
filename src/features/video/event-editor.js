
import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { saveState } from "../storage/save-state.js";
import { shouldTrackVideoUndo, pushVideoUndoSnapshot } from "./video-sources.js";
import { syncEventPlayerLinks } from "../events/player-links.js";
import { invalidateAnalysisCaches } from "../analysis/cache-model.js";
import { recalculateMatchStats } from "../analysis/stats-model.js";
import { renderLiveScore } from "../live/live-score-and-set.js";
import { renderEventsLog } from "./video-events.js";
import { getSelectedRows } from "../events/selection-model.js";
import { renderAnalysisViews } from "../analysis/aggregated-table.js";
import { renderVideoAnalysis } from "./playback.js";
import { setModalOpenState } from "../layout/modals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { publishReactEventTable } from "../events/table-commands.js";
import { closeReactBulkEditor, openReactBulkEditor } from "../events/dialog-view.js";
import { session as teamManagementState } from "../state/live-team-management.js";

export function refreshAfterVideoEdit(shouldRecalcStats) {
  if (workspaceLayoutState.bulkEditActive) return;
  saveState({ persistLocal: shouldTrackVideoUndo() });
  if (shouldRecalcStats) {
    syncEventPlayerLinks(matchState.state.events || []);
    invalidateAnalysisCaches();
    recalculateMatchStats();
    renderLiveScore();
    renderEventsLog();
    renderAnalysisViews();
  }
  renderVideoAnalysis();
}

export function forceSyncDataFromLog() {
  syncEventPlayerLinks(matchState.state.events || []);
  invalidateAnalysisCaches();
  recalculateMatchStats();
  renderLiveScore();
  renderEventsLog({ suppressScroll: true });
  renderAnalysisViews();
  renderVideoAnalysis();
  saveState();
}

export function closeBulkEditModal() {
  if (!matchState.elBulkEditModal) return;
  closeReactBulkEditor();

  setModalOpenState(false);
  workspaceLayoutState.bulkEditActive = false;
  workspaceLayoutState.bulkEditSession = null;
}

export function shouldRecalcForBulkKey(bulkKey) {
  const noRecalc = new Set(["videoTime", "durationMs", "combination", "attackType"]);
  return !noRecalc.has(bulkKey);
}

export function openBulkEditModal(contextKey, bulkKey) {
  if (!matchState.elBulkEditModal || !matchState.elBulkEditBody) return;
  const config = teamManagementState.BULK_EDIT_CONFIG[bulkKey];
  if (!config) return;
  const rows = getSelectedRows(contextKey);
  if (!rows || rows.length < 2) return;
  const events = rows.map(r => r.ev).filter(Boolean);
  if (!events.length) return;
  const seed = Object.assign({}, events[0]);
  const pending = {};
  workspaceLayoutState.bulkEditSession = {
    pending,
    events,
    shouldRecalc: shouldRecalcForBulkKey(bulkKey)
  };
  workspaceLayoutState.bulkEditActive = true;
  const proxy = new Proxy(seed, {
    set: (_obj, prop, value) => {
      pending[prop] = value;
      seed[prop] = value;
      return true;
    },
    get: (_obj, prop) => seed[prop]
  });
  const ctx = scoutUiState.eventTableContexts[contextKey] || {};

openReactBulkEditor(config,proxy,events,ctx,bulkKey);return;
}

export function applyBulkEditSession() {
      if (!workspaceLayoutState.bulkEditSession) {
        closeBulkEditModal();
        return;
      }
      const entries = Object.entries(workspaceLayoutState.bulkEditSession.pending || {});
      if (entries.length === 0) {
        closeBulkEditModal();
        return;
      }
      pushVideoUndoSnapshot(true);
      workspaceLayoutState.bulkEditActive = false;
      workspaceLayoutState.bulkEditSession.events.forEach(ev => {
        entries.forEach(([key, value]) => {
          ev[key] = value;
        });
      });
      const shouldRecalc = workspaceLayoutState.bulkEditSession.shouldRecalc;
      closeBulkEditModal();
      refreshAfterVideoEdit(shouldRecalc);
      renderEventsLog({ suppressScroll: true });
}
