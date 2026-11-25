import test from 'node:test';
import assert from 'node:assert/strict';
import { session as match } from '../js/globals.js';
import { session as filters } from '../src/features/state/analysis-analysis-filters.js';
import { getAnalysisRoster } from '../src/features/analysis/analysis-roster.js';
import { getAnalysisEvents } from '../src/features/analysis/filter-model.js';
import { invalidateAnalysisCaches } from '../src/features/analysis/cache-model.js';
import { computeStatsByPlayerForEvents } from '../src/features/analysis/score-model.js';

for (const reversed of [false, true]) test(`multi-match roster includes current and extra players with their own event indices (reversed: ${reversed})`, () => {
  const previous = match.state, previousTeams = filters.analysisTeamFilterState;
  try {
    const extra = { match: { teamName: reversed ? 'Altro' : 'Squadra', opponent: reversed ? 'Squadra' : 'Altro' },
      players: reversed ? ['Avversaria'] : ['Nuova', 'Anna'],
      opponentPlayers: reversed ? ['Nuova', 'Anna'] : ['Avversaria'],
      playerNumbers: reversed ? {} : { Nuova: 12 }, opponentPlayerNumbers: reversed ? { Nuova: 12 } : {},
      events: [{ team: reversed ? 'opponent' : 'our', skillId: 'attack', playerIdx: 0, playerName: 'Nuova', code: '#', setterIdx: 1 },
        { team: reversed ? 'opponent' : 'our', skillId: 'attack', playerIdx: 1, playerName: 'Anna', code: '=' }] };
    match.state = { ...previous, players: ['Anna', 'Bea'], opponentPlayers: [], playerNumbers: {},
      selectedTeam: 'Squadra', useOpponentTeam: false, match: { teamName: 'Squadra' },
      events: [{ team: 'our', skillId: 'attack', playerIdx: 1, playerName: 'Bea', code: '+' }],
      savedMatches: { extra: { state: extra } }, uiAnalysisExtraMatchesByScope: { our: ['extra'], opponent: [] } };
    filters.analysisTeamFilterState = { teams: new Set(['our']) };
    invalidateAnalysisCaches();
    const before = structuredClone(match.state);
    const roster = getAnalysisRoster('our');
    assert.deepEqual(roster.players, ['Anna', 'Bea', 'Nuova']);
    assert.equal(roster.numbers.Nuova, 12);
    const events = getAnalysisEvents();
    assert.deepEqual(events.map(ev => [ev.playerName, ev.playerIdx, ev.team]), [['Bea', 1, 'our'], ['Nuova', 2, 'our'], ['Anna', 0, 'our']]);
    assert.equal(events[1].setterIdx, 0);
    const stats = computeStatsByPlayerForEvents(events, roster.players);
    assert.equal(stats[2].attack['#'], 1);
    assert.equal(stats[0].attack['='], 1);
    assert.equal(stats[1].attack['+'], 1);
    assert.deepEqual(match.state.players, before.players);
    assert.deepEqual(match.state.savedMatches, before.savedMatches);
    match.state.uiAnalysisExtraMatchesByScope.our = [];
    invalidateAnalysisCaches();
    assert.deepEqual(getAnalysisRoster('our').players, ['Anna', 'Bea']);
  } finally {
    match.state = previous;
    filters.analysisTeamFilterState = previousTeams;
    invalidateAnalysisCaches();
  }
});
