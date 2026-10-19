import { SKILLS } from "../../../js/globals.js";
import { getSkillLabel } from "./player-model.js";
import {
  buildAnalysisSkillChartEvents,
  getSkillChartFiltersCacheToken,
} from "./skill-chart-model.js";
import { getSkillChartCodeTone } from "./metrics.js";

import {
  getSkillChartMetricMeta,
  getSkillMetricSeriesCached,
  withAlpha,
  getSkillChartLayout,
} from "./skill-chart-model.js";
export const DEFAULT_CHART_TONES = Object.freeze({
  positive: "#22c55e",
  neutral: "#eab308",
  negative: "#ef4444",
});
export function buildReactSkillChartModel(options) {
  const {
    title = "",
    subtitle = "",
    events = [],
    skillId = "",
    metricId = "eff",
    seriesCacheKey = "",
    tones = DEFAULT_CHART_TONES,
  } = options;
  const metric = getSkillChartMetricMeta(metricId),
    series = getSkillMetricSeriesCached(
      events,
      skillId,
      metricId,
      seriesCacheKey,
    );
  const colors = {
    "--chart-tone-positive": tones.positive,
    "--chart-tone-neutral": tones.neutral,
    "--chart-tone-negative": tones.negative,
    "--chart-tone-positive-soft": withAlpha(tones.positive, 0.2),
    "--chart-tone-neutral-soft": withAlpha(tones.neutral, 0.2),
    "--chart-tone-negative-soft": withAlpha(tones.negative, 0.2),
  };
  if (!series.length)
    return Object.freeze({
      title,
      subtitle,
      colors,
      points: Object.freeze([]),
    });
  const layout = getSkillChartLayout(series, metric),
    { width, height, pad, plotH, minY, maxY, xToPx, yToPx } = layout,
    round = (value) => Number(value.toFixed(1));
  const matchGroups = series.some((point) => point?.groupType === "match"),
    segments = [];
  if (!matchGroups) {
    let start = 0;
    for (let i = 1; i <= series.length; i++) {
      const prev = series[i - 1],
        curr = series[i];
      if (!prev) continue;
      if (!curr || curr.set !== prev.set) {
        segments.push({ set: prev.set || "-", startIdx: start, endIdx: i - 1 });
        start = i;
      }
    }
  }
  const bands = segments.map((segment, index) => {
    const start = xToPx(segment.startIdx + 1),
      end = xToPx(segment.endIdx + 1),
      left = index === 0 ? pad.left : start,
      bandWidth = Math.max(
        2,
        end - left + (segment.endIdx === segment.startIdx ? 2 : 0),
      );
    return Object.freeze({
      set: segment.set,
      left: round(left),
      width: round(bandWidth),
      labelX: round(left + bandWidth / 2),
    });
  });
  const ticks = (
    metric.kind === "percent"
      ? metric.id === "eff"
        ? [minY, minY / 2, 0, maxY / 2, maxY]
        : [0, 25, 50, 75, 100]
      : metric.kind === "code"
        ? [-2, -1, 0, 1, 2]
        : [minY, (minY + maxY) / 2, maxY]
  )
    .filter(Number.isFinite)
    .map((value) =>
      Object.freeze({
        y: round(yToPx(value)),
        textY: round(yToPx(value) + 4),
        label:
          metric.kind === "percent"
            ? Math.round(value) + "%"
            : String(Math.round(value * 10) / 10),
      }),
    );
  const points = series.map((point) =>
    Object.freeze({
      ...point,
      cx: round(xToPx(point.x)),
      cy: round(yToPx(point.y)),
      tone:
        point.tone || getSkillChartCodeTone(point.code, point.skillId || null),
      tip:
        point.groupType === "match"
          ? `Partita ${point.x} · ${point.matchLabel || "-"} · ${point.labelValue}${point.matchEventsCount ? ` · ${point.matchEventsCount} eventi` : ""}`
          : `#${point.x} · ${point.labelValue} · cod ${point.code} · set ${point.set || "-"}${point.rotation ? ` · P${point.rotation}` : ""}`,
    }),
  );
  return Object.freeze({
    title,
    subtitle,
    colors,
    width,
    height,
    pad,
    plotH,
    bands: Object.freeze(bands),
    ticks: Object.freeze(ticks),
    points: Object.freeze(points),
    matchGroups,
    zeroY: minY <= 0 && maxY >= 0 ? round(yToPx(0)) : null,
    linePoints: points
      .map((point) => point.cx.toFixed(1) + "," + point.cy.toFixed(1))
      .join(" "),
  });
}

export function buildPlayerSkillChartModels({
  scope,
  playerIdx,
  label,
  metricId,
  tones,
}) {
  const baseCacheKey = `analysis-player|${getSkillChartFiltersCacheToken(scope)}|player:${playerIdx}|metric:${metricId}`;
  return SKILLS.map((skill) => {
    const events = buildAnalysisSkillChartEvents({
      scope,
      skillId: skill.id,
      playerIdx,
    });
    return buildReactSkillChartModel({
      tones,
      title: getSkillLabel(skill.id),
      subtitle: `${label} · ${events.length} eventi`,
      events,
      skillId: skill.id,
      metricId,
      seriesCacheKey: `${baseCacheKey}|${skill.id}`,
    });
  });
}
