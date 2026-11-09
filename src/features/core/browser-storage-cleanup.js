import { STORAGE_KEY, MATCH_PREFIX, TEAM_PREFIX, OPPONENT_TEAM_PREFIX, PLAYER_PREFIX } from "../../../js/globals.js";
import { session as stateStoreState } from "../state/teams-core-state-store.js";
import { session as matchIoState } from "../state/io-match-io.js";
import { session as scoutUiState } from "../state/scout-ui.js";

export function clearVolleyEyeLocalStorage() {
  const ownedKeys = new Set([
    STORAGE_KEY,
    STORAGE_KEY + ":archive-migration-v1",
    PLAYER_PREFIX,
    stateStoreState.THEME_PREFERENCE_KEY,
    matchIoState.DEFAULT_DEMO_PREFERENCE_KEY,
    scoutUiState.APP_RESET_SIGNAL_KEY,
  ]);
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (ownedKeys.has(key) || [MATCH_PREFIX, TEAM_PREFIX, OPPONENT_TEAM_PREFIX].some(prefix => key.startsWith(prefix)))) {
      keys.push(key);
    }
  }
  keys.forEach(key => localStorage.removeItem(key));
}

export async function clearVolleyEyeAppAssets() {
  // Storage and registrations are shared by every app on this origin.
  // A different URL path is not a storage isolation boundary.
  try {
    if ("serviceWorker" in navigator) {
      const scope = new URL("./", window.location.href).href;
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter(reg => reg.scope === scope).map(reg => reg.unregister()));
    }
  } catch (_) {
    // Cache cleanup must still run if unregistering fails.
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith("volleyeye-cache-")).map(key => caches.delete(key)));
    }
  } catch (_) {
    // Asset cleanup is best effort, independently of data reset.
  }
}
