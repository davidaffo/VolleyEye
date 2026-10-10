import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { videoPresetsStore } from "../state/roster-import-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";
const run = (command, ...args) =>
  invokeRuntime(command, ...args).catch(console.error);
function usePresets() {
  return useSyncExternalStore(
    videoPresetsStore.subscribe,
    videoPresetsStore.getSnapshot,
    videoPresetsStore.getSnapshot,
  );
}
function Preset({ entry, drag, move }) {
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(entry.name),
    input = useRef(null),
    finished = useRef(false);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  const finish = (save) => {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    run("renameReactVideoPreset", entry.id, save ? name : null);
  };
  const apply = () => {
    if (!editing) run("applyReactVideoPreset", entry.id);
  };
  return (
    <div
      className={
        "video-filter-preset-card" +
        (entry.active ? " active" : "") +
        (editing ? " editing" : "")
      }
      tabIndex={0}
      role="button"
      draggable={!editing}
      data-video-filter-preset-id={entry.id}
      onClick={apply}
      onKeyDown={(event) => {
        if (editing) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          apply();
        }
      }}
      onDragStart={(event) => {
        drag.current = entry.id;
        event.currentTarget.classList.add("dragging");
      }}
      onDragEnd={(event) => {
        drag.current = "";
        event.currentTarget.classList.remove("dragging");
        run(
          "reorderReactVideoPresets",
          videoPresetsStore.getSnapshot().entries.map((entry) => entry.id),
        );
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!drag.current || drag.current === entry.id) return;
        const rect = event.currentTarget.getBoundingClientRect();
        move(
          drag.current,
          entry.id,
          event.clientY > rect.top + rect.height / 2,
        );
      }}
    >
      {editing ? (
        <input
          ref={input}
          type="text"
          className="video-filter-preset-name-input"
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onBlur={() => finish(true)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              finish(true);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              finish(false);
            }
          }}
        />
      ) : (
        <span className="video-filter-preset-name">{entry.name}</span>
      )}
      <span className="video-filter-preset-meta">{entry.count} filtri</span>
      <button
        type="button"
        className="video-filter-preset-rename"
        title="Rinomina preset"
        aria-label="Rinomina preset"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (editing) return;
          setName(entry.name);
          finished.current = false;
          setEditing(true);
        }}
      >
        ✎
      </button>
      <button
        type="button"
        className="video-filter-preset-delete"
        title="Elimina preset"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          run("removeReactVideoPreset", entry.id);
        }}
      >
        ×
      </button>
    </div>
  );
}
export function VideoPresetCreate() {
  const view = usePresets();
  const save = () =>
    run("saveCurrentVideoFilterPreset", view.name).then(() =>
      videoPresetsStore.publish({ name: "" }),
    );
  return (
    <div className="video-filter-preset-create">
      <input
        id="video-filter-preset-name"
        type="text"
        placeholder="Nome preset"
        maxLength={40}
        data-react-managed="true"
        value={view.name}
        onChange={(event) =>
          videoPresetsStore.publish({ name: event.target.value })
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
      />
      <button
        id="video-filter-preset-save"
        type="button"
        className="small"
        data-react-managed="true"
        onClick={save}
      >
        Salva filtri
      </button>
    </div>
  );
}
export function VideoPresets() {
  const view = usePresets(),
    drag = useRef("");
  const move = (from, to, after) => {
    const entries = [...videoPresetsStore.getSnapshot().entries],
      source = entries.find((entry) => entry.id === from);
    if (!source) return;
    const next = entries.filter((entry) => entry.id !== from),
      target = next.findIndex((entry) => entry.id === to);
    if (target < 0) return;
    next.splice(target + (after ? 1 : 0), 0, source);
    videoPresetsStore.publish({ entries: Object.freeze(next) });
  };
  return (
    <div
      id="video-filter-presets-list"
      className="video-filter-presets-list"
      data-react-managed="true"
    >
      {view.entries.length ? (
        view.entries.map((entry) => (
          <Preset key={entry.id} entry={entry} drag={drag} move={move} />
        ))
      ) : (
        <div className="video-filter-preset-empty">
          Nessun preset salvato per questo match.
        </div>
      )}
    </div>
  );
}
