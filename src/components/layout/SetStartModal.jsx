import { useSyncExternalStore } from "react";
import { setStartStore } from "../../state/set-start-store.mjs";
import { invokeRuntime } from "../../compat/runtime.js";
function run(command, ...args) {
  invokeRuntime(command, ...args).catch((error) => {
    console.error("Formazione di partenza non salvata", error);
    window.alert(error.message);
  });
}
export function SetStartModal() {
  const view = useSyncExternalStore(
    setStartStore.subscribe,
    setStartStore.getSnapshot,
    setStartStore.getSnapshot,
  );
  const close = () => run("closeSetStartModal");
  return (
    <div
      id="set-start-modal"
      className={"skill-modal" + (view.open ? "" : " hidden")}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-start-modal-title"
    >
      <div className="skill-modal__content">
        <div className="skill-modal__head">
          <h3 id="set-start-modal-title">{view.title}</h3>
          <button
            id="set-start-modal-close"
            className="pill-remove skill-modal__close-abs"
            aria-label="Chiudi"
            type="button"
            data-react-managed="true"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div
          id="set-start-modal-body"
          className="skill-modal__body"
          data-react-managed="true"
        >
          <div className="set-start-list">
            {view.rows.map((row) => (
              <div key={row.name} className="set-start-row">
                <span className="set-start-name">{row.label}</span>
                <select
                  className="set-start-select"
                  aria-label={"Posizione " + row.label}
                  value={row.value}
                  onChange={(event) =>
                    run("changeSetStartSelection", row.name, event.target.value)
                  }
                >
                  <option value="">-</option>
                  <option value="in">in</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div className="skill-modal__foot">
          <button
            id="set-start-modal-cancel"
            className="secondary"
            data-react-managed="true"
            onClick={close}
          >
            Chiudi
          </button>
          <button
            id="set-start-modal-save"
            className="primary"
            type="button"
            data-react-managed="true"
            onClick={() => run("applySetStartDraft")}
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
