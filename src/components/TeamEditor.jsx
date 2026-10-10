import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { teamEditorStore } from "../state/team-editor-store.mjs";
import { invokeRuntimeEvent } from "../compat/runtime.js";
function useEditor() {
  return useSyncExternalStore(
    teamEditorStore.subscribe,
    teamEditorStore.getSnapshot,
    teamEditorStore.getSnapshot,
  );
}
function act(callback, ...args) {
  try {
    Promise.resolve(callback(...args)).catch(report);
  } catch (error) {
    report(error);
  }
}
function report(error) {
  console.error("Modifica squadra non riuscita", error);
  window.alert(error.message);
}
function PlayerRow({ player, liveEdit }) {
  const [first, setFirst] = useState(player.firstName || "");
  const [last, setLast] = useState(player.lastName || "");
  const [number, setNumber] = useState(player.number || "");
  useEffect(() => setFirst(player.firstName || ""), [player.firstName]);
  useEffect(() => setLast(player.lastName || ""), [player.lastName]);
  useEffect(() => setNumber(player.number || ""), [player.number]);
  const libero = String(player.role || "").toUpperCase() === "L";
  const nameChanged = (event) => {
    const row = event.currentTarget.closest("tr");
    act(
      player.onName,
      row.querySelector('input[placeholder="Nome"]').value,
      row.querySelector('input[placeholder="Cognome"]').value,
    );
  };
  return (
    <tr
      className={
        "team-manager-row" +
        (libero ? " team-manager-row--libero" : "") +
        (player.out ? " team-manager-row--out" : "")
      }
      data-player-id={player.id}
    >
      <td>
        <input
          className="team-manager-input"
          type="number"
          min="0"
          max="99"
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          onBlur={() => {
            if (number !== (player.number || "")) act(player.onNumber, number);
          }}
        />
      </td>
      <td>
        <input
          className="team-manager-input"
          type="text"
          placeholder="Cognome"
          value={last}
          onChange={(event) => setLast(event.target.value)}
          onBlur={nameChanged}
        />
      </td>
      <td>
        <input
          className="team-manager-input"
          type="text"
          placeholder="Nome"
          value={first}
          onChange={(event) => setFirst(event.target.value)}
          onBlur={nameChanged}
        />
      </td>
      <td>
        <div className="team-manager-photo-cell">
          <button
            type="button"
            className={
              "team-manager-photo-preview" + (player.photo ? "" : " empty")
            }
            title={player.photo ? "Modifica foto" : "Aggiungi foto"}
            aria-label={player.photo ? "Modifica foto" : "Aggiungi foto"}
            style={
              player.photo
                ? {
                    backgroundImage:
                      "url(" + JSON.stringify(player.photo) + ")",
                  }
                : undefined
            }
            onClick={() => act(player.onPhoto)}
          />
        </div>
      </td>
      <td>
        <input
          className="team-manager-input"
          type="checkbox"
          checked={!!player.isCaptain}
          onChange={(event) => act(player.onCaptain, event.target.checked)}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={libero}
          onChange={(event) => act(player.onLibero, event.target.checked)}
        />
      </td>
      <td>
        <input
          className="team-manager-input"
          type="checkbox"
          checked={!!player.out}
          disabled={liveEdit}
          title={
            liveEdit ? "Fuori rosa disabilitato durante la partita." : undefined
          }
          onChange={(event) => act(player.onOut, event.target.checked)}
        />
      </td>
      <td>
        <span className="team-manager-id">{player.id || "—"}</span>
      </td>
      <td>
        <button
          type="button"
          className="small danger"
          disabled={liveEdit}
          title={
            liveEdit ? "Rimozione disabilitata durante la partita." : undefined
          }
          onClick={() => act(player.onDelete)}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
export function TeamEditorTable() {
  const view = useEditor();
  return (
    <tbody id="team-manager-body" data-react-managed="true">
      {view.players.map((player) => (
        <PlayerRow key={player.id} player={player} liveEdit={view.liveEdit} />
      ))}
    </tbody>
  );
}
export function TeamDefaultLineup() {
  const view = useEditor();
  const root = useRef(null),
    drag = useRef("");
  useEffect(() => {
    const element = root.current;
    const start = (event) => {
      const target = event.target.closest(
        ".default-lineup-slot,.default-lineup-chip",
      );
      if (!target || !element.contains(target) || !target.dataset.playerName)
        return;
      const index = target.classList.contains("default-lineup-slot")
        ? Number(target.dataset.slotIndex)
        : null;
      invokeRuntimeEvent(
        "handleDefaultLineupTouchStart",
        event,
        target.dataset.playerName,
        index,
      );
    };
    const end = (event) => {
      const target = event.target.closest(".default-lineup-slot");
      if (target && element.contains(target))
        invokeRuntimeEvent(
          "finalizeDefaultLineupTouch",
          event,
          Number(target.dataset.slotIndex),
        );
    };
    element.addEventListener("touchstart", start, { passive: false });
    element.addEventListener("touchend", end, { passive: false });
    return () => {
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchend", end);
    };
  }, []);
  const begin = (event, name) => {
    drag.current = name;
    event.dataTransfer.setData("text/plain", name);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <div ref={root} className="team-manager-default">
      <h4>Formazione di default</h4>
      <label className="default-lineup-rotation">
        <span>Rotazione iniziale</span>
        <div className="rotation-controls default-lineup-rotation-controls">
          <button
            id="default-lineup-rotate-cw"
            className="small rotate-cw"
            type="button"
            data-react-managed="true"
            onClick={() => act(view.onRotate, "cw")}
          >
            ↺
          </button>
          <div className="rotation-display">
            <select
              id="default-lineup-rotation"
              className="rotation-select"
              data-react-managed="true"
              value={view.rotation}
              onChange={(event) => act(view.onRotation, event.target.value)}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  P{n}
                </option>
              ))}
            </select>
          </div>
          <button
            id="default-lineup-rotate-ccw"
            className="small rotate-ccw"
            type="button"
            data-react-managed="true"
            onClick={() => act(view.onRotate, "ccw")}
          >
            ↻
          </button>
        </div>
      </label>
      <label className="default-lineup-preferred-libero">
        <span>Libero principale</span>
        <select
          id="default-lineup-preferred-libero"
          className="rotation-select"
          data-react-managed="true"
          value={view.preferredLibero}
          disabled={!view.liberos.length}
          onChange={(event) => act(view.onLibero, event.target.value)}
        >
          <option value="">-</option>
          {view.liberos.map((player) => (
            <option key={player.name} value={player.name}>
              {player.label}
            </option>
          ))}
        </select>
      </label>
      <div
        id="default-lineup-grid"
        className="default-lineup-grid"
        data-react-managed="true"
      >
        {view.court.map((slot) => (
          <div
            key={slot.index}
            className={"default-lineup-slot" + (!slot.name ? " empty" : "")}
            data-slot-index={slot.index}
            data-position={slot.index + 1}
            data-player-name={slot.name}
            draggable={!!slot.name}
            onDragStart={(event) => {
              if (slot.name) begin(event, slot.name);
            }}
            onDragEnd={() => {
              drag.current = "";
            }}
            onClick={() => {
              if (slot.name) act(slot.onClear);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.currentTarget.classList.add("drop-over");
            }}
            onDragLeave={(event) =>
              event.currentTarget.classList.remove("drop-over")
            }
            onDrop={(event) => {
              event.preventDefault();
              event.currentTarget.classList.remove("drop-over");
              const name =
                event.dataTransfer.getData("text/plain") || drag.current;
              if (name) act(slot.onDrop, name);
              drag.current = "";
            }}
          >
            <span
              className={
                "default-lineup-name" + (slot.out ? " default-lineup-out" : "")
              }
            >
              {slot.label}
            </span>
          </div>
        ))}
      </div>
      <div className="default-lineup-bench">
        <div className="default-lineup-bench__title">
          Giocatrici disponibili
        </div>
        <div
          id="default-lineup-bench"
          className="default-lineup-bench__list"
          data-react-managed="true"
        >
          {view.bench.length ? (
            view.bench.map((player) => (
              <div
                key={player.name}
                className={
                  "default-lineup-chip" +
                  (player.out ? " default-lineup-out" : "")
                }
                draggable
                data-player-name={player.name}
                onDragStart={(event) => begin(event, player.name)}
                onDragEnd={() => {
                  drag.current = "";
                }}
                onClick={() => act(player.onChoose)}
              >
                {player.label}
              </div>
            ))
          ) : (
            <div className="players-empty">Nessuna giocatrice disponibile.</div>
          )}
        </div>
      </div>
    </div>
  );
}
