import { session as matchState } from "../../../js/globals.js";
import { session as workspaceLayoutState } from "../state/live-workspace-layout.js";

export function shouldTrackVideoUndo() {
  return typeof document !== "undefined" && document.body && document.body.dataset.activeTab === "video";
}

// La copia temporanea riguarda solo gli eventi interessati; nello stack restano
// esclusivamente i valori precedenti delle proprietà effettivamente cambiate.
export function pushVideoUndoSnapshot(force = false, events = []) {
  if ((!force && !shouldTrackVideoUndo()) || (!force && workspaceLayoutState.bulkEditActive)) return null;
  const originals = [...new Set(events.filter(Boolean))].map(event => ({
    event, before: JSON.parse(JSON.stringify(event))
  }));
  return { originals, entry: null };
}

export function commitVideoUndoSnapshot(capture) {
  if (!capture) return;
  const patches = [];
  for (const { event, before } of capture.originals) {
    const values = {};
    const missing = [];
    for (const key of new Set([...Object.keys(before), ...Object.keys(event)])) {
      if (JSON.stringify(before[key]) === JSON.stringify(event[key])) continue;
      if (Object.hasOwn(before, key)) values[key] = before[key];
      else missing.push(key);
    }
    if (Object.keys(values).length || missing.length) patches.push({ event, values, missing });
  }
  const stack = workspaceLayoutState.videoUndoStack;
  if (capture.entry) {
    const index = stack.indexOf(capture.entry);
    if (index !== -1) {
      if (patches.length) capture.entry.patches = patches;
      else stack.splice(index, 1);
      return;
    }
  }
  if (!patches.length) return;
  capture.entry = { patches };
  stack.push(capture.entry);
  if (stack.length > workspaceLayoutState.VIDEO_UNDO_LIMIT) stack.shift();
}

export function restoreVideoUndo(entry) {
  const events = matchState.state.events || [];
  for (const { event, values, missing } of entry.patches) {
    if (!events.includes(event)) continue;
    for (const key of missing) delete event[key];
    Object.assign(event, JSON.parse(JSON.stringify(values)));
  }
}
