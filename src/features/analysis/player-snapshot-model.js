import { SKILL_COLUMNS } from "../../domain/analysis-columns.js";
import { normalizeSkillCounts, buildSkillEntries } from "./statistic-model.js";
import { statisticEntry } from "./table-cells.js";
import {
  getPlayerAnalysisPlayerIdx,
  getPlayerAnalysisCompareIdx,
  ensurePlayerAnalysisState,
} from "./player-model.js";
import {
  getAnalysisTeamScope,
  filterEventsByAnalysisTeam,
  matchesSummarySetFilter,
} from "./filter-model.js";
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
import {
  formatNameWithNumberFor,
  formatNameWithNumber,
} from "../teams/roster-data.js";
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
