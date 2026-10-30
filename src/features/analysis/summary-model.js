import { SKILL_COLUMNS } from "../../domain/analysis-columns.js";
import { normalizeSkillCounts, buildSkillEntries } from "./statistic-model.js";
import { skillCells } from "./table-cells.js";
import { normalizeSetNumber } from "./values.js";
import { SKILLS } from "../../../js/globals.js";
import { computeMetrics } from "./metrics.js";

import {
  deferSkillChartRenderWhilePaused,
  buildAnalysisSkillChartEvents,
  getSkillChartFiltersCacheToken,
} from "./skill-chart-model.js";
import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
import {
  formatPercent,
  emptyCounts,
  mergeCounts,
} from "../../domain/counts.js";

import {
  getSkillLabel,
  getAggSkillPlayerLabel,
  getAggSkillCounts,
  buildSetStartInfoList,
  makePlayerNameKey,
} from "./player-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import {
  getAnalysisTeamScope,
  getAnalysisEvents,
  getSummarySetNumbers,
  matchesTeamFilter,
  matchesSummarySetFilter,
  computeAttackSplitSummary,
  formatPercentValueSafe,
  getPointDirectionFor,
  computeRotationDeltasForEvents,
} from "./filter-model.js";

import { session as scoutUiState } from "../state/scout-ui.js";
import {
  getPlayersForScope,
  getPlayerNumbersForScope,
  getTeamScopeFromEvent,
  isSkillEnabledForScope,
  getTeamNameForScope,
} from "../teams/selectors.js";

import {
  getSortedPlayerEntriesForScope,
  getSortedPlayerEntries,
} from "../teams/lineup-selectors.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import { aggregatedTableStore } from "../../state/roster-import-store.mjs";
import { buildReactSkillChartModel } from "./chart-model.js";
import { session as matchState } from "../../../js/globals.js";

import {
  computePlayerPointsMap,
  computePlayerErrorsMap,
  computeOpponentErrorsMap,
  computePlayerPassAceMap,
  formatDelta,
  computeOpponentErrorsTotal,
} from "./score-model.js";
import { computePointsSummary, getEventPointValue } from "./scores.js";

export function buildAggregatedSkillCells(countsBySkill, passAces) {
  return SKILL_COLUMNS.flatMap(({ id }) =>
    skillCells(
      id,
      buildSkillEntries(id, countsBySkill[id], passAces).map((entry) =>
        !["Eff", "Pos", "Prf", "% Punti"].includes(entry.label)
          ? entry.value
          : entry.text,
      ),
    ),
  );
}

export function buildReactAggregatedHeaders(sets, includeErrors) {
  const top = [{ text: "Atleta", rowspan: 2 }],
    bottom = [];
  if (sets.length) {
    top.push({ text: "Formazione di partenza", colspan: sets.length });
    sets.forEach((setNum) =>
      bottom.push({
        text: "S" + setNum,
        className: "set-start-header",
        setNum,
        command: "openAggregatedSetStart",
        args: [setNum],
      }),
    );
  }
  top.push({ text: "Punti", colspan: includeErrors ? 5 : 4 });
  bottom.push(
    ...[
      "Fatti",
      "Subiti",
      "Δ",
      "Falli/Errori",
      ...(includeErrors ? ["Errori avv."] : []),
    ].map((text) => ({ text })),
  );
  SKILL_COLUMNS.forEach((skill) => {
    const className = "skill-col skill-" + skill.id;
    top.push({
      text: skill.label,
      colspan: skill.columns.length,
      className: className + " agg-skill-header",
      skillId: skill.id,
      title: "Dettagli " + getSkillLabel(skill.id),
      command: "openReactAggregatedSkill",
      args: [skill.id],
    });
    bottom.push(...skill.columns.map((text) => ({ text, className })));
  });
  return [top, bottom];
}

