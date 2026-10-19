import { ModalDialog } from "../ui/Modal.jsx";
import { useLineupInteractions } from "../../hooks/useLineupInteractions.js";
import { LineupSlot, LineupChip } from "../ui/LineupPlayer.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";
import { useRef, useState } from "react";
import { lineupStore } from "../../state/lineup-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
function run(command, ...args) {
  return appActions[command]( ...args).catch((error) => {
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
  const view = useViewStore(lineupStore);
  const court = useRef(null);
  const interactions = useLineupInteractions({
    context: "modal", scope: view.scope,
    place: (name, index) => run("placeManagedLineupPlayer", name, index),
    move: (from, to) => run("moveManagedLineupSlot", from, to),
  });
  const focus = (index) => {
    const input = court.current.querySelector(
      '[data-slot-index="' + index + '"]',
    );
    input?.focus();
    input?.select();
  };
  const close = () => run("closeLineupModal");
  return (
    <ModalDialog
      ref={interactions.root}
      id="lineup-modal"
      className={"skill-modal" + (view.courtModal ? " court-modal" : "")}
      aria-labelledby="lineup-modal-title"
      open={view.open}
      onClose={close}
      variant="skill"
      backdropProps={{ "data-close-lineup": "" }}
      contentProps={{ className: "skill-modal__content lineup-modal__content" }}
      title={
        <h3 id="lineup-modal-title">
          {view.scope === "opponent" ? "Imposta formazione avversaria" : "Imposta formazione"}
        </h3>
      }
      closeProps={{
        id: "lineup-modal-close",
        className: "pill-remove skill-modal__close-abs",
        "aria-label": "Chiudi",
        type: "button",
        onClick: close,
      }}
      bodyProps={{ className: "lineup-modal__body" }}
      footer={
        <div className="lineup-modal__foot">
          <div className="lineup-modal__libero">
            <span>Libero principale</span>
            <select
              id="lineup-preferred-libero"
              value={view.preferredLibero}
              disabled={!view.liberos.length}
              onChange={(event) => run("changeLineupPreferredLibero", event.target.value)}
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
            onClick={() => run("applyDefaultLineupToModal")}
          >
            Inserisci formazione default
          </button>
          <button
            id="lineup-modal-toggle-numbers"
            className="secondary"
            onClick={() => run("toggleLineupNumbers")}
          >
            {view.numberMode ? "Esci modalità numeri" : "Modalità numeri"}
          </button>
          <button
            id="lineup-modal-save-override"
            onClick={() => run("saveLineupModal", { countSubstitutions: false })}
          >
            {view.context === "next-set" ? "Salva formazione" : "Metti in campo (Override)"}
          </button>
          <button
            id="lineup-modal-save-substitution"
            className={"danger" + (view.context === "next-set" ? " hidden" : "")}
            onClick={() => run("saveLineupModal", { countSubstitutions: true })}
          >
            Effettua sostituzioni
          </button>
          <button
            id="lineup-modal-cancel"
            className="secondary"
            onClick={close}
          >
            Chiudi
          </button>
        </div>
      }
    >
      <div className="lineup-modal__court">
        <div ref={court} id="lineup-modal-court" className="lineup-court-grid">
          {view.court.map((slot, index) => (
            <LineupSlot
              key={index}
              interactions={interactions}
              name={slot.main}
              index={index}
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
            </LineupSlot>
          ))}
        </div>
      </div>
      <div className="lineup-modal__bench">
        <h4>Panchina</h4>
        <div id="lineup-modal-bench" className="lineup-bench-chips">
          {view.bench.length ? (
            view.bench.map((player) => (
              <LineupChip
                key={player.name}
                interactions={interactions}
                name={player.name}
                onClick={() => {
                  const index = view.court.findIndex((slot) => !slot.main);
                  run("placeManagedLineupPlayer", player.name, index === -1 ? 0 : index);
                }}
                className={view.selectedName === player.name ? " selected" : ""}
              >
                <span>{player.label}</span>
              </LineupChip>
            ))
          ) : (
            <div className="bench-empty">Nessuna riserva disponibile.</div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
