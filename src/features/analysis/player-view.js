import { buildReactPlayerAnalysisSnapshots } from "./player-snapshot-model.js";
import { buildPlayerSkillChartModels } from "./chart-model.js";
import { getSkillChartToneColors } from "./chart-theme.js";

import {
  getPlayerAnalysisPlayerIdx,
  getPlayerAnalysisCompareIdx,
  ensurePlayerAnalysisState,
} from "./player-model.js";
import { getAnalysisTeamScope } from "./filter-model.js";

import {
  getPlayersForScope,
  getPlayerNumbersForScope,
  getTeamNameForScope,
} from "../teams/selectors.js";

import { ensureSkillChartsUiState } from "./skill-chart-model.js";
import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";

import {
  getSortedPlayerEntriesForScope,
  getSortedPlayerEntries,
} from "../teams/lineup-selectors.js";

import { playerAnalysisStore } from "../../state/roster-import-store.mjs";

import { getFilteredPlayerAttackSummaryEventsForPlayer } from "./player-trajectory-model.js";

import {
  publishReactAttackSummary,
  publishReactPlayerAttackGrid,
  publishReactPlayerServeGrid,
} from "./trajectory-view.js";
import { publishReactPlayerSecondTable } from "./setting-view.js";
import { analysisTableStore } from "../../state/analysis-table-store.mjs";
import { session as matchState } from "../../../js/globals.js";

export function publishReactPlayerAnalysis() {
  const prefs = ensurePlayerAnalysisState(),
    scope = getAnalysisTeamScope(),
    players = getPlayersForScope(scope),
    numbers = getPlayerNumbersForScope(scope),
    entries = (
      scope === "opponent"
        ? getSortedPlayerEntriesForScope(scope)
        : getSortedPlayerEntries()
    ).map(({ name, idx }) => ({
      idx,
      label:
        (scope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name)) ||
        name ||
        "Giocatrice " + (idx + 1),
    })),
    idx = getPlayerAnalysisPlayerIdx(),
    compareIdx = getPlayerAnalysisCompareIdx(),
    snapshots = buildReactPlayerAnalysisSnapshots();
  const compareEntries = [scope, ...(matchState.state.useOpponentTeam ? [scope === 'our' ? 'opponent' : 'our'] : [])].flatMap(teamScope => {
    const teamNumbers = getPlayerNumbersForScope(teamScope);
    return getSortedPlayerEntriesForScope(teamScope).filter(entry => teamScope !== scope || entry.idx !== idx).map(({ name, idx }) => ({
      idx, value: `${teamScope}:${idx}`,
      label: `${matchState.state.useOpponentTeam ? getTeamNameForScope(teamScope) + ' · ' : ''}${formatNameWithNumberFor(name, teamNumbers) || name}`,
    }));
  });
  playerAnalysisStore.publish({
    ...snapshots,
    entries,
    compareEntries,
    preferences: { ...prefs },
    playerIdx: idx === null ? "" : String(idx),
    compareIdx: compareIdx === null ? "" : `${prefs.comparePlayerScope}:${compareIdx}`,
    scope,
  });
  return { prefs, compare: !!snapshots.compare };
}

export function refreshReactCompareSections(index, other, nodes, scope = getAnalysisTeamScope(), otherScope = scope) {
  if (nodes.attackSummary)
    publishReactAttackSummary(
      nodes.attackSummary,
      getFilteredPlayerAttackSummaryEventsForPlayer(index, scope),
      getFilteredPlayerAttackSummaryEventsForPlayer(other, otherScope),
    );
  if (nodes.attackGrid) publishReactPlayerAttackGrid(nodes.attackGrid, index, scope);
  if (nodes.serveGrid) publishReactPlayerServeGrid(nodes.serveGrid, index, scope);
  if (nodes.secondBody)
    publishReactPlayerSecondTable(
      nodes.secondBody,
      nodes.distribution,
      index,
      nodes.attackBody,
      other,
      { comparison: true, scope, compareScope: otherScope },
    );
  if (nodes.charts) {
    skillAnalysisState.skillChartToneColorCache = null;
    const players = getPlayersForScope(scope),
      numbers = getPlayerNumbersForScope(scope),
      metricId = ensureSkillChartsUiState().playerMetric || "eff",
      label =
        scope === "opponent"
          ? formatNameWithNumberFor(players[index], numbers)
          : formatNameWithNumber(players[index]);
    analysisTableStore.publish(nodes.charts, {
      charts: buildPlayerSkillChartModels({
        scope,
        playerIdx: index,
        label,
        metricId,
        tones: getSkillChartToneColors(),
      }),
    });
  }
}
