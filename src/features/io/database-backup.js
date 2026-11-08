import { cloneIsolationData } from "../../domain/snapshots.js";
import { encodeMatchStoragePayload, decodeMatchStoragePayload } from "../storage/match-codec.js";
import { clearScoutUndoStates } from "../events/history-model.js";
import { packDatabaseBackupPhotos, unpackDatabaseBackupPhotos } from "./backup-photos.js";

export function packBackupMatch(payload) {
  const aliases = [];
  (payload.state?.events || []).forEach((event, index) => {
    if (event?.attackDirection && Object.hasOwn(event, "attackTrajectory") &&
        JSON.stringify(event.attackDirection) === JSON.stringify(event.attackTrajectory)) {
      aliases.push(index);
      delete event.attackTrajectory;
    }
  });
  const packed = JSON.parse(encodeMatchStoragePayload(payload));
  if (aliases.length) packed.backupTrajectoryAliases = aliases;
  return packed;
}

export function unpackBackupMatch(packed) {
  const payload = decodeMatchStoragePayload(JSON.stringify(packed));
  if (packed.storageFormat !== "volleyeye-match-columns-v1") return payload;
  const aliases = packed.backupTrajectoryAliases || [];
  if (!Array.isArray(aliases)) throw new Error("Riferimenti traiettorie del backup non validi.");
  aliases.forEach(index => {
    const event = payload.state.events[index];
    if (!Number.isInteger(index) || index < 0 || !event?.attackDirection || Object.hasOwn(event, "attackTrajectory")) {
      throw new Error("Traiettoria mancante nel backup.");
    }
    event.attackTrajectory = cloneIsolationData(event.attackDirection);
  });
  return payload;
}

export function packDatabaseBackup(payload, { clearFinishedUndo = true } = {}) {
  const source = cloneIsolationData(payload);
  const matches = source.state.savedMatches || {};
  for (const state of [source.state, ...Object.values(matches).map(match => match.state)]) {
    if (clearFinishedUndo && state?.matchFinished) clearScoutUndoStates(state.events || []);
  }
  const packed = packDatabaseBackupPhotos(source);
  const state = packed.state;
  const name = state.loadedMatchName || state.selectedMatch;
  const current = Object.hasOwn(state.savedMatches || {}, name) ? state.savedMatches[name]?.state : null;
  if (current) {
    const fields = Object.keys(current).filter(key => Object.hasOwn(state, key) &&
      JSON.stringify(state[key]) === JSON.stringify(current[key]));
    if (fields.length) {
      packed.currentMatchRef = { name, fields };
      fields.forEach(key => delete state[key]);
    }
  }
  for (const [name, match] of Object.entries(state.savedMatches || {})) state.savedMatches[name] = packBackupMatch(match);
  if (Array.isArray(state.events) && state.events.length) {
    packed.activeMatchEvents = packBackupMatch({ state: { events: state.events } });
    delete state.events;
  }
  packed.version = 3;
  packed.backupFormat = "volleyeye-database-v3";
  return packed;
}

export function unpackDatabaseBackup(payload) {
  if (!payload.backupFormat) return unpackDatabaseBackupPhotos(payload);
  if (payload.backupFormat !== "volleyeye-database-v3") throw new Error("Formato backup non supportato.");
  const unpacked = cloneIsolationData(payload);
  const state = unpacked.state;
  for (const [name, match] of Object.entries(state.savedMatches || {})) state.savedMatches[name] = unpackBackupMatch(match);
  if (unpacked.activeMatchEvents) {
    state.events = unpackBackupMatch(unpacked.activeMatchEvents).state.events;
    delete unpacked.activeMatchEvents;
  }
  if (unpacked.currentMatchRef) {
    const { name, fields } = unpacked.currentMatchRef;
    const current = Object.hasOwn(state.savedMatches || {}, name) ? state.savedMatches[name]?.state : null;
    if (!current || !Array.isArray(fields)) throw new Error("Partita aperta mancante nel backup.");
    fields.forEach(key => {
      if (typeof key !== "string" || !Object.hasOwn(current, key) || Object.hasOwn(state, key)) {
        throw new Error("Riferimento alla partita aperta non valido.");
      }
      Object.defineProperty(state, key, { value: cloneIsolationData(current[key]), enumerable: true, configurable: true, writable: true });
    });
    delete unpacked.currentMatchRef;
  }
  delete unpacked.backupFormat;
  return unpackDatabaseBackupPhotos(unpacked);
}
