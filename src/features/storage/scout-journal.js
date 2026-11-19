import { STORAGE_KEY, MATCH_PREFIX } from '../../../js/globals.js';
import { cloneIsolationData } from '../../domain/snapshots.js';

export const SCOUT_JOURNAL_PREFIX = '__scoutJournal/';
const epochOf = state => state.__scoutJournalEpoch || `legacy:${state.lastSavedAt || 0}`;

function applyRecord(session, match, record) {
  if (!Array.isArray(session.events) || !Array.isArray(match?.state?.events) ||
      session.events.length !== record.beforeCount || match.state.events.length !== record.beforeCount) {
    throw new Error('Il registro incrementale non corrisponde alla partita salvata.');
  }
  for (const { index, event } of record.changed) {
    if (!Number.isInteger(index) || index < 0 || index >= record.beforeCount) throw new Error('Evento modificato non valido nel registro.');
    session.events[index] = cloneIsolationData(event);
    match.state.events[index] = cloneIsolationData(event);
  }
  for (const event of record.added) {
    session.events.push(cloneIsolationData(event));
    match.state.events.push(cloneIsolationData(event));
  }
  Object.assign(session, record.patch);
  Object.assign(match.state, record.patch);
  session.__scoutJournalSeq = record.seq;
  session.savedMatches ||= {};
  session.savedMatches[record.name] = match;
}

export function recoverScoutJournal(entries) {
  const result = new Map(entries);
  const raw = result.get(STORAGE_KEY);
  if (!raw) return result;
  let session;
  try { session = JSON.parse(raw); } catch { return result; }
  const name = session.loadedMatchName || session.selectedMatch;
  const matchKey = MATCH_PREFIX + name;
  if (!name || !result.get(matchKey)) return result;
  const records = [];
  for (const [key, value] of entries) {
    if (!key.startsWith(SCOUT_JOURNAL_PREFIX)) continue;
    let record;
    try { record = JSON.parse(value); } catch { throw new Error('Registro incrementale danneggiato.'); }
    if (record.epoch === epochOf(session) && record.name === name && record.seq > (session.__scoutJournalSeq || 0)) records.push(record);
  }
  if (!records.length) return result;
  records.sort((a, b) => a.seq - b.seq);
  const match = JSON.parse(result.get(matchKey));
  let next = (session.__scoutJournalSeq || 0) + 1;
  for (const record of records) {
    if (record.seq !== next++) throw new Error('Manca una parte del registro incrementale.');
    applyRecord(session, match, record);
  }
  result.set(STORAGE_KEY, JSON.stringify(session));
  result.set(matchKey, JSON.stringify(match));
  return result;
}

// Dopo il recupero, materializza sessione e partita nella stessa transazione
// che elimina i record già applicati. Un'interruzione lascia il journal intatto.
export function recoveredJournalCheckpoint(entries) {
  const raw = entries.get(STORAGE_KEY);
  if (!raw) return null;
  let session;
  try { session = JSON.parse(raw); } catch { return null; }
  const name = session.loadedMatchName || session.selectedMatch;
  const matchKey = MATCH_PREFIX + name;
  const seq = session.__scoutJournalSeq || 0;
  if (!name || !seq || !entries.has(matchKey)) return null;
  const writes = new Map([[STORAGE_KEY, raw], [matchKey, entries.get(matchKey)]]);
  for (const [key, value] of entries) {
    if (!key.startsWith(SCOUT_JOURNAL_PREFIX)) continue;
    const record = JSON.parse(value);
    if (record.name === name && record.epoch === epochOf(session) && record.seq <= seq) writes.set(key, null);
  }
  return writes.size > 2 ? writes : null;
}

export function cleanupCheckpointedJournal(storage, journal) {
  if (!journal) return;
  const removable = [];
  for (const [key, value] of storage.cache) {
    if (!key.startsWith(SCOUT_JOURNAL_PREFIX)) continue;
    try {
      const record = JSON.parse(value);
      if (record.epoch === journal.epoch && record.name === journal.name && record.seq <= journal.seq) removable.push(key);
    } catch { /* Un record non riconosciuto deve restare disponibile per il recupero. */ }
  }
  if (!removable.length) return;
  storage.flush().then(() => {
    const writes = new Map(removable.filter(key => storage.cache.has(key)).map(key => [key, null]));
    if (writes.size) return storage.commit(writes, { deferPacking: true });
  }).catch(error => console.error('Pulizia del registro incrementale non riuscita', error));
}

export function appendScoutJournal(storage, state, name, patch, { beforeCount, changed = [] }) {
  if (!storage.db || storage.temporary || storage.staged.has(STORAGE_KEY) || storage.staged.has(MATCH_PREFIX + name)) return false;
  let journal = storage.journal;
  const baseRaw = storage.cache.get(STORAGE_KEY);
  if (!journal || journal.name !== name || journal.baseRaw !== baseRaw) {
    try {
      const session = JSON.parse(baseRaw);
      const match = JSON.parse(storage.cache.get(MATCH_PREFIX + name));
      if ((session.loadedMatchName || session.selectedMatch) !== name || session.events?.length !== beforeCount || match.state?.events?.length !== beforeCount) return false;
      journal = { name, baseRaw, epoch: epochOf(session), session, match, seq: session.__scoutJournalSeq || 0 };
    } catch { return false; }
  }
  if (journal.session.events.length !== beforeCount || state.events.length < beforeCount) return false;
  const indexes = [...new Set(changed.map(event => state.events.indexOf(event)).filter(index => index >= 0 && index < beforeCount))];
  const record = {
    epoch: journal.epoch, seq: journal.seq + 1, name, beforeCount, patch,
    changed: indexes.map(index => ({ index, event: state.events[index] })),
    added: state.events.slice(beforeCount),
  };
  const raw = JSON.stringify(record);
  const isolated = JSON.parse(raw);
  const key = SCOUT_JOURNAL_PREFIX + encodeURIComponent(journal.epoch) + '/' + String(isolated.seq).padStart(12, '0');
  storage.commit(new Map([[key, raw]]), { deferPacking: true, insertOnly: true });
  applyRecord(journal.session, journal.match, isolated);
  journal.seq = isolated.seq;
  storage.journal = journal;
  state.savedMatches[name] = journal.match;
  return true;
}
