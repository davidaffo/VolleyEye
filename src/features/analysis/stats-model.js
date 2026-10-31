import { session as matchState } from "../../../js/globals.js";
import { emptyCounts } from "../../domain/counts.js";
import { initStats } from "../teams/court-state-model.js";
import { invalidateAnalysisEventCaches } from "./cache-model.js";

export function recalculateMatchStats() {
  invalidateAnalysisEventCaches();
  initStats();
  matchState.state.opponentStats = {};
  matchState.state.events.forEach(ev => {
    if (!ev || ev.skillId === "manual" || ev.actionType === "timeout" || ev.actionType === "substitution") return;
    const opponent = ev.team === "opponent";
    const players = opponent ? matchState.state.opponentPlayers || [] : matchState.state.players;
    const idx = ev.playerIdx;
    if (idx == null || idx < 0 || !players[idx]) return;
    const stats = opponent ? matchState.state.opponentStats : matchState.state.stats;
    if (!stats[idx]) stats[idx] = {};
    if (!stats[idx][ev.skillId]) stats[idx][ev.skillId] = emptyCounts();
    stats[idx][ev.skillId][ev.code] = (stats[idx][ev.skillId][ev.code] || 0) + 1;
  });
}
