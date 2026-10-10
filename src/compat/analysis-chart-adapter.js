function buildReactSkillChartModel(options) {
  const {
    title = "",
    subtitle = "",
    events = [],
    skillId = "",
    metricId = "eff",
    seriesCacheKey = "",
  } = options;
  const metric = getSkillChartMetricMeta(metricId),
    series = getSkillMetricSeriesCached(
      events,
      skillId,
      metricId,
      seriesCacheKey,
    ),
    tones = getSkillChartToneColors();
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
function publishReactGlobalSkillCharts() {
  skillChartToneColorCache = null;
  const ui = ensureSkillChartsUiState(),
    metricId = ui.globalMetric || "eff",
    scope = getAnalysisTeamScope(),
    eventsBySkill = collectSkillChartEventsBySkill(
      getSkillChartBaseEvents(scope),
    ),
    baseCacheKey = `analysis-global|${getSkillChartFiltersCacheToken(scope)}|metric:${metricId}`;
  analysisChartStore.publish("global", {
    metric: metricId,
    empty: "",
    charts: Object.freeze(
      SKILLS.map((skill) => {
        const events = eventsBySkill[skill.id] || [];
        return buildReactSkillChartModel({
          title: getSkillLabel(skill.id),
          subtitle: `${events.length} eventi`,
          events,
          skillId: skill.id,
          metricId,
          seriesCacheKey: `${baseCacheKey}|${skill.id}`,
        });
      }),
    ),
  });
}
function publishReactPlayerSkillCharts(playerIdx) {
  skillChartToneColorCache = null;
  const scope = getAnalysisTeamScope(),
    players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    playerName = players?.[playerIdx] || "",
    metricId = ensureSkillChartsUiState().playerMetric || "eff";
  if (playerIdx === null || !playerName) {
    analysisChartStore.publish("player", {
      metric: metricId,
      charts: [],
      empty:
        playerIdx === null
          ? "Seleziona una giocatrice per vedere i grafici skill."
          : "Giocatrice non disponibile.",
    });
    return;
  }
  const baseCacheKey = `analysis-player|${getSkillChartFiltersCacheToken(scope)}|player:${playerIdx}|metric:${metricId}`,
    label =
      scope === "opponent"
        ? formatNameWithNumberFor(playerName, numbers)
        : formatNameWithNumber(playerName);
  analysisChartStore.publish("player", {
    metric: metricId,
    empty: "",
    charts: Object.freeze(
      SKILLS.map((skill) => {
        const events = buildAnalysisSkillChartEvents({
          scope,
          skillId: skill.id,
          playerIdx,
        });
        return buildReactSkillChartModel({
          title: getSkillLabel(skill.id),
          subtitle: `${label} · ${events.length} eventi`,
          events,
          skillId: skill.id,
          metricId,
          seriesCacheKey: `${baseCacheKey}|${skill.id}`,
        });
      }),
    ),
  });
}
let reactAggSkillContext = null;
function publishReactAggSkillModal(skillId, playerIdx) {
  ensureAnalysisStatsCache();
  reactAggSkillContext = { skillId, playerIdx };
  const counts = getAggSkillCounts(skillId, playerIdx),
    metrics = computeMetrics(counts, skillId),
    items = [
      { label: "Totale", value: metrics.total },
      { label: "Positivi", value: metrics.positiveCount },
      { label: "Negativi", value: metrics.negativeCount },
    ];
  for (const [label, field] of [
    ["Prf", "prf"],
    ["Pos", "pos"],
    ["Eff", "eff"],
  ])
    if (metrics[field] !== null)
      items.push({ label, value: formatPercent(metrics[field]) });
  const codes = (
    state.metricsConfig[skillId]?.activeCodes || RESULT_CODES
  ).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  const ordered = codes
    .filter((code) => code !== "/" && code !== "=")
    .concat("/", "=");
  const metricId = ensureSkillChartsUiState().modalMetric || "eff",
    scope = getAnalysisTeamScope(),
    events = buildAnalysisSkillChartEvents({
      scope,
      skillId,
      playerIdx: playerIdx === "team" ? null : playerIdx,
    });
  skillChartToneColorCache = null;
  analysisChartStore.publish("modal", {
    title: getSkillLabel(skillId) + " · " + getAggSkillPlayerLabel(playerIdx),
    items: Object.freeze(items.map(Object.freeze)),
    codes: Object.freeze(
      ordered.map((code) =>
        Object.freeze({
          code,
          count: counts[code] || 0,
          percent: formatPercentValue(counts[code] || 0, metrics.total),
        }),
      ),
    ),
    metric: metricId,
    chart: deferSkillChartRenderWhilePaused()
      ? null
      : buildReactSkillChartModel({
          title: getSkillLabel(skillId),
          subtitle: `${events.length} eventi`,
          events,
          skillId,
          metricId,
          seriesCacheKey: `analysis-modal|${getSkillChartFiltersCacheToken(scope)}|skill:${skillId}|player:${playerIdx}|metric:${metricId}`,
        }),
  });
}
function setReactAggSkillOpen(open) {
  analysisChartStore.publish("modal", { open });
}
function changeReactChartMetric(kind, value) {
  if (!SKILL_CHART_METRICS.some((metric) => metric.id === value)) return;
  const ui = ensureSkillChartsUiState();
  if (kind === "global") {
    ui.globalMetric = value;
    renderAnalysisSkillChartsPanel();
  } else if (kind === "player") {
    ui.playerMetric = value;
    renderPlayerAnalysisSkillCharts();
  } else if (kind === "modal" && reactAggSkillContext) {
    ui.modalMetric = value;
    renderAggSkillModal(
      reactAggSkillContext.skillId,
      reactAggSkillContext.playerIdx,
    );
  }
}
