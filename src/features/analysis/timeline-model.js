import { getScoreOverrideForSet, getEventPointValue } from "./scores.js";
import { normalizeSetNumber, normalizeEvalCode } from "./values.js";
import { SKILLS, session as matchState } from "../../../js/globals.js";
import {
  getTeamScopeFromEvent,
  getTeamNameForScope,
  getOppositeScope,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";

import {
  getAnalysisTeamScope,
  getAnalysisEvents,
  matchesSummarySetFilter,
  getPointDirectionFor,
} from "./filter-model.js";
import {
  formatNameWithNumberFor,
  getShortSkill,
} from "../teams/roster-data.js";
import { getErrorTypeLabel } from "./player-model.js";
import { getEventKey } from "../../domain/event-key.js";
export function getSetTrendScopeLabels(scope) {
  const focus =
    getTeamNameForScope(scope) || (scope === "opponent" ? "Avversarie" : "Noi");
  const opponent =
    getTeamNameForScope(getOppositeScope(scope)) ||
    (scope === "opponent" ? "Noi" : "Avversarie");
  return { focus, opponent };
}

export function getEventTimelineSortValue(ev, fallbackIdx = 0) {
  const time = ev && ev.t ? new Date(ev.t).getTime() : NaN;
  if (Number.isFinite(time)) return time;
  const eventId =
    ev && typeof ev.eventId === "number" ? ev.eventId : fallbackIdx;
  return eventId;
}

export function buildSetTrendGroups(scope = getAnalysisTeamScope()) {
  const sourceEvents = getAnalysisEvents() || [];
  const groups = new Map();
  sourceEvents
    .map((ev, idx) => ({ ev, idx }))
    .filter(({ ev }) => {
      const setNum = normalizeSetNumber(ev && ev.set);
      return setNum !== null && matchesSummarySetFilter(ev);
    })
    .sort((a, b) => {
      const aMatchDate =
        a.ev && a.ev.analysisMatchDate
          ? new Date(a.ev.analysisMatchDate).getTime()
          : NaN;
      const bMatchDate =
        b.ev && b.ev.analysisMatchDate
          ? new Date(b.ev.analysisMatchDate).getTime()
          : NaN;
      if (
        Number.isFinite(aMatchDate) &&
        Number.isFinite(bMatchDate) &&
        aMatchDate !== bMatchDate
      ) {
        return aMatchDate - bMatchDate;
      }
      const aMatch =
        (a.ev && (a.ev.analysisMatchKey || a.ev.analysisMatchLabel)) || "";
      const bMatch =
        (b.ev && (b.ev.analysisMatchKey || b.ev.analysisMatchLabel)) || "";
      if (aMatch !== bMatch)
        return aMatch.localeCompare(bMatch, "it", { sensitivity: "base" });
      const aSet = normalizeSetNumber(a.ev && a.ev.set) || 1;
      const bSet = normalizeSetNumber(b.ev && b.ev.set) || 1;
      if (aSet !== bSet) return aSet - bSet;
      const timeDiff =
        getEventTimelineSortValue(a.ev, a.idx) -
        getEventTimelineSortValue(b.ev, b.idx);
      if (timeDiff !== 0) return timeDiff;
      return a.idx - b.idx;
    })
    .forEach(({ ev, idx }) => {
      const setNum = normalizeSetNumber(ev && ev.set) || 1;
      const matchKey =
        ev && ev.analysisMatchKey ? ev.analysisMatchKey : "__current__";
      const matchLabel =
        ev && ev.analysisMatchLabel ? ev.analysisMatchLabel : "";
      const key = `${matchKey}::${setNum}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          setNum,
          matchKey,
          matchLabel,
          title: matchLabel ? `${matchLabel} · Set ${setNum}` : `Set ${setNum}`,
          allEvents: [],
          points: [],
        });
      }
      groups.get(key).allEvents.push({ ev, idx });
    });
  const overrideForSingleMatch = (group) =>
    group.matchKey === "__current__"
      ? getScoreOverrideForSet(group.setNum)
      : { for: 0, against: 0 };
  return Array.from(groups.values()).map((group) => {
    const override = overrideForSingleMatch(group);
    let scoreFor = Math.max(0, override.for || 0);
    let scoreAgainst = Math.max(0, override.against || 0);
    let diff = scoreFor - scoreAgainst;
    const series = [
      {
        pointKey: `${group.key}::start`,
        x: 0,
        forScore: scoreFor,
        againstScore: scoreAgainst,
        diff,
        label: `${scoreFor}-${scoreAgainst}`,
        tone: "neutral",
        eventIndex: -1,
        allEventIndex: -1,
        ev: null,
      },
    ];
    group.allEvents.forEach(({ ev }, eventIdx) => {
      const direction = getPointDirectionFor(scope, ev);
      if (!direction) return;
      const value = getEventPointValue(ev);
      if (direction === "for") scoreFor += value;
      if (direction === "against") scoreAgainst += value;
      diff = scoreFor - scoreAgainst;
      const tone = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
      series.push({
        pointKey: `${group.key}::${eventIdx}`,
        x: series.length,
        forScore: scoreFor,
        againstScore: scoreAgainst,
        diff,
        label: `${scoreFor}-${scoreAgainst}`,
        tone,
        eventIndex: series.length - 1,
        allEventIndex: eventIdx,
        ev,
      });
    });
    group.points = series;
    group.final = series[series.length - 1] || series[0];
    group.maxAbs = series.reduce(
      (acc, point) => Math.max(acc, Math.abs(point.diff)),
      0,
    );
    return group;
  });
}

export function computeSetTrendTickIndexes(points) {
  if (!points || !points.length) return [];
  const maxIdx = points.length - 1;
  const seeds = [
    0,
    Math.round(maxIdx * 0.25),
    Math.round(maxIdx * 0.5),
    Math.round(maxIdx * 0.75),
    maxIdx,
  ];
  const unique = [];
  seeds.forEach((idx) => {
    const safe = Math.max(0, Math.min(maxIdx, idx));
    if (!unique.includes(safe)) unique.push(safe);
  });
  return unique;
}

export function getSetTrendEventSkillLabel(ev) {
  if (!ev) return "";
  if (ev.actionType === "timeout") return "Timeout";
  if (ev.actionType === "substitution") return "Cambio";
  const meta = SKILLS.find((skill) => skill.id === ev.skillId);
  return meta ? meta.label : ev.skillId || "Evento";
}

export function getSetTrendEventActorLabel(ev, scope) {
  if (!ev) return "Squadra";
  const eventScope = getTeamScopeFromEvent(ev);
  const numbers = getPlayerNumbersForScope(eventScope);
  const teamLabel = getTeamNameForScope(eventScope);
  if (
    ev.code === "team-error" ||
    ev.code === "opp-point" ||
    ev.code === "opp-error"
  ) {
    return teamLabel;
  }
  if (ev.playerName) {
    return formatNameWithNumberFor(ev.playerName, numbers);
  }
  return eventScope === scope ? "Squadra" : teamLabel;
}

export function getSetTrendEventReasonLabel(ev, scope) {
  if (!ev) return "";
  const direction = getPointDirectionFor(scope, ev);
  const code = normalizeEvalCode(ev.code || ev.evaluation || "");
  const skillLabel = getSetTrendEventSkillLabel(ev);
  if (ev.skillId === "manual") {
    if (ev.code === "opp-error") return "Errore avversario manuale";
    if (ev.code === "opp-point") return "Punto avversario manuale";
    if (ev.code === "team-error") {
      const errorLabel = ev.errorType
        ? getErrorTypeLabel(ev.errorType)
        : "errore di squadra";
      return `Errore di squadra${errorLabel ? " · " + errorLabel : ""}`;
    }
    if (ev.code === "error") {
      const errorLabel = ev.errorType
        ? getErrorTypeLabel(ev.errorType)
        : "errore";
      return `Errore manuale${errorLabel ? " · " + errorLabel : ""}`;
    }
    return "Override manuale";
  }
  if (direction === "for") {
    return `${skillLabel} ${code || ""}`.trim();
  }
  if (direction === "against") {
    return `${skillLabel} ${code || ""}`.trim();
  }
  if (ev.errorType && (ev.code === "error" || ev.code === "team-error")) {
    return `${skillLabel} · ${getErrorTypeLabel(ev.errorType)}`;
  }
  return `${skillLabel}${code ? " " + code : ""}`.trim();
}

export function buildSetTrendScoringHistory(group, selected, scope) {
  if (!group || !selected || selected.allEventIndex < 0) return [];
  const scoringEvents = group.allEvents
    .slice(0, selected.allEventIndex + 1)
    .map((entry, idx) => ({ ev: entry.ev, idx }))
    .filter(
      ({ ev }) =>
        ev &&
        getPointDirectionFor(scope, ev) &&
        !ev.pendingBlockEval &&
        !ev.derivedFromPassServe &&
        !ev.derivedFromBlock,
    );
  const visibleEvents = scoringEvents.slice(-6);
  return visibleEvents.map(({ ev, idx: eventIdx }, idx) => {
    const direction = getPointDirectionFor(scope, ev);
    const isSelectedEvent = eventIdx === selected.allEventIndex;
    return {
      key: getEventKey(ev, eventIdx),
      actor: getSetTrendEventActorLabel(ev, scope),
      skill: getSetTrendEventSkillLabel(ev),
      reason: getSetTrendEventReasonLabel(ev, scope),
      scoreLabel: (() => {
        const point = group.points.find(
          (entry) => entry.allEventIndex === eventIdx,
        );
        return point ? point.label : "";
      })(),
      pointLabel:
        direction === "for"
          ? "Punto nostro"
          : direction === "against"
            ? "Punto avversario"
            : "",
      tone:
        direction === "for" ? "pos" : direction === "against" ? "neg" : "neu",
      isScoringEvent: isSelectedEvent,
    };
  });
}

export function getPlayByPlayEventCode(ev) {
  if (!ev) return "";
  if (ev.dv && ev.dv.rawCode) return ev.dv.rawCode;
  if (ev.actionType === "timeout") return ev.team === "opponent" ? "aT" : "*T";
  if (ev.actionType === "substitution")
    return ev.team === "opponent" ? "aCH" : "*CH";
  const prefix = getTeamScopeFromEvent(ev) === "opponent" ? "a" : "*";
  const number = ev.playerNumberAtEvent || "";
  return `${prefix}${number}${getShortSkill(ev.skillId)}${ev.code || ""}`;
}

export function getPlayByPlayEventCompact(ev, scope) {
  if (!ev) return "";
  const skill = getSetTrendEventSkillLabel(ev, scope);
  const actor = getSetTrendEventActorLabel(ev, scope);
  const code = getPlayByPlayEventCode(ev);
  const extras = [];
  if (ev.skillId === "attack" && ev.attackType) extras.push(ev.attackType);
  if (ev.skillId === "serve" && ev.serveType) extras.push(ev.serveType);
  if (
    ev.skillId === "second" &&
    (ev.base || (ev.combination && ev.combination.code))
  ) {
    extras.push(ev.base || ev.combination.code);
  }
  if (ev.dv && (ev.dv.startZone || ev.dv.endZone)) {
    extras.push(`${ev.dv.startZone || "-"}>${ev.dv.endZone || "-"}`);
  }
  return {
    code,
    skill,
    actor,
    extras: extras.join(" · "),
    team: getTeamScopeFromEvent(ev) === "opponent" ? "V" : "H",
  };
}

export function getPlayByPlayPhaseLabel(rally, scope) {
  if (!rally || !rally.servingTeam) return "";
  return rally.servingTeam === getTeamNameForScope(scope) ? "BP" : "SO";
}

export function ensurePlayByPlayUiState() {
  if (
    !matchState.state.uiPlayByPlay ||
    typeof matchState.state.uiPlayByPlay !== "object"
  ) {
    matchState.state.uiPlayByPlay = { set: "" };
  }
  return matchState.state.uiPlayByPlay;
}

export function getPlayByPlayActionLabel(ev) {
  if (!ev) return "";
  if (ev.skillId === "attack") {
    return (
      (ev.dv && ev.dv.attackCode) ||
      ev.attackType ||
      (ev.combination && ev.combination.code) ||
      ev.code ||
      "A"
    );
  }
  if (ev.skillId === "serve")
    return ev.code === "#"
      ? "ACE"
      : ev.code === "="
        ? "ERR"
        : ev.serveType || ev.code || "S";
  if (ev.skillId === "pass") return ev.code || "R";
  if (ev.skillId === "second")
    return ev.base || (ev.combination && ev.combination.code) || ev.code || "E";
  if (ev.skillId === "block") return ev.code === "#" ? "Block" : ev.code || "B";
  if (ev.skillId === "defense") return ev.code || "D";
  if (ev.skillId === "freeball") return ev.code || "F";
  if (ev.actionType === "timeout") return "Timeout";
  if (ev.actionType === "substitution") return "Cambio";
  return ev.code || "";
}

export function getPlayByPlayTone(ev, rally, focusScope) {
  if (!ev) return "neutral";
  const direction = getPointDirectionFor(focusScope, ev);
  if (direction === "for") return "positive";
  if (direction === "against") return "negative";
  if (ev.skillId === "serve" && ev.code === "#") return "ace";
  if ((ev.skillId === "serve" || ev.skillId === "attack") && ev.code === "=")
    return "error";
  if (ev.code === "#") return "positive";
  if (ev.code === "=" || ev.code === "/") return "negative";
  return "neutral";
}

export function buildPlayByPlayRallies(scope = getAnalysisTeamScope()) {
  const groups = buildSetTrendGroups(scope);
  const rallies = [];
  groups.forEach((group) => {
    let previousScoringIndex = -1;
    (group.points || []).forEach((point) => {
      if (!point || !point.ev || point.allEventIndex < 0) return;
      const direction = getPointDirectionFor(scope, point.ev);
      if (!direction) return;
      const rallyEntries = group.allEvents
        .slice(previousScoringIndex + 1, point.allEventIndex + 1)
        .map((entry, localIdx) => ({
          ev: entry.ev,
          globalEventIndex: previousScoringIndex + 1 + localIdx,
        }))
        .filter((entry) => entry.ev);
      previousScoringIndex = point.allEventIndex;
      const scoringEvent = point.ev;
      const serveEntry = rallyEntries.find(
        (entry) => entry.ev && entry.ev.skillId === "serve",
      );
      const winnerScope = direction === "for" ? scope : getOppositeScope(scope);
      const winner = getTeamNameForScope(winnerScope);
      const pointValue =
        typeof scoringEvent.value === "number" && isFinite(scoringEvent.value)
          ? scoringEvent.value
          : 1;
      rallies.push({
        key: point.pointKey,
        setNum: group.setNum,
        matchLabel: group.matchLabel || "",
        rallyNumber: rallies.length + 1,
        scoreLabel: point.label,
        startScoreLabel: `${Math.max(0, point.forScore - (direction === "for" ? pointValue : 0))}-${Math.max(0, point.againstScore - (direction === "against" ? pointValue : 0))}`,
        direction,
        winner,
        servingTeam: serveEntry
          ? getTeamNameForScope(getTeamScopeFromEvent(serveEntry.ev))
          : "",
        scoringReason: getSetTrendEventReasonLabel(scoringEvent, scope),
        scoringActor: getSetTrendEventActorLabel(scoringEvent, scope),
        actions: rallyEntries,
      });
    });
  });
  return rallies;
}