export function buildReactAggregatedDetail(headers, rows, summary, tones) {
  const skillId = scoutUiState.aggTableView.skillId,
    playerIdx = scoutUiState.aggTableView.playerIdx,
    scope = getAnalysisTeamScope(),
    events = getAnalysisEvents(),
    players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    isSkill = scoutUiState.aggTableView.mode === "skill",
    className = isSkill ? "skill-col skill-" + skillId : "";
  headers.push([
    {
      text:
        (isSkill
          ? "Atleta · " + getSkillLabel(skillId)
          : "Fondamentale · " + getAggSkillPlayerLabel(playerIdx)) +
        " <- Tabellino",
      className: "agg-table-back",
      command: "showAggregatedSummary",
    },
    ...["Tot", "#", "+", "!", "-", "=", "/", "Pos", "Prf", "Eff"].map(
      (text) => ({ text, className }),
    ),
  ]);
  if (!players?.length) {
    rows.push({
      cells: [
        {
          text:
            "Aggiungi giocatrici per vedere il dettaglio" +
            (isSkill ? " " + getSkillLabel(skillId) : "") +
            ".",
          colspan: 11,
        },
      ],
    });
    return [];
  }
  const add = (label, counts, id, index, total = false) => {
    const metrics = computeMetrics(counts, id),
      texts = [
        label,
        metrics.total,
        ...["#", "+", "!", "-", "=", "/"].map((code) => counts[code] || 0),
        ...["pos", "prf", "eff"].map((key) =>
          metrics[key] === null ? "-" : formatPercent(metrics[key]),
        ),
      ];
    rows.push({
      className: total ? "rotation-row total" : "",
      cells: texts.map((text, cellIndex) => ({
        text,
        className:
          "skill-col skill-" +
          id +
          (isSkill && cellIndex === 0 && !total ? " agg-player-cell" : ""),
        command:
          isSkill && cellIndex === 0 && !total
            ? "openReactAggregatedPlayer"
            : undefined,
        args: [index, scope],
      })),
    });
  };
  if (isSkill) {
    const totals = emptyCounts(),
      entries =
        scope === "opponent"
          ? getSortedPlayerEntriesForScope(scope)
          : getSortedPlayerEntries();
    entries.forEach(({ name, idx }) => {
      const counts = getAggSkillCounts(skillId, idx);
      mergeCounts(totals, counts);
      add(
        scope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name),
        counts,
        skillId,
        idx,
      );
    });
    add("Totale squadra", totals, skillId, null, true);
    const bySet = new Map(
      getSummarySetNumbers().map((set) => [set, emptyCounts()]),
    );
    events.forEach((ev) => {
      if (
        !ev ||
        ev.skillId !== skillId ||
        !ev.code ||
        ev.actionType === "timeout" ||
        ev.actionType === "substitution" ||
        getTeamScopeFromEvent(ev) !== scope ||
        !isSkillEnabledForScope(skillId, scope)
      )
        return;
      const counts = bySet.get(normalizeSetNumber(ev.set));
      if (counts) counts[ev.code] = (counts[ev.code] || 0) + 1;
    });
    bySet.forEach((counts, set) =>
      add("Set " + set, counts, skillId, null, true),
    );
    if (deferSkillChartRenderWhilePaused())
      return aggregatedTableStore.getSnapshot().charts || [];
    const chartEvents = buildAnalysisSkillChartEvents({
      scope,
      skillId,
      playerIdx: null,
    });
    return skillAnalysisState.SKILL_CHART_METRICS.map((meta) =>
      buildReactSkillChartModel({
        tones,
        title: `${getSkillLabel(skillId)} · ${meta.label}`,
        subtitle: `${chartEvents.length} eventi`,
        events: chartEvents,
        skillId,
        metricId: meta.id,
        seriesCacheKey: `analysis-summary-skill|${getSkillChartFiltersCacheToken(scope)}|skill:${skillId}|metric:${meta.id}`,
      }),
    );
  } else
    ["serve", "pass", "freeball", "attack", "block", "defense"].forEach((id) =>
      add(getSkillLabel(id), getAggSkillCounts(id, playerIdx), id, playerIdx),
    );
  return [];
}

