import { session as matchState } from '../../../js/globals.js';
import { inferPlayerRole, getHistoricalEventRole } from '../events/player-role.js';

export function getAnalysisPlayerRole(events, playerIdx) {
  return inferPlayerRole(events.filter(event => event?.playerIdx === playerIdx), event => {
    const source = event.analysisMatchKey ? matchState.state.savedMatches?.[event.analysisMatchKey]?.state : matchState.state;
    const scope = event.analysisOriginalTeam || event.team;
    return getHistoricalEventRole(event, (scope === 'opponent' ? source?.opponentLiberos : source?.liberos) || []);
  }).role;
}
