import { buildPlayerSkillChartModels } from "./chart-model.js";
import { getSkillChartToneColors } from "./chart-theme.js";
import { SKILL_COLUMNS } from "../../domain/analysis-columns.js";
import { normalizeSkillCounts, buildSkillEntries } from "./statistic-model.js";
import { statisticEntry } from "./table-cells.js";

import {
  renderPlayerAnalysis,
  updatePlayerAnalysisVisibility,
} from "./skill-tables.js";
import {
  getPlayerAnalysisPlayerIdx,
  getPlayerAnalysisCompareIdx,
  ensurePlayerAnalysisState,
} from "./player-model.js";
import {
  getAnalysisTeamScope,
  filterEventsByAnalysisTeam,
  matchesSummarySetFilter,
  getAnalysisCourtSide,
} from "./filter-model.js";
import { renderAnalysisTeamFilter } from "./analysis-filters.js";
import { renderAnalysisCourtSideRadios, getCheckedRadioValue } from "./filter-view.js";
import {
  getPlayersForScope,
  getPlayerNumbersForScope,
} from "../teams/selectors.js";
import { getPlayerPhotoForScope } from "../teams/player-identity.js";
import {
  computeStatsByPlayerForEvents,
  computePlayerPointsMap,
  computePlayerErrorsMap,
  computePlayerPassAceMap,
  formatDelta,
} from "./score-model.js";

import { renderPlayerAnalysisSkillCharts } from "./skill-analysis.js";
import { ensureSkillChartsUiState } from "./skill-chart-model.js";
import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
import { saveState } from "../storage/save-state.js";
import {
  getSortedPlayerEntriesForScope,
  getSortedPlayerEntries,
} from "../teams/lineup-selectors.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { playerAnalysisStore } from "../../state/roster-import-store.mjs";
import { session as matchState } from "../../../js/globals.js";
import { renderPlayerTrajectoryAnalysis, renderPlayerServeTrajectoryAnalysis } from "./player-trajectories.js";
import { getFilteredPlayerAttackSummaryEventsForPlayer } from "./player-trajectory-model.js";
import { renderPlayerSecondTable } from "./player-second-distribution.js";
import {
  publishReactAttackSummary,
  publishReactPlayerAttackGrid,
  publishReactPlayerServeGrid,
} from "./trajectory-view.js";
import { publishReactPlayerSecondTable } from "./setting-view.js";
import { analysisTableStore } from "../../state/analysis-table-store.mjs";

export function buildReactPlayerAnalysisSnapshots() {
  const idx = getPlayerAnalysisPlayerIdx();
  const compareIdx = getPlayerAnalysisCompareIdx();
  const analysisScope = getAnalysisTeamScope();
  const players = getPlayersForScope(analysisScope);
  const numbers = getPlayerNumbersForScope(analysisScope);
  const prefs = ensurePlayerAnalysisState();
  const filteredEvents = filterEventsByAnalysisTeam().filter((ev) =>
    matchesSummarySetFilter(ev),
  );
  const statsByPlayer = computeStatsByPlayerForEvents(filteredEvents, players);
  if (idx === null || !players || !players[idx]) {
    return { primary: null, compare: null };
  }
  const playerPoints = computePlayerPointsMap(filteredEvents, analysisScope);
  const playerErrors = computePlayerErrorsMap(filteredEvents);
  const playerPassAces = computePlayerPassAceMap(filteredEvents, analysisScope);
  const buildPlayerSnapshot = (playerIdx) => {
    const name = players[playerIdx];
    const countsBySkill = normalizeSkillCounts(statsByPlayer[playerIdx]);
    const points = playerPoints[playerIdx] || { for: 0, against: 0 };
    const personalErrors = playerErrors[playerIdx] || 0;
    const passAces = playerPassAces[playerIdx] || 0;
    return {
      playerIdx,
      photo: getPlayerPhotoForScope(analysisScope, name),
      name:
        analysisScope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name),
      metrics: [
        {
          title: "Punti",
          entries: [
            statisticEntry("Fatti", points.for || 0),
            statisticEntry("Subiti", points.against || 0, "lower"),
            statisticEntry(
              "Delta",
              (points.for || 0) - (points.against || 0),
              "higher",
              formatDelta((points.for || 0) - (points.against || 0)),
            ),
            statisticEntry("Falli/Errori", personalErrors || 0, "lower"),
          ],
        },
        ...SKILL_COLUMNS.map(({ id, label }) => ({
          title: label,
          entries: buildSkillEntries(id, countsBySkill[id], passAces),
        })),
      ],
    };
  };
  return {
    primary: buildPlayerSnapshot(idx),
    compare:
      prefs.compareEnabled && compareIdx !== null && players[compareIdx]
        ? buildPlayerSnapshot(compareIdx)
        : null,
  };
}

