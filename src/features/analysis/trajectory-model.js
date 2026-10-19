import {
  buildAttackTypeLabel,
  buildUniqueOptions,
  normalizeEvalCode,
  normalizeSetNumber,
} from "./values.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import {
  getAnalysisEvents,
  matchesTeamFilter,
  matchesAdvancedFilters,
  getSetterFromEvent,
} from "./filter-model.js";
import {
  getPlayersForScope,
  getTeamScopeFromEvent,
} from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getAttackZone } from "../../domain/trajectory-geometry.js";
import {
  getActiveServerName,
  getServerPlayerForScope,
  getPredictedSkillIdForScope,
  isPostServeLockForScope,
} from "../live/flow-model.js";
import { session as matchState } from "../../../js/globals.js";
import { computeStatsByPlayerForEvents } from "./score-model.js";
import {
  normalizeCounts,
  totalFromCounts,
  formatPercent,
} from "../../domain/counts.js";
import { computeMetrics } from "./metrics.js";
export function getTrajectoryColorForCode(code, variant = "attack") {
  const normalized = normalizeEvalCode(code) || String(code || "").trim();
  const palette =
    variant === "serve"
      ? analysisFiltersState.TRAJECTORY_LINE_COLORS_SERVE
      : analysisFiltersState.TRAJECTORY_LINE_COLORS;
  return palette[normalized] || "#38bdf8";
}

export function getFilteredTrajectoryEvents() {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    const dir = ev.attackDirection || ev.attackTrajectory;
    return dir && dir.start && dir.end;
  });
  return events.filter((ev) => {
    const traj = ev.attackDirection || ev.attackTrajectory;
    const startZone =
      ev.attackStartZone ||
      (traj && traj.startZone) ||
      ev.zone ||
      ev.playerPosition ||
      null;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    if (!matchesAdvancedFilters(ev, analysisFiltersState.trajectoryFilterState))
      return false;
    if (analysisFiltersState.trajectoryFilterState.setters.size) {
      const setterIdx = getSetterFromEvent(ev);
      if (
        setterIdx === null ||
        !analysisFiltersState.trajectoryFilterState.setters.has(setterIdx)
      )
        return false;
    }
    if (
      analysisFiltersState.trajectoryFilterState.players.size &&
      !analysisFiltersState.trajectoryFilterState.players.has(ev.playerIdx)
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.sets.size &&
      !analysisFiltersState.trajectoryFilterState.sets.has(ev.set)
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.codes.size &&
      !analysisFiltersState.trajectoryFilterState.codes.has(ev.code)
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.attackTypes.size &&
      !analysisFiltersState.trajectoryFilterState.attackTypes.has(
        buildAttackTypeLabel(ev.attackType),
      )
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.zones.size &&
      !analysisFiltersState.trajectoryFilterState.zones.has(startZone)
    )
      return false;
    return true;
  });
}

export function getServeStartZone(ev) {
  if (!ev || !ev.serveStart) return null;
  return getAttackZone(ev.serveStart, true);
}

export function getServeTrajectoryEventsForServer(scope) {
  const serverName =
    getActiveServerName(scope) ||
    (getServerPlayerForScope(scope) || {}).name ||
    "";
  const players = getPlayersForScope(scope);
  const serverIdx = serverName ? players.indexOf(serverName) : -1;
  let events = (matchState.state.events || []).filter((ev) => {
    if (!ev || ev.skillId !== "serve") return false;
    if (!ev.serveStart || !ev.serveEnd) return false;
    if (getTeamScopeFromEvent(ev) !== scope) return false;
    if (serverName && ev.playerName === serverName) return true;
    if (serverIdx >= 0 && ev.playerIdx === serverIdx) return true;
    return false;
  });
  const lastEvent = events.length ? events[events.length - 1] : null;
  const eventSwap =
    lastEvent && typeof lastEvent.courtSideSwapped === "boolean"
      ? lastEvent.courtSideSwapped
      : null;
  if (lastEvent && typeof lastEvent.courtSideSwapped === "boolean") {
    events = events.filter(
      (ev) => ev && ev.courtSideSwapped === lastEvent.courtSideSwapped,
    );
  }
  return { events, serverName, eventSwap };
}

export function resolvePlayerIdxFromNameForScope(name, scope) {
  const players = getPlayersForScope(scope);
  if (!name || !players || !players.length) return -1;
  const directIdx = players.findIndex((p) => p === name);
  if (directIdx !== -1) return directIdx;
  const raw = String(name).trim().toLowerCase();
  if (!raw) return -1;
  const normalized = raw.replace(/^[0-9]+\\s*/, "");
  return players.findIndex((p) => {
    const base = String(p || "")
      .trim()
      .toLowerCase();
    if (!base) return false;
    return base === normalized || base === raw;
  });
}

