import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSourceFixture } from './helpers/source-fixture.mjs';
import { sourceFunctions } from './helpers/source-functions.mjs';
import { session as live } from '../src/features/state/live-live-score-and-set.js';
import { formatSetTypeLabelWithShortcut, getScoutAttackTypeOptions } from '../src/features/scout/skill-control-model.js';

const source = readSourceFixture(new URL('../src/features/live/scout-shortcuts.js', import.meta.url), 'utf8');
const functions = sourceFunctions(source, ['isTypingTarget', 'handleVideoShortcut', 'stepActiveVideoByFrame', 'seekPlaybackBy', 'toggleYoutubePlayback']);
function setup({ paused = true, duration = 10, time = 5, youtube = null, local = true } = {}) {
  const calls = [];
  const video = local ? { paused, duration, currentTime: time, play: () => { calls.push('play'); return Promise.resolve(); }, pause: () => calls.push('pause') } : null;
  const context = vm.createContext({ elSkillModal: null,
    getActiveVideoElement: () => video,
    getActiveYoutubeController: () => youtube ? { player: youtube, ready: true } : null,
    isYoutubePlayerPlaying: player => !!player.playing,
  });
  vm.runInContext(functions, context);
  const key = (key, extra = {}) => ({ key, target: { tagName: 'DIV' }, preventDefault: () => calls.push('prevent'), ...extra });
  return { context, video, calls, key };
}

test('local arrow and frame shortcuts share boundaries while preserving paused playback', () => {
  for (const frame of [false, true]) {
    const { context, video, calls, key } = setup({ time: 0 });
    if (frame) context.stepActiveVideoByFrame(-1);
    else context.handleVideoShortcut(key('ArrowLeft'));
    assert.equal(video.currentTime, 0);
    video.currentTime = 10;
    if (frame) context.stepActiveVideoByFrame(1);
    else context.handleVideoShortcut(key('ArrowRight'));
    assert.equal(video.currentTime, 10);
    assert.equal(calls.includes('play'), false);
  }
});

test('shift arrows and frame commands use the same frame interval and resume a playing local video', () => {
  for (const frame of [false, true]) {
    const { context, video, calls, key } = setup({ paused: false, duration: NaN });
    if (frame) context.stepActiveVideoByFrame(1);
    else context.handleVideoShortcut(key('ArrowRight', { shiftKey: true }));
    assert.equal(video.currentTime, 5 + 1 / 30);
    assert.equal(calls.filter(call => call === 'play').length, 1);
  }
});

test('keyboard seeks retain the duration captured before preventing the gesture', () => {
  const { context, video, key } = setup({ time: 9, duration: 10 });
  context.handleVideoShortcut(key('ArrowRight', { preventDefault: () => { video.duration = 20; } }));
  assert.equal(video.currentTime, 10);
  video.duration = -1;
  context.stepActiveVideoByFrame(1);
  assert.equal(video.currentTime, 0);
});

test('YouTube takes priority over local video and resumes only when already playing', () => {
  for (const playing of [false, true]) for (const frame of [false, true]) {
    const calls = [];
    const youtube = { playing, getCurrentTime: () => 5, seekTo: (...args) => calls.push(['seek', ...args]), playVideo: () => calls.push(['play']) };
    const { context, video, key } = setup({ youtube });
    if (frame) context.stepActiveVideoByFrame(1);
    else context.handleVideoShortcut(key('ArrowRight'));
    assert.deepEqual(calls, [['seek', 5 + (frame ? 1 / 30 : 3), true], ...(playing ? [['play']] : [])]);
    assert.equal(video.currentTime, 5);
  }
});

test('invalid YouTube times stop seeking and frame commands avoid reading the unused local duration', () => {
  const youtube = { playing: true, getCurrentTime: () => NaN, seekTo: () => assert.fail('invalid seek'), playVideo: () => assert.fail('unexpected resume') };
  const { context, video, key } = setup({ youtube });
  context.handleVideoShortcut(key('ArrowLeft'));
  Object.defineProperty(video, 'duration', { get: () => assert.fail('unused local duration') });
  context.stepActiveVideoByFrame(-1);
});

test('typing, modified and handled gestures stay ignored and a zero frame command does nothing', () => {
  const { context, video, calls, key } = setup();
  for (const extra of [{ defaultPrevented: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { target: { tagName: 'INPUT' } }, { target: { isContentEditable: true, tagName: 'DIV' } }]) {
    context.handleVideoShortcut(key('ArrowRight', extra));
  }
  context.stepActiveVideoByFrame(0);
  assert.equal(video.currentTime, 5);
  assert.deepEqual(calls, []);
});

test('attack options and labels share normalization, shortcuts and independent presentation data', () => {
  const options = live.DEFAULT_SET_TYPE_OPTIONS, shortcuts = live.SET_TYPE_SHORTCUTS;
  try {
    live.DEFAULT_SET_TYPE_OPTIONS = [{ value: ' High ', label: 'Alta' }, { value: 'unknown', label: '' }];
    live.SET_TYPE_SHORTCUTS = { high: 'H', damp: 'D' };
    assert.equal(formatSetTypeLabelWithShortcut({ set_type: ' High ' }, ''), 'High (H)');
    assert.equal(formatSetTypeLabelWithShortcut(null, ''), '');
    const first = getScoutAttackTypeOptions(false);
    assert.deepEqual(first, [{ value: ' High ', label: 'Alta (H)' }, { value: 'unknown', label: 'Unknown' }]);
    first[0].label = 'Changed';
    assert.equal(getScoutAttackTypeOptions(false)[0].label, 'Alta (H)');
    assert.deepEqual(getScoutAttackTypeOptions(true), [{ value: 'Damp', label: 'Damp (D)' }]);
  } finally { live.DEFAULT_SET_TYPE_OPTIONS = options; live.SET_TYPE_SHORTCUTS = shortcuts; }
});
