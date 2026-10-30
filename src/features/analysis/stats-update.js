


import { session as matchState } from "../../../js/globals.js";


import { invalidateAnalysisEventCaches } from "./cache-model.js";
import { initStats } from "../teams/court-state-model.js";
import { renderLiveScore } from "../live/live-score-and-set.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { renderVideoAnalysis } from "../video/playback.js";















export function recalcAllStatsAndUpdateUI() {
  invalidateAnalysisEventCaches();
  initStats();
  matchState.state.events.forEach(ev => {
    const idx = ev.playerIdx;
    if (ev && ev.team === "opponent") {
      return;
    }
    if (ev.skillId === "manual" || ev.actionType === "timeout" || ev.actionType === "substitution") {
      return;
    }
    if (idx === null || idx === undefined || idx < 0 || !matchState.state.players[idx]) {
      return;
    }
    if (!matchState.state.stats[idx]) {
      matchState.state.stats[idx] = {};
    }
    if (!matchState.state.stats[idx][ev.skillId]) {
      matchState.state.stats[idx][ev.skillId] = {
        "#": 0,
        "+": 0,
        "!": 0,
        "-": 0,
        "=": 0,
        "/": 0
      };
    }
    matchState.state.stats[idx][ev.skillId][ev.code] =
      (matchState.state.stats[idx][ev.skillId][ev.code] || 0) + 1;
  });

  renderLiveScore();
  renderAggregatedTable();
  if (rosterLineupState.activeAggTab === "player") {
    renderPlayerAnalysis();
  }
  renderVideoAnalysis();
}
