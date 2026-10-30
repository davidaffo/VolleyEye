

import { recalculateMatchStats } from "./stats-model.js";

import { renderLiveScore } from "../live/live-score-and-set.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { renderVideoAnalysis } from "../video/playback.js";

export function recalcAllStatsAndUpdateUI() {
  recalculateMatchStats();

  renderLiveScore();
  renderAggregatedTable();
  if (rosterLineupState.activeAggTab === "player") {
    renderPlayerAnalysis();
  }
  renderVideoAnalysis();
}
