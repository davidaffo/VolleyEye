import { session as teamManagementState } from "../state/live-team-management.js";

export async function clearCachedLocalVideo() {
  try {
    await clearStoredLocalVideoReference();
  } catch (_) {
    // ignore storage errors
  }
}

export function openVideoDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexedDB-unavailable"));
      return;
    }
    const request = indexedDB.open(teamManagementState.LOCAL_VIDEO_DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(teamManagementState.LOCAL_VIDEO_STORE)) {
        db.createObjectStore(teamManagementState.LOCAL_VIDEO_STORE);
      } else {
        request.transaction.objectStore(teamManagementState.LOCAL_VIDEO_STORE).clear();
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexedDB-open-failed"));
  });
}

export async function saveVideoFileHandleToDb(handle) {
  if (!handle) return;
  try {
    const db = await openVideoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(teamManagementState.LOCAL_VIDEO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexedDB-write-failed"));
      const store = tx.objectStore(teamManagementState.LOCAL_VIDEO_STORE);
      store.put(handle, teamManagementState.LOCAL_VIDEO_HANDLE_KEY);
    });
    db.close();
  } catch (_) {
    // ignore indexedDB errors
  }
}

export async function loadVideoFileHandleFromDb() {
  try {
    const db = await openVideoDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(teamManagementState.LOCAL_VIDEO_STORE, "readonly");
      const req = tx.objectStore(teamManagementState.LOCAL_VIDEO_STORE).get(teamManagementState.LOCAL_VIDEO_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("indexedDB-read-failed"));
    });
    db.close();
    return handle || null;
  } catch (_) {
    return null;
  }
}

export async function clearStoredLocalVideoReference() {
  try {
    const db = await openVideoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(teamManagementState.LOCAL_VIDEO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("indexedDB-clear-failed"));
      const store = tx.objectStore(teamManagementState.LOCAL_VIDEO_STORE);
      store.delete(teamManagementState.LOCAL_VIDEO_HANDLE_KEY);
    });
    db.close();
  } catch (_) {
    // ignore indexedDB errors
  }
}

export async function persistLocalVideoReference(handle = null) {
  await clearStoredLocalVideoReference();
  if (handle) await saveVideoFileHandleToDb(handle);
}

export async function getFileFromStoredVideoHandle({ requestPermission = false } = {}) {
  const handle = await loadVideoFileHandleFromDb();
  if (!handle || typeof handle.getFile !== "function") return null;
  let permission = "granted";
  if (typeof handle.queryPermission === "function") {
    permission = await handle.queryPermission({ mode: "read" });
  }
  if (permission !== "granted" && requestPermission && typeof handle.requestPermission === "function") {
    permission = await handle.requestPermission({ mode: "read" });
  }
  if (permission !== "granted") return null;
  const file = await handle.getFile();
  return { file, handle };
}
