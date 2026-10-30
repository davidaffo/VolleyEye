import { comparisonCell } from "./table-cells.js";
import { normalizeEvalCode, clamp01Val } from "./values.js";
import { analysisTableStore } from "../../state/analysis-table-store.mjs";
import {
  emptyCounts,
  totalFromCounts,
  normalizeCounts,
  formatPercentValue,
  formatPercent,
} from "../../domain/counts.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import {
  getAnalysisTeamScope,
  getAnalysisCourtSide,
  ensureCourtSideState,
} from "./filter-model.js";
import { buildAttackTypeLabel } from "./values.js";

import {
  getTrajectoryBg,
  drawServeTrajectoryCanvas,
} from "./trajectory-canvas.js";
import {
  getTrajectoryColorForCode,
  getFilteredAttackSummaryEvents,
  getFilteredTrajectoryEvents,
  getFilteredServeTrajectoryEvents,
  getServingScopeForLogTrajectory,
  getActiveServeSelectionScope,
  getServeTrajectoryEventsForServer,
  getServeStatsForServer,
} from "./trajectory-model.js";
import { countPointsForSkill } from "./points.js";
import { ensurePlayerAnalysisState } from "./player-model.js";
import { computeMetrics } from "./metrics.js";
import { mirrorTrajectoryPoint } from "../../domain/trajectory-geometry.js";

import { session as matchState } from "../../../js/globals.js";

import {
  getFilteredPlayerTrajectoryEventsForPlayer,
  getFilteredPlayerServeTrajectoryEventsForPlayer,
} from "./player-trajectory-model.js";
import {
  getPlayersForScope,
  getPlayerNumbersForScope,
  isFarSideForScope,
} from "../teams/selectors.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import { sortPlayerIndexesByNumberForScope } from "../teams/lineup-selectors.js";

export function publishReactAttackSummary(target, events, compareEvents = null) {
  if (!target) return;

  const list = Array.isArray(events) ? events.filter((ev) => ev && ev.skillId === "attack") : [];
  const compareList = Array.isArray(compareEvents)
    ? compareEvents.filter((ev) => ev && ev.skillId === "attack")
    : null;
  const rows = [];
  let footerRows = [];
  const publish = () =>
    analysisTableStore.publish(target, {
      rows,
      footerRows,
      emptyText: rows.length ? "" : "Nessun attacco per i filtri selezionati.",
    });
  if (!list.length) {
    publish();
    return;
  }
  const count = (events) => {
    const counts = emptyCounts(),
      byType = {};
    for (const event of events) {
      const code = normalizeEvalCode(event.code || event.evaluation);
      if (code) counts[code] = (counts[code] || 0) + 1;
      const type = buildAttackTypeLabel(event.attackType);
      const bucket = (byType[type] ||= emptyCounts());
      if (code) bucket[code] = (bucket[code] || 0) + 1;
    }
    return { counts, byType };
  };
  const main = count(list),
    other = count(compareList || []);
  const buildCells = (label, counts, comparison) => {
    const total = totalFromCounts(counts),
      otherTotal = totalFromCounts(comparison);
    const points = countPointsForSkill(counts, "attack"),
      otherPoints = countPointsForSkill(comparison, "attack");
    const metrics = computeMetrics(counts, "attack"),
      otherMetrics = computeMetrics(comparison, "attack");
    return [
      comparisonCell(label, null, "neutral"),
      comparisonCell(total, otherTotal, "neutral"),
      comparisonCell(counts["="] || 0, comparison["="] || 0, "lower"),
      comparisonCell(counts["/"] || 0, comparison["/"] || 0, "lower"),
      comparisonCell(points || 0, otherPoints || 0),
      comparisonCell(
        formatPercentValue(points || 0, total),
        otherTotal ? (otherPoints || 0) / otherTotal : null,
        "higher",
        total ? (points || 0) / total : null,
      ),
      comparisonCell(
        metrics.eff === null ? "-" : formatPercent(metrics.eff),
        otherMetrics.eff,
        "higher",
        metrics.eff,
      ),
    ].map((cell) => {
      const value = Object.hasOwn(cell, "raw") ? cell.raw : cell.text;
      const comparable =
        compareList && value !== null && cell.compare !== null && value !== cell.compare;
      return {
        ...cell,
        className: comparable
          ? (cell.better === "lower" ? value < cell.compare : value > cell.compare)
            ? "is-better"
            : "is-worse"
          : "",
      };
    });
  };
  Object.keys(main.byType)
    .sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }))
    .forEach((type) =>
      rows.push({
        cells: buildCells(
          type,
          normalizeCounts(main.byType[type]),
          normalizeCounts(other.byType[type]),
        ),
      }),
    );
  footerRows = [
    {
      className: "attack-analysis-total-row",
      cells: buildCells("Totale", main.counts, other.counts),
    },
  ];
  publish();
}

