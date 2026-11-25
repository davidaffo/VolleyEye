import test from 'node:test';
import assert from 'node:assert/strict';
import { session as match } from '../js/globals.js';
import { getAnalysisPlayerRole } from '../src/features/analysis/player-role-model.js';
import { session as filters } from '../src/features/state/analysis-analysis-filters.js';

const court = names => names.map(main => ({ main }));
test('legacy analysis uses match starting lineups for players with no saved action role', () => {
  const previous = match.state;
  try {
    match.state = { ...previous, players: ['Anna', 'Bea', 'Cora'], opponentPlayers: ['Alba'],
      playerNumbers: {}, opponentPlayerNumbers: {}, selectedTeam: '', selectedOpponentTeam: '',
      uiAnalysisExtraMatchesByScope: { our: [], opponent: [] }, savedMatches: {}, liberos: [], opponentLiberos: [],
      setStarts: { 1: { our: { court: court(['Anna', 'Bea', 'Cora', 'Dina', 'Eva', 'Fede']), rotation: 1 },
        opponent: { court: court(['Alba', 'B', 'C', 'D', 'E', 'F']), rotation: 1 } } },
    };
    const legacy = [{ skillId: 'attack', team: 'our', playerIdx: 1, playerName: 'Bea', set: 1 }];
    assert.equal(getAnalysisPlayerRole(legacy, 1, 'our'), 'S');
    assert.equal(getAnalysisPlayerRole(legacy, 2, 'our'), 'C');
    assert.equal(getAnalysisPlayerRole([], 0, 'our'), 'P');
    assert.equal(getAnalysisPlayerRole([], 0, 'opponent'), 'P');
    assert.equal(getAnalysisPlayerRole([{ ...legacy[0], playerRole: 'O' }], 1, 'our'), 'O');
    assert.equal(getAnalysisPlayerRole([{ ...legacy[0], playerRole: 'O' }, { ...legacy[0], playerRole: 'P' }], 1, 'our'), null);
  } finally { match.state = previous; }
});

test('additional matches use their own starting lineup and original team and player identity', () => {
  const previous = match.state;
  try {
    const extra = { selectedOpponentTeam: 'Casa', match: { teamName: 'Ospite', opponent: 'Casa' },
      players: [], opponentPlayers: ['Bea'], opponentLiberos: [],
      setStarts: { 2: { opponent: { court: court(['X', 'Bea', 'C', 'D', 'E', 'F']), rotation: 1 } } } };
    match.state = { ...previous, players: ['Anna'], opponentPlayers: [], playerNumbers: {}, opponentPlayerNumbers: {},
      selectedTeam: 'Casa', match: { teamName: 'Casa' }, useOpponentTeam: false,
      uiAnalysisExtraMatchesByScope: { our: ['extra'], opponent: [] }, savedMatches: { extra: { state: extra } },
      setStarts: {}, liberos: [], opponentLiberos: [] };
    const legacy = [{ skillId: 'attack', team: 'our', playerIdx: 1, playerName: 'Bea', analysisOriginalPlayerName: 'Bea', analysisOriginalTeam: 'opponent', analysisMatchKey: 'extra', set: 2 }];
    assert.equal(getAnalysisPlayerRole(legacy, 1, 'our'), 'S');
    assert.equal(getAnalysisPlayerRole([], 1, 'our'), 'S');
    assert.equal(getAnalysisPlayerRole([], 0, 'our'), null);
  } finally { match.state = previous; }
});

test('formation fallback respects selected sets when the player has no actions', () => {
  const previous = match.state, previousFilter = filters.analysisSummaryFilterState;
  try {
    match.state = { ...previous, players: ['Anna'], opponentPlayers: [], selectedTeam: '', savedMatches: {}, liberos: [],
      uiAnalysisExtraMatchesByScope: { our: [], opponent: [] },
      setStarts: {
        1: { our: { court: court(['Anna', 'B', 'C', 'D', 'E', 'F']), rotation: 1 } },
        2: { our: { court: court(['A', 'Anna', 'C', 'D', 'E', 'F']), rotation: 1 } },
      } };
    filters.analysisSummaryFilterState = { sets: new Set([2]) };
    assert.equal(getAnalysisPlayerRole([], 0, 'our'), 'S');
    filters.analysisSummaryFilterState = { sets: new Set() };
    assert.equal(getAnalysisPlayerRole([], 0, 'our'), null);
  } finally { match.state = previous; filters.analysisSummaryFilterState = previousFilter; }
});
