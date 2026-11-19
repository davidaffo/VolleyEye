import { memo } from "react";
import { MatchNoteMarker } from "./MatchNotes.jsx";
import { matchNotesStore } from "../state/match-notes-store.mjs";

import { EventControl } from "./EventControl.jsx";
import { useViewStore } from "../hooks/useViewStore.js";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  eventTableStore,
  eventLogSummaryStore,
} from "../state/event-table-store.mjs";
import { events as appEvents } from "../app/actions.mjs";

const Cell = memo(function Cell({ cell, row, tableRef }) {
  const [editor, setEditor] = useState(null),
    ref = useRef(null);
  const done = () => {
    setEditor(null);
    appEvents.finishEventCellEdit(cell.field);
  };
  return (
    <td
      ref={ref}
      className={[
        ...(cell.classes || []),
        ...(cell.trajectory ? ["clickable-cell"] : []),
      ].join(" ")}
      data-editing={editor ? "true" : "false"}
      onDoubleClick={(event) => {
        if (cell.trajectory) {
          appEvents.editEventTrajectory(row, cell.trajectory, tableRef.current, event);
          return;
        }
        event.stopPropagation();
        const model = appEvents.editEventCell(row, cell.field, tableRef.current);
        if (model) setEditor(model);
      }}
    >
      {editor ? (
        <EventControl
          model={editor}
          commitOnBlur
          onDone={done}
          onFocus={(control) =>
            appEvents.registerReactEventEdit(ref.current, control)
          }
        />
      ) : (
        cell.text
      )}
    </td>
  );
}, (previous, next) =>
  previous.row.key === next.row.key &&
  previous.row.ev === next.row.ev &&
  previous.row.videoTime === next.row.videoTime &&
  previous.cell.field === next.cell.field &&
  previous.cell.text === next.cell.text &&
  previous.cell.trajectory === next.cell.trajectory &&
  (previous.cell.classes || []).join(" ") === (next.cell.classes || []).join(" ") &&
  previous.tableRef === next.tableRef
);
const EventRow = memo(function EventRow({ row, selected, showCheckbox, tableRef, notes, columnCount }) {
  return <>
    <tr
      className={"event-row" + (selected ? " selected" : "")}
      data-event-key={row.key}
      data-selected={selected ? "true" : "false"}
      onClick={(event) => {
        if (event.target.closest("input,label,button,select,option,textarea,.row-select")) return;
        appEvents.selectEventTableRow(row, tableRef.current, event);
      }}
      onDoubleClick={() => appEvents.seekEventTableRow(row, tableRef.current)}
    >
      {showCheckbox && <td className="row-select">
        <input type="checkbox" checked={selected}
          onClick={(event) => event.stopPropagation()}
          onChange={() => appEvents.toggleEventTableRow(row, tableRef.current)} />
      </td>}
      {row.cells.map((cell, index) => <Cell key={index} cell={cell} row={row} tableRef={tableRef} />)}
      <td><button type="button" className="small danger" title="Elimina skill"
        onClick={(event) => { event.stopPropagation(); appEvents.deleteEventByKey(row.key); }}>✕</button></td>
    </tr>
    {notes.map((note) => <tr className="match-note-row" key={note.id}>
      <td colSpan={columnCount}><MatchNoteMarker note={note} /></td>
    </tr>)}
  </>;
}, (a, b) => a.row.key === b.row.key && a.row.ev === b.row.ev &&
  a.row.videoTime === b.row.videoTime && a.selected === b.selected &&
  a.showCheckbox === b.showCheckbox && a.tableRef === b.tableRef &&
  a.columnCount === b.columnCount && JSON.stringify(a.notes) === JSON.stringify(b.notes) &&
  a.row.cells.length === b.row.cells.length && a.row.cells.every((cell, index) => {
    const next = b.row.cells[index];
    return cell.field === next.field && cell.text === next.text &&
      cell.trajectory === next.trajectory && (cell.classes || []).join(" ") === (next.classes || []).join(" ");
  }));
const emptyNotesView = Object.freeze({ notes: Object.freeze([]) });

export function EventTable({ id, className }) {
  const view = useSyncExternalStore(
    eventTableStore.subscribe,
    () => eventTableStore.getView(id),
    () => eventTableStore.getView(id),
  );
  const notesView = useSyncExternalStore(
    matchNotesStore.subscribe,
    () => id === "events-log" ? matchNotesStore.getSnapshot() : emptyNotesView,
    () => id === "events-log" ? matchNotesStore.getSnapshot() : emptyNotesView,
  );
  const notes = id === "events-log" ? notesView.notes : [];
  const root = useRef(null),
    all = useRef(null),
    tableRef = useRef(view.interaction);
  const count = view.rows.filter((row) =>
    view.selected.includes(row.key),
  ).length;
  useLayoutEffect(() => {
    tableRef.current = view.interaction;
    if (view.contextKey) appEvents.bindReactEventTable(id, root.current);
    if (all.current)
      all.current.indeterminate = count > 0 && count < view.rows.length;
  }, [id, view, count]);
  return (
    <div id={id} ref={root} className={className}>
      {notes
        .filter((note) => note.anchorKey === null)
        .map((note) => (
          <MatchNoteMarker key={note.id} note={note} />
        ))}
      {view.empty ? (
        <table className={view.tableClass || "event-edit-table"}>
          <tbody>
            <tr>
              <td colSpan={9}>{view.empty}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        view.rows.length > 0 && (
          <table
            className={
              (view.tableClass || "event-edit-table") +
              (count > 1 ? " bulk-edit-active" : "")
            }
          >
            <thead>
              <tr>
                {view.headers.map((header, index) => (
                  <th
                    key={index}
                    className={
                      (header.sortKey && view.sortable
                        ? "video-sortable-header "
                        : "") + (header.bulkKey ? "bulk-editable" : "")
                    }
                    data-bulk-key={header.bulkKey}
                    title={
                      header.bulkKey
                        ? "Modifica tutte le skill selezionate"
                        : header.sortKey && view.sortable
                          ? "Ordina"
                          : undefined
                    }
                    onClick={() =>
                      appEvents.handleEventTableHeader(view.interaction, header)
                    }
                  >
                    {header.checkbox ? (
                      <input
                        ref={all}
                        type="checkbox"
                        title="Seleziona tutto"
                        checked={
                          view.rows.length > 0 && count === view.rows.length
                        }
                        onChange={(event) =>
                          appEvents.selectAllEventTableRows(
                            view.interaction,
                            event.target.checked,
                          )
                        }
                      />
                    ) : (
                      header.label +
                      (header.dir === "asc"
                        ? " ▲"
                        : header.dir === "desc"
                          ? " ▼"
                          : "")
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => <EventRow key={row.key} row={row}
                selected={view.selected.includes(row.key)} showCheckbox={view.showCheckbox}
                tableRef={tableRef} columnCount={view.headers.length}
                notes={notes.filter((note) => note.anchorKey === String(row.key))} />)}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

export function EventLogSummary() {
  const view = useViewStore(eventLogSummaryStore);
  return (
    <div
      id="events-log-summary"
      className="events-log-summary"
      aria-live="polite"
    >
      {view.text}
    </div>
  );
}
