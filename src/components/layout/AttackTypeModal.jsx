import { useSyncExternalStore } from "react";
import { attackShortcutStore } from "../../state/attack-shortcut-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function AttackTypeModal() {
  const view = useSyncExternalStore(
    attackShortcutStore.subscribe,
    attackShortcutStore.getSnapshot,
    attackShortcutStore.getSnapshot,
  );
  const run = (command, ...args) =>
    invokeRuntime(command, ...args).catch((error) => {
      console.error("Modifica attacco non riuscita", error);
      window.alert(error.message);
    });
  const close = () => run("resetAttackShortcutModals");
  return (
    <div
      id={"attack-type-modal"}
      className={"skill-modal force-popup" + (view.type ? "" : " hidden")}
      data-react-managed="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role={"dialog"}
      aria-modal={"true"}
    >
      <div
        className={"skill-modal__backdrop"}
        data-close-attack-type={""}
        onClick={close}
      ></div>
      <div className={"skill-modal__content base-modal__content"}>
        <div className={"skill-modal__head"}>
          <div className={"skill-modal__title"}>{"Tipo attacco"}</div>
          <button
            id={"attack-type-modal-close"}
            data-react-managed="true"
            onClick={close}
            className={"pill-remove skill-modal__close-abs"}
            aria-label={"Chiudi"}
            type={"button"}
            data-close-attack-type={"true"}
          >
            {"✕"}
          </button>
        </div>
        <div className={"skill-modal__body"}>
          <p className={"section-note"}>
            {"Seleziona il tipo di attacco da assegnare all'ultimo attacco."}
          </p>
          <div
            id={"attack-type-modal-grid"}
            data-react-managed="true"
            className={"base-modal__grid"}
          >
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-attack-type={"Regolare"}
              onClick={() => run("applyAttackTypeToTarget", "Regolare")}
              data-key={"R"}
            >
              {"Regolare (R)"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-attack-type={"Pallonetto"}
              onClick={() => run("applyAttackTypeToTarget", "Pallonetto")}
              data-key={"P"}
            >
              {"Pallonetto (P)"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-attack-type={"Piazzata"}
              onClick={() => run("applyAttackTypeToTarget", "Piazzata")}
              data-key={"Z"}
            >
              {"Piazzata (Z)"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-attack-type={"Spinta"}
              onClick={() => run("applyAttackTypeToTarget", "Spinta")}
              data-key={"S"}
            >
              {"Spinta (S)"}
            </button>
          </div>
          <div className={"section-note base-modal__hint"}>
            {"Scorciatoie: R, P, Z, S."}
          </div>
        </div>
      </div>
    </div>
  );
}
