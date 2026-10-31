import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { session as match } from '../../js/globals.js';
import * as scores from '../../src/features/analysis/scores.js';

export const originalPath = new URL('../../resources/bug 1023/match_2026-10-17_RAINBOW_FSE_PROGETTI_FC_2026 (1).json', import.meta.url);
export const repairedPath = new URL('../../resources/bug 1023/match_2026-10-17_RAINBOW_FSE_PROGETTI_FC_2026_riparato.json', import.meta.url);
export const officialScores = [[25, 19], [18, 25], [23, 25], [28, 26], [10, 15]];

// Usa le stesse regole dell'app, comprese le azioni derivate che non danno punti.
export function scoringContext(state) {
  return Object.fromEntries(Object.entries(scores).filter(([, value]) => typeof value === 'function').map(([name, fn]) => [name, (...args) => {
    const previous = match.state;
    try { match.state = state; return fn(...args); }
    finally { match.state = previous; }
  }]));
}

export function repairBug1023(original) {
  const result = structuredClone(original);
  const state = result.state;
  assert.equal(state.events.length, 837, 'La procedura è specifica per il file originale di Luigi');
  assert.deepEqual(state.scoreOverrides, { 2: { for: -18, against: -25 }, 4: { for: -28, against: -26 } });
  const events = state.events;
  const byId = id => events.find(event => event.eventId === id);
  const set3 = byId(508);
  const set4 = byId(509);
  assert.equal(set3.actionType, 'set-change');
  assert.equal(set4.actionType, 'set-change');
  const set5 = structuredClone(set4);
  set5.eventId = Math.max(...events.map(event => event.eventId)) + 1;
  function moveBoundary(event, first, previous, next) {
    Object.assign(event, {
      set: next, prevSet: previous, nextSet: next,
      t: new Date(new Date(first.t).getTime() - 1).toISOString(),
      clockMs: first.clockMs, durationMs: 0, videoTime: first.videoTime,
      courtSideSwapped: first.courtSideSwapped,
      rotation: first.team === 'our' ? first.rotation : first.opponentSetterPosition,
      setterPosition: first.team === 'our' ? first.rotation : first.opponentSetterPosition,
      opponentSetterPosition: first.team === 'opponent' ? first.rotation : first.opponentSetterPosition,
      prevSetResults: null, nextSetResults: null, prevSetStarts: null, nextSetStarts: null,
      prevClock: null, nextClock: null, prevVideoClock: null, nextVideoClock: null,
      homeScore: 0, visitorScore: 0
    });
  }
  moveBoundary(set3, byId(328), 2, 3);
  moveBoundary(set5, byId(744), 4, 5);
  state.events = [];
  for (const event of events) {
    if (event === set3) continue;
    if (event.eventId === 328) state.events.push(set3);
    if (event.eventId === 744) state.events.push(set5);
    if (event.eventId >= 328 && event.eventId <= 507) event.set = 3;
    if (event.eventId >= 744 && event.eventId <= 837) event.set = 5;
    state.events.push(event);
  }
  state.currentSet = 5;
  state.scoreOverrides = {};
  state.setResults = { 1: 'our', 2: 'opponent', 3: 'opponent', 4: 'our', 5: 'opponent' };
  // La preparazione del set 3 era stata sovrascritta dal passaggio tardivo.
  // Formazioni I–VI dal referto; rotazioni dai primi eventi del set.
  const court = (numbers, players) => numbers.map(number => ({
    main: Object.keys(players).find(name => String(players[name]) === String(number)), replaced: ''
  }));
  state.setStarts[3] = {
    our: { court: court([20, 7, 19, 17, 4, 9], state.playerNumbers), rotation: 2 },
    opponent: { court: court([11, 16, 13, 2, 9, 10], state.opponentPlayerNumbers), rotation: 3 },
    swapCourt: byId(328).courtSideSwapped, isServing: true
  };
  // Mantiene l'orientamento effettivamente usato dallo scout per le traiettorie.
  state.setStarts[5].swapCourt = byId(744).courtSideSwapped;
  state.setStarts[5].isServing = false;
  const scoring = scoringContext(state);
  const running = Array.from({ length: 6 }, () => ({ for: 0, against: 0 }));
  for (const event of state.events) {
    const score = running[event.set];
    event.homeScore = score.for;
    event.visitorScore = score.against;
    const direction = scoring.getPointDirectionForScope(event, 'our');
    if (direction) score[direction] += scoring.getEventPointValue(event);
  }
  for (let set = 1; set <= 5; set++) {
    const summary = scoring.computePointsSummary(set);
    assert.deepEqual([summary.totalFor, summary.totalAgainst], officialScores[set - 1]);
  }
  assert.equal(new Set(state.events.map(event => event.eventId)).size, 838);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repaired = repairBug1023(JSON.parse(readFileSync(originalPath, 'utf8')));
  writeFileSync(repairedPath, JSON.stringify(repaired, null, 2) + '\n', { flag: 'w' });
  console.log(`Creato ${fileURLToPath(repairedPath)}; Cattolica–Rainbow: 25–19, 18–25, 23–25, 28–26, 10–15 (2–3).`);
}
