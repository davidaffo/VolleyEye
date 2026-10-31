import { publishReactEventTable } from "./table-view.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { setSelectionForContext, handleSeekForSelection, toggleSelectionForContext, scrollRowIntoView, selectRangeForContext } from "./selection-commands.js";
import { renderEventsLog } from "./log-view.js";
import { updateSelectionStyles } from "./selection-view.js";
import { getSelectedRows, getRowsForContext } from "./selection-model.js";
import { openBulkEditModal, refreshAfterVideoEdit, closeCurrentEdit } from "../video/event-editor.js";
import { eventTableStore } from "../../state/event-table-store.mjs";
import { renderVideoAnalysis } from "../video/playback.js";
import { seekVideoToTime } from "../video/media-state.js";
import { buildEventEditControl } from "./edit-model.js";
import { pushVideoUndoSnapshot } from "../video/undo-model.js";
import { captureServeTrajectory } from "../live/trajectories.js";
import { openAttackTrajectoryModal } from "../scout/trajectory-dialog.js";
import { getTeamScopeFromEvent } from "../teams/selectors.js";
import { mapBackRowZone } from "../../domain/trajectory-geometry.js";
import { saveState } from "../storage/save-state.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";

export function editEventTrajectory(row, kind, table, event) {
  event.stopPropagation();
  const { ev } = row;
  if (kind === "serve") {
    captureServeTrajectory(ev, { forcePopup: true }).then(() =>
      publishReactEventTable(table.targetId, table.events, table.options),
    );
    return;
  }
  const traj = ev.attackTrajectory || {};
  const dir = ev.attackDirection || traj || null;
  const baseZonePrefill =
    ev.originZone || ev.zone || ev.playerPosition || null;
  const evScope = getTeamScopeFromEvent(ev);
  const forceFar = false;
  const source =
    dir && typeof dir === "object" && dir.start && dir.end
      ? dir
      : traj && traj.start && traj.end
        ? traj
        : null;
  const prefill = {
    ...(source
      ? {
          start: source.start,
          end: source.end,
          startZone: source.startZone,
          endZone: source.endZone,
        }
      : {}),
    baseZone: baseZonePrefill,
    setType: ev.setType || null,
    forceFar,
    scope: evScope,
  };
  openAttackTrajectoryModal(
    Object.assign({ forcePopup: true }, prefill),
  ).then((coords) => {
    if (!coords || !coords.start || !coords.end) return;
    const mapZone = (z) => mapBackRowZone(z, baseZonePrefill);
    const trajectoryPayload = {
      start: coords.start,
      end: coords.end,
      startZone: mapZone(coords.startZone || null),
      endZone: mapZone(coords.endZone || null),
      directionDeg: null,
    };
    ev.attackStart = coords.start;
    ev.attackEnd = coords.end;
    ev.attackStartZone = trajectoryPayload.startZone;
    ev.attackEndZone = trajectoryPayload.endZone;
    ev.attackDirection = trajectoryPayload;
    ev.attackTrajectory = trajectoryPayload;
    if (!ev.originZone) {
      ev.originZone = baseZonePrefill;
    }
    if (trajectoryPayload.startZone) {
      ev.zone = trajectoryPayload.startZone;
      ev.playerPosition = trajectoryPayload.startZone;
    }
    saveState();
    renderEventsLog({ suppressScroll: true });
    renderVideoAnalysis();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
  });
}

export function editEventCell(row, field, table) {
  if (!scoutUiState.selectedEventIds.has(row.key))
    setSelectionForContext(table.contextKey, new Set([row.key]), row.key);
  closeCurrentEdit();
  return buildReactEventControl(row.ev, field, table.baseMs, row.videoTime);
}

export function finishEventCellEdit(field) {
  scoutUiState.currentEditControl = null;
  scoutUiState.currentEditCell = null;
  renderVideoAnalysis();
  if (["eventId", "homeScore", "visitorScore", "combination", "attackType", "relatedEvents", "blockNumber", "durationMs"].includes(field))
    renderEventsLog();
}

export function seekEventTableRow(row, table) {
  if (table.showSeek) seekVideoToTime(row.videoTime);
}

function scrollEventTableRow(row, contextKey) {
  scrollRowIntoView(getRowsForContext(contextKey).find(record => record.key === row.key));
}

export function toggleEventTableRow(row, table) {
  toggleSelectionForContext(table.contextKey, row.key, {
    userAction: true,
    preserveSelection: true,
  });
  scrollEventTableRow(row, table.contextKey);
}

export function selectEventTableRow(row, table, event) {
  if (!table.enableSelection) return;
  const { contextKey } = table;
  if (event.shiftKey && scoutUiState.lastSelectedEventId && scoutUiState.selectedEventIds.has(scoutUiState.lastSelectedEventId)) {
    selectRangeForContext(contextKey, scoutUiState.lastSelectedEventId, row.key, { userAction: true });
    scrollEventTableRow(row, contextKey);
    return;
  }
  if (event.metaKey || event.ctrlKey)
    toggleSelectionForContext(contextKey, row.key, { userAction: true });
  else
    setSelectionForContext(contextKey, new Set([row.key]), row.key, { userAction: true });
  scrollEventTableRow(row, contextKey);
}

export function selectAllEventTableRows(table, checked) {
  const rows = getRowsForContext(table.contextKey);
  setSelectionForContext(table.contextKey, new Set(checked ? rows.map(row => row.key) : []),
    checked ? rows[0]?.key || null : null, { userAction: true });
}

export function handleEventTableHeader(table, header) {
  if (header.sortKey && table.options.onSortChange)
    table.options.onSortChange(header.sortKey);
  if (header.bulkKey && getSelectedRows(table.contextKey).length >= 2)
    openBulkEditModal(table.contextKey, header.bulkKey);
}

export function buildReactEventControl(ev, field, baseMs, videoTime) {
  const model = buildEventEditControl(ev, field, baseMs, videoTime);
  let captured = false;
  const change = model.onChange;
  return {
    ...model,
    onChange: (value) => {
      if (!captured) {
        pushVideoUndoSnapshot();
        captured = true;
      }
      change(value);
      refreshAfterVideoEdit(
        ![
          "videoTime",
          "combination",
          "attackType",
          "zone",
          "receivePosition",
          "set",
        ].includes(field),
      );
    },
  };
}

export function bindReactEventTable(id, root) {
  const view = eventTableStore.getView(id),
    ctx = scoutUiState.eventTableContexts[view.contextKey];
  if (!ctx || ctx.targetId !== id) return;
  const elements = new Map(
    [...root.querySelectorAll("tr[data-event-key]")].map((element) => [
      element.dataset.eventKey,
      element,
    ]),
  );
  ctx.rows.forEach((record) => {
    record.tr = elements.get(String(record.key)) || null;
  });
  updateSelectionStyles();
  handleSeekForSelection(view.contextKey);
}

export function registerReactEventEdit(cell, control) {
  scoutUiState.currentEditCell = cell;
  scoutUiState.currentEditControl = control;
}
