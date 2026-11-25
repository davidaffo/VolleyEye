import { getPlayersForScope } from './analysis-roster.js';

import { makePlayerNameKey } from './player-model.js';
import { getPointDirection, getEventPointValue } from './scores.js';
import { matchesSummarySetFilter } from './filter-model.js';

export function computePlayerRallies(events, scope) {
  const players = getPlayersForScope(scope);
  const counts = new Map(players.map(name => [makePlayerNameKey(name), 0]));
  for (const event of events || []) {
    if (!event || !getPointDirection(event) || !matchesSummarySetFilter(event)) continue;
    const court = event.courtPlayers?.[scope];
    if (!Array.isArray(court)) continue;
    for (const name of new Set(court.map(makePlayerNameKey))) {
      if (counts.has(name)) counts.set(name, counts.get(name) + getEventPointValue(event));
    }
  }
  return Object.fromEntries(players.map((name, idx) => [idx, counts.get(makePlayerNameKey(name))]));
}
