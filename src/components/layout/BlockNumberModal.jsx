import { useSyncExternalStore } from "react";
import { attackShortcutStore } from "../../state/attack-shortcut-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function BlockNumberModal() {
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
      id={"block-number-modal"}
      className={"skill-modal force-popup" + (view.block ? "" : " hidden")}
      data-react-managed="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role={"dialog"}
      aria-modal={"true"}
    >
      <div
        className={"skill-modal__backdrop"}
        data-close-block-number={""}
        onClick={close}
      ></div>
      <div className={"skill-modal__content base-modal__content"}>
        <div className={"skill-modal__head"}>
          <div className={"skill-modal__title"}>{"N° muro"}</div>
          <button
            id={"block-number-modal-close"}
            data-react-managed="true"
            onClick={close}
            className={"pill-remove skill-modal__close-abs"}
            aria-label={"Chiudi"}
            type={"button"}
            data-close-block-number={"true"}
          >
            {"✕"}
          </button>
        </div>
        <div className={"skill-modal__body"}>
          <p className={"section-note"}>
            {"Seleziona il numero di giocatrici a muro per l'ultimo attacco."}
          </p>
          <div
            id={"block-number-modal-grid"}
            data-react-managed="true"
            className={"base-modal__grid"}
          >
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-block-number={"0"}
              onClick={() => run("applyBlockNumberToTarget", 0)}
              data-key={"0"}
            >
              {"0"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-block-number={"1"}
              onClick={() => run("applyBlockNumberToTarget", 1)}
              data-key={"1"}
            >
              {"1"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-block-number={"2"}
              onClick={() => run("applyBlockNumberToTarget", 2)}
              data-key={"2"}
            >
              {"2"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-block-number={"3"}
              onClick={() => run("applyBlockNumberToTarget", 3)}
              data-key={"3"}
            >
              {"3"}
            </button>
          </div>
          <div className={"section-note base-modal__hint"}>
            {"Scorciatoie: 0, 1, 2, 3."}
          </div>
        </div>
      </div>
    </div>
  );
}
