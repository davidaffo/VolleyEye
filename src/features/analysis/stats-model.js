import { session as matchState } from "../../../js/globals.js";
import { emptyCounts } from "../../domain/counts.js";
import { initStats } from "../teams/court-state-model.js";
import { invalidateAnalysisEventCaches } from "./cache-model.js";

export function recalculateMatchStats() {
  invalidateAnalysisEventCaches();
  initStats();
  matchState.state.events.forEach((ev) => {
    const idx = ev.playerIdx;
    if (ev && ev.team === "opponent") {
      return;
    }
    if (
      ev.skillId === "manual" ||
      ev.actionType === "timeout" ||
      ev.actionType === "substitution"
    ) {
      return;
    }
    if (
      idx === null ||
      idx === undefined ||
      idx < 0 ||
      !matchState.state.players[idx]
    ) {
      return;
    }
    if (!matchState.state.stats[idx]) {
      matchState.state.stats[idx] = {};
    }
    if (!matchState.state.stats[idx][ev.skillId]) {
      matchState.state.stats[idx][ev.skillId] = emptyCounts();
    }
    matchState.state.stats[idx][ev.skillId][ev.code] =
      (matchState.state.stats[idx][ev.skillId][ev.code] || 0) + 1;
  });
}
