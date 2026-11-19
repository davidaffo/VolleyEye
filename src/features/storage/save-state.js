import { session as matchState, STORAGE_KEY, MATCH_PREFIX, logError } from '../../../js/globals.js';
import { session as rosterLineupState } from '../state/roster-lineup.js';
import { publishRuntimeView } from '../core/runtime-view.js';
import { syncTeamsFromStorage } from '../teams/storage/team-repository.js';
import { syncMatchesFromStorage } from './match-repository.js';
import { buildCompactLocalStateSnapshot } from './state-snapshot.js';
import { buildLocalUiSnapshot } from './ui-preferences.js';
import { writeStateToIndexedDb, serializeStateSnapshot } from './state-db.js';
import { persistCurrentMatch } from './match-persistence.js';
import { cloneIsolationData } from '../../domain/snapshots.js';
import { queueScoutSave } from './scout-save-queue.js';
import { appendScoutJournal, cleanupCheckpointedJournal } from './scout-journal.js';
import { session as persistentStorageState } from '../state/storage-persistent-storage.js';
import { syncEventPlayerLinks } from '../events/player-links.js';
import { emitDomainEvent } from '../../domain/events.js';

export function saveState(options = {}) {
  publishRuntimeView();
  if (typeof window !== "undefined" && window.__EXPORT_ANALYSIS_HTML__) return;
  const { persistLocal = false, skipMatchPersist = false, skipArchiveSyncForScout = false, journal = null } = options || {};
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
    const currentName = (matchState.state.loadedMatchName || "").trim();
    const currentMatchAvailable = currentName && currentName === matchState.state.selectedMatch &&
      !!matchState.state.savedMatches?.[currentName];
    if (persistLocal && !(skipArchiveSyncForScout && currentMatchAvailable)) {
      syncTeamsFromStorage();
      syncMatchesFromStorage();
    }
    const deferPacking = !!(skipArchiveSyncForScout && currentMatchAvailable);
    const previousJournal = typeof persistentStorageState !== "undefined" ? persistentStorageState.archiveStorage.journal : null;
    const loading =
      typeof window !== "undefined" && typeof window.isLoadingMatch !== "undefined"
        ? !!window.isLoadingMatch
        : rosterLineupState.isLoadingMatch;
    if (deferPacking && journal && !loading && !skipMatchPersist) {
      try {
        syncEventPlayerLinks([...journal.changed, ...matchState.state.events.slice(journal.beforeCount)]);
        if (appendScoutJournal(persistentStorageState.archiveStorage, matchState.state, currentName,
            buildCompactLocalStateSnapshot(matchState.state, { journal: true }), journal)) return;
      } catch (error) {
        logError("Salvataggio incrementale non disponibile, uso il salvataggio completo", error);
      }
    }
    const snapshot = buildCompactLocalStateSnapshot(matchState.state) || matchState.state;
    snapshot.__scoutJournalEpoch = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const snapshotPayload = currentName && currentName === matchState.state.selectedMatch
      ? snapshot.savedMatches?.[currentName]
      : null;
    if (previousJournal && !loading && !skipMatchPersist && snapshotPayload?.name === currentName &&
        previousJournal.name === currentName) {
      const serializedMatch = JSON.stringify(snapshotPayload);
      const storage = persistentStorageState.archiveStorage;
      storage.commit(new Map([
        [STORAGE_KEY, serializeStateSnapshot(snapshot, { matchName: currentName, serializedMatch })],
        [MATCH_PREFIX + currentName, serializedMatch],
      ]), { deferPacking: true });
      matchState.state.savedMatches[currentName] = cloneIsolationData(snapshotPayload);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLocalUiSnapshot(snapshot))); }
      catch (error) { logError("Error saving UI preferences", error); }
      cleanupCheckpointedJournal(storage, previousJournal);
      emitDomainEvent('match-archive-changed');
      return;
    }
    if (deferPacking && !loading && !skipMatchPersist && snapshotPayload?.name === currentName &&
        typeof Worker !== "undefined" && queueScoutSave(snapshot, currentName)) {
      matchState.state.savedMatches[currentName] = cloneIsolationData(snapshotPayload);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLocalUiSnapshot(snapshot)));
      } catch (error) { logError("Error saving UI preferences", error); }
      if (previousJournal) cleanupCheckpointedJournal(persistentStorageState.archiveStorage, previousJournal);
      return;
    }
    const serializedMatch = deferPacking && snapshotPayload?.name === currentName
      ? JSON.stringify(snapshotPayload)
      : null;
    writeStateToIndexedDb(snapshot, { deferPacking, matchName: currentName, serializedMatch });
    // Only UI preferences belong in localStorage; match data is in IndexedDB.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLocalUiSnapshot(snapshot)));
    } catch (error) {
      logError("Error saving UI preferences", error);
    }
    if (!loading && !skipMatchPersist) {
      const matchName = (matchState.state.loadedMatchName || matchState.state.selectedMatch || "").trim();
      const payload = matchName && matchName === matchState.state.selectedMatch
        ? snapshot.savedMatches?.[matchName]
        : null;
      const persisted = persistCurrentMatch({ allowCreate: false, snapshotPayload: payload, deferPacking,
        notifyArchive: !deferPacking,
        serializedPayload: payload === snapshotPayload ? serializedMatch : null });
      if (previousJournal && persisted) cleanupCheckpointedJournal(persistentStorageState.archiveStorage, previousJournal);
    }
  } catch (e) {
    logError("Error saving state", e);
  }
}
