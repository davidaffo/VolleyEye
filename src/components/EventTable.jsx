import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { eventTableStore } from "../state/event-table-store.mjs";
import { invokeRuntimeEvent } from "../compat/runtime.js";
import { EventControl } from "./EventControl.jsx";
function Cell({ cell }) {
  const [editor, setEditor] = useState(null),
    ref = useRef(null);
  const done = () => {
    setEditor(null);
    cell.onDone?.();
  };
  return (
    <td
      ref={ref}
      className={[
        ...(cell.classes || []),
        ...(cell.onDoubleClick ? ["clickable-cell"] : []),
      ].join(" ")}
      data-editing={editor ? "true" : "false"}
      onDoubleClick={(event) => {
        if (cell.onDoubleClick) {
          cell.onDoubleClick(event);
          return;
        }
        if (!cell.onEdit) return;
        event.stopPropagation();
        const model = cell.onEdit();
        if (model) setEditor(model);
      }}
    >
      {editor ? (
        <EventControl
          model={editor}
          commitOnBlur
          onDone={done}
          onFocus={(control) =>
            invokeRuntimeEvent("registerReactEventEdit", ref.current, control)
          }
        />
      ) : (
        cell.text
      )}
    </td>
  );
}
export function EventTable({ id, className }) {
  useSyncExternalStore(
    eventTableStore.subscribe,
    eventTableStore.getSnapshot,
    eventTableStore.getSnapshot,
  );
  const view = eventTableStore.getView(id),
    root = useRef(null),
    all = useRef(null);
  const count = view.rows.filter((row) =>
    view.selected.includes(row.key),
  ).length;
  useLayoutEffect(() => {
    if (view.contextKey)
      invokeRuntimeEvent("bindReactEventTable", id, root.current);
    if (all.current)
      all.current.indeterminate = count > 0 && count < view.rows.length;
  }, [id, view, count]);
  return (
    <div id={id} ref={root} className={className} data-react-managed="true">
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
                    onClick={() => view.onHeader?.(header)}
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
                          view.onSelectAll(event.target.checked)
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
                    row.onSelect(event);
                  }}
                  onDoubleClick={row.onSeek}
                >
                  {view.showCheckbox && (
                    <td className="row-select">
                      <input
                        type="checkbox"
                        checked={view.selected.includes(row.key)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={row.onToggle}
                      />
                    </td>
                  )}
                  {row.cells.map((cell, index) => (
                    <Cell key={index} cell={cell} />
                  ))}
                  <td>
                    <button
                      type="button"
                      className="small danger"
                      title="Elimina skill"
                      onClick={(event) => {
                        event.stopPropagation();
                        row.onDelete();
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
