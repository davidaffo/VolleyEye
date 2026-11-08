import { cloneIsolationData } from "../../domain/snapshots.js";

export function packDatabaseBackupPhotos(payload) {
  const packed = cloneIsolationData(payload);
  const photos = [];
  const indices = new Map();
  const visit = value => {
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, item]) => {
      if (key === "photo" && typeof item === "string" && item) {
        if (!indices.has(item)) {
          indices.set(item, photos.length);
          photos.push(item);
        }
        value[key] = { backupPhotoIndex: indices.get(item) };
      } else visit(item);
    });
  };
  visit(packed.state);
  packed.version = 2;
  packed.photoAssets = photos;
  return packed;
}

export function unpackDatabaseBackupPhotos(payload) {
  const unpacked = cloneIsolationData(payload);
  // I backup precedenti conservano le foto direttamente nelle anagrafiche.
  if (!Object.hasOwn(unpacked, "photoAssets")) return unpacked;
  if (!Array.isArray(unpacked.photoAssets) || unpacked.photoAssets.some(photo => typeof photo !== "string")) {
    throw new Error("Archivio foto del backup non valido.");
  }
  const visit = value => {
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, item]) => {
      if (key === "photo" && item && typeof item === "object" && Object.hasOwn(item, "backupPhotoIndex")) {
        const index = item.backupPhotoIndex;
        if (!Number.isInteger(index) || index < 0 || index >= unpacked.photoAssets.length) {
          throw new Error("Foto mancante nel backup.");
        }
        value[key] = unpacked.photoAssets[index];
      } else visit(item);
    });
  };
  visit(unpacked.state);
  delete unpacked.photoAssets;
  return unpacked;
}
