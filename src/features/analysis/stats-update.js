import { recalculateMatchStats } from "./stats-model.js";
import { renderLiveScore } from "../core/runtime-view.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { renderVideoAnalysis } from "../video/playback.js";

// Le viste non visibili sono ricostruite alla prima apertura dopo una skill live.
let scoutAnalysisDirty = false;
let scoutVideoDirty = false;

export function refreshDeferredScoutViews(target) {
  if (target === "aggregated" && scoutAnalysisDirty) {
    renderAggregatedTable();
    if (rosterLineupState.activeAggTab === "player") renderPlayerAnalysis();
    scoutAnalysisDirty = false;
  }
  if (target === "video" && scoutVideoDirty) {
    renderVideoAnalysis();
    scoutVideoDirty = false;
  }
}

export function recalcAllStatsAndUpdateUI({ deferScoutViews = false } = {}) {
  recalculateMatchStats();
  renderLiveScore();
  if (deferScoutViews && rosterLineupState.activeTab === "scout") {
    scoutAnalysisDirty = true;
    scoutVideoDirty = true;
    return;
  }
  renderAggregatedTable();
  if (rosterLineupState.activeAggTab === "player") renderPlayerAnalysis();
  renderVideoAnalysis();
  scoutAnalysisDirty = false;
  scoutVideoDirty = false;
}
