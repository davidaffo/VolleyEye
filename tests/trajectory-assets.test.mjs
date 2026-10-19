import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readSourceFixture } from './helpers/source-fixture.mjs';

function harness() {
  const images = [];
  class FakeImage {
    complete = false;
    src = '';
    constructor() { images.push(this); }
    load() { this.complete = true; this.onload?.({ target: this }); }
  }
  const context = vm.createContext({
    Image: FakeImage, trajectoryBgCache: {}, serveTrajectoryImgs: null,
    SERVE_START_IMG_NEAR: 'near-start', SERVE_END_IMG_NEAR: 'near-end',
    SERVE_START_IMG_FAR: 'far-start', SERVE_END_IMG_FAR: 'far-end',
    TRAJECTORY_IMG_NEAR: 'near-empty', TRAJECTORY_IMG_FAR: 'far-empty',
    resolveExportAssetPath: path => path,
    getTrajectoryImageForZone: (zone, far) => `${zone}-${far}`,
  });
  vm.runInContext(readSourceFixture('src/features/analysis/trajectory-canvas.js', 'utf8'), context);
  return { context, images };
}

test('trajectory backgrounds share pending loads and notify all distinct redraw callbacks once', () => {
  const { context, images } = harness();
  let first = 0, second = 0;
  const redraw = () => first++;
  const image = context.getTrajectoryBg(4, false, redraw);
  assert.equal(context.getTrajectoryBg(4, redraw), image);
  assert.equal(context.getTrajectoryBg(4, false, () => second++), image);
  assert.equal(images.length, 1);
  image.load();
  assert.equal(first, 1);
  assert.equal(second, 1);
  assert.equal(context.getTrajectoryBg(4, false, redraw), image);
  assert.equal(images.length, 1);
  assert.notEqual(context.getTrajectoryBg(4, true), image);
});

test('serve images and empty courts retain pending identities during repeated paints', () => {
  const { context, images } = harness();
  let redraws = 0;
  const redraw = () => redraws++;
  const initial = context.getServeTrajectoryImages(redraw);
  const first = initial.start;
  assert.equal(context.getServeTrajectoryImages(redraw), initial);
  assert.equal(initial.start, first);
  assert.equal(images.length, 4);
  const empty = context.getAttackEmptyImage(false, redraw);
  assert.equal(context.getAttackEmptyImage(false, redraw), empty);
  assert.equal(images.length, 5);
  images.forEach(image => image.load());
  assert.equal(redraws, 5);
  assert.equal(context.getServeTrajectoryImages(redraw), initial);
  assert.equal(context.getAttackEmptyImage(false, redraw), empty);
  assert.equal(images.length, 5);
});
