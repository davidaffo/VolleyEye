import test from 'node:test';
import assert from 'node:assert/strict';
import { session as match } from '../js/globals.js';
import { getPointDirection } from '../src/features/analysis/scores.js';

test('le regole memorizzate rispettano modifiche in posto, sostituzioni e cambi partita', () => {
  const previous = match.state;
  try {
    match.state = { pointRules: { attack: { for: ['#'], against: ['='] } } };
    const event = { skillId: 'attack', code: '+' };
    assert.equal(getPointDirection(event), null);
    match.state.pointRules.attack.for.push('+');
    assert.equal(getPointDirection(event), 'for');
    match.state.pointRules.attack = { for: [], against: ['+'] };
    assert.equal(getPointDirection(event), 'against');
    match.state = { pointRules: { attack: { for: ['+'], against: [] } } };
    assert.equal(getPointDirection(event), 'for');
  } finally {
    match.state = previous;
    delete getPointDirection.normalizedRules;
  }
});
