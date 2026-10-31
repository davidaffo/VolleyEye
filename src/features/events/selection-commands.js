import { clearCurrentEventEdit } from "../video/edit-view.js";
import { getRowsForContext, getSelectedRows } from "./selection-model.js";
import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { seekVideoToTime } from "../video/media-state.js";
import { publishReactVideoOverlay } from "../video/view.js";
import { updateSelectionStyles } from "./selection-view.js";

export function setSelectionForContext(contextKey, keysSet, anchorKey = null, opts = {}) {
  const ctx = contextKey ? scoutUiState.eventTableContexts[contextKey] : null;
  if (!ctx) return;
  scoutUiState.selectedEventIds.clear();
  keysSet.forEach(k => scoutUiState.selectedEventIds.add(k));
  scoutUiState.lastSelectedEventId = anchorKey || Array.from(keysSet)[0] || null;
  scoutUiState.lastEventContextKey = contextKey;
  updateSelectionStyles();
  clearCurrentEventEdit();
  if (typeof ctx.onSelectionChange === "function") {
    ctx.onSelectionChange(getSelectedRows(contextKey), contextKey, opts);
  }
  if (contextKey === "video") {
    publishReactVideoOverlay();
  }
}

export function toggleSelectionForContext(contextKey, key, opts = {}) {
  const next = new Set(scoutUiState.selectedEventIds);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  setSelectionForContext(contextKey, next, key, opts);
}

export function selectRangeForContext(contextKey, anchorKey, targetKey, opts = {}) {
  const rows = getRowsForContext(contextKey);
  if (!rows.length) return;
  const anchorIdx = Math.max(0, rows.findIndex(r => r.key === anchorKey));
  const targetIdx = Math.max(0, rows.findIndex(r => r.key === targetKey));
  const start = Math.min(anchorIdx, targetIdx);
  const end = Math.max(anchorIdx, targetIdx);
  const range = new Set(rows.slice(start, end + 1).map(r => r.key));
  setSelectionForContext(contextKey, range, anchorKey, opts);
}

export function isEditingField(target) {
  if (!target) return false;
  const tag = (target.tagName || "").toLowerCase();
  if (target.isContentEditable) return true;
  return ["input", "textarea", "select", "option", "button"].includes(tag);
}

export function scrollRowIntoView(record) {
  if (!record || !record.tr || typeof record.tr.scrollIntoView !== "function") return;
  record.tr.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export function handleSeekForSelection(contextKey, opts = {}) {
  if (!opts || !opts.userAction) return;
  const activeTab = document && document.body ? document.body.dataset.activeTab : "";
  if (contextKey === "log" && !matchState.state.videoScoutMode && activeTab !== "video") {
    return;
  }
  const rows = getSelectedRows(contextKey);
  if (!rows.length) return;
  const target =
    rows.find(r => r.key === scoutUiState.lastSelectedEventId) ||
    rows[rows.length - 1];
  if (!target) return;
  const t = typeof target.videoTime === "number" ? target.videoTime : null;
  if (isFinite(t)) {
    const preservePlayback =
      typeof opts.preservePlayback === "boolean" ? opts.preservePlayback : contextKey === "log";
    seekVideoToTime(t, { preservePlayback });
  }
}

export function moveSelection(contextKey, delta, extendRange = false) {
  const ctx = scoutUiState.eventTableContexts[contextKey];
  if (!ctx || !ctx.rows.length) return;
  const rows = ctx.rows;
  const currentKey =
    (scoutUiState.selectedEventIds.size && scoutUiState.lastSelectedEventId && scoutUiState.selectedEventIds.has(scoutUiState.lastSelectedEventId)
      ? scoutUiState.lastSelectedEventId
      : scoutUiState.selectedEventIds.values().next().value) || rows[0].key;
  if (extendRange && scoutUiState.selectedEventIds.size) {
    const selectedIdx = rows
      .map((row, idx) => (scoutUiState.selectedEventIds.has(row.key) ? idx : -1))
      .filter(idx => idx !== -1);
    const edgeIdx = delta > 0 ? Math.max(...selectedIdx) : Math.min(...selectedIdx);
    let anchorKey =
      scoutUiState.lastSelectedEventId && scoutUiState.selectedEventIds.has(scoutUiState.lastSelectedEventId)
        ? scoutUiState.lastSelectedEventId
        : rows[selectedIdx[0]].key;
    let targetIdx = Math.min(rows.length - 1, Math.max(0, edgeIdx + delta));
    const targetKey = rows[targetIdx].key;
    selectRangeForContext(contextKey, anchorKey, targetKey, { userAction: true });
    const targetRow = rows.find(r => r.key === targetKey);
    scrollRowIntoView(targetRow);
    handleSeekForSelection(contextKey, { userAction: true });
    return;
  }
  let anchorKey = currentKey;
  let anchorIdx = rows.findIndex(r => r.key === anchorKey);
  if (anchorIdx === -1) {
    anchorIdx = 0;
    anchorKey = rows[0].key;
  }
  let targetIdx = Math.min(rows.length - 1, Math.max(0, anchorIdx + delta));
  const targetKey = rows[targetIdx].key;
  setSelectionForContext(contextKey, new Set([targetKey]), targetKey, { userAction: true });
  const targetRow = rows.find(r => r.key === targetKey);
  scrollRowIntoView(targetRow);
  handleSeekForSelection(contextKey, { userAction: true });
}
