import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"ARCHIVE_DB_STORE": () => ("archive"),
"ARCHIVE_MIGRATION_KEY": () => ("__localStorageMigratedV1"),
"archiveStorage": () => ({
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
    const tx = this.db.transaction(persistentStorageState.ARCHIVE_DB_STORE, "readwrite");
    const store = tx.objectStore(persistentStorageState.ARCHIVE_DB_STORE);
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
})
});
const persistentStorageState = session;
