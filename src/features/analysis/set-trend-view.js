

import { computeSetTrendTickIndexes, buildSetTrendGroups, getSetTrendScopeLabels, buildSetTrendScoringHistory } from "./timeline-model.js";
import { formatDelta } from "./score-model.js";
import { getAnalysisTeamScope } from "./filter-model.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { setTrendStore } from "../../state/roster-import-store.mjs";

export function buildReactSetTrendCard(group) {
  const width = 680,
    height = 280,
    pad = { top: 18, right: 14, bottom: 32, left: 42 },
    plotW = width - pad.left - pad.right,
    plotH = height - pad.top - pad.bottom,
    points = group.points || [],
    maxX = Math.max(1, points.length - 1),
    maxAbs = Math.max(1, group.maxAbs || 0),
    x = (value) => pad.left + (value / maxX) * plotW,
    y = (value) => pad.top + (1 - (value + maxAbs) / (maxAbs * 2)) * plotH,
    round = (value) => value.toFixed(1),
    ticks = [];
  for (
    let value = maxAbs;
    value >= -maxAbs;
    value -= Math.max(1, Math.ceil((maxAbs * 2) / 4))
  ) {
    if (!ticks.includes(value)) ticks.push(value);
  }
  if (!ticks.includes(0)) ticks.push(0);
  ticks.sort((a, b) => b - a);
  const segments = points.slice(1).map((next, index) => {
    const prev = points[index];
    return {
      tone: next.diff > 0 ? "positive" : next.diff < 0 ? "negative" : "neutral",
      x1: round(x(prev.x)),
      y1: round(y(prev.diff)),
      x2: round(x(next.x)),
      y2: round(y(next.diff)),
    };
  });
  return {
    title: group.title,
    score: group.final ? group.final.label : "0-0",
    width,
    height,
    pad,
    plotH,
    zero: round(y(0)),
    yTicks: ticks.map((tick) => ({
      y: round(y(tick)),
      textY: round(y(tick) + 4),
      label: formatDelta(tick),
    })),
    xTicks: computeSetTrendTickIndexes(points).map((index) => ({
      x: round(x(points[index].x)),
      label: points[index].label,
    })),
    segments,
    points: points
      .filter((point) => point.ev)
      .map((point) => {
        const index = point.x,
          prev = points[index - 1] || points[0],
          next = points[index + 1] || points[points.length - 1],
          left =
            index <= 1
              ? x(point.x) - (x(next.x) - x(point.x)) / 2
              : (x(prev.x) + x(point.x)) / 2,
          right =
            index >= points.length - 1
              ? x(point.x) + (x(point.x) - x(prev.x)) / 2
              : (x(point.x) + x(next.x)) / 2;
        return {
          key: point.pointKey,
          tone: point.tone,
          label: point.label,
          delta: formatDelta(point.diff),
          x: round(x(point.x)),
          y: round(y(point.diff)),
          tooltipX: x(point.x) / width,
          tooltipY: y(point.diff) / height,
          hitX: round(Math.max(pad.left, left)),
          hitWidth: round(
            Math.max(
              8,
              Math.min(width - pad.right, right) - Math.max(pad.left, left),
            ),
          ),
        };
      }),
  };
}

export function publishReactSetTrend() {
  const scope = getAnalysisTeamScope(),
    groups = buildSetTrendGroups(scope),
    valid = new Set(
      groups.flatMap((group) => group.points.map((point) => point.pointKey)),
    );
  if (!groups.length) scoutUiState.setTrendSelectionKey = "";
  else if (!scoutUiState.setTrendSelectionKey || !valid.has(scoutUiState.setTrendSelectionKey)) {
    const fallback =
        groups.find((group) => group.points.length > 1) || groups[0],
      point = fallback.points[fallback.points.length - 1];
    scoutUiState.setTrendSelectionKey = point ? point.pointKey : "";
  }
  const group = groups.find((group) =>
      group.points.some((point) => point.pointKey === scoutUiState.setTrendSelectionKey),
    ),
    selected = group?.points.find(
      (point) => point.pointKey === scoutUiState.setTrendSelectionKey,
    );
  let detail = null;
  if (group && selected && selected.allEventIndex >= 0) {
    const labels = getSetTrendScopeLabels(scope),
      events = buildSetTrendScoringHistory(group, selected, scope),
      decisive = events[events.length - 1] || null;
    detail = {
      title: group.title,
      score: `${labels.focus} ${selected.forScore} - ${selected.againstScore} ${labels.opponent}`,
      cards: [
        {
          label: "Punteggio",
          value: `${selected.forScore} - ${selected.againstScore}`,
        },
        { label: "Delta", value: formatDelta(selected.diff) },
        {
          label: "Esito punto",
          value: decisive ? decisive.pointLabel || "-" : "-",
        },
        { label: "Perché", value: decisive ? decisive.reason : "-" },
      ],
      events,
    };
  }
  setTrendStore.publish({
    cards: groups.map(buildReactSetTrendCard),
    selection: scoutUiState.setTrendSelectionKey,
    detail,
  });
}


