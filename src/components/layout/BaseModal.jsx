import { useSyncExternalStore } from "react";
import { attackShortcutStore } from "../../state/attack-shortcut-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function BaseModal() {
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
      id={"base-modal"}
      className={"skill-modal force-popup" + (view.base ? "" : " hidden")}
      data-react-managed="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role={"dialog"}
      aria-modal={"true"}
    >
      <div
        className={"skill-modal__backdrop"}
        data-close-base={""}
        onClick={close}
      ></div>
      <div className={"skill-modal__content base-modal__content"}>
        <div className={"skill-modal__head"}>
          <div className={"skill-modal__title"}>{"Base centrale"}</div>
          <button
            id={"base-modal-close"}
            data-react-managed="true"
            onClick={close}
            className={"pill-remove skill-modal__close-abs"}
            aria-label={"Chiudi"}
            type={"button"}
            data-close-base={"true"}
          >
            {"✕"}
          </button>
        </div>
        <div className={"skill-modal__body"}>
          <p className={"section-note"}>
            {"Seleziona la base da assegnare all'ultimo attacco."}
          </p>
          <div
            id={"base-modal-grid"}
            data-react-managed="true"
            className={"base-modal__grid"}
          >
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-base={"K1"}
              onClick={() => run("applyBaseToTarget", "K1")}
              data-key={"1"}
            >
              {"K1"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-base={"K2"}
              onClick={() => run("applyBaseToTarget", "K2")}
              data-key={"2"}
            >
              {"K2"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-base={"KC"}
              onClick={() => run("applyBaseToTarget", "KC")}
              data-key={"C"}
            >
              {"KC"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-base={"KB"}
              onClick={() => run("applyBaseToTarget", "KB")}
              data-key={"B"}
            >
              {"KB"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-base={"K7"}
              onClick={() => run("applyBaseToTarget", "K7")}
              data-key={"7"}
            >
              {"K7"}
            </button>
            <button
              type={"button"}
              className={"base-modal-btn"}
              data-base={"KF"}
              onClick={() => run("applyBaseToTarget", "KF")}
              data-key={"F"}
            >
              {"KF"}
            </button>
          </div>
          <div className={"section-note base-modal__hint"}>
            {"Scorciatoie: 1, 2, C, B, 7, F."}
          </div>
        </div>
      </div>
    </div>
  );
}
