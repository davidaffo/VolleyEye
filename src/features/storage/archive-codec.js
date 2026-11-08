import { STORAGE_KEY, MATCH_PREFIX, TEAM_PREFIX, OPPONENT_TEAM_PREFIX, PLAYER_PREFIX } from "../../../js/globals.js";
import { packDatabaseBackup, unpackDatabaseBackup } from "../io/database-backup.js";

export const ARCHIVE_OPTIMIZED_KEY = "__archiveOptimizedV1";
export const ARCHIVE_PHOTO_PREFIX = "__archivePhoto/";

export function archivePhotoKey(photo) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < photo.length; i++) {
    a = Math.imul(a ^ photo.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ photo.charCodeAt(i);
  }
  return ARCHIVE_PHOTO_PREFIX + (a >>> 0).toString(16) + "-" + (b >>> 0).toString(16) + "-" + photo.length;
}

export function prepareArchiveWrites(input, cache) {
  const cacheWrites = new Map(input);
  const storedWrites = new Map(input);
  if ((input.get(ARCHIVE_OPTIMIZED_KEY) ?? cache.get(ARCHIVE_OPTIMIZED_KEY)) !== "1") return { cacheWrites, storedWrites };
  const referencedPhotos = new Set();
  for (const [key, raw] of input) {
    if (raw === null || !(key === STORAGE_KEY || key === PLAYER_PREFIX || key.startsWith(MATCH_PREFIX) ||
        key.startsWith(TEAM_PREFIX) || key.startsWith(OPPONENT_TEAM_PREFIX))) continue;
    let data;
    try { data = JSON.parse(raw); } catch { continue; }
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    const isMatch = key.startsWith(MATCH_PREFIX);
    if (isMatch && (!data.state || typeof data.state !== "object")) continue;
    const source = JSON.parse(raw);
    const state = isMatch ? source.state : source;
    const opponentTeamsAlias = Object.hasOwn(state, "savedOpponentTeams") && Object.hasOwn(state, "savedTeams") &&
      JSON.stringify(state.savedOpponentTeams) === JSON.stringify(state.savedTeams);
    if (opponentTeamsAlias) delete state.savedOpponentTeams;
    const packed = packDatabaseBackup(isMatch ? source : { state: source }, { clearFinishedUndo: false });
    const photoRefs = packed.photoAssets.map(photo => {
      const base = archivePhotoKey(photo);
      let assetKey = base, suffix = 0;
      const valueAt = key => cacheWrites.has(key) ? cacheWrites.get(key) : cache.get(key);
      while (valueAt(assetKey) != null && valueAt(assetKey) !== photo) assetKey = base + "-" + ++suffix;
      // La foto e i riferimenti devono riuscire nella stessa transazione,
      // anche quando un salvataggio precedente è ancora in corso.
      cacheWrites.set(assetKey, photo);
      storedWrites.set(assetKey, photo);
      referencedPhotos.add(assetKey);
      return assetKey;
    });
    delete packed.photoAssets;
    storedWrites.set(key, JSON.stringify({ storageFormat: "volleyeye-archive-v1", packed, photoRefs, isMatch,
      opponentTeamsAlias, hadVersion: Object.hasOwn(data, "version"), originalVersion: data.version }));
  }
  // Il comando di ottimizzazione riscrive tutto l'archivio in una transazione.
  if (input.get(ARCHIVE_OPTIMIZED_KEY) === "1") {
    for (const key of cache.keys()) {
      if (key.startsWith(ARCHIVE_PHOTO_PREFIX) && !referencedPhotos.has(key)) {
        cacheWrites.set(key, null);
        storedWrites.set(key, null);
      }
    }
  }
  return { cacheWrites, storedWrites };
}

export function decodeArchiveEntries(entries) {
  const decoded = new Map(entries);
  for (const [key, raw] of entries) {
    if (typeof raw !== "string" || key.startsWith(ARCHIVE_PHOTO_PREFIX)) continue;
    let stored;
    try { stored = JSON.parse(raw); } catch { continue; }
    if (stored?.storageFormat !== "volleyeye-archive-v1") continue;
    if (!Array.isArray(stored.photoRefs)) throw new Error("Archivio foto non valido.");
    stored.packed.photoAssets = stored.photoRefs.map(ref => {
      if (typeof ref !== "string" || !ref.startsWith(ARCHIVE_PHOTO_PREFIX) || !entries.has(ref)) {
        throw new Error("Foto mancante nell’archivio.");
      }
      return entries.get(ref);
    });
    const unpacked = unpackDatabaseBackup(stored.packed);
    const data = stored.isMatch ? unpacked : unpacked.state;
    const state = stored.isMatch ? data.state : data;
    if (stored.opponentTeamsAlias) state.savedOpponentTeams = JSON.parse(JSON.stringify(state.savedTeams));
    if (stored.isMatch) {
      if (stored.hadVersion) data.version = stored.originalVersion;
      else delete data.version;
    }
    decoded.set(key, JSON.stringify(data));
  }
  return decoded;
}
