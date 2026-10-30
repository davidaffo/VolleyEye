import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { session as match } from '../js/globals.js';
import { session as ui } from '../src/features/state/scout-ui.js';
import { session as effects } from '../src/app/browser-effects.js';
import { setSelectedSkillForScope, resetSetTypeState } from '../src/features/live/flow-model.js';
import { clearAttackSelection, resetSkillSelectionForPlayer, shouldPromptAttackSetType, getServeBaseZoneForPlayer, applyAttackTrajectoryToEvent } from '../src/features/scout/selection-state.js';
import { bindServeTypeInlineListener, setServeTypeFocusPlayer, clearServeTypeInlineListener } from '../src/features/scout/serve-keyboard.js';
import { resetMatchVideoState } from '../src/features/video/reset-model.js';
import { readSourceFixture } from './helpers/source-fixture.mjs';
import { readFileSync } from 'node:fs';

function isolated(action) {
  const previous = match.state, windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const fields = ['selectedSkillPerPlayer', 'serveMetaByPlayer', 'attackMetaByPlayer', 'blockConfirmByPlayer', 'serveTypeSelectHandlers',
    'attackInlinePlayer', 'blockInlinePlayer', 'serveTypeInlinePlayer', 'serveTypeFocusPlayer', 'serveTypeInlineHandler'];
  const saved = [[ui, fields], [effects, ['runtimeEffectListeners', 'runtimeDisposed']]]
    .map(([state, keys]) => [state, keys.map(key => [key, Object.getOwnPropertyDescriptor(state, key)])]);
  const dom = new JSDOM('');
  try {
    globalThis.window = dom.window;
    effects.runtimeEffectListeners = [];
    effects.runtimeDisposed = false;
    for (const key of fields) ui[key] = key.endsWith('ByPlayer') || key === 'selectedSkillPerPlayer' || key === 'serveTypeSelectHandlers' ? {} : null;
    match.state = { players: ['Ada'], opponentPlayers: ['Oda'], autoRolePositioning: false, isServing: true,
      court: Array.from({ length: 6 }, (_, i) => ({ main: i === 0 ? 'Ada' : '', replaced: '' })),
      opponentCourt: Array.from({ length: 6 }, (_, i) => ({ main: i === 4 ? 'Oda' : '', replaced: '' })) };
    action(dom.window);
  } finally {
    clearServeTypeInlineListener();
    match.state = previous;
    for (const [state, entries] of saved) for (const [key, descriptor] of entries) {
      delete state[key]; if (descriptor) Object.defineProperty(state, key, descriptor);
    }
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else delete globalThis.window;
    dom.window.close();
  }
}

test('selected skill state owns metadata and block cleanup without touching the other player', () => isolated(() => {
  ui.serveMetaByPlayer['our:0'] = { serveType: 'F' };
  ui.selectedSkillPerPlayer['opponent:0'] = 'serve';
  const selected = ui.selectedSkillPerPlayer;
  setSelectedSkillForScope('our', 0, 'block');
  assert.equal(ui.blockConfirmByPlayer['our:0'], false);
  assert.equal(ui.blockInlinePlayer, 'our:0');
  assert.equal(ui.serveMetaByPlayer['our:0'], undefined);
  setSelectedSkillForScope('our', 0, 'pass');
  assert.equal(ui.blockInlinePlayer, null);
  assert.equal(ui.blockConfirmByPlayer['our:0'], undefined);
  assert.equal(ui.selectedSkillPerPlayer['opponent:0'], 'serve');
  resetSetTypeState();
  assert.equal(ui.selectedSkillPerPlayer, selected);
  assert.deepEqual(selected, {});
}));

test('attack cleanup preserves other players until an explicit global cleanup', () => isolated(() => {
  ui.attackMetaByPlayer['our:0'] = {};
  ui.attackMetaByPlayer['opponent:0'] = {};
  ui.attackInlinePlayer = 'opponent:0';
  const metadata = ui.attackMetaByPlayer;
  clearAttackSelection(0, 'our');
  assert.equal(ui.attackInlinePlayer, 'opponent:0');
  assert.deepEqual(Object.keys(metadata), ['opponent:0']);
  clearAttackSelection();
  assert.equal(ui.attackMetaByPlayer, metadata);
  assert.deepEqual(metadata, {});
  assert.equal(ui.attackInlinePlayer, null);
}));

test('partial reset clears its skill data and the shared serve keyboard when it owns focus', () => isolated(() => {
  ui.selectedSkillPerPlayer = { 'our:0': 'attack', 'opponent:0': 'pass' };
  ui.serveMetaByPlayer = { 'our:0': {}, 'opponent:0': {} };
  ui.attackMetaByPlayer = { 'our:0': {}, 'opponent:0': {} };
  bindServeTypeInlineListener(0, () => {}, 'our');
  bindServeTypeInlineListener(0, () => {}, 'opponent');
  setServeTypeFocusPlayer(0, 'our');
  ui.serveTypeInlinePlayer = 'opponent:0';
  resetSkillSelectionForPlayer(0, 'our');
  assert.equal(ui.selectedSkillPerPlayer['our:0'], undefined);
  assert.equal(ui.selectedSkillPerPlayer['opponent:0'], 'pass');
  assert.deepEqual(Object.keys(ui.attackMetaByPlayer), ['opponent:0']);
  assert.deepEqual(Object.keys(ui.serveMetaByPlayer), ['opponent:0']);
  assert.equal(ui.serveTypeInlineHandler, null);
  assert.deepEqual(ui.serveTypeSelectHandlers, {});
  assert.equal(effects.runtimeEffectListeners.length, 0);
}));

