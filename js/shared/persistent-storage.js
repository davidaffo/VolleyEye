// IndexedDB owns the archive. The in-memory mirror keeps synchronous UI reads
// possible; a write is durable only when its transaction completes.
const ARCHIVE_DB_STORE = "archive";
const ARCHIVE_MIGRATION_KEY = "__localStorageMigratedV1";
const archiveStorage = {
  db: null,
  cache: new Map(),
  confirmed: new Map(),
  failedKeys: new Set(),
  temporary: false,
  pending: new Set(),
  revisions: new Map(),
  get failed() { return this.failedKeys.size > 0; },
  get length() { return this.cache.size; },
  key(index) { return Array.from(this.cache.keys())[index] ?? null; },
  keys() { return Array.from(this.cache.keys()); },
  getItem(key) { return this.cache.get(key) ?? null; },
  setItem(key, value) { return this.commit(new Map([[key, String(value)]])); },
  removeItem(key) { return this.commit(new Map([[key, null]])); },
  commit(writes) {
    writes = new Map(writes);
    if (this.temporary) {
      writes.forEach((value, key) => value === null ? this.cache.delete(key) : this.cache.set(key, value));
      return Promise.resolve(true);
    }
    if (!this.db) throw new Error("Archivio non disponibile. Riapri l’app prima di salvare.");
    const revisions = new Map();
    const tx = this.db.transaction(ARCHIVE_DB_STORE, "readwrite");
    const store = tx.objectStore(ARCHIVE_DB_STORE);
    try {
      writes.forEach((value, key) => {
        const revision = (this.revisions.get(key) || 0) + 1;
        this.revisions.set(key, revision);
        revisions.set(key, revision);
        if (value === null) store.delete(key);
        else store.put(value, key);
      });
    } catch (error) {
      tx.abort();
      throw error;
    }
    writes.forEach((value, key) => value === null ? this.cache.delete(key) : this.cache.set(key, value));
    const completion = new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        writes.forEach((value, key) => {
          if (value === null) this.confirmed.delete(key);
          else this.confirmed.set(key, value);
          this.failedKeys.delete(key);
        });
        if (!this.failed) this.errorShown = false;
        resolve(true);
      };
      tx.onabort = () => {
        writes.forEach((_, key) => {
          this.failedKeys.add(key);
          if (this.revisions.get(key) !== revisions.get(key)) return;
          const value = this.confirmed.get(key);
          if (value === undefined) this.cache.delete(key);
          else this.cache.set(key, value);
        });
        reject(tx.error || new Error("Salvataggio archivio annullato."));
      };
      tx.onerror = () => {}; // onabort is the final transaction outcome.
    });
    this.pending.add(completion);
    completion.then(() => this.pending.delete(completion), error => {
      this.pending.delete(completion);
      console.error("Salvataggio IndexedDB non riuscito", error);
      if (typeof window !== "undefined" && typeof window.alert === "function" && !this.errorShown) {
        this.errorShown = true;
        window.alert("Salvataggio non riuscito. Non chiudere l’app: esporta un backup dei dati prima di riprovare. " + error.message);
      }
    });
    return completion;
  },
  async flush() {
    while (this.pending.size) await Promise.all(Array.from(this.pending));
    if (this.failed) throw new Error("Un salvataggio IndexedDB non è riuscito.");
  }
};
function readArchiveEntries(db) {
  return new Promise((resolve, reject) => {
    const entries = new Map();
    const tx = db.transaction(ARCHIVE_DB_STORE, "readonly");
    const request = tx.objectStore(ARCHIVE_DB_STORE).openCursor();
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
function isLegacyArchiveKey(key) {
  return key === STORAGE_KEY || key.startsWith(PERSISTENT_DB_NAME + "/") || key === STORAGE_KEY + ":archive-migration-v1";
}
async function initializePersistentStorage(options = {}) {
  if (options.temporary) {
    archiveStorage.temporary = true;
    return;
  }
  await archiveStorage.flush();
  const db = await getStateDb();
  if (!db) throw new Error("IndexedDB non disponibile: impossibile aprire l’archivio. I dati esistenti non sono stati rimossi.");
  archiveStorage.db = db;
  archiveStorage.cache = await readArchiveEntries(db);
  archiveStorage.confirmed = new Map(archiveStorage.cache);
  const legacyKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isLegacyArchiveKey(key)) legacyKeys.push(key);
  }
  if (!archiveStorage.getItem(ARCHIVE_MIGRATION_KEY)) {
    const writes = new Map();
    legacyKeys.forEach(key => {
      const raw = localStorage.getItem(key);
      if (key === STORAGE_KEY && raw && JSON.parse(raw).__uiOnly) return;
      if (raw !== null && !archiveStorage.cache.has(key)) writes.set(key, raw);
    });
    const oldSnapshot = await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_DB_STORE, "readonly");
      const request = tx.objectStore(STATE_DB_STORE).get(STORAGE_KEY);
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
          if (!writes.has(prefix + name) && !archiveStorage.cache.has(prefix + name)) writes.set(prefix + name, JSON.stringify(payload));
        });
      }
      if (snapshot.playersDb && !writes.has(PLAYER_PREFIX) && !archiveStorage.cache.has(PLAYER_PREFIX)) writes.set(PLAYER_PREFIX, JSON.stringify(snapshot.playersDb));
    }
    writes.set(ARCHIVE_MIGRATION_KEY, "done");
    await archiveStorage.commit(writes);
    const verified = await readArchiveEntries(db);
    for (const [key, value] of writes) {
      if (verified.get(key) !== value) throw new Error("Verifica migrazione non riuscita. Le copie locali sono state conservate.");
    }
    archiveStorage.cache = verified;
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
    const tx = db.transaction(STATE_DB_STORE, "readwrite");
    tx.objectStore(STATE_DB_STORE).delete(STORAGE_KEY);
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => {};
  });
}
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", event => {
    if (!archiveStorage.pending.size && !archiveStorage.failed) return;
    event.preventDefault();
    event.returnValue = "";
  });
}
