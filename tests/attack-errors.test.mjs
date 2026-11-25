import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttackErrorType, countAttackErrors } from '../src/domain/attack-errors.js';
import { matchesAdvancedFilters, matchesVideoFilters } from '../src/features/analysis/filter-model.js';
import { buildAdvancedFilterOptions } from '../src/features/analysis/filter-controls.js';
import { snapshotVideoFilters, applyVideoFilterSnapshot } from '../src/features/analysis/video-filter-model.js';
import { session as filters } from '../src/features/state/analysis-analysis-filters.js';

const trajectory = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const events = [
  { skillId: 'attack', code: '=', attackDirection: trajectory },
  { skillId: 'attack', code: '=', attackTrajectory: trajectory },
  { skillId: 'attack', code: '=' },
  { skillId: 'attack', code: '/', attackDirection: trajectory },
  { skillId: 'attack', code: '/', attackDirection: null },
  { skillId: 'attack', code: '#' },
  { skillId: 'serve', code: '=' },
];

test('attack errors classify trajectories, net errors and blocks independently of other skills', () => {
  assert.deepEqual(events.map(getAttackErrorType), ['fuori', 'fuori', 'rete', 'murato', 'murato', null, null]);
  assert.deepEqual(countAttackErrors(events), { fuori: 2, rete: 1, murato: 2 });
  assert.deepEqual(buildAdvancedFilterOptions(events).attackErrorOpts.map(option => option.value), ['fuori', 'rete', 'murato']);
});

test('error selection applies to analysis and video, and survives video presets', () => {
  const previous = filters.videoFilterState;
  try {
    filters.videoFilterState = { attackErrors: new Set(['rete']) };
    const snapshot = snapshotVideoFilters();
    applyVideoFilterSnapshot(snapshot);
    assert.deepEqual([...filters.videoFilterState.attackErrors], ['rete']);
    for (const event of events) {
      const expected = event === events[2];
      assert.equal(matchesAdvancedFilters(event, filters.videoFilterState), expected);
      assert.equal(matchesVideoFilters(event, filters.videoFilterState), expected);
    }
    applyVideoFilterSnapshot({});
    assert.equal(filters.videoFilterState.attackErrors.size, 0);
  } finally { filters.videoFilterState = previous; }
});
