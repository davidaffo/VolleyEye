import { session as browserEffectsState } from './browser-effects.js';
import { actions } from './actions.mjs';
import { publishApplicationViews, observeDomainChanges } from './view-publication.js';
import { cloneIsolationData } from "../domain/snapshots.js";
import { buildCompactLocalStateSnapshot } from "../features/storage/state-snapshot.js";
import { session as matchState } from "../../js/globals.js";
import { session as applicationState } from "./lifecycle.js";
import { init } from "../features/core/bootstrap.js";



export function getMatchSnapshot() {
  return cloneIsolationData(buildCompactLocalStateSnapshot(matchState.state));
}

export function start() {
  observeDomainChanges();
  if (!applicationState.startup) {
    browserEffectsState.runtimeDisposed = false;
    const pendingStartup = init().then(() => {
      if (applicationState.startup !== pendingStartup || browserEffectsState.runtimeDisposed) return;
      applicationState.ready = true;
      publishApplicationViews();
    });
    applicationState.startup = pendingStartup;
  }
  return applicationState.startup;
}

export async function invoke(name, ...args) {
  await start();
  if (!Object.hasOwn(actions, name))
    throw new Error("Unknown command: " + name);
  return actions[name](...args);
}
