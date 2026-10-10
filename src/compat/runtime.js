let runtimePromise;
let activeRuntime;

// Import only after React has committed the elements queried by the compatibility engine.
export function startRuntime() {
  runtimePromise ??= import("virtual:volleyeye-runtime").then(
    async (runtime) => {
      await runtime.start();
      activeRuntime = runtime;
      return runtime;
    },
  );
  return runtimePromise;
}

export async function invokeRuntime(command, ...args) {
  const runtime = await startRuntime();
  return runtime.invoke(command, ...args);
}

// Drag and touch commands must run during native dispatch to retain DataTransfer
// and cancellation of browser scrolling. These commands require an initialized app.
export function invokeRuntimeEvent(command, ...args) {
  if (!activeRuntime) return;
  return activeRuntime.invokeEvent(command, ...args);
}
