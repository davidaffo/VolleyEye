import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSourceFixture } from './helpers/source-fixture.mjs';

test('la posizione video invariata non provoca altri salvataggi, salvo richiesta esplicita', () => {
  let saves = 0;
  let now = 10000;
  const context = vm.createContext({
    state: { video: { lastPlaybackSeconds: 12 } },
    lastVideoSnapshotMs: 0,
    document: { body: { dataset: { activeTab: 'video' } } },
    elAnalysisVideo: { currentTime: 12 },
    saveState: () => saves++,
    Date: { now: () => now },
  });
  vm.runInContext(readSourceFixture('src/features/video/media-state.js', 'utf8'), context);
  context.updateVideoPlaybackSnapshot();
  assert.equal(saves, 0);
  now += 2000;
  context.elAnalysisVideo.currentTime = 13;
  context.updateVideoPlaybackSnapshot();
  assert.equal(saves, 1);
  assert.equal(context.state.video.lastPlaybackSeconds, 13);
  context.updateVideoPlaybackSnapshot(13, true);
  assert.equal(saves, 2);
});

test('dopo una skill lo scout aggiorna subito campo, log e statistiche', () => {
  const calls = [];
  const context = vm.createContext({
    saveState: () => calls.push('save'),
    renderPlayers: () => calls.push('court', 'score', 'stats', 'trajectory', 'serve', 'video'),
    scrollToActiveCourtOnMobileAlways: () => calls.push('scroll'),
    renderEventsLog: () => calls.push('log'),
    renderLiveScore: () => calls.push('score'),
    computePointsSummary: () => ({}),
    renderScoreAndRotations: () => calls.push('rotations'),
    renderAggregatedTable: () => calls.push('stats'),
    renderVideoAnalysis: () => calls.push('video'),
    renderTrajectoryAnalysis: () => calls.push('trajectory'),
    renderServeTrajectoryAnalysis: () => calls.push('serve'),
  });
  vm.runInContext(readSourceFixture('src/features/live/live-entry.js', 'utf8'), context);
  context.schedulePostEventUpdates();
  assert.deepEqual(calls, ['save', 'court', 'score', 'stats', 'trajectory', 'serve', 'video', 'scroll', 'log', 'rotations']);
});

test('il registro live sincronizza solo gli ultimi eventi mantenendo lo stesso tempo iniziale', () => {
  const events = Array.from({ length: 100 }, (_, i) => ({ eventId: i + 1, skillId: 'pass', code: '+', set: 1, t: new Date(1000 * (i + 1)).toISOString() }));
  const lengths = [];
  const published = [];
  const context = vm.createContext({
    state: { events }, elEventsLog: null, SKILLS: [{ id: 'pass', label: 'Ricezione' }],
    publishMatchNotes() {}, updateLiveDvwMirror() {}, publishRuntimeView() {}, publishReactLogServeTrajectories() {},
    getTeamScopeFromEvent: () => 'our', getPlayerNumbersForScope: () => ({}),
    getVideoSkillEvents: () => { lengths.push(events.length); return events.map(ev => ({ ev })); },
    getVideoBaseTimeMs: rows => rows.length ? new Date(rows[0].ev.t).getTime() : null,
    syncEventPlayerLinks: rows => lengths.push(rows.length),
    publishReactEventTable: (_id, rows, options) => published.push({ ids: rows.map(row => row.eventId), baseMs: options.baseMs }),
    eventLogSummaryStore: { publish() {} }, handleSeekForSelection() {},
  });
  vm.runInContext(readSourceFixture('src/features/events/log-view.js', 'utf8'), context);
  context.renderEventsLog({ suppressScroll: true });
  context.renderEventsLog({ suppressScroll: true, scoutLive: true });
  assert.deepEqual(lengths, [100, 40]);
  assert.deepEqual(published[0], published[1]);
});
