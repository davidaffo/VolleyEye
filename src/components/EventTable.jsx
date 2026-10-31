
import { EventControl } from "./EventControl.jsx";
import { useViewStore } from "../hooks/useViewStore.js";
import { useLayoutEffect, useRef, useState } from "react";
import { eventTableStore, eventLogSummaryStore } from "../state/event-table-store.mjs";
import { events as appEvents } from "../app/actions.mjs";

function Cell({ cell, row, table }) {
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
          appEvents.editEventTrajectory(row, cell.trajectory, table, event);
          return;
        }
        event.stopPropagation();
        const model = appEvents.editEventCell(row, cell.field, table);
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
}
export function EventTable({ id, className }) {
  useViewStore(eventTableStore);
  const view = eventTableStore.getView(id),
    root = useRef(null),
    all = useRef(null);
  const count = view.rows.filter((row) =>
    view.selected.includes(row.key),
  ).length;
  useLayoutEffect(() => {
    if (view.contextKey)
      appEvents.bindReactEventTable(id, root.current);
    if (all.current)
      all.current.indeterminate = count > 0 && count < view.rows.length;
  }, [id, view, count]);
  return (
    <div id={id} ref={root} className={className}>
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
                    onClick={() => appEvents.handleEventTableHeader(view.interaction, header)}
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
                          appEvents.selectAllEventTableRows(view.interaction, event.target.checked)
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
              {view.rows.map((row) => (
                <tr
                  key={row.key}
                  className={
                    "event-row" +
                    (view.selected.includes(row.key) ? " selected" : "")
                  }
                  data-event-key={row.key}
                  data-selected={
                    view.selected.includes(row.key) ? "true" : "false"
                  }
                  onClick={(event) => {
                    if (
                      event.target.closest(
                        "input,label,button,select,option,textarea,.row-select",
                      )
                    )
                      return;
                    appEvents.selectEventTableRow(row, view.interaction, event);
                  }}
                  onDoubleClick={() => appEvents.seekEventTableRow(row, view.interaction)}
                >
                  {view.showCheckbox && (
                    <td className="row-select">
                      <input
                        type="checkbox"
                        checked={view.selected.includes(row.key)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => appEvents.toggleEventTableRow(row, view.interaction)}
                      />
                    </td>
                  )}
                  {row.cells.map((cell, index) => (
                    <Cell key={index} cell={cell} row={row} table={view.interaction} />
                  ))}
                  <td>
                    <button
                      type="button"
                      className="small danger"
                      title="Elimina skill"
                      onClick={(event) => {
                        event.stopPropagation();
                        appEvents.deleteEventByKey(row.key);
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

export function EventLogSummary() {
  const view = useViewStore(eventLogSummaryStore);
  return <div id="events-log-summary" className="events-log-summary" aria-live="polite">{view.text}</div>;
}
