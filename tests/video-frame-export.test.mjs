import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const playback = readFileSync(new URL('../js/scout/video/playback.js', import.meta.url), 'utf8');
const events = readFileSync(new URL('../js/scout/video/video-events.js', import.meta.url), 'utf8');
const source = events.slice(events.indexOf('function getFileBasename'), events.indexOf('function buildFfmpegConcatCommand')) +
  playback.slice(playback.indexOf('async function saveCurrentVideoFrame'), playback.indexOf('function seekVideoToTime'));

function setup() {
  const alerts = [];
  const downloads = [];
  const draws = [];
  const blob = { type: 'image/jpeg' };
  const canvas = {
    getContext: () => ({ drawImage: (...args) => draws.push(args) }),
    toBlob: (callback, type, quality) => {
      assert.equal(type, 'image/jpeg');
      assert.equal(quality, 0.9);
      callback(blob);
    }
  };
  const context = vm.createContext({
    state: { video: { fileName: 'Partita.mp4' } },
    elAnalysisVideo: { readyState: 2, videoWidth: 1920, videoHeight: 1080, currentTime: 12.345, seeking: false, paused: true },
    document: { createElement: tag => { assert.equal(tag, 'canvas'); return canvas; } },
    alert: message => alerts.push(message),
    downloadBlob: (...args) => downloads.push(args)
  });
  vm.runInContext(source, context);
  return { context, alerts, downloads, draws, canvas, blob };
}

test('salva il fotogramma corrente in JPEG alla risoluzione originale con timestamp', async () => {
  const { context, downloads, alerts, draws, canvas, blob } = setup();
  await context.saveCurrentVideoFrame();
  assert.equal(canvas.width, 1920);
  assert.equal(canvas.height, 1080);
  assert.deepEqual(draws[0], [context.elAnalysisVideo, 0, 0, 1920, 1080]);
  assert.deepEqual(downloads, [[blob, 'Partita_fotogramma_12-345s.jpg']]);
  assert.equal(alerts.length, 0);
});

test('YouTube e fotogrammi non pronti non producono immagini', async () => {
  for (const mode of ['youtube', 'loading', 'seeking', 'empty']) {
    const { context, alerts, downloads, draws } = setup();
    if (mode === 'youtube') context.state.video.youtubeId = 'example';
    if (mode === 'loading') context.elAnalysisVideo.readyState = 1;
    if (mode === 'seeking') context.elAnalysisVideo.seeking = true;
    if (mode === 'empty') context.elAnalysisVideo.videoWidth = 0;
    await context.saveCurrentVideoFrame();
    assert.equal(alerts.length, 1, mode);
    assert.equal(downloads.length, 0, mode);
    assert.equal(draws.length, 0, mode);
  }
});

test('un errore di esportazione non scarica immagini vuote', async () => {
  const { context, alerts, downloads, canvas } = setup();
  canvas.toBlob = callback => callback(null);
  await context.saveCurrentVideoFrame();
  assert.equal(downloads.length, 0);
  assert.equal(alerts.length, 1);
});
