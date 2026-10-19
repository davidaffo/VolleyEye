import { session as matchState, STORAGE_KEY, logError } from '../../../js/globals.js';
import { session as rosterLineupState } from '../state/roster-lineup.js';
import { publishRuntimeView } from '../core/runtime-view.js';
import { syncTeamsFromStorage, syncOpponentTeamsFromStorage } from '../teams/storage/team-repository.js';
import { syncMatchesFromStorage } from './match-repository.js';
import { buildCompactLocalStateSnapshot } from './state-snapshot.js';
import { buildLocalUiSnapshot } from './ui-preferences.js';
import { writeStateToIndexedDb } from './state-db.js';
import { persistCurrentMatch } from './match-persistence.js';

export function saveState(options = {}) {
  publishRuntimeView();
  if (typeof window !== "undefined" && window.__EXPORT_ANALYSIS_HTML__) return;
  const { persistLocal = false, skipMatchPersist = false } = options || {};
  try {
    if (typeof window !== "undefined") {
      const resetCooldownActive =
        Number.isFinite(window.__recentAppResetAt) &&
        Date.now() - window.__recentAppResetAt < 5000;
      if (window.__appResetInProgress || resetCooldownActive) {
        if (resetCooldownActive) {
          window.__resetWriteLog = window.__resetWriteLog || [];
          window.__resetWriteLog.push({
            kind: "saveState-blocked",
            at: new Date().toISOString(),
            persistLocal: !!persistLocal,
            skipMatchPersist: !!skipMatchPersist,
            selectedMatch: matchState.state && matchState.state.selectedMatch,
            loadedMatchName: matchState.state && matchState.state.loadedMatchName,
            stack: new Error().stack
          });
        }
        return;
      }
    }
    matchState.state.lastSavedAt = Date.now();
    if (persistLocal) {
      syncTeamsFromStorage();
      syncOpponentTeamsFromStorage();
      syncMatchesFromStorage();
    }
    const snapshot = buildCompactLocalStateSnapshot(matchState.state) || matchState.state;
    writeStateToIndexedDb(snapshot);
    // Only UI preferences belong in localStorage; match data is in IndexedDB.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLocalUiSnapshot(snapshot)));
    } catch (error) {
      logError("Error saving UI preferences", error);
    }
    const loading =
      typeof window !== "undefined" && typeof window.isLoadingMatch !== "undefined"
        ? !!window.isLoadingMatch
        : rosterLineupState.isLoadingMatch;
    if (!loading && !skipMatchPersist) {
      persistCurrentMatch({ allowCreate: false });
    }
  } catch (e) {
    logError("Error saving state", e);
  }
}
