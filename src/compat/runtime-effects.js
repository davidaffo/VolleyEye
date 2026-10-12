// Scope browser effects to the application module rather than the document lifetime.
const runtimeEffectListeners = [];
const runtimeTimeouts = new Set();
const runtimeIntervals = new Set();
let runtimeDisposed = false;
function listenRuntime(target, type, listener, options) {
  if (runtimeDisposed) return;
  target.addEventListener(type, listener, options);
  const capture = typeof options === "boolean" ? options : !!options?.capture;
  if (
    !runtimeEffectListeners.some(
      ([existingTarget, existingType, existingListener, existingOptions]) =>
        existingTarget === target &&
        existingType === type &&
        existingListener === listener &&
        (typeof existingOptions === "boolean"
          ? existingOptions
          : !!existingOptions?.capture) === capture,
    )
  )
    runtimeEffectListeners.push([target, type, listener, options]);
}
function unlistenRuntime(target, type, listener, options) {
  target.removeEventListener(type, listener, options);
  const capture = typeof options === "boolean" ? options : !!options?.capture;
  for (let index = runtimeEffectListeners.length - 1; index >= 0; index--) {
    const [existingTarget, existingType, existingListener, existingOptions] =
      runtimeEffectListeners[index];
    if (
      existingTarget === target &&
      existingType === type &&
      existingListener === listener &&
      (typeof existingOptions === "boolean"
        ? existingOptions
        : !!existingOptions?.capture) === capture
    )
      runtimeEffectListeners.splice(index, 1);
  }
}
const setTimeout = (callback, delay, ...args) => {
  if (runtimeDisposed) return 0;
  const id = globalThis.setTimeout(() => {
    runtimeTimeouts.delete(id);
    if (!runtimeDisposed) callback(...args);
  }, delay);
  runtimeTimeouts.add(id);
  return id;
};
const clearTimeout = (id) => {
  runtimeTimeouts.delete(id);
  globalThis.clearTimeout(id);
};
const setInterval = (callback, delay, ...args) => {
  if (runtimeDisposed) return 0;
  const id = globalThis.setInterval(callback, delay, ...args);
  runtimeIntervals.add(id);
  return id;
};
const clearInterval = (id) => {
  runtimeIntervals.delete(id);
  globalThis.clearInterval(id);
};
export function stop() {
  if (runtimeDisposed) return;
  updateVideoPlaybackSnapshot(undefined, true);
  runtimeDisposed = true;
  runtimeEffectListeners
    .splice(0)
    .forEach(([target, type, listener, options]) =>
      target.removeEventListener(type, listener, options),
    );
  runtimeTimeouts.forEach(globalThis.clearTimeout);
  runtimeIntervals.forEach(globalThis.clearInterval);
  runtimeTimeouts.clear();
  runtimeIntervals.clear();
  scoutGridResizeObserver?.disconnect();
  [elAnalysisVideo, elAnalysisVideoScout].forEach((video) => video?.pause());
  [ytPlayer, ytPlayerScout].forEach((player) => player?.destroy?.());
  if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
}