export function changeReactPlayerAnalysis(field, value) {
  const prefs = ensurePlayerAnalysisState();
  if (field === "playerIdx" || field === "comparePlayerIdx") {
    const index = parseInt(value, 10);
    prefs[field] = isNaN(index) ? null : index;
    if (
      field === "playerIdx" &&
      prefs.compareEnabled &&
      prefs.comparePlayerIdx === prefs.playerIdx
    )
      prefs.comparePlayerIdx = null;
  } else if (field === "compareEnabled") {
    prefs.compareEnabled = !!value;
    if (prefs.compareEnabled) getPlayerAnalysisCompareIdx();
    else prefs.comparePlayerIdx = null;
  } else if (["showAttack", "showServe", "showSecond"].includes(field))
    prefs[field] = !!value;
  saveState();
  renderPlayerAnalysis();
}

export function publishReactPlayerAnalysis() {
  renderAnalysisTeamFilter();
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
  if (rosterLineupState.elPlayerAnalysisCourtSide)
    renderAnalysisCourtSideRadios(
      rosterLineupState.elPlayerAnalysisCourtSide,
      getAnalysisCourtSide(prefs.courtSideByScope[scope]),
      () => {
        prefs.courtSideByScope[getAnalysisTeamScope()] = getAnalysisCourtSide(
          getCheckedRadioValue(rosterLineupState.elPlayerAnalysisCourtSide),
        );
        saveState();
        renderPlayerAnalysis();
      },
      "analysis-player-court-side",
    );
  playerAnalysisStore.publish({
    ...snapshots,
    entries,
    compareEntries: entries.filter((entry) => entry.idx !== idx),
    preferences: { ...prefs },
    playerIdx: idx === null ? "" : String(idx),
    compareIdx: compareIdx === null ? "" : String(compareIdx),
    scope,
  });
  if (matchState.elPlayerAnalysisCompareFilter)
    matchState.elPlayerAnalysisCompareFilter.classList.toggle(
      "hidden",
      !prefs.compareEnabled || players.length < 2,
    );
  if (matchState.elPlayerAnalysisTableWrap)
    matchState.elPlayerAnalysisTableWrap.classList.toggle(
      "hidden",
      !!snapshots.compare,
    );
  document
    .querySelector(".player-analysis-columns")
    ?.classList.toggle("hidden", !!snapshots.compare);
  document
    .querySelector(".player-skill-charts-panel")
    ?.classList.toggle("hidden", !!snapshots.compare);
  updatePlayerAnalysisVisibility();
  if (snapshots.compare) return;
  renderPlayerAnalysisSkillCharts();
  if (prefs.showAttack) renderPlayerTrajectoryAnalysis();
  if (prefs.showServe) renderPlayerServeTrajectoryAnalysis();
  if (prefs.showSecond) renderPlayerSecondTable();
}

export function refreshReactCompareSections(index, other, nodes) {
  if (nodes.attackSummary)
    publishReactAttackSummary(
      nodes.attackSummary,
      getFilteredPlayerAttackSummaryEventsForPlayer(index),
      getFilteredPlayerAttackSummaryEventsForPlayer(other),
    );
  if (nodes.attackGrid) publishReactPlayerAttackGrid(nodes.attackGrid, index);
  if (nodes.serveGrid) publishReactPlayerServeGrid(nodes.serveGrid, index);
  if (nodes.secondBody)
    publishReactPlayerSecondTable(
      nodes.secondBody,
      nodes.distribution,
      index,
      nodes.attackBody,
      other,
    );
  if (nodes.charts) {
    skillAnalysisState.skillChartToneColorCache = null;
    const scope = getAnalysisTeamScope(),
      players = getPlayersForScope(scope),
      numbers = getPlayerNumbersForScope(scope),
      metricId = ensureSkillChartsUiState().playerMetric || "eff",
      label =
        scope === "opponent"
          ? formatNameWithNumberFor(players[index], numbers)
          : formatNameWithNumber(players[index]);
    analysisTableStore.publish(nodes.charts.id, {
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
