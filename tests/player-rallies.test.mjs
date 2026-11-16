import test from 'node:test';
import assert from 'node:assert/strict';
import { session } from '../js/globals.js';
import { session as filters } from '../src/features/state/analysis-analysis-filters.js';
import { computePlayerRallies } from '../src/features/analysis/player-rallies.js';

test('rally counts use recorded court presences and respect set filters', () => {
  const previous = session.state;
  const oldSets = filters.analysisSummaryFilterState.sets;
  try {
    session.state = { players: ['Anna', 'Bea', 'Lia'], liberos: ['Lia'], events: [] };
    filters.analysisSummaryFilterState.sets = new Set();
    const point = { set: 1, skillId: 'manual', pointDirection: 'for', team: 'our' };
    const events = [point, { ...point, courtPlayers: { our: ['Anna', 'Lia'] } },
      { ...point, set: 2, courtPlayers: { our: ['Bea', 'Lia'] } }];
    assert.deepEqual(computePlayerRallies(events, 'our'), { 0: 1, 1: 1, 2: 2 });
    filters.analysisSummaryFilterState.sets = new Set([2]);
    assert.deepEqual(computePlayerRallies(events, 'our'), { 0: 0, 1: 1, 2: 1 });
  } finally {
    session.state = previous;
    filters.analysisSummaryFilterState.sets = oldSets;
  }
});
