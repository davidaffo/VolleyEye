
import { session as matchState } from "../../../js/globals.js";
import { isLiberoForScope } from "../teams/libero-model.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";
import { saveState } from "../storage/save-state.js";
import { shouldTrackVideoUndo, pushVideoUndoSnapshot } from "./video-sources.js";
import { syncEventPlayerLinks } from "../events/player-links.js";
import { invalidateAnalysisCaches } from "../analysis/cache-model.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderEventsLog } from "./video-events.js";
import { getSelectedRows } from "../events/selection-model.js";
import { renderAggregatedTable } from "../analysis/aggregated-table.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { renderSecondTable } from "../analysis/second-distribution.js";
import { renderPlayerAnalysis } from "../analysis/skill-tables.js";
import { renderVideoAnalysis } from "./playback.js";

import { setModalOpenState } from "../layout/modals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { publishReactEventTable } from "../events/table-commands.js";
import { closeReactBulkEditor, openReactBulkEditor } from "../events/dialog-view.js";
import { session as teamManagementState } from "../state/live-team-management.js";

export function cleanCourtLiberoReplacementsForScope(scope = "our") {
  const court = scope === "opponent" ? matchState.state.opponentCourt : matchState.state.court;
  if (!Array.isArray(court)) return;
  let changed = false;
  const nextCourt = court.map(slot => {
    const main = slot && slot.main ? slot.main : "";
    const replaced = slot && slot.replaced ? slot.replaced : "";
    if (replaced && (!main || !isLiberoForScope(main, scope))) {
      changed = true;
      return { main, replaced: "" };
    }
    return slot && typeof slot === "object" ? Object.assign({}, slot) : { main: "", replaced: "" };
  });
  if (!changed) return;
  if (scope === "opponent") {
    matchState.state.opponentCourt = nextCourt;
  } else {
    matchState.state.court = nextCourt;
  }
}

export function refreshAfterVideoEdit(shouldRecalcStats) {
  if (workspaceLayoutState.bulkEditActive) return;
  saveState({ persistLocal: shouldTrackVideoUndo() });
  if (shouldRecalcStats) {
    syncEventPlayerLinks(matchState.state.events || []);
    invalidateAnalysisCaches();
    recalcAllStatsAndUpdateUI();
    renderEventsLog();
    renderAggregatedTable();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    renderSecondTable();
    renderPlayerAnalysis();
  }
  renderVideoAnalysis();
}

export function forceSyncDataFromLog() {
  syncEventPlayerLinks(matchState.state.events || []);
  invalidateAnalysisCaches();
  recalcAllStatsAndUpdateUI();
  renderEventsLog({ suppressScroll: true });
  renderAggregatedTable();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
  renderSecondTable();
  renderPlayerAnalysis();
  renderVideoAnalysis();
  saveState();
}



export function renderEventTableRows(target, events, options = {}) {

publishReactEventTable(target,events,options);return;
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
