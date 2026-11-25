import { session as matchState } from '../../../js/globals.js';
import { inferPlayerRole, getHistoricalEventRole, inferRoleFromSetStarts } from '../events/player-role.js';
import { getAnalysisRoster } from './analysis-roster.js';
import { session as analysisFiltersState } from '../state/analysis-analysis-filters.js';

function sourceForEvent(event) {
  const source = event.analysisMatchKey ? matchState.state.savedMatches?.[event.analysisMatchKey]?.state : matchState.state;
  const scope = event.analysisOriginalTeam || event.team || 'our';
  const liberos = (scope === 'opponent' ? source?.opponentLiberos : source?.liberos) || [];
  return { source, scope, liberos };
}

export function getAnalysisPlayerRole(events, playerIdx, scope = 'our') {
  const playerEvents = events.filter(event => event?.playerIdx === playerIdx);
  const evidence = inferPlayerRole(playerEvents, event => {
    const { liberos } = sourceForEvent(event);
    return getHistoricalEventRole(event, liberos);
  });
  // A tie between observed roles is meaningful; do not replace it with a guess.
  if (evidence.role || Object.keys(evidence.counts).length) return evidence.role;

  const inferred = inferPlayerRole(playerEvents, event => {
    const { source, scope: sourceScope, liberos } = sourceForEvent(event);
    return inferRoleFromSetStarts(event.analysisOriginalPlayerName || event.playerName, sourceScope, event.set, source?.setStarts, liberos);
  });
  if (inferred.role || Object.keys(inferred.counts).length) return inferred.role;

  // A player without usable actions can still be present in the starting lineup.
  const roster = getAnalysisRoster(scope);
  const candidates = new Set();
  const addCandidate = (name, sourceScope, source) => {
    const liberos = (sourceScope === 'opponent' ? source?.opponentLiberos : source?.liberos) || [];
    const selectedSets = analysisFiltersState.analysisSummaryFilterState?.sets;
    const starts = source?.setStarts || {};
    const relevantStarts = selectedSets?.size
      ? Object.fromEntries(Object.entries(starts).filter(([set]) => selectedSets.has(Number(set))))
      : starts;
    const role = inferRoleFromSetStarts(name, sourceScope, null, relevantStarts, liberos);
    if (role) candidates.add(role);
  };
  const currentPlayers = scope === 'opponent' ? matchState.state.opponentPlayers : matchState.state.players;
  if (playerIdx < (currentPlayers || []).length) addCandidate(currentPlayers[playerIdx], scope, matchState.state);
  for (const [name, mapping] of roster.sources) {
    const source = matchState.state.savedMatches?.[name]?.state;
    const sourcePlayers = mapping.sourceScope === 'opponent' ? source?.opponentPlayers : source?.players;
    mapping.mapping.forEach((index, originalIndex) => {
      if (index === playerIdx) addCandidate(sourcePlayers?.[originalIndex], mapping.sourceScope, source);
    });
  }
  return candidates.size === 1 ? [...candidates][0] : null;
}
