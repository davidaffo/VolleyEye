import { session as matchState } from '../../../js/globals.js';
import { getPlayersForScope as getMatchPlayers, getPlayerNumbersForScope as getMatchNumbers, getSelectedTeamNameForScope } from '../teams/selectors.js';
import { normalizePlayerKey, getRosterIdMapsForScope } from '../teams/player-identity.js';
import { sortNamesByNumber } from '../teams/roster-data.js';
import { extractRosterFromTeam } from '../teams/storage/team-repository.js';

// Analysis indices extend the current roster; the match roster itself is never changed.
export function getAnalysisRoster(scope) {
  const players = [...getMatchPlayers(scope)];
  const numbers = { ...getMatchNumbers(scope) };
  const currentIds = getRosterIdMapsForScope(scope)?.nameToId || new Map();
  const ids = new Map(players.map((name, idx) => [currentIds.get(normalizePlayerKey(name)), idx]).filter(([id]) => id));
  const names = new Map(players.map((name, idx) => [normalizePlayerKey(name), idx]));
  const sources = new Map();
  const team = normalizePlayerKey(getSelectedTeamNameForScope(scope));
  const selections = matchState.state.uiAnalysisExtraMatchesByScope?.[scope] || [];
  for (const key of selections) {
    const state = matchState.state.savedMatches?.[key]?.state;
    if (!state || !team) continue;
    const ourTeam = normalizePlayerKey(state.match?.teamName || state.selectedTeam);
    const oppTeam = normalizePlayerKey(state.match?.opponent || state.selectedOpponentTeam);
    const sourceScope = ourTeam === team ? 'our' : oppTeam === team ? 'opponent' : null;
    if (!sourceScope) continue;
    const roster = (sourceScope === 'our' ? state.players : state.opponentPlayers) || [];
    const sourceNumbers = (sourceScope === 'our' ? state.playerNumbers : state.opponentPlayerNumbers) || {};
    const sourceTeamName = sourceScope === 'our' ? state.selectedTeam : state.selectedOpponentTeam;
    const teamData = (sourceScope === 'our' ? state.savedTeams : state.savedOpponentTeams || state.savedTeams)?.[sourceTeamName];
    const detailed = teamData ? extractRosterFromTeam(teamData).playersDetailed || [] : [];
    const sourceIds = new Map(detailed.filter(player => player?.name && (player.id || player.playerId)).map(player => [normalizePlayerKey(player.name), player.id || player.playerId]));
    const mapping = roster.map(name => {
      const keyName = normalizePlayerKey(name);
      if (!keyName) return null;
      const id = sourceIds.get(keyName);
      let idx = (id && ids.get(id)) ?? names.get(keyName);
      if (idx === undefined) {
        idx = players.length;
        players.push(name);
        names.set(keyName, idx);
        if (sourceNumbers[name] != null) numbers[name] = sourceNumbers[name];
      }
      if (id) ids.set(id, idx);
      names.set(keyName, idx);
      return idx;
    });
    sources.set(key, { sourceScope, mapping });
  }
  return { players, numbers, sources, ids, names };
}
export const getPlayersForScope = scope => getAnalysisRoster(scope).players;
export const getPlayerNumbersForScope = scope => getAnalysisRoster(scope).numbers;
export function getSortedPlayerEntriesForScope(scope) {
  const { players, numbers } = getAnalysisRoster(scope);
  const indices = new Map(players.map((name, idx) => [name, idx]));
  return sortNamesByNumber(players, numbers).map(name => ({ name, idx: indices.get(name) }));
}
export const getSortedPlayerEntries = () => getSortedPlayerEntriesForScope('our');
