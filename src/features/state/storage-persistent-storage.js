import { createDomainState } from "../../app/domain-state.mjs";
import { prepareArchiveWrites } from "../storage/archive-codec.js";
import { STORAGE_KEY, MATCH_PREFIX } from "../../../js/globals.js";

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
  staged: new Map(),
  journal: null,
  get failed() { return this.failedKeys.size > 0; },
  get length() { return this.keys().length; },
  key(index) { return this.keys()[index] ?? null; },
  keys() { return Array.from(new Set([...this.cache.keys(), ...this.staged.keys()])); },
  getItem(key) {
    const staged = this.staged.get(key);
    if (staged) return JSON.stringify(staged.value);
    if (this.journal && key === STORAGE_KEY) return JSON.stringify(this.journal.session);
    if (this.journal && key === MATCH_PREFIX + this.journal.name) return JSON.stringify(this.journal.match);
    return this.cache.get(key) ?? null;
  },
  stageObjects(values) {
    if (values.has(STORAGE_KEY)) this.journal = null;
    const revisions = new Map();
    for (const [key, value] of values) {
      const revision = (this.revisions.get(key) || 0) + 1;
      this.revisions.set(key, revision);
      this.staged.set(key, { value, revision });
      revisions.set(key, revision);
    }
    return revisions;
  },
  setItem(key, value, options) { return this.commit(new Map([[key, String(value)]]), options); },
  removeItem(key) { return this.commit(new Map([[key, null]])); },
  commit(writes, { deferPacking = false, insertOnly = false } = {}) {
    writes = new Map(writes);
    if (writes.has(STORAGE_KEY)) this.journal = null;
    if (this.temporary) {
      writes.forEach((value, key) => { this.staged.delete(key); value === null ? this.cache.delete(key) : this.cache.set(key, value); });
      return Promise.resolve(true);
    }
    if (!this.db) throw new Error("Archivio non disponibile. Riapri l’app prima di salvare.");
    // Nello scout i record restano validi anche non compressi: la normale
    // scrittura fuori dalla rilevazione li ottimizza nuovamente.
    const prepared = deferPacking
      ? { cacheWrites: writes, storedWrites: writes }
      : prepareArchiveWrites(writes, this.cache);
    writes = prepared.cacheWrites;
    const revisions = new Map();
    const tx = this.db.transaction(persistentStorageState.ARCHIVE_DB_STORE, "readwrite");
    const store = tx.objectStore(persistentStorageState.ARCHIVE_DB_STORE);
    try {
      prepared.storedWrites.forEach((value, key) => {
        const revision = (this.revisions.get(key) || 0) + 1;
        this.revisions.set(key, revision);
        revisions.set(key, revision);
        if (value === null) store.delete(key);
        else if (insertOnly) store.add(value, key);
        else store.put(value, key);
      });
    } catch (error) {
      tx.abort();
      throw error;
    }
    writes.forEach((value, key) => value === null ? this.cache.delete(key) : this.cache.set(key, value));
    writes.forEach((_, key) => this.staged.delete(key));
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
