import {
  getEventTeamLabel,
  getEventSkillLabel,
} from "../events/display-model.js";
import { session as matchState } from "../../../js/globals.js";
import {
  getTeamScopeFromEvent,
  getPlayersForScope,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";
import { resolvePlayerIdx } from "../events/player-links.js";
import { formatNameWithNumberFor } from "../teams/roster-data.js";
import { normalizePhaseValue } from "../analysis/values.js";
import { valueToString } from "../../domain/value-string.js";
import { computeEventVideoTime } from "./timing.js";
import { getVideoSkillEvents, getVideoBaseTimeMs } from "./event-model.js";

export function ensureVideoAnalysisSortState() {
  const current =
    matchState.state.uiVideoAnalysisSort &&
    typeof matchState.state.uiVideoAnalysisSort === "object"
      ? matchState.state.uiVideoAnalysisSort
      : {};
  matchState.state.uiVideoAnalysisSort = {
    key: typeof current.key === "string" ? current.key : "",
    dir: current.dir === "asc" || current.dir === "desc" ? current.dir : "",
  };
  return matchState.state.uiVideoAnalysisSort;
}

export function getVideoSortDisplayValue(ev, key, baseMs = null) {
  if (!ev || !key) return "";
  const scope = getTeamScopeFromEvent(ev);
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  switch (key) {
    case "eventId":
      return Number.isFinite(ev.eventId) ? ev.eventId : -1;
    case "videoTime": {
      const videoTime =
        typeof ev.videoTime === "number"
          ? ev.videoTime
          : computeEventVideoTime(
              ev,
              baseMs || getVideoBaseTimeMs(getVideoSkillEvents()),
            );
      return Number.isFinite(videoTime) ? videoTime : -1;
    }
    case "set":
      return parseInt(ev.set, 10) || 0;
    case "homeScore":
      return parseInt(ev.homeScore, 10) || 0;
    case "visitorScore":
      return parseInt(ev.visitorScore, 10) || 0;
    case "team":
      return getEventTeamLabel(ev);
    case "player": {
      const name = ev.playerName || players[resolvePlayerIdx(ev)] || "";
      return name ? formatNameWithNumberFor(name, numbers) || name : "";
    }
    case "setter": {
      const setterName =
        ev.setterName ||
        (typeof ev.setterIdx === "number" ? players[ev.setterIdx] : "");
      return setterName
        ? formatNameWithNumberFor(setterName, numbers) || setterName
        : "";
    }
    case "skill":
      return getEventSkillLabel(ev);
    case "code":
      return ev.code || "";
    case "zone":
      return parseInt(ev.zone || ev.playerPosition, 10) || 0;
    case "setterPosition":
      return parseInt(ev.setterPosition || ev.rotation, 10) || 0;
    case "opponentSetterPosition":
      return parseInt(ev.opponentSetterPosition, 10) || 0;
    case "receivePosition":
      return parseInt(ev.receivePosition, 10) || 0;
    case "base":
      return valueToString(ev.base);
    case "setType":
      return valueToString(ev.setType);
    case "combination":
      return valueToString(ev.combination);
    case "serveType":
      return valueToString(ev.serveType);
    case "receiveEvaluation":
      return valueToString(ev.receiveEvaluation);
    case "attackEvaluation":
      return valueToString(ev.attackEvaluation);
    case "attackBp":
      return normalizePhaseValue(ev.attackBp) || "";
    case "attackType":
      return valueToString(ev.attackType);
    case "blockNumber":
      return parseInt(ev.blockNumber, 10) || 0;
    case "durationMs":
      return parseInt(ev.durationMs, 10) || 0;
    default:
      return valueToString(ev[key]);
  }
}

export function sortVideoEvents(events, baseMs = null) {
  const sortState = ensureVideoAnalysisSortState();
  if (!sortState.key || !sortState.dir) return events;
  const dirFactor = sortState.dir === "desc" ? -1 : 1;
  return [...events].sort((a, b) => {
    const av = getVideoSortDisplayValue(a, sortState.key, baseMs);
    const bv = getVideoSortDisplayValue(b, sortState.key, baseMs);
    if (typeof av === "number" && typeof bv === "number") {
      if (av !== bv) return (av - bv) * dirFactor;
    } else {
      const cmp = String(av || "").localeCompare(String(bv || ""), "it", {
        sensitivity: "base",
        numeric: true,
      });
      if (cmp !== 0) return cmp * dirFactor;
    }
    const aId = Number.isFinite(a.eventId) ? a.eventId : 0;
    const bId = Number.isFinite(b.eventId) ? b.eventId : 0;
    return aId - bId;
  });
}