test('serve keyboard registers one listener and routes active player before focused player', () => isolated(window => {
  const calls = [];
  bindServeTypeInlineListener(0, type => calls.push(['our', type]), 'our');
  bindServeTypeInlineListener(0, type => calls.push(['opponent', type]), 'opponent');
  assert.equal(effects.runtimeEffectListeners.length, 1);
  setServeTypeFocusPlayer(0, 'our');
  ui.serveTypeInlinePlayer = 'opponent:0';
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'j' }));
  ui.serveTypeInlinePlayer = null;
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'f' }));
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'x' }));
  assert.deepEqual(calls, [['opponent', 'JF'], ['our', 'F']]);
  clearServeTypeInlineListener();
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 's' }));
  assert.equal(calls.length, 2);
}));

test('serve zones and attack prompts remain separate for both teams', () => isolated(() => {
  match.state.setTypePromptEnabled = true;
  match.state.opponentSetTypePromptEnabled = false;
  assert.equal(shouldPromptAttackSetType('our'), true);
  assert.equal(shouldPromptAttackSetType('opponent'), false);
  assert.equal(getServeBaseZoneForPlayer(0, 'our'), 1);
  assert.equal(getServeBaseZoneForPlayer(0, 'opponent'), 5);
  assert.equal(getServeBaseZoneForPlayer('0', 'our'), null);
  assert.equal(getServeBaseZoneForPlayer(4, 'our'), null);
}));

test('attack trajectory metadata preserves fallback coordinates and an existing origin', () => {
  const event = { attackStart: { x: 1 }, attackStartZone: 2, originZone: 4, code: '#' };
  const payload = { start: null, startZone: 0, endZone: 5 };
  applyAttackTrajectoryToEvent(event, payload);
  assert.deepEqual(event.attackStart, { x: 1 });
  assert.equal(event.attackStartZone, 2);
  assert.equal(event.zone, 2);
  assert.equal(event.playerPosition, 2);
  assert.equal(event.originZone, 4);
  assert.equal(event.attackDirection, payload);
  assert.equal(event.attackTrajectory, payload);
  assert.equal(event.code, '#');
});

test('video reset replaces source, presets and clock instead of retaining the previous match data', () => {
  const previous = match.state;
  try {
    match.state = { video: { fileName: 'old', youtubeId: 'old', extra: true }, videoFilterPresets: ['old'], videoClock: { currentSeconds: 99 } };
    const oldVideo = match.state.video, before = Date.now();
    resetMatchVideoState();
    assert.notEqual(match.state.video, oldVideo);
    assert.deepEqual(match.state.video, { offsetSeconds: 0, fileName: '', youtubeId: '', youtubeUrl: '', lastPlaybackSeconds: 0 });
    assert.deepEqual(match.state.videoFilterPresets, []);
    assert.equal(match.state.videoClock.currentSeconds, 0);
    assert.equal(match.state.videoClock.paused, true);
    assert.ok(match.state.videoClock.startMs >= before && match.state.videoClock.startMs <= Date.now());
  } finally { match.state = previous; }
});

const playbackSource = readSourceFixture(new URL('../src/features/video/reset-commands.js', import.meta.url), 'utf8');
for (const includeScout of [false, true]) test(`video reset preserves resource order without waiting for cache deletion: scout ${includeScout}`, () => {
  const calls = [];
  const video = label => ({ pause: () => calls.push(label + ':pause'), set currentTime(value) { assert.equal(value, 0); calls.push(label + ':zero'); } });
  const frame = label => ({ set src(value) { assert.equal(value, ''); calls.push(label + ':src'); }, style: { set display(value) { assert.equal(value, 'none'); calls.push(label + ':hide'); } } });
  const context = vm.createContext({
    clearEventSelection: options => { assert.equal(options.clearContexts, true); calls.push('selection'); },
    clearCachedLocalVideo: () => { calls.push('cache'); return new Promise(() => {}); },
    ytPlayer: { stopVideo: () => calls.push('main:stop') }, ytPlayerScout: { stopVideo: () => calls.push('scout:stop') },
    elAnalysisVideo: video('main'), elAnalysisVideoScout: video('scout'), elYoutubeFrame: frame('main'), elYoutubeFrameScout: frame('scout'),
  });
  vm.runInContext(playbackSource, context);
  context.resetMatchVideoPlayback({ includeScout });
  assert.deepEqual(calls, ['selection', 'cache', 'main:stop', ...(includeScout ? ['scout:stop'] : []), 'main:pause', 'main:zero',
    ...(includeScout ? ['scout:pause', 'scout:zero'] : []), 'main:src', 'main:hide', ...(includeScout ? ['scout:src', 'scout:hide'] : [])]);
});

test('video reset accepts missing media resources', () => {
  const context = vm.createContext({ clearEventSelection: () => {}, clearCachedLocalVideo: () => {},
    ytPlayer: null, ytPlayerScout: null, elAnalysisVideo: null, elAnalysisVideoScout: null, elYoutubeFrame: null, elYoutubeFrameScout: null });
  vm.runInContext(playbackSource, context);
  assert.doesNotThrow(() => context.resetMatchVideoPlayback({ includeScout: true }));
});

test('scout preparation and selection commands do not import the recording dispatcher', () => {
  for (const file of ['skill-preparation', 'selection-commands', 'selection-state', 'serve-keyboard']) {
    const source = readFileSync(new URL(`../src/features/scout/${file}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from\s+["'][^"']*(?:skill-actions|event-recording)\.js["']/);
  }
});
