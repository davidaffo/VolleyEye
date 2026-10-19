




import { createDomainState } from "./domain-state.mjs";

export const session = createDomainState({
"runtimeEffectListeners": () => ([]),
"runtimeTimeouts": () => (new Set()),
"runtimeIntervals": () => (new Set()),
"runtimeDisposed": () => (false),
"setTimeout": () => ((callback, delay, ...args) => {
  if (browserEffectsState.runtimeDisposed) return 0;
  const id = globalThis.setTimeout(() => {
    browserEffectsState.runtimeTimeouts.delete(id);
    if (!browserEffectsState.runtimeDisposed) callback(...args);
  }, delay);
  browserEffectsState.runtimeTimeouts.add(id);
  return id;
}),
"clearTimeout": () => ((id) => {
  browserEffectsState.runtimeTimeouts.delete(id);
  globalThis.clearTimeout(id);
}),
"setInterval": () => ((callback, delay, ...args) => {
  if (browserEffectsState.runtimeDisposed) return 0;
  const id = globalThis.setInterval(callback, delay, ...args);
  browserEffectsState.runtimeIntervals.add(id);
  return id;
}),
"clearInterval": () => ((id) => {
  browserEffectsState.runtimeIntervals.delete(id);
  globalThis.clearInterval(id);
})
});
const browserEffectsState = session;

export function listenRuntime(target, type, listener, options) {
  if (browserEffectsState.runtimeDisposed) return;
  target.addEventListener(type, listener, options);
  const capture = typeof options === "boolean" ? options : !!options?.capture;
  if (
    !browserEffectsState.runtimeEffectListeners.some(
      ([existingTarget, existingType, existingListener, existingOptions]) =>
        existingTarget === target &&
        existingType === type &&
        existingListener === listener &&
        (typeof existingOptions === "boolean"
          ? existingOptions
          : !!existingOptions?.capture) === capture,
    )
  )
    browserEffectsState.runtimeEffectListeners.push([target, type, listener, options]);
}

export function unlistenRuntime(target, type, listener, options) {
  target.removeEventListener(type, listener, options);
  const capture = typeof options === "boolean" ? options : !!options?.capture;
  for (let index = browserEffectsState.runtimeEffectListeners.length - 1; index >= 0; index--) {
    const [existingTarget, existingType, existingListener, existingOptions] =
      browserEffectsState.runtimeEffectListeners[index];
    if (
      existingTarget === target &&
      existingType === type &&
      existingListener === listener &&
      (typeof existingOptions === "boolean"
        ? existingOptions
        : !!existingOptions?.capture) === capture
    )
      browserEffectsState.runtimeEffectListeners.splice(index, 1);
  }
}


