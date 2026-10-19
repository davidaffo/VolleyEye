import { session } from "../state/storage-persistent-storage.js";
import { STORAGE_KEY, PERSISTENT_DB_NAME, MATCH_PREFIX, TEAM_PREFIX, PLAYER_PREFIX } from "../../../js/globals.js";

import { getStateDb } from "./state-db.js";
import { session as stateDbState } from "../state/storage-state-db.js";
import { buildLocalUiSnapshot } from "./ui-preferences.js";




const persistentStorageState = session;

export function readArchiveEntries(db) {
  return new Promise((resolve, reject) => {
    const entries = new Map();
    const tx = db.transaction(persistentStorageState.ARCHIVE_DB_STORE, "readonly");
    const request = tx.objectStore(persistentStorageState.ARCHIVE_DB_STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      entries.set(cursor.key, cursor.value);
      cursor.continue();
    };
    tx.oncomplete = () => resolve(entries);
    tx.onabort = () => reject(tx.error || new Error("Lettura archivio non riuscita."));
    tx.onerror = () => {};
  });
}

export function isLegacyArchiveKey(key) {
  return key === STORAGE_KEY || key.startsWith(PERSISTENT_DB_NAME + "/") || key === STORAGE_KEY + ":archive-migration-v1";
}

export async function initializePersistentStorage(options = {}) {
  if (options.temporary) {
    persistentStorageState.archiveStorage.temporary = true;
    return;
  }
  await persistentStorageState.archiveStorage.flush();
  const db = await getStateDb();
  if (!db) throw new Error("IndexedDB non disponibile: impossibile aprire l’archivio. I dati esistenti non sono stati rimossi.");
  persistentStorageState.archiveStorage.db = db;
  persistentStorageState.archiveStorage.cache = await readArchiveEntries(db);
  persistentStorageState.archiveStorage.confirmed = new Map(persistentStorageState.archiveStorage.cache);
  const legacyKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isLegacyArchiveKey(key)) legacyKeys.push(key);
  }
  if (!persistentStorageState.archiveStorage.getItem(persistentStorageState.ARCHIVE_MIGRATION_KEY)) {
    const writes = new Map();
    legacyKeys.forEach(key => {
      const raw = localStorage.getItem(key);
      if (key === STORAGE_KEY && raw && JSON.parse(raw).__uiOnly) return;
      if (raw !== null && !persistentStorageState.archiveStorage.cache.has(key)) writes.set(key, raw);
    });
    const oldSnapshot = await new Promise((resolve, reject) => {
      const tx = db.transaction(stateDbState.STATE_DB_STORE, "readonly");
      const request = tx.objectStore(stateDbState.STATE_DB_STORE).get(STORAGE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    const localSnapshot = writes.has(STORAGE_KEY) ? JSON.parse(writes.get(STORAGE_KEY)) : null;
    if (oldSnapshot && (!localSnapshot || Number(oldSnapshot.lastSavedAt || 0) > Number(localSnapshot.lastSavedAt || 0))) {
      writes.set(STORAGE_KEY, JSON.stringify(oldSnapshot));
    }
    // Recover archives that only existed inside older full-state snapshots.
    const snapshot = writes.has(STORAGE_KEY) ? JSON.parse(writes.get(STORAGE_KEY)) : null;
    if (snapshot) {
      for (const [prefix, collection] of [[MATCH_PREFIX, snapshot.savedMatches], [TEAM_PREFIX, { ...snapshot.savedOpponentTeams, ...snapshot.savedTeams }]]) {
        Object.entries(collection || {}).forEach(([name, payload]) => {
          if (!writes.has(prefix + name) && !persistentStorageState.archiveStorage.cache.has(prefix + name)) writes.set(prefix + name, JSON.stringify(payload));
        });
      }
      if (snapshot.playersDb && !writes.has(PLAYER_PREFIX) && !persistentStorageState.archiveStorage.cache.has(PLAYER_PREFIX)) writes.set(PLAYER_PREFIX, JSON.stringify(snapshot.playersDb));
    }
    writes.set(persistentStorageState.ARCHIVE_MIGRATION_KEY, "done");
    await persistentStorageState.archiveStorage.commit(writes);
    const verified = await readArchiveEntries(db);
    for (const [key, value] of writes) {
      if (verified.get(key) !== value) throw new Error("Verifica migrazione non riuscita. Le copie locali sono state conservate.");
    }
    persistentStorageState.archiveStorage.cache = verified;
  }
  // Cleanup can safely resume after an interrupted migration.
  legacyKeys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (key === STORAGE_KEY) {
      const snapshot = raw ? JSON.parse(raw) : null;
      if (snapshot && !snapshot.__uiOnly) localStorage.setItem(key, JSON.stringify(buildLocalUiSnapshot(snapshot)));
    } else {
      localStorage.removeItem(key);
    }
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction(stateDbState.STATE_DB_STORE, "readwrite");
    tx.objectStore(stateDbState.STATE_DB_STORE).delete(STORAGE_KEY);
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => {};
  });
}