export function buildReactAggregatedTable({ chartTones } = {}) {
  const rows = [],
    extraRows = [];
  let headers = [],
    charts = [],
    tableClass = "agg-table";
  const finish = () => ({
    summary: summaryAll,
    scope: showBothTeams ? "our" : analysisScope,
    events: analysisEvents,
    view: {
      headers,
      rows,
      extraRows,
      charts,
      tableClass,
      hiddenSkills: SKILLS.filter(
        (skill) =>
          matchState.state.metricsConfig?.[skill.id]?.enabled === false,
      ).map((skill) => skill.id),
    },
  });
  const analysisScope = getAnalysisTeamScope();
  const analysisEvents = getAnalysisEvents();
  const playedSets = getSummarySetNumbers();
  const includeOpponentErrorsCol = !matchState.state.useOpponentTeam;
  const summaryColCount =
    32 + (includeOpponentErrorsCol ? 1 : 0) + playedSets.length;
  const showBothTeams =
    matchState.state.useOpponentTeam &&
    analysisFiltersState.analysisTeamFilterState.teams.size === 0 &&
    scoutUiState.aggTableView.mode === "summary";
  {
    if (showBothTeams) tableClass += " agg-table--double";
    const freeballVisible = showBothTeams
      ? isSkillEnabledForScope("freeball", "our") ||
        isSkillEnabledForScope("freeball", "opponent")
      : isSkillEnabledForScope("freeball", analysisScope);
    if (!freeballVisible) tableClass += " agg-table--hide-freeball";
  }
  const summaryAll = computePointsSummary(null, {
    teamScope: analysisScope,
    events: analysisEvents,
  });
  if (scoutUiState.aggTableView.mode !== "summary") {
    charts = buildReactAggregatedDetail(headers, rows, summaryAll, chartTones);
    return finish();
  }
  headers = buildReactAggregatedHeaders(playedSets, includeOpponentErrorsCol);
  const computeTeamTotalsForEvents = (events, scope) => {
    const totalsBySkill = {
      serve: emptyCounts(),
      pass: emptyCounts(),
      freeball: emptyCounts(),
      attack: emptyCounts(),
      block: emptyCounts(),
      defense: emptyCounts(),
    };
    let teamErrors = 0;
    (events || []).forEach((ev) => {
      if (
        !ev ||
        ev.skillId === "manual" ||
        ev.actionType === "timeout" ||
        ev.actionType === "substitution"
      ) {
        if (ev && ev.skillId === "manual" && ev.code === "team-error") {
          const val = getEventPointValue(ev);
          teamErrors += Math.max(0, val);
        }
        return;
      }
      if (!isSkillEnabledForScope(ev.skillId, getTeamScopeFromEvent(ev)))
        return;
      const bucket = totalsBySkill[ev.skillId];
      if (!bucket || !ev.code) return;
      bucket[ev.code] = (bucket[ev.code] || 0) + 1;
    });
    const playerPoints = computePlayerPointsMap(events, scope);
    const playerErrors = computePlayerErrorsMap(events);
    let totalFor = 0;
    let totalAgainst = 0;
    Object.values(playerPoints || {}).forEach((points) => {
      totalFor += points.for || 0;
      totalAgainst += points.against || 0;
    });
    let totalErrors = 0;
    Object.values(playerErrors || {}).forEach((val) => {
      totalErrors += val || 0;
    });
    totalErrors += teamErrors;
    return { totalsBySkill, totalFor, totalAgainst, totalErrors };
  };
  const renderSummaryExtraTable = (scopes) => {

const buildRow = (cells, { isHeader = false } = {}) => {
      extraRows.push({
        cells: cells.map((cell) => ({ ...cell, tag: isHeader ? "th" : "td" })),
      });
    };
    const positiveReceiveCodes = new Set(["#", "+"]);
    const tableScopes = Array.isArray(scopes) && scopes.length ? scopes : [];
    tableScopes.forEach((scope, idx) => {
      const scopeEvents = analysisEvents.filter(
        (ev) =>
          matchesTeamFilter(ev, new Set([scope])) &&
          matchesSummarySetFilter(ev),
      );
      const teamName = getTeamNameForScope(scope);
      if (idx > 0) {
        buildRow([{ text: "", colspan: 14 }]);
      }
      buildRow([{ text: teamName, colspan: 14 }], { isHeader: true });
      buildRow(
        [
          { text: "Cambio palla", colspan: 3 },
          { text: "Attacchi su ricezione positiva", colspan: 5 },
          { text: "Attacchi su ricezione non positiva", colspan: 6 },
        ],
        { isHeader: true },
      );
      buildRow(
        [
          { text: "Ricezione" },
          { text: "CP punti" },
          { text: "%" },
          { text: "Err" },
          { text: "Mur" },
          { text: "Pt" },
          { text: "Pt%" },
          { text: "Tot" },
          { text: "Err" },
          { text: "Mur" },
          { text: "Pt" },
          { text: "Pt%" },
          { text: "Tot" },
          { text: "" },
        ],
        { isHeader: true },
      );
      const receiveEvents = scopeEvents.filter(
        (ev) => ev && ev.skillId === "pass",
      );
      const receiveCount = receiveEvents.length;
      const sideoutAttacks = scopeEvents.filter((ev) => {
        if (!ev || ev.skillId !== "attack") return false;
        if (ev.attackBp === false) return true;
        if (ev.attackBp == null && ev.receiveEvaluation) return true;
        return false;
      });
      const cpPoints = sideoutAttacks.filter((ev) => ev.code === "#").length;
      const posReceiveAttacks = sideoutAttacks.filter((ev) =>
        positiveReceiveCodes.has(ev.receiveEvaluation),
      );
      const nonPosReceiveAttacks = sideoutAttacks.filter(
        (ev) => !positiveReceiveCodes.has(ev.receiveEvaluation),
      );
      const posSummary = computeAttackSplitSummary(posReceiveAttacks);
      const nonPosSummary = computeAttackSplitSummary(nonPosReceiveAttacks);
      buildRow([
        { text: receiveCount },
        { text: cpPoints },
        { text: formatPercentValueSafe(cpPoints, receiveCount) },
        { text: posSummary.err },
        { text: posSummary.mur },
        { text: posSummary.pt },
        { text: formatPercentValueSafe(posSummary.pt, posSummary.tot) },
        { text: posSummary.tot },
        { text: nonPosSummary.err },
        { text: nonPosSummary.mur },
        { text: nonPosSummary.pt },
        { text: formatPercentValueSafe(nonPosSummary.pt, nonPosSummary.tot) },
        { text: nonPosSummary.tot },
        { text: "-" },
      ]);
      buildRow([{ text: "", colspan: 14 }]);
      buildRow(
        [
          { text: "Break Point", colspan: 3 },
          { text: "Contrattacchi", colspan: 5 },
          { text: "Differenza rotazione", colspan: 6 },
        ],
        { isHeader: true },
      );
      buildRow(
        [
          { text: "Battuta" },
          { text: "BP punti" },
          { text: "%" },
          { text: "Err" },
          { text: "Mur" },
          { text: "Pt" },
          { text: "Pt%" },
          { text: "Tot" },
          { text: "1" },
          { text: "2" },
          { text: "3" },
          { text: "4" },
          { text: "5" },
          { text: "6" },
        ],
        { isHeader: true },
      );
      const serveEvents = scopeEvents.filter(
        (ev) => ev && ev.skillId === "serve",
      );
      const serveCount = serveEvents.length;
      const bpPointEvents = scopeEvents.filter((ev) => {
        if (!ev) return false;
        const direction = getPointDirectionFor(scope, ev);
        if (direction !== "for") return false;
        if (ev.skillId === "serve" || ev.skillId === "block") return true;
        return ev.skillId === "attack" && ev.attackBp === true;
      });
      const bpPoints = bpPointEvents.reduce(
        (sum, ev) => sum + getEventPointValue(ev),
        0,
      );
      const counterAttacks = scopeEvents.filter(
        (ev) => ev && ev.skillId === "attack" && ev.attackBp === true,
      );
      const counterSummary = computeAttackSplitSummary(counterAttacks);
      const rotationDeltas = computeRotationDeltasForEvents(scopeEvents, scope);
      buildRow([
        { text: serveCount },
        { text: bpPoints },
        { text: formatPercentValueSafe(bpPoints, serveCount) },
        { text: counterSummary.err },
        { text: counterSummary.mur },
        { text: counterSummary.pt },
        { text: formatPercentValueSafe(counterSummary.pt, counterSummary.tot) },
        { text: counterSummary.tot },
        ...Array.from({ length: 6 }, (_, index) => ({
          text: rotationDeltas[index] || 0,
          className:
            "rotation-delta-cell " +
            (rotationDeltas[index] > 0
              ? "pos"
              : rotationDeltas[index] < 0
                ? "neg"
                : "zero"),
        })),
      ]);
    });
  };
  const renderAggSummaryForScope = (scope, { showHeader = false } = {}) => {
    const analysisPlayers = getPlayersForScope(scope);
    const analysisNumbers = getPlayerNumbersForScope(scope);
    const filteredEvents = analysisEvents.filter((ev) =>
      matchesTeamFilter(ev, new Set([scope])),
    );
    const summaryEvents = filteredEvents.filter((ev) =>
      matchesSummarySetFilter(ev),
    );
    if (showHeader) {
      rows.push({
        className: "rotation-row total",
        cells: [{ text: getTeamNameForScope(scope), colspan: summaryColCount }],
      });
      headers.forEach((header) =>
        rows.push({
          className: "agg-body-header",
          scope,
          cells: header.map((cell) => ({
            ...cell,
            tag: "td",
            className: cell.skillId
              ? cell.className + " agg-skill-header"
              : cell.className,
            command: cell.skillId
              ? "openReactAggregatedSkill"
              : cell.setNum
                ? "openAggregatedSetStart"
                : undefined,
            args: cell.skillId
              ? [cell.skillId, scope, showBothTeams]
              : [cell.setNum, scope],
          })),
        }),
      );
    }
    if (!analysisPlayers || analysisPlayers.length === 0) {
      rows.push({
        cells: [
          {
            text: "Aggiungi giocatrici per vedere il riepilogo.",
            colspan: summaryColCount,
          },
        ],
      });
      return;
    }
    const statsByPlayer = {};
    summaryEvents.forEach((ev) => {
      if (
        !ev ||
        ev.skillId === "manual" ||
        ev.actionType === "timeout" ||
        ev.actionType === "substitution"
      ) {
        return;
      }
      if (!isSkillEnabledForScope(ev.skillId, getTeamScopeFromEvent(ev)))
        return;
      if (typeof ev.playerIdx !== "number" || !analysisPlayers[ev.playerIdx])
        return;
      if (!statsByPlayer[ev.playerIdx]) {
        statsByPlayer[ev.playerIdx] = {};
      }
      if (!statsByPlayer[ev.playerIdx][ev.skillId]) {
        statsByPlayer[ev.playerIdx][ev.skillId] = {
          "#": 0,
          "+": 0,
          "!": 0,
          "-": 0,
          "=": 0,
          "/": 0,
        };
      }
      statsByPlayer[ev.playerIdx][ev.skillId][ev.code] =
        (statsByPlayer[ev.playerIdx][ev.skillId][ev.code] || 0) + 1;
    });
    if (!showBothTeams) {
      scoutUiState.analysisStatsCache = statsByPlayer;
      scoutUiState.analysisStatsScope = scope;
    }
    const playerPoints = computePlayerPointsMap(summaryEvents, scope);
    const playerErrors = computePlayerErrorsMap(summaryEvents);
    const playerOpponentErrors = includeOpponentErrorsCol
      ? computeOpponentErrorsMap(summaryEvents)
      : {};
    const playerPassAces = computePlayerPassAceMap(summaryEvents, scope);
    const totalsBySkill = {
      serve: emptyCounts(),
      pass: emptyCounts(),
      attack: emptyCounts(),
      block: emptyCounts(),
      defense: emptyCounts(),
    };
    let totalErrors = 0;
    let totalPassAces = 0;
    const sortedEntries =
      scope === "opponent"
        ? getSortedPlayerEntriesForScope(scope)
        : getSortedPlayerEntries();
    const startInfoList = buildSetStartInfoList(playedSets, scope);
    sortedEntries.forEach(({ name, idx }) => {
      const countsBySkill = normalizeSkillCounts(statsByPlayer[idx]);
      SKILL_COLUMNS.forEach(({ id }) =>
        mergeCounts(totalsBySkill[id], countsBySkill[id]),
      );

      const points = playerPoints[idx] || { for: 0, against: 0 };
      const personalErrors = playerErrors[idx] || 0;
      const opponentErrors = includeOpponentErrorsCol
        ? playerOpponentErrors[idx] || 0
        : 0;
      const passAces = playerPassAces[idx] || 0;
      totalErrors += personalErrors;
      totalPassAces += passAces;

      const startCells = startInfoList.map((info) => {
        const key = makePlayerNameKey(name);
        const pos = info.positions ? info.positions.get(key) : null;
        const hasPos = !!pos;
        const isSubIn = !hasPos && info.subsIn && info.subsIn.has(key);
        const text = hasPos ? String(pos) : isSubIn ? "in" : "-";
        return {
          text,
          isSetter: hasPos && info.setterPos === pos,
          isStarter: hasPos,
        };
      });
      const cells = [
        {
          text:
            scope === "opponent"
              ? formatNameWithNumberFor(name, analysisNumbers)
              : formatNameWithNumber(name),
          isPlayer: true,
          playerIdx: idx,
        },
        ...startCells,
        { text: points.for || 0 },
        { text: points.against || 0 },
        { text: formatDelta((points.for || 0) - (points.against || 0)) },
        { text: personalErrors || 0 },
        ...(includeOpponentErrorsCol
          ? [{ text: opponentErrors > 0 ? opponentErrors : "-" }]
          : []),

        ...buildAggregatedSkillCells(countsBySkill, passAces),
      ];
      rows.push({
        cells: cells.map((cell) => ({
          ...cell,
          className:
            cell.className ||
            (cell.isStarter ? "formation-starter-cell " : "") +
              (cell.isSetter ? "formation-setter-cell " : "") +
              (cell.isPlayer ? "agg-player-cell" : ""),
          title: cell.isPlayer ? "Dettagli giocatrice" : undefined,
          command: cell.isPlayer ? "openReactAggregatedPlayer" : undefined,
          args: [cell.playerIdx, scope, showBothTeams],
        })),
      });
    });
    const teamTotals = computeTeamTotalsForEvents(summaryEvents, scope);
    const teamOpponentErrors = includeOpponentErrorsCol
      ? computeOpponentErrorsTotal(summaryEvents)
      : 0;

    const startTotalsCells = playedSets.map(() => ({ text: "-" }));
    const totalCells = [
      { text: "Totale squadra" },
      ...startTotalsCells,
      { text: teamTotals.totalFor || 0 },
      { text: teamTotals.totalAgainst || 0 },
      {
        text: formatDelta(
          (teamTotals.totalFor || 0) - (teamTotals.totalAgainst || 0),
        ),
      },
      { text: teamTotals.totalErrors || 0 },
      ...(includeOpponentErrorsCol ? [{ text: teamOpponentErrors || 0 }] : []),

      ...buildAggregatedSkillCells(totalsBySkill, totalPassAces),
    ];
    rows.push({ className: "rotation-row total", cells: totalCells });
    playedSets.forEach((setNum) => {
      const setEvents = summaryEvents.filter(
        (ev) => normalizeSetNumber(ev.set) === setNum,
      );
      const setTotals = computeTeamTotalsForEvents(setEvents, scope);
      const setOpponentErrors = includeOpponentErrorsCol
        ? computeOpponentErrorsTotal(setEvents)
        : 0;

      const setPassAcesMap = computePlayerPassAceMap(setEvents, scope);
      let setPassAces = 0;
      Object.values(setPassAcesMap || {}).forEach((val) => {
        setPassAces += val || 0;
      });

      const setStartCells = playedSets.map(() => ({ text: "-" }));
      const setCells = [
        { text: "Set " + setNum },
        ...setStartCells,
        { text: setTotals.totalFor || 0 },
        { text: setTotals.totalAgainst || 0 },
        {
          text: formatDelta(
            (setTotals.totalFor || 0) - (setTotals.totalAgainst || 0),
          ),
        },
        { text: setTotals.totalErrors || 0 },
        ...(includeOpponentErrorsCol ? [{ text: setOpponentErrors || 0 }] : []),

        ...buildAggregatedSkillCells(setTotals.totalsBySkill, setPassAces),
      ];
      rows.push({ className: "rotation-row", cells: setCells });
    });
  };
  if (showBothTeams) {
    renderAggSummaryForScope("our", { showHeader: true });
    renderAggSummaryForScope("opponent", { showHeader: true });
    renderSummaryExtraTable(["our", "opponent"]);
    return finish();
  }
  const analysisPlayers = getPlayersForScope(analysisScope);
  if (!analysisPlayers || analysisPlayers.length === 0) {
    rows.push({
      cells: [
        {
          text: "Aggiungi giocatrici per vedere il riepilogo.",
          colspan: summaryColCount,
        },
      ],
    });
    return finish();
  }
  renderAggSummaryForScope(analysisScope);
  renderSummaryExtraTable([analysisScope]);
  return finish();
}