export function buildReactTrajectoryLegend(variant) {
  return (
    variant === "serve"
      ? [
          ["#", "# · Ace"],
          ["+", "+, !, / · Positivo"],
          ["-", "− · Negativo"],
          ["=", "= · Errore"],
        ]
      : [
          ["#", "# · Punto"],
          ["+", "+, ! · Positivo"],
          ["-", "− · Negativo"],
          ["=", "=, / · Errore o muro subito"],
        ]
  ).map(([code, label]) => ({
    label,
    color: getTrajectoryColorForCode(code, variant),
  }));
}

export function paintReactAttackTrajectory(
  canvas,
  zone,
  events,
  far,
  onImagesLoad,
) {
  const img = getTrajectoryBg(zone, far, onImagesLoad),
    ratio =
      img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.65,
    width = canvas.parentElement?.clientWidth || img?.naturalWidth || 320,
    height = Math.max(120, Math.round(width * ratio || width * 0.65));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  if (img?.complete && img.naturalWidth)
    ctx.drawImage(img, 0, 0, width, height);
  events.forEach((ev) => {
    const traj = ev.attackDirection || ev.attackTrajectory || {},
      startRaw = traj.start || ev.attackStart,
      endRaw = traj.end || ev.attackEnd,
      start = far && startRaw ? mirrorTrajectoryPoint(startRaw) : startRaw,
      end = far && endRaw ? mirrorTrajectoryPoint(endRaw) : endRaw;
    if (!start || !end) return;
    ctx.strokeStyle = getTrajectoryColorForCode(ev.code, "attack");
    ctx.lineWidth = analysisFiltersState.TRAJECTORY_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(clamp01Val(start.x) * width, clamp01Val(start.y) * height);
    ctx.lineTo(clamp01Val(end.x) * width, clamp01Val(end.y) * height);
    ctx.stroke();
  });
}

export function publishReactAttackGrid(target, events, far) {
  const grouped = {};
  events.forEach((ev) => {
    const trajectory = ev.attackDirection || ev.attackTrajectory || {},
      zone =
        ev.attackStartZone ||
        trajectory.startZone ||
        ev.zone ||
        ev.playerPosition ||
        null;
    if (zone) (grouped[zone] ??= []).push(ev);
  });
  analysisTableStore.publish(target, {
    far,
    legend: buildReactTrajectoryLegend("attack"),
    cards: [4, 3, 2, 5, 6, 1].map((zone) => {
      const list = grouped[zone] || [];
      return {
        key: zone,
        zone,
        title: "Zona " + zone,
        empty: !list.length,
        paint: (canvas, visual, redraw) =>
          paintReactAttackTrajectory(canvas, zone, list, far, redraw),
      };
    }),
  });
}

export function publishReactGlobalAttackGrid() {
  publishReactAttackSummary(
    "trajectory-attack-summary",
    getFilteredAttackSummaryEvents(),
  );
  const scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensureCourtSideState("uiTrajectoryCourtSideByScope")[scope],
      ) === "far";
  publishReactAttackGrid(
    "trajectory-grid",
    getFilteredTrajectoryEvents(),
    far,
  );
}

export function publishReactPlayerAttackGrid(target, index) {
  const scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensurePlayerAnalysisState().courtSideByScope[scope],
      ) === "far";
  publishReactAttackGrid(
    target,
    getFilteredPlayerTrajectoryEventsForPlayer(index),
    far,
  );
}

export function buildReactServeTrajectoryCard(index, events, scope, far) {
  const players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    title =
      (scope === "opponent"
        ? formatNameWithNumberFor(players[index], numbers)
        : formatNameWithNumber(players[index])) ||
      players[index] ||
      "—";
  return {
    key: index,
    playerIdx: index,
    title,
    empty: !events.length,
    paint: (canvas, visual, redraw) =>
      drawServeTrajectoryCanvas(canvas, visual, events, {
        scope,
        isFarServe: far,
        onImagesLoad: redraw,
      }),
  };
}

