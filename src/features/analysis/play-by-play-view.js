import { getAnalysisTeamScope } from "./filter-model.js";

import { buildPlayByPlayRallies, ensurePlayByPlayUiState, getPlayByPlayPhaseLabel, getPlayByPlayEventCompact, getPlayByPlayTone, getPlayByPlayActionLabel, getPlayByPlayEventCode, getSetTrendEventReasonLabel } from "./timeline-model.js";
import { playByPlayStore } from "../../state/roster-import-store.mjs";
import { getTeamNameForScope, getTeamScopeFromEvent } from "../teams/selectors.js";


export function publishReactPlayByPlay() {
  const scope = getAnalysisTeamScope(),
    rallies = buildPlayByPlayRallies(scope),
    ui = ensurePlayByPlayUiState(),
    sets = [
      ...new Set(rallies.map((rally) => rally.setNum).filter(Boolean)),
    ].sort((a, b) => a - b);
  if (sets.length && (!ui.set || !sets.includes(Number(ui.set))))
    ui.set = String(sets[0]);
  const selectedSet = sets.length ? String(ui.set) : "",
    won = rallies.filter((rally) => rally.direction === "for").length;
  playByPlayStore.publish({
    sets,
    selectedSet,
    count: rallies.length,
    won,
    lost: rallies.length - won,
    avgTouches: rallies.length
      ? (
          rallies.reduce((sum, rally) => sum + rally.actions.length, 0) /
          rallies.length
        ).toFixed(1)
      : "0.0",
    rows: rallies
      .filter((rally) => !selectedSet || String(rally.setNum) === selectedSet)
      .map((rally) => ({
        ...rally,
        tone: rally.direction === "for" ? "positive" : "negative",
        phase: getPlayByPlayPhaseLabel(rally, scope),
        actions: rally.actions.map((entry) => {
          const ev = entry.ev,
            item = getPlayByPlayEventCompact(ev, scope);
          return {
            tone: getPlayByPlayTone(ev, rally, scope),
            code: item.code || getPlayByPlayActionLabel(ev) || "-",
            actor: item.actor || "-",
            team: getTeamNameForScope(getTeamScopeFromEvent(ev)),
            skill: item.skill || "-",
            extras: item.extras || getPlayByPlayEventCode(ev) || "-",
            evaluation:
              getSetTrendEventReasonLabel(ev, scope) || ev.code || "-",
          };
        }),
      })),
  });
}

