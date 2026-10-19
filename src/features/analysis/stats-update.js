import { getBaseZoneForPlayer } from '../teams/court-model.js';


import { session as matchState } from "../../../js/globals.js";
import { getPlayersForScope } from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getAutoRoleDisplayCourt } from "../live/team-management.js";
import { invalidateSkillChartCaches } from "./skill-chart-model.js";
import { initStats } from "../teams/court/court-engine.js";
import { renderLiveScore } from "../live/live-score-and-set.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { renderVideoAnalysis } from "../video/playback.js";







export function getCurrentZoneForPlayer(playerIdx, forSkillId = null, scope = "our") {
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players || !players[playerIdx]) return null;
  const name = players[playerIdx];
  if (matchState.state.autoRolePositioning && forSkillId) {
    const displayCourt = getAutoRoleDisplayCourt(forSkillId, scope);
    const displayIdx = displayCourt.findIndex(
      item => item && item.slot && (item.slot.main === name || item.slot.replaced === name)
    );
    if (displayIdx !== -1) return displayIdx + 1;
  }
  return getBaseZoneForPlayer(playerIdx, scope);
}







export function recalcAllStatsAndUpdateUI() {
  scoutUiState.analysisEventsCache = null;
  scoutUiState.analysisEventsCacheKey = "";
  scoutUiState.analysisEventsCacheRevision += 1;
  invalidateSkillChartCaches();
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
