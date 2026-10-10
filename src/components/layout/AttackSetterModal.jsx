import { useSyncExternalStore } from "react";
import { attackShortcutStore } from "../../state/attack-shortcut-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
export function AttackSetterModal() {
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
      id={"attack-setter-modal"}
      className={"skill-modal force-popup" + (view.setter ? "" : " hidden")}
      data-react-managed="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role={"dialog"}
      aria-modal={"true"}
    >
      <div
        className={"skill-modal__backdrop"}
        data-close-attack-setter={""}
        onClick={close}
      ></div>
      <div className={"skill-modal__content base-modal__content"}>
        <div className={"skill-modal__head"}>
          <div className={"skill-modal__title"}>{"Alzatore attacco"}</div>
          <button
            id={"attack-setter-modal-close"}
            data-react-managed="true"
            onClick={close}
            className={"pill-remove skill-modal__close-abs"}
            aria-label={"Chiudi"}
            type={"button"}
            data-close-attack-setter={"true"}
          >
            {"✕"}
          </button>
        </div>
        <div className={"skill-modal__body"}>
          <p className={"section-note"}>
            {"Seleziona l'alzatrice dell'ultimo attacco."}
          </p>
          <div
            id={"attack-setter-modal-grid"}
            data-react-managed="true"
            className={"base-modal__grid"}
          >
            {view.setters.map((option) => (
              <button
                key={option.index ?? "none"}
                type="button"
                className={option.className}
                data-setter-index={option.index ?? ""}
                onClick={() => run("applySetterToTarget", option.index)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className={"section-note base-modal__hint"}>
            {"Scorciatoia: A."}
          </div>
        </div>
      </div>
    </div>
  );
}
