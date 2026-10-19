import { STORAGE_KEY } from '../../../js/globals.js';
import { session as stateDbState } from '../state/storage-state-db.js';
import { session as persistentStorageState } from '../state/storage-persistent-storage.js';

export function getStateDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (stateDbState.stateDbPromise) return stateDbState.stateDbPromise;
  stateDbState.stateDbPromise = new Promise(resolve => {
    const request = indexedDB.open(stateDbState.STATE_DB_NAME, stateDbState.STATE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(persistentStorageState.ARCHIVE_DB_STORE)) db.createObjectStore(persistentStorageState.ARCHIVE_DB_STORE);
      if (!db.objectStoreNames.contains(stateDbState.STATE_DB_STORE)) {
        db.createObjectStore(stateDbState.STATE_DB_STORE);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); stateDbState.stateDbPromise = null; persistentStorageState.archiveStorage.db = null; };
      resolve(db);
    };
    request.onblocked = () => {
      if (typeof alert === "function") alert("Chiudi le altre schede di VolleyEye per aggiornare l’archivio.");
    };
    request.onerror = () => resolve(null);
  });
  return stateDbState.stateDbPromise;
}

export function readStateFromIndexedDb() {
  const raw = persistentStorageState.archiveStorage.getItem(STORAGE_KEY);
  return Promise.resolve(raw ? JSON.parse(raw) : null);
}

export function writeStateToIndexedDb(snapshot) {
  return persistentStorageState.archiveStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
