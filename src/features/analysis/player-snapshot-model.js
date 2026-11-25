import { getPlayerNumbersForScope, getPlayersForScope } from './analysis-roster.js';
import { computePlayerRallies } from "./player-rallies.js";
import { getAnalysisEvents } from "./filter-model.js";
import { SKILL_COLUMNS } from "../../domain/analysis-columns.js";
import { normalizeSkillCounts, buildSkillEntries } from "./statistic-model.js";
import { statisticEntry } from "./table-cells.js";
import { getAnalysisPlayerRole } from "./player-role-model.js";
import {
  getPlayerAnalysisPlayerIdx,
  getPlayerAnalysisCompareIdx,
  ensurePlayerAnalysisState,
} from "./player-model.js";
import {
  getAnalysisTeamScope,
  matchesSummarySetFilter,
} from "./filter-model.js";
import { getTeamScopeFromEvent, getTeamNameForScope } from '../teams/selectors.js';
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
  const prefs = ensurePlayerAnalysisState();
  if (idx === null || !players || !players[idx]) {
    return { primary: null, compare: null };
  }
  const buildPlayerSnapshot = (playerIdx, scope) => {
    const players = getPlayersForScope(scope), numbers = getPlayerNumbersForScope(scope);
    const filteredEvents = getAnalysisEvents().filter(ev => getTeamScopeFromEvent(ev) === scope && matchesSummarySetFilter(ev));
    const statsByPlayer = computeStatsByPlayerForEvents(filteredEvents, players);
    const playerRallies = computePlayerRallies(getAnalysisEvents(), scope);
    const playerPoints = computePlayerPointsMap(filteredEvents, scope);
    const playerErrors = computePlayerErrorsMap(filteredEvents);
    const playerPassAces = computePlayerPassAceMap(filteredEvents, scope);
    const name = players[playerIdx];
    const role = getAnalysisPlayerRole(filteredEvents, playerIdx, scope);
    const countsBySkill = normalizeSkillCounts(statsByPlayer[playerIdx]);
    const points = playerPoints[playerIdx] || { for: 0, against: 0 };
    const personalErrors = playerErrors[playerIdx] || 0;
    const passAces = playerPassAces[playerIdx] || 0;
    return {
      playerIdx,
      role,
      scope,
      teamName: getTeamNameForScope(scope),
      photo: getPlayerPhotoForScope(scope, name),
      name:
        scope === "opponent"
          ? formatNameWithNumberFor(name, numbers)
          : formatNameWithNumber(name),
      metrics: [
        {
          title: "Punti",
          entries: [
            statisticEntry("Azioni", playerRallies[playerIdx] ?? "–"),
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
    primary: buildPlayerSnapshot(idx, analysisScope),
    compare:
      prefs.compareEnabled && compareIdx !== null && getPlayersForScope(prefs.comparePlayerScope)[compareIdx]
        ? buildPlayerSnapshot(compareIdx, prefs.comparePlayerScope)
        : null,
  };
}
