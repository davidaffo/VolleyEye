import { useEffect, useRef, useSyncExternalStore } from "react";
import { nextSetStore } from "../state/next-set-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../compat/runtime.js";
function run(command, ...args) {
  return invokeRuntime(command, ...args).catch((error) => {
    console.error("Preparazione set non riuscita", error);
    window.alert(error.message);
  });
}
const emptyTeam = {
  name: "",
  rotation: 1,
  court: [],
  bench: [],
  liberos: [],
  preferredLibero: "",
  hasDefaults: false,
};
function NextSetTeam({ scope, team, visible, drag }) {
  const suffix = scope === "opponent" ? "opp" : "our";
  const root = useRef(null);
  useEffect(() => {
    const element = root.current;
    const onTouchStart = (event) => {
      const target = event.target.closest(".lineup-slot, .lineup-chip");
      if (!target || !element.contains(target)) return;
      const name = target.dataset.playerName;
      if (!name) return;
      const index = target.classList.contains("lineup-slot")
        ? Number(target.dataset.posIndex)
        : null;
      if (index === null && !window.matchMedia("(pointer: coarse)").matches)
        return;
      invokeRuntimeEvent(
        "handleLineupTouchStart",
        event,
        name,
        index,
        "next-set",
        scope,
      );
    };
    element.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => element.removeEventListener("touchstart", onTouchStart);
  }, [scope]);
  const beginDrag = (event, name, index) => {
    drag.current = { name, index, scope };
    event.dataTransfer.setData("text/plain", name);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      ref={root}
      className={"next-set-lineup-block" + (visible ? "" : " hidden")}
      id={"next-set-block-" + suffix}
    >
      <div className="next-set-lineup-head">
        <h4 id={"next-set-team-" + suffix}>
          {team.name || (scope === "our" ? "Squadra nostra" : "Avversarie")}
        </h4>
        <div className="rotation-controls next-set-rotation-controls">
          <button
            id={"next-set-rotate-cw-" + suffix}
            className="small rotate-cw"
            type="button"
            data-react-managed="true"
            onClick={() => run("rotateNextSetCourt", scope, "cw")}
          >
            ↺
          </button>
          <div className="rotation-display">
            <select
              id={"next-set-rotation-select-" + suffix}
              className="rotation-select"
              data-react-managed="true"
              value={team.rotation}
              onChange={(event) =>
                run("setNextSetRotation", scope, event.target.value)
              }
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  P{n}
                </option>
              ))}
            </select>
          </div>
          <button
            id={"next-set-rotate-ccw-" + suffix}
            className="small rotate-ccw"
            type="button"
            data-react-managed="true"
            onClick={() => run("rotateNextSetCourt", scope, "ccw")}
          >
            ↻
          </button>
        </div>
        <button
          id={"next-set-default-" + suffix}
          type="button"
          className="secondary small"
          data-react-managed="true"
          disabled={!team.hasDefaults}
          onClick={() => run("restoreNextSetDefaults", scope)}
        >
          Imposta default
        </button>
      </div>
      <div
        id={"next-set-court-" + suffix}
        className="lineup-court-grid next-set-court-grid"
      >
        {team.court.map((slot, index) => (
          <div
            key={index}
            className={
              "lineup-slot pos-" + (index + 1) + (!slot.main ? " empty" : "")
            }
            style={{ gridArea: "pos" + (index + 1) }}
            data-pos={"P" + (index + 1)}
            data-pos-index={index}
            data-lineup-context="next-set"
            data-team-scope={scope}
            data-player-name={slot.main}
            draggable={!!slot.main}
            onDragStart={(event) => beginDrag(event, slot.main, index)}
            onDragEnd={() => {
              drag.current = null;
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
              const transfer = drag.current;
              const name =
                event.dataTransfer.getData("text/plain") ||
                transfer?.name ||
                "";
              if (!name || (transfer?.scope && transfer.scope !== scope))
                return;
              if (
                typeof transfer?.index === "number" &&
                transfer.index !== index
              )
                run("moveNextSetSlot", scope, transfer.index, index);
              else run("changeNextSetPlayer", scope, index, name);
              drag.current = null;
            }}
            onClick={() => {
              if (slot.main) run("changeNextSetPlayer", scope, index, "");
            }}
          >
            <div className="slot-body">
              <div className="slot-name">{slot.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="next-set-bench">
        <div id={"next-set-bench-" + suffix} className="lineup-bench-chips">
          {team.bench.length ? (
            team.bench.map((player) => (
              <div
                key={player.name}
                className="lineup-chip"
                draggable
                data-player-name={player.name}
                data-lineup-context="next-set"
                onDragStart={(event) => beginDrag(event, player.name, null)}
                onDragEnd={() => {
                  drag.current = null;
                }}
                onClick={() => {
                  const index = team.court.findIndex((slot) => !slot.main);
                  run(
                    "changeNextSetPlayer",
                    scope,
                    index === -1 ? 0 : index,
                    player.name,
                  );
                }}
              >
                <span>{player.label}</span>
              </div>
            ))
          ) : (
            <div className="bench-empty">Nessuna riserva disponibile.</div>
          )}
        </div>
      </div>
      <div className="next-set-libero">
        <label htmlFor={"next-set-preferred-libero-" + suffix}>
          Libero principale
        </label>
        <select
          id={"next-set-preferred-libero-" + suffix}
          className="rotation-select"
          data-react-managed="true"
          value={team.preferredLibero}
          disabled={!team.liberos.length}
          onChange={(event) =>
            run("setNextSetPreferredLibero", scope, event.target.value)
          }
        >
          <option value="">-</option>
          {team.liberos.map((player) => (
            <option key={player.name} value={player.name}>
              {player.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
export function NextSetPreparation() {
  const view = useSyncExternalStore(
    nextSetStore.subscribe,
    nextSetStore.getSnapshot,
    nextSetStore.getSnapshot,
  );
  const drag = useRef(null);
  const first = view.setNum === 1;
  const names = {
    our: view.teams.our?.name || "Noi",
    opp: view.teams.opponent?.name || "Avversarie",
  };
  return (
    <div
      id="next-set-inline"
      className={"next-set-inline" + (view.open ? "" : " hidden")}
      aria-hidden={!view.open}
      data-react-managed="true"
    >
      <div className="next-set-inline__card">
        <div className="next-set-inline__head">
          <h3 id="next-set-title">Preparazione set {view.setNum}</h3>
          <button
            id="next-set-close"
            className={"pill-remove" + (first ? " hidden" : "")}
            data-react-managed="true"
            type="button"
            aria-label="Chiudi"
            onClick={() => run("closeNextSetModal")}
          >
            ✕
          </button>
        </div>
        <div className="next-set__body">
          <div
            className={
              "next-set-lineups" +
              (view.double ? " next-set-lineups--double" : "")
            }
            id="next-set-lineups"
          >
            <NextSetTeam
              scope="opponent"
              team={view.teams.opponent || emptyTeam}
              visible={view.double}
              drag={drag}
            />
            <NextSetTeam
              scope="our"
              team={view.teams.our || emptyTeam}
              visible
              drag={drag}
            />
          </div>
          <label
            className={"auto-rotate-toggle" + (first ? " hidden" : "")}
            id="next-set-swap-row"
          >
            <input
              type="checkbox"
              id="next-set-swap-court"
              data-react-managed="true"
              checked={view.swapCourt}
              onChange={(event) =>
                run("changeNextSetOption", "swapCourt", event.target.checked)
              }
            />{" "}
            Cambia campo
          </label>
          <div
            className={"next-set-sides" + (first ? "" : " hidden")}
            id="next-set-sides"
          >
            <div className="next-set__serve-label">Campo vicino</div>
            {Object.entries(names).map(([suffix, name]) => (
              <label key={suffix} className="auto-rotate-toggle">
                <input
                  type="radio"
                  name="next-set-side"
                  id={"next-set-side-" + suffix}
                  data-react-managed="true"
                  checked={suffix === "opp" ? view.swapCourt : !view.swapCourt}
                  onChange={() =>
                    run("changeNextSetOption", "swapCourt", suffix === "opp")
                  }
                />
                <span id={"next-set-side-" + suffix + "-label"}>{name}</span>
              </label>
            ))}
          </div>
          <div className="next-set__serve">
            <div className="next-set__serve-label">Prima battuta</div>
            {Object.entries(names).map(([suffix, name]) => (
              <label key={suffix} className="auto-rotate-toggle">
                <input
                  type="radio"
                  name="next-set-serve"
                  id={"next-set-serve-" + suffix}
                  data-react-managed="true"
                  checked={suffix === "our" ? view.isServing : !view.isServing}
                  onChange={() =>
                    run("changeNextSetOption", "isServing", suffix === "our")
                  }
                />
                <span id={"next-set-serve-" + suffix + "-label"}>{name}</span>
              </label>
            ))}
          </div>
          <div className="settings-actions">
            <button
              id="next-set-start"
              className="primary"
              data-react-managed="true"
              onClick={() => run("applyNextSetDraft")}
            >
              Avvia set
            </button>
            <button
              id="next-set-cancel"
              className={"secondary" + (first ? " hidden" : "")}
              data-react-managed="true"
              onClick={() => run("closeNextSetModal")}
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
