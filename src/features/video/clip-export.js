import {
  Input, ALL_FORMATS, BlobSource, EncodedPacketSink,
  Output, BufferTarget, Mp4OutputFormat, MkvOutputFormat, EncodedVideoPacketSource
} from '../../../js/vendor/mediabunny-1.62.1.min.mjs';

// Copy complete groups of pictures. Cutting within a GOP can discard reference
// frames that are needed by later B-frames, even when their timestamps are earlier.
export async function exportVideoClips(file, segments, onProgress = () => {}) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  let output;
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('Il file non contiene una traccia video.');
    const codec = await track.getCodec();
    const config = await track.getDecoderConfig();
    if (!codec || !config) throw new Error('Codec video non supportato per il taglio senza ricodifica.');
    const format = new Mp4OutputFormat();
    const useMp4 = format.getSupportedVideoCodecs().includes(codec);
    const selectedFormat = useMp4 ? format : new MkvOutputFormat();
    if (!selectedFormat.getSupportedVideoCodecs().includes(codec)) {
      throw new Error('Il codec originale non può essere salvato senza ricodifica.');
    }
    const sink = new EncodedPacketSink(track);
    const duration = await track.computeDuration();
    const ranges = segments.map(({ start, end }) => ({
      start: Math.max(0, start), end: Math.min(duration, end)
    })).filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start);
    if (!ranges.length) throw new Error('Gli eventi selezionati sono fuori dalla durata del video.');

    const target = new BufferTarget();
    output = new Output({ format: selectedFormat, target });
    const source = new EncodedVideoPacketSource(codec);
    output.addVideoTrack(source, { transformationMatrix: await track.getTransformationMatrix() });
    await output.start();
    let offset = 0;
    const options = { verifyKeyPackets: true };
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const first = await sink.getKeyPacket(range.start, options) || await sink.getFirstKeyPacket(options);
      if (!first || first.timestamp >= range.end) {
        throw new Error('Nessun fotogramma chiave disponibile per uno degli eventi selezionati.');
      }
      let boundary = await sink.getKeyPacket(range.end, options);
      if (boundary && boundary.timestamp < range.end - 0.000001) {
        boundary = await sink.getNextKeyPacket(boundary, options);
      }
      let segmentEnd = first.timestamp;
      let packetCount = 0;
      for await (const packet of sink.packets(first, boundary || undefined)) {
        await source.add(packet.clone({ timestamp: packet.timestamp - first.timestamp + offset }), {
          decoderConfig: config
        });
        segmentEnd = Math.max(segmentEnd, packet.timestamp + packet.duration);
        if (++packetCount % 200 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      offset += segmentEnd - first.timestamp;
      onProgress(i + 1, ranges.length);
      // Yield between clips so the browser can paint progress and handle input.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    source.close();
    await output.finalize();
    return {
      blob: new Blob([target.buffer], { type: useMp4 ? 'video/mp4' : 'video/x-matroska' }),
      extension: useMp4 ? '.mp4' : '.mkv'
    };
  } catch (error) {
    if (output && output.state !== 'finalized' && output.state !== 'canceled') {
      await output.cancel().catch(() => {});
    }
    throw error;
  } finally {
    input.dispose();
  }
}
