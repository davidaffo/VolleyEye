import { session as scoutUiState } from "../state/scout-ui.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";

export function pruneEventSelection() {
  const allKeys = new Set();
  Object.values(scoutUiState.eventTableContexts).forEach((ctx) => {
    ctx.rows.forEach((r) => allKeys.add(r.key));
  });
  Array.from(scoutUiState.selectedEventIds).forEach((key) => {
    if (!allKeys.has(key)) scoutUiState.selectedEventIds.delete(key);
  });
  if (
    scoutUiState.lastSelectedEventId &&
    !allKeys.has(scoutUiState.lastSelectedEventId)
  ) {
    scoutUiState.lastSelectedEventId = null;
  }
}

export function getRowsForContext(contextKey) {
  const ctx = scoutUiState.eventTableContexts[contextKey];
  return ctx ? ctx.rows : [];
}

export function getSelectedRows(contextKey = null) {
  if (contextKey && scoutUiState.eventTableContexts[contextKey]) {
    return scoutUiState.eventTableContexts[contextKey].rows.filter((r) =>
      scoutUiState.selectedEventIds.has(r.key),
    );
  }
  const seen = new Set();
  const rows = [];
  const ctxOrder = [
    "video",
    "log",
    ...Object.keys(scoutUiState.eventTableContexts),
  ];
  ctxOrder.forEach((key) => {
    const ctx = scoutUiState.eventTableContexts[key];
    if (!ctx) return;
    ctx.rows.forEach((r) => {
      if (scoutUiState.selectedEventIds.has(r.key) && !seen.has(r.key)) {
        seen.add(r.key);
        rows.push(r);
      }
    });
  });
  return rows;
}

export function getActiveEventContextKey() {
  if (
    scoutUiState.lastEventContextKey &&
    scoutUiState.eventTableContexts[scoutUiState.lastEventContextKey]
  )
    return scoutUiState.lastEventContextKey;
  if (
    rosterLineupState.activeTab === "video" &&
    scoutUiState.eventTableContexts.video
  )
    return "video";
  if (scoutUiState.eventTableContexts.log) return "log";
  const keys = Object.keys(scoutUiState.eventTableContexts);
  return keys[0] || null;
}

export function getSelectedVideoRowForInsert() {
  const ctx = scoutUiState.eventTableContexts.video;
  if (!ctx || !ctx.rows || !ctx.rows.length) return null;
  let key =
    scoutUiState.lastSelectedEventId &&
    scoutUiState.selectedEventIds.has(scoutUiState.lastSelectedEventId)
      ? scoutUiState.lastSelectedEventId
      : null;
  if (!key) {
    const first = ctx.rows.find((r) =>
      scoutUiState.selectedEventIds.has(r.key),
    );
    key = first ? first.key : null;
  }
  if (!key) return null;
  return ctx.rows.find((r) => r.key === key) || null;
}

export function getVideoPlayByPlayRows() {
  const ctx = scoutUiState.eventTableContexts.video;
  return ctx && Array.isArray(ctx.rows) ? ctx.rows : [];
}

export function getPlayByPlayStartIndex(rows) {
  if (!rows.length) return -1;
  const preferredKey =
    scoutUiState.lastSelectedEventId &&
    scoutUiState.selectedEventIds.has(scoutUiState.lastSelectedEventId)
      ? scoutUiState.lastSelectedEventId
      : scoutUiState.selectedEventIds.values().next().value;
  if (preferredKey) {
    const idx = rows.findIndex((r) => r.key === preferredKey);
    if (idx !== -1) return idx;
  }
  return 0;
}

export function getVideoMobileCurrentRow() {
  const ctx = scoutUiState.eventTableContexts.video;
  const rows = ctx && Array.isArray(ctx.rows) ? ctx.rows : [];
  if (!rows.length) return { rows, row: null, index: -1 };
  let index = rows.findIndex(
    (row) =>
      row.key === scoutUiState.lastSelectedEventId &&
      scoutUiState.selectedEventIds.has(row.key),
  );
  if (index < 0)
    index = rows.findIndex((row) => scoutUiState.selectedEventIds.has(row.key));
  if (index < 0) index = 0;
  return { rows, row: rows[index], index };
}
