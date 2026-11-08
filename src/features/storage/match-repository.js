import { MATCH_PREFIX, session as matchState, logError } from "../../../js/globals.js";
import { session as persistentStorageState } from "../state/storage-persistent-storage.js";
import { cloneIsolationData } from "../../domain/snapshots.js";

import { decodeMatchStoragePayload } from "./match-codec.js";
export { encodeMatchStoragePayload, decodeMatchStoragePayload } from "./match-codec.js";

export function getMatchStorageKey(name) {
  return MATCH_PREFIX + name;
}

export function listMatchesFromStorage() {
  return persistentStorageState.archiveStorage.keys()
    .filter(k => k.startsWith(MATCH_PREFIX))
    .map(k => k.replace(MATCH_PREFIX, ""));
}

export function loadMatchFromStorage(name) {
  if (!name) return null;
  try {
    const raw = persistentStorageState.archiveStorage.getItem(getMatchStorageKey(name));
    if (!raw) return null;
    return decodeMatchStoragePayload(raw);
  } catch (e) {
    logError("Error loading match " + name, e);
    return null;
  }
}

export function saveMatchToStorage(name, data, options = {}) {
  if (!name) return;
  try {
    if (typeof window !== "undefined") {
      const resetCooldownActive =
        Number.isFinite(window.__recentAppResetAt) &&
        Date.now() - window.__recentAppResetAt < 5000;
      if (window.__appResetInProgress || resetCooldownActive) {
        window.__resetWriteLog = window.__resetWriteLog || [];
        window.__resetWriteLog.push({
          kind: "saveMatchToStorage-blocked",
          at: new Date().toISOString(),
          name,
          selectedMatch: matchState.state && matchState.state.selectedMatch,
          loadedMatchName: matchState.state && matchState.state.loadedMatchName,
          stack: new Error().stack
        });
        return false;
      }
    }
    if (typeof window !== "undefined" && window.__debugMatchWrites) {
      console.group("[saveMatchToStorage]", name);
      console.log("payload.name", data && data.name);
      console.log("payload.exportedAt", data && data.exportedAt);
      console.log("selectedMatch", matchState.state && matchState.state.selectedMatch);
      console.log("loadedMatchName", matchState.state && matchState.state.loadedMatchName);
      console.trace();
      console.groupEnd();
    }
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("debug_matches") === "1") {
          console.groupCollapsed("[match-save]", name);
          console.log("storageKey", getMatchStorageKey(name));
          console.log("payload", data);
          console.trace();
          console.groupEnd();
        }
      } catch (_) {
        // ignore debug tracing failures
      }
    }
    const committed = persistentStorageState.archiveStorage.setItem(getMatchStorageKey(name), JSON.stringify(data));
    return options.waitForCommit ? committed.then(() => true) : true;
  } catch (e) {
    const isQuota =
      e &&
      (e.name === "QuotaExceededError" ||
        e.code === 22 ||
        e.code === 1014);
    if (options.throwOnError) {
      if (isQuota) throw new Error("Spazio di archiviazione del browser esaurito. Esporta un backup e rimuovi dall’archivio le partite non necessarie prima di riprovare.");
      throw e;
    }
    if (!isQuota) {
      logError("Error saving match " + name, e);
    }
    return false;
  }
}

export function deleteMatchFromStorage(name) {
  if (!name) return;
  try {
    persistentStorageState.archiveStorage.removeItem(getMatchStorageKey(name));
  } catch (e) {
    logError("Error deleting match " + name, e);
  }
}

export function loadMatchesMapFromStorage() {
  const map = {};
  listMatchesFromStorage().forEach(name => {
    const data = loadMatchFromStorage(name);
    if (!data) return;
    map[name] = data;
  });
  return map;
}

export function syncMatchesFromStorage() {
  const storedMatches = loadMatchesMapFromStorage();
  // Mantieni i match presenti nello snapshot quando lo storage dedicato non è
  // ancora disponibile (ad esempio al primo avvio dopo il caricamento demo).
  matchState.state.savedMatches =
    Object.keys(storedMatches).length > 0
      ? storedMatches
      : matchState.state.savedMatches && typeof matchState.state.savedMatches === "object"
        ? cloneIsolationData(matchState.state.savedMatches)
        : {};
  const names = Object.keys(matchState.state.savedMatches || {});
  if (matchState.state.selectedMatch && !names.includes(matchState.state.selectedMatch)) {
    matchState.state.selectedMatch = "";
  }
  if (matchState.state.loadedMatchName && !names.includes(matchState.state.loadedMatchName)) {
    matchState.state.loadedMatchName = "";
  }
}

export function getSelectedArchivedMatch() {

return matchState.state.selectedMatch || "";
}

export function hasUsableMatch() {
  const names = Object.keys(matchState.state.savedMatches || {});
  if (names.length === 0) return false;
  const selected = (matchState.state.selectedMatch || "").trim();
  return !!selected && names.includes(selected);
}

export function hasMatchDataForReset() {
  return Array.isArray(matchState.state.events) && matchState.state.events.length > 0;
}
