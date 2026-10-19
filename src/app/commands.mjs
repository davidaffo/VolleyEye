// Run immediately: file pickers and clipboard need the original user gesture.
export function createCommands(handlers, publish) {
  return Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [
    name,
    (...args) => {
      try { return Promise.resolve(handler(...args)).finally(publish); }
      catch (error) { publish(); return Promise.reject(error); }
    },
  ]));
}

export function createReadyEvents(handlers, isReady) {
  return Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [
    name, (...args) => isReady() ? handler(...args) : undefined,
  ]));
}
