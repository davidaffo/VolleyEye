import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { lineupStore } from "../../state/lineup-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../../compat/runtime.js";
function run(command, ...args) {
  return invokeRuntime(command, ...args).catch((error) => {
    console.error("Formazione non salvata", error);
    window.alert(error.message);
  });
}
function NumberInput({ slot, index, focus }) {
  const [value, setValue] = useState(slot.number);
  return (
    <input
      type="text"
      inputMode="numeric"
      className="lineup-number-input"
      data-slot-index={index}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.target.select()}
      onClick={(event) => {
        event.stopPropagation();
        event.currentTarget.select();
      }}
      onKeyDown={async (event) => {
        if (event.key !== "Tab" && event.key !== "Enter") return;
        event.preventDefault();
        const exit = event.key === "Enter";
        const next = (index + (event.shiftKey ? 5 : 1)) % 6;
        await run("changeLineupNumber", index, value, exit);
        if (!exit) requestAnimationFrame(() => focus(next));
      }}
    />
  );
}
export function LineupModal() {
  const view = useSyncExternalStore(
    lineupStore.subscribe,
    lineupStore.getSnapshot,
    lineupStore.getSnapshot,
  );
  const root = useRef(null);
  const court = useRef(null);
  const drag = useRef(null);
  useEffect(() => {
    const element = root.current;
    const start = (event) => {
      const target = event.target.closest(".lineup-slot, .lineup-chip");
      if (!target || !element.contains(target) || !target.dataset.playerName)
        return;
      const index = target.classList.contains("lineup-slot")
        ? Number(target.dataset.posIndex)
        : null;
      if (index === null && !window.matchMedia("(pointer: coarse)").matches)
        return;
      invokeRuntimeEvent(
        "handleLineupTouchStart",
        event,
        target.dataset.playerName,
        index,
        "modal",
        view.scope,
      );
    };
    element.addEventListener("touchstart", start, { passive: false });
    return () => element.removeEventListener("touchstart", start);
  }, [view.scope]);
  const focus = (index) => {
    const input = court.current.querySelector(
      '[data-slot-index="' + index + '"]',
    );
    input?.focus();
    input?.select();
  };
  const begin = (event, name, index) => {
    drag.current = { name, index };
    event.dataTransfer.setData("text/plain", name);
    event.dataTransfer.effectAllowed = "move";
  };
  const close = () => run("closeLineupModal");
  return (
    <div
      ref={root}
      id="lineup-modal"
      className={
        "skill-modal" +
        (view.courtModal ? " court-modal" : "") +
        (view.open ? "" : " hidden")
      }
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lineup-modal-title"
    >
      <div
        className="skill-modal__backdrop"
        data-close-lineup=""
        onClick={close}
      ></div>
      <div className="skill-modal__content lineup-modal__content">
        <div className="skill-modal__head">
          <h3 id="lineup-modal-title">
            {view.scope === "opponent"
              ? "Imposta formazione avversaria"
              : "Imposta formazione"}
          </h3>
          <button
            id="lineup-modal-close"
            className="pill-remove skill-modal__close-abs"
            aria-label="Chiudi"
            type="button"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="lineup-modal__body">
          <div className="lineup-modal__court">
            <div
              ref={court}
              id="lineup-modal-court"
              className="lineup-court-grid"
              data-react-managed="true"
            >
              {view.court.map((slot, index) => (
                <div
                  key={index}
                  className={
                    "lineup-slot pos-" +
                    (index + 1) +
                    (!slot.main ? " empty" : "")
                  }
                  style={{ gridArea: "pos" + (index + 1) }}
                  data-pos={"P" + (index + 1)}
                  data-pos-index={index}
                  data-lineup-context="modal"
                  data-team-scope={view.scope}
                  data-player-name={slot.main}
                  draggable={!!slot.main}
                  onDragStart={(event) => begin(event, slot.main, index)}
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
                      transfer?.name;
                    if (!name) return;
                    if (
                      typeof transfer?.index === "number" &&
                      transfer.index !== index
                    )
                      run("moveManagedLineupSlot", transfer.index, index);
                    else run("placeManagedLineupPlayer", name, index);
                    drag.current = null;
                  }}
                  onClick={() => run("selectLineupSlot", index)}
                >
                  <div className="slot-head">
                    <span>Pos {index + 1}</span>
                    <button
                      type="button"
                      className="secondary small slot-clear"
                      onClick={(event) => {
                        event.stopPropagation();
                        run("clearManagedLineupSlot", index);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="slot-body">
                    {view.numberMode ? (
                      <NumberInput
                        key={slot.main + "-" + slot.number}
                        slot={slot}
                        index={index}
                        focus={focus}
                      />
                    ) : (
                      <div className="slot-name">{slot.label}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lineup-modal__bench">
            <h4>Panchina</h4>
            <div
              id="lineup-modal-bench"
              className="lineup-bench-chips"
              data-react-managed="true"
            >
              {view.bench.length ? (
                view.bench.map((player) => (
                  <div
                    key={player.name}
                    className={
                      "lineup-chip" +
                      (view.selectedName === player.name ? " selected" : "")
                    }
                    draggable
                    data-player-name={player.name}
                    data-lineup-context="modal"
                    onDragStart={(event) => begin(event, player.name, null)}
                    onDragEnd={() => {
                      drag.current = null;
                    }}
                    onClick={() => {
                      const index = view.court.findIndex((slot) => !slot.main);
                      run(
                        "placeManagedLineupPlayer",
                        player.name,
                        index === -1 ? 0 : index,
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
        </div>
        <div className="lineup-modal__foot">
          <div className="lineup-modal__libero">
            <span>Libero principale</span>
            <select
              id="lineup-preferred-libero"
              data-react-managed="true"
              value={view.preferredLibero}
              disabled={!view.liberos.length}
              onChange={(event) =>
                run("changeLineupPreferredLibero", event.target.value)
              }
            >
              <option value="">-</option>
              {view.liberos.map((player) => (
                <option key={player.name} value={player.name}>
                  {player.label}
                </option>
              ))}
            </select>
          </div>
          <button
            id="lineup-modal-apply-default"
            className="secondary"
            data-react-managed="true"
            onClick={() => run("applyDefaultLineupToModal")}
          >
            Inserisci formazione default
          </button>
          <button
            id="lineup-modal-toggle-numbers"
            className="secondary"
            data-react-managed="true"
            onClick={() => run("toggleLineupNumbers")}
          >
            {view.numberMode ? "Esci modalità numeri" : "Modalità numeri"}
          </button>
          <button
            id="lineup-modal-save-override"
            data-react-managed="true"
            onClick={() =>
              run("saveLineupModal", { countSubstitutions: false })
            }
          >
            {view.context === "next-set"
              ? "Salva formazione"
              : "Metti in campo (Override)"}
          </button>
          <button
            id="lineup-modal-save-substitution"
            className={
              "danger" + (view.context === "next-set" ? " hidden" : "")
            }
            data-react-managed="true"
            onClick={() => run("saveLineupModal", { countSubstitutions: true })}
          >
            Effettua sostituzioni
          </button>
          <button
            id="lineup-modal-cancel"
            className="secondary"
            data-react-managed="true"
            onClick={close}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
