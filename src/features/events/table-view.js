import { buildEventTableModel } from "./table-model.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { removeEventTableContext, updateSelectionStyles } from "./selection-view.js";
import { eventTableStore } from "../../state/event-table-store.mjs";

export function publishReactEventTable(targetId, events, options = {}) {
  if (!targetId) return;
  const contextKey = options.contextKey || targetId || "events";
  const enableSelection = options.enableSelection !== false;
  const model = buildEventTableModel(events, options);
  const oldRows = new Map();
  for (const row of scoutUiState.eventTableContexts[contextKey]?.rows || [])
    if (!oldRows.has(row.key)) oldRows.set(row.key, row);
  const records = model.rows.map((row, idx) => ({
    key: row.key,
    idx,
    ev: row.ev,
    videoTime: row.videoTime,
    tr: oldRows.get(row.key)?.tr || null,
  }));
  if (enableSelection)
    scoutUiState.eventTableContexts[contextKey] = {
      rows: records,
      onSelectionChange: options.onSelectionChange || null,
      baseMs: options.baseMs || null,
      targetId,
    };
  else removeEventTableContext(contextKey);
  eventTableStore.publish(targetId, {
    contextKey: enableSelection ? contextKey : "",
    tableClass: options.tableClass || "event-edit-table",
    showCheckbox: model.showCheckbox,
    rows: model.rows,
    empty: options.empty || "",
    selected: Object.freeze([...scoutUiState.selectedEventIds]),
    headers: model.headers,
    sortable: !!options.onSortChange,
    interaction: Object.freeze({
      contextKey,
      baseMs: options.baseMs || null,
      enableSelection,
      showSeek: options.showSeek,
      targetId,
      events,
      options,
    }),
  });
  updateSelectionStyles();
}
