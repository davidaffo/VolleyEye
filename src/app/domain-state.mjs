// Lazily create feature state after React mounts; browser resources stay out of module evaluation.
export function createDomainState(initializers, liveInitializers = {}) {
  const values = {};
  return new Proxy(values, {
    get(target, key) {
      if (!Object.hasOwn(target, key) && Object.hasOwn(liveInitializers, key)) return liveInitializers[key]();
      if (!Object.hasOwn(target, key) && Object.hasOwn(initializers, key)) target[key] = initializers[key]();
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; },
  });
}
