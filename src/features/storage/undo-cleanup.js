import { session as matchState } from "../../../js/globals.js";
import { clearScoutUndoStates } from "../events/history-model.js";
import { loadMatchesMapFromStorage, saveMatchToStorage } from "./match-repository.js";
import { saveState } from "./save-state.js";
import { cloneIsolationData } from "../../domain/snapshots.js";
import { session as persistentStorageState } from "../state/storage-persistent-storage.js";
import { ARCHIVE_OPTIMIZED_KEY } from "./archive-codec.js";

export async function optimizeArchiveSpace() {
  await persistentStorageState.archiveStorage.flush();
  const count = await clearAllMatchesUndoStates();
  const writes = new Map(persistentStorageState.archiveStorage.cache);
  writes.set(ARCHIVE_OPTIMIZED_KEY, "1");
  await persistentStorageState.archiveStorage.commit(writes);
  await persistentStorageState.archiveStorage.flush();
  return count;
}

export async function clearAllMatchesUndoStates() {
  const matches = { ...matchState.state.savedMatches, ...loadMatchesMapFromStorage() };
  let cleanedMatches = 0;
  const cleanedNames = new Set();
  for (const [name, original] of Object.entries(matches)) {
    const payload = cloneIsolationData(original);
    if (!clearScoutUndoStates(payload?.state?.events || [])) continue;
    const stored = await saveMatchToStorage(name, payload, { waitForCommit: true, throwOnError: true });
    if (!stored) throw new Error(`Impossibile salvare la partita "${name}".`);
    matchState.state.savedMatches = matchState.state.savedMatches || {};
    matchState.state.savedMatches[name] = payload;
    cleanedNames.add(name);
    cleanedMatches++;
  }
  const currentName = matchState.state.loadedMatchName || matchState.state.selectedMatch || "";
  if (clearScoutUndoStates(matchState.state.events || []) && !cleanedNames.has(currentName)) cleanedMatches++;
  saveState({ persistLocal: true });
  await persistentStorageState.archiveStorage.flush();
  return cleanedMatches;
}