export function publishReactGlobalServeGrid() {
  const events = getFilteredServeTrajectoryEvents(),
    scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensureCourtSideState("uiServeTrajectoryCourtSideByScope")[scope],
      ) === "far",
    selected = analysisFiltersState.serveTrajectoryFilterState.players.size
      ? [...analysisFiltersState.serveTrajectoryFilterState.players]
      : [...new Set(events.map((ev) => ev.playerIdx))].filter(
          (index) => typeof index === "number",
        ),
    indices = selected.length
      ? sortPlayerIndexesByNumberForScope(selected, scope)
      : [],
    grouped = {};
  events.forEach((ev) => {
    if (typeof ev.playerIdx === "number")
      (grouped[ev.playerIdx] ??= []).push(ev);
  });
  analysisTableStore.publish("serve-trajectory-grid", {
    legend: buildReactTrajectoryLegend("serve"),
    cards: indices.map((index) => {
      let list = grouped[index] || [];
      const last = list.length ? list[list.length - 1] : null,
        swap =
          last && typeof last.courtSideSwapped === "boolean"
            ? last.courtSideSwapped
            : null;
      if (swap !== null)
        list = list.filter((ev) => ev && ev.courtSideSwapped === swap);
      return buildReactServeTrajectoryCard(index, list, scope, far);
    }),
  });
}

export function publishReactPlayerServeGrid(target, index) {
  const scope = getAnalysisTeamScope(),
    far =
      getAnalysisCourtSide(
        ensurePlayerAnalysisState().courtSideByScope[scope],
      ) === "far";
  analysisTableStore.publish(target, {
    legend: index === null ? [] : buildReactTrajectoryLegend("serve"),
    cards:
      index === null
        ? []
        : [
            buildReactServeTrajectoryCard(
              index,
              getFilteredPlayerServeTrajectoryEventsForPlayer(index),
              scope,
              far,
            ),
          ],
  });
}

export function publishReactLogServeTrajectories() {
  const serving =
      getServingScopeForLogTrajectory() || getActiveServeSelectionScope(),
    allowOur = !!matchState.state.showServeTrajectoryLogOur,
    allowOpp = !!matchState.state.showServeTrajectoryLogOpp;
  if (scoutUiState.elServeTrajectoryLogToggleInline)
    scoutUiState.elServeTrajectoryLogToggleInline.checked = allowOur;
  if (scoutUiState.elServeTrajectoryLogToggleInlineOpp)
    scoutUiState.elServeTrajectoryLogToggleInlineOpp.checked = allowOpp;
  const cards = ["our", "opponent"].map((scope) => {
    const visible =
      serving === scope &&
      (scope === "our"
        ? allowOur
        : matchState.state.useOpponentTeam && allowOpp);
    if (!visible)
      return { key: scope, scope, visible: false, empty: true, title: "—" };
    const { events, serverName } = getServeTrajectoryEventsForServer(scope),
      formatted = serverName
        ? scope === "our"
          ? formatNameWithNumber(serverName)
          : formatNameWithNumberFor(serverName, getPlayerNumbersForScope(scope))
        : "—",
      stats = getServeStatsForServer(scope, serverName);
    return {
      key: scope,
      scope,
      visible: true,
      empty: !events.length,
      title: `Battuta · ${formatted}`,
      stats: stats
        ? [
            { label: "Tot", value: stats.total },
            { label: "#", value: stats.ace },
            { label: "=", value: stats.error },
            { label: "Pos", value: stats.pos },
            { label: "Eff", value: stats.eff },
          ]
        : null,
      paint: (canvas, visual, redraw) =>
        drawServeTrajectoryCanvas(canvas, visual, events, {
          scope,
          isFarServe: isFarSideForScope(scope),
          onImagesLoad: redraw,
        }),
    };
  });
  analysisTableStore.publish("log-serve-trajectory", {
    visible: !!serving,
    cards,
    legend: cards.some((card) => card.visible)
      ? buildReactTrajectoryLegend("serve")
      : [],
  });
}
