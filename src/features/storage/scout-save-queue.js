import { STORAGE_KEY, MATCH_PREFIX } from "../../../js/globals.js";
import { session as persistentStorageState } from "../state/storage-persistent-storage.js";

let worker;
let disabled = false;
let nextId = 0;
let active = null;
let queued = null;

function finish(job, result) {
  const storage = persistentStorageState.archiveStorage;
  try {
    const entries = [[STORAGE_KEY, result.snapshot], [MATCH_PREFIX + job.name, result.match]];
    const writes = new Map(entries.filter(([key]) =>
      storage.staged.get(key)?.revision === job.revisions.get(key)));
    if (!writes.size) { job.resolve(); return; }
    // Una sola transazione mantiene allineate sessione e partita.
    storage.commit(writes, { deferPacking: true }).then(job.resolve, job.reject);
  } catch (error) { job.reject(error); }
}

function fallback(job) {
  try {
    finish(job, { snapshot: JSON.stringify(job.snapshot), match: JSON.stringify(job.snapshot.savedMatches[job.name]) });
  } catch (error) { job.reject(error); }
}

function start(job) {
  active = job;
  try { worker.postMessage({ id: job.id, snapshot: job.snapshot, matchName: job.name }); }
  catch (_) { active = null; fallback(job); advance(); }
}

function advance() {
  if (active || !queued) return;
  const job = queued;
  queued = null;
  if (disabled) fallback(job);
  else start(job);
}

function createWorker() {
  worker = new Worker(new URL("./scout-save-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    if (!active || data.id !== active.id) return;
    const job = active;
    active = null;
    if (data.error) fallback(job);
    else finish(job, data);
    advance();
  };
  worker.onerror = event => {
    event.preventDefault?.();
    disabled = true;
    worker.terminate();
    worker = null;
    const job = active;
    active = null;
    if (job) fallback(job);
    advance();
  };
}

// Il più recente sostituisce gli snapshot ancora in attesa, mai una scrittura
// già avviata; ogni chiave ha una revisione che impedisce regressioni.
export function queueScoutSave(snapshot, name) {
  const storage = persistentStorageState.archiveStorage;
  if (disabled || typeof Worker === "undefined" || storage.temporary || !storage.db ||
      !name || !snapshot?.savedMatches?.[name]) return false;
  try { if (!worker) createWorker(); } catch (_) { disabled = true; return false; }
  const revisions = storage.stageObjects(new Map([
    [STORAGE_KEY, snapshot], [MATCH_PREFIX + name, snapshot.savedMatches[name]],
  ]));
  const job = { id: ++nextId, snapshot, name, revisions };
  const completion = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
  storage.pending.add(completion);
  completion.then(() => storage.pending.delete(completion), error => {
    storage.pending.delete(completion);
    for (const [key, revision] of revisions) {
      if (storage.staged.get(key)?.revision === revision) storage.failedKeys.add(key);
    }
    console.error("Salvataggio scout non riuscito", error);
    if (typeof window !== "undefined" && typeof window.alert === "function" && !storage.errorShown) {
      storage.errorShown = true;
      window.alert("Salvataggio non riuscito. Non chiudere l’app: esporta un backup dei dati prima di riprovare. " + error.message);
    }
  });
  if (queued) queued.resolve();
  queued = job;
  advance();
  return true;
}