export function getServeStatsForServer(scope, serverName) {
  const players = getPlayersForScope(scope);
  const idx = resolvePlayerIdxFromNameForScope(serverName, scope);
  if (idx < 0 || !players[idx]) return null;
  const events = (matchState.state.events || []).filter(
    (ev) => getTeamScopeFromEvent(ev) === scope,
  );
  const statsByPlayer = computeStatsByPlayerForEvents(events, players);
  const serveCounts = normalizeCounts(
    statsByPlayer[idx] && statsByPlayer[idx].serve,
  );
  const serveMetrics = computeMetrics(serveCounts, "serve");
  return {
    total: totalFromCounts(serveCounts),
    ace: serveCounts["#"] || 0,
    error: serveCounts["="] || 0,
    pos: serveMetrics.pos === null ? "-" : formatPercent(serveMetrics.pos),
    eff: serveMetrics.eff === null ? "-" : formatPercent(serveMetrics.eff),
  };
}

export function getServingScopeForLogTrajectory() {
  if (
    matchState.state.useOpponentTeam &&
    matchState.state.predictiveSkillFlow
  ) {
    const ourNext = getPredictedSkillIdForScope("our");
    const oppNext = getPredictedSkillIdForScope("opponent");
    if (ourNext === "serve") return "our";
    if (oppNext === "serve") return "opponent";
  }
  if (matchState.state.pendingServe && matchState.state.pendingServe.scope) {
    return matchState.state.pendingServe.scope;
  }
  if (isPostServeLockForScope("our")) return "our";
  if (isPostServeLockForScope("opponent")) return "opponent";
  if (
    scoutUiState.serveTrajectoryScope === "our" ||
    scoutUiState.serveTrajectoryScope === "opponent"
  ) {
    return scoutUiState.serveTrajectoryScope;
  }
  return null;
}

export function getActiveServeSelectionScope() {
  const keys = Object.keys(scoutUiState.selectedSkillPerPlayer || {});
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (scoutUiState.selectedSkillPerPlayer[key] !== "serve") continue;
    if (scoutUiState.serveMetaByPlayer && scoutUiState.serveMetaByPlayer[key])
      continue;
    const scope = key.split(":")[0];
    if (scope === "our" || scope === "opponent") return scope;
  }
  return null;
}

export function getFilteredServeTrajectoryEvents() {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "serve") return false;
    return ev.serveStart && ev.serveEnd;
  });
  return events.filter((ev) => {
    const startZone = getServeStartZone(ev);
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    if (
      !matchesAdvancedFilters(
        ev,
        analysisFiltersState.serveTrajectoryFilterState,
      )
    )
      return false;
    if (
      analysisFiltersState.serveTrajectoryFilterState.players.size &&
      !analysisFiltersState.serveTrajectoryFilterState.players.has(ev.playerIdx)
    )
      return false;
    if (
      analysisFiltersState.serveTrajectoryFilterState.sets.size &&
      !analysisFiltersState.serveTrajectoryFilterState.sets.has(ev.set)
    )
      return false;
    if (
      analysisFiltersState.serveTrajectoryFilterState.codes.size &&
      !analysisFiltersState.serveTrajectoryFilterState.codes.has(ev.code)
    )
      return false;
    if (
      analysisFiltersState.serveTrajectoryFilterState.zones.size &&
      !analysisFiltersState.serveTrajectoryFilterState.zones.has(startZone)
    )
      return false;
    return true;
  });
}

export function getFilteredAttackSummaryEvents() {
  const events = getAnalysisEvents().filter((ev) => {
    if (!ev || ev.skillId !== "attack") return false;
    if (
      !matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams)
    )
      return false;
    return true;
  });
  return events.filter((ev) => {
    const traj = ev.attackDirection || ev.attackTrajectory || {};
    const startZone =
      ev.attackStartZone ||
      traj.startZone ||
      ev.zone ||
      ev.playerPosition ||
      null;
    const setNum = normalizeSetNumber(ev.set);
    if (!matchesAdvancedFilters(ev, analysisFiltersState.trajectoryFilterState))
      return false;
    if (analysisFiltersState.trajectoryFilterState.setters.size) {
      const setterIdx = getSetterFromEvent(ev);
      if (
        setterIdx === null ||
        !analysisFiltersState.trajectoryFilterState.setters.has(setterIdx)
      )
        return false;
    }
    if (
      analysisFiltersState.trajectoryFilterState.players.size &&
      !analysisFiltersState.trajectoryFilterState.players.has(ev.playerIdx)
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.sets.size &&
      !analysisFiltersState.trajectoryFilterState.sets.has(setNum)
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.codes.size &&
      !analysisFiltersState.trajectoryFilterState.codes.has(ev.code)
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.attackTypes.size &&
      !analysisFiltersState.trajectoryFilterState.attackTypes.has(
        buildAttackTypeLabel(ev.attackType),
      )
    )
      return false;
    if (
      analysisFiltersState.trajectoryFilterState.zones.size &&
      !analysisFiltersState.trajectoryFilterState.zones.has(startZone)
    )
      return false;
    return true;
  });
}

export function buildAttackTypeFilterOptions(events) {
  return buildUniqueOptions(
    events.map((event) => buildAttackTypeLabel(event.attackType)),
    { labelFn: (value) => value },
  );
}
