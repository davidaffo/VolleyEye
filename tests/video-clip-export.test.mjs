import { featureSource } from "./helpers/feature-source.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Input, ALL_FORMATS, BlobSource, EncodedPacketSink } from '../js/vendor/mediabunny-1.62.1.min.mjs';
import { exportVideoClips } from '../src/features/video/clip-export.js';

const fixture = new Blob([readFileSync(new URL('./fixtures/clip-source.mp4', import.meta.url))]);
const open = blob => new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
async function packets(track, first, boundary) {
  const result = [];
  for await (const packet of new EncodedPacketSink(track).packets(first, boundary)) result.push(packet);
  return result;
}

test('unisce GOP completi conservando byte, codec e ordine di decodifica, senza audio', async () => {
  const progress = [];
  const result = await exportVideoClips(fixture, [{ start: 0.7, end: 1.1 }, { start: 4.4, end: 5.1 }], (...args) => progress.push(args));
  assert.equal(result.extension, '.mp4');
  assert.equal(result.blob.type, 'video/mp4');
  assert.deepEqual(progress, [[1, 2], [2, 2]]);
  const original = open(fixture);
  const exported = open(result.blob);
  try {
    const track = await original.getPrimaryVideoTrack();
    const sink = new EncodedPacketSink(track);
    const expected = [];
    for (const start of [0, 4]) {
      const first = await sink.getKeyPacket(start);
      const boundary = await sink.getNextKeyPacket(first);
      expected.push(...await packets(track, first, boundary));
    }
    const outTrack = await exported.getPrimaryVideoTrack();
    assert.equal(await outTrack.getCodec(), await track.getCodec());
    assert.equal(await exported.getPrimaryAudioTrack(), null);
    const actual = await packets(outTrack);
    assert.equal(actual.length, expected.length);
    assert.ok(expected.some((packet, i) => i > 0 && packet.timestamp < expected[i - 1].timestamp), 'fixture includes B-frames');
    actual.forEach((packet, i) => {
      assert.deepEqual(packet.data, expected[i].data, `packet ${i}: unchanged compressed bytes`);
      assert.equal(packet.type, expected[i].type);
      assert.ok(Math.abs(packet.timestamp - (expected[i].timestamp - (i < 24 ? 0 : 2))) < 0.0001);
    });
    assert.ok(Math.abs(await outTrack.computeDuration() - 4) < 0.001);
  } finally {
    original.dispose();
    exported.dispose();
  }
});

test('gestisce fine file e limiti esatti dei fotogrammi chiave', async () => {
  for (const [segment, duration] of [[{ start: 2, end: 4 }, 2], [{ start: 6.8, end: 100 }, 2], [{ start: -3, end: 1 }, 2]]) {
    const result = await exportVideoClips(fixture, [segment]);
    const input = open(result.blob);
    try {
      assert.ok(Math.abs(await input.computeDuration() - duration) < 0.001);
      const track = await input.getPrimaryVideoTrack();
      assert.equal((await new EncodedPacketSink(track).getFirstPacket()).type, 'key');
    } finally { input.dispose(); }
  }
});

test('rifiuta intervalli vuoti o esterni al video e file non validi', async () => {
  for (const ranges of [[], [{ start: 20, end: 30 }], [{ start: 2, end: 1 }], [{ start: NaN, end: 4 }]]) {
    await assert.rejects(exportVideoClips(fixture, ranges), /fuori dalla durata/);
  }
  await assert.rejects(exportVideoClips(new Blob(['invalid']), [{ start: 0, end: 1 }]));
});

test('il pulsante richiede eventi e file locale, e permette di annullare il nome', async () => {
  const vm = await import('node:vm');
  const source = featureSource("src/features/video/export-model.js") + featureSource("src/features/video/clip-commands.js");
  for (const mode of ['empty', 'youtube', 'unloaded', 'cancel', 'busy']) {
    const alerts = [];
    let prompts = 0;
    const button = { disabled: mode === 'busy', textContent: 'Scarica taglio' };
    const context = vm.createContext({
      videoClipStore: { getSnapshot: () => ({ busy: button.disabled }), publish() {} },
      state: { video: { youtubeId: mode === 'youtube' ? 'abc' : '' } },
      videoLocalFile: mode === 'unloaded' ? null : { name: 'partita.mp4' },
      buildSelectedSegments: () => mode === 'empty' ? [] : [{ start: 0, end: 1 }],
      getActiveVideoFilterPresetName: () => 'Attacchi',
      alert: message => alerts.push(message),
      prompt: (message, suggested) => { prompts++; assert.equal(suggested, 'Attacchi'); return null; }
    });
    vm.runInContext(source, context);
    await context.downloadVideoFromSelection();
    assert.equal(alerts.length, ['empty', 'youtube', 'unloaded'].includes(mode) ? 1 : 0, mode);
    assert.equal(prompts, mode === 'cancel' ? 1 : 0, mode);
    assert.equal(button.textContent, 'Scarica taglio');
  }
});
