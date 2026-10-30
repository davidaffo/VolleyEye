import { buildEventTableModel } from "./table-model.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import {
  setSelectionForContext,
  removeEventTableContext,
  updateSelectionStyles,
  handleSeekForSelection,
  renderEventsLog,
  toggleSelectionForContext,
  scrollRowIntoView,
  selectRangeForContext,
} from "../video/video-events.js";
import { getSelectedRows, getRowsForContext } from "./selection-model.js";
import {
  openBulkEditModal,
  refreshAfterVideoEdit,
  renderEventTableRows,
} from "../video/event-editor.js";
import { eventTableStore } from "../../state/event-table-store.mjs";
import { closeCurrentEdit } from "../live/game-flow.js";
import { renderVideoAnalysis, seekVideoToTime } from "../video/playback.js";
import { buildEventEditControl } from "./edit-model.js";
import { pushVideoUndoSnapshot } from "../video/video-sources.js";
import {
  captureServeTrajectory,
  openAttackTrajectoryModal,
} from "../live/trajectories.js";
import { getTeamScopeFromEvent } from "../teams/selectors.js";
import { mapBackRowZone } from "../../domain/trajectory-geometry.js";
import { saveState } from "../storage/save-state.js";
import {
  renderTrajectoryAnalysis,
  renderServeTrajectoryAnalysis,
} from "../analysis/trajectory-rendering.js";
import { deleteEventByKey } from "../core/app-lifecycle.js";

export function buildEventTableRowCommands(
  row,
  record,
  { contextKey, baseMs, showSeek, enableSelection, target, events, options },
) {
  const { key, ev, videoTime } = row;
  const traj = ev.attackTrajectory || {};
  const cells = row.cells.map((cell) => {
    const { field } = cell;
    if (cell.trajectory === "serve")
      return Object.freeze({
        ...cell,
        onDoubleClick: (event) => {
          event.stopPropagation();
          captureServeTrajectory(ev, { forcePopup: true }).then(() =>
            renderEventTableRows(target, events, options),
          );
        },
      });
    if (cell.trajectory === "attack")
      return Object.freeze({
        ...cell,
        onDoubleClick: (e) => {
          e.stopPropagation();
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
        },
      });
    return Object.freeze({
      ...cell,
      onEdit: () => {
        if (!scoutUiState.selectedEventIds.has(key))
          setSelectionForContext(contextKey, new Set([key]), key);
        closeCurrentEdit();
        return buildReactEventControl(ev, field, baseMs, videoTime);
      },
      onDone: () => {
        scoutUiState.currentEditControl = null;
        scoutUiState.currentEditCell = null;
        renderVideoAnalysis();
        if (
          [
            "eventId",
            "homeScore",
            "visitorScore",
            "combination",
            "attackType",
            "relatedEvents",
            "blockNumber",
            "durationMs",
          ].includes(field)
        )
          renderEventsLog();
      },
    });
  });
  return Object.freeze({
    ...row,
    cells: Object.freeze(cells),
    onDelete: () => deleteEventByKey(key),
    onSeek: () => {
      if (showSeek) seekVideoToTime(videoTime);
    },
    onToggle: () => {
      toggleSelectionForContext(contextKey, key, {
        userAction: true,
        preserveSelection: true,
      });
      scrollRowIntoView(record);
    },
    onSelect: (event) => {
      if (!enableSelection) return;
      if (
        event.shiftKey &&
        scoutUiState.lastSelectedEventId &&
        scoutUiState.selectedEventIds.has(scoutUiState.lastSelectedEventId)
      ) {
        selectRangeForContext(
          contextKey,
          scoutUiState.lastSelectedEventId,
          key,
          {
            userAction: true,
          },
        );
        scrollRowIntoView(record);
        return;
      }
      if (event.metaKey || event.ctrlKey)
        toggleSelectionForContext(contextKey, key, { userAction: true });
      else
        setSelectionForContext(contextKey, new Set([key]), key, {
          userAction: true,
        });
      scrollRowIntoView(record);
    },
  });
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

export function publishReactEventTable(target, events, options = {}) {
  const targetId = typeof target === "string" ? target : target?.id;
  if (!targetId) return;
  const contextKey = options.contextKey || targetId || "events",
    enableSelection = options.enableSelection !== false,
    showCheckbox = enableSelection && options.showCheckbox !== false,
    baseMs = options.baseMs || null,
    showSeek = options.showSeek;
  const model = buildEventTableModel(events, options);
  const old = scoutUiState.eventTableContexts[contextKey],
    records = [];
  const oldRows = new Map();
  for (const row of old?.rows || [])
    if (!oldRows.has(row.key)) oldRows.set(row.key, row);
  const viewRows = model.rows.map((row, index) => {
    const record = {
      key: row.key,
      idx: index,
      ev: row.ev,
      videoTime: row.videoTime,
      tr: oldRows.get(row.key)?.tr || null,
      checkbox: null,
    };
    records.push(record);
    return buildEventTableRowCommands(row, record, {
      contextKey,
      baseMs,
      showSeek,
      enableSelection,
      target,
      events,
      options,
    });
  });
  const ctx = {
    rows: records,
    onSelectionChange: options.onSelectionChange || null,
    baseMs,
    native: true,
    targetId: targetId,
  };
  if (enableSelection) scoutUiState.eventTableContexts[contextKey] = ctx;
  else removeEventTableContext(contextKey);
  eventTableStore.publish(targetId, {
    contextKey: enableSelection ? contextKey : "",
    tableClass: options.tableClass || "event-edit-table",
    showCheckbox,
    rows: Object.freeze(viewRows),
    empty: options.empty || "",
    selected: Object.freeze([...scoutUiState.selectedEventIds]),
    headers: model.headers,
    sortable: !!options.onSortChange,
    onHeader: (header) => {
      if (header.sortKey && options.onSortChange)
        options.onSortChange(header.sortKey);
      if (header.bulkKey && getSelectedRows(contextKey).length >= 2)
        openBulkEditModal(contextKey, header.bulkKey);
    },
    onSelectAll: (checked) => {
      const rows = getRowsForContext(contextKey);
      setSelectionForContext(
        contextKey,
        new Set(checked ? rows.map((row) => row.key) : []),
        checked ? rows[0]?.key || null : null,
        { userAction: true },
      );
    },
  });
  updateSelectionStyles();
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
  ctx.table = root.querySelector("table");
  ctx.bulkHeaders = [...root.querySelectorAll("th.bulk-editable")];
  ctx.selectAllCheckbox = root.querySelector("thead input[type=checkbox]");
  ctx.rows.forEach((record) => {
    record.tr = elements.get(String(record.key)) || null;
    record.checkbox = record.tr?.querySelector(".row-select input") || null;
  });
  updateSelectionStyles();
  handleSeekForSelection(view.contextKey);
}

export function registerReactEventEdit(cell, control) {
  scoutUiState.currentEditCell = cell;
  scoutUiState.currentEditControl = control;
}
