import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import {
  getPointDirection,
  getPointDirectionForScope,
  getEventPointValue,
} from "./scores.js";
import {
  getPointDirectionFor,
  getAnalysisTeamScope,
  filterEventsByAnalysisTeam,
} from "./filter-model.js";
import { getPlayersForScope } from "../teams/selectors.js";
export function computePlayerPointsMap(
  events = matchState.state.events || [],
  scope = "our",
) {
  const map = {};
  (events || []).forEach((ev) => {
    if (typeof ev.playerIdx !== "number") return;
    const dir = matchState.state.useOpponentTeam
      ? getPointDirectionForScope(ev, scope)
      : getPointDirection(ev);
    if (!dir) return;
    const val = getEventPointValue(ev);
    if (!map[ev.playerIdx]) {
      map[ev.playerIdx] = { for: 0, against: 0 };
    }
    if (dir === "for") {
      map[ev.playerIdx].for += val;
    } else if (dir === "against") {
      map[ev.playerIdx].against += val;
    }
  });
  return map;
}

export function computePlayerErrorsMap(events = matchState.state.events || []) {
  const map = {};
  (events || []).forEach((ev) => {
    const rawIdx = ev && ev.playerIdx;
    const idx =
      typeof rawIdx === "number"
        ? rawIdx
        : typeof rawIdx === "string" && rawIdx.trim() !== ""
          ? parseInt(rawIdx, 10)
          : null;
    if (idx === null || isNaN(idx)) return;
    const val = getEventPointValue(ev);
    const code = ev && ev.code;
    const isErrorButton = code === "error" || code === "team-error";
    const isBlockError = ev.skillId === "block" && code === "/";
    if (!isErrorButton && !isBlockError) return;
    map[idx] = (map[idx] || 0) + Math.max(0, val);
  });
  return map;
}

export function computeOpponentErrorsMap(
  events = matchState.state.events || [],
) {
  const map = {};
  (events || []).forEach((ev) => {
    if (!ev || ev.code !== "opp-error") return;
    const rawIdx = ev.playerIdx;
    const idx =
      typeof rawIdx === "number"
        ? rawIdx
        : typeof rawIdx === "string" && rawIdx.trim() !== ""
          ? parseInt(rawIdx, 10)
          : null;
    if (idx === null || isNaN(idx)) return;
    const val = getEventPointValue(ev);
    map[idx] = (map[idx] || 0) + Math.max(0, val);
  });
  return map;
}

export function computeOpponentErrorsTotal(
  events = matchState.state.events || [],
) {
  let total = 0;
  (events || []).forEach((ev) => {
    if (!ev || ev.code !== "opp-error") return;
    const val = getEventPointValue(ev);
    total += Math.max(0, val);
  });
  return total;
}

export function computePlayerPassAceMap(
  events = matchState.state.events || [],
  scope = "our",
) {
  const map = {};
  (events || []).forEach((ev) => {
    if (!ev || ev.skillId !== "pass") return;
    const rawIdx = ev.playerIdx;
    const idx =
      typeof rawIdx === "number"
        ? rawIdx
        : typeof rawIdx === "string" && rawIdx.trim() !== ""
          ? parseInt(rawIdx, 10)
          : null;
    if (idx === null || isNaN(idx)) return;
    const direction = getPointDirectionFor(scope, ev);
    if (direction !== "against") return;
    map[idx] = (map[idx] || 0) + getEventPointValue(ev);
  });
  return map;
}

export function computeStatsByPlayerForEvents(events, players) {
  const stats = {};
  (events || []).forEach((ev) => {
    if (
      !ev ||
      ev.skillId === "manual" ||
      ev.actionType === "timeout" ||
      ev.actionType === "substitution"
    ) {
      return;
    }
    if (typeof ev.playerIdx !== "number" || !players[ev.playerIdx]) return;
    if (!stats[ev.playerIdx]) {
      stats[ev.playerIdx] = {};
    }
    if (!stats[ev.playerIdx][ev.skillId]) {
      stats[ev.playerIdx][ev.skillId] = {
        "#": 0,
        "+": 0,
        "!": 0,
        "-": 0,
        "=": 0,
        "/": 0,
      };
    }
    stats[ev.playerIdx][ev.skillId][ev.code] =
      (stats[ev.playerIdx][ev.skillId][ev.code] || 0) + 1;
  });
  return stats;
}

export function ensureAnalysisStatsCache() {
  const scope = getAnalysisTeamScope();
  if (
    scoutUiState.analysisStatsCache &&
    scoutUiState.analysisStatsScope === scope
  )
    return scoutUiState.analysisStatsCache;
  const players = getPlayersForScope(scope);
  const events = filterEventsByAnalysisTeam();
  scoutUiState.analysisStatsCache = computeStatsByPlayerForEvents(
    events,
    players,
  );
  scoutUiState.analysisStatsScope = scope;
  return scoutUiState.analysisStatsCache;
}

export function formatDelta(value) {
  if (value === null || value === undefined || isNaN(value)) return "0";
  if (value > 0) return "+" + value;
  return String(value);
}
