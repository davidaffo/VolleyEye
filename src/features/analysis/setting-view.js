import { buildDistributionCards } from "./setting-model.js";
import {
  countRowCells,
  comparisonCountCells,
  metricDeltaClass,
  groupEventCounts,
  countEvaluatedEvents,
} from "./count-table-model.js";

import { skillCells } from "./table-cells.js";
import { analysisTableStore } from "../../state/analysis-table-store.mjs";
import { session as rosterLineupState } from "../state/roster-lineup.js";

import { getFilteredSecondEvents } from "./setting-model.js";
import {
  getAnalysisTeamScope,
  getAnalysisEvents,
  matchesTeamFilter,
  getSetterFromEvent,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import {
  getPlayersForScope,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";

import {
  getFilteredPlayerSecondEventsForPlayer,
  getFilteredPlayerAttacksForSecondDistribution,
} from "./player-setting-model.js";
import {
  emptyCounts,
  mergeCounts,
  totalFromCounts,
  formatPercent,
} from "../../domain/counts.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import { computeMetrics } from "./metrics.js";
import { resolvePlayerIdx } from "../events/player-links.js";

export function publishReactSecondTable() {
  const viewRows = [];
  const publish = () =>
    analysisTableStore.publish(rosterLineupState.elAggSecondBody.id, {
      rows: viewRows,
    });
  if (!rosterLineupState.elAggSecondBody) return;

  const aggSecondAttackBody = document.getElementById("agg-second-attack-body");
  const analysisScope = getAnalysisTeamScope();
  const analysisPlayers = getPlayersForScope(analysisScope);
  const analysisNumbers = getPlayerNumbersForScope(analysisScope);
  if (!analysisPlayers || analysisPlayers.length === 0) {
    viewRows.push({
      cells: [
        { text: "Aggiungi giocatrici per vedere il riepilogo.", colspan: 11 },
      ],
    });
    publish();
    publishReactAttackOutcomes(aggSecondAttackBody, [], {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi",
    });
    return;
  }
  const totals = emptyCounts();
  const rows = [];
  const secondEvents = getAnalysisEvents().filter(
    (ev) =>
      ev &&
      ev.skillId === "second" &&
      matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams),
  );
  const countsByPlayer = groupEventCounts(secondEvents, (ev) => {
    const playerIdx = typeof ev.playerIdx === "number" ? ev.playerIdx : null;
    const key =
      playerIdx !== null
        ? "idx-" + playerIdx
        : ev.playerName || String(ev.playerIdx || "");
    const name =
      playerIdx !== null && analysisPlayers[playerIdx]
        ? analysisScope === "opponent"
          ? formatNameWithNumberFor(analysisPlayers[playerIdx], analysisNumbers)
          : formatNameWithNumber(analysisPlayers[playerIdx])
        : ev.playerName || "Alzatrice";
    return { key, name };
  });
  countsByPlayer.forEach((bucket) => {
    mergeCounts(totals, bucket.counts);
    rows.push({
      name: bucket.name,
      counts: bucket.counts,
    });
  });
  const attackRowsMap = groupEventCounts(getFilteredSecondEvents(), (ev) => {
    const setterIdx = getSetterFromEvent(ev);
    const name =
      typeof setterIdx === "number" && analysisPlayers[setterIdx]
        ? analysisScope === "opponent"
          ? formatNameWithNumberFor(analysisPlayers[setterIdx], analysisNumbers)
          : formatNameWithNumber(analysisPlayers[setterIdx])
        : ev.setterName || "Alzatrice";
    return {
      key: typeof setterIdx === "number" ? "idx-" + setterIdx : name,
      name,
    };
  });
  const attackRows = Array.from(attackRowsMap.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );
  if (rows.length === 0) {
    viewRows.push({
      cells: [
        { text: "Registra alzate per vedere il dettaglio.", colspan: 11 },
      ],
    });
    publish();
    publishReactAttackOutcomes(aggSecondAttackBody, attackRows, {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi",
    });
    return;
  }
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  rows.forEach((row) =>
    viewRows.push({ cells: countRowCells(row.name, row.counts, "second") }),
  );
  const totalCells = countRowCells("Totale alzate", totals, "second");
  viewRows.push({ className: "rotation-row total", cells: totalCells });
  publish();
  publishReactAttackOutcomes(aggSecondAttackBody, attackRows, {
    emptyText: "Nessun attacco associato alle alzate filtrate.",
    totalLabel: "Totale attacchi",
  });
}

export function publishReactAttackOutcomes(
  targetBody,
  rows,
  {
    emptyText = "Nessun attacco trovato.",
    totalLabel = "Totale attacchi",
  } = {},
) {
  if (!targetBody) return;
  const viewRows = [];
  const publish = () =>
    analysisTableStore.publish(targetBody.id, { rows: viewRows });
  if (!rows || rows.length === 0) {
    viewRows.push({ cells: [{ text: emptyText, colspan: 11 }] });
    publish();
    return;
  }
  const totals = emptyCounts();
  rows.forEach((row) => {
    mergeCounts(totals, row.counts);
    viewRows.push({ cells: countRowCells(row.name, row.counts, "attack") });
  });
  const totalCells = countRowCells(totalLabel, totals, "attack");
  viewRows.push({ className: "rotation-row total", cells: totalCells });
  publish();
}

export function publishReactPlayerSecondTable(
  targetBody,
  targetDistribution,
  playerIdx,
  targetAttackBody = null,
  comparePlayerIdx = null,
) {
  if (!targetBody) return;
  const viewRows = [];
  const publish = () =>
    analysisTableStore.publish(targetBody.id, { rows: viewRows });
  const attackOutcomeBody = targetAttackBody;
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const isCompareTable = !!targetBody.closest(
    ".player-analysis-compare-subsection",
  );
  const formatScopedPlayerName = (idx) =>
    analysisScope === "opponent"
      ? formatNameWithNumberFor(players[idx], numbers)
      : formatNameWithNumber(players[idx]);
  if (playerIdx === null) {
    viewRows.push({
      cells: [
        {
          text: "Seleziona una giocatrice per vedere la distribuzione.",
          colspan: 11,
        },
      ],
    });
    publish();
    publishReactAttackOutcomes(attackOutcomeBody, [], {
      emptyText:
        "Seleziona una giocatrice per vedere gli esiti attacco dopo alzata.",
      totalLabel: "Totale attacchi",
    });
    publishReactDistributionGrid(targetDistribution, []);
    return;
  }
  const secondEventsFor = (index) =>
    getAnalysisEvents().filter(
      (ev) =>
        ev &&
        ev.skillId === "second" &&
        matchesTeamFilter(
          ev,
          analysisFiltersState.analysisTeamFilterState.teams,
        ) &&
        typeof ev.playerIdx === "number" &&
        ev.playerIdx === index,
    );
  const secondEvents = secondEventsFor(playerIdx);
  const compareSecondEvents =
    typeof comparePlayerIdx === "number"
      ? secondEventsFor(comparePlayerIdx)
      : [];
  const secondCounts = countEvaluatedEvents(secondEvents);
  const filteredAttackEvents =
    getFilteredPlayerSecondEventsForPlayer(playerIdx);
  const compareAttackEvents =
    typeof comparePlayerIdx === "number"
      ? getFilteredPlayerSecondEventsForPlayer(comparePlayerIdx)
      : [];
  const identifyAttacker = (ev) => {
    const idx = resolvePlayerIdx(ev);
    const name =
      typeof idx === "number" && players[idx]
        ? formatScopedPlayerName(idx)
        : ev.playerName || "Attaccante";
    return { key: typeof idx === "number" ? "idx-" + idx : name, name };
  };
  const attackRowsMap = groupEventCounts(
    filteredAttackEvents,
    identifyAttacker,
  );
  const compareAttackRowsMap = groupEventCounts(
    compareAttackEvents,
    identifyAttacker,
  );
  const attackRows = Array.from(attackRowsMap.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "it", { sensitivity: "base" }),
    );
  if (attackOutcomeBody && isCompareTable) {
    const attackViewRows = [];
    if (!attackRows.length) {
      publishReactAttackOutcomes(attackOutcomeBody, [], {
        emptyText: "Nessun attacco associato alle alzate filtrate.",
        totalLabel: "Totale attacchi",
      });
    } else {
      const compareAttackTotals = emptyCounts();
      const attackTotals = emptyCounts();
      attackRows.forEach((row) => {
        mergeCounts(attackTotals, row.counts);
        const compareRow = compareAttackRowsMap.get(row.key);
        const compareCounts = compareRow ? compareRow.counts : emptyCounts();
        attackViewRows.push({
          cells: comparisonCountCells(
            row.name,
            row.counts,
            compareCounts,
            "attack",
          ),
        });
      });
      compareAttackRowsMap.forEach((bucket) =>
        mergeCounts(compareAttackTotals, bucket.counts),
      );
      const totalCells = comparisonCountCells(
        "Totale attacchi",
        attackTotals,
        compareAttackTotals,
        "attack",
      );
      attackViewRows.push({
        className: "rotation-row total",
        cells: totalCells,
      });
      analysisTableStore.publish(attackOutcomeBody.id, {
        rows: attackViewRows,
      });
    }
  } else {
    publishReactAttackOutcomes(attackOutcomeBody, attackRows, {
      emptyText: "Nessun attacco associato alle alzate filtrate.",
      totalLabel: "Totale attacchi",
    });
  }
  const compareSecondCounts = countEvaluatedEvents(compareSecondEvents);
  const total = totalFromCounts(secondCounts);
  if (!total) {
    viewRows.push({
      cells: [
        { text: "Registra alzate per vedere il dettaglio.", colspan: 11 },
      ],
    });
    publish();
    publishReactDistributionGrid(
      targetDistribution,
      getFilteredPlayerAttacksForSecondDistribution(playerIdx),
      typeof comparePlayerIdx === "number"
        ? getFilteredPlayerAttacksForSecondDistribution(comparePlayerIdx)
        : null,
    );
    return;
  }
  const metrics = computeMetrics(secondCounts, "second");
  const compareMetrics = computeMetrics(compareSecondCounts, "second");

  const cells = [
    {
      text:
        typeof playerIdx === "number" && players[playerIdx]
          ? formatScopedPlayerName(playerIdx)
          : "Alzatrice",
    },
    ...skillCells("second", [
      total,
      secondCounts["#"] || 0,
      secondCounts["+"] || 0,
      secondCounts["!"] || 0,
      secondCounts["-"] || 0,
      secondCounts["="] || 0,
      secondCounts["/"] || 0,
    ]),
    ...["pos", "prf", "eff"].map((key) => ({
      text: formatPercent(metrics[key]),
      className: "skill-col skill-second",
      compareClass: isCompareTable
        ? metricDeltaClass(metrics[key], compareMetrics[key])
        : "",
    })),
  ];
  viewRows.push({
    cells: cells.map((cell) => ({
      ...cell,
      className:
        (cell.className || "") +
        (cell.compareClass
          ? " player-analysis-compare-value " + cell.compareClass
          : ""),
    })),
  });
  publish();
  publishReactDistributionGrid(
    targetDistribution,
    getFilteredPlayerAttacksForSecondDistribution(playerIdx),
    typeof comparePlayerIdx === "number"
      ? getFilteredPlayerAttacksForSecondDistribution(comparePlayerIdx)
      : null,
  );
}

export function publishReactDistributionGrid(
  target,
  events,
  compareEvents = null,
) {
  analysisTableStore.publish(target.id, {
    cards: buildDistributionCards(events, compareEvents),
  });
}
